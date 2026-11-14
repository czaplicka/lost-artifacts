import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const DEAD_MAIL_ART = {
  photo: {
    key: 'dead_mail_delivery_photo',
    reference: { width: 1200, height: 620 },
    hotspots: [
      { id: 'angel', label: __dialogueText("config/deadMailArtConfig.js", "t_b3e7a7c1d3cf224466b6"), rect: [65, 48, 235, 540] },
      { id: 'plot', label: __dialogueText("config/deadMailArtConfig.js", "t_cfd8c4f41bf1a244fc24"), rect: [491, 347, 204, 181] },
      { id: 'label', label: __dialogueText("config/deadMailArtConfig.js", "t_d0c46af6734b8351b97d"), rect: [810, 512, 97, 66] }
    ],
    captions: [
      { rect: [532, 399, 120, 76], text: __dialogueText("config/deadMailArtConfig.js", "t_be3ef444e73547cab12d"), size: 10, color: '#2c3030' },
      { rect: [815, 519, 88, 50], text: __dialogueText("config/deadMailArtConfig.js", "t_402be028d1b25ecc28de"), size: 12, color: '#353126' },
      { rect: [1025, 246, 105, 48], text: __dialogueText("config/deadMailArtConfig.js", "t_402be028d1b25ecc28de"), size: 13, color: '#302b22' }
    ]
  },
  cemetery: {
    key: 'dead_mail_cemetery_day',
    reference: { width: 1920, height: 1080 },
    hotspots: [
      { id: 'marker', label: __dialogueText("config/deadMailArtConfig.js", "t_dc6adb5e23b6876152be"), rect: [778, 596, 332, 310] },
      { id: 'carton', label: __dialogueText("config/deadMailArtConfig.js", "t_06de3ccd8144de25c22f"), rect: [1304, 938, 170, 108] },
      { id: 'lock', label: __dialogueText("config/deadMailArtConfig.js", "t_819585a1ac8936fc8062"), rect: [1512, 590, 88, 147] }
    ],
    captions: [
      { rect: [850, 676, 178, 114], text: __dialogueText("config/deadMailArtConfig.js", "t_be3ef444e73547cab12d"), size: 16, color: '#272d2d' },
      { rect: [1635, 426, 172, 78], text: __dialogueText("config/deadMailArtConfig.js", "t_402be028d1b25ecc28de"), size: 22, color: '#302b22' }
    ]
  }
};

export const DEAD_MAIL_PORTRAITS = {
  florence: 'dead_mail_florence',
  admin: 'dead_mail_edwin',
  gravedigger: 'dead_mail_milo',
  florist: 'dead_mail_rose'
};

export const DEAD_MAIL_DAY_TEXTURES = [
  'dead_mail_delivery_photo', 'dead_mail_cemetery_day',
  'dead_mail_administration', ...Object.values(DEAD_MAIL_PORTRAITS)
];

export function containRect(sourceWidth, sourceHeight, box) {
  if (!(sourceWidth > 0 && sourceHeight > 0 && box.width > 0 && box.height > 0)) {
    throw new Error('Invalid image or viewport dimensions.');
  }
  const scale = Math.min(box.width / sourceWidth, box.height / sourceHeight);
  return {
    x: box.x + (box.width - sourceWidth * scale) / 2,
    y: box.y + (box.height - sourceHeight * scale) / 2,
    width: sourceWidth * scale,
    height: sourceHeight * scale
  };
}

export function referenceRect(rect, reference, displayed) {
  return {
    x: displayed.x + rect[0] / reference.width * displayed.width,
    y: displayed.y + rect[1] / reference.height * displayed.height,
    width: rect[2] / reference.width * displayed.width,
    height: rect[3] / reference.height * displayed.height
  };
}
