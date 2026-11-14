import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// Hotspots calibrated by the game's author, in 1920 x 1080 design coordinates.
export const MEDIUM_OFFICE_CONFIG = {
  sceneKey: 'MediumOfficeScene', backgroundKey: 'biuro_medium',
  backgroundUrl: 'assets/local/biuro_medium.webp', width: 1920, height: 1080,
  minimumCases: 4,
  hotspots: [
  {
    "id": "computer",
    "label": __dialogueText("config/mediumOfficeConfig.js", "t_5aa89e59cca235559ecd"),
    "action": "computer",
    "x": 744,
    "y": 606,
    "w": 230,
    "h": 190
  },
  {
    "id": "tv",
    "label": __dialogueText("config/mediumOfficeConfig.js", "t_7e7536a95dcfb769ac5b"),
    "action": "tv",
    "x": 308,
    "y": 730,
    "w": 335,
    "h": 225
  },
  {
    "id": "crime-board",
    "label": __dialogueText("config/mediumOfficeConfig.js", "t_f4c2190c4738d459c48d"),
    "action": "crimeboard",
    "x": 339,
    "y": 368,
    "w": 530,
    "h": 425
  },
  {
    "id": "case-file",
    "label": __dialogueText("config/mediumOfficeConfig.js", "t_a27af7ddb3070a665659"),
    "action": "casefile",
    "x": 1763,
    "y": 844,
    "w": 310,
    "h": 245
  },
  {
    "id": "travel",
    "label": __dialogueText("config/mediumOfficeConfig.js", "t_d2b98fb53714f23cc0aa"),
    "action": "travel",
    "x": 815,
    "y": 900,
    "w": 320,
    "h": 120
  },
  {
    "id": "telephone",
    "label": __dialogueText("config/mediumOfficeConfig.js", "t_84ecd6328b8064e6c537"),
    "action": "telephone",
    "x": 1320,
    "y": 705,
    "w": 180,
    "h": 120
  }
]
};
