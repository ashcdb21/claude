// Attacking funnel for one style: final-third entries, box entries, shots, xG.
const { load, team, oppTeam } = require('./load');
const E = load();
if (process.env.CFG) Object.assign(E.ENG, JSON.parse(process.env.CFG));
if (process.env.SLOW) Object.assign(E.get('TEMPO').slow, JSON.parse(process.env.SLOW));
const st = process.argv[2] || 'tikitaka', mod = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const opps = ['ashby', 'castello', 'solano', 'kingsbridge'];
const t = { f3: 0, box: 0, shots: 0, xg: 0, goals: 0, poss: 0, passes: 0, tilt: 0, n: 0, ga: 0 };
for (const op of opps) for (let s = 1; s <= 2; s++) {
  const home = team(E, st); for (const [k, v] of Object.entries(mod)) { if (k.startsWith("role")) home.tactic.roles[+k.slice(4)] = v; else home.tactic.instr[k] = v; }
  const m = E.matchToEnd(E.matchCreate({ teams: { home, away: oppTeam(E, op) }, seed: s * 53 + op.length, record: false }));
  const S = E.matchStats(m).home; t.n++; t.f3 += S.final3; t.box += S.boxEntries; t.shots += S.shots; t.xg += S.xg; t.goals += S.goals; t.poss += S.poss; t.passes += S.passes; t.tilt += S.tilt; t.ga += E.matchStats(m).away.goals;
}
const f = (k, d = 1) => (t[k] / t.n).toFixed(d);
console.log(`${st} ${JSON.stringify(mod)} ${process.env.CFG || ""} ${process.env.SLOW || ""}: poss ${f('poss', 0)} passes ${f('passes', 0)} final3 ${f('f3')} box ${f('box')} shots ${f('shots')} xG ${f('xg', 2)} goals ${f('goals')} GA ${f('ga')} tilt ${f('tilt', 0)}`);
