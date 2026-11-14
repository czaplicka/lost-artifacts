import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const HOTEL_CONFIG = {
  cheap: {
    id: 'cheap',
    optionId: 'boardingHouse',
    label: __dialogueText("config/hotelConfig.js", "t_e5e4eb483860d3309402"),
    tierLabel: 'BUDGET',
    backgroundKey: 'hotel_poor',
    recoveryMultiplier: 0.8,
    description: __dialogueText("config/hotelConfig.js", "t_3c6b872c556fbf8e4eb7"),
    hotspots: [
      { id: 'bed', x: 0.31, y: 0.47, w: 0.45, h: 0.39 },
      { id: 'hotel-tv', x: 0.83, y: 0.31, w: 0.17, h: 0.28 },
      { id: 'hotel-desk', x: 0, y: 0.69, w: 0.28, h: 0.29 },
      { id: 'hotel-window-exit', x: 0.08, y: 0.19, w: 0.20, h: 0.34 }
    ]
  },

  medium: {
    id: 'medium',
    optionId: 'business',
    label: __dialogueText("config/hotelConfig.js", "t_1b395b6978229e18be92"),
    tierLabel: 'STANDARD',
    backgroundKey: 'hotel',
    recoveryMultiplier: 1,
    description: __dialogueText("config/hotelConfig.js", "t_782830b0f00d965fab48"),
    hotspots: [
      { id: 'bed', x: 0.31, y: 0.47, w: 0.45, h: 0.39 },
      { id: 'hotel-tv', x: 0.83, y: 0.31, w: 0.17, h: 0.28 },
      { id: 'hotel-desk', x: 0, y: 0.69, w: 0.28, h: 0.29 },
      { id: 'hotel-window-exit', x: 0.08, y: 0.19, w: 0.20, h: 0.34 }
    ]
  },

  expensive: {
    id: 'expensive',
    optionId: 'grand',
    label: __dialogueText("config/hotelConfig.js", "t_8e554225eb7de620c83c"),
    tierLabel: 'LUXURY',
    backgroundKey: 'hotel_lux',
    recoveryMultiplier: 1.3,
    description: __dialogueText("config/hotelConfig.js", "t_92b80a74308e2cf14cb9"),
    hotspots: [
      { id: 'bed', x: 0.31, y: 0.47, w: 0.45, h: 0.39 },
      { id: 'hotel-tv', x: 0.83, y: 0.31, w: 0.17, h: 0.28 },
      { id: 'hotel-desk', x: 0, y: 0.69, w: 0.28, h: 0.29 },
      { id: 'hotel-window-exit', x: 0.08, y: 0.19, w: 0.20, h: 0.34 }
    ]
  }
};