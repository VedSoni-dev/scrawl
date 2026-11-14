"use client";
// The public front door at /: a sketch-to-code canvas. Built with the taste skill's kit (public/assets, loaded
// only here) and the dealt palette; the plan is .taste-skill/plan.md.
// type: software (site-kind software)
// deal: hero collage, nav nav-centre (dealt nav-cards needs photographs scrawl does not have; re-dealt without it),
//       close close-type, footer footer-statement, rhythm dark-band (#film on .ground-inverse), buttons solid,
//       scrawl's own mark (the squiggle), lit ground sky, radius sharp (a developer tool),
//       palette blue-black-cornflower, type epilogue, no effect (the sketch drawing itself is the hero's one moving thing)
// moments: pinned-chapters in #shapes
// This component holds no state, so React never redraws the static markup the kit's scripts move around
// (pinned-chapters re-parents its figures). The live parts keep their own state.
import { useEffect, useState } from "react";
import { PublikPitch } from "@/components/PublikGate";
import { HeroWindow, HeroCard, FilmFrame, StepScreen, StepParts, StepReal, CodeFragment, AiFragment, LegendFragment, Mark } from "./Pieces";

const REPO = "https://github.com/VedSoni-dev/scrawl";
const KIT_CSS = ["system.css", "ui/cards.css", "ui/base.css", "motion/motion.css", "backgrounds/backgrounds.css", "layout/layout.css", "moments/pinned-chapters/moment.css"];
const KIT_JS = ["system.js", "motion/motion.js", "layout/layout.js", "moments/moments.js"];
const HTML_ATTRS = `(function(){var d=document.documentElement;d.setAttribute('data-type','software');d.setAttribute('data-radius','sharp');d.setAttribute('data-ground','sky');d.setAttribute('data-buttons','solid');d.setAttribute('data-motion','');d.classList.add('m-enter','mo-js');setTimeout(function(){d.classList.add('m-enter-done')},700);setTimeout(function(){d.classList.add('mo-safe')},2500)})();`;

const ARROW = (
  <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path className="m-arrow__stem" d="M1 6h8" /><path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" /></svg>
);

function PublikPending() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    fetch("/api/publik/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setPending(j?.state === "pending")).catch(() => {});
  }, []);
  if (!pending) return null;
  return <p className="lp-pending">scrawl is coming to publik (publik caps new listings each week). Until its listing is up, scrawl is open to everyone with no sign-in, and Make it real runs on your own key.</p>;
}

