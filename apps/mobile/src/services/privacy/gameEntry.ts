import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProcessingInputs } from './processingAccess';
import { resolveReleaseEligibility, type ReleaseEligibility } from './releaseEligibility';
import { PROCESSING_NOTICE_VERSION } from './processingPolicy';

const KEY = '@flapfit/first-game-started-v1';
let firstStarted: boolean | null = null;
let queue: Promise<void> = Promise.resolve();
const trialLeases = new WeakSet<object>();
export type GameEntryDecision = ReleaseEligibility | { status: 'trial' };

/** One initial run before optional setup. Failed/malformed reads are not first
 * use; a failed claim cannot create repeat free trials after restart. No purpose
 * permission, ad fill or ad impression is used to decide access. */
export function authorizeGameEntry(hasExistingPlay: boolean, entry: object = {}, commitFirstRun = false): Promise<GameEntryDecision> {
  let decision: GameEntryDecision = { status: 'unanswered', reason: 'saved-status' };
  const operation = queue.catch(() => undefined).then(async () => {
    if (firstStarted === null) {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw !== null && raw !== '1') throw new Error('Saved game eligibility could not be read.');
      firstStarted = raw === '1';
    }
    const eligibility = resolveReleaseEligibility(getProcessingInputs());
    if (eligibility.status === 'unavailable') { decision = eligibility; return; }
    if (trialLeases.has(entry)) { decision = { status: 'trial' }; return; }
    if (!firstStarted && !hasExistingPlay) {
      // Opening camera/audio permission recovery is not playing the first run.
      // Commit immediately before mounting the prepared gameplay WebView.
      if (!commitFirstRun) { decision = eligibility.status === 'available' ? eligibility : { status: 'trial' }; return; }
      await AsyncStorage.setItem(KEY, '1');
      firstStarted = true;
      trialLeases.add(entry);
      const latest = resolveReleaseEligibility(getProcessingInputs());
      decision = latest.status === 'unavailable' || latest.status === 'available' ? latest : { status: 'trial' };
      return;
    }
    // Existing progress is proof of an earlier run, even on migration where the
    // new claim record does not exist yet. Never erase or rewrite game progress.
    decision = eligibility.status === 'available' && getProcessingInputs().presentedNoticeVersion !== PROCESSING_NOTICE_VERSION
      ? { status: 'unanswered', reason: 'notice' } : eligibility;
  });
  queue = operation;
  return operation.then(() => decision);
}
