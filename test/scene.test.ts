import { test } from "node:test";
import assert from "node:assert/strict";
import { toHtml, emptyDoc, type Doc, type PartKind } from "../lib/scene.ts";

test("empty doc still makes a valid page", () => {
  const h = toHtml(emptyDoc());
  assert.match(h, /^<!doctype html>/); assert.match(h, /<\/html>\n$/);
});
test("user text is escaped", () => {
  const d: Doc = { ...emptyDoc(), screens: [{ id: "s", name: "<Home>", x: 0, y: 0, w: 300, h: 600 }],
    parts: [{ id: "p", screenId: "s", type: "title", x: 10, y: 10, w: 200, h: 40, text: `<script>alert("x")</script>` }] };
  const h = toHtml(d);
  assert.ok(!h.includes("<script>")); assert.ok(h.includes("&lt;script&gt;"));
});
test("random scenes never throw and keep tags balanced", () => {
  const kinds: PartKind[] = ["button", "title", "image", "text"];
  for (let n = 0; n < 300; n++) {
    const d = emptyDoc();
    const ns = Math.floor(Math.random() * 3);
    for (let i = 0; i < ns; i++) d.screens.push({ id: "s" + i, name: "Screen " + i, x: i * 400, y: Math.random() * 50, w: 100 + Math.random() * 300, h: 200 + Math.random() * 500 });
    for (let i = 0; i < Math.floor(Math.random() * 12); i++) d.parts.push({ id: "p" + i, screenId: "s" + Math.floor(Math.random() * (ns + 1)), type: kinds[i % 4], x: Math.random() * 900, y: Math.random() * 700, w: Math.random() * 300, h: Math.random() * 200, text: Math.random() > 0.5 ? "a&b<c>" : "" });
    const h = toHtml(d);
    for (const tag of ["section", "h1", "p", "button", "div"]) assert.equal((h.match(new RegExp(`<${tag}[ >]`, "g")) || []).length, (h.match(new RegExp(`</${tag}>`, "g")) || []).length, tag);
  }
});
