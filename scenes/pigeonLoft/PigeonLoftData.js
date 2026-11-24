import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';

const W = 1280, H = 720, ORDER = [3, 2, 1];
const ASSETS = ['attic', 'cage1', 'cage2', 'cage3', 'p1', 'p1b', 'p2', 'p2b', 'p3', 'p3b',
  'food_empty', 'food_full', 'food', 'collection_cabinet'];
const LOCAL = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const P = Object.freeze({
  GOLD:0xd4af37, GOLD_DIM:0x8a6d1f, BG:0x201409, TEXT:'#f4ecd8', NAME:'#ffd86b',
  TOPIC:'#ffd86b', TOPIC_USED:'#7a7160', TOPIC_ACCENT:'#ffe9a8', LEAVE:'#d4af37',
  AMBER:'#ffc66d', RED:'#ff7a6b', GREEN:'#85d4a4'
});
const FONT = { body: __dialogueText("scenes/PigeonLoftScene.js", "t_799655b6fecfd76b85db"), pixel: __dialogueText("scenes/PigeonLoftScene.js", "t_6fbf2e36fd327aff69ef") };

// Okno na poddaszu i smuga światła (ułamki ramki obrazu) - tylko do efektów w tle
const BEAM = [[0.15, 0.62], [0.34, 0.62], [0.74, 0.99], [0.40, 0.99]];
const BEAM_CENTER = [[0.245, 0.62], [0.57, 0.99]];
const WINDOW_FLY = { x0: 0.13, x1: 0.34, y: 0.44 };

const LINES = {
  hungry: [__dialogueText("scenes/PigeonLoftScene.js", "t_4e7d01bda7555484c304"), __dialogueText("scenes/PigeonLoftScene.js", "t_b682f7d3c069631dc6a0"),
    __dialogueText("scenes/PigeonLoftScene.js", "t_c29616682d5ef1ad540e")],
  fed: [__dialogueText("scenes/PigeonLoftScene.js", "t_b231a9351e4129477ced"), __dialogueText("scenes/PigeonLoftScene.js", "t_feec45a2bb66a16e5d47"),
    __dialogueText("scenes/PigeonLoftScene.js", "t_222b30f531d377e1fe73")],
  ready: [__dialogueText("scenes/PigeonLoftScene.js", "t_0a6a9475cc21115da9c5"),
    __dialogueText("scenes/PigeonLoftScene.js", "t_a726539ab306f434022a")]
};
const pick = list => list[Math.floor(Math.random() * list.length)];
const timeText = bird => {
  const minutes = Math.max(1, Math.ceil((bird.remainingMs || 0) / 60000)), hours = Math.floor(minutes / 60);
  return hours ? `${hours}${__dialogueText("scenes/PigeonLoftScene.js", "t_17c76396f75dbc3aeb88")}${minutes % 60}${__dialogueText("scenes/PigeonLoftScene.js", "t_1f6fa6f69d185e6086d0")}` : `${minutes}${__dialogueText("scenes/PigeonLoftScene.js", "t_2e75737a6b5829744a80")}`;
};

export function choosePigeonFeedingTarget(state, selectedSlot) {
  const candidates = (state.slots || []).filter(s => s.owned &&
    (!s.bird || (s.bird.status === 'home' && !s.bird.fed)));
  return candidates.find(s => s.slot === selectedSlot) ||
    candidates.find(s => !s.bird) || candidates[0] || null;
}


function goldPlate(g, x, y, w, h, alpha = .92) {
  g.fillStyle(0x000000, .35).fillRect(x + 4, y + 5, w, h);
  g.fillStyle(P.BG, alpha).fillRect(x, y, w, h);
  g.lineStyle(3, P.GOLD, 1).strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.lineStyle(1, P.GOLD_DIM, .9).strokeRect(x + 6, y + 6, w - 12, h - 12);
}
export { W, H, ORDER, ASSETS, LOCAL, P, FONT, BEAM, BEAM_CENTER, WINDOW_FLY,
  LINES, pick, timeText, goldPlate };
