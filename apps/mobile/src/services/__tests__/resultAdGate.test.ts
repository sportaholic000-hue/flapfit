import { ResultAdGate, type InterstitialCallbacks, type ReadyInterstitial } from '../monetization/resultAdGate';

function fixture() {
  let active = true;
  const listeners = new Set<() => void>();
  const environment = { isActive: () => active, onActive: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); } };
  let callbacks: InterstitialCallbacks | undefined;
  const ad: ReadyInterstitial = {
    isReady: jest.fn(() => true),
    show: jest.fn(async (value) => { callbacks = value; }),
    dispose: jest.fn(),
  };
  return { ad, environment, callbacks: () => callbacks!, background: () => { active = false; }, foreground: () => { active = true; [...listeners].forEach((fn) => fn()); } };
}

describe('deliberate result action ads', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('never shows on result creation, and the first completed exit is free', () => {
    const gate = new ResultAdGate(); const f = fixture(); const action = jest.fn();
    const result = gate.createResult(f.ad, f.environment);
    expect(f.ad.show).not.toHaveBeenCalled();
    result.exit(false, action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(f.ad.show).not.toHaveBeenCalled();
    expect(result.exit(false, action)).toBe(false);
  });

  test('sharing or a backgrounded app cannot consume an exit or show an ad', () => {
    const gate = new ResultAdGate(); const f = fixture(); const action = jest.fn();
    const result = gate.createResult(f.ad, f.environment);
    expect(result.exit(true, action)).toBe(false);
    f.background(); expect(result.exit(false, action)).toBe(false);
    f.foreground(); expect(action).not.toHaveBeenCalled();
    expect(result.exit(false, action)).toBe(true);
    expect(f.ad.show).not.toHaveBeenCalled();
  });

  test('second exit waits for close and executes the selected action once', () => {
    const gate = new ResultAdGate(); const f = fixture(); const action = jest.fn();
    gate.createResult(null, f.environment).exit(false, jest.fn());
    const result = gate.createResult(f.ad, f.environment);
    result.exit(false, action); f.callbacks().opened();
    expect(action).not.toHaveBeenCalled();
    result.exit(false, action); f.callbacks().closed(); f.callbacks().failed();
    expect(action).toHaveBeenCalledTimes(1);
    expect(f.ad.show).toHaveBeenCalledTimes(1);
  });

  test('enforces both the two-exit and ninety-second cap', () => {
    let now = 0; const gate = new ResultAdGate(() => now); const f = fixture();
    gate.createResult(null, f.environment).exit(false, jest.fn());
    gate.createResult(f.ad, f.environment).exit(false, jest.fn());
    f.callbacks().opened(); f.callbacks().closed();
    for (let i = 0; i < 2; i++) gate.createResult(f.ad, f.environment).exit(false, jest.fn());
    expect(f.ad.show).toHaveBeenCalledTimes(1);
    now = 90_000;
    gate.createResult(f.ad, f.environment).exit(false, jest.fn());
    expect(f.ad.show).toHaveBeenCalledTimes(1);
    gate.createResult(f.ad, f.environment).exit(false, jest.fn());
    expect(f.ad.show).toHaveBeenCalledTimes(2);
  });

  test('no ready ad or show failure continues without a retry ad', async () => {
    const gate = new ResultAdGate(); const f = fixture(); const action = jest.fn();
    gate.createResult(null, f.environment).exit(false, jest.fn());
    (f.ad.show as jest.Mock).mockRejectedValue(new Error('offline'));
    gate.createResult(f.ad, f.environment).exit(false, action);
    await Promise.resolve();
    jest.advanceTimersByTime(9_000);
    expect(action).toHaveBeenCalledTimes(1);
  });

  test('a delayed native presentation cannot appear over a new game after a JS timeout', () => {
    const gate = new ResultAdGate(); const f = fixture(); const action = jest.fn();
    gate.createResult(null, f.environment).exit(false, jest.fn());
    gate.createResult(f.ad, f.environment).exit(false, action);
    jest.advanceTimersByTime(30_000);
    expect(action).not.toHaveBeenCalled();
    f.callbacks().opened();
    jest.advanceTimersByTime(30_000);
    expect(action).not.toHaveBeenCalled();
    f.callbacks().closed();
    expect(action).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(90_000);
    gate.createResult(null, f.environment).exit(false, jest.fn());
    const second = jest.fn();
    gate.createResult(f.ad, f.environment).exit(false, second); f.callbacks().opened();
    jest.advanceTimersByTime(300_000);
    expect(second).not.toHaveBeenCalled();
    f.callbacks().closed(); expect(second).toHaveBeenCalledTimes(1);
  });

  test('close while outside the app waits for foreground without showing another ad', () => {
    const gate = new ResultAdGate(); const f = fixture(); const action = jest.fn();
    gate.createResult(null, f.environment).exit(false, jest.fn());
    gate.createResult(f.ad, f.environment).exit(false, action); f.callbacks().opened();
    f.background(); f.callbacks().closed(); f.callbacks().failed();
    expect(action).not.toHaveBeenCalled();
    f.foreground(); f.foreground();
    expect(action).toHaveBeenCalledTimes(1);
    expect(f.ad.show).toHaveBeenCalledTimes(1);
  });

  test('unmount cancels pending navigation and ignores late load/show/close callbacks', () => {
    const gate = new ResultAdGate(); const f = fixture(); const action = jest.fn();
    gate.createResult(null, f.environment).exit(false, jest.fn());
    const result = gate.createResult(f.ad, f.environment); result.exit(false, action);
    result.dispose(); f.callbacks().opened(); f.callbacks().closed();
    jest.advanceTimersByTime(10_000); f.foreground();
    expect(action).not.toHaveBeenCalled();
  });
});
