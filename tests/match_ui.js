// Drive a whole live match through the UI: kick off, speeds, highlights, a
// clip, the touchline, half-time, full time, the reports and "Train this moment".
const { chromium } = require('playwright');
const OUT = process.env.OUT || '.';
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: W, height: H }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto('http://localhost:3123/'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(800);
  const shot = (n) => pg.screenshot({ path: `${OUT}/m_${W}_${n}.png` });
  const info = () => pg.evaluate(() => ({ phase: live.phase, min: live.m ? matchMinute(live.m) : '', score: live.m ? `${live.m.score.home}-${live.m.score.away}` : '', clips: live.m?.clips.length, feed: live.m?.feed.length, go: document.querySelector('#match-go').textContent, watching: live.watching }));
  await pg.click('[data-mode="match"]'); await pg.waitForTimeout(600); await shot('0pre');
  if (W < 900 && await pg.evaluate(() => document.querySelector('#side').hidden)) { await pg.click('#panel-open'); await pg.waitForTimeout(300); }
  await pg.click('#match-kick'); await pg.waitForTimeout(2500); await shot('1live'); console.log('live', await info());
  await pg.click('#match-speed'); await pg.click('#match-speed'); // 2→4→8
  await pg.waitForTimeout(3000); console.log('8x', await info());
  await pg.click('[data-mtab="touch"]'); await pg.waitForTimeout(200);
  await pg.click('[data-touch="home.line"][data-v="high"]'); await pg.waitForTimeout(800); await shot('2touch');
  await pg.click('#match-speed'); // highlights
  for (let i = 0; i < 40 && !(await pg.evaluate(() => live.watching)); i++) await pg.waitForTimeout(250);
  await pg.waitForTimeout(1500); await shot('3clip'); console.log('clip', await info());
  await pg.evaluate(() => { live.tab = 'moments'; renderSide(); }); await pg.waitForTimeout(200); await shot('3clipside');
  await pg.click('#match-go'); await pg.waitForTimeout(300); // back to the match
  await pg.click('#match-skip'); await pg.waitForTimeout(800); await shot('4ht'); console.log('ht', await info());
  await pg.click('#match-second'); await pg.waitForTimeout(1000);
  await pg.click('#match-skip'); await pg.waitForTimeout(1500); console.log('ft', await info());
  await shot('5ft');
  for (const t of ['plan', 'moments', 'report', 'feed']) { await pg.click(`[data-mtab="${t}"]`); await pg.waitForTimeout(250); await shot(`6tab_${t}`); }
  // Other results finish, then train a moment.
  for (let i = 0; i < 80 && (await pg.evaluate(() => !!live.others)); i++) await pg.waitForTimeout(250);
  console.log('table rounds', await pg.evaluate(() => season.results.length));
  await pg.click('[data-mtab="moments"]'); await pg.waitForTimeout(200);
  const hasTrain = await pg.$('[data-train]');
  if (hasTrain) { await hasTrain.click(); await pg.waitForTimeout(1200); await shot('7train'); console.log('mode', await pg.evaluate(() => [appMode, SITUATIONS[lab.sit].id, SITUATIONS[lab.sit].name])); }
  await pg.click('[data-mode="match"]'); await pg.waitForTimeout(500);
  await pg.click('#match-go'); await pg.waitForTimeout(500); await shot('8after'); console.log('after', await info());
  console.log('errors', errs);
  await b.close();
})();
