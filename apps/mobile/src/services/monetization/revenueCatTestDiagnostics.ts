/** Local diagnostics for genuine callbacks in test-ad builds. No SDK, disk or network access. */
export type RevenueCatTestDiagnosticKind =
  | 'configured'
  | 'ad_loaded'
  | 'ad_displayed'
  | 'ad_clicked'
  | 'ad_revenue'
  | 'ad_failed_to_load';

export interface RevenueCatTestDiagnosticContext {
  adsMode: string | undefined;
  revenueCatPermitted: boolean;
  generation: number;
  appVersion?: string | null;
  buildNumber?: string | null;
}

export interface RevenueCatTestDiagnosticEvent {
  kind: RevenueCatTestDiagnosticKind;
  generation: number;
  appUserID?: string | null;
  impressionId?: string | null;
}

const kinds = new Set<RevenueCatTestDiagnosticKind>([
  'configured', 'ad_loaded', 'ad_displayed', 'ad_clicked', 'ad_revenue', 'ad_failed_to_load',
]);
const maxRecords = 100;
const anonymousId = /^\$RCAnonymousID:[a-f0-9]{32}$/i;
const impressionId = /^ff-[a-z0-9]{1,13}-[a-z0-9]{1,8}-[a-z0-9]{0,10}$/;
const version = /^\d{1,4}(?:\.\d{1,4}){0,3}$/;

export function createRevenueCatTestDiagnostics(
  readContext: () => RevenueCatTestDiagnosticContext,
  localSink: (line: string) => void = (line) => console.info(line),
  now: () => number = Date.now,
): { record: (event: RevenueCatTestDiagnosticEvent) => boolean } {
  let count = 0;
  return {
    record(event) {
      try {
        const context = readContext();
        // A new grant must not make an earlier callback eligible for logging.
        if (context.adsMode !== 'test' || context.revenueCatPermitted !== true
          || !Number.isSafeInteger(event.generation) || event.generation !== context.generation
          || !kinds.has(event.kind) || count >= maxRecords) return false;
        if (event.impressionId != null && !impressionId.test(event.impressionId)) return false;
        if (event.kind !== 'configured' && event.impressionId == null) return false;
        const record = {
          scope: 'flapfit.rc.test.local',
          receipt: 'unverified',
          timestamp: new Date(now()).toISOString(),
          generation: event.generation,
          kind: event.kind,
          ...(context.appVersion && version.test(context.appVersion) ? { appVersion: context.appVersion } : {}),
          ...(context.buildNumber && version.test(context.buildNumber) ? { buildNumber: context.buildNumber } : {}),
          ...(event.appUserID && anonymousId.test(event.appUserID) ? { rcIdSuffix: event.appUserID.slice(-12) } : {}),
          ...(event.impressionId ? { impressionId: event.impressionId } : {}),
        };
        const line = JSON.stringify(record);
        if (line.length > 512) return false;
        ++count;
        localSink(line);
        return true;
      } catch {
        // Diagnostics never interrupt gameplay or create retry work.
        return false;
      }
    },
  };
}