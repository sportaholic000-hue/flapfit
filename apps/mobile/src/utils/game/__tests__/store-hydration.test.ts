import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  finishPersistedStoreHydration,
  retryPersistedStoreHydration,
  useGameStore,
} from '../store';

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

  test('preserves stored progress when a real storage read fails', async () => {
    const savedProgress = JSON.stringify({
      state: {
        hasOnboarded: true,
        birdId: 'midnight',
        unlockedLevel: 7,
        totalTutSeconds: 456,
      },
      version: 0,
    });
    await AsyncStorage.setItem('flap-fit-store', savedProgress);

    const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
    getItem.mockRejectedValueOnce(new Error('temporary phone storage failure'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await retryPersistedStoreHydration();
    expect(useGameStore.getState().hydrationError).toBe(true);

    // A state update would normally persist. The failed read keeps writes
    // blocked, so the original saved bytes survive unchanged.
    useGameStore.setState({ playerName: 'Must not overwrite progress' });
    await Promise.resolve();
    expect(await AsyncStorage.getItem('flap-fit-store')).toBe(savedProgress);

    await retryPersistedStoreHydration();
    expect(useGameStore.getState().hydrationError).toBe(false);
    expect(useGameStore.getState().unlockedLevel).toBe(7);
    expect(useGameStore.getState().totalTutSeconds).toBe(456);
    consoleError.mockRestore();
  });
});
