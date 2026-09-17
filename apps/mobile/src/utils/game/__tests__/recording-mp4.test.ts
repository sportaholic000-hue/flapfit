/// <reference types="node" />
/** @jest-environment node */
import { Blob as NodeBlob } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SCRIPT_RECORDING_MP4 } from '../html/scriptRecordingMp4';
import { SCRIPT_GAME } from '../html/scriptGame';

type Finalized = { blob: NodeBlob; report: { action: string; tracks: Array<{headerSeconds:number; sampleSeconds:number}> } };
const finalize = new Function('Blob', SCRIPT_RECORDING_MP4 + '\nreturn finalizeRecordedMp4;')(NodeBlob) as (blob: NodeBlob) => Promise<Finalized>;
const recordedBytes = readFileSync(path.join(__dirname, 'fixtures', 'chromium-duration-defect.mp4'));
const recorded = () => new NodeBlob([recordedBytes], { type: 'video/mp4' });

function box(type: string, ...payloads: Buffer[]) {
  const payload = Buffer.concat(payloads);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(payload.length + 8);
  header.write(type, 4, 'ascii');
  return Buffer.concat([header, payload]);
}
function full(type: string, flags: number, ...payloads: Buffer[]) {
  const header = Buffer.alloc(4);
  header.writeUInt32BE(flags);
  return box(type, header, ...payloads);
}
function uints(...values: number[]) {
  const b = Buffer.alloc(values.length * 4);
  values.forEach((value, i) => b.writeUInt32BE(value, i * 4));
  return b;
}
function movie(tracks: Array<{id:number; scale:number; duration:number; version?:number}>) {
  return box('moov',
    full('mvhd', 0, uints(0, 0, 1000, 6000)),
    ...tracks.map(t => box('trak',
      full('tkhd', 0, uints(0, 0, t.id, 0, 6000)),
      box('mdia', t.version === 1
        ? full('mdhd', 0x1000000, uints(0,0,0,0,t.scale,0,t.duration))
        : full('mdhd', 0, uints(0,0,t.scale,t.duration)))
    ))
  );
}
function fragment(id: number, base: number, durations: number[]) {
  return box('moof', box('traf',
    full('tfhd', 0x20000, uints(id)),
    full('tfdt', 0, uints(base)),
    full('trun', 0x100, uints(durations.length, ...durations))
  ));
}
function synthetic(audioDuration = 6000) {
  return new NodeBlob([
    movie([{id:1,scale:30000,duration:6000},{id:2,scale:48000,duration:audioDuration,version:1}]),
    fragment(1,0,[90000]), fragment(2,0,[144000]),
    box('mdat', Buffer.from('encoded packet payload one')),
    fragment(1,90000,[90000]), fragment(2,144000,[144000]),
    box('mdat', Buffer.from('encoded packet payload two')),
  ], {type:'video/mp4'});
}

