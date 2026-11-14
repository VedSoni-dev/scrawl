"use client";

import { getStroke } from "perfect-freehand";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { PublikChoice, usePublik } from "@/components/PublikGate";
import { classify, crossesAsX, simplify, bbox, inside, isLine, THRESHOLD, type Box, type PartType } from "@/lib/recognize";
import { DEFAULT_TEXT, emptyDoc, partsOf, toHtml, type Doc, type Ink, type Part, type PartKind, type Pt, type Screen } from "@/lib/scene";
import { EXAMPLE } from "@/lib/example";

type Tool = "pen" | "select" | "erase";
type Tab = "layers" | "code" | "preview";
type Toast = { id: number; text: string; action?: { label: string; run: () => void }; link?: { label: string; href: string } };
type Chips = { inkId: string; box: Box; options: PartType[] };
type Drag = { id: string; kind: "part" | "screen"; mode: "move" | "resize"; sx: number; sy: number; orig: Doc; moved: boolean };

const KEY_DOC = "scrawl:doc:v1";
const KEY_SEEN = "scrawl:onboarded";
const KEY_KEYS = "scrawl:keys";
const LIMIT = 100;

const uid = () => Math.random().toString(36).slice(2, 10);
const clone = (d: Doc): Doc => JSON.parse(JSON.stringify(d));
const ls = {
  get(k: string) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { window.localStorage.setItem(k, v); return true; } catch { return false; } },
};

function outline(pts: Pt[], pen: boolean): Path2D {
  const o = getStroke(pts.map((p) => [p[0], p[1], p[2] ?? 0.5]), { size: 5, thinning: pen ? 0.6 : 0.45, smoothing: 0.5, streamline: 0.45, simulatePressure: !pen, last: true });
  const path = new Path2D();
  if (!o.length) return path;
  path.moveTo(o[0][0], o[0][1]);
  for (let i = 1; i < o.length; i++) {
    const [x0, y0] = o[i - 1], [x1, y1] = o[i];
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  path.closePath();
  return path;
}

/** Strip code fences and check the page parses into something with a body. */
function cleanHtml(raw: string): string | null {
  let t = raw.trim().replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  const i = t.search(/<!doctype html|<html/i);
  if (i > 0) t = t.slice(i);
  if (!/<(html|body|div|main|section)/i.test(t)) return null;
  try {
    const d = new DOMParser().parseFromString(t, "text/html");
    if (!d.body || d.body.textContent === null || d.body.children.length === 0) return null;
    d.querySelectorAll("script").forEach((s) => s.remove());
    return "<!doctype html>\n" + d.documentElement.outerHTML;
  } catch { return null; }
}

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}

function download(name: string, text: string, type = "text/html") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const LABEL: Record<PartType, string> = { screen: "screen", button: "button", title: "title", image: "image", text: "text" };

