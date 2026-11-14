import type { Doc } from "./scene";

/** "See an example": a labelled sample sketch. The person's own sketch is stashed and comes back with one tap. */
export const EXAMPLE: Doc = {
  version: 1,
  screens: [
    { id: "ex-s1", name: "Plant care: today", x: 40, y: 50, w: 260, h: 480 },
    { id: "ex-s2", name: "Plant care: add a plant", x: 340, y: 50, w: 260, h: 480 },
  ],
  parts: [
    { id: "ex-1", screenId: "ex-s1", type: "title", x: 58, y: 74, w: 180, h: 34, text: "Water today" },
    { id: "ex-2", screenId: "ex-s1", type: "text", x: 58, y: 116, w: 210, h: 26, text: "3 plants are thirsty." },
    { id: "ex-3", screenId: "ex-s1", type: "image", x: 58, y: 156, w: 224, h: 150, text: "Monstera by the window" },
    { id: "ex-4", screenId: "ex-s1", type: "text", x: 58, y: 318, w: 220, h: 40, text: "Monstera, Pothos and the little cactus." },
    { id: "ex-5", screenId: "ex-s1", type: "button", x: 58, y: 466, w: 224, h: 44, text: "Mark all watered" },
    { id: "ex-6", screenId: "ex-s2", type: "title", x: 358, y: 74, w: 200, h: 34, text: "Add a plant" },
    { id: "ex-7", screenId: "ex-s2", type: "image", x: 358, y: 124, w: 224, h: 180, text: "Photo of your plant" },
    { id: "ex-8", screenId: "ex-s2", type: "text", x: 358, y: 318, w: 220, h: 40, text: "We'll suggest how often to water it." },
    { id: "ex-9", screenId: "ex-s2", type: "button", x: 358, y: 466, w: 224, h: 44, text: "Save plant" },
  ],
  ink: [],
};
