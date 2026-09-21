
const oldName='flap-fit-1750000000000-old-session-abc123.mp4';
function fixture(){
  jest.resetModules();
  const files=new Set([oldName,'unrelated.mp4','flap-fit-not-owned.mp4']);
  const blocked=new Set<string>();
  let failList=false;
  const listeners=new Set<(state:string)=>void>();
  class FakeFile{
    uri:string;name:string;
    constructor(_root:unknown,name:string){this.name=name;this.uri='file:///cache/'+name;}
    get exists(){return files.has(this.name);}
    create(){files.add(this.name);}
    delete(){if(blocked.has(this.name))throw new Error('locked');files.delete(this.name);}
  }
  class FakeDirectory{
    name=oldName;uri='file:///cache/subdir';
    list(){if(failList)throw new Error('unreadable');return [...files].map(n=>new FakeFile(null,n)).concat(new FakeDirectory() as unknown as FakeFile);}
  }
  jest.doMock('expo-file-system',()=>({File:FakeFile,Directory:FakeDirectory,Paths:{cache:'file:///cache/'}}));
  jest.doMock('react-native',()=>({AppState:{addEventListener:jest.fn((_event,listener)=>{listeners.add(listener);return {remove:()=>listeners.delete(listener)};})}}));
  const getApi=():typeof import('../recordingCache')=>require('../recordingCache');
  return {api:getApi(),getApi,files,blocked,listeners,foreground:()=>[...listeners].forEach(l=>l('active')),failList:()=>{failList=true;}};
}
test.each(['mp4','mov','webm'] as const)('cleanup protects active full-run %s recording through foreground/root remount and deletes it only on discard',extension=>{
  const f=fixture(),stop=f.api.startRecordingCacheCleanup();
  expect(f.files.has(oldName)).toBe(false);
  const recording=f.api.createGameplayRecordingFile('full_session',extension);recording.create();
  f.foreground();stop();const remount=f.api.startRecordingCacheCleanup();
  expect(f.files.has(recording.name)).toBe(true);
  f.api.discardGameplayRecordingFile(recording);
  expect(f.files.has(recording.name)).toBe(false);
  expect([...f.files]).toEqual(['unrelated.mp4','flap-fit-not-owned.mp4']);remount();
  expect(f.listeners.size).toBe(0);
});
test('process loss releases in-memory ownership so the next startup removes a completed but unshared orphan',()=>{
  const f=fixture(),recording=f.api.createGameplayRecordingFile('run','mp4');recording.create();
  expect(f.files.has(recording.name)).toBe(true);
  jest.resetModules();const next=f.getApi();
  expect(next.cleanupOrphanedGameplayRecordings()).toEqual({deleted:1,failed:0});
  expect(f.files.has(recording.name)).toBe(false);
});
test('a failed deletion remains an honest failure and succeeds on a later foreground attempt',()=>{
  const f=fixture();f.blocked.add(oldName);
  expect(f.api.cleanupOrphanedGameplayRecordings()).toEqual({deleted:0,failed:1});
  expect(f.files.has(oldName)).toBe(true);
  const stop=f.api.startRecordingCacheCleanup();f.blocked.clear();f.foreground();
  expect(f.files.has(oldName)).toBe(false);stop();
});
test('failed normal discard releases ownership for a subsequent cleanup retry without truncating another active video',()=>{
  const f=fixture();const first=f.api.createGameplayRecordingFile('one','mp4');first.create();
  const second=f.api.createGameplayRecordingFile('two','mp4');second.create();
  const warning=jest.spyOn(console,'warn').mockImplementation(()=>undefined);
  f.blocked.add(first.name);f.api.discardGameplayRecordingFile(first);
  expect(f.files.has(first.name)).toBe(true);f.blocked.clear();
  expect(f.api.cleanupOrphanedGameplayRecordings()).toEqual({deleted:1,failed:0});
  expect(f.files.has(second.name)).toBe(true);warning.mockRestore();
});
test('unreadable cache and nonmatching files/directories are not reported as successful deletion',()=>{
  const f=fixture();f.failList();
  expect(f.api.cleanupOrphanedGameplayRecordings()).toEqual({deleted:0,failed:1});
  expect(f.files.has(oldName)).toBe(true);
});
