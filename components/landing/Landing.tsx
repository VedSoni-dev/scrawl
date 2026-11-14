import { PublikPitch } from "@/components/PublikGate";
import "./landing.css";

const REPO = "https://github.com/VedSoni-dev/scrawl";

function Demo() {
  // A sketch that draws itself, then snaps into parts: the thing scrawl does, on a loop.
  return (
    <div className="ld-demo" aria-label="A hand-drawn phone screen snapping into a title, an image, text and a button" role="img">
      <svg viewBox="0 0 320 520" className="ld-ink" aria-hidden>
        <path className="i1" d="M24 22 C90 18 230 20 296 24 C298 160 296 360 294 500 C200 503 90 501 26 498 C22 360 24 160 24 22" />
        <path className="i2" d="M52 70 c10-14 18 12 28-2 s16 12 26-2 s14 12 24-1 s12 10 22 0" />
        <path className="i3" d="M50 112 L268 112 L268 270 L50 270 Z M50 112 L268 270 M268 112 L50 270" />
        <path className="i4" d="M52 302 c14-8 26 8 40 0 s26 8 40 0 s26 8 40 0 s24 8 38 0 M52 330 c14-8 26 8 40 0 s26 8 40 0 s20 6 30 0" />
        <path className="i5" d="M80 430 C60 430 52 470 80 470 L240 470 C266 470 262 430 240 430 Z" />
      </svg>
      <div className="ld-ui" aria-hidden>
        <div className="u1" />
        <div className="u2">Your morning, planned</div>
        <div className="u3" />
        <div className="u4">Three things, in the order that makes sense. Tap one to start.</div>
        <div className="u5">Start my day</div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="ld">
      <header className="ld-nav">
        <a href="/" className="ld-brand"><svg viewBox="0 0 24 24" aria-hidden><path d="M4 17c3-1 4-9 7-9s1 8 4 8 3-5 5-6" /></svg>scrawl</a>
        <nav><a href={REPO}>GitHub</a><a href="/app" className="ld-btn ld-btn-sm">Open scrawl</a></nav>
      </header>

      <main>
        <section className="ld-hero">
          <div className="ld-copy">
            <p className="ld-kicker">Sketch to UI, in your browser</p>
            <h1>Scribble an app screen. Watch it snap into a real one.</h1>
            <p className="ld-sub">Draw with your finger, an Apple Pencil or a mouse. A rectangle becomes a phone screen, a pill becomes a button, a scribble becomes a title. One tap and you get a polished screen and HTML/CSS you can paste anywhere.</p>
            <div className="ld-ctas">
              <a href="/app" className="ld-btn">Sign in with publik and draw</a>
              <a href={REPO} className="ld-btn ld-btn-ghost">Read the code</a>
            </div>
            <p className="ld-note">Free. Works on iPad, phone and laptop. Nothing to install.</p>
          </div>
          <Demo />
        </section>

        <section className="ld-how" aria-labelledby="how">
          <h2 id="how">Five shapes is the whole manual</h2>
          <ol className="ld-shapes">
            <li><svg viewBox="0 0 24 24" aria-hidden><path d="M5 3h14v18H5z" /></svg><b>Big rectangle</b><span>a screen</span></li>
            <li><svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="9" width="18" height="7" rx="3.5" /></svg><b>Pill</b><span>a button</span></li>
            <li><svg viewBox="0 0 24 24" aria-hidden><path d="M3 9c2-3 3 3 5 0s3 3 5 0 3 3 5 0 2 1 3 0" /></svg><b>Scribble up top</b><span>a title</span></li>
            <li><svg viewBox="0 0 24 24" aria-hidden><path d="M4 5h16v14H4zM4 5l16 14M20 5L4 19" /></svg><b>Box or X</b><span>an image</span></li>
            <li><svg viewBox="0 0 24 24" aria-hidden><path d="M3 12c2-2 3 2 5 0s3 2 5 0 3 2 5 0 2 1 3 0" /></svg><b>Wavy line</b><span>text</span></li>
          </ol>
          <p className="ld-small">Not sure what you drew? scrawl asks with a row of chips instead of guessing wrong. Every snap undoes back to ink.</p>
        </section>

        <section className="ld-works" aria-labelledby="works">
          <div>
            <h2 id="works">What works today</h2>
            <ul>
              <li>Pressure-aware ink with palm rejection once your Pencil touches the glass</li>
              <li>Each stroke snaps the moment you lift: screen, button, title, image, text</li>
              <li>Move, resize, rename, edit text, layers, undo and redo, eraser</li>
              <li>HTML/CSS written straight from your sketch, no AI and no key needed, with Copy and Download</li>
              <li>Make it real: a model turns the sketch into a polished screen in a live preview</li>
              <li>Your sketches save in your browser; export and import as JSON</li>
            </ul>
          </div>
          <div>
            <h2>Not yet</h2>
            <ul className="ld-dim">
              <li>Linking screens into a clickable flow</li>
              <li>SwiftUI or React output</li>
              <li>Reading the words you handwrite</li>
              <li>Pan and zoom on the board</li>
            </ul>
          </div>
        </section>

        <section className="ld-free" aria-labelledby="free">
          <h2 id="free">Free, because of publik</h2>
          <PublikPitch appName="scrawl" className="ld-pitch" />
          <p className="ld-small">For the AI step, use your publik plan or bring your own Claude or OpenAI key. The plain code needs neither.</p>
        </section>
      </main>

      <footer className="ld-foot">
        <p>scrawl is free and open source (MIT). Inspired by Aaron Aalto&rsquo;s unreleased iPad sketch-to-app demo; an independent project, not affiliated with Anthropic or with him.</p>
        <p>Built by <a href="https://x.com/forkthis_ai">fork this</a>, an AI that builds open-source apps on request.</p>
      </footer>
    </div>
  );
}
