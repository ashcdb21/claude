// Check every lesson against the current engine: the start should fail the
// first goal, the principle it teaches should pass it, and the third star
// should need two ideas together. Uses the same 100 runs as the page.
// Usage: node lessons.js [lessonId] [--pairs]
const { load } = require('./load');
const E = load();
const LESSONS = E.get('LESSONS'), SITUATIONS = E.get('SITUATIONS'), INSTR = E.get('INSTR'), ROLES = E.get('ROLES'), FORMATIONS = E.get('FORMATIONS'), GROUP_OF = E.get('GROUP_OF');
const US_SEED = 20260929, N = 100, SEED = 1;
const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null, pairs = process.argv.includes('--pairs');
const baseArg = process.argv.find((a) => a.startsWith('--base=')), BASE = baseArg ? JSON.parse(baseArg.slice(7)) : {};
const setArg = process.argv.find((a) => a.startsWith('--set=')), SET = setArg ? JSON.parse(setArg.slice(6)) : null;
function teamOf(t) { return { name: t.name, tactic: t.tactic, lineup: E.lineupFor(t.squad, t.tactic.formation).map((k) => t.squad[k]) }; }
function srcOf(L, mod = {}) {
  mod = { ...BASE, ...mod };
  const tactic = E.styleTactic(L.style);
  Object.assign(tactic.instr, SET || L.set || {});
  if (L.roles) for (const i in L.roles) tactic.roles[i] = L.roles[i];
  for (const [k, v] of Object.entries(mod)) { if (k.startsWith('role')) tactic.roles[+k.slice(4)] = v; else tactic.instr[k] = v; }
  return { home: teamOf({ name: 'Blue', tactic, squad: E.makeSquad(tactic.formation, 'balanced', US_SEED) }), away: teamOf(E.opponentTeam(L.opp)) };
}
function measure(L, mod) {
  const sit = SITUATIONS.find((s) => s.id === L.sit), teams = E.withForce(srcOf(L, mod), sit), setup = E.engSetup(teams, sit), agg = E.newAgg();
  for (let k = 0; k < N; k++) E.addRun(agg, E.engRun(E.runInput(teams, setup, SEED * 7919 + k, sit.maxT)));
  return E.metricsOf(agg);
}
const met = (M, g) => (g.op === '>=' ? M[g.key] >= g.v - 1e-9 : M[g.key] <= g.v + 1e-9);
const fmt = (M, L) => [...new Set(L.goals.map((g) => g.key))].map((k) => `${k}=${(+M[k]).toFixed(k.startsWith('xg') ? 3 : 0)}`).join(' ');
for (const L of LESSONS) {
  if (only && L.id !== only) continue;
  const t0 = Date.now(), base = measure(L, {});
  const stars = (M) => (met(M, L.goals[0]) ? 1 + (met(M, L.goals[1]) ? 1 + (met(M, L.goals[2]) ? 1 : 0) : 0) : 0);
  console.log(`\n== ${L.id} (${L.sit} v ${L.opp}) goals: ${L.goals.map((g) => `${g.key}${g.op}${g.v}`).join(', ')}`);
  console.log(`start: ${fmt(base, L)} stars=${stars(base)}`);
  const cur = E.styleTactic(L.style); Object.assign(cur.instr, SET || L.set || {}); for (const [k, v] of Object.entries(BASE)) if (!k.startsWith('role')) cur.instr[k] = v; if (L.roles) for (const i in L.roles) cur.roles[i] = L.roles[i];
  const singles = [];
  for (const k of L.levers) for (const [v] of INSTR[k].opts) if (v !== cur.instr[k]) singles.push({ [k]: v });
  const form = FORMATIONS[cur.formation];
  for (const g of L.roleLevers || []) form.forEach((s, i) => { if (GROUP_OF[s[2]] !== g) return; for (const [rk, R] of Object.entries(ROLES)) if (R.groups.includes(g) && rk !== cur.roles[i]) singles.push({ ['role' + i]: rk }); });
  const res = singles.map((mod) => ({ mod, M: measure(L, mod) }));
  res.sort((a, b) => stars(b.M) - stars(a.M) || (L.goals[0].op === '>=' ? b.M[L.goals[0].key] - a.M[L.goals[0].key] : a.M[L.goals[0].key] - b.M[L.goals[0].key]));
  for (const r of res.slice(0, +(process.env.TOP || 8))) console.log(`  ${JSON.stringify(r.mod).padEnd(34)} ${fmt(r.M, L)} stars=${stars(r.M)}`);
  if (pairs) {
    const top = res.slice(0, 7), out = [];
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
      const mod = { ...top[i].mod, ...top[j].mod }; if (Object.keys(mod).length < 2) continue;
      out.push({ mod, M: measure(L, mod) });
    }
    out.sort((a, b) => stars(b.M) - stars(a.M) || (L.goals[2].op === '>=' ? b.M[L.goals[2].key] - a.M[L.goals[2].key] : a.M[L.goals[2].key] - b.M[L.goals[2].key]));
    console.log('  pairs:'); for (const r of out.slice(0, 6)) console.log(`  ${JSON.stringify(r.mod).padEnd(50)} ${fmt(r.M, L)} stars=${stars(r.M)}`);
  }
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
