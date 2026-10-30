export const DEAD_MAIL_ART = {
  photo: {
    key: 'dead_mail_delivery_photo',
    reference: { width: 1200, height: 620 },
    hotspots: [
      { id: 'angel', label: 'Damaged angel', rect: [65, 48, 235, 540] },
      { id: 'plot', label: 'Temporary marker', rect: [491, 347, 204, 181] },
      { id: 'label', label: 'Shipping label', rect: [810, 512, 97, 66] }
    ],
    captions: [
      { rect: [532, 399, 120, 76], text: 'FLORENCE FINCH\nPLOT 114\nDEATH: TOMORROW', size: 10, color: '#2c3030' },
      { rect: [815, 519, 88, 50], text: 'SERVICE\nGATE B', size: 12, color: '#353126' },
      { rect: [1025, 246, 105, 48], text: 'SERVICE\nGATE B', size: 13, color: '#302b22' }
    ]
  },
  cemetery: {
    key: 'dead_mail_cemetery_day',
    reference: { width: 1920, height: 1080 },
    hotspots: [
      { id: 'marker', label: 'Inspect marker and soil', rect: [778, 596, 332, 310] },
      { id: 'carton', label: 'Examine discarded carton', rect: [1304, 938, 170, 108] },
      { id: 'lock', label: 'Inspect gate lock', rect: [1512, 590, 88, 147] }
    ],
    captions: [
      { rect: [850, 676, 178, 114], text: 'FLORENCE FINCH\nPLOT 114\nDEATH: TOMORROW', size: 16, color: '#272d2d' },
      { rect: [1635, 426, 172, 78], text: 'SERVICE\nGATE B', size: 22, color: '#302b22' }
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
