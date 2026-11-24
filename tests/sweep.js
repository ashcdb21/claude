// Sweep engine knobs over full matches: completion, final-third entries, shots, goals.
const { load, team, oppTeam } = require('./load');
const E = load();
const configs = JSON.parse(process.argv[2]);
const pairs = [['balanced', 'ashby'], ['gegenpress', 'castello'], ['counter', 'kingsbridge']];
for (const cfg of configs) {
  Object.assign(E.ENG, cfg);
  let ok = 0, n = 0, f = 0, fo = 0, shots = 0, goals = 0, xg = 0, poss = 0, f3 = 0, out = 0, throws = 0, gk = 0, matches = 0;
  for (const [h, a] of pairs) for (let s = 1; s <= (+process.env.N || 1); s++) {
    const m = E.matchCreate({ teams: { home: team(E, h), away: oppTeam(E, a) }, seed: s, record: false });
    const w = m.w;
    while (m.phase !== 'ft') { if (m.phase === 'ht') { E.matchSecondHalf(m); continue; } const d0 = !!w.dead; E.matchStep(m); if (w.dead && !d0) { if (w.dead.kind === 'throw') throws++; if (w.dead.kind === 'goalKick') gk++; } }
    matches++;
    for (const p of w.passLog) { if (p.cross) continue; n++; if (p.ok) ok++; if (p.u < 70 && p.u + p.gain >= 70) { f++; if (p.ok) fo++; } }
    shots += w.shots.length; goals += m.score.home + m.score.away; xg += w.shots.reduce((q, x) => q + x.xg, 0);
    f3 += w.T.home.S.final3 + w.T.away.S.final3;
  }
  console.log(JSON.stringify(cfg).padEnd(60), `comp ${(100 * ok / n).toFixed(0)}% intoF3 ${(100 * fo / f).toFixed(0)}% f3/team ${(f3 / matches / 2).toFixed(0)} shots ${(shots / matches).toFixed(0)} xG/s ${(xg / shots).toFixed(3)} goals ${(goals / matches).toFixed(1)} throws ${(throws / matches).toFixed(0)} gk ${(gk / matches).toFixed(0)}`);
}
