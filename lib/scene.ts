// The scene: screens and the parts snapped inside them, plus loose ink. Plain data, saved as JSON.
// toHtml() turns it into one self-contained HTML file with no AI and no key: same order, same rough sizes.

export type Pt = [number, number, number?];
export type Ink = { id: string; pts: Pt[] };
export type Screen = { id: string; name: string; x: number; y: number; w: number; h: number };
export type PartKind = "button" | "title" | "image" | "text";
export type Part = { id: string; screenId: string; type: PartKind; x: number; y: number; w: number; h: number; text: string };
export type Doc = { version: 1; screens: Screen[]; parts: Part[]; ink: Ink[] };

export const emptyDoc = (): Doc => ({ version: 1, screens: [], parts: [], ink: [] });

export const DEFAULT_TEXT: Record<PartKind, string> = {
  title: "Title",
  button: "Continue",
  text: "A line or two of text about this screen.",
  image: "Image",
};

export function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const slug = (s: string, i: number) => (s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `screen-${i + 1}`);

/** How a part sits across its screen: full width, or pushed left / centre / right. */
function align(p: Part, s: Screen): "stretch" | "start" | "center" | "end" {
  if (p.w >= s.w * 0.72) return "stretch";
  const mid = (p.x + p.w / 2 - s.x) / s.w;
  return mid < 0.4 ? "start" : mid > 0.6 ? "end" : "center";
}

export function partsOf(doc: Doc, screenId: string) {
  return doc.parts.filter((p) => p.screenId === screenId).sort((a, b) => a.y - b.y || a.x - b.x);
}

export function screenHtml(doc: Doc, s: Screen, i: number) {
  const W = 390, k = W / Math.max(1, s.w);
  const parts = partsOf(doc, s.id);
  let cursor = s.y + 20 / k; // the screen already has 24px of padding
  const rows = parts.map((p) => {
    const gap = Math.round(clamp((p.y - cursor) * k, 0, 160));
    cursor = Math.max(cursor, p.y + p.h);
    const a = align(p, s);
    const width = a === "stretch" ? "" : `width:${Math.round(clamp(p.w * k, 40, W - 40))}px;`;
    const style = `margin-top:${gap}px;align-self:${a === "stretch" ? "stretch" : a === "start" ? "flex-start" : a === "end" ? "flex-end" : "center"};${width}`;
    const t = escapeHtml(p.text || DEFAULT_TEXT[p.type]);
    if (p.type === "title") return `    <h1 style="${style}font-size:${Math.round(clamp(p.h * k * 0.7, 20, 40))}px">${t}</h1>`;
    if (p.type === "button") return `    <button type="button" style="${style}height:${Math.round(clamp(p.h * k, 40, 60))}px">${t}</button>`;
    if (p.type === "image") return `    <div class="img" role="img" aria-label="${t}" style="${style}height:${Math.round(clamp(p.h * k, 48, 480))}px"><span>${t}</span></div>`;
    return `    <p style="${style}">${t}</p>`;
  });
  return `  <section class="screen" id="${slug(s.name, i)}" aria-label="${escapeHtml(s.name)}">\n${rows.join("\n") || "    <!-- empty screen -->"}\n  </section>`;
}

export function toHtml(doc: Doc): string {
  const screens = [...doc.screens].sort((a, b) => a.x - b.x || a.y - b.y);
  const body = screens.length ? screens.map((s, i) => screenHtml(doc, s, i)).join("\n") : "  <!-- Draw a rectangle to make a screen. -->";
  const loose = doc.parts.filter((p) => !doc.screens.some((s) => s.id === p.screenId)).length;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(screens[0]?.name ?? "Untitled")}</title>
<style>
  :root { --bg: #f4f5f7; --card: #ffffff; --ink: #14161a; --muted: #5d6470; --line: #dfe2e8; --accent: #2a5bd7; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; display: flex; flex-wrap: wrap; gap: 32px; justify-content: center; }
  .screen { width: 390px; max-width: 100%; min-height: 720px; padding: 24px 20px 32px; background: var(--card); border: 1px solid var(--line); border-radius: 28px; display: flex; flex-direction: column; }
  h1 { margin: 0; line-height: 1.15; letter-spacing: -0.01em; }
  p { margin: 0; color: var(--muted); }
  button { border: 0; border-radius: 999px; padding: 0 22px; background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  .img { border-radius: 16px; background: repeating-linear-gradient(135deg, #eceef2 0 12px, #e4e7ec 12px 24px); display: grid; place-items: center; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
${body}${loose ? `\n  <!-- ${loose} part(s) outside any screen were left out. -->` : ""}
</body>
</html>
`;
}
