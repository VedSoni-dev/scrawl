"use client";
// The landing page's pictures, all drawn from scrawl's own UI: the board, its parts, the Code tab (the code is
// the real generator's output, lib/scene.ts) and the recording of the app at work (public/gate-preview.mp4).
import { useEffect, useRef, useState } from "react";
import { screenHtml, type Doc } from "@/lib/scene";

const PAUSE_SVG = <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" /><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" /></svg>;
const PLAY_SVG = <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor" /></svg>;

/** scrawl's mark: one quick squiggle. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 17c3-1 4-9 7-9s1 8 4 8 3-5 5-6" />
    </svg>
  );
}

function PauseButton({ running, onToggle, className }: { running: boolean; onToggle: () => void; className: string }) {
  return (
    <button type="button" className={`ui-pause loop-pause ${className} ${running ? "" : "is-paused"}`} aria-label={running ? "Pause animation" : "Play animation"} title={running ? "Pause animation" : "Play animation"} onClick={onToggle}>
      {running ? PAUSE_SVG : PLAY_SVG}
    </button>
  );
}

/** The sketch that draws itself, then snaps part by part: ink strokes fade as each real part lands (CSS, 9 s loop). */
function SketchLoop() {
  return (
    <div className="sk">
      <svg viewBox="0 0 320 520" className="sk__ink" aria-hidden="true">
        <path className="i1" d="M24 22 C90 18 230 20 296 24 C298 160 296 360 294 500 C200 503 90 501 26 498 C22 360 24 160 24 22" />
        <path className="i2" d="M52 70 c10-14 18 12 28-2 s16 12 26-2 s14 12 24-1 s12 10 22 0" />
        <path className="i3" d="M50 112 L268 112 L268 270 L50 270 Z M50 112 L268 270 M268 112 L50 270" />
        <path className="i4" d="M52 302 c14-8 26 8 40 0 s26 8 40 0 s26 8 40 0 s24 8 38 0 M52 330 c14-8 26 8 40 0 s26 8 40 0 s20 6 30 0" />
        <path className="i5" d="M80 430 C60 430 52 470 80 470 L240 470 C266 470 262 430 240 430 Z" />
      </svg>
      <div className="sk__ui" aria-hidden="true">
        <div className="u1" />
        <div className="u2">Your morning, planned</div>
        <div className="u3" />
        <div className="u4">Three things, in the order that makes sense. Tap one to start.</div>
        <div className="u5">Start my day</div>
      </div>
    </div>
  );
}

const DOCK = [
  ["Draw", "M4 20l4-1 11-11-3-3L5 16l-1 4z"],
  ["Select", "M6 3l12 9-5 1 3 6-2 1-3-6-4 4z"],
  ["Erase", "M8 20h12M5 15l8-8 6 6-6 6H9l-4-4z"],
  ["Undo", "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"],
] as const;

/** The hero: scrawl's window. The board on the left, its layers filling in on the right as each part snaps. */
export function HeroWindow() {
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRunning(false);
  }, []);
  return (
    <>
      <div className={`ly-piece ly-piece--main sw${running ? "" : " is-paused"}`} role="img" aria-label="scrawl's window: a hand-drawn phone screen draws itself, and each stroke snaps into a title, an image, body text and a Start my day button while the layers list fills in.">
        <div className="sw__bar" aria-hidden="true">
          <span className="sw__brand"><Mark size={18} />scrawl</span>
          <span className="sw__name">Morning</span>
          <span className="sw__btn">Make it real</span>
        </div>
        <div className="sw__body" aria-hidden="true">
          <div className="sw__board">
            <SketchLoop />
            <div className="sw__dock">
              {DOCK.map(([l, d], i) => (
                <span key={l} className={i === 0 ? "is-on" : ""}><svg viewBox="0 0 24 24"><path d={d} /></svg></span>
              ))}
            </div>
          </div>
          <div className="sw__side">
            <div className="sw__tabs"><i className="is-on">Layers</i><i>Code</i><i>Preview</i></div>
            <ul className="sw__layers">
              <li className="l1"><b>Morning</b></li>
              <li className="l2"><em>title</em>Your morning, planned</li>
              <li className="l3"><em>image</em>Image</li>
              <li className="l4"><em>text</em>Three things, in the…</li>
              <li className="l5"><em>button</em>Start my day</li>
            </ul>
          </div>
        </div>
      </div>
      <PauseButton running={running} onToggle={() => setRunning((r) => !r)} className="sw__pause" />
    </>
  );
}

