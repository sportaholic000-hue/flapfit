const targets = [
  ['EXPO_PUBLIC_MARKETING_URL', ['flap fit']],
  ['EXPO_PUBLIC_PRIVACY_URL', ['flap fit', 'privacy']],
  ['EXPO_PUBLIC_TERMS_URL', ['flap fit', 'terms']],
  ['EXPO_PUBLIC_ACCOUNT_DELETION_URL', ['flap fit', 'delet']],
];

const failures = [];

async function checkPage([key, requiredPhrases]) {
  const value = String(process.env[key] ?? '').trim();
  if (!value) {
    failures.push(`${key}: missing`);
    return;
  }

  try {
    const response = await fetch(value, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'FlapFit-Release-Preflight/1.0' },
    });
    if (!response.ok) {
      failures.push(`${key}: returned HTTP ${response.status}`);
      return;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('text/html')) {
      failures.push(`${key}: expected an HTML page, received ${contentType || 'unknown content'}`);
      return;
    }

    const body = (await response.text()).slice(0, 1_000_000).toLowerCase();
    for (const phrase of requiredPhrases) {
      if (!body.includes(phrase)) failures.push(`${key}: page does not mention "${phrase}"`);
    }
  } catch (error) {
    failures.push(`${key}: ${error instanceof Error ? error.message : 'request failed'}`);
  }
}

async function main() {
  await Promise.all(targets.map(checkPage));
  if (failures.length) {
    console.error('Flap Fit public release links are not ready:\n');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log('Flap Fit public release links are live and contain the required page labels.');
}

void main();
