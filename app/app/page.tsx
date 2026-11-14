import Scrawl from "@/components/Scrawl";
import { PublikGate } from "@/components/PublikGate";
import "./app.css";

// The software lives here, behind Sign in with publik. The landing page at / is public.
export const metadata = { title: "scrawl · sketch it, snap it, ship the code" };

export default function AppPage() {
  return (
    <PublikGate appName="scrawl" tagline="Scribble an app screen. Every stroke snaps into a real UI part, then one tap gives you the code." preview="/gate-preview.mp4">
      <Scrawl />
    </PublikGate>
  );
}
