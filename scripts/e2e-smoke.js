/**
 * End-to-end smoke test: drives the real UI with Playwright against a dev
 * stack seeded with `manage.py seed_demo --reset`.
 *
 *   # terminal 1 (backend, raise the login throttle for automated runs)
 *   DRF_THROTTLE_AUTH=500/minute python manage.py runserver 0.0.0.0:8001
 *   # terminal 2 (frontend)
 *   cd bunna-bridge-frontend && npx vite --port 5173
 *   # terminal 3 — reseed first; the run mutates demo data (offers, exports)
 *   python manage.py seed_demo --reset
 *   node scripts/e2e-smoke.js
 *
 * Needs the `playwright` package and a Chromium browser available.
 */
const { chromium } = require('playwright');
const BASE = 'http://localhost:5173', API = 'http://localhost:8001';
const PW = 'Beersheba-Demo-2026';
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
async function token(email) {
  const r = await fetch(API + '/api/auth/token/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  return r.json();
}
async function api(t, path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t.access}`, ...(opts.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function loginUI(page, email, password = PW) {
  await page.goto(BASE + '/login');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 8000 });
}
async function lotId(t, ref) {
  const r = await api(t, '/api/v1/lots/?marketplace=1&page_size=500');
  const mine = await api(t, '/api/v1/lots/?page_size=500');
  return [...r.body.results, ...mine.body.results].find(l => l.lot_id === ref)?.id;
}
process.on('uncaughtException', (e) => { console.log(results.join('\n')); console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });

(async () => {
  const browser = await chromium.launch();
  const newPage = async () => { const c = await browser.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } }); return c.newPage(); };
  const errs = [];

  // 1. Registration through the UI
  let page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + '/register');
  await page.getByRole('button', { name: /Exporter/ }).first().click();
  await page.fill('input[type=email]', 'e2e-exporter@example.com');
  const inputs = page.locator('form input');
  // username is the 4th input (first, last, email, username)
  await inputs.nth(3).fill('e2e-exporter');
  const pw = page.locator('input[type=password]');
  await pw.nth(0).fill('aaaaaaaa'); await pw.nth(1).fill('aaaaaaaa');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
  const weakErr = await page.locator('text=/too common|too short|password/i').count();
  check('Register rejects weak password with a visible reason', weakErr > 0);
  await pw.nth(0).fill('Sidama-Highland-77'); await pw.nth(1).fill('Sidama-Highland-77');
  await page.click('button[type=submit]');
  await page.waitForURL(/login/, { timeout: 8000 }).catch(() => {});
  check('Register succeeds and redirects to login', page.url().includes('/login'), page.url());
  await loginUI(page, 'e2e-exporter@example.com', 'Sidama-Highland-77');
  check('New exporter logs in through the form', page.url().includes('/dashboard'));
  await page.context().close();

  // 2. Buyer makes an offer through the lot page
  const buyerT = await token('buyer@demo.beersheba.et');
  const guj = await lotId(buyerT, 'GUJ-2026-0311');
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'buyer@demo.beersheba.et');
  await page.goto(`${BASE}/marketplace/${guj}`);
  await page.getByRole('button', { name: /Make an offer/i }).click();
  const modalInputs = page.locator('input[type=number]');
  await modalInputs.nth(0).fill('10'); await modalInputs.nth(1).fill('6.75');
  await page.getByRole('button', { name: /Send offer/i }).click();
  await page.waitForTimeout(1000);
  const minErr = await page.locator('text=/Minimum order is/').count();
  check('Offer below minimum order shows the server reason', minErr > 0);
  await modalInputs.nth(0).fill('200');
  await page.getByRole('button', { name: /Send offer/i }).click();
  await page.waitForTimeout(1200);
  const offers = await api(buyerT, '/api/v1/offers/');
  const myOffer = offers.body.results.find(o => o.lot === guj && o.status === 'pending');
  check('Buyer offer created via UI', !!myOffer);
  await page.context().close();

  // 3. Exporter accepts it in the offers inbox
  const expT = await token('exporter@demo.beersheba.et');
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'exporter@demo.beersheba.et');
  await page.goto(BASE + '/offers');
  await page.waitForTimeout(800);
  const card = page.locator('div', { hasText: 'Hambela Natural G1' }).filter({ has: page.getByRole('button', { name: /^Accept$/ }) }).last();
  await card.getByRole('button', { name: /^Accept$/ }).click();
  await page.waitForTimeout(1500);
  const lotAfter = await api(expT, `/api/v1/lots/${guj}/`);
  const p = lotAfter.body.properties;
  check('Accepting the offer contracts the lot and reserves stock', p.status === 'contracted' && Number(p.available_qty_kg) === 1600, `${p.status} ${p.available_qty_kg}`);
  const roasterT = await token('roaster@demo.beersheba.et');
  const roasterOffers = await api(roasterT, '/api/v1/offers/');
  const competing = roasterOffers.body.results.find(o => o.lot === guj && o.buyer !== undefined);
  check('Competing countered offer was closed', competing && competing.status === 'rejected', competing?.status);

  // 4. Compliance panel: DDS blocked on failing lot, export blocked, generate works on a good lot
  const lim = await lotId(expT, 'LIM-2026-0120');
  await page.goto(`${BASE}/lots/${lim}`);
  await page.waitForTimeout(1200);
  const ddsBtn = page.getByRole('button', { name: /Generate EUDR DDS/ });
  check('DDS button disabled for a lot that overlaps forest loss', await ddsBtn.isDisabled());
  check('Failing deforestation gate explains why', (await page.locator('text=/overlaps forest loss/').count()) > 0);

  const yrg = await lotId(expT, 'YRG-2026-0847');
  await page.goto(`${BASE}/lots/${yrg}`);
  await page.waitForTimeout(1200);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    page.getByRole('button', { name: /EUDR DDS/ }).click(),
  ]);
  check('Exporter downloads a generated DDS PDF', !!dl && dl.suggestedFilename().endsWith('.pdf'), dl?.suggestedFilename());
  await page.getByRole('button', { name: /Compliance audit trail/ }).click();
  await page.waitForTimeout(800);
  check('Audit trail shows an intact hash chain', (await page.locator('text=/Hash chain intact/').count()) > 0);

  // 5. Settlement calculator honours the typed NBE rate
  await page.getByLabel('NBE exchange rate, ETB per USD').fill('100');
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/settlement/'), { timeout: 8000 }),
    page.getByRole('button', { name: /^Calculate$/ }).click(),
  ]);
  const body = await resp.json();
  check('Settlement uses the rate typed by the user', body.nbe_rate === 100, `rate=${body.nbe_rate}`);

  // 6. Export path: Bensa (contracted, 7/7) can be exported from the panel
  const sdm = await lotId(expT, 'SDM-2026-0213');
  await page.goto(`${BASE}/lots/${sdm}`);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Mark as exported/ }).click();
  await page.waitForTimeout(1200);
  const sdmAfter = await api(expT, `/api/v1/lots/${sdm}/`);
  check('Contracted 7/7 lot exported from the compliance panel', sdmAfter.body.properties.status === 'exported');
  await page.context().close();

  // 7. Admin verifies exporter2's license -> gate passes on their lot
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'admin@demo.beersheba.et');
  await page.goto(BASE + '/admin/licenses');
  await page.waitForTimeout(1000);
  await page.locator('div', { hasText: 'Kaffa Forest Coffee' }).filter({ has: page.getByRole('button', { name: /^Verify$/ }) }).last()
    .getByRole('button', { name: /^Verify$/ }).click();
  await page.waitForTimeout(1200);
  const e2T = await token('exporter2@demo.beersheba.et');
  const kaf = await lotId(e2T, 'KAF-2026-0007');
  const kafLot = await api(e2T, `/api/v1/lots/${kaf}/`);
  check('Admin verification turns the ECTA gate green', kafLot.body.properties.ecta_license_active === true);

  // 8. Logout revokes the refresh token
  const t = await token('buyer@demo.beersheba.et');
  await page.evaluate(t => { localStorage.setItem('access_token', t.access); localStorage.setItem('refresh_token', t.refresh); localStorage.setItem('user_data', JSON.stringify(t.user)); localStorage.setItem('bb_watchlist', '["x"]'); }, t);
  await page.goto(BASE + '/dashboard');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByText(/Sign out|Log out|Logout/i).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const refresh = await fetch(API + '/api/auth/token/refresh/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: t.refresh }) });
  check('Logout via UI blacklists the refresh token', refresh.status === 401, `status=${refresh.status}`);
  const keptWatch = await page.evaluate(() => localStorage.getItem('bb_watchlist'));
  check('Logout keeps non-auth browser data', keptWatch === '["x"]');
  await page.context().close();

  // 9. Security spot checks against the live API
  const reg = await fetch(API + '/api/v1/auth/register/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'evil@example.com', username: 'evil', password: 'Very-Long-Pass-123', password2: 'Very-Long-Pass-123', role: 'admin' }) });
  check('Registering as admin is refused', reg.status === 400);
  const meEsc = await api(buyerT, '/api/v1/auth/me/', { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
  check('PATCH /me cannot change role', meEsc.body.role === 'buyer');

  console.log(results.join('\n'));
  console.log(errs.length ? 'PAGE ERRORS: ' + JSON.stringify(errs) : 'no page errors');
  await browser.close();
})();
