import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, crossesAsX, type Pt } from "../lib/recognize.ts";

// Hand-like strokes: a little wobble so nothing is perfectly straight.
const wob = (i: number) => Math.sin(i * 1.7) * 1.5;
function rect(x: number, y: number, w: number, h: number, n = 30): Pt[] {
  const out: Pt[] = [];
  const edge = (ax: number, ay: number, bx: number, by: number) => { for (let i = 0; i < n; i++) { const t = i / n; out.push([ax + (bx - ax) * t + wob(i), ay + (by - ay) * t + wob(i + 3)]); } };
  edge(x, y, x + w, y); edge(x + w, y, x + w, y + h); edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
  out.push([x + 4, y + 3]);
  return out;
}
function pill(cx: number, cy: number, w: number, h: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 80; i++) { const t = (i / 80) * Math.PI * 2; out.push([cx + (w / 2) * Math.cos(t) + wob(i), cy + (h / 2) * Math.sin(t)]); }
  return out;
}
function squiggle(x: number, y: number, w: number, amp = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 60; i++) out.push([x + (w * i) / 60, y + Math.sin(i / 3) * amp]);
  return out;
}
const line = (ax: number, ay: number, bx: number, by: number): Pt[] => Array.from({ length: 20 }, (_, i) => [ax + ((bx - ax) * i) / 19, ay + ((by - ay) * i) / 19 + wob(i) * 0.3] as Pt);

const screen = { x: 100, y: 100, w: 300, h: 600 };

test("big rectangle on bare board is a screen", () => {
  const g = classify(rect(100, 100, 300, 600), []);
  assert.equal(g.type, "screen"); assert.ok(g.confidence >= 0.6);
});
test("pill inside a screen is a button", () => {
  const g = classify(pill(250, 600, 200, 50), [screen]);
  assert.equal(g.type, "button"); assert.ok(g.confidence >= 0.6);
});
test("boxy closed shape inside a screen is an image", () => {
  const g = classify(rect(130, 250, 240, 160), [screen]);
  assert.equal(g.type, "image"); assert.ok(g.confidence >= 0.6);
});
test("scribble near the top is a title", () => {
  const g = classify(squiggle(130, 150, 160, 10), [screen]);
  assert.equal(g.type, "title"); assert.ok(g.confidence >= 0.6);
});
test("squiggle lower down is body text", () => {
  const g = classify(squiggle(130, 460, 220, 6), [screen]);
  assert.equal(g.type, "text"); assert.ok(g.confidence >= 0.6);
});
test("two crossing diagonals make an X", () => {
  assert.ok(crossesAsX(line(140, 260, 340, 400), line(340, 260, 140, 400)));
  assert.ok(!crossesAsX(line(140, 260, 340, 400), line(140, 420, 340, 560)));
});
test("negatives: a dot, a lone diagonal, an open scribble outside screens", () => {
  assert.equal(classify([[1, 1], [2, 2]], [screen]).type, null);
  assert.equal(classify(line(140, 260, 340, 400), [screen]).type, null);
  assert.equal(classify(squiggle(600, 100, 100), [screen]).type, null);
});
