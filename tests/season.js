// Full-match realism report across styles: per-team averages and by-style KPIs.
const { load, team, oppTeam } = require('./load');
const E = load();
if (process.env.CFG) Object.assign(E.ENG, require(process.env.CFG));
const styles = (process.argv[2] || 'balanced,gegenpress,tikitaka,counter,routeone,parkbus,wingplay').split(',');
const opps = (process.argv[3] || 'ashby,castello,solano').split(',');
const N = +(process.argv[4] || 1);
const agg = {}, all = { goals: 0, shots: 0, xg: 0, n: 0, poss: 0, passes: 0, comp: 0, corners: 0, fouls: 0, offsides: 0, ppda: 0 };
let ms = 0;
for (const st of styles) for (const op of opps) for (let s = 1; s <= N; s++) {
  const t0 = Date.now();
  const m = E.matchToEnd(E.matchCreate({ teams: { home: team(E, st), away: oppTeam(E, op) }, seed: s * 31 + op.length, record: false }));
  ms += Date.now() - t0;
  const S = E.matchStats(m);
  for (const side of ['home', 'away']) { const x = S[side]; all.n++; all.goals += x.goals; all.shots += x.shots; all.xg += x.xg; all.passes += x.passes; all.comp += x.passPct; all.corners += x.corners; all.fouls += x.fouls; all.offsides += x.offsides; all.ppda += Math.min(x.ppda, 40); }
  const a = (agg[st] ||= { n: 0, gf: 0, ga: 0, poss: 0, ppda: 0, line: 0, len: 0, width: 0, longPct: 0, avgPass: 0, comp: 0, high: 0, counters: 0, crosses: 0, shots: 0, xg: 0, xga: 0, cp: 0, tilt: 0 });
  const h = S.home; a.n++; a.gf += h.goals; a.ga += S.away.goals; a.poss += h.poss; a.ppda += Math.min(h.ppda, 40); a.line += h.line; a.len += h.length; a.width += h.width; a.longPct += h.longPct; a.avgPass += h.avgPass; a.comp += h.passPct; a.high += h.highRegains; a.counters += h.counters; a.crosses += h.crosses; a.shots += h.shots; a.xg += h.xg; a.xga += S.away.xg; a.cp += h.lost ? 100 * h.cpRegains / h.lost : 0; a.tilt += h.tilt;
}
const n = all.n;
console.log(`${n / 2} matches, ${(ms / (n / 2)).toFixed(0)} ms each`);
console.log(`per team: goals ${(all.goals / n).toFixed(2)} (ref 1.35) shots ${(all.shots / n).toFixed(1)} (12.5) xG ${(all.xg / n).toFixed(2)} (1.3) passes ${(all.passes / n).toFixed(0)} (450-550) completion ${(all.comp / n).toFixed(0)}% (80-85) corners ${(all.corners / n).toFixed(1)} (5) fouls ${(all.fouls / n).toFixed(1)} (11) offsides ${(all.offsides / n).toFixed(1)} (2) PPDA ${(all.ppda / n).toFixed(1)} (10-14)`);
console.log('style'.padEnd(11), 'GF  GA  poss PPDA line  len width long% pass comp high cntr cross  cp%  tilt shots  xG  xGA');
for (const [st, a] of Object.entries(agg)) {
  const f = (k, d = 0) => (a[k] / a.n).toFixed(d);
  console.log(st.padEnd(11), f('gf', 1), f('ga', 1), f('poss').padStart(4), f('ppda', 1).padStart(4), f('line').padStart(4), f('len').padStart(4), f('width').padStart(5), f('longPct').padStart(5), f('avgPass').padStart(4), f('comp').padStart(4), f('high').padStart(4), f('counters').padStart(4), f('crosses').padStart(5), f('cp').padStart(4), f('tilt').padStart(5), f('shots').padStart(5), f('xg', 2).padStart(4), f('xga', 2).padStart(4));
}
