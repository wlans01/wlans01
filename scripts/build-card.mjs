// Terminal "neofetch" card: LiDAR point-cloud crane on the left, profile + live
// GitHub stats on the right. Writes <outDir>/card-dark.svg and card-light.svg.
//
// Stats come from the GraphQL contribution calendar (includes private
// contributions when they are enabled on the profile). Without a token the
// stats lines are left out instead of showing fake numbers.
//
// The 3D contribution calendar (github-profile-3d-contrib output) is embedded
// as a small inset next to the stats.
//
// usage: GITHUB_TOKEN=... node scripts/build-card.mjs <outDir> [login] [3d.svg]
import fs from "node:fs";
import path from "node:path";
import { THEMES, windowSvg, esc } from "./theme.mjs";
import { contrib3d, contrib3dCss } from "./contrib3d.mjs";

const outDir = process.argv[2] ?? "dist";
const LOGIN = process.argv[3] ?? process.env.GITHUB_REPOSITORY_OWNER ?? "wlans01";
const GRID_SVG = process.argv[4] ?? "profile-3d-contrib/profile-night-green.svg";
const SINCE = { y: 2025, m: 12 }; // GSI 입사

// ---------- data ----------
const PROFILE = [
  ["Name", ["Choi Ji-moon (최지문)"]],
  ["Role", ["LiDAR 3D Perception Engineer", "Physics-based R&D Engineer"]],
  ["Company", ["GSI 지에스아이㈜ · R&D"]],
  ["Domain", ["항만 크레인 자동화"]],
  ["Uptime", null], // filled below
  ["Working", [
    "크레인용 LiDAR 인식 코어 — 검출 · 추적 · ICP 정합",
    "PLC 연동 실시간 런타임 — 검출 루프 · Web UI",
    "LiDAR extrinsics 정합 웹앱 — React · FastAPI",
  ]],
  ["Before", ["레이저 현미경 시뮬레이션 · 광학 측정 분석", "머신비전 → 3D 점군 처리"]],
];

function kstToday() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

function uptime(today) {
  const [y, m] = today.split("-").map(Number);
  const months = (y - SINCE.y) * 12 + (m - SINCE.m);
  const yrs = Math.floor(months / 12), mo = months % 12;
  const parts = [];
  if (yrs) parts.push(`${yrs} year${yrs > 1 ? "s" : ""}`);
  if (mo || !yrs) parts.push(`${mo} month${mo === 1 ? "" : "s"}`);
  return parts.join(", ");
}

