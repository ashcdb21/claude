// The Team screen: each phase picture, a role change and an instruction change.
const { chromium } = require('playwright');
const OUT = process.env.OUT || '.';
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: W, height: H }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await pg.goto('http://localhost:3123/'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(800);
  await pg.click('[data-mode="tactics"]'); await pg.waitForTimeout(600);
  for (const ph of ['build', 'attack', 'press', 'block', 'low']) { await pg.click(`[data-phase="${ph}"]`); await pg.waitForTimeout(900); await pg.screenshot({ path: `${OUT}/team_${W}_${ph}.png` }); }
  if (W >= 900) { await pg.click('[data-style="gegenpress"]'); await pg.waitForTimeout(900); await pg.screenshot({ path: `${OUT}/team_${W}_gegen.png` }); }
  console.log('errors', errs);
  await b.close();
})();
