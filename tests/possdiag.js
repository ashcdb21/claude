// Possession-level diagnostics for full matches.
const { load, team, oppTeam } = require('./load');
const E = load();
const H = process.argv[2] || 'balanced', A = process.argv[3] || 'ashby', N = +(process.argv[4] || 4);
const tot = { poss: 0, f3: 0, box: 0, shot: 0, dur: 0, passes: 0, restarts: {}, goals: 0, shots: 0, xg: 0, bip: 0, longShots: 0, ms: 0 };
for (let s = 1; s <= N; s++) {
  const t0 = Date.now();
  const m = E.matchCreate({ teams: { home: team(E, H), away: oppTeam(E, A) }, seed: s, record: false });
  // wrap to count restarts and possessions
  const w = m.w; let cur = null; const P = [];
  const orig = E.get('beginRestart');
  let lastPoss = w.poss, lastDead = false, bip = 0;
  while (m.phase !== 'ft') {
    if (m.phase === 'ht') { E.matchSecondHalf(m); continue; }
    const deadBefore = !!w.dead;
    E.matchStep(m);
    if (!w.dead) bip += 0.1;
    if (w.dead && !deadBefore) { tot.restarts[w.dead.kind] = (tot.restarts[w.dead.kind] || 0) + 1; if (cur) { P.push(cur); cur = null; } }
    if (!w.dead) {
      if (!cur || w.poss !== cur.team) { if (cur) P.push(cur); cur = { team: w.poss, t0: w.t, f3: false, box: false, shot: false, passes: w.T[w.poss].S.passes }; }
      const b = w.ball;
      if (b.state === 'held' && b.owner.team === cur.team) { const u = E.depthOf(cur.team, b.x); if (u > 70) cur.f3 = true; if (E.inBox(cur.team, b)) cur.box = true; }
      if (b.state === 'shot' && b.team === cur.team) cur.shot = true;
      cur.t1 = w.t; cur.p1 = w.T[cur.team].S.passes;
    }
  }
  if (cur) P.push(cur);
  for (const p of P) { tot.poss++; if (p.f3) tot.f3++; if (p.box) tot.box++; if (p.shot) tot.shot++; tot.dur += (p.t1 - p.t0) || 0; tot.passes += (p.p1 - p.passes) || 0; }
  tot.goals += m.score.home + m.score.away; tot.shots += m.w.shots.length; tot.xg += m.w.shots.reduce((a, q) => a + q.xg, 0);
  tot.longShots += m.w.shots.filter((q) => Math.hypot(E.xAtDepth(q.team, 105) - q.x, 34 - q.y) > 18).length;
  tot.bip += bip; tot.ms += Date.now() - t0;
}
const n = N;
console.log(`${H} v ${A}, ${N} matches, ${(tot.ms / n).toFixed(0)} ms/match`);
console.log(`per match: possessions ${(tot.poss / n).toFixed(0)} (ref ~200), ball in play ${(tot.bip / 60 / n).toFixed(0)} min (ref 55-62)`);
console.log(`possession: avg ${(tot.dur / tot.poss).toFixed(1)} s, ${(tot.passes / tot.poss).toFixed(1)} passes; reach final third ${(100 * tot.f3 / tot.poss).toFixed(0)}% (ref ~40), box ${(100 * tot.box / tot.poss).toFixed(0)}% (ref ~15), shot ${(100 * tot.shot / tot.poss).toFixed(0)}% (ref ~11)`);
console.log(`goals ${(tot.goals / n).toFixed(2)} (ref 2.7), shots ${(tot.shots / n).toFixed(1)} (ref 25), xG/shot ${(tot.xg / tot.shots).toFixed(3)} (ref 0.10), outside box ${(100 * tot.longShots / tot.shots).toFixed(0)}% (ref 35)`);
console.log('restarts per match', Object.fromEntries(Object.entries(tot.restarts).map(([k, v]) => [k, +(v / n).toFixed(1)])), '(ref throw 40, goalKick 16, corner 10, freeKick 25)');
