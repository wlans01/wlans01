// Remove the language pie and the contribution radar from github-profile-3d-contrib SVGs.
// Private org-repo commits are not itemized by the GitHub API, so both charts
// only reflect a couple of public repos and are misleading. The 3D grass and the
// total contribution count (which do include private contributions) are kept.
//
// Both charts are top-level groups whose transform uses the comma form
// `translate(x, y)`; the 3D blocks use the space form `translate(x y)`.
// usage: node scripts/strip-charts.mjs <file.svg> [...]
import fs from "node:fs";

const START = /<g transform="translate\([\d.]+, [\d.]+\)">/;
const EXPECTED = 2; // pie + radar

let failed = false;
for (const file of process.argv.slice(2)) {
  let svg = fs.readFileSync(file, "utf8");
  let removed = 0, m;
  while ((m = START.exec(svg))) {
    const tag = /<g[\s>]|<\/g>/g;
    tag.lastIndex = m.index + m[0].length;
    let depth = 1, end = -1, t;
    while ((t = tag.exec(svg))) {
      depth += t[0] === "</g>" ? -1 : 1;
      if (depth === 0) { end = t.index + 4; break; }
    }
    if (end < 0) { console.error(`unbalanced <g> in ${file}`); failed = true; break; }
    svg = svg.slice(0, m.index) + svg.slice(end);
    removed++;
  }
  if (removed !== EXPECTED) console.warn(`::warning::${file}: removed ${removed} chart group(s), expected ${EXPECTED} (generator output changed?)`);
  fs.writeFileSync(file, svg);
  console.log(`${file}: removed ${removed} chart group(s)`);
}
process.exit(failed ? 1 : 0);
