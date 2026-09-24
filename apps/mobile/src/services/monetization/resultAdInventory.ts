import type { InterstitialCallbacks, ReadyInterstitial } from './resultAdGate';

export type RetainableInterstitial = ReadyInterstitial & { isValid: () => boolean };

/** One session-owned request. Results borrow it; a skipped exit does not own or
 * destroy inventory needed by a later exit. No timers or automatic requests. */
export class ResultAdInventory {
  private cached: { ad: RetainableInterstitial; requestedAt: number } | null = null;

  constructor(
    private readonly create: () => RetainableInterstitial | null,
    private readonly canUse: () => boolean,
    private readonly now = () => Date.now(),
  ) {}

  private current(): RetainableInterstitial | null {
    const entry = this.cached;
    // Google interstitials expire after an hour. Leave a five-minute margin,
    // including time spent downloading, without a refresh timer in gameplay.
    if (entry && (!entry.ad.isValid() || this.now() - entry.requestedAt >= 55 * 60_000)) {
      this.clear();
    }
    return this.cached?.ad ?? null;
  }

  preload(): void {
    if (!this.canUse() || this.current()) return;
    const ad = this.create();
    if (ad) this.cached = { ad, requestedAt: this.now() };
  }

  clear(): void {
    const entry = this.cached;
    this.cached = null;
    entry?.ad.dispose();
  }

  /** Readiness is checked on the tap, including when consent/setup finished
   * after the results rendered. Borrowing never initiates a network request. */
  forResult(): ReadyInterstitial {
    let disposed = false;
    let owned: RetainableInterstitial | null = null;
    return {
      isReady: () => !disposed && !owned && this.canUse() && this.current()?.isReady() === true,
      show: async (callbacks: InterstitialCallbacks) => {
        const ad = !disposed && !owned && this.canUse() ? this.current() : null;
        if (!ad?.isReady()) { callbacks.failed(); return; }
        this.cached = null;
        owned = ad;
        await ad.show(callbacks);
      },
      dispose: () => {
        disposed = true;
        owned?.dispose();
      },
    };
  }
}
