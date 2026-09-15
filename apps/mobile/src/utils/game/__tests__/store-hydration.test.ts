import { finishPersistedStoreHydration } from '../store';

describe('persisted store hydration', () => {
  test('marks the loaded store ready', () => {
    const setHydrated = jest.fn();
    const fallback = jest.fn();

    finishPersistedStoreHydration({ setHydrated }, undefined, fallback);

    expect(setHydrated).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  test('uses a non-destructive fallback when hydration fails before state is available', () => {
    const fallback = jest.fn();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    finishPersistedStoreHydration(undefined, new Error('unreadable saved state'), fallback);

    expect(fallback).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
