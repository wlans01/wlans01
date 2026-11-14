// Frame the "나의 기술 스택은 Claude" animation in the shared terminal window
// and derive a light variant by swapping the theme colors.
// Writes <outDir>/stack-dark.svg and stack-light.svg.
//
// usage: node scripts/build-stack.mjs <outDir> [src.svg]
import fs from "node:fs";
import path from "node:path";
import { THEMES, TITLE_H, WIDTH, windowSvg } from "./theme.mjs";

const outDir = process.argv[2] ?? "dist";
const src = fs.readFileSync(process.argv[3] ?? "assets/claude-eats-stack.svg", "utf8");

const open = src.match(/<svg[^>]*>/);
if (!open) throw new Error("no <svg> root");
let inner = src.slice(open.index + open[0].length, src.lastIndexOf("</svg>"));
inner = inner.replace(/<title>[\s\S]*?<\/title>/, "");
// the source draws its own card frame — the window replaces it
const frame = /<rect x="0\.5" y="0\.5" width="899" height="229" rx="12"[^>]*\/>/;
if (!frame.test(inner)) throw new Error("source frame rect not found (asset changed?)");
inner = inner.replace(frame, "");

// The source ends with a `git log … | wc -l → N` line whose N was hard-coded and
// can't be verified or refreshed from Actions (private org repos) — drop it.
const log = /<text class="mono" x="450" y="204"[^>]*animation:log[^>]*>[\s\S]*?<\/text>/;
if (!log.test(inner)) console.warn("::warning::stack: log line not found (asset changed?)");
inner = inner.replace(log, "");

const BODY_Y = 14; // trim the top padding the status line used to occupy
const BODY_H = 182 - BODY_Y; // and the bottom space the log line used

// "✻ Clauding… n/14" status moves from the body corner into the title bar
// (body y = BODY_Y maps to window y = TITLE_H)
const statusY = TITLE_H / 2 + 4.5 - TITLE_H + BODY_Y;
inner = inner.replace(
  /<text class="mono" x="872" y="34" text-anchor="end"([^>]*) style="([^"]*)">/g,
  (_, attrs, style) => `<text class="mono" x="${WIDTH - 22}" y="${statusY}" text-anchor="end"${attrs} style="${style};font-size:13px">`,
);

const recolor = (s, t) =>
  s
    .replace(/#E6EDF3/gi, t.fg)
    .replace(/#8B949E/gi, t.muted)
    .replace(/#39D353/gi, t.accent)
    .replace(/#D97757/gi, t.claude);

fs.mkdirSync(outDir, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  const body = `<svg x="0" y="0" width="${WIDTH}" height="${BODY_H}" viewBox="0 ${BODY_Y} 900 ${BODY_H}" overflow="visible">${recolor(inner, t)}</svg>`;
  const file = path.join(outDir, `stack-${name}.svg`);
  fs.writeFileSync(file, windowSvg(t, { title: "claude — ~/stack", label: "나의 기술 스택은 Claude", bodyH: BODY_H, body }));
  console.log(file);
}
