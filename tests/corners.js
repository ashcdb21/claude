// Corners per team per match, by matchup (dominant sides against deep blocks are the risk).
const { load, team, oppTeam } = require('./load');
const E = load();
if (process.env.CFG) Object.assign(E.ENG, JSON.parse(process.env.CFG));
const rows = [];
for (const [st, op] of [['balanced', 'staldric'], ['tikitaka', 'staldric'], ['wingplay', 'staldric'], ['balanced', 'ashby'], ['gegenpress', 'castello'], ['balanced', 'solano']]) {
  let c = 0, ca = 0, sh = 0, g = 0, n = 4;
  for (let s = 1; s <= n; s++) { const m = E.matchToEnd(E.matchCreate({ teams: { home: team(E, st), away: oppTeam(E, op) }, seed: s * 97, record: false })); const S = E.matchStats(m); c += S.home.corners; ca += S.away.corners; sh += S.home.shots; g += S.home.goals; }
  rows.push(`${st} v ${op}: corners ${(c / n).toFixed(1)}–${(ca / n).toFixed(1)}  shots ${(sh / n).toFixed(1)}  goals ${(g / n).toFixed(1)}`);
}
console.log(rows.join('\n'));