export default function Scrawl() {
  const { choice } = usePublik();
  const [doc, setDoc] = useState<Doc>(emptyDoc);
  const pastR = useRef<Doc[]>([]);
  const futR = useRef<Doc[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [chips, setChips] = useState<Chips | null>(null);
  const [tab, setTab] = useState<Tab>("layers");
  const [sheet, setSheet] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [just, setJust] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [legend, setLegend] = useState(false);
  const [settings, setSettings] = useState(false);
  const [keys, setKeys] = useState<{ claude: string; openai: string }>({ claude: "", openai: "" });
  const [project, setProject] = useState("");
  const [making, setMaking] = useState(false);
  const [made, setMade] = useState<{ html: string; by: string } | null>(null);
  const [aiError, setAiError] = useState<{ text: string; link?: string } | null>(null);
  const [example, setExample] = useState<Doc | null>(null); // the person's own doc, stashed while the example is open
  const [unsupported, setUnsupported] = useState(false);
  const [noStore, setNoStore] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<{ id: number; pts: Pt[]; pen: boolean } | null>(null);
  const penSeen = useRef(false);
  const lastInk = useRef<{ id: string; at: number } | null>(null);
  const drag = useRef<Drag | null>(null);
  const erasing = useRef<{ orig: Doc; changed: boolean } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.action || t.link ? 6000 : 3200);
  }, []);

  // ---- history -------------------------------------------------------------------------------------------
  const commit = useCallback((next: Doc, from?: Doc) => {
    const prev = from ?? docRef.current;
    pastR.current = [...pastR.current.slice(-(LIMIT - 1)), prev];
    futR.current = [];
    docRef.current = next;
    setDoc(next);
  }, []);
  const undo = useCallback(() => {
    const prev = pastR.current.pop();
    if (!prev) return;
    futR.current = [docRef.current, ...futR.current].slice(0, LIMIT);
    docRef.current = prev; setDoc(prev); setChips(null); setSel(null);
  }, []);
  const redo = useCallback(() => {
    const next = futR.current.shift();
    if (!next) return;
    pastR.current = [...pastR.current, docRef.current];
    docRef.current = next; setDoc(next); setChips(null);
  }, []);

  // ---- load / save ---------------------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window.PointerEvent === "undefined" || !document.createElement("canvas").getContext) setUnsupported(true);
    const raw = ls.get(KEY_DOC);
    if (raw) {
      try { const d = JSON.parse(raw) as Doc & { project?: string }; if (d.version === 1) { setDoc(d); docRef.current = d; setProject(d.project ?? ""); } } catch { /* start fresh */ }
    }
    if (!ls.get(KEY_SEEN)) setOnboard(true);
    try { const k = JSON.parse(ls.get(KEY_KEYS) || "{}"); setKeys({ claude: k.claude ?? "", openai: k.openai ?? "" }); } catch { /* none */ }
    if (!ls.set("scrawl:probe", "1")) setNoStore(true);
    setLoaded(true);
  }, []);
  const save = useCallback(() => {
    if (!loaded || example) return;
    if (!ls.set(KEY_DOC, JSON.stringify({ ...docRef.current, project }))) setNoStore(true);
  }, [loaded, example, project]);
  useEffect(() => { const t = setTimeout(save, 400); return () => clearTimeout(t); }, [doc, save]);
  useEffect(() => {
    const h = () => { if (document.visibilityState === "hidden") save(); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", h);
    return () => { window.removeEventListener("pagehide", save); document.removeEventListener("visibilitychange", h); };
  }, [save]);
  useEffect(() => { if (noStore) toast({ text: "This browser won't let scrawl save. Your sketch lives only in this tab." }); }, [noStore, toast]);

  // ---- drawing -------------------------------------------------------------------------------------------
  const paths = useMemo(() => new Map<string, Path2D>(), []);
  const draw = useCallback(() => {
    const c = canvas.current, st = stage.current;
    if (!c || !st) return;
    const dpr = window.devicePixelRatio || 1;
    const w = st.clientWidth, h = st.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      c.style.width = w + "px"; c.style.height = h + "px";
    }
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const ink = getComputedStyle(st).getPropertyValue("--ink").trim() || "#14161a";
    g.fillStyle = ink;
    for (const s of docRef.current.ink) {
      let p = paths.get(s.id);
      if (!p) { p = outline(s.pts, true); paths.set(s.id, p); }
      g.fill(p);
    }
    if (live.current && live.current.pts.length) g.fill(outline(live.current.pts, live.current.pen));
  }, [paths]);
  useEffect(() => { draw(); }, [doc, draw]);
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (stage.current) ro.observe(stage.current);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", draw);
    return () => { ro.disconnect(); mq.removeEventListener("change", draw); };
  }, [draw]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const flash = (ids: string[]) => {
    setJust(new Set(ids));
    setTimeout(() => setJust(new Set()), 420);
  };

  /** Turn ink into a part (or a screen), keeping roughly where and how big it was drawn. */
  const snapInk = useCallback((d: Doc, inkId: string, type: PartType, boxOverride?: Box): Doc | null => {
    const ink = d.ink.find((s) => s.id === inkId);
    const box = boxOverride ?? (ink ? bbox(ink.pts) : null);
    if (!box) return null;
    const next = clone(d);
    next.ink = next.ink.filter((s) => s.id !== inkId);
    if (type === "screen") {
      const n = next.screens.length;
      const name = n === 0 && project.trim() ? project.trim() : `Screen ${n + 1}`;
      const s: Screen = { id: uid(), name, x: Math.round(box.x), y: Math.round(box.y), w: Math.round(Math.max(box.w, 120)), h: Math.round(Math.max(box.h, 160)) };
      next.screens.push(s);
      // Ink already inside the new screen stays ink; it can be redrawn or snapped from the chips.
      flash([s.id]);
      return next;
    }
    const parent = next.screens.find((s) => inside(box, s));
    if (!parent) return null;
    const pad = 12;
    const x = Math.max(parent.x + pad, Math.min(box.x, parent.x + parent.w - pad - 24));
    const y = Math.max(parent.y + pad, Math.min(box.y, parent.y + parent.h - pad - 16));
    const w = Math.min(Math.max(box.w, 32), parent.x + parent.w - pad - x);
    const minH = type === "button" ? 36 : type === "title" ? 28 : type === "text" ? 22 : 40;
    const h = Math.min(Math.max(box.h, minH), parent.y + parent.h - pad - y);
    const p: Part = { id: uid(), screenId: parent.id, type, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), text: "" };
    next.parts.push(p);
    flash([p.id]);
    return next;
  }, [project]);

  const finishStroke = useCallback((pts: Pt[]) => {
    const d = docRef.current;
    const ink: Ink = { id: uid(), pts: simplify(pts) };
    const withInk: Doc = { ...d, ink: [...d.ink, ink] };
    const screens = d.screens;
    setChips(null);

    // X-box: this stroke and the one just before it are two crossing diagonals inside a screen.
    const prev = lastInk.current && Date.now() - lastInk.current.at < 2500 ? d.ink.find((s) => s.id === lastInk.current!.id) : null;
    if (prev && crossesAsX(prev.pts, ink.pts)) {
      const b = bbox([...prev.pts, ...ink.pts]);
      if (screens.some((s) => inside(b, s))) {
        const merged: Doc = { ...withInk, ink: withInk.ink.filter((s) => s.id !== prev.id) };
        const snapped = snapInk(merged, ink.id, "image", b);
        if (snapped) { commit(withInk); commit(snapped, withInk); lastInk.current = null; return; }
      }
    }
    // A diagonal drawn over an image that's already there is just its X: keep the image, drop the line.
    if (isLine(ink.pts)) {
      const b = bbox(ink.pts);
      const img = d.parts.find((p) => p.type === "image" && inside(b, p, 4) && b.w <= p.w + 16 && b.h <= p.h + 16);
      if (img) return;
    }

    const g = classify(ink.pts, screens);
    if (g.type && g.confidence >= THRESHOLD) {
      const snapped = snapInk(withInk, ink.id, g.type);
      if (snapped) { commit(withInk); commit(snapped, withInk); lastInk.current = null; return; }
    }
    commit(withInk);
    lastInk.current = { id: ink.id, at: Date.now() };
    if (g.options.length && !(isLine(ink.pts) && screens.some((s) => inside(g.box, s)))) setChips({ inkId: ink.id, box: g.box, options: g.type ? [g.type, ...g.options.filter((o) => o !== g.type)] : g.options });
  }, [commit, snapInk]);

  const hitInk = (x: number, y: number, r = 12) => docRef.current.ink.find((s) => s.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < r));

  const capture = (e: RPE<HTMLDivElement>) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } };

  const onDown = (e: RPE<HTMLDivElement>) => {
    if (e.pointerType === "pen") penSeen.current = true;
    if (e.pointerType === "touch" && penSeen.current && tool !== "select") return; // palm rejection once a pencil is in use
    if (e.button > 0 || editing) return;
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
    const [x, y] = local(e);
    setLegend(false);

    if (tool === "pen") {
      capture(e);
      live.current = { id: e.pointerId, pts: [[x, y, e.pressure || 0.5]], pen: e.pointerType === "pen" };
      stage.current?.classList.add("is-drawing");
      setSel(null);
      return;
    }
    if (tool === "erase") {
      capture(e);
      erasing.current = { orig: docRef.current, changed: false };
      eraseAt(x, y, target);
      return;
    }
    // select
    if (!target) { setSel(null); return; }
    const id = target.dataset.id!;
    const kind = target.dataset.kind === "screen" ? "screen" : "part";
    setSel(id);
    capture(e);
    drag.current = { id, kind, mode: (e.target as HTMLElement).dataset.handle ? "resize" : "move", sx: x, sy: y, orig: docRef.current, moved: false };
  };

  const eraseAt = (x: number, y: number, target: HTMLElement | null) => {
    const d = docRef.current;
    const ink = hitInk(x, y);
    let next: Doc | null = null;
    if (ink) next = { ...d, ink: d.ink.filter((s) => s !== ink) };
    else if (target?.dataset.kind === "part") next = { ...d, parts: d.parts.filter((p) => p.id !== target.dataset.id) };
    else if (target?.dataset.kind === "screen") next = { ...d, screens: d.screens.filter((s) => s.id !== target.dataset.id), parts: d.parts.filter((p) => p.screenId !== target.dataset.id) };
    if (next) { docRef.current = next; setDoc(next); if (erasing.current) erasing.current.changed = true; }
  };

  const onMove = (e: RPE<HTMLDivElement>) => {
    const [x, y] = local(e);
    if (live.current && live.current.id === e.pointerId) {
      const evs = (e.nativeEvent.getCoalescedEvents?.() ?? []) as PointerEvent[];
      const r = stage.current!.getBoundingClientRect();
      for (const ev of evs.length ? evs : [e.nativeEvent]) live.current.pts.push([ev.clientX - r.left, ev.clientY - r.top, ev.pressure || 0.5]);
      draw();
      return;
    }
    if (erasing.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      eraseAt(x, y, el?.closest<HTMLElement>("[data-id]") ?? null);
      return;
    }
    const dr = drag.current;
    if (!dr) return;
    const dx = x - dr.sx, dy = y - dr.sy;
    if (!dr.moved && Math.hypot(dx, dy) < 3) return;
    dr.moved = true;
    const next = clone(dr.orig);
    if (dr.kind === "screen") {
      const s = next.screens.find((q) => q.id === dr.id)!;
      if (dr.mode === "resize") { s.w = Math.max(120, s.w + dx); s.h = Math.max(160, s.h + dy); }
      else { s.x += dx; s.y += dy; next.parts.forEach((p) => { if (p.screenId === s.id) { p.x += dx; p.y += dy; } }); }
    } else {
      const p = next.parts.find((q) => q.id === dr.id)!;
      const s = next.screens.find((q) => q.id === p.screenId);
      if (dr.mode === "resize") { p.w = Math.max(24, p.w + dx); p.h = Math.max(18, p.h + dy); if (s) { p.w = Math.min(p.w, s.x + s.w - p.x); p.h = Math.min(p.h, s.y + s.h - p.y); } }
      else {
        p.x += dx; p.y += dy;
        if (s) { p.x = Math.max(s.x, Math.min(p.x, s.x + s.w - p.w)); p.y = Math.max(s.y, Math.min(p.y, s.y + s.h - p.h)); }
      }
    }
    docRef.current = next;
    setDoc(next);
  };

  const onUp = (e: RPE<HTMLDivElement>) => {
    if (live.current && live.current.id === e.pointerId) {
      const pts = live.current.pts;
      live.current = null;
      stage.current?.classList.remove("is-drawing");
      if (pts.length > 1) finishStroke(pts); else draw();
      return;
    }
    if (erasing.current) {
      const er = erasing.current;
      erasing.current = null;
      if (er.changed) commit(docRef.current, er.orig);
      return;
    }
    const dr = drag.current;
    drag.current = null;
    if (dr?.moved) commit(docRef.current, dr.orig);
  };

  // ---- editing helpers -----------------------------------------------------------------------------------
  const updatePart = (id: string, patch: Partial<Part>) => commit({ ...docRef.current, parts: docRef.current.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const renameScreen = (id: string, name: string) => commit({ ...docRef.current, screens: docRef.current.screens.map((s) => (s.id === id ? { ...s, name } : s)) });
  const removeSel = useCallback(() => {
    if (!sel) return;
    const d = docRef.current;
    if (d.screens.some((s) => s.id === sel)) commit({ ...d, screens: d.screens.filter((s) => s.id !== sel), parts: d.parts.filter((p) => p.screenId !== sel) });
    else commit({ ...d, parts: d.parts.filter((p) => p.id !== sel) });
    setSel(null);
  }, [sel, commit]);
  const clearAll = () => {
    const d = docRef.current;
    if (!d.ink.length && !d.screens.length) return;
    commit(emptyDoc());
    setMade(null); setSel(null); setChips(null);
    toast({ text: "Board cleared.", action: { label: "Undo", run: undo } });
  };
  const pickChip = (type: PartType | null) => {
    if (!chips) return;
    if (type) {
      const snapped = snapInk(docRef.current, chips.inkId, type);
      if (snapped) commit(snapped);
      else toast({ text: type === "screen" ? "Couldn't make a screen from that." : "Draw parts inside a screen (a big rectangle) first." });
    }
    setChips(null);
  };

  // ---- keyboard ------------------------------------------------------------------------------------------
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable=true]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { if (typing) return; e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") { if (typing) return; e.preventDefault(); redo(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "p" || e.key === "d") setTool("pen");
      else if (e.key === "v") setTool("select");
      else if (e.key === "e") setTool("erase");
      else if ((e.key === "Backspace" || e.key === "Delete") && sel) { e.preventDefault(); removeSel(); }
      else if (e.key === "Escape") { setSel(null); setChips(null); setLegend(false); setSettings(false); }
      else if (e.key === "Enter" && sel && docRef.current.parts.some((p) => p.id === sel)) { e.preventDefault(); setEditing(sel); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [undo, redo, removeSel, sel]);

  // ---- code & make it real -------------------------------------------------------------------------------
  const code = useMemo(() => toHtml(doc), [doc]);
  const hasScreen = doc.screens.length > 0;

  const sketchPng = (): string | null => {
    const c = canvas.current, d = docRef.current;
    if (!c || !d.screens.length) return null;
    const xs = d.screens.flatMap((s) => [s.x, s.x + s.w]), ys = d.screens.flatMap((s) => [s.y, s.y + s.h]);
    const x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 10, w = Math.max(...xs) - x0 + 10, h = Math.max(...ys) - y0 + 10;
    const k = Math.min(1, 900 / Math.max(w, h));
    const out = document.createElement("canvas");
    out.width = Math.round(w * k); out.height = Math.round(h * k);
    const g = out.getContext("2d");
    if (!g) return null;
    g.fillStyle = "#fff"; g.fillRect(0, 0, out.width, out.height);
    g.scale(k, k); g.translate(-x0, -y0);
    g.strokeStyle = "#222"; g.lineWidth = 2; g.font = "14px sans-serif"; g.fillStyle = "#222";
    for (const s of d.screens) { g.strokeRect(s.x, s.y, s.w, s.h); g.fillText(s.name, s.x, s.y - 4); }
    for (const p of d.parts) {
      g.strokeRect(p.x, p.y, p.w, p.h);
      g.fillText(`${p.type}: ${p.text || DEFAULT_TEXT[p.type]}`.slice(0, 40), p.x + 4, p.y + Math.min(p.h - 4, 16));
      if (p.type === "image") { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.w, p.y + p.h); g.moveTo(p.x + p.w, p.y); g.lineTo(p.x, p.y + p.h); g.stroke(); }
    }
    for (const s of d.ink) { g.fill(outline(s.pts, true)); }
    return out.toDataURL("image/png");
  };

  const sceneJson = () => {
    const d = docRef.current;
    return {
      screens: d.screens.map((s) => ({
        name: s.name, width: Math.round(s.w), height: Math.round(s.h),
        parts: partsOf(d, s.id).map((p) => ({ type: p.type, text: p.text || DEFAULT_TEXT[p.type], placeholder: !p.text, x: Math.round(p.x - s.x), y: Math.round(p.y - s.y), w: Math.round(p.w), h: Math.round(p.h) })),
      })),
    };
  };

  const makeReal = async () => {
    if (making) { abort.current?.abort(); return; }
    if (!hasScreen) { toast({ text: "Draw a rectangle first: that's your screen." }); return; }
    setAiError(null);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (choice !== "publik") {
      if (keys.claude.trim()) headers["x-claude-key"] = keys.claude.trim();
      else if (keys.openai.trim()) headers["x-openai-key"] = keys.openai.trim();
      else { setSettings(true); toast({ text: "Add a Claude or OpenAI key, or switch to your publik plan." }); return; }
    }
    const ctl = new AbortController();
    abort.current = ctl;
    const timer = setTimeout(() => ctl.abort(), 70_000);
    setMaking(true); setTab("preview"); setSheet(true);
    try {
      const res = await fetch("/api/make", { method: "POST", headers, body: JSON.stringify({ scene: sceneJson(), png: sketchPng() }), signal: ctl.signal });
      const b = (await res.json().catch(() => ({}))) as { html?: string; by?: string; error?: string; topUpUrl?: string };
      if (!res.ok) {
        setAiError({ text: b.error ?? `Something went wrong (${res.status}).`, link: b.topUpUrl });
        setMade({ html: code, by: "plain" });
        return;
      }
      const html = cleanHtml(b.html ?? "");
      if (!html) {
        setAiError({ text: "The AI's answer wasn't a usable page, so here's the plain version. Try again for a polished one." });
        setMade({ html: code, by: "plain" });
        return;
      }
      setMade({ html, by: b.by ?? "ai" });
    } catch {
      setAiError({ text: ctl.signal.aborted ? "Stopped. Here's the plain version." : "Couldn't reach the AI. Here's the plain version." });
      setMade({ html: code, by: "plain" });
    } finally {
      clearTimeout(timer);
      setMaking(false);
      abort.current = null;
    }
  };

  const doCopy = async (text: string) => {
    if (await copyText(text)) toast({ text: "Copied." });
    else { download("scrawl.html", text); toast({ text: "Couldn't copy here, so it downloaded instead." }); }
  };

  // ---- onboarding / example ------------------------------------------------------------------------------
  const startOwn = (name: string) => {
    setProject(name.trim());
    ls.set(KEY_SEEN, "1");
    setOnboard(false);
    setTool("pen");
  };
  const openExample = () => { if (example) return; setExample(docRef.current); docRef.current = EXAMPLE; setDoc(EXAMPLE); pastR.current = []; futR.current = []; setOnboard(false); setMade(null); };
  const closeExample = () => { if (!example) return; docRef.current = example; setDoc(example); setExample(null); pastR.current = []; futR.current = []; setMade(null); };
  const saveKeys = (k: { claude: string; openai: string }) => { setKeys(k); ls.set(KEY_KEYS, JSON.stringify(k)); };

  const steps = [
    { done: hasScreen, text: "Draw a big rectangle. It becomes a screen." },
    { done: doc.parts.length > 0, text: "Inside it: a pill for a button, a scribble up top for a title, a box for an image, a wavy line for text." },
    { done: !!made && made.by !== "plain", text: "Tap Make it real for a polished screen and its code." },
  ];
  const selected = doc.parts.find((p) => p.id === sel) ?? null;
  const selScreen = doc.screens.find((s) => s.id === sel) ?? null;
  const editPart = doc.parts.find((p) => p.id === editing) ?? null;

  if (unsupported) return <div className="sc-unsupported"><p>scrawl needs a browser with Pointer Events and canvas: current Safari, Chrome, Firefox or Edge.</p></div>;

  return (
    <div className={`sc-app tool-${tool}`}>
      <header className="sc-top">
        <a className="sc-brand" href="/" aria-label="scrawl home"><Mark /> scrawl</a>
        {example ? (
          <span className="sc-example-bar">Example sketch <button type="button" className="sc-link" onClick={closeExample}>Back to my sketch</button></span>
        ) : (
          <span className="sc-project">{project || "My sketch"}</span>
        )}
        <div className="sc-top-actions">
          <button type="button" className="sc-ghost" onClick={() => setLegend((v) => !v)} aria-expanded={legend}>Shapes</button>
          <button type="button" className="sc-ghost" onClick={() => setSettings(true)}>Settings</button>
          <button type="button" className="sc-primary" onClick={makeReal} disabled={!hasScreen && !making} aria-busy={making}>
            {making ? <><span className="sc-spin" aria-hidden /> Stop</> : "Make it real"}
          </button>
        </div>
      </header>

      <div className="sc-body">
        <div className="sc-board-wrap">
          <div
            ref={stage}
            className="sc-stage"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={(e) => { const t = (e.target as HTMLElement).closest<HTMLElement>("[data-kind=part]"); if (t && tool === "select") setEditing(t.dataset.id!); }}
          >
            {doc.screens.map((s) => (
              <div key={s.id} data-id={s.id} data-kind="screen" className={`sc-screen${sel === s.id ? " is-sel" : ""}${just.has(s.id) ? " is-new" : ""}`} style={{ left: s.x, top: s.y, width: s.w, height: s.h }}>
                <span className="sc-screen-name">{s.name}</span>
                {sel === s.id && <span className="sc-handle" data-handle="se" aria-hidden />}
              </div>
            ))}
            {doc.parts.map((p) => (
              <div key={p.id} data-id={p.id} data-kind="part" className={`sc-part t-${p.type}${sel === p.id ? " is-sel" : ""}${just.has(p.id) ? " is-new" : ""}`} style={{ left: p.x, top: p.y, width: p.w, height: p.h }}>
                {p.type === "image" ? <svg className="sc-x" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden><path d="M0 0L10 10M10 0L0 10" vectorEffect="non-scaling-stroke" /></svg> : null}
                <span className="sc-part-text">{p.type === "text" ? (p.text || DEFAULT_TEXT.text) : (p.text || DEFAULT_TEXT[p.type])}</span>
                {sel === p.id && <span className="sc-handle" data-handle="se" aria-hidden />}
              </div>
            ))}
            <canvas ref={canvas} className="sc-canvas" aria-label="Drawing board" role="img" />
            {editPart && (
              <input
                className="sc-edit" autoFocus onFocus={(e) => e.currentTarget.select()} defaultValue={editPart.text || DEFAULT_TEXT[editPart.type]}
                style={{ left: editPart.x, top: editPart.y + editPart.h + 6, width: Math.max(180, editPart.w) }}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (editPart.text || DEFAULT_TEXT[editPart.type])) updatePart(editPart.id, { text: v }); setEditing(null); }}
                aria-label={`Text for this ${editPart.type}`}
              />
            )}
            {chips && (
              <div className="sc-chips" style={{ left: chips.box.x, top: chips.box.y + chips.box.h + 8 }} onPointerDown={(e) => e.stopPropagation()} role="group" aria-label="What is this?">
                <span>This is a</span>
                {chips.options.map((o) => <button type="button" key={o} onClick={() => pickChip(o)}>{LABEL[o]}</button>)}
                <button type="button" className="sc-chip-keep" onClick={() => pickChip(null)}>keep ink</button>
              </div>
            )}
            {!hasScreen && !doc.ink.length && !onboard && (
              <div className="sc-ghost-hint" aria-hidden><div className="sc-ghost-rect" /><p>Draw a big rectangle here</p><small>finger, Pencil or mouse</small></div>
            )}
          </div>

          <div className="sc-tools" role="toolbar" aria-label="Tools">
            <ToolBtn on={tool === "pen"} label="Draw" k="P" onClick={() => setTool("pen")} icon={<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />} />
            <ToolBtn on={tool === "select"} label="Select" k="V" onClick={() => setTool("select")} icon={<path d="M6 3l12 9-5 1 3 6-2 1-3-6-4 4z" />} />
            <ToolBtn on={tool === "erase"} label="Erase" k="E" onClick={() => setTool("erase")} icon={<path d="M8 20h12M5 15l8-8 6 6-6 6H9l-4-4z" />} />
            <span className="sc-sep" />
            <ToolBtn label="Undo" onClick={undo} disabled={!pastR.current.length} icon={<path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />} />
            <ToolBtn label="Redo" onClick={redo} disabled={!futR.current.length} icon={<path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />} />
            <ToolBtn label="Clear" onClick={clearAll} disabled={!doc.ink.length && !hasScreen} icon={<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />} />
            {(selected || selScreen) && tool === "select" && (
              <>
                <span className="sc-sep" />
                {selected && <button type="button" className="sc-tool-text" onClick={() => setEditing(selected.id)}>Edit text</button>}
                <button type="button" className="sc-tool-text" onClick={removeSel}>Delete</button>
              </>
            )}
          </div>

          {!steps.every((s) => s.done) && <ol className="sc-steps" aria-label="How to use scrawl">
            {steps.map((s, i) => <li key={i} className={s.done ? "is-done" : ""}><span>{s.done ? "✓" : i + 1}</span>{s.text}</li>)}
          </ol>}
        </div>

        <aside className={`sc-panel${sheet ? " is-open" : ""}`} aria-label="Layers, code and preview">
          <button type="button" className="sc-sheet-toggle" onClick={() => setSheet((v) => !v)} aria-expanded={sheet}>
            {sheet ? "Hide" : "Layers · Code · Preview"}
          </button>
          <div className="sc-tabs" role="tablist">
            {(["layers", "code", "preview"] as Tab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setSheet(true); }}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <div className="sc-tabpanel">
            {tab === "layers" && (
              doc.screens.length ? (
                <ul className="sc-layers">
                  {doc.screens.map((s) => (
                    <li key={s.id}>
                      <button type="button" className={`sc-layer is-screen${sel === s.id ? " is-sel" : ""}`} onClick={() => { setSel(s.id); setTool("select"); }}>
                        <input value={s.name} aria-label="Screen name" onClick={(e) => e.stopPropagation()} onChange={(e) => { const v = e.target.value; setDoc((d) => { const n = { ...d, screens: d.screens.map((q) => q.id === s.id ? { ...q, name: v } : q) }; docRef.current = n; return n; }); }} onBlur={(e) => renameScreen(s.id, e.target.value.trim() || "Screen")} />
                      </button>
                      <ul>
                        {partsOf(doc, s.id).map((p) => (
                          <li key={p.id}><button type="button" className={`sc-layer${sel === p.id ? " is-sel" : ""}`} onClick={() => { setSel(p.id); setTool("select"); }}><em>{p.type}</em> {p.text || DEFAULT_TEXT[p.type]}</button></li>
                        ))}
                        {!partsOf(doc, s.id).length && <li className="sc-muted">Nothing inside yet. Draw a pill, a scribble, a box or a wavy line in it.</li>}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : <p className="sc-empty">No screens yet. Draw a big rectangle on the board and it snaps into one.</p>
            )}
            {tab === "code" && (
              <div className="sc-code">
                <div className="sc-row">
                  <button type="button" className="sc-secondary" disabled={!hasScreen} onClick={() => void doCopy(code)}>Copy HTML</button>
                  <button type="button" className="sc-secondary" disabled={!hasScreen} onClick={() => download(`${(doc.screens[0]?.name || "scrawl").replace(/[^\w-]+/g, "-").toLowerCase()}.html`, code)}>Download .html</button>
                </div>
                {!hasScreen ? <p className="sc-empty">Draw a rectangle to start. The code writes itself from your sketch, no AI needed.</p> : <pre><code>{code}</code></pre>}
              </div>
            )}
            {tab === "preview" && (
              <div className="sc-preview">
                {aiError && <p className="sc-error" role="alert">{aiError.text}{aiError.link && <> <a href={aiError.link} target="_blank" rel="noopener noreferrer">Top up on publik</a></>}</p>}
                {making && <p className="sc-muted"><span className="sc-spin" aria-hidden /> Making it real. This takes 10 to 40 seconds.</p>}
                {made ? (
                  <>
                    <div className="sc-row">
                      <span className="sc-badge">{made.by === "plain" ? "Plain version" : "Polished by AI"}</span>
                      <button type="button" className="sc-secondary" onClick={() => void doCopy(made.html)}>Copy HTML</button>
                      <button type="button" className="sc-secondary" onClick={() => download("scrawl-real.html", made.html)}>Download</button>
                    </div>
                    <iframe title="Preview of your screen" sandbox="" srcDoc={made.html} className="sc-frame" />
                  </>
                ) : !making && (
                  hasScreen ? (
                    <>
                      <p className="sc-muted">The plain version, straight from your sketch. Tap Make it real for a polished one.</p>
                      <iframe title="Preview of your screen" sandbox="" srcDoc={code} className="sc-frame" />
                    </>
                  ) : <p className="sc-empty">Your screen shows up here once you draw one.</p>
                )}
              </div>
            )}
          </div>
          <p className="sc-foot">free &amp; open source · not affiliated with Anthropic</p>
        </aside>
      </div>

      {legend && (
        <div className="sc-legend" role="dialog" aria-label="Shapes scrawl knows">
          <Legend />
          <button type="button" className="sc-link" onClick={() => setLegend(false)}>Close</button>
        </div>
      )}

      {onboard && (
        <div className="sc-modal" role="dialog" aria-modal="true" aria-labelledby="ob-title">
          <form className="sc-card" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get("name"); startOwn(String(v ?? "")); }}>
            <h2 id="ob-title">What are you sketching?</h2>
            <p className="sc-muted">Name your first screen. You can change it later.</p>
            <input name="name" autoFocus placeholder="Sign up, Home, Checkout…" maxLength={40} className="sc-input" />
            <Legend />
            <div className="sc-row sc-row-end">
              <button type="button" className="sc-link" onClick={openExample}>See an example first</button>
              <button type="submit" className="sc-primary">Start drawing</button>
            </div>
          </form>
        </div>
      )}

      {settings && (
        <div className="sc-modal" role="dialog" aria-modal="true" aria-labelledby="st-title" onPointerDown={(e) => { if (e.target === e.currentTarget) setSettings(false); }}>
          <div className="sc-card">
            <h2 id="st-title">Settings</h2>
            <PublikChoice />
            {choice !== "publik" && (
              <div className="sc-keys">
                <label>Claude API key<input className="sc-input" type="password" autoComplete="off" value={keys.claude} onChange={(e) => saveKeys({ ...keys, claude: e.target.value })} placeholder="sk-ant-…" /></label>
                <label>or OpenAI API key<input className="sc-input" type="password" autoComplete="off" value={keys.openai} onChange={(e) => saveKeys({ ...keys, openai: e.target.value })} placeholder="sk-…" /></label>
                <p className="sc-muted">Your key stays in this browser and goes only with a Make it real request, never stored on a server. Claude is used when both are set.</p>
              </div>
            )}
            <div className="sc-row">
              <button type="button" className="sc-secondary" onClick={() => download("scrawl-project.json", JSON.stringify({ ...docRef.current, project }, null, 2), "application/json")}>Export project</button>
              <label className="sc-secondary sc-file">Import project<input type="file" accept="application/json,.json" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                try { const d = JSON.parse(await f.text()) as Doc & { project?: string }; if (d.version !== 1 || !Array.isArray(d.screens)) throw new Error(); commit({ version: 1, screens: d.screens, parts: d.parts ?? [], ink: d.ink ?? [] }); setProject(d.project ?? project); toast({ text: "Project imported." }); } catch { toast({ text: "That file isn't a scrawl project." }); }
                e.target.value = "";
              }} /></label>
            </div>
            <div className="sc-row sc-row-end">
              {!example && <button type="button" className="sc-link" onClick={() => { setSettings(false); openExample(); }}>See an example</button>}
              <button type="button" className="sc-primary" onClick={() => setSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="sc-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="sc-toast">{t.text}{t.action && <button type="button" onClick={() => { t.action!.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>}</div>
        ))}
      </div>
    </div>
  );
}

