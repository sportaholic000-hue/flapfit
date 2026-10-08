import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { useCallback, useId, useRef } from 'react';
import { Platform } from 'react-native';

// Mounted only while the game WebView is active, including calibration.
// It does not alter the device's saved Auto-Lock setting or request background work.
export function GameScreenAwake() {
  const id = useId();
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'ios') return;
    const tag = `FlapFit.Game.${id}.${++generation.current}`;
    let released = false;
    const release = () => deactivateKeepAwake(tag).catch(() => undefined);
    void activateKeepAwakeAsync(tag).then(() => {
      // A quick exit may occur before the native activation resolves.
      // Each focus has its own tag, so late cleanup cannot release the next run.
      if (released) void release();
    }).catch(() => { console.warn('Flap Fit could not activate screen-sleep prevention.'); });
    return () => {
      released = true;
      void release();
    };
  }, [id]));
  return null;
}
