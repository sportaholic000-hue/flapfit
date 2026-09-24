import { createAdDeliveryDiagnostics } from '../adDeliveryDiagnostics';

test('disabled diagnostics collect nothing and expose no report', () => {
  const diagnostic = createAdDeliveryDiagnostics(false);
  diagnostic.stage('Ready'); diagnostic.count('requested'); diagnostic.consent(true);
  diagnostic.error('Ad load', new Error('Failure'));
  expect(diagnostic.report({ ready: true })).toBe('');
});

test('reports request progress and native error code without identifiers or URLs', () => {
  const diagnostic = createAdDeliveryDiagnostics(true);
  diagnostic.stage('Ready'); diagnostic.consent(true);
  diagnostic.count('requested'); diagnostic.count('failed');
  diagnostic.error('Ad load', { code: 'googleMobileAds/no-fill', message: 'No fill ca-app-pub-123/456 from 1.2.3.4 user@example.com https://example.com/private appl_private 12345678-abcd-1234-abcd-123456789abc' });
  const report = diagnostic.report({ ready: true });
  expect(report).toContain('Requests / loaded / opened / failed: 1 / 0 / 0 / 1');
  expect(report).toContain('Google consent: Permitted by Google');
  expect(report).toContain('googleMobileAds/no-fill');
  expect(report).not.toMatch(/ca-app-pub|1\.2\.3\.4|user@example|https:|appl_private|12345678/);
});

test('error size is bounded and arbitrary error object properties are never retained', () => {
  const diagnostic = createAdDeliveryDiagnostics(true);
  diagnostic.error('Google consent update', { message: 'x'.repeat(5000), rawAge: 40, customerId: 'private-customer' });
  const report = diagnostic.report({});
  expect(report.length).toBeLessThan(700);
  expect(report).not.toMatch(/rawAge|private-customer/);
});
