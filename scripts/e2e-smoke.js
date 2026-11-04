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
  const ddsBtn = page.getByRole('button', { name: /Download summary \(PDF\)/ });
  check('Summary PDF disabled for a lot that overlaps forest loss', await ddsBtn.isDisabled());
  check('Failing deforestation gate explains why', (await page.locator('text=/overlaps forest loss/').count()) > 0);

  const yrg = await lotId(expT, 'YRG-2026-0847');
  await page.goto(`${BASE}/lots/${yrg}`);
  await page.waitForTimeout(1200);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    page.getByRole('button', { name: /Download summary \(PDF\)/ }).click(),
  ]);
  check('Exporter downloads the due-diligence summary PDF', !!dl && dl.suggestedFilename().endsWith('.pdf'), dl?.suggestedFilename());
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

  // 6. Export path: Bensa (contracted, mapped, consented) — sign off the risk
  // assessment and generate the importer's evidence package in the UI, then export.
  const sdm = await lotId(expT, 'SDM-2026-0213');
  await page.goto(`${BASE}/lots/${sdm}`);
  await page.waitForTimeout(1200);
  check('Export locked before due diligence is complete',
    await page.getByRole('button', { name: /Export locked/ }).isDisabled());
  await page.getByRole('button', { name: /Sign off risk assessment/ }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Generate evidence package/ }).click();
  await page.waitForTimeout(1500);
  check('Evidence package generated from the lot page', (await page.locator('text=/Evidence ready/').count()) > 0);
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

  // 10. Phase 1 traceability: register a producer + plot + consent in the UI
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'exporter@demo.beersheba.et');
  await page.goto(BASE + '/producers');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Add producer/ }).click();
  await page.getByLabel('Name', { exact: true }).fill('E2E Producer');
  await page.getByLabel(/Your reference/).fill('E2E-001');
  await page.getByRole('button', { name: /Save and add plots/ }).click();
  await page.waitForURL(/producers\/[0-9a-f-]+/, { timeout: 8000 });
  await page.getByRole('button', { name: /Add point/ }).click();
  await page.getByLabel('Latitude').fill('6.33');
  await page.getByLabel('Longitude').fill('38.22');
  await page.getByLabel(/Area stated/).fill('1.5');
  await page.getByRole('button', { name: /Save plot/ }).click();
  await page.waitForTimeout(1200);
  const prods = await api(expT, '/api/v1/traceability/producers/?search=E2E-001');
  const prod = (prods.body.results || prods.body)[0];
  check('Producer created from the UI', !!prod && prod.plots_count === 1, `plots=${prod?.plots_count}`);
  const plots = await api(expT, `/api/v1/traceability/plots/?producer=${prod?.id}`);
  const plot = (plots.body.results || plots.body)[0];
  check('Plot saved and checked against forest-loss data', plot && plot.deforestation_status === 'clear', plot?.deforestation_status);
  await page.getByRole('button', { name: /^Record$/ }).click();
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.waitForTimeout(1000);
  check('Consent recorded from the UI', (await page.locator('text=/EUDR consent given/').count()) > 0);
  const swapped = await api(expT, '/api/v1/traceability/plots/', { method: 'POST', body: JSON.stringify({ producer: prod?.id, location: { type: 'Point', coordinates: [6.33, 38.22] } }) });
  check('Swapped lat/lng is rejected', swapped.status === 400);
  const guj2 = await lotId(expT, 'GUJ-2026-0311');
  const so = await api(expT, `/api/v1/lots/${guj2}/sign-off/`, { method: 'POST', body: JSON.stringify({ conclusion: 'x' }) });
  check('Sign-off refused while a high risk (missing consent) is open', so.status === 400);
  await page.context().close();

  // 11. EU importer: evidence package + DDS reference; public trust profile
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'importer@demo.beersheba.et');
  const harT = await token('importer@demo.beersheba.et');
  const har = await lotId(harT, 'HAR-2025-0098');
  await page.goto(`${BASE}/marketplace/${har}`);
  await page.waitForTimeout(1500);
  const [zip] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    page.getByRole('button', { name: /Download package/ }).first().click(),
  ]);
  check('Importer downloads the evidence package ZIP', !!zip && zip.suggestedFilename().endsWith('.zip'), zip?.suggestedFilename());
  check('Recorded DDS reference is shown', (await page.locator('text=26DEHH4Q7N2Z81').count()) > 0);
  const notImp = await api(buyerT, `/api/v1/lots/${har}/due-diligence/`);
  check('Buyer without an accepted offer cannot see the evidence', notImp.status === 404);
  await page.goto(`${BASE}/story/${har}`);
  await page.waitForTimeout(1200);
  check('Public story shows the traceability profile', (await page.locator('text=/Traceable to the farm/').count()) > 0);
  check('Public story hides producer names', (await page.locator('text=/Gara Muleta Estate/').count()) === 0);
  await page.context().close();

  // 12. Phase 2 — team invitation: owner invites, teammate registers from the link and shares the lots
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'exporter@demo.beersheba.et');
  await page.goto(BASE + '/settings/team');
  await page.waitForTimeout(800);
  await page.getByLabel('Email', { exact: true }).fill('e2e-mate@example.com');
  await page.getByRole('button', { name: /Create invitation/ }).click();
  await page.waitForTimeout(800);
  const org = await api(expT, '/api/v1/orgs/me/');
  const inv = org.body.invitations.find(i => i.email === 'e2e-mate@example.com');
  check('Owner creates an invitation in the UI', !!inv);
  const mateCtx = await newPage();
  await mateCtx.goto(`${BASE}/invite/${inv?.token}`);
  await mateCtx.getByRole('button', { name: /Create your account/ }).click();
  await mateCtx.waitForURL(/register\?invite=/);
  const mInputs = mateCtx.locator('form input');
  await mInputs.nth(0).fill('Team'); await mInputs.nth(1).fill('Mate');
  await mInputs.nth(3).fill('e2e-mate');
  const mpw = mateCtx.locator('input[type=password]');
  await mpw.nth(0).fill('Highland-Coffee-2026!'); await mpw.nth(1).fill('Highland-Coffee-2026!');
  await mateCtx.click('button[type=submit]');
  await mateCtx.waitForURL(/login/, { timeout: 8000 }).catch(() => {});
  const mateT = await fetch(API + '/api/auth/token/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'e2e-mate@example.com', password: 'Highland-Coffee-2026!' }) }).then(r => r.json());
  check('Invited teammate joins the organisation', mateT.user?.organization?.name === 'Highland Exports PLC', mateT.user?.organization?.team_role);
  const mateLots = await api(mateT, '/api/v1/lots/?page_size=50');
  check('Teammate sees the team\'s lots', (mateLots.body.results || []).some(l => l.lot_id === 'YRG-2026-0847'));
  await mateCtx.context().close();

  // 13. Cherry intake: record a delivery with payment; producer gets an SMS receipt
  await page.goto(BASE + '/intake');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Record delivery/ }).click();
  const prodSel = page.getByLabel('Producer');
  await prodSel.selectOption({ label: 'Mulu Gebre (KOC-002)' });
  await page.getByLabel('Receipt no.').fill('E2E-0001');
  await page.getByLabel('Weight (kg)').fill('100');
  await page.getByLabel('Price (ETB/kg)').fill('120');
  await page.getByLabel(/Paid now/).fill('12000');
  await page.getByRole('button', { name: /Save and next/ }).click();
  await page.waitForTimeout(1200);
  const dl2 = await api(expT, '/api/v1/traceability/deliveries/?search=E2E-0001');
  check('Delivery and payment recorded from the UI', dl2.body.results?.[0]?.amount_paid_etb?.startsWith('12000'));

  // 14. Cooperative sale accepted, then its delivery allocated to a lot
  await page.goto(BASE + '/supply');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Accept$/ }).click();
  await page.waitForTimeout(1000);
  const avail = await api(expT, '/api/v1/traceability/plots/?available=1&page_size=200');
  check('Accepted cooperative sale makes member plots usable', (avail.body.results || []).some(p => p.producer_name === 'Worku Abate'));
  await page.context().close();

  // 15. Field app works offline: register a farmer with no network, sync when back online
  const fctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 6.33, longitude: 38.22 }, permissions: ['geolocation'] });
  const fpage = await fctx.newPage();
  fpage.on('pageerror', e => errs.push(String(e)));
  const agentT = await token('agent@demo.beersheba.et');
  await fpage.goto(BASE + '/login');
  await fpage.evaluate(t => { localStorage.setItem('access_token', t.access); localStorage.setItem('refresh_token', t.refresh); localStorage.setItem('user_data', JSON.stringify(t.user)); }, agentT);
  await fpage.goto(BASE + '/field');
  await fpage.waitForTimeout(1500);
  await fctx.setOffline(true);
  await fpage.evaluate(() => window.dispatchEvent(new Event('offline')));
  await fpage.getByRole('button', { name: /Register a farmer/ }).click();
  await fpage.getByLabel('Full name').fill('Offline Farmer E2E');
  await fpage.getByLabel('Mobile number').fill('0912345678');
  await fpage.getByRole('button', { name: /^Next$/ }).click();
  await fpage.getByLabel('The farmer agrees').check();
  await fpage.getByRole('button', { name: /^Next$/ }).click();
  await fpage.getByLabel('Size (hectares)').fill('1.2');
  await fpage.getByRole('button', { name: /Use my location/ }).click();
  await fpage.waitForTimeout(800);
  await fpage.getByRole('button', { name: /^Save$/ }).click();
  await fpage.waitForTimeout(600);
  const waiting = await fpage.locator('text=/items waiting to sync/').count();
  check('Field app queues a farmer, consent and plot while offline', waiting > 0);
  await fctx.setOffline(false);
  await fpage.evaluate(() => window.dispatchEvent(new Event('online')));
  await fpage.waitForTimeout(2500);
  const synced = await api(expT, '/api/v1/traceability/producers/?search=Offline%20Farmer%20E2E');
  const sp = (synced.body.results || [])[0];
  check('Queued items sync when back online', !!sp && sp.plots_count === 1 && sp.eudr_consent === true, JSON.stringify(sp && { plots: sp.plots_count, consent: sp.eudr_consent }));
  await fpage.getByLabel('Language').selectOption('am');
  check('Field app switches to Amharic', (await fpage.locator('text=አርሶ አደር መዝግብ').count()) > 0);
  await fctx.close();

  // 16. Farmer sees their own deliveries and payments
  page = await newPage();
  await loginUI(page, 'farmer@demo.beersheba.et');
  await page.goto(BASE + '/farm');
  await page.waitForTimeout(1200);
  check('Farmer sees deliveries and payments', (await page.locator('text=KWS-26-0001').count()) > 0);
  await page.context().close();

  // 17. Phase 3 — contract: buyer countersigns in the UI, exporter registers it with ECTA
  const buyerContracts = await api(buyerT, '/api/v1/trade/contracts/');
  const bensaC = buyerContracts.body.find(c => c.lot_code === 'SDM-2026-0213');
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'buyer@demo.beersheba.et');
  await page.goto(`${BASE}/contracts/${bensaC.id}`);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Countersign contract/ }).click();
  await page.waitForTimeout(1000);
  let bc = await api(buyerT, `/api/v1/trade/contracts/${bensaC.id}/`);
  check('Buyer countersigns the contract in the UI', bc.body.status === 'signed', bc.body.status);

  // 19. Messages: buyer writes to the exporter from a marketplace lot
  const yrgLot = await lotId(buyerT, 'YRG-2026-0847');
  await page.goto(`${BASE}/marketplace/${yrgLot}`);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Message the exporter/ }).click();
  await page.waitForURL(/messages\?c=/, { timeout: 8000 });
  await page.getByLabel('Message').fill('E2E: is the March slot still free?');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.waitForTimeout(800);
  await page.context().close();
  const inbox = await api(expT, '/api/v1/trade/conversations/');
  check('Exporter receives the buyer message', inbox.body.unread >= 1 && inbox.body.results.some(c => c.last_message.includes('March slot')));

  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'exporter@demo.beersheba.et');
  await page.goto(`${BASE}/contracts/${bensaC.id}`);
  await page.waitForTimeout(1000);
  await page.getByLabel('ECTA registration no.').fill('ECTA/CR/E2E/001');
  await page.getByRole('button', { name: /Record registration/ }).click();
  await page.waitForTimeout(1000);
  bc = await api(expT, `/api/v1/trade/contracts/${bensaC.id}/`);
  check('Exporter records the ECTA registration', bc.body.status === 'registered' && bc.body.ecta_registration_number === 'ECTA/CR/E2E/001');

  // 18. Shipment with a forwarder; forwarder posts a milestone; loading blocked without an approved sample
  await page.getByRole('button', { name: /Book shipment/ }).click();
  await page.getByLabel(/Forwarder's email/).fill('forwarder@demo.beersheba.et');
  await page.getByLabel('Container no.').fill('MSKU 9990001');
  await page.getByRole('button', { name: /Create shipment/ }).click();
  await page.waitForTimeout(1000);
  const ships = await api(expT, `/api/v1/trade/contracts/${bensaC.id}/shipments/`);
  check('Shipment created with the export document checklist', ships.body[0]?.documents?.length === 9, String(ships.body[0]?.documents?.length));
  // Payment received + NBE conversion recorded in the UI
  await page.getByRole('button', { name: /Payment received/ }).click();
  await page.getByLabel('Amount (USD)').fill('1000');
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Record conversion/ }).click();
  await page.getByLabel('Rate (ETB/USD)').fill('155');
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.waitForTimeout(800);
  const pay = await api(expT, `/api/v1/trade/contracts/${bensaC.id}/payments/`);
  check('Payment and 50% NBE conversion recorded', pay.body.summary.received_usd === '1000.00' && pay.body.summary.nbe_conversion_ok === true, JSON.stringify(pay.body.summary.converted_etb));
  await page.context().close();

  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'forwarder@demo.beersheba.et');
  await page.goto(`${BASE}/contracts/${bensaC.id}`);
  await page.waitForTimeout(1000);
  await page.getByLabel('Milestone').selectOption('stuffed');
  await page.getByLabel('Location').fill('Addis Ababa');
  await page.getByRole('button', { name: /Add milestone/ }).click();
  await page.waitForTimeout(800);
  await page.getByLabel('Milestone').selectOption('loaded');
  await page.getByRole('button', { name: /Add milestone/ }).click();
  await page.waitForTimeout(800);
  const blocked = await page.locator('text=/pre-shipment sample/').count();
  const ships2 = await api(expT, `/api/v1/trade/contracts/${bensaC.id}/shipments/`);
  check('Forwarder records a milestone', ships2.body[0].events.some(e => e.kind === 'stuffed'));
  check('Loading is blocked until the buyer approves the pre-shipment sample', blocked > 0 && !ships2.body[0].events.some(e => e.kind === 'loaded'));
  await page.context().close();

  // 20. Phase 4 — Q-grader cups a lot with CVA and confirms the score
  const qT = await token('qgrader@demo.beersheba.et');
  const hamLot = await lotId(qT, 'GUJ-2026-0311');
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'qgrader@demo.beersheba.et');
  await page.goto(`${BASE}/lots/${hamLot}/cup`);
  await page.waitForTimeout(1000);
  for (const attr of ['Fragrance', 'Aroma', 'Flavor', 'Acidity', 'Sweetness', 'Overall']) {
    await page.getByRole('radiogroup', { name: `${attr} liking` }).getByRole('radio', { name: '7' }).click();
  }
  await page.getByLabel('Tasting notes').fill('blueberry, cacao');
  await page.getByRole('button', { name: /Submit assessment/ }).click();
  await page.waitForTimeout(800);
  check('CVA score saved and shown', (await page.locator('text=/Saved — 88\\.19 points/').count()) > 0);
  await page.getByRole('button', { name: /Confirm and publish score/ }).click();
  await page.waitForURL(/\/lots\/[0-9a-f-]+$/, { timeout: 8000 });
  const hamCva = await api(qT, `/api/v1/quality/lots/${hamLot}/cva/`);
  check('Confirmed CVA becomes the lot score', hamCva.body.latest?.method === 'CVA' && hamCva.body.latest?.score === 88.19, JSON.stringify(hamCva.body.latest));

  // 21. Blind session: the Q-grader scores both coded cups; the organiser reveals
  const sessions = await api(qT, '/api/v1/quality/sessions/');
  const openS = sessions.body.find(x => x.status === 'open');
  await page.goto(`${BASE}/cupping-sessions/${openS.id}`);
  await page.waitForTimeout(1000);
  const blindName = await page.locator('text=/HAR-2025-0098/').count();
  check('Blind session hides lot names from the grader', blindName === 0);
  for (let i = 0; i < 2; i++) {
    await page.getByRole('radiogroup', { name: 'Flavor liking' }).getByRole('radio', { name: String(7 - i) }).click();
    await page.getByRole('button', { name: /Save score/ }).click();
    await page.waitForTimeout(900);
  }
  await page.context().close();
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'exporter@demo.beersheba.et');
  await page.goto(`${BASE}/cupping-sessions/${openS.id}`);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Close scoring/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Reveal results/ }).click();
  await page.waitForTimeout(1000);
  const sess = await api(expT, `/api/v1/quality/sessions/${openS.id}/`);
  check('Organiser reveals results with panel means', sess.body.status === 'revealed' && sess.body.results.samples.every(x => x.n === 1));

  // 22. Physical analysis recorded in the UI gets an SCA green grade
  const benLot = await lotId(expT, 'SDM-2026-0213');
  await page.goto(`${BASE}/lots/${benLot}`);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Record analysis/ }).click();
  await page.getByLabel('Moisture %').fill('10.9');
  await page.getByLabel('Water activity').fill('0.55');
  await page.getByLabel(/^Full black/).fill('1');
  await page.getByRole('button', { name: /Save analysis/ }).click();
  await page.waitForTimeout(1000);
  const phys = await api(expT, `/api/v1/quality/lots/${benLot}/physical/`);
  check('Lab analysis graded (a primary defect rules out Specialty)', phys.body[0]?.sca_green_grade === 'Premium', phys.body[0]?.sca_green_grade);
  await page.context().close();

  // 23. Phase 5 — Beersheba Select: importer outbids the buyer in the live auction
  const impT = await token('importer@demo.beersheba.et');
  const progs = await api(impT, '/api/v1/market/select/');
  const prog = progs.body.find(x => x.status === 'auction');
  check('Select programme with a live auction', !!prog);
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'importer@demo.beersheba.et');
  await page.goto(`${BASE}/select/${prog.id}`);
  await page.waitForTimeout(1200);
  const before = (await api(impT, `/api/v1/market/select/${prog.id}/`)).body.entries.find(x => x.lot_code === 'YRG-2026-0847');
  await page.getByLabel('Bid for YRG-2026-0847').fill(before.next_min_bid_usd);
  await page.getByRole('button', { name: /^Bid$/ }).first().click();
  await page.waitForTimeout(1200);
  const after = (await api(impT, `/api/v1/market/select/${prog.id}/`)).body.entries.find(x => x.lot_code === 'YRG-2026-0847');
  check('Bid placed in the UI makes the importer the high bidder', after.i_am_winning && after.bids_count === before.bids_count + 1, after.high_bid_usd);
  check('Bidding page shows the winning status', await page.locator('text=You are the highest bidder').count() > 0);
  const low = await api(impT, `/api/v1/market/select/entries/${after.id}/bid/`, { method: 'POST', body: JSON.stringify({ price_usd_per_kg: after.high_bid_usd }) });
  check('A bid below the next minimum is refused', low.status === 400);

  // 24. EU stock: importer lists, buyer orders by the bag, importer confirms
  await page.goto(`${BASE}/eu-stock?tab=orders`);
  await page.waitForTimeout(1000);
  const seededOrder = await page.locator('text=/From Sarah|Nordic Green/').count();
  check('Importer sees the order received for EU stock', seededOrder > 0);
  await page.context().close();
  const rstT = await token('roaster@demo.beersheba.et');
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'roaster@demo.beersheba.et');
  await page.goto(`${BASE}/eu-stock`);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'More bags' }).first().click();
  await page.getByRole('button', { name: 'More bags' }).first().click();
  await page.getByPlaceholder('Roastery address, or collect').fill('Collect');
  await page.getByRole('button', { name: /Request order/ }).click();
  await page.waitForTimeout(1200);
  const rOrders = await api(rstT, '/api/v1/market/orders/');
  const rOrder = rOrders.body[0];
  check('Roaster orders 2 bags of EU stock', rOrder && rOrder.status === 'requested' && rOrder.lines[0].bags === 2, rOrder?.total_eur);
  const conf = await api(impT, `/api/v1/market/orders/${rOrder.id}/confirm/`, { method: 'POST' });
  const stockAfter = (await api(impT, '/api/v1/market/stock/?mine=1')).body[0];
  check('Importer confirms; bags are reserved', conf.status === 200 && stockAfter.bags_available === 14, String(stockAfter.bags_available));
  await page.context().close();

  // 25. Saved search, impact score and the learn hub
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await loginUI(page, 'buyer@demo.beersheba.et');
  await page.goto(`${BASE}/marketplace?origin=sidama`);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Save search/ }).click();
  await page.getByLabel('Search name').fill('Sidama lots');
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.waitForTimeout(900);
  const bT = await token('buyer@demo.beersheba.et');
  const searches = await api(bT, '/api/v1/market/saved-searches/');
  check('Buyer saves a marketplace search with alerts', searches.body.some(x => x.name === 'Sidama lots' && x.filters.origin === 'sidama' && x.alert));
  const kLot = await lotId(bT, 'YRG-2026-0847');
  await page.goto(`${BASE}/marketplace/${kLot}`);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Show how this is scored/ }).first().click();
  check('Lot shows an explainable impact score', await page.locator('text=Farmers\' share of the export price').count() > 0);
  await page.context().close();
  page = await newPage();
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${BASE}/learn`);
  await page.waitForTimeout(1200);
  await page.getByRole('link', { name: /Buying Ethiopian coffee under the EUDR/ }).click();
  await page.waitForTimeout(1000);
  check('Learn hub is public and renders article headings', await page.getByRole('heading', { name: 'What Beersheba provides' }).count() === 1);
  await page.context().close();

  console.log(results.join('\n'));
  console.log(errs.length ? 'PAGE ERRORS: ' + JSON.stringify(errs) : 'no page errors');
  await browser.close();
})();