async function fetchStats() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const query = `query($login:String!){user(login:$login){
    contributionsCollection{contributionCalendar{totalContributions
      weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) {
    console.warn(`::warning::stats query failed: ${JSON.stringify(json).slice(0, 300)}`);
    return null;
  }
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  // current streak: today may still be empty, so start from yesterday then.
  let i = days.length - 1;
  if (days[i] && days[i].contributionCount === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;
  let best = 0, run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { total: cal.totalContributions, current, best };
}

// ---------- point-cloud crane ----------
// A yard gantry crane over container stacks, drawn the way a LiDAR sees it:
// sampled points colored by height (green scale), plus a sweeping scan beam.
function rng(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function crane(t, W, H) {
  const rand = rng(7);
  const pts = []; // [x, y]
  const jit = (v, a = 0.7) => v + (rand() - 0.5) * 2 * a;
  const seg = (x1, y1, x2, y2, step = 4.2) => {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let k = 0; k <= n; k++) pts.push([jit(x1 + ((x2 - x1) * k) / n), jit(y1 + ((y2 - y1) * k) / n)]);
  };
  const box = (x, y, w, h, step) => {
    seg(x, y, x + w, y, step * 0.8); // top face: LiDAR sees it densest
    seg(x, y, x, y + h, step);
    seg(x + w, y, x + w, y + h, step);
  };

  const G = H - 6; // ground
  // ground
  for (let x = 2; x < W - 2; x += 5) pts.push([jit(x, 1.5), jit(G, 0.8)]);

  // container stacks (end view), 6 rows between the legs
  const CW = 33, CH = 34, gap = 3, x0 = 34;
  const heights = [3, 2, 4, 1, 3, 2];
  const col = (i) => x0 + i * (CW + gap);
  heights.forEach((h, i) => {
    for (let k = 0; k < h; k++) box(col(i), G - (k + 1) * CH, CW, CH, 4.5);
  });

  // gantry: two legs + girder with a light truss
  const top = 34, gH = 18, L1 = 16, L2 = W - 24;
  for (const lx of [L1, L2]) { seg(lx, top + gH, lx, G); seg(lx + 7, top + gH, lx + 7, G); }
  seg(6, top, W - 6, top); seg(6, top + gH, W - 6, top + gH);
  for (let x = 6; x < W - 20; x += 22) seg(x, top + gH, x + 11, top, 3.6), seg(x + 11, top, x + 22, top + gH, 3.6);

  // trolley over row 3 (the one-high stack), hoisting a container
  const cx = col(3) + CW / 2;
  box(cx - 22, top + gH, 44, 14, 3.5);
  seg(cx - 22, top + gH + 14, cx + 22, top + gH + 14, 3.5);
  const spY = 176;
  seg(cx - 13, top + gH + 14, cx - 13, spY, 5); seg(cx + 13, top + gH + 14, cx + 13, spY, 5);
  seg(cx - 24, spY, cx + 24, spY, 3); // spreader
  box(cx - CW / 2 - 1, spY + 3, CW + 2, CH, 4.5);
  seg(cx - CW / 2 - 1, spY + 3 + CH, cx + CW / 2 + 1, spY + 3 + CH, 4.5);

  // height → green level (1..4)
  const buckets = [[], [], [], [], []];
  for (const [x, y] of pts) {
    const z = (G - y) / (G - top);
    const lvl = z < 0.04 ? 1 : z < 0.3 ? 2 : z < 0.6 ? 3 : 4;
    buckets[lvl].push(`M${x.toFixed(1)} ${y.toFixed(1)}h0`);
  }
  const dots = buckets
    .map((b, l) => (b.length ? `<path d="${b.join("")}" stroke="${t.green[l]}" stroke-width="2.3" stroke-linecap="round" fill="none"/>` : ""))
    .join("\n");

  // scan beam from the trolley-mounted sensor
  const sy = top + gH + 16;
  const beam = `<path d="M${cx} ${sy}L${cx - 100} ${G}L${cx + 100} ${G}Z" fill="${t.accent}" opacity="0.06"/>
