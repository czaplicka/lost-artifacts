// Icons use local 32 x 32 coordinates. No external textures or fonts.
export function createArchiveIcon(scene, key, x, y, scale = 1.25) {
  const g = scene.add.graphics({ x, y });
  g.setScale(scale);
  const ink = 0x4d453b, paper = 0xf2e5c6, blue = 0x527d89;
  const gold = 0xb58a35, red = 0x9b5148, green = 0x648069;
  const rect = (x, y, w, h, color = ink) => { g.fillStyle(color, 1); g.fillRect(x, y, w, h); };
  const line = (x1, y1, x2, y2, color = ink, width = 2) => {
    g.lineStyle(width, color, 1); g.lineBetween(x1, y1, x2, y2);
  };
  switch (key) {
    case 'receipt':
      rect(5, 2, 22, 28); rect(7, 4, 18, 24, paper);
      for (let y = 9; y < 25; y += 5) rect(10, y, y === 24 ? 7 : 12, 2, blue);
      for (let x = 7; x < 26; x += 6) rect(x, 28, 3, 3, paper);
      break;
    case 'coins':
      for (const [x, y] of [[2, 18], [12, 11], [20, 3]]) {
        rect(x, y, 11, 10); rect(x + 1, y + 1, 9, 6, gold);
        rect(x + 3, y + 2, 5, 1, paper); rect(x + 1, y + 8, 9, 1, gold);
      }
      break;
    case 'vase':
      rect(10, 2, 12, 4); rect(12, 6, 8, 5); rect(8, 11, 16, 4);
      rect(5, 15, 22, 10); rect(8, 25, 16, 4);
      rect(10, 13, 12, 12, gold); rect(8, 17, 16, 5, gold);
      line(17, 11, 14, 17, red); line(14, 17, 19, 21, red); line(19, 21, 16, 28, red);
      break;
    case 'brush':
      rect(12, 2, 8, 15); rect(14, 3, 4, 13, gold);
      rect(9, 16, 14, 5, blue); rect(8, 21, 16, 9);
      for (let x = 10; x < 23; x += 4) rect(x, 22, 2, 7, paper);
      break;
    case 'crate':
      rect(2, 5, 28, 25); rect(4, 7, 24, 21, gold);
      rect(4, 14, 24, 2); rect(9, 7, 2, 21); rect(23, 7, 2, 21);
      line(4, 7, 28, 28); line(28, 7, 4, 28); rect(12, 3, 8, 4, blue);
      break;
    case 'barrier':
      rect(2, 15, 5, 15); rect(26, 15, 4, 15); rect(1, 8, 30, 8, paper);
      for (let x = 3; x < 30; x += 8) rect(x, 8, 4, 8, red);
      rect(1, 6, 30, 2); rect(1, 16, 30, 2); break;
    case 'key':
      rect(2, 5, 13, 13, gold); rect(6, 9, 5, 5, paper);
      rect(13, 10, 17, 5, gold); rect(24, 13, 4, 7, gold); rect(18, 13, 3, 5, gold); break;
    case 'cap':
      g.fillStyle(blue); g.fillPoints([{x:1,y:10},{x:16,y:3},{x:31,y:10},{x:16,y:17}],true);
      rect(8, 16, 16, 8); rect(10, 16, 12, 6, blue);
      line(29, 11, 29, 24, gold); rect(27, 23, 4, 6, gold); break;
    case 'mask':
      rect(4, 3, 24, 17, gold); rect(7, 20, 18, 5, gold); rect(11, 25, 10, 4, gold);
      rect(8, 10, 6, 4); rect(19, 10, 6, 4); rect(15, 16, 3, 5, paper); rect(12, 24, 8, 2); break;
    case 'calendar':
      rect(2, 4, 28, 26); rect(4, 11, 24, 17, paper); rect(4, 6, 24, 5, red);
      rect(8, 1, 3, 6); rect(21, 1, 3, 6);
      for (let y = 15; y < 26; y += 6) for (let x = 8; x < 26; x += 7) rect(x, y, 3, 3, blue);
      break;
    case 'projector':
      rect(3, 12, 22, 14); rect(5, 14, 18, 10, blue); rect(25, 15, 6, 7);
      rect(7, 26, 3, 4); rect(19, 26, 3, 4); rect(8, 8, 3, 3, red);
      rect(14, 4, 3, 6, red); rect(18, 1, 3, 4, red); break;
    case 'wrench':
      rect(7, 1, 5, 8, blue); rect(20, 1, 5, 8, blue); rect(9, 7, 14, 7, blue);
      rect(13, 13, 6, 17); rect(14, 14, 4, 14, blue); rect(15, 25, 2, 2, paper); break;
    case 'suitcase':
      rect(10, 2, 12, 6); rect(13, 4, 6, 3, paper);
      rect(2, 8, 28, 21); rect(4, 10, 24, 17, gold);
      rect(8, 10, 3, 17); rect(22, 10, 3, 17); rect(14, 16, 5, 4, paper); break;
    case 'person':
      rect(11, 2, 10, 10); rect(13, 4, 6, 6, paper);
      rect(7, 15, 18, 14, green); rect(4, 20, 24, 9, green);
      rect(14, 15, 4, 12, paper); rect(15, 19, 2, 8, red); break;
    case 'folder':
      rect(2, 5, 12, 5, gold); rect(2, 9, 28, 20, gold);
      rect(5, 12, 23, 4, paper); rect(1, 16, 29, 13, 0xc7a15b); break;
    case 'lock':
      rect(7, 1, 18, 17); rect(11, 5, 10, 11, paper);
      rect(3, 13, 26, 17, red); rect(14, 18, 5, 5, paper); rect(15, 22, 3, 4, paper); break;
    default:
      rect(6, 2, 20, 28, paper); line(11, 11, 22, 11); line(11, 17, 22, 17);
  }
  return g;
}
