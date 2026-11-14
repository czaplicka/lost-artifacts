import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const PIGEON_CONFIG = Object.freeze({
  flightMs: 2 * 60 * 60 * 1000,
  feedId: 'pigeon_feed', firstName: __dialogueText("config/pigeonConfig.js", "t_4d7b2cc54157ab5d6d89"), maxNameLength: 24,
  maxPigeons: 3, extraPerchPrices: [40, 80]
});

// Weights total 100: 40 junk, 40 collection, 20 usable/inventory finds.
// Existing find IDs are retained so saved flights remain readable.
export const PIGEON_FINDS = [
  { id: 'bent_paperclip', kind: 'junk', name: __dialogueText("config/pigeonConfig.js", "t_cbf54d2a5b5fed15836e"), weight: 18,
    description: __dialogueText("config/pigeonConfig.js", "t_5ba935700f539c49911a") },
  { id: 'lonely_pasta', kind: 'junk', name: __dialogueText("config/pigeonConfig.js", "t_eeb19c9c47414dad1114"), weight: 12,
    description: __dialogueText("config/pigeonConfig.js", "t_e6f74a3ff4beeb2dd58b") },
  { id: 'olive_receipt', kind: 'junk', name: __dialogueText("config/pigeonConfig.js", "t_4680c0a5d4f3806a9f11"), weight: 10,
    description: __dialogueText("config/pigeonConfig.js", "t_b4e966855ac7c3f586f9") },
  { id: 'cap_fizz', kind: 'collection', set: 'caps', name: __dialogueText("config/pigeonConfig.js", "t_ad101aaf9008e6755441"), weight: 12,
    description: __dialogueText("config/pigeonConfig.js", "t_d1d4892d467a1443a777") },
  { id: 'cap_coo', kind: 'collection', set: 'caps', name: __dialogueText("config/pigeonConfig.js", "t_8bc88f9e9df4df8435bc"), weight: 8,
    description: __dialogueText("config/pigeonConfig.js", "t_f3f1df1836cce6700022") },
  { id: 'cap_noir', kind: 'collection', set: 'caps', name: __dialogueText("config/pigeonConfig.js", "t_f8730c8414609a5f1bdf"), weight: 7,
    description: __dialogueText("config/pigeonConfig.js", "t_06003d1d83e65cb3b841") },
  { id: 'button_gold', kind: 'collection', set: 'buttons', name: __dialogueText("config/pigeonConfig.js", "t_ccb02b5ccb3146742503"), weight: 5,
    description: __dialogueText("config/pigeonConfig.js", "t_1c9e1eb0d26fc31104d8") },
  { id: 'button_blue', kind: 'collection', set: 'buttons', name: __dialogueText("config/pigeonConfig.js", "t_754b572227ddd44a0e87"), weight: 4,
    description: __dialogueText("config/pigeonConfig.js", "t_88e579ee70947657a76b") },
  { id: 'button_anchor', kind: 'collection', set: 'buttons', name: __dialogueText("config/pigeonConfig.js", "t_2bf6912de89970886242"), weight: 4,
    description: __dialogueText("config/pigeonConfig.js", "t_f399175b0467ae9ac909") },
  { id: 'cookie', kind: 'usable', name: __dialogueText("config/pigeonConfig.js", "t_64e5cc5b7b76eaa4450c"), weight: 6,
    description: __dialogueText("config/pigeonConfig.js", "t_13260689e1ddc0ad5182"),
    item: { id: 'pigeon_cookie', name: __dialogueText("config/pigeonConfig.js", "t_64e5cc5b7b76eaa4450c"), icon: '🍪', type: 'item', stackable: true,
      description: __dialogueText("config/pigeonConfig.js", "t_6ef80870e2e56820f08f"),
      metadata: { consumable: true, effect: { energy: 5 },
        useMessage: __dialogueText("config/pigeonConfig.js", "t_a06615d130e852f89ac2") } } },
  { id: 'postcard', kind: 'usable', name: __dialogueText("config/pigeonConfig.js", "t_01291723057c97f05859"), weight: 5,
    description: __dialogueText("config/pigeonConfig.js", "t_d8fd65d78791bc0165fd"), catalogRef: __dialogueText("config/pigeonConfig.js", "t_77b137edca3b3f77daf1") },
  { id: 'pigeon_energy_drink', kind: 'usable', name: __dialogueText("config/pigeonConfig.js", "t_31adc9243b8bc59d26ae"), weight: 3,
    description: __dialogueText("config/pigeonConfig.js", "t_28c979e6242cd77b00a9"), catalogRef: __dialogueText("config/pigeonConfig.js", "t_118f7d5a299aac4fe4eb") },
  { id: 'pigeon_sandwich', kind: 'usable', name: __dialogueText("config/pigeonConfig.js", "t_ba0d0a429396a6ca6fe2"), weight: 3,
    description: __dialogueText("config/pigeonConfig.js", "t_542adbfc319e4cc54292"), catalogRef: __dialogueText("config/pigeonConfig.js", "t_600d11f87c435e5585c2") },
  { id: 'pigeon_lucky_cat', kind: 'usable', name: __dialogueText("config/pigeonConfig.js", "t_b48e6afc7713cb9e6b2e"), weight: 2,
    description: __dialogueText("config/pigeonConfig.js", "t_44c8962e80c5dc5861a4"), catalogRef: __dialogueText("config/pigeonConfig.js", "t_fb1d71ee5a712b63d6b3") },
  { id: 'pigeon_truck_keychain', kind: 'usable', name: __dialogueText("config/pigeonConfig.js", "t_346f9aeebad0c128a809"), weight: 1,
    description: __dialogueText("config/pigeonConfig.js", "t_08c88aa496c024365e05"), catalogRef: __dialogueText("config/pigeonConfig.js", "t_d6e969fbdb60835e2d1e") }
];

export const PIGEON_COLLECTIONS = [
  { id: 'caps', name: __dialogueText("config/pigeonConfig.js", "t_1d19919f70c463a8b546"), ids: ['cap_fizz', 'cap_coo', 'cap_noir'] },
  { id: 'buttons', name: __dialogueText("config/pigeonConfig.js", "t_577d5da57d6fb394deb6"), ids: ['button_gold', 'button_blue', 'button_anchor'] }
];
