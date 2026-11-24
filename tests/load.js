// Load the engine and analysis code from index.html into a Node vm context.
const fs = require('fs'), vm = require('vm'), path = require('path');
const FILE = process.env.HTML || path.join(__dirname, '..', 'index.html');
function load() {
  const html = fs.readFileSync(FILE, 'utf8');
  const core = html.slice(html.indexOf('const PITCH = {'), html.indexOf('const CARRY_R'));
  const extra = `const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));\nconst dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);\n`;
  const eng = html.slice(html.indexOf('/* ENGINE START */'), html.indexOf('/* ENGINE END */'));
  const ana = html.slice(html.indexOf('/* ANALYSIS START */'), html.indexOf('/* ANALYSIS END */'));
  const ctx = { console, Math, performance: { now: () => Number(process.hrtime.bigint()) / 1e6 } };
  vm.createContext(ctx);
  // Wrapped in a function so top-level declarations are real locals (vm globals are slow);
  // E.get(name) evaluates any name inside that scope.
  vm.runInContext(`(function(){const Math = globalThis.Math, Set = globalThis.Set, Object = globalThis.Object;${core + extra + eng + ana}
;globalThis.__E = { get: (name) => eval(name) };})()`, ctx, { filename: 'engine' });
  const E = ctx.__E;
  return new Proxy(E, { get: (t, k) => (k in t ? t[k] : t.get(k)) });
}
// A team ready for the engine: tactic + squad lined up in slot order.
function team(E, style, profile = 'balanced', seed = 11, name) {
  const tactic = E.styleTactic(style);
  const squad = E.makeSquad(tactic.formation, profile, seed);
  return { name: name || style, tactic, lineup: E.lineupFor(squad, tactic.formation).map((k) => squad[k]) };
}
function oppTeam(E, id) { const o = E.opponentTeam(id); return { name: o.name, tactic: o.tactic, lineup: E.lineupFor(o.squad, o.tactic.formation).map((k) => o.squad[k]) }; }
module.exports = { load, team, oppTeam };
