const C = {
  ink: 0x1b2530, cream: 0xf4efd8, gold: 0xd4af37, brass: 0x8a6d1a,
  blue: 0x294b70, lightBlue: 0x4a79b0, red: 0xa23232,
  gray: 0x8d8b80, silver: 0xc8c5b9, wood: 0x6b4a2b,
  tan: 0xc9a66b, green: 0x4f8a5a, darkGreen: 0x315539
};

const LEGACY = {
  office_assistant: 'assistant',
  office_employee: 'investigator',
  office_case_files: 'files',
  office_printer: 'printer'
};

export function drawOfficeShopCatalogArt(shop, item, box, { feed = false } = {}) {
  const pixel = Math.max(1, Math.floor(Math.min(box.w - 12, box.h - 12) / 16));
  const size = pixel * 16;
  const bounds = {
    x: Math.round(box.x + (box.w - size) / 2),
    y: Math.round(box.y + (box.h - size) / 2),
    w: size,
    h: size
  };
  const legacy = feed ? 'feed' : LEGACY[item.id];
  if (legacy && typeof shop.sprite === 'function' &&
      shop.sprite(legacy, bounds.x, bounds.y, pixel)) return bounds;

  const g = shop.gfx();
  const rect = (x, y, w, h, color) => {
    g.fillStyle(C[color] ?? color, 1);
    g.fillRect(bounds.x + x * pixel, bounds.y + y * pixel, w * pixel, h * pixel);
  };
  const line = (x1, y1, x2, y2, color) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let step = 0; step <= steps; step++) {
      const ratio = steps ? step / steps : 0;
      rect(Math.round(x1 + (x2 - x1) * ratio), Math.round(y1 + (y2 - y1) * ratio), 1, 1, color);
    }
  };
  const parcel = () => {
    rect(2, 4, 12, 10, 'ink'); rect(3, 5, 10, 8, 'tan');
    rect(7, 5, 2, 8, 'gold'); rect(3, 8, 10, 1, 'wood');
    rect(4, 6, 2, 1, 'cream');
  };

  switch (item.id) {
    case 'office_new_premises':
      rect(2, 2, 12, 12, 'ink'); rect(3, 3, 10, 10, 'tan');
      rect(1, 1, 14, 2, 'brass'); rect(1, 14, 14, 1, 'gold');
      for (const x of [4, 9]) {
        rect(x, 4, 3, 3, 'blue'); rect(x, 8, 3, 3, 'blue');
        rect(x, 4, 1, 2, 'lightBlue');
      }
      rect(7, 10, 2, 4, 'ink'); rect(8, 12, 1, 1, 'gold');
      break;
    case 'office_notepad':
      rect(3, 1, 10, 14, 'ink'); rect(4, 2, 8, 12, 'red');
      rect(5, 2, 1, 12, 'brass'); rect(7, 4, 4, 3, 'cream');
      rect(7, 5, 3, 1, 'gray'); rect(11, 10, 2, 1, 'gold');
      line(13, 3, 8, 13, 'gold'); line(14, 3, 9, 13, 'tan');
      break;
    case 'office_crime_board':
      rect(1, 2, 14, 12, 'wood'); rect(2, 3, 12, 10, 'tan');
      line(4, 5, 11, 10, 'red'); line(4, 10, 11, 5, 'red');
      rect(3, 4, 4, 3, 'cream'); rect(9, 4, 4, 3, 'cream');
      rect(3, 9, 4, 3, 'cream'); rect(9, 9, 4, 3, 'cream');
      for (const x of [4, 10]) for (const y of [4, 9]) rect(x, y, 1, 1, 'red');
      break;
    case 'office_coffee':
      rect(3, 2, 10, 12, 'ink'); rect(4, 3, 8, 10, 'silver');
      rect(5, 4, 5, 2, 'blue'); rect(11, 4, 1, 1, 'green');
      rect(5, 7, 6, 5, 'ink'); rect(6, 9, 4, 3, 'cream');
      rect(10, 9, 1, 2, 'cream'); rect(7, 9, 2, 1, 'wood');
      rect(2, 14, 12, 1, 'brass');
      break;
    case 'office_tv':
      line(5, 0, 8, 3, 'silver'); line(11, 0, 8, 3, 'silver');
      rect(1, 3, 14, 10, 'ink'); rect(2, 4, 12, 8, 'wood');
      rect(3, 5, 8, 6, 'lightBlue'); rect(4, 6, 6, 3, 'blue');
      rect(12, 6, 1, 1, 'gold'); rect(12, 9, 1, 1, 'silver');
      rect(3, 13, 2, 2, 'ink'); rect(11, 13, 2, 2, 'ink');
      break;
    case 'office_books':
      rect(1, 13, 14, 2, 'wood');
      for (const [x, y, color] of [[2, 3, 'red'], [5, 2, 'blue'], [8, 4, 'green'], [11, 3, 'brass']]) {
        rect(x, y, 3, 13 - y, 'ink'); rect(x + 1, y + 1, 1, 11 - y, color);
        rect(x + 1, y + 3, 1, 1, 'gold'); rect(x + 1, 10, 1, 1, 'cream');
      }
      break;
    case 'office_chairs':
      for (const x of [1, 9]) {
        rect(x + 1, 2, 5, 7, 'ink'); rect(x + 2, 3, 3, 5, 'red');
        rect(x, 9, 7, 3, 'ink'); rect(x + 1, 9, 5, 2, 'red');
        rect(x + 1, 12, 1, 3, 'wood'); rect(x + 5, 12, 1, 3, 'wood');
      }
      break;
    case 'office_painting':
      rect(1, 2, 14, 12, 'brass'); rect(2, 3, 12, 10, 'gold');
      rect(3, 4, 10, 8, 'blue'); rect(10, 5, 2, 2, 'cream');
      for (let n = 0; n < 5; n++) rect(4 + n, 10 - n, 1, 2 + n, 'green');
      for (let n = 0; n < 4; n++) rect(9 + n, 8 + n, 1, 4 - n, 'darkGreen');
      break;
    case 'office_artifact':
      rect(6, 1, 4, 2, 'gold'); rect(7, 3, 2, 2, 'tan');
      rect(4, 5, 8, 6, 'brass'); rect(5, 5, 6, 7, 'gold');
      rect(6, 6, 1, 4, 'cream'); rect(3, 5, 1, 4, 'gold');
      rect(12, 5, 1, 4, 'gold'); rect(6, 12, 4, 1, 'brass');
      rect(3, 13, 10, 2, 'silver');
      break;
    case 'office_case_files':
      rect(3, 1, 10, 14, 'ink'); rect(4, 2, 8, 12, 'gray');
      for (const y of [3, 7, 11]) { rect(5, y, 6, 2, 'silver'); rect(7, y, 2, 1, 'gold'); }
      break;
    case 'office_printer':
      rect(4, 1, 8, 5, 'cream'); rect(2, 5, 12, 8, 'ink');
      rect(3, 6, 10, 5, 'silver'); rect(11, 7, 1, 1, 'green');
      rect(4, 10, 8, 5, 'cream'); rect(5, 12, 6, 1, 'gray');
      break;
    default:
      parcel();
      break;
  }
  return bounds;
}