/** The small card over the window's lower left: the code the sketch wrote, line by line. */
export function HeroCard() {
  return (
    <div className="ly-piece ly-piece--note cc" aria-hidden="true" data-ly-steps="700">
      <div className="cc__row"><b>Code</b><span className="cc__chip" data-step data-step-at="4">Copied</span></div>
      <code className="cc__line" data-step>&lt;h1&gt;Your morning, planned&lt;/h1&gt;</code>
      <code className="cc__line" data-step>&lt;div class=&quot;img&quot; role=&quot;img&quot;&gt;</code>
      <code className="cc__line" data-step>&lt;button&gt;Start my day&lt;/button&gt;</code>
    </div>
  );
}

/** #film: the real recording of the app (the sign-in screen's preview), in an app frame, with a pause control. */
export function FilmFrame() {
  const v = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { v.current?.pause(); setRunning(false); }
  }, []);
  const toggle = () => {
    const el = v.current; if (!el) return;
    if (el.paused) { void el.play(); setRunning(true); } else { el.pause(); setRunning(false); }
  };
  return (
    <div className="lp-film">
      <video ref={v} className="lp-film__video" src="/gate-preview.mp4" poster="/film-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-label="A recording of scrawl in Safari: a drawn box becomes a screen, then a scribble, an X, a wave and a pill become a title, an image, text and a Continue button, and the Preview tab shows the plain HTML version." width={800} height={510} />
      <PauseButton running={running} onToggle={toggle} className="lp-film__pause" />
    </div>
  );
}

/** Step 1: a wobbly rectangle beside the screen it snapped into. */
export function StepScreen() {
  return (
    <div className="st" role="img" aria-label="A wobbly hand-drawn rectangle, and beside it the clean phone screen named Sign up that it snapped into.">
      <div className="st__pair">
        <svg viewBox="0 0 160 260" className="st__ink" aria-hidden="true"><path d="M14 16 C60 10 120 14 148 18 C150 90 147 180 146 244 C100 248 50 246 16 242 C10 170 12 90 14 16" /></svg>
        <span className="st__arrow" aria-hidden="true">→</span>
        <div className="st__phone"><span className="st__label">Sign up</span></div>
      </div>
    </div>
  );
}

const GLYPHS: [string, string, React.ReactNode][] = [
  ["Pill", "button", <path key="b" d="M30 14 C12 14 10 34 30 34 L90 34 C110 34 108 14 90 14 Z" />],
  ["Scribble up top", "title", <path key="t" d="M10 26 c8-14 14 10 22-2 s12 10 20-2 s12 10 20-1 s10 8 18 0" />],
  ["Box with an X", "image", <path key="i" d="M18 6 L100 6 L100 42 L18 42 Z M18 6 L100 42 M100 6 L18 42" />],
  ["Wavy line", "text", <path key="w" d="M10 24 c10-8 18 8 28 0 s18 8 28 0 s18 8 28 0 s12 6 20 0" />],
];

