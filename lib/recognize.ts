// scrawl's stroke recogniser. Our own code: plain geometry on one stroke (closure, corners, aspect, size,
// where it sits inside a screen). It never guesses quietly: under the threshold it says "unsure" and the app
// asks with a row of chips instead of snapping to the wrong part.

export type Pt = [number, number, number?];
export type Box = { x: number; y: number; w: number; h: number };
export type PartType = "screen" | "button" | "title" | "image" | "text";
export type Guess = { type: PartType | null; confidence: number; box: Box; why: string; options: PartType[] };

export const THRESHOLD = 0.6;

export function bbox(pts: Pt[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function pathLength(pts: Pt[]) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

/** Resample to n points spaced evenly along the path. */
export function resample(pts: Pt[], n = 64): Pt[] {
  if (pts.length < 2) return pts.slice();
  const I = pathLength(pts) / (n - 1);
  if (I === 0) return [pts[0]];
  const out: Pt[] = [[pts[0][0], pts[0][1]]];
  let D = 0;
  const src = pts.map((p) => [p[0], p[1]] as Pt);
  for (let i = 1; i < src.length; i++) {
    const d = dist(src[i - 1], src[i]);
    if (D + d >= I && d > 0) {
      const t = (I - D) / d;
      const q: Pt = [src[i - 1][0] + t * (src[i][0] - src[i - 1][0]), src[i - 1][1] + t * (src[i][1] - src[i - 1][1])];
      out.push(q);
      src.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < n) out.push([src[src.length - 1][0], src[src.length - 1][1]]);
  return out.slice(0, n);
}

/** Ramer-Douglas-Peucker, keeps pressure. Run on pen-up so long sessions stay light. */
export function simplify(pts: Pt[], eps = 0.8): Pt[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > best) { best = d; bi = i; }
    }
    if (best > eps) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Sharp turns along the resampled path (a hand-drawn rectangle has about four). */
export function corners(pts: Pt[]): number {
  const r = resample(pts, 48);
  const k = 3;
  let count = 0, last = -10;
  for (let i = k; i < r.length - k; i++) {
    const a = Math.atan2(r[i][1] - r[i - k][1], r[i][0] - r[i - k][0]);
    const b = Math.atan2(r[i + k][1] - r[i][1], r[i + k][0] - r[i][0]);
    let d = Math.abs(b - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > 1.0 && i - last > k + 1) { count++; last = i; }
  }
  return count;
}

/** How many times the stroke changes horizontal or vertical direction (a squiggle flips a lot). */
export function flips(pts: Pt[], axis: 0 | 1): number {
  const r = resample(pts, 64);
  let n = 0, sign = 0;
  for (let i = 1; i < r.length; i++) {
    const d = r[i][axis] - r[i - 1][axis];
    if (Math.abs(d) < 0.5) continue;
    const s = Math.sign(d);
    if (sign && s !== sign) n++;
    sign = s;
  }
  return n;
}

export function isClosed(pts: Pt[]): boolean {
  const b = bbox(pts);
  const gap = dist(pts[0], pts[pts.length - 1]);
  return pathLength(pts) > 60 && gap < Math.max(26, 0.24 * Math.max(b.w, b.h));
}

export function isLine(pts: Pt[]): boolean {
  const b = bbox(pts);
  const diag = Math.hypot(b.w, b.h);
  return diag > 20 && pathLength(pts) / diag < 1.12;
}

const center = (b: Box) => [b.x + b.w / 2, b.y + b.h / 2] as const;
export const inside = (b: Box, s: Box, slack = 8) => {
  const [cx, cy] = center(b);
  return cx >= s.x - slack && cx <= s.x + s.w + slack && cy >= s.y - slack && cy <= s.y + s.h + slack;
};

/**
 * One stroke in, one guess out. `screens` are the screen frames already on the board.
 * Rules (in order): big closed shape on bare board → screen; inside a screen: closed and wide → button,
 * closed and boxy → image; open and flat in the top third → title; open, flat and wavy elsewhere → text.
 */
export function classify(pts: Pt[], screens: Box[]): Guess {
  const box = bbox(pts);
  const none = (why: string, options: PartType[]): Guess => ({ type: null, confidence: 0, box, why, options });
  if (pts.length < 2 || pathLength(pts) < 12) return none("too short", []);
  const parent = screens.find((s) => inside(box, s) && box.w < s.w * 1.05 && box.h < s.h * 1.05);
  const closed = isClosed(pts);
  const c = corners(pts);
  const aspect = box.w / Math.max(1, box.h);

  if (!parent) {
    if (closed && box.w >= 90 && box.h >= 110) {
      const conf = c >= 2 && c <= 7 ? 0.95 : 0.75;
      return { type: "screen", confidence: conf, box, why: `closed, ${c} corners, ${Math.round(box.w)}x${Math.round(box.h)}`, options: ["screen"] };
    }
    if (closed && box.w >= 60 && box.h >= 60) return { type: "screen", confidence: 0.55, box, why: "small closed shape", options: ["screen"] };
    return none("outside any screen", closed ? ["screen"] : []);
  }

  const relY = (box.y + box.h / 2 - parent.y) / parent.h;
  const opts: PartType[] = ["button", "title", "image", "text"];

  if (closed) {
    if (aspect >= 2 && box.h <= 110) return { type: "button", confidence: aspect >= 2.4 ? 0.92 : 0.7, box, why: `closed pill, ${aspect.toFixed(1)}:1`, options: opts };
    if (aspect < 1.7 || box.h > 110) return { type: "image", confidence: box.w > 40 && box.h > 40 ? 0.85 : 0.5, box, why: `closed box, ${aspect.toFixed(1)}:1`, options: opts };
    return { type: aspect >= 1.85 ? "button" : "image", confidence: 0.45, box, why: "between a pill and a box", options: opts };
  }

  if (isLine(pts) && box.h > 24 && box.w > 24) return none("a single diagonal (draw the other one to make an image)", opts);

  if (box.h <= 80 && box.w >= 24) {
    const wavy = flips(pts, 1) >= 3 || flips(pts, 0) >= 3;
    if (relY < 0.3) return { type: "title", confidence: wavy || box.w > 40 ? 0.88 : 0.6, box, why: "flat scribble near the top", options: opts };
    return { type: "text", confidence: wavy ? 0.86 : 0.62, box, why: wavy ? "wavy line" : "flat line", options: opts };
  }
  return none("not sure what this is", opts);
}

/** Two diagonals that cross inside a screen make an image placeholder (the X-box). */
export function crossesAsX(a: Pt[], b: Pt[]): boolean {
  if (!isLine(a) || !isLine(b)) return false;
  const A = [a[0], a[a.length - 1]], B = [b[0], b[b.length - 1]];
  const s = (p: Pt, q: Pt, r: Pt) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return s(A[0], A[1], B[0]) !== s(A[0], A[1], B[1]) && s(B[0], B[1], A[0]) !== s(B[0], B[1], A[1]);
}
