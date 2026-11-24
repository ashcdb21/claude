const { load, team, oppTeam } = require('./load');
const E = load();
const H = process.argv[2] || 'balanced', A = process.argv[3] || 'ashby';
const z = {}; const typ = {};
for (let s = 1; s <= 2; s++) {
  const m = E.matchToEnd(E.matchCreate({ teams: { home: team(E, H), away: oppTeam(E, A) }, seed: s, record: false }));
  for (const p of m.w.passLog) {
    const end = p.u + p.gain, k = (p.u < 35 ? 'own3' : p.u < 70 ? 'mid3' : 'fin3') + '>' + (end < 35 ? 'own3' : end < 70 ? 'mid3' : 'fin3');
    (z[k] ||= [0, 0, 0]); z[k][0]++; if (p.ok) z[k][1]++; z[k][2] += p.odds;
    (typ[p.type] ||= [0, 0, 0]); typ[p.type][0]++; if (p.ok) typ[p.type][1]++; typ[p.type][2] += p.odds;
  }
}
console.log(Object.entries(z).sort().map(([k, [n, ok, e]]) => `${k.padEnd(10)} n ${String(n).padStart(4)} ok ${(100 * ok / n).toFixed(0)}% est ${(100 * e / n).toFixed(0)}%`).join('\n'));
console.log(Object.entries(typ).map(([k, [n, ok, e]]) => `${k.padEnd(8)} n ${String(n).padStart(4)} ok ${(100 * ok / n).toFixed(0)}% est ${(100 * e / n).toFixed(0)}%`).join('\n'));