/** Step 2: each ink glyph and the part it becomes. */
export function StepParts() {
  return (
    <div className="st" role="img" aria-label="Four strokes and what they become: a pill becomes a button, a scribble up top a title, a box with an X an image, a wavy line body text.">
      <ul className="st__rows" aria-hidden="true">
        {GLYPHS.map(([name, kind, d]) => (
          <li key={kind}>
            <svg viewBox="0 0 120 48" className="st__glyph">{d}</svg>
            <span className="st__arrow">→</span>
            <span className={`st__part st__part--${kind}`}>{kind === "button" ? "Continue" : kind === "title" ? "Create your account" : kind === "image" ? "" : "A line or two of text."}</span>
            <em className="st__kind">{name}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Step 3: the finished screen in the Preview tab, with its badge and actions. */
export function StepReal() {
  return (
    <div className="st" role="img" aria-label="The Preview tab showing the finished Sign up screen made from the sketch, marked Polished by AI, with Copy HTML and Download buttons.">
      <div className="st__real" aria-hidden="true">
        <div className="st__bar"><span className="st__badge">Polished by AI</span><span className="st__b">Copy HTML</span><span className="st__b">Download</span></div>
        <div className="st__screen">
          <b className="st__h">Create your account</b>
          <span className="st__p">Plan your mornings in two minutes. No card needed.</span>
          <span className="st__img" />
          <span className="st__field">Email</span>
          <span className="st__field">Password</span>
          <span className="st__cta">Continue</span>
        </div>
      </div>
    </div>
  );
}

const CODE_DOC: Doc = {
  version: 1,
  screens: [{ id: "s", name: "Morning", x: 0, y: 0, w: 260, h: 480 }],
  parts: [
    { id: "a", screenId: "s", type: "title", x: 18, y: 24, w: 200, h: 34, text: "Your morning, planned" },
    { id: "b", screenId: "s", type: "image", x: 18, y: 72, w: 224, h: 140, text: "Today's plan" },
    { id: "c", screenId: "s", type: "text", x: 18, y: 224, w: 220, h: 40, text: "Three things, in the order that makes sense." },
    { id: "d", screenId: "s", type: "button", x: 18, y: 420, w: 224, h: 44, text: "Start my day" },
  ],
  ink: [],
};

/** #code: the Code tab as the app shows it, with the generator's real output for a four-part sketch. */
export function CodeFragment() {
  const code = screenHtml(CODE_DOC, CODE_DOC.screens[0], 0);
  return (
    <div className="ui bf" role="img" aria-label="scrawl's Code tab: Copy HTML and Download .html buttons over the HTML written from a sketch with a title, an image, a line of text and a Start my day button.">
      <div className="bf__tabs" aria-hidden="true"><i>Layers</i><i className="is-on">Code</i><i>Preview</i></div>
      <div className="bf__acts" aria-hidden="true"><span>Copy HTML</span><span>Download .html</span></div>
      <pre className="bf__pre" aria-hidden="true"><code>{code}</code></pre>
    </div>
  );
}

/** #questions: where Make it real runs. */
export function AiFragment() {
  return (
    <div className="ui bf" role="img" aria-label="scrawl's settings: Make it real through publik, or your own Claude or OpenAI key kept in this browser.">
      <b className="bf__title">Make it real runs on</b>
      <div className="bf__seg" aria-hidden="true"><i className="is-on">publik</i><i>Your own key</i></div>
      <span className="bf__key" aria-hidden="true">Claude or OpenAI key, kept in this browser</span>
      <span className="bf__note" aria-hidden="true">Drawing and the Code tab need neither.</span>
    </div>
  );
}

const LEGEND: [string, string][] = [
  ["Big rectangle", "screen", ],
  ["Pill", "button"],
  ["Scribble at the top", "title"],
  ["Box, or an X", "image"],
  ["Wavy line", "text"],
].map(([a, b]) => [a, b] as [string, string]);
const LEGEND_D: Record<string, string> = {
  screen: "M5 3h14v18H5z", button: "M6.5 9h11a3.5 3.5 0 0 1 0 7h-11a3.5 3.5 0 0 1 0-7z", title: "M3 9c2-3 3 3 5 0s3 3 5 0 3 3 5 0 2 1 3 0",
  image: "M4 5h16v14H4zM4 5l16 14M20 5L4 19", text: "M3 12c2-2 3 2 5 0s3 2 5 0 3 2 5 0 2 1 3 0",
};

/** #status: the Shapes card from the app's top bar, the five strokes scrawl knows. */
export function LegendFragment() {
  return (
    <div className="ui bf" role="img" aria-label="scrawl's Shapes card: a big rectangle makes a screen, a pill a button, a scribble at the top a title, a box or an X an image, a wavy line text.">
      <b className="bf__title">Shapes scrawl knows</b>
      <ul className="bf__legend" aria-hidden="true">
        {LEGEND.map(([a, b]) => (
          <li key={b}><svg viewBox="0 0 24 24"><path d={LEGEND_D[b]} /></svg><span>{a}</span><em>{b}</em></li>
        ))}
      </ul>
    </div>
  );
}
