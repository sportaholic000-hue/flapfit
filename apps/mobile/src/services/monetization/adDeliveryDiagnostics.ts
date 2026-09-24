/** Temporary, memory-only build 7 troubleshooting. Never sends or persists data. */
export function createAdDeliveryDiagnostics(enabled: boolean) {
  let stage = 'Not started';
  let consent = 'Not checked';
  let lastError = 'None captured';
  const counts = { requested: 0, loaded: 0, opened: 0, failed: 0 };
  const clean = (value: unknown) => String(value ?? '')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]')
    .replace(/(?:\$RCAnonymousID:|appl_|goog_|test_|ca-app-pub-)[\w~/-]+/g, '[identifier]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[identifier]')
    .replace(/[\r\n\t]+/g, ' ').slice(0, 300);
  return {
    stage(value: string) { if (enabled) stage = value; },
    consent(value: boolean) { if (enabled) consent = value ? 'Permitted by Google' : 'Not permitted by Google'; },
    count(event: keyof typeof counts) { if (enabled) counts[event] += 1; },
    error(where: string, error: unknown) {
      if (!enabled) return;
      const value = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : null;
      lastError = `${where}: ${clean(value?.code)} ${clean(value?.message ?? (typeof error === 'string' ? error : 'Unknown error'))}`.trim();
    },
    report(status: Record<string, string | boolean>) {
      if (!enabled) return '';
      return ['Build 7 ad diagnostics (this session only)',
        ...Object.entries(status).map(([key, value]) => `${key}: ${value}`),
        `Last setup stage: ${stage}`, `Google consent: ${consent}`,
        `Requests / loaded / opened / failed: ${counts.requested} / ${counts.loaded} / ${counts.opened} / ${counts.failed}`,
        `Last error: ${lastError}`,
      ].join('\n');
    },
  };
}
