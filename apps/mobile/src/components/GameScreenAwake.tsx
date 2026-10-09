import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { useCallback, useId, useRef } from 'react';
import { AppState, Platform } from 'react-native';

// Android-only adaptation of build 11. Mounted only while the game is active.
// Each focus/foreground interval owns a tag; delayed cleanup cannot release a newer run.
export function GameScreenAwake() {
  const id = useId();
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return;
    let stop: (() => void) | undefined;
    const release = () => { stop?.(); stop = undefined; };
    const activate = () => {
      if (stop) return;
      const tag = `FlapFit.Game.${id}.${++generation.current}`;
      let released = false;
      const deactivate = () => deactivateKeepAwake(tag).catch(() => undefined);
      stop = () => { released = true; void deactivate(); };
      void activateKeepAwakeAsync(tag).then(() => {
        if (released) void deactivate();
      }).catch(() => { console.warn('Flap Fit could not activate screen-sleep prevention.'); });
    };
    if (AppState.currentState === 'active') activate();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') activate(); else release();
    });
    return () => { listener.remove(); release(); };
  }, [id]));
  return null;
}
