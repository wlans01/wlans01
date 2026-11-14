// Restyle github-profile-3d-contrib output so it can be embedded in the card
// as a small inset (see build-card.mjs).
//  - drop the language pie and contribution radar: private org-repo commits are
//    not itemized by the GitHub API, so both only reflect a couple of public repos
//  - drop the footer (total / stars / forks): the card shows the live total
//  - drop the generator palette / background, crop to the blocks
import { THEMES, shade } from "./theme.mjs";

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

// → { inner, viewBox: [x, y, w, h], period: [from, to] | null, removed }
export function contrib3d(svg) {
  // 1) footer group first: total, star/fork icons and the period text
  const p = svg.match(/>(\d{4}-\d{2}-\d{2}) \/ (\d{4}-\d{2}-\d{2})</);
  const footText = svg.indexOf('<text style="font-size: 32px');
  if (footText < 0) throw new Error("3D footer not found (generator output changed?)");
  svg = cutGroup(svg, svg.lastIndexOf("<g>", footText));

  // 2) pie + radar: top-level groups whose transform uses the comma form
  //    `translate(x, y)`; the 3D blocks use the space form `translate(x y)`.
  const CHART = /<g transform="translate\([\d.]+, [\d.]+\)">/;
  let removed = 0, m;
  while ((m = CHART.exec(svg))) { svg = cutGroup(svg, m.index); removed++; }

  // 3) inner content without root, style, background
  const open = svg.match(/<svg[^>]*>/);
  let inner = svg.slice(open.index + open[0].length, svg.lastIndexOf("</svg>"));
  inner = inner.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<rect[^>]*class="fill-bg"[^>]*><\/rect>/, "");

  // 4) crop: group translate = top of a bar; its base comes from the grow
  //    animation's first value. Faces extend ~40px right / ~25px below.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const g of inner.matchAll(/<g transform="translate\(([\d.]+) ([\d.]+)\)">(?:<animateTransform[^>]*values="[\d.]+ ([\d.]+);)?/g)) {
    const x = +g[1], y = +g[2], base = g[3] ? +g[3] : y;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, base);
  }
  const PAD = 6;
  const viewBox = [x0 - PAD, y0 - PAD, x1 - x0 + 40 + 2 * PAD, y1 - y0 + 25 + 2 * PAD].map((v) => +v.toFixed(1));
  return { inner, viewBox, period: p ? [p[1], p[2]] : null, removed };
}

// Theme green scale for the block faces (top / left / right).
export function contrib3dCss(name) {
  const lv = [...THEMES[name].green];
  lv[0] = name === "dark" ? "#21262d" : "#ebedf0";
  return lv
    .map((c, i) => `.cont-top-${i}{fill:${c}}.cont-left-${i}{fill:${shade(c, 0.14)}}.cont-right-${i}{fill:${shade(c, 0.28)}}`)
    .join("\n");
}
