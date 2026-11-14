// Shared design tokens + terminal window chrome for every profile widget.
// All widgets are 900px wide windows with the same title bar, radius, border,
// fonts and green scale, so the README reads as one page instead of a stack of
// unrelated cards. Colors follow GitHub Primer (dark / light).

export const WIDTH = 900;
export const TITLE_H = 36;
export const RADIUS = 12;

export const MONO =
  "'JetBrains Mono','SFMono-Regular','SF Mono',Menlo,Consolas,'D2Coding','Noto Sans Mono CJK KR','Liberation Mono',monospace";
export const SANS =
  "'Pretendard','Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif";

export const THEMES = {
  dark: {
    bg: "#0d1117",
    bar: "#161b22",
    border: "#30363d",
    fg: "#e6edf3",
    muted: "#8b949e",
    accent: "#39d353",
    claude: "#d97757",
    // GitHub contribution scale, level 0..4
    green: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
    dots: ["#ff5f57", "#febc2e", "#28c840"],
  },
  light: {
    bg: "#ffffff",
    bar: "#f6f8fa",
    border: "#d0d7de",
    fg: "#1f2328",
    muted: "#59636e",
    accent: "#1a7f37",
    claude: "#c15f3c",
    green: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dots: ["#ff5f57", "#febc2e", "#28c840"],
  },
};

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Darken a #rrggbb color by factor (0..1) — used for 3D side faces.
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - f)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Wrap `body` (SVG markup in a 900 x bodyH coordinate space) in a window.
export function windowSvg(t, { title, bodyH, body, label, style = "" }) {
  const H = TITLE_H + bodyH;
  const dots = t.dots
    .map((c, i) => `<circle cx="${22 + i * 20}" cy="${TITLE_H / 2}" r="6" fill="${c}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${H}" viewBox="0 0 ${WIDTH} ${H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>
.w-mono{font-family:${MONO};font-size:14px}
.w-sans{font-family:${SANS}}
.w-title{font-size:13px}
${style}
</style>
<defs><clipPath id="w-clip"><rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${H - 1}" rx="${RADIUS}"/></clipPath></defs>
<g clip-path="url(#w-clip)">
<rect width="${WIDTH}" height="${H}" fill="${t.bg}"/>
<rect width="${WIDTH}" height="${TITLE_H}" fill="${t.bar}"/>
<line x1="0" y1="${TITLE_H - 0.5}" x2="${WIDTH}" y2="${TITLE_H - 0.5}" stroke="${t.border}"/>
${dots}
<text class="w-mono w-title" x="${WIDTH / 2}" y="${TITLE_H / 2 + 4.5}" text-anchor="middle" fill="${t.muted}">${esc(title)}</text>
<g transform="translate(0 ${TITLE_H})">
${body}
</g>
</g>
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${H - 1}" rx="${RADIUS}" fill="none" stroke="${t.border}"/>
</svg>
`;
}
