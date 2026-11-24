// Stars for each lesson's start, its principle and its full answer, on the page's 100 runs.
const { load } = require('./load');
const E = load();
const LESSONS = E.get('LESSONS'), SITUATIONS = E.get('SITUATIONS');
const US_SEED = 20260929;
const teamOf = (t) => ({ name: t.name, tactic: t.tactic, lineup: E.lineupFor(t.squad, t.tactic.formation).map((k) => t.squad[k]) });
function measure(L, mod) {
  const tactic = E.styleTactic(L.style); Object.assign(tactic.instr, L.set || {});
  if (L.roles) for (const i in L.roles) tactic.roles[i] = L.roles[i];
  for (const [k, v] of Object.entries(mod)) { if (k.startsWith('role')) tactic.roles[+k.slice(4)] = v; else tactic.instr[k] = v; }
  const sit = SITUATIONS.find((s) => s.id === L.sit);
  const teams = E.withForce({ home: teamOf({ name: 'Blue', tactic, squad: E.makeSquad(tactic.formation, 'balanced', US_SEED) }), away: teamOf(E.opponentTeam(L.opp)) }, sit);
  // As the page does it: a change moves your side into its new shape and leaves theirs (and the ball) where they stood.
  let setup = E.engSetup(teams, sit);
  if (Object.keys(mod).length) {
    const t0 = E.styleTactic(L.style); Object.assign(t0.instr, L.set || {}); if (L.roles) for (const i in L.roles) t0.roles[i] = L.roles[i];
    const teams0 = E.withForce({ home: teamOf({ name: 'Blue', tactic: t0, squad: E.makeSquad(t0.formation, 'balanced', US_SEED) }), away: teams.away }, sit);
    const s0 = E.engSetup(teams0, sit), pos = { home: setup.pos.home, away: s0.pos.away }, ball = s0.ball;
    let best = null, bd = 1.2;
    for (const t of ['home', 'away']) pos[t].forEach(([x, y], i) => { const d = Math.hypot(x - ball.x, y - ball.y); if (d <= bd) { bd = d; best = { t, i }; } });
    setup = { pos, ball, poss: best ? best.t : s0.poss, holder: best ? best.i : null, transition: s0.transition };
  }
  const agg = E.newAgg();
  for (let k = 0; k < 100; k++) E.addRun(agg, E.engRun(E.runInput(teams, setup, 7919 + k, sit.maxT)));
  return E.metricsOf(agg);
}
const met = (M, g) => (g.op === '>=' ? M[g.key] >= g.v - 1e-9 : M[g.key] <= g.v + 1e-9);
const PLAN = {
  'press-unit': [{ engage: 'high' }, { engage: 'high', pressTo: 'right' }, { engage: 'high', pressTo: 'left' }],
  'beat-press': [{ passing: 'direct' }, { passing: 'direct', width: 'wide' }, { passing: 'direct', width: 'wide', role5: 'dlp' }],
  'rest-defence': [{ role5: 'bwm' }, { role5: 'bwm', role1: 'fb' }],
  'low-block': [{ role8: 'if' }, { role8: 'if', role10: 'if' }],
  counter: [{ passing: 'direct' }, { passing: 'direct', role8: 'if' }, { passing: 'direct', runs: 'many' }],
  edge: [{ compact: 'narrow' }, { compact: 'narrow', press: 'normal' }],
  overload: [{ role4: 'wb' }, { role4: 'wb', dribbling: 'mixed' }],
};
let bad = 0;
for (const L of LESSONS) {
  const stars = (M) => (met(M, L.goals[0]) ? 1 + (met(M, L.goals[1]) ? 1 + (met(M, L.goals[2]) ? 1 : 0) : 0) : 0);
  const keys = [...new Set(L.goals.map((g) => g.key))];
  const row = (label, M) => `${label.padEnd(44)} ${keys.map((k) => `${k}=${(+M[k]).toFixed(k.startsWith('xg') ? 3 : 0)}`).join(' ')} ★${stars(M)}`;
  const b = measure(L, {}); console.log(`\n${L.id}: ${L.goals.map((g) => `${g.key}${g.op}${g.v}`).join(', ')}`); console.log(row('start', b));
  if (stars(b) !== 0) { bad++; console.log('  !! start already earns a star'); }
  const res = (PLAN[L.id] || []).map((m) => stars(measure(L, m)));
  (PLAN[L.id] || []).forEach((m, i) => console.log(row(JSON.stringify(m), measure(L, m))));
  if (res.length && Math.max(...res) < 3) { bad++; console.log('  !! no plan reaches three stars'); }
  if (res.length && res[0] === 3) { bad++; console.log('  !! one change gives three stars'); }
}
console.log(bad ? `\n${bad} problem(s)` : '\nall lessons OK');