describe('recorded MP4 duration finalization', () => {
  it('repairs the actual synthetic Chromium output and preserves every media payload byte', async () => {
    const result = await finalize(recorded());
    expect(result.report.action).toBe('repaired');
    expect(result.report.tracks[0].headerSeconds).toBeCloseTo(0.1279, 4);
    expect(result.report.tracks[0].sampleSeconds).toBeCloseTo(3.836833, 5);
    const bytes = Buffer.from(await result.blob.arrayBuffer());
    expect(bytes.length).toBe(recordedBytes.length);
    // The known 64-bit mdhd duration is the only permitted change.
    const durationOffset = recordedBytes.indexOf(Buffer.from('mdhd')) + 4 + 24;
    const changed = [...bytes.keys()].filter(i => bytes[i] !== recordedBytes[i]);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.every(i => i >= durationOffset && i < durationOffset + 8)).toBe(true);
    const second = await finalize(result.blob);
    expect(second.report.action).toBe('unchanged');
    expect(second.report.tracks[0].headerSeconds).toBeCloseTo(3.836833, 5);
    expect(Buffer.from(await second.blob.arrayBuffer()).equals(bytes)).toBe(true);
  });

  it('uses each audio/video timescale and accumulates multiple fragments for v0 and v1 headers', async () => {
    const result = await finalize(synthetic());
    expect(result.report.action).toBe('repaired');
    const check = await finalize(result.blob);
    expect(check.report.action).toBe('unchanged');
    expect(check.report.tracks.map(t => t.headerSeconds)).toEqual([6,6]);
    expect(check.report.tracks.map(t => t.sampleSeconds)).toEqual([6,6]);
  });

  it('leaves an unfamiliar defect untouched rather than guessing or partly repairing a file', async () => {
    const blob = synthetic(999);
    const result = await finalize(blob);
    expect(result.report.action).toBe('unverified');
    expect(result.blob).toBe(blob);
  });

  it('leaves nonfragmented files untouched for the platform recorder to finalize', async () => {
    const blob = new NodeBlob([movie([{id:1,scale:30000,duration:180000}]),box('mdat',Buffer.from('data'))]);
    const result = await finalize(blob);
    expect(result.report.action).toBe('unverified');
    expect(result.blob).toBe(blob);
  });

  it('rejects truncated media instead of exposing a partial share as ready', async () => {
    await expect(finalize(recorded().slice(0, recordedBytes.length - 20))).rejects.toThrow(/incomplete|truncated/);
  });

  it('preserves forward timestamp gaps while correcting only the header units', async () => {
    const blob = new NodeBlob([movie([{id:1,scale:30000,duration:6000}]),
      fragment(1,0,[60000]),fragment(1,120000,[60000]),box('mdat',Buffer.from('data'))]);
    const result = await finalize(blob);
    expect(result.report.action).toBe('repaired');
    expect((await finalize(result.blob)).report.tracks[0].headerSeconds).toBe(6);
  });

  it('keeps complete audio timing when Chromium appends an empty audio fragment', async () => {
    const original = readFileSync(path.join(__dirname, 'fixtures', 'chromium-audio-duration-defect.mp4'));
    const result = await finalize(new NodeBlob([original], {type:'video/mp4'}));
    expect(result.report.action).toBe('repaired');
    const checked = await finalize(result.blob);
    expect(checked.report.action).toBe('unchanged');
    expect(checked.report.tracks[0].headerSeconds).toBeCloseTo(4.8391875, 5);
    expect(checked.report.tracks[1].headerSeconds).toBeCloseTo(5.7640667, 5);
    const fixed = Buffer.from(await result.blob.arrayBuffer());
    const permitted = new Set<number>();
    for (let offset = original.indexOf('mdhd'); offset >= 0; offset = original.indexOf('mdhd', offset + 4)) {
      for (let i = offset + 28; i < offset + 36; i++) permitted.add(i);
    }
    expect(fixed.length).toBe(original.length);
    const changed = [...fixed.keys()].filter(i => fixed[i] !== original[i]);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.every(i => permitted.has(i))).toBe(true);
  });

  it('assembles all recorder events, finalizes before transfer, and delivers the complete byte count', async () => {
    const messages: Array<Record<string, any>> = [];
    let resolveComplete!: () => void;
    const completed = new Promise<void>(resolve => { resolveComplete = resolve; });
    const start = jest.fn();
    const originalAudioStop = jest.fn();
    const cloneAudioStop = jest.fn();
    const draw = jest.fn();
    class Recorder {
      static isTypeSupported = () => true;
      mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
      state = 'inactive';
      ondataavailable!: (event: {data: NodeBlob}) => void;
      onstop!: () => void;
      start = (...args: unknown[]) => { start(...args); this.state = 'recording'; };
      stop = () => {
        this.state = 'inactive';
        this.ondataavailable({data:recorded().slice(0, 500)});
        this.ondataavailable({data:recorded().slice(500)});
        this.onstop();
      };
    }
    class Reader {
      result = '';
      onload!: () => void;
      readAsDataURL(blob: NodeBlob) {
        void blob.arrayBuffer().then(data => {
          this.result = 'data:' + blob.type + ';base64,' + Buffer.from(data).toString('base64');
          this.onload();
        });
      }
    }
    const audioClone = {stop:cloneAudioStop};
    const stream = {getTracks:()=>[audioClone],addTrack:jest.fn()};
    const surface = {captureStream:()=>stream,getContext:()=>({drawImage:draw}),width:720,height:1280};
    const section = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('// ---------- Composed-run recording'), SCRIPT_GAME.indexOf('// ---------- Difficulty'));
    const harness = new Function('window','document','canvas','CONFIG','video','W','H','Blob','FileReader','postRN',
      section + '\nreturn {start:startRunRecording,copy:copyComposedRecordingFrame,stop:stopRunRecording};'
    )({MediaRecorder:Recorder},{createElement:()=>surface},surface,{recordRun:true,recordAudio:true},
      {srcObject:{getAudioTracks:()=>[{stop:originalAudioStop,clone:()=>audioClone}]}},360,640,NodeBlob,Reader,
      (message:Record<string,any>)=>{messages.push(message);if(message.type==='recordingcomplete')resolveComplete();});
    harness.start();
    harness.copy(100,false);
    expect(draw).not.toHaveBeenCalled();
    harness.copy(150,true);
    expect(draw).toHaveBeenCalledTimes(1);
    harness.stop();
    await completed;
    expect(start).toHaveBeenCalledWith();
    expect(originalAudioStop).not.toHaveBeenCalled();
    expect(cloneAudioStop).toHaveBeenCalledTimes(1);
    expect(messages.filter(m=>m.type==='recordingerror')).toHaveLength(0);
    const chunks = messages.filter(m=>m.type==='recordingchunk');
    expect(chunks.length).toBeGreaterThan(1);
    const bytes = Buffer.concat(chunks.map(m=>Buffer.from(m.data,'base64')));
    const direct = await finalize(recorded());
    expect(bytes.equals(Buffer.from(await direct.blob.arrayBuffer()))).toBe(true);
    expect(messages.at(-1)).toMatchObject({type:'recordingcomplete',chunkCount:chunks.length,byteLength:bytes.length});
  });
});
