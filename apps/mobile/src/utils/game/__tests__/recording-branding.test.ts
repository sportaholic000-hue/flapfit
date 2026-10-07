import { SCRIPT_GAME } from '../html/scriptGame';

const compositor = SCRIPT_GAME.slice(SCRIPT_GAME.indexOf('function copyComposedRecordingFrame('), SCRIPT_GAME.indexOf('function stopRunRecording('));
function harness(target: number, enabled = true, active = true, width = 390, height = 844) {
  const live = { width, height, getContext: jest.fn() };
  const output = { width: width / 2, height: height / 2 };
  const recording = { save: jest.fn(), restore: jest.fn(), scale: jest.fn(), drawImage: jest.fn(), strokeText: jest.fn(), fillText: jest.fn(),
    textAlign: '', textBaseline: '', font: '', lineWidth: 0, lineJoin: '', strokeStyle: '', fillStyle: '' };
  const run = new Function('recordingCtx', 'canvas', 'recordingCanvas', 'CONFIG', 'W', 'H', 'recordingActive', `
    var recordingFramesFinished=false,recordingAwaitingPlayFrame=true,lastRecordingFrameTime=0;
    ${compositor}
    return { frame: copyComposedRecordingFrame, finish: function(){recordingFramesFinished=true;} };
  `)(recording, live, output, { target, recordingBranding: enabled }, width, height, active) as {
    frame: (time: number, playable: boolean, force?: boolean) => void; finish: () => void;
  };
  return { recording, live, output, run };
}

test.each([10, 0])('branding is drawn on the recording surface below target/score (target=%s)', target => {
  for (const [width, height] of [[390, 844], [820, 1180], [1024, 1366]]) {
    const h = harness(target, true, true, width, height);
    h.run.frame(100, true);
    expect(h.recording.drawImage).toHaveBeenCalledWith(h.live, 0, 0, width, height, 0, 0, width / 2, height / 2);
    expect(h.recording.scale).toHaveBeenCalledWith(0.5, 0.5);
    const expected = ['Flap Fit', width / 2, target ? 122 : 100, width - 32];
    expect(h.recording.strokeText).toHaveBeenCalledWith(...expected);
    expect(h.recording.fillText).toHaveBeenCalledWith(...expected);
    expect(h.recording.font).toBe('800 16px -apple-system, sans-serif');
    expect(h.recording.strokeStyle).toBe('rgba(0,0,0,0.65)');
    expect(h.recording.fillStyle).toBe('#FFFFFF');
    expect(h.recording.save).toHaveBeenCalledTimes(1);
    expect(h.recording.restore).toHaveBeenCalledTimes(1);
    expect(h.live.getContext).not.toHaveBeenCalled();
  }
});

test('ordinary play and disabled branding produce no lettering', () => {
  const ordinary = harness(10, false, false);
  ordinary.run.frame(100, true);
  expect(ordinary.recording.drawImage).not.toHaveBeenCalled();
  expect(ordinary.recording.fillText).not.toHaveBeenCalled();
  const unbranded = harness(10, false);
  unbranded.run.frame(100, true);
  expect(unbranded.recording.drawImage).toHaveBeenCalledTimes(1);
  expect(unbranded.recording.fillText).not.toHaveBeenCalled();
});

test('branding preserves playable-frame admission, 24fps throttling and terminal-frame stop', () => {
  const h = harness(10);
  h.run.frame(50, false);
  expect(h.recording.drawImage).not.toHaveBeenCalled();
  h.run.frame(100, true); h.run.frame(110, true);
  expect(h.recording.fillText).toHaveBeenCalledTimes(1);
  h.run.frame(150, true);
  expect(h.recording.fillText).toHaveBeenCalledTimes(2);
  h.run.finish(); h.run.frame(200, true, true);
  expect(h.recording.fillText).toHaveBeenCalledTimes(2);
});
