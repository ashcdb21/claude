// Click through Training, Lessons, Team and Board like a user; report page errors and key outcomes.
const { chromium } = require('playwright');
const OUT = process.env.OUT || '.';
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: W, height: H }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto('http://localhost:3123/'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(800);
  const shot = (n) => pg.screenshot({ path: `${OUT}/qa_${W}_${n}.png` });
  console.log('home', await pg.evaluate(() => appMode));
  // Training: watch a run, then test 100 and wait for the assistant.
  await pg.click('[data-mode="lab"]'); await pg.waitForTimeout(500);
  await pg.click('#lab-watch'); await pg.waitForTimeout(3000); await shot('watch');
  await pg.click('#lab-reset'); await pg.waitForTimeout(300);
  await pg.click('#lab-test');
  for (let i = 0; i < 240 && (await pg.evaluate(() => lab.busy || !!lab.proof?.busy)); i++) await pg.waitForTimeout(500);
  console.log('training', await pg.evaluate(() => ({ result: !!lab.result, n: lab.result?.agg?.n, proof: lab.proof ? { found: lab.proof.found.length, total: lab.proof.total } : null, insights: lab.insights.length })));
  await shot('test');
  // Lessons: open the first, apply its principle, test, expect a star.
  await pg.click('[data-mode="lessons"]'); await pg.waitForTimeout(500);
  await pg.click('[data-lesson="press-unit"]'); await pg.waitForTimeout(600);
  await pg.click('[data-instr="home.engage"][data-v="high"]'); await pg.waitForTimeout(300);
  await pg.click('#lab-test');
  for (let i = 0; i < 120 && (await pg.evaluate(() => lab.busy)); i++) await pg.waitForTimeout(500);
  await pg.waitForTimeout(500);
  console.log('lesson', await pg.evaluate(() => ({ winHigh: lab.result?.M?.winHigh, stars: lesson.progress['press-unit']?.stars })));
  await shot('lesson');
  // Team: a style, a formation, a role.
  await pg.click('[data-mode="tactics"]'); await pg.waitForTimeout(500);
  await pg.click('[data-style="tikitaka"]'); await pg.waitForTimeout(800);
  await pg.selectOption('#tac-formation', '4-4-2'); await pg.waitForTimeout(800);
  await pg.click('[data-slot="9"]'); await pg.waitForTimeout(300);
  const sel = await pg.$('[data-role="home.9"]'); if (sel) { const opts = await sel.$$eval('option', (o) => o.map((x) => x.value)); await sel.selectOption(opts[opts.length - 1]); }
  await pg.waitForTimeout(800); await shot('team');
  console.log('team', await pg.evaluate(() => ({ form: club.us.tactic.formation, style: club.us.tactic.style, role9: club.us.tactic.roles[9] })));
  // Board.
  await pg.click('[data-mode="board"]'); await pg.waitForTimeout(500);
  await pg.click('#play'); await pg.waitForTimeout(1500); await shot('board');
  console.log('errors', errs);
  await b.close();
})();
