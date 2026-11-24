// Walk through every screen like a first-time user and screenshot it.
const { chromium } = require('playwright');
const OUT = process.env.OUT || '.';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const pg = await b.newPage({ viewport: { width: W, height: H }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.goto('http://localhost:3123/'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(1200);
    await pg.screenshot({ path: `${OUT}/t_${W}_0first.png` });
    for (const m of ['tactics', 'lab', 'lessons', 'match', 'board']) {
      await pg.evaluate((m) => setMode(m), m); await pg.waitForTimeout(1200);
      await pg.screenshot({ path: `${OUT}/t_${W}_${m}.png` });
    }
    console.log(W, 'errors', errs);
    await pg.close();
  }
  await b.close();
})();
