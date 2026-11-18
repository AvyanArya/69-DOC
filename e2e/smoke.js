'use strict';
// End-to-end checks in a real browser against a real server.
//
//   npm run e2e
//
// Starts `node server/index.js` on a free port with a throwaway database
// (APP_ENV=staging, email off, feedback on), then drives Chromium through the
// site and the main journeys. Exits non-zero on the first failure and leaves
// a screenshot in e2e/out/. Set CHROMIUM_PATH to use a specific browser.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SITE_PAGES = ['/', '/worlds.html', '/leaf.html', '/atlas.html', '/shield.html', '/forge.html', '/features.html',
  '/how-it-works.html', '/pricing.html', '/about.html', '/team.html', '/privacy.html', '/terms.html', '/cookies.html', '/refunds.html'];

let passed = 0;
const results = [];
async function step(name, fn) {
  const t = Date.now();
  try { await fn(); passed++; results.push(`ok   ${name} (${Date.now() - t} ms)`); console.log(`ok   ${name}`); }
  catch (err) { results.push(`FAIL ${name}`); console.error(`FAIL ${name}\n${err.stack || err}`); throw err; }
}

(async () => {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumera-e2e-'));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', APP_ENV: 'staging', NODE_ENV: 'development', DATA_DIR: dataDir,
      PUBLIC_DIR: path.join(ROOT, 'public'), ADMIN_EMAILS: 'admin@e2e.test', SUPPORT_EMAIL: 'team@e2e.test',
      RESEND_API_KEY: '', SITE_PASSWORD: '', LOG_REQUESTS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch (e) { /* not up yet */ } await sleep(100); }

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const problems = [];
  const watch = (page, label) => {
    page.on('pageerror', (e) => problems.push(`${label}: page error: ${e.message}`));
    page.on('console', (m) => {
      const t = m.text();
      // The hero video and icon services live on the internet; a sandbox without it is not a site bug.
      if (m.type() === 'error' && !/net::ERR_|Failed to load resource/.test(t)) problems.push(`${label}: console: ${t}`);
      if (/Content Security Policy/i.test(t)) problems.push(`${label}: CSP violation: ${t}`);
    });
  };
  const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }).catch(() => {});
  let page;
  const email = `member${Date.now()}@e2e.test`;
  const password = 'a long e2e password';

  try {
    // ---------- the public site ----------
    for (const width of [1440, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      page = await ctx.newPage(); watch(page, `site@${width}`);
      for (const p of SITE_PAGES) {
        await step(`site ${p} at ${width}px loads, no sideways scroll`, async () => {
          const r = await page.goto(base + p);
          assert.equal(r.status(), 200);
          await page.waitForTimeout(250);
          const sw = await page.evaluate(() => document.documentElement.scrollWidth);
          assert.ok(sw <= width + 1, `page is ${sw}px wide`);
        });
      }
      await ctx.close();
    }
    await step('every internal link on the site resolves', async () => {
      const ctx = await browser.newContext(); const pg = await ctx.newPage();
      const links = new Set();
      for (const p of SITE_PAGES) { await pg.goto(base + p); (await pg.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))).forEach((h) => links.add(h)); }
      const bad = [];
      for (const h of links) {
        if (/^(https?:|mailto:|tel:|#|javascript:)/.test(h)) continue;
        const u = new URL(h, base + '/'); u.hash = '';
        const r = await fetch(u); if (r.status >= 400) bad.push(`${h} -> ${r.status}`);
      }
      assert.deepEqual(bad, []);
      await ctx.close();
    });

    // ---------- sign up, questionnaire, expense review, dashboard ----------
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await ctx.newPage(); watch(page, 'app');
    await step('signing up with a weak password shows a clear error', async () => {
      await page.goto(base + '/app.html#/signup');
      await page.fill('input[name=name]', 'E2E Member');
      await page.fill('input[name=email]', email);
      await page.fill('input[name=new-password]', 'password123');
      await page.check('input[type=checkbox]');
      await page.click('button:has-text("Create account")');
      await page.getByText('too easy to guess').waitFor({ timeout: 5000 });
    });
    await step('sign up with a good password opens the questionnaire', async () => {
      await page.fill('input[name=new-password]', password);
      await page.click('button:has-text("Create account")');
      await page.waitForFunction(() => location.hash.startsWith('#/onboarding'), null, { timeout: 8000 });
    });
    await step('questionnaire: answer every step, then the expense review, then the dashboard', async () => {
      // Each step: fill the income on the Income step, pick the first answer
      // if the step needs one, then press the step's forward button.
      const forward = async () => {
        for (const t of ['Generate my dashboard', 'Finish', 'Continue', 'Start']) {
          const b = page.locator(`button:visible:has-text("${t}")`).last();
          if (await b.count()) return b;
        }
        return null;
      };
      for (let i = 0; i < 40; i++) {
        const hash = await page.evaluate(() => location.hash);
        if (!/onboarding|review/.test(hash)) break;
        const title = await page.locator('h1').first().innerText().catch(() => '');
        if (/^Income/.test(title)) await page.locator('.quiz-body input:visible').first().fill('2500');
        let b = await forward();
        if (b && !(await b.isEnabled())) { await page.locator('.quiz-body button:visible').first().click(); b = await forward(); }
        if (!b) { await page.locator('.quiz-body button:visible').first().click(); continue; }
        await b.click();
        await page.waitForTimeout(200);
      }
      await page.waitForFunction(() => location.hash.startsWith('#/dashboard'), null, { timeout: 8000 });
      await page.getByText('Your money,').first().waitFor();
      await shot(page, 'dashboard');
    });
    await step('figures are saved on the server and survive a reload', async () => {
      await page.waitForTimeout(1500);   // the app saves a moment after changes
      const st = await page.evaluate(async () => (await (await fetch('/api/me/state')).json()).state);
      assert.equal(st.onboarded, true);
      assert.equal(Number(st.expenses.salary || st.expenses.income || Object.values(st.expenses).find((v) => v === 2500)), 2500);
      await page.reload();
      await page.waitForFunction(() => location.hash.startsWith('#/dashboard'), null, { timeout: 8000 });
      await page.getByText('Your money,').first().waitFor();
    });
    await step('an unlaunched world shows Coming soon, even by URL', async () => {
      await page.evaluate(() => { location.hash = '#/market'; });
      await page.getByText('Coming soon · not out yet').first().waitFor({ timeout: 5000 });
      await page.evaluate(() => { location.hash = '#/forge'; });
      await page.getByText('Coming soon · not out yet').first().waitFor({ timeout: 5000 });
    });
    await step('community: set up a profile and post', async () => {
      await page.evaluate(() => { location.hash = '#/community'; });
      await page.locator('input:visible').first().waitFor();
      const r = await page.evaluate(async () => {
        const h = { 'X-Lumera': '1', 'Content-Type': 'application/json' };
        await fetch('/api/community/profile', { method: 'PUT', headers: h, body: JSON.stringify({ displayName: 'E2E Member', headline: 'Testing' }) });
        return (await fetch('/api/community/posts', { method: 'POST', headers: h, body: JSON.stringify({ body: 'Hello from the end-to-end test', tag: 'Update' }) })).status;
      });
      assert.equal(r, 201);
      await page.reload();
      await page.getByText('Hello from the end-to-end test').waitFor({ timeout: 8000 });
    });
    await step('feedback button sends feedback to the team', async () => {
      await page.click('button:has-text("Feedback")');
      await page.fill('textarea[name=lm-feedback]', 'E2E: the community page loads fine');
      await page.click('button:has-text("Send to the team")');
      await page.getByText('Thank you').waitFor({ timeout: 5000 });
      await page.click('button:has-text("Done")');
    });
    await step('log out returns to the website; log in brings the dashboard back', async () => {
      await page.evaluate(() => { location.hash = '#/settings'; });
      await page.waitForTimeout(400);
      const r = await page.evaluate(async () => (await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Lumera': '1' } })).status);
      assert.equal(r, 200);
      await page.goto(base + '/app.html#/login');
      await page.fill('input[name=email]', email);
      await page.fill('input[name=password]', 'wrong password here');
      await page.click('form button[type=submit]');
      await page.getByText('do not match').waitFor({ timeout: 5000 });
      await page.fill('input[name=password]', password);
      await page.click('form button[type=submit]');
      await page.waitForFunction(() => location.hash.startsWith('#/dashboard'), null, { timeout: 8000 });
    });
    await step('forgot password explains how to get a link while email is off', async () => {
      const p2 = await (await browser.newContext()).newPage(); watch(p2, 'forgot');
      await p2.goto(base + '/app.html#/forgot');
      await p2.getByText('Reset emails are not switched on yet').waitFor({ timeout: 5000 });
      await p2.getByText('team@e2e.test').first().waitFor();
      await p2.context().close();
    });
    await step('the dashboard fits a phone screen', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => { location.hash = '#/dashboard'; });
      await page.waitForTimeout(800);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(sw <= 391, `dashboard is ${sw}px wide at 390`);
      await shot(page, 'dashboard-phone');
      await page.setViewportSize({ width: 1280, height: 900 });
    });
    await step('members cannot use the admin portal', async () => {
      const p3 = await ctx.newPage();
      await p3.goto(base + '/admin-portal.html');
      await p3.getByText('does not have admin access').waitFor({ timeout: 8000 });
      const r = await p3.evaluate(async () => (await fetch('/api/admin/overview')).status);
      assert.equal(r, 403);
      await p3.close();
    });
    await ctx.close();

    // ---------- the admin portal ----------
    await step('an admin signs in to the portal and sees the team feedback', async () => {
      const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const ap = await actx.newPage(); watch(ap, 'admin');
      await ap.goto(base + '/app.html#/signup');
      await ap.fill('input[name=name]', 'Admin'); await ap.fill('input[name=email]', 'admin@e2e.test');
      await ap.fill('input[name=new-password]', 'admin long password'); await ap.check('input[type=checkbox]');
      await ap.click('button:has-text("Create account")');
      await ap.waitForFunction(() => location.hash.startsWith('#/onboarding'), null, { timeout: 8000 });
      await ap.goto(base + '/admin-portal.html');
      await ap.getByText('These figures come straight from the database').waitFor({ timeout: 8000 });
      await ap.click('[data-tab=teamfeedback]');
      await ap.getByText('E2E: the community page loads fine').waitFor({ timeout: 5000 });
      await shot(ap, 'admin-feedback');
      await actx.close();
    });

    // ---------- resilience ----------
    await step('if the server cannot be reached, the app says so (no password-less fallback)', async () => {
      const octx = await browser.newContext();
      const op = await octx.newPage();
      await op.route('**/api/health', (r) => r.abort());
      await op.goto(base + '/app.html#/login');
      await op.getByText('We can’t reach Lumera right now').waitFor({ timeout: 30000 });
      assert.equal(await op.locator('input[name=password]').count(), 0);
      await octx.close();
    });
    await step('the demo account works and is labelled as example data', async () => {
      const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const dp = await dctx.newPage(); watch(dp, 'demo');
      await dp.goto(base + '/app.html?preview=demo#/dashboard');
      await dp.getByText('Your money,').first().waitFor({ timeout: 10000 });
      await dp.getByText('example data', { exact: false }).first().waitFor();
      await dctx.close();
    });

    await step('accessibility: no serious or critical WCAG 2 A/AA issues (axe-core) on key screens', async () => {
      const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
      const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const ap = await actx.newPage();
      const found = [];
      const pages = ['/', '/pricing.html', '/team.html', '/privacy.html', '/app.html#/login', '/app.html#/signup', '/app.html#/forgot',
        '/app.html?preview=demo#/dashboard', '#/subscriptions', '#/community', '#/settings', '#/recommendations', '#/goals', '#/budget'];
      for (const u of pages) {
        if (u.startsWith('#')) await ap.evaluate((h) => { location.hash = h; }, u); else await ap.goto(base + u);
        await ap.waitForTimeout(1200);
        await ap.evaluate(AXE);
        const v = await ap.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }))
          .violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => `${x.id} (${x.nodes.length})`));
        if (v.length) found.push(`${u}: ${v.join(', ')}`);
      }
      await actx.close();
      assert.deepEqual(found, []);
    });
    await step('no page errors, console errors or CSP violations anywhere', async () => {
      assert.deepEqual(problems, []);
    });
  } catch (err) {
    if (page) await shot(page, 'failure');
    console.error('\nServer log:\n' + serverLog.slice(-3000));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill('SIGTERM');
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.writeFileSync(path.join(OUT, 'results.txt'), results.join('\n') + '\n');
    console.log(`\n${passed} passed${process.exitCode ? ', 1 failed' : ''}. Screenshots in e2e/out/.`);
  }
})();
