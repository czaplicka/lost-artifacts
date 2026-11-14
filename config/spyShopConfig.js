import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// config/spyShopConfig.js
export const SPY_SHOP_CONFIG = {
  // Set this to the actual image path when your background is ready.
  // Example: backgroundUrl: 'assets/local/spyshop.webp',
backgroundUrl: 'assets/local/spyshop.webp',
backgroundKey: 'pi_spy_shop_background',
  title: __dialogueText("config/spyShopConfig.js", "t_bd13b027fbf8aaa338f2"),
  subtitle: __dialogueText("config/spyShopConfig.js", "t_adb199521c4805eb9695"),
  // Normalised coordinates: x/y are the centre; w/h are width and height.
hotspots: [
  {
    "id": "exit",
    "label": __dialogueText("config/spyShopConfig.js", "t_d17d84a604994b722db3"),
    "action": "exit",
    "x": 0.12567708333333333,
    "y": 0.5895370370370371,
    "w": 0.20604166666666657,
    "h": 0.8212962962962971
  },
  {
    "id": "shopkeeper",
    "label": __dialogueText("config/spyShopConfig.js", "t_750db8444cd74ad2d575"),
    "action": "talk",
    "x": 0.5158072916666666,
    "y": 0.5831944444444443,
    "w": 0.22,
    "h": 0.42
  },
  {
    "id": "equipment",
    "label": __dialogueText("config/spyShopConfig.js", "t_267753ad0e5d6f7a3410"),
    "action": "browse",
    "x": 0.8533854166666667,
    "y": 0.6235185185185185,
    "w": 0.29,
    "h": 0.65
  }
],

  products: [
    { category: 'equipment', key: 'camera' },
    { category: 'equipment', key: 'mobilePhone' },
    { category: 'oddities', key: 'rubberDuck' },
    { category: 'equipment', key: 'coolSpyGadget' },
    { category: 'misc', key: 'piBadge' },
    { category: 'documents', key: 'detectiveMonthly' }
  ],
  dialogue: [
    { question: __dialogueText("config/spyShopConfig.js", "t_44bde37db8317c6321f3"), answer: __dialogueText("config/spyShopConfig.js", "t_e3fbd849059c2ae5d23e") },
    { question: __dialogueText("config/spyShopConfig.js", "t_b4ca0d0e282984171beb"), answer: __dialogueText("config/spyShopConfig.js", "t_7fb7b0a4b2cee099e5d8") },
    { question: __dialogueText("config/spyShopConfig.js", "t_73a8707a9c0ac09d9265"), answer: __dialogueText("config/spyShopConfig.js", "t_b2cd308b52dd6ec86d2d") },
    { question: __dialogueText("config/spyShopConfig.js", "t_bd3ad7228faae83a20cc"), answer: __dialogueText("config/spyShopConfig.js", "t_96b8afe3139067bfb142") }
  ]
};
