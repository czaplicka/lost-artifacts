// Flagi złożone z samych pasków: kolory + kierunek.
const STRIPE_FLAGS = {
  FRENCH: { colors: [0x002395, 0xffffff, 0xed2939], vertical: true },
  GERMAN: { colors: [0x000000, 0xdd0000, 0xffce00], vertical: false },
  SPANISH: { colors: [0xaa152b, 0xf1bf00, 0xaa152b], vertical: false },
  ITALIAN: { colors: [0x009246, 0xffffff, 0xce2b37], vertical: true },
  RUSSIAN: { colors: [0xffffff, 0x0039a6, 0xd52b1e], vertical: false },
  DUTCH: { colors: [0xae1c28, 0xffffff, 0x21468b], vertical: false },
  BELGIAN: { colors: [0x000000, 0xfda510, 0xed2939], vertical: true },
  POLISH: { colors: [0xffffff, 0xdc143c], vertical: false },
  CANADIAN: { colors: [0xff0000, 0xffffff, 0xff0000], vertical: true },
  IRISH: { colors: [0x169b62, 0xffffff, 0xff883e], vertical: true },
  INDIAN: { colors: [0xff9933, 0xffffff, 0x138808], vertical: false },
  MEXICAN: { colors: [0x006847, 0xffffff, 0xce1126], vertical: true }
};

/**
 * Zwraca klucz tekstury flagi dla akcentu (generuje ją w razie potrzeby)
 * albo null, jeśli dla akcentu nie ma flagi.
 */
export function ensureFlagTexture(scene, accentKey) {
  const textureKey = `flag_gen_${accentKey}`;

  if (scene.textures.exists(textureKey)) {
    return textureKey;
  }

  const w = 90;
  const h = 56;
  const x = 3;
  const y = 3;
  const fw = w - 6;
  const fh = h - 6;

  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  g.fillStyle(0x2b2b2b, 1);
  g.fillRect(0, 0, w, h);

  const drawStripes = (colors, isVertical = false) => {
    const size = isVertical ? fw / colors.length : fh / colors.length;

    colors.forEach((c, i) => {
      g.fillStyle(c, 1);

      if (isVertical) {
        g.fillRect(x + i * size, y, size, fh);
      } else {
        g.fillRect(x, y + i * size, fw, size);
      }
    });
  };

  const drawUnionJack = (bx, by, bw, bh) => {
    g.fillStyle(0x00247d, 1);
    g.fillRect(bx, by, bw, bh);
    g.fillStyle(0xffffff, 1);
    g.fillRect(bx + bw * 0.4, by, bw * 0.2, bh);
    g.fillRect(bx, by + bh * 0.4, bw, bh * 0.2);
    g.fillStyle(0xcf142b, 1);
    g.fillRect(bx + bw * 0.44, by, bw * 0.12, bh);
    g.fillRect(bx, by + bh * 0.44, bw, bh * 0.12);
  };

  let isValidFlag = true;
  const stripes = STRIPE_FLAGS[accentKey];

  if (stripes) {
    drawStripes(stripes.colors, stripes.vertical);
  } else {
    switch (accentKey) {
      case 'AMERICAN':
        drawStripes([0xb22234, 0xffffff, 0xb22234, 0xffffff, 0xb22234, 0xffffff, 0xb22234], false);
        g.fillStyle(0x3c3b6e, 1);
        g.fillRect(x, y, fw * 0.45, fh * 0.55);
        break;

      case 'BRITISH':
        drawUnionJack(x, y, fw, fh);
        break;

      case 'AUSTRALIAN':
        g.fillStyle(0x00247d, 1);
        g.fillRect(x, y, fw, fh);
        drawUnionJack(x, y, fw * 0.5, fh * 0.5);
        break;

      case 'SCOTTISH':
        g.fillStyle(0x0065bf, 1);
        g.fillRect(x, y, fw, fh);
        g.lineStyle(6, 0xffffff, 1);
        g.lineBetween(x, y, x + fw, y + fh);
        g.lineBetween(x + fw, y, x, y + fh);
        break;

      case 'BELARUSIAN':
      case 'BELARUSSIAN': // pisownia z suspects.json
        g.fillStyle(0xd22630, 1);
        g.fillRect(x, y, fw, fh * 0.66);
        g.fillStyle(0x009b48, 1);
        g.fillRect(x, y + fh * 0.66, fw, fh * 0.34);
        g.fillStyle(0xffffff, 1);
        g.fillRect(x, y, fw * 0.15, fh);
        g.fillStyle(0xd22630, 1);
        g.fillRect(x + fw * 0.04, y, fw * 0.07, fh);
        break;

      case 'CHINESE':
        g.fillStyle(0xde2910, 1);
        g.fillRect(x, y, fw, fh);
        break;

      case 'JAPANESE':
        g.fillStyle(0xffffff, 1);
        g.fillRect(x, y, fw, fh);
        g.fillStyle(0xbc002d, 1);
        g.fillCircle(x + fw / 2, y + fh / 2, fh * 0.3);
        break;

      case 'BRAZILIAN':
        g.fillStyle(0x009c3b, 1);
        g.fillRect(x, y, fw, fh);
        g.fillStyle(0xffdf00, 1);
        g.fillTriangle(x + fw / 2, y + 4, x + fw - 4, y + fh / 2, x + 4, y + fh / 2);
        g.fillTriangle(x + fw / 2, y + fh - 4, x + fw - 4, y + fh / 2, x + 4, y + fh / 2);
        break;

      default:
        isValidFlag = false;
        break;
    }
  }

  if (!isValidFlag) {
    g.destroy();
    return null;
  }

  g.generateTexture(textureKey, w, h);
  g.destroy();

  return textureKey;
}