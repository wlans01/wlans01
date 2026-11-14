// Restyle the github-profile-3d-contrib output into the shared terminal window.
//  - drop the language pie and contribution radar: private org-repo commits are
//    not itemized by the GitHub API, so both only reflect a couple of public repos
//  - drop the footer (total / stars / forks): the total lives in the profile card
//  - replace the generator palette with the theme green scale, crop empty space
// Writes <outDir>/3d-dark.svg and 3d-light.svg.
//
// usage: node scripts/build-3d.mjs <outDir> <profile-night-green.svg>
import fs from "node:fs";
import path from "node:path";
import { THEMES, WIDTH, windowSvg, shade } from "./theme.mjs";

const outDir = process.argv[2] ?? "dist";
let svg = fs.readFileSync(process.argv[3] ?? "profile-3d-contrib/profile-night-green.svg", "utf8");

// Remove the <g ...> group starting at index `start` (balanced match).
function cutGroup(s, start) {
  const tag = /<g[\s>]|<\/g>/g;
  tag.lastIndex = s.indexOf(">", start) + 1;
  let depth = 1, t;
  while ((t = tag.exec(s))) {
    depth += t[0] === "</g>" ? -1 : 1;
    if (depth === 0) return s.slice(0, start) + s.slice(t.index + 4);
  }
  throw new Error("unbalanced <g>");
}

// 1) footer group first: it holds the total, star/fork icons (comma-form
//    translates too) and the period text
const period = svg.match(/>(\d{4}-\d{2}-\d{2}) \/ (\d{4}-\d{2}-\d{2})</);
const footText = svg.indexOf('<text style="font-size: 32px');
if (footText < 0) throw new Error("footer not found (generator output changed?)");
svg = cutGroup(svg, svg.lastIndexOf("<g>", footText));

// 2) pie + radar: top-level groups whose transform uses the comma form
//    `translate(x, y)`; the 3D blocks use the space form `translate(x y)`.
const CHART = /<g transform="translate\([\d.]+, [\d.]+\)">/;
let removed = 0, m;
while ((m = CHART.exec(svg))) { svg = cutGroup(svg, m.index); removed++; }
if (removed !== 2) console.warn(`::warning::removed ${removed} chart group(s), expected 2 (generator output changed?)`);

// 3) inner content without root, style, background
const open = svg.match(/<svg[^>]*>/);
let inner = svg.slice(open.index + open[0].length, svg.lastIndexOf("</svg>"));
inner = inner.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<rect[^>]*class="fill-bg"[^>]*><\/rect>/, "");

// 4) crop to the blocks: group translate = top of a bar; its base comes from
//    the grow animation's first value. Faces extend ~40px right / ~25px below.
let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
for (const g of inner.matchAll(/<g transform="translate\(([\d.]+) ([\d.]+)\)">(?:<animateTransform[^>]*values="[\d.]+ ([\d.]+);)?/g)) {
  const x = +g[1], y = +g[2], base = g[3] ? +g[3] : y;
  x0 = Math.min(x0, x); x1 = Math.max(x1, x);
  y0 = Math.min(y0, y); y1 = Math.max(y1, base);
}
const PAD = 24;
const vb = [x0 - PAD, y0 - PAD, x1 - x0 + 40 + 2 * PAD, y1 - y0 + 25 + 2 * PAD].map((v) => +v.toFixed(1));
const bodyH = Math.round((WIDTH * vb[3]) / vb[2]);

function css(name, t) {
  const lv = [...t.green];
  lv[0] = name === "dark" ? "#21262d" : "#ebedf0";
  return lv
    .map((c, i) => `.cont-top-${i}{fill:${c}}.cont-left-${i}{fill:${shade(c, 0.14)}}.cont-right-${i}{fill:${shade(c, 0.28)}}`)
    .join("\n");
}

const title = period ? `contributions — ${period[1]} → ${period[2]}` : "contributions — past year";
fs.mkdirSync(outDir, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  const body = `<svg x="0" y="0" width="${WIDTH}" height="${bodyH}" viewBox="${vb.join(" ")}">${inner}</svg>`;
  const file = path.join(outDir, `3d-${name}.svg`);
  fs.writeFileSync(file, windowSvg(t, { title, label: "3D contribution calendar", bodyH, body, style: css(name, t) }));
  console.log(`${file} (removed ${removed} charts, viewBox ${vb.join(" ")})`);
}
