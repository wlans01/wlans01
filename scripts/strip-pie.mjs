// Remove the language pie chart from github-profile-3d-contrib SVGs.
// Private org-repo commits are not itemized by the GitHub API, so the pie
// only reflects a couple of public repos and is misleading.
// The pie is the top-level group created with `translate(40, <y>)` (comma form).
// usage: node scripts/strip-pie.mjs <file.svg> [...]
import fs from "node:fs";

let failed = false;
for (const file of process.argv.slice(2)) {
  const svg = fs.readFileSync(file, "utf8");
  const m = /<g transform="translate\(40, [\d.]+\)">/.exec(svg);
  if (!m) {
    console.warn(`::warning::pie group not found in ${file} (generator output changed?) - left as is`);
    continue;
  }
  // walk forward to the matching </g>
  const tag = /<g[\s>]|<\/g>/g;
  tag.lastIndex = m.index + m[0].length;
  let depth = 1, end = -1, t;
  while ((t = tag.exec(svg))) {
    depth += t[0] === "</g>" ? -1 : 1;
    if (depth === 0) { end = t.index + 4; break; }
  }
  if (end < 0) { console.error(`unbalanced <g> in ${file}`); failed = true; continue; }
  fs.writeFileSync(file, svg.slice(0, m.index) + svg.slice(end));
  console.log(`${file}: removed pie (${end - m.index} bytes)`);
}
process.exit(failed ? 1 : 0);
