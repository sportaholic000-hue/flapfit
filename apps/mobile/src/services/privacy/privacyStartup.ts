import { AppState } from 'react-native';
import { prepareAppleAgeControl } from './appleAgeControl';
import { getProcessingInputs, setAppleAgeRequirement } from './processingAccess';
import type { AppleRequirement } from './processingPolicy';

let consumers = 0;
let removeLifecycleListener: (() => void) | null = null;
let preparation: Promise<AppleRequirement> | null = null;

/** Restore purpose choices and query Apple's regional obligations. This does not
 * request an age range, display a sheet, choose a regional processing policy,
 * or load an advertising/analytics SDK. An API failure never means adult. */
export function preparePrivacyStartup(): Promise<AppleRequirement> {
  if (preparation) return preparation;
  const operation = prepareAppleAgeControl().catch((): AppleRequirement => {
    setAppleAgeRequirement('error');
    return 'error';
  });
  preparation = operation;
  void operation.then(() => { if (preparation === operation) preparation = null; });
  return operation;
}

/** Mount once at the app root, independently of Home, UMP and online participation.
 * Multiple consumers/React effect remounts share one native check and listener. */
export function startPrivacyStartup(): () => void {
  ++consumers;
  if (consumers === 1) {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      const enteredForeground = state === 'active' && previousState !== 'active';
      previousState = state;
      const requirement = getProcessingInputs().appleRequirement;
      // Retry an unresolved lookup, without clearing valid evidence whenever a
      // share sheet, ad, or system permission sheet returns to the foreground.
      if (enteredForeground && (requirement === 'pending' || requirement === 'error')) {
        void preparePrivacyStartup();
      }
    });
    removeLifecycleListener = () => subscription.remove();
    if (previousState === 'active') void preparePrivacyStartup();
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    if (--consumers === 0) {
      removeLifecycleListener?.();
      removeLifecycleListener = null;
    }
  };
}