<line x1="${cx}" y1="${sy}" x2="${cx}" y2="${G}" stroke="${t.accent}" stroke-width="1.2" opacity="0.55">
<animateTransform attributeName="transform" type="rotate" values="-18 ${cx} ${sy};18 ${cx} ${sy};-18 ${cx} ${sy}" dur="5s" repeatCount="indefinite"/>
</line>
<circle cx="${cx}" cy="${sy}" r="3" fill="${t.claude}"/>`;
  return beam + "\n" + dots;
}

// ---------- layout ----------
function render(name, stats, today, grid) {
  const t = THEMES[name];
  const LH = 22, KX = 330, VX = 422, top = 74;
  const out = [];
  let y = top;
  const line = (key, val, keyColor = t.accent) => {
    if (key) out.push(`<text class="w-mono" x="${KX}" y="${y}" fill="${keyColor}" font-weight="700">${esc(key)}</text>`);
    if (val) out.push(`<text class="w-mono" x="${VX}" y="${y}" fill="${t.fg}">${val}</text>`);
    y += LH;
  };
  const sep = (s) => `<tspan fill="${t.muted}">${s}</tspan>`;
  const fmt = (s) => esc(s).replace(/ (·|—|→) /g, (m, c) => ` ${sep(c)} `);

  out.push(`<text class="w-mono" x="${KX}" y="${y}" font-weight="700"><tspan fill="${t.accent}">wlans01</tspan><tspan fill="${t.muted}">@</tspan><tspan fill="${t.accent}">gsi</tspan></text>`);
  y += LH;
  out.push(`<text class="w-mono" x="${KX}" y="${y - 6}" fill="${t.muted}">${"─".repeat(11)}</text>`);
  y += LH - 6;

  for (const [k, vals] of PROFILE) {
    if (k === "Uptime") { line(k, `${esc(uptime(today))}  ${sep(`(since ${SINCE.y}.${SINCE.m})`)}`); continue; }
    vals.forEach((v, i) => line(i ? "" : k, fmt(v)));
  }

  y += 12;
  const statsTop = y;
  if (stats) {
    line("GitHub", `${stats.total.toLocaleString("en-US")} ${sep("contributions")}`);
    line("Streak", `${stats.current} days ${sep("· best")} ${stats.best}`);
  }

  // contribution-scale color blocks (neofetch palette row)
  y += 4;
  t.green.forEach((c, i) => out.push(`<rect x="${KX + i * 30}" y="${y - 12}" width="26" height="14" rx="2" fill="${c}" stroke="${t.border}" stroke-width="${i ? 0 : 1}"/>`));
  out.push(`<rect x="${KX + 5 * 30}" y="${y - 12}" width="26" height="14" rx="2" fill="${t.claude}"/>`);
  y += LH;

  // small 3D contribution calendar beside the stats
  if (grid) {
    const IX = 628, IW = 252, IH = Math.round((IW * grid.viewBox[3]) / grid.viewBox[2]);
    const label = grid.period ? `${grid.period[0]} → ${grid.period[1]}` : "past year";
    out.push(`<text class="w-mono w-small" x="${IX + IW}" y="${statsTop - 4}" text-anchor="end" fill="${t.muted}">${esc(label)}</text>`);
    out.push(`<svg x="${IX}" y="${statsTop + 4}" width="${IW}" height="${IH}" viewBox="${grid.viewBox.join(" ")}">${grid.inner}</svg>`);
    y = Math.max(y, statsTop + 4 + IH + 6);
  }

  // prompt lines
  const prompt = (yy, cmd) => `<text class="w-mono" x="28" y="${yy}"><tspan fill="${t.accent}" font-weight="700">wlans01@gsi</tspan><tspan fill="${t.muted}">:</tspan><tspan fill="${t.fg}">~</tspan><tspan fill="${t.muted}">$ </tspan><tspan fill="${t.fg}">${cmd}</tspan></text>`;
  const endY = Math.max(y + 18, 470);
  const artTop = 50, artH = endY - 40 - artTop;
  const body = [
    prompt(32, "neofetch --ascii lidar"),
    `<svg x="22" y="${artTop}" width="280" height="${artH}" viewBox="0 0 280 ${artH}" overflow="visible">${crane(t, 280, artH)}</svg>`,
    ...out,
    prompt(endY, `<tspan class="cursor">█</tspan>`),
  ].join("\n");

  return windowSvg(t, {
    title: "wlans01@gsi: ~",
    label: "Choi Ji-moon — LiDAR 3D Perception Engineer @ GSI",
    bodyH: endY + 20,
    body,
    style: [
      "@keyframes blink{0%,49%{fill-opacity:1}50%,100%{fill-opacity:0}}.cursor{animation:blink 1.1s steps(1) infinite}",
      ".w-small{font-size:11px}",
      grid ? contrib3dCss(name) : "",
    ].join("\n"),
  });
}

const today = kstToday();
const stats = await fetchStats();
let grid = null;
if (GRID_SVG && fs.existsSync(GRID_SVG)) {
  grid = contrib3d(fs.readFileSync(GRID_SVG, "utf8"));
  if (grid.removed !== 2) console.warn(`::warning::3D: removed ${grid.removed} chart group(s), expected 2 (generator output changed?)`);
} else {
  console.warn(`::warning::3D source not found (${GRID_SVG}), card built without the calendar inset`);
}
fs.mkdirSync(outDir, { recursive: true });
for (const name of Object.keys(THEMES)) {
  const file = path.join(outDir, `card-${name}.svg`);
  fs.writeFileSync(file, render(name, stats, today, grid));
  console.log(`${file}${stats ? ` (total ${stats.total}, streak ${stats.current}/${stats.best})` : " (no stats)"}${grid ? " + 3D inset" : ""}`);
}
