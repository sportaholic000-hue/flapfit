import type { ReactTestRenderer } from 'react-test-renderer';
jest.setTimeout(20_000);
async function fixture() {
  jest.resetModules();
  const React:typeof import('react')=require('react');
  const renderer:typeof import('react-test-renderer')=require('react-test-renderer');
  const files=new Set(['flap-fit-1750000000000-old-session-abc123.mp4','unrelated.mp4']);
  class FakeFile {
    name:string;uri:string;
    constructor(_root:unknown,name:string){this.name=name;this.uri='file:///cache/'+name;}
    get exists(){return files.has(this.name);}
    delete(){files.delete(this.name);}
  }
  class FakeDirectory {
    list(){return [...files].map(name=>new FakeFile(null,name));}
  }
  jest.doMock('expo-file-system',()=>({File:FakeFile,Directory:FakeDirectory,Paths:{cache:'file:///cache/'}}));
  jest.doMock('react-native',()=>({View:'View',AppState:{currentState:'active',addEventListener:jest.fn(()=>({remove:jest.fn()}))}}));
  jest.doMock('@/services/competitionApi',()=>({startCompetitionForegroundRetry:()=>jest.fn()}));
  jest.doMock('@/services/privacy/privacyStartup',()=>({startPrivacyStartup:()=>jest.fn()}));
  jest.doMock('@/components/AppErrorBoundary',()=>({AppErrorBoundary:'Boundary'}));
  jest.doMock('@tanstack/react-query',()=>({QueryClient:class {invalidateQueries=jest.fn();},QueryClientProvider:'Provider'}));
  jest.doMock('expo-image',()=>({Image:'Image'}));
  jest.doMock('expo-router',()=>({Stack:'Stack'}));
  jest.doMock('expo-splash-screen',()=>({preventAutoHideAsync:jest.fn().mockResolvedValue(undefined),hideAsync:jest.fn().mockResolvedValue(undefined)}));
  jest.doMock('react-native-gesture-handler',()=>({GestureHandlerRootView:'GestureHandlerRootView'}));
  const Root=require('../../app/_layout').default;
  let tree:ReactTestRenderer;
  await React.act(async()=>{tree=renderer.create(React.createElement(Root));});
  return {files,unmount:async()=>{await React.act(async()=>tree.unmount());}};
}
test('next actual root mount removes an interrupted-session recording but preserves unrelated cache files',async()=>{
  const f=await fixture();
  const remaining=[...f.files];
  await f.unmount();
  expect(remaining).toEqual(['unrelated.mp4']);
});
