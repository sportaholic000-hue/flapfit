export type InterstitialCallbacks = { opened: () => void; closed: () => void; failed: () => void };
export type ReadyInterstitial = {
  isReady: () => boolean;
  show: (callbacks: InterstitialCallbacks) => Promise<void>;
  dispose: () => void;
};
export type ResultEnvironment = {
  isActive: () => boolean;
  onActive: (callback: () => void) => () => void;
};

// Session-wide cap; a fresh app session also gets its first completed run free.
// No exercise, score, player or recording data belongs in this scheduler.
export class ResultAdGate {
  private exits = 0;
  private lastShownAt = -Infinity;
  constructor(private readonly now = () => Date.now()) {}

  // Check cadence before allocating an ad. The actual exit still checks the
  // ninety-second cooldown at the time the user taps a result action.
  canPrepareAd(): boolean { return (this.exits + 1) % 2 === 0; }

  createResult(ad: ReadyInterstitial | null, environment: ResultEnvironment) {
    let claimed = false;
    let disposed = false;
    let finished = false;
    let opened = false;
    let stopWaiting: (() => void) | undefined;
    const clean = () => {
      stopWaiting?.();
      stopWaiting = undefined;
      try { ad?.dispose(); } catch { /* SDK cleanup must not prevent navigation. */ }
    };
    return {
      exit: (sharing: boolean, action: () => void): boolean => {
        if (disposed || claimed || sharing || !environment.isActive()) return false;
        claimed = true;
        this.exits += 1;
        const continueWhenActive = () => {
          if (disposed || finished) return;
          if (!environment.isActive()) {
            stopWaiting ??= environment.onActive(continueWhenActive);
            return;
          }
          finished = true;
          clean();
          action();
        };
        const eligible = this.exits % 2 === 0 && this.now() - this.lastShownAt >= 90_000;
        let ready = false;
        try { ready = ad?.isReady() === true; } catch { /* Use the no-ad path. */ }
        if (!eligible || !ready || !ad) {
          continueWhenActive();
          return true;
        }
        // After handing presentation to native code there is no cancellation API.
        // A JS timeout cannot safely navigate: the queued native ad could then
        // appear over a new game. Continue only on close or a confirmed failure.
        try {
          void ad.show({
            opened: () => {
              if (disposed || finished || opened) return;
              opened = true;
              this.lastShownAt = this.now();
            },
            closed: continueWhenActive,
            failed: continueWhenActive,
          }).catch(continueWhenActive);
        } catch {
          continueWhenActive();
        }
        return true;
      },
      dispose: () => { disposed = true; clean(); },
    };
  }
}
