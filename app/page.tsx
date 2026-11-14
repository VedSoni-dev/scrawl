import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

const DESCRIPTION =
  "Scribble an app screen with your finger, Apple Pencil or mouse. Every stroke snaps into a real UI part, then one tap gives you a polished screen and the HTML/CSS. Free and open source, in your browser.";

export const metadata: Metadata = {
  title: "scrawl: sketch an app screen, get the code",
  description: DESCRIPTION,
  openGraph: { title: "scrawl: scribble a screen, watch it snap into a real one", description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function Home() {
  return <Landing />;
}
