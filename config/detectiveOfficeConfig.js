import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// config/detectiveOfficeConfig.js

export const OFFICE_CONFIG = {
  backgroundKey: 'pi_office_bg',
  backgroundUrl: 'assets/local/pioffice.webp',

  officeLabel: __dialogueText("config/detectiveOfficeConfig.js", "t_f99419d296900dce0711"),

  citySceneKey: 'HomeCityScene',

  hotspots: [
  {
    "id": "computer",
    "label": __dialogueText("config/detectiveOfficeConfig.js", "t_76ed42d22129dc354362"),
    "x": 1582,
    "y": 851,
    "w": 420,
    "h": 435,
    "action": "computer"
  },
  {
    "id": "phone",
    "label": __dialogueText("config/detectiveOfficeConfig.js", "t_63dceb8800b2dd4af956"),
    "x": 427,
    "y": 913,
    "w": 360,
    "h": 250,
    "action": "phone"
  },
  {
    "id": "city-door",
    "label": __dialogueText("config/detectiveOfficeConfig.js", "t_a702c0a54c9e904b9a09"),
    "x": 993,
    "y": 479,
    "w": 555,
    "h": 590,
    "action": "city"
  }
],

  newsTicker: {
    y: 0,
    height: 44,
    speed: 90,

    headlines: [
      __dialogueText("config/detectiveOfficeConfig.js", "t_af3a0611e79515f8434f"),
      __dialogueText("config/detectiveOfficeConfig.js", "t_d01575eb29d08f8fbba0"),
      __dialogueText("config/detectiveOfficeConfig.js", "t_c61fe76f29be8f1ef398"),
      __dialogueText("config/detectiveOfficeConfig.js", "t_115d205a868f4858244b")
    ]
  }
};