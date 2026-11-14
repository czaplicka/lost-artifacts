import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const FONT_TEXT = 'SpecialElite';
export const FONT_PIXEL = 'PressStart2P';

export const STRING_COLORS = {
  neutral: 0xd9c9a0,
  green: 0x44d66a,
  yellow: 0xf1c232,
  red: 0xe06666
};

export const PIN_COLORS = [0xb22222, 0x2f5d8a, 0xd4a017, 0x2f7f4a, 0x7a3b8a, 0xc2581a];

export const SLOT_COLORS = {
  neutral: { fill: 0x241c16, stroke: 0xc8a75a, text: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_036cede2ae9c024c31c5") },
  selected: { fill: 0x3a3017, stroke: 0xffd966, text: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_0f70fe929fcbefaef9ee") },
  green: { fill: 0x193019, stroke: 0x44d66a, text: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_5e52b6562b0b24ff7fe2") },
  yellow: { fill: 0x3d3216, stroke: 0xf1c232, text: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_0f70fe929fcbefaef9ee") },
  red: { fill: 0x3a1d1d, stroke: 0xe06666, text: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_0f70fe929fcbefaef9ee") }
};

export const LEGEND_ITEMS = [
  { color: 0x44d66a, label: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_15a596e3c98c407e0437") },
  { color: 0xf1c232, label: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_1324f4071205360125a8") },
  { color: 0xe06666, label: __dialogueText("ui/hypothesisBoard/BoardConstants.js", "t_b9932238806753f38650") }
];

// Deterministyczny PRNG: korek i przechył kartek wyglądają tak samo po każdym resize.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