function ToolBtn({ on, label, k, onClick, icon, disabled }: { on?: boolean; label: string; k?: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className={`sc-tool${on ? " is-on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} title={k ? `${label} (${k})` : label} aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden>{icon}</svg>
      <span>{label}</span>
    </button>
  );
}

export function Mark() {
  return (
    <svg className="sc-mark" viewBox="0 0 24 24" aria-hidden><path d="M4 17c3-1 4-9 7-9s1 8 4 8 3-5 5-6" /></svg>
  );
}

function Legend() {
  const rows: [string, React.ReactNode][] = [
    ["Big rectangle → screen", <path key="a" d="M5 3h14v18H5z" />],
    ["Pill → button", <rect key="b" x="3" y="9" width="18" height="7" rx="3.5" />],
    ["Scribble at the top → title", <path key="c" d="M3 9c2-3 3 3 5 0s3 3 5 0 3 3 5 0 2 1 3 0" />],
    ["Box, or an X → image", <path key="d" d="M4 5h16v14H4zM4 5l16 14M20 5L4 19" />],
    ["Wavy line → text", <path key="e" d="M3 12c2-2 3 2 5 0s3 2 5 0 3 2 5 0 2 1 3 0" />],
  ];
  return (
    <ul className="sc-legend-list">
      {rows.map(([t, d]) => <li key={t}><svg viewBox="0 0 24 24" aria-hidden>{d}</svg>{t}</li>)}
    </ul>
  );
}