export function Landing() {
  useEffect(() => {
    for (const f of KIT_JS) {
      const src = `/assets/${f}`;
      if (document.querySelector(`script[src="${src}"]`)) continue;
      const s = document.createElement("script");
      s.type = "module";
      s.src = src;
      document.body.append(s);
    }
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HTML_ATTRS }} />
      {KIT_CSS.map((f) => (
        <link key={f} rel="stylesheet" href={`/assets/${f}`} precedence="taste-kit" />
      ))}
      <link rel="stylesheet" href="/assets/landing.css" precedence="taste-page" />

      <header className="nav nav--centre">
        <div className="wrap nav__bar">
          <a className="skip-link" href="#top">Skip to content</a>
          <a className="nav__logo" href="#top"><span className="lp-mark"><Mark size={22} /></span>scrawl</a>
          <nav className="nav__links" aria-label="Main">
            <div className="nav__item"><a className="nav__link" href="#film">Demo</a></div>
            <div className="nav__item"><a className="nav__link" href="#shapes">Shapes</a></div>
            <div className="nav__item"><a className="nav__link" href="#code">Code</a></div>
            <div className="nav__item"><a className="nav__link" href="#questions">Questions</a></div>
          </nav>
          <div className="nav__actions">
            <a className="btn btn--primary" href="/app">Start drawing</a>
          </div>
          <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>

      <main id="top">
        {/* HERO: collage. The words left; scrawl's window on the lit sky frame right, the Code card over it. */}
        <section className="hero hero--collage" data-enter aria-labelledby="hero-h">
          <div className="wrap"><div className="hero-text grid hero__grid">
            <div className="hero__text span-5">
              <h1 id="hero-h">Sketch-to-code for iPad, phone and laptop</h1>
              <p className="hero__lead">Draw a rough app screen with a finger, an Apple Pencil or a mouse. Each stroke snaps into a real part, and one tap gives you the HTML and CSS.</p>
              <div className="btn-row">
                <a className="btn btn--primary" href="/app">Start drawing{ARROW}</a>
                <a className="btn btn--secondary" href={REPO}>Read the source</a>
              </div>
              <p className="hero__proof">Runs in iPad Safari today. Free and MIT licensed, nothing to install.</p>
            </div>
            <div className="hero__art span-6 start-7">
              <HeroWindow />
              <HeroCard />
            </div>
          </div></div>
        </section>

        {/* FILM: the dark-band. A real recording of the app, on the inverse ground. */}
        <section className="section ground-inverse" id="film" aria-labelledby="film-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-5">
                <h2 id="film-h">One sketch in scrawl, start to finish</h2>
                <p className="t-lead">A box, a scribble, an X, a wave and a pill become a screen, its layers and its code in ten seconds.</p>
                <p>No AI in this recording: the plain version comes straight from the sketch. <a className="link" href="/app">Draw your own screen</a></p>
              </div>
              <div className="frame frame--lit lp-panel lp-panel--film span-6 start-7"><FilmFrame /></div>
            </div>
          </div>
        </section>

        {/* SHAPES: pinned-chapters (references/moments.md). Two screens; three steps, one picture each. */}
        <section className="section" id="shapes" style={{ "--h": 2 } as React.CSSProperties} data-moment="pinned-chapters" aria-labelledby="shapes-h">
          <div className="wrap mo-pc__grid">
            <div className="mo-pc__text">
              <h2 id="shapes-h">Five shapes make a whole app screen</h2>
              <ol className="mo-pc__steps">
                <li className="mo-pc__step">
                  <h3>A big box in your sketch becomes a screen</h3>
                  <p>Draw any rough rectangle taller than it is wide. It snaps into a phone frame you can name.</p>
                  <figure className="mo-pc__visual mo-pc__visual--lit"><StepScreen /></figure>
                </li>
                <li className="mo-pc__step">
                  <h3>Four strokes in a sketch: button, title, image, text</h3>
                  <p>Inside the screen they become a button, a title, an image and body text. An unclear stroke asks with a row of chips.</p>
                  <figure className="mo-pc__visual mo-pc__visual--lit"><StepParts /></figure>
                </li>
                <li className="mo-pc__step">
                  <h3>Make it real: your sketch as a finished screen</h3>
                  <p>The layout and a small picture of your sketch go to the model. The result opens in a live preview with Copy and Download.</p>
                  <figure className="mo-pc__visual mo-pc__visual--lit"><StepReal /></figure>
                </li>
              </ol>
            </div>
            <div className="mo-pc__visuals frame"></div>
          </div>
        </section>

        {/* CODE: split-text-left, the Code tab as one panel on the lit ground */}
        <section className="section" id="code" aria-labelledby="code-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-5">
                <h2 id="code-h">HTML and CSS from your sketch, with no key</h2>
                <p className="t-lead">The Code tab writes plain markup from the parts you drew while you draw them. Copy it, or download one .html file.</p>
                <ul className="rows">
                  <li><span className="rows__name">No AI needed</span><p>The code comes from the layout, so it works offline after the page loads.</p></li>
                  <li><span className="rows__name">Your words</span><p>Double-tap a part to change its text. The code follows.</p></li>
                  <li><span className="rows__name">One file</span><p>Styles sit in the page, ready to paste into any project.</p></li>
                </ul>
              </div>
              <div className="frame frame--lit lp-panel span-6 start-7"><CodeFragment /></div>
            </div>
          </div>
        </section>

        {/* STATUS: what works and what doesn't, said plainly; the app's own Shapes card on its board as the picture */}
        <section className="section" id="status" aria-labelledby="status-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-5">
                <h2 id="status-h">What the sketch app does today</h2>
                <p className="t-lead">Inspired by an iPad demo people asked to download. That one isn&apos;t out, and scrawl is a link.</p>
                <ul className="rows">
                  <li><span className="rows__name">Ink</span><p>Pressure-aware, with palm rejection once a Pencil touches.</p></li>
                  <li><span className="rows__name">Snap</span><p>A screen, button, title, image or text the moment you lift.</p></li>
                  <li><span className="rows__name">Edit</span><p>Move, resize, retype, layers, undo, redo and an eraser.</p></li>
                  <li><span className="rows__name">Code</span><p>HTML and CSS from the sketch, with Copy and Download.</p></li>
                  <li><span className="rows__name">Save</span><p>Kept in your browser, with JSON export and import.</p></li>
                  <li><span className="rows__name">Not yet</span><p>Linked screens, SwiftUI or React, handwriting, zoom.</p></li>
                </ul>
              </div>
              <div className="lp-board span-6 start-7"><LegendFragment /></div>
            </div>
          </div>
        </section>

        {/* QUESTIONS: every answer open; the publik pitch and the key panel beside them */}
        <section className="section" id="questions" aria-labelledby="questions-h">
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-5">
                <h2 id="questions-h">Questions</h2>
                <PublikPitch appName="scrawl" className="lp-pitch" />
                <PublikPending />
                <AiFragment />
              </div>
              <div className="faq span-6 start-7">
                <div className="faq__item">
                  <h3>Is this the iPad app from the video?</h3>
                  <p>No. That one is Aaron Aalto&apos;s demo, and it isn&apos;t released. scrawl is an independent web app with its own design, inspired by it.</p>
                </div>
                <div className="faq__item">
                  <h3>Do I need an AI key for the app?</h3>
                  <p>Not to draw or to get code. Make it real runs on your publik account, or on your own Claude or OpenAI key.</p>
                </div>
                <div className="faq__item">
                  <h3>Which devices run the app?</h3>
                  <p>An iPad with a Pencil or a finger, a phone, or a laptop with a mouse or trackpad. Safari, Chrome and Edge.</p>
                </div>
                <div className="faq__item">
                  <h3>Where do my sketches go?</h3>
                  <p>They stay in this browser. Make it real sends the layout and a small picture of the sketch, and nothing is kept on a server.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer closing footer--statement" id="contact" aria-labelledby="close-h">
        <div className="wrap">
          <div className="closing__cta close--type">
            <div className="section-head">
              <h2 id="close-h">Draw the screen, then copy the code</h2>
              <p>Free and MIT licensed. Sign in with a free publik account and start sketching.</p>
            </div>
            <a className="btn btn--primary btn--xl btn--wide" href="/app">Start drawing{ARROW}</a>
          </div>
          <div className="closing__links">
            <div className="grid">
              <div className="span-4 stack-4">
                <a className="nav__logo" href="#top"><span className="lp-mark"><Mark size={22} /></span>scrawl</a>
                <p className="footer__lede">Scribble an app screen and get the code, in a browser tab.</p>
              </div>
              <div className="span-2 footer__col">
                <h3>scrawl</h3>
                <ul>
                  <li><a href="#film">Demo</a></li>
                  <li><a href="#shapes">Shapes</a></li>
                  <li><a href="#code">Code</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Help</h3>
                <ul>
                  <li><a href="#questions">Questions</a></li>
                  <li><a href={`${REPO}/issues`}>Issues</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>Code</h3>
                <ul>
                  <li><a href={REPO}>Read the source</a></li>
                  <li><a href={`${REPO}/blob/main/LICENSE`}>MIT licence</a></li>
                </ul>
              </div>
              <div className="span-2 footer__col">
                <h3>More</h3>
                <ul>
                  <li><a href="https://publikhq.com">publik</a></li>
                  <li><a href="https://x.com/forkthis_ai">@forkthis_ai</a></li>
                </ul>
              </div>
            </div>
            <div className="footer__legal">
              <span>&copy; 2026 scrawl. Not affiliated with Anthropic or with Aaron Aalto.</span>
              <div className="socials" />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
