const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const dist = path.join(projectRoot, 'dist');
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

for (const script of ['dist/site.js', 'dist/site-config.js']) {
  try {
    execFileSync(process.execPath, ['--check', path.join(projectRoot, script)], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`${script}: JavaScript syntax check failed`);
  }
}

const routes = new Map([
  ['/', 'dist/index.html'],
  ['/privacy/', 'dist/privacy/index.html'],
  ['/terms/', 'dist/terms/index.html'],
  ['/delete-account/', 'dist/delete-account/index.html'],
  ['/support/', 'dist/support/index.html'],
]);
const expectedOrigin = 'https://flapfitapp.com';

for (const [route, relativePath] of routes) {
  const fullPath = path.join(projectRoot, relativePath);
  check(fs.existsSync(fullPath), `${route}: route entrypoint is missing`);
  if (!fs.existsSync(fullPath)) continue;
  const html = fs.readFileSync(fullPath, 'utf8');
  const canonical = route === '/' ? `${expectedOrigin}/` : `${expectedOrigin}${route}`;
  check(html.includes(`<link rel="canonical" href="${canonical}">`), `${route}: canonical URL is incorrect`);
  check(html.includes('<main id="main"'), `${route}: main landmark is missing`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  check(new Set(ids).size === ids.length, `${route}: duplicate HTML id found`);

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    const [pathname, hash] = value.split('#');
    const localPath = pathname.endsWith('/')
      ? path.join(dist, pathname.slice(1), 'index.html')
      : path.join(dist, pathname.slice(1));
    check(fs.existsSync(localPath), `${route}: local target ${value} is missing`);
    if (hash && fs.existsSync(localPath)) {
      const targetHtml = fs.readFileSync(localPath, 'utf8');
      check(targetHtml.includes(`id="${hash}"`), `${route}: anchor ${value} is missing`);
    }
  }
}

const allText = fs.readdirSync(dist, { recursive: true })
  .filter((entry) => /\.(?:html|js|txt)$/i.test(entry))
  .map((entry) => fs.readFileSync(path.join(dist, entry), 'utf8'))
  .join('\n');
for (const staleText of ['[REQUIRED]', 'Not configured', 'private draft', 'tracking software download', 'no advertising SDK']) {
  check(!allText.includes(staleText), `stale launch text remains: ${staleText}`);
}

const config = read('dist/site-config.js');
check(config.includes('developerName: "Flap Fit"'), 'app identity is not configured');
check(config.includes('supportEmail: "support@flapfitapp.com"'), 'support email is not configured');
check(config.includes('privacyEmail: "support@flapfitapp.com"'), 'privacy email is not configured');
check(config.includes('privacyEffectiveDate: "September 21, 2026"'), 'privacy effective date is not configured');
check(config.includes('releaseStatus: "development"'), 'release status must remain development until store URLs exist');

const homepage = read('dist/index.html');
check(!homepage.includes('\u2014'), 'homepage contains an em dash');
const privacy = read('dist/privacy/index.html');
for (const phrase of ['bundled with the app', 'Supabase', 'Delete online profile', 'aged 13 and older', 'Google AdMob', 'RevenueCat', 'not proof of ownership', 'Ad privacy settings']) {
  check(privacy.includes(phrase), `privacy policy is missing: ${phrase}`);
}
for (const phrase of ['Quebec is not supported', 'first-game-started flag', 'New York No lasts only', 'one initial game', 'refusals remain respected']) {
  check(privacy.includes(phrase), `availability disclosure is missing: ${phrase}`);
}
const terms = read('dist/terms/index.html');
for (const phrase of ['at least 13', 'report', 'block', 'Record &amp; Play']) {
  check(terms.includes(phrase), `terms are missing: ${phrase}`);
}
const deletion = read('dist/delete-account/index.html');
for (const phrase of ['Open the Info tab.', 'Delete online profile', 'Request deletion by email', 'What is deleted', 'What may be retained']) {
  check(deletion.includes(phrase), `deletion page is missing: ${phrase}`);
}
const support = read('dist/support/index.html');
check(support.includes('support@flapfitapp.com'), 'support page lacks the configured email');
check(support.includes('bundled with the app'), 'support page has incorrect tracking-model guidance');

const siteScript = read('dist/site.js');
for (const route of ['/terms/', '/delete-account/']) {
  check(siteScript.includes(`'${route}'`), `footer link injection is missing ${route}`);
}

const headers = read('dist/_headers');
for (const directive of ['X-Content-Type-Options: nosniff', 'Content-Security-Policy:', 'Permissions-Policy: camera=()']) {
  check(headers.includes(directive), `_headers is missing ${directive}`);
}
check(/^(?:Allow:[ \t]*\/|Disallow:)[ \t]*$/m.test(read('dist/robots.txt')), 'public site must allow crawling');
check(!/^Disallow:\s*\/\s*$/m.test(read('dist/robots.txt')), 'public site must not block all crawling');

if (failures.length) {
  console.error(`Site validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site validation passed: ${routes.size} routes, legal content, links, assets, scripts, and public-site controls verified.`);
