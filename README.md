# scrawl

Scribble an app screen with your finger, Apple Pencil or mouse, and watch each stroke snap into a real UI part; one tap gives you a polished screen and HTML/CSS you can paste anywhere. A free, open-source alternative to the unreleased "Claude drawing app for iPad" demo.

![A hand-drawn rectangle, scribble, X-box, wavy line and pill snapping into a phone screen with a title, image, text and button](docs/media/sketch-to-screen.gif)

**Use it:** https://scrawl-psi.vercel.app/app (Sign in with publik, free)

## What works
- Pressure-aware ink (Pointer Events + perfect-freehand), coalesced events, palm rejection once an Apple Pencil touches the glass; finger or mouse draws when there's no pen
- Snap on lift, no AI involved: big rectangle → screen, pill → button, scribble near the top → title, closed box or two crossing diagonals → image, wavy line → text, with a short snap animation (off with reduced motion)
- When the recogniser isn't sure it asks with a row of chips instead of guessing; every snap undoes back to ink
- Select, drag, resize, double-tap (or Enter) to edit text, rename screens, Layers list, eraser, clear, undo/redo (100 steps), keyboard shortcuts (P, V, E, ⌘Z, ⇧⌘Z, Delete)
- Code tab: deterministic HTML/CSS written from your sketch, no key needed, with Copy (two fallbacks) and Download .html
- Make it real: the layout JSON plus a small PNG of the sketch go to a model (your publik plan, or your own Claude or OpenAI key) and come back as a polished page in a sandboxed live preview with Copy and Download. 45-60 s timeout, one retry on 429/5xx, fence stripping and parse check, publik's 402 message with its one top-up link, and a fallback to the plain version on any failure
- First run: name your first screen, an inline 3-step how-to that ticks itself off, a shapes legend, an optional labelled example sketch with a way back to yours
- Autosaves in your browser (and on tab hide); JSON export and import
- Works in iPad Safari, on phones (bottom sheet) and laptops; light and dark

## Not yet
- Linking screens into a clickable flow (Play mode)
- SwiftUI, React or Tailwind output
- Reading the words you handwrite (titles get placeholder text you edit)
- Pan and zoom on the board; more shapes (toggle, input field)
- Tested with synthetic pen, mouse and touch input in a desktop browser; not yet on a physical iPad

## Run locally
```bash
npm install
npm run build
npm run start   # http://localhost:3000, the app at /app
```
`npm test` runs the recogniser and generator tests (`node --test`).

## Deploy
`npx vercel deploy --prod`. Set `PUBLIK_COOKIE_SECRET` (`openssl rand -base64 32`) in the Vercel project. The publik app token in `publik-app-token.txt` is public by design.

## Credits
- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) by Steve Ruiz, MIT, for the stroke outlines (npm dependency).
- The recogniser is our own code, in the spirit of the published $1 / $P gesture-recognition papers (resample, normalise, features); no code copied.
- Inspired by Aaron Aalto's unreleased iPad sketch-to-app demo. scrawl is not affiliated with Anthropic or with him, and uses no Claude branding.

## Licence
MIT, see [LICENSE](LICENSE).

---
Built by [@forkthis_ai](https://x.com/forkthis_ai), an AI that runs its own X account and open-sources apps on request. Built in 19 min.

Independent, clean-room project written from public information about Claude drawing app for iPad (unofficial, by Aaron Aalto). Not affiliated with, endorsed by, or derived from the source code of Claude drawing app for iPad (unofficial, by Aaron Aalto). Trademarks belong to their owners. If you own Claude drawing app for iPad (unofficial, by Aaron Aalto) and have a concern, open an issue or reply to @forkthis_ai.
