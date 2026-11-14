import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';
import {
  ensureDailyPaperTexture,
  ensureHalftoneTexture,
  HALFTONE_KEY
} from './NewspaperPaper.js';
import {
  makeRng,
  pickOne,
  pickMany,
  formatEdition,
  EARS_LEFT,
  EARS_RIGHT,
  SECTION_LABELS_TOP,
  SECTION_LABELS_BOTTOM,
  PULL_QUOTE_SOURCES,
  WEATHER_TODAY,
  WEATHER_TOMORROW,
  WEATHER_TOP_NEWS,
  CLASSIFIEDS,
  TICKER,
  ADS,
  COMICS
} from './NewspaperContent.js';
import { ensureTimeCoverTexture, TIME_CAPTIONS } from './NewspaperTimeCover.js';

const TIME_SLOTS = [
  { x: 500, y: 476, width: 920, height: 150, fontSize: 48, minSize: 30 },
  { x: 500, y: 662, width: 920, height: 90, fontSize: 32, minSize: 24 },
  { x: 500, y: 783, width: 920, height: 90, fontSize: 32, minSize: 24 },
  { x: 500, y: 904, width: 920, height: 90, fontSize: 32, minSize: 24 }
];

// Daily palette ("ink on newsprint")
const INK = '#1e1a16';
const INK_HEX = 0x1e1a16;
const BODY = '#2b2219';
const MUTED = '#5a4636';
const RED = '#8c1d12';
const RED_HEX = 0x8c1d12;
const CREAM = '#f0e4c4';
const CREAM_HEX = 0xf0e4c4;
const BUBBLE_HEX = 0xf7eed6;
const PEN_BLUE = '#2a3f7a';
const NAVY = '#14161f';
const TIME_RED = '#c1121f';
const TIME_RED_HEX = 0xc1121f;

const SERIF = 'SpecialElite';
const PIXEL = 'PressStart2P';

export class NewspaperLayout {
  constructor(scene) {
    this.scene = scene;
  }

  render(container, config) {
    const layout = NewspaperLayoutConfig[config.type];
    if (!layout) throw new Error(`Unknown newspaper layout type: ${config.type}`);
    if (config.type === 'daily') this.renderDaily(container, layout, config.data);
    else if (config.type === 'tabloid') this.renderTabloid(container, layout, config.data);
    else if (config.type === 'time') this.renderTime(container, layout, config.data);
  }

  // =========================================================================
  // DAILY
  // =========================================================================

  renderDaily(container, layout, cityData) {
    const scene = this.scene;
    const context = scene.buildTemplateContext?.() || {};
    const day = Number(context.day) || 1;
    const cityId = scene.cityId || 'city';
    const seed = `${cityId}_${day}`;

    // Own background, painted in code. Falls back to whatever the overlay
    // scene loaded if canvas textures are unavailable for some reason.
    try {
      const paperKey = ensureDailyPaperTexture(scene, layout);
      ensureHalftoneTexture(scene);
      if (paperKey && scene.paperBg) scene.paperBg.setTexture(paperKey);
    } catch (error) {
      console.warn('[NewspaperLayout] Could not paint daily paper:', error);
    }

    const raw = scene.cache?.json?.get?.(scene.jsonKey);
    const isMission = Boolean(
      context.gameState?.isGameActive &&
      context.artifact &&
      Array.isArray(raw?.missionLead) &&
      raw.missionLead.length > 0
    );

    const articlesBySlot = {};
    (cityData.articles || []).forEach((article, index) => {
      const slotId = article.slotId || layout.articles[index]?.id;
      if (slotId) articlesBySlot[slotId] = article;
    });

    this.drawMasthead(container, layout, cityData, day, makeRng(`${seed}_masthead`));

    layout.articles.forEach(slot => {
      const article = articlesBySlot[slot.id];
      if (!article) return;

      if (slot.id === 'lead') {
        this.drawLeadStory(container, slot, article, isMission);
      } else {
        const rng = makeRng(`${seed}_${slot.id}`);
        this.drawSideStory(container, layout, slot, article, rng);
      }
    });

    const modules = layout.modules;

    this.drawWeather(container, layout, modules.weather, makeRng(`${seed}_weather`));
    this.drawClassifieds(container, layout, modules.classifieds, makeRng(`${seed}_classifieds`));
    this.drawCrossword(container, layout, modules.crossword);
    this.drawTicker(container, modules.ticker, makeRng(`${seed}_ticker`));
    this.drawAds(container, modules.ads, makeRng(`${seed}_ads`));
    this.drawComic(container, layout, modules.comic, makeRng(`${seed}_comic`));
  }

  // ---- masthead -----------------------------------------------------------

  drawMasthead(container, layout, cityData, day, rng) {
    const mh = layout.masthead;
    const edition = formatEdition(day);
    const centerX = mh.x + mh.w / 2;

    container.add(this.makeText(mh.x, mh.earY, pickOne(EARS_LEFT, rng), {
      fontFamily: PIXEL, fontSize: '9px', color: MUTED
    }, 0, 0));

    container.add(this.makeText(mh.x + mh.w, mh.earY, pickOne(EARS_RIGHT, rng), {
      fontFamily: PIXEL, fontSize: '9px', color: MUTED
    }, 1, 0));

    this.fitLine(container, centerX, mh.titleY, cityData.title || '', {
      fontFamily: SERIF, color: INK, stroke: INK, strokeThickness: 2
    }, mh.titleMaxW, mh.titleSize, mh.titleMin, 0.5, 0.5);

    container.add(this.makeText(mh.x, mh.datelineY, cityData.subtitle || '', {
      fontFamily: SERIF, fontSize: '17px', color: MUTED
    }, 0, 0.5));

    container.add(this.makeText(centerX, mh.datelineY, edition.date, {
      fontFamily: SERIF, fontSize: '17px', color: INK
    }, 0.5, 0.5));

    container.add(this.makeText(mh.x + mh.w, mh.datelineY, edition.volume, {
      fontFamily: SERIF, fontSize: '17px', color: MUTED
    }, 1, 0.5));
  }

  // ---- lead story ---------------------------------------------------------

  drawLeadStory(container, slot, article, isMission) {
    const scene = this.scene;
    const x = slot.x;
    const w = slot.width;

    this.drawStamp(
      container,
      x + 2,
      slot.y + 4,
      isMission ? __dialogueText("ui/NewspaperUI.js", "t_696678be514df84082f6") : __dialogueText("ui/NewspaperUI.js", "t_2b1b45ca481c01b0e9c3"),
      isMission ? RED : INK,
      isMission ? RED_HEX : INK_HEX,
      -1.5
    );

    if (isMission) {
      container.add(this.makeText(x + w, slot.y + 12, __dialogueText("ui/NewspaperUI.js", "t_b55c8a0a590e6f211211"), {
        fontFamily: PIXEL, fontSize: '9px', color: RED
      }, 1, 0));
    }

    const headline = this.fitBlock(container, article.headline || '', {
      x,
      y: slot.y + 38,
      width: w,
      maxHeight: slot.headlineMaxH,
      maxSize: slot.headlineSize,
      minSize: slot.headlineMin,
      style: {
        fontFamily: SERIF, color: INK, stroke: INK, strokeThickness: 1, lineSpacing: 4
      }
    });

    let cursor = headline.y + headline.height + 8;

    if (article.lead) {
      const deck = this.fitBlock(container, article.lead, {
        x,
        y: cursor,
        width: w,
        maxHeight: 46,
        maxSize: slot.deckSize,
        minSize: 13,
        style: { fontFamily: SERIF, color: MUTED, lineSpacing: 4 }
      });
      cursor = deck.y + deck.height + 10;
    }

    const rule = scene.add.graphics();
    rule.lineStyle(1, INK_HEX, 0.55);
    rule.lineBetween(x, cursor - 5, x + w, cursor - 5);
    container.add(rule);

    const bottom = slot.y + slot.height;
    const available = bottom - cursor;

    if (article.imageKey) {
      const frame = 8;
      const captionH = 38;
      const photoW = slot.photo.width;
      const photoH = Math.max(
        120,
        Math.min(slot.photo.height, available - frame * 2 - captionH)
      );

      this.drawPhoto(container, article.imageKey, x + frame, cursor + frame + 2, photoW, photoH, -1.1);

      if (article.imageCaption) {
        this.fitBlock(container, article.imageCaption, {
          x,
          y: cursor + frame * 2 + photoH + 8,
          width: photoW + frame * 2,
          maxHeight: captionH - 4,
          maxSize: 13,
          minSize: 10,
          style: { fontFamily: SERIF, color: MUTED, fontStyle: 'italic', lineSpacing: 2 }
        });
      }

      const bodyX = x + photoW + frame * 2 + 26;

      this.fitBlock(container, article.body || '', {
        x: bodyX,
        y: cursor + 4,
        width: x + w - bodyX,
        maxHeight: available - 4,
        maxSize: slot.bodySize,
        minSize: slot.bodyMin,
        style: { fontFamily: SERIF, color: BODY, lineSpacing: 6 }
      });
    } else {
      this.flowColumns(container, article.body || '', {
        x,
        y: cursor + 4,
        width: w,
        height: available - 4,
        cols: 2,
        gap: 28,
        maxSize: slot.bodySize,
        minSize: slot.bodyMin,
        style: { fontFamily: SERIF, color: BODY, lineSpacing: 6 }
      });
    }
  }

  // ---- right page stories -------------------------------------------------

  drawSideStory(container, layout, slot, article, rng) {
    const isTop = slot.id === 'secondary_1';
    const label = pickOne(isTop ? SECTION_LABELS_TOP : SECTION_LABELS_BOTTOM, rng);

    this.drawBarLabel(container, slot.x, slot.y, label);

    const headline = this.fitBlock(container, article.headline || '', {
      x: slot.x,
      y: slot.y + layout.barHeight + 12,
      width: slot.width,
      maxHeight: slot.headlineMaxH,
      maxSize: slot.headlineSize,
      minSize: slot.headlineMin,
      style: {
        fontFamily: SERIF, color: INK, stroke: INK, strokeThickness: 1, lineSpacing: 4
      }
    });

    const cursor = headline.y + headline.height + 12;
    const bottom = slot.y + slot.height;

    const quote = slot.pullQuote ? this.extractPullQuote(article.body) : null;
    const quoteH = 100;
    const reserve = quote ? quoteH + 20 : 0;

    const body = this.fitBlock(container, article.body || '', {
      x: slot.x,
      y: cursor,
      width: slot.width,
      maxHeight: bottom - cursor - reserve,
      maxSize: slot.bodySize,
      minSize: slot.bodyMin,
      style: { fontFamily: SERIF, color: BODY, lineSpacing: 6 }
    });

    if (quote) {
      const quoteY = Math.min(body.y + body.height + 22, bottom - quoteH);
      this.drawPullQuote(
        container,
        slot.x,
        quoteY,
        slot.width,
        quoteH,
        quote,
        pickOne(PULL_QUOTE_SOURCES, rng)
      );
    }
  }

  extractPullQuote(body) {
    if (typeof body !== 'string') return null;

    const match = body.match(/(?:^|[\s(])'([^']{16,130}?)'(?=[\s.,;:!?)]|$)/);
    if (!match) return null;

    return match[1].replace(/[\s,.;:]+$/, '');
  }

  drawPullQuote(container, x, y, w, h, quote, source) {
    const g = this.scene.add.graphics();

    g.lineStyle(3, INK_HEX, 0.9);
    g.lineBetween(x, y, x + w, y);
    g.lineBetween(x, y + h, x + w, y + h);
    g.lineStyle(1, INK_HEX, 0.9);
    g.lineBetween(x, y + 5, x + w, y + 5);
    g.lineBetween(x, y + h - 5, x + w, y + h - 5);
    container.add(g);

    this.fitBlock(container, `"${quote}"`, {
      x: x + w / 2,
      y: y + 14,
      width: w - 36,
      maxHeight: h - 46,
      maxSize: 22,
      minSize: 13,
      align: 'center',
      originX: 0.5,
      style: { fontFamily: SERIF, color: RED, fontStyle: 'italic', lineSpacing: 4 }
    });

    container.add(this.makeText(x + w / 2, y + h - 24, `- ${source}`, {
      fontFamily: PIXEL, fontSize: '8px', color: MUTED
    }, 0.5, 0));
  }

  // ---- weather ------------------------------------------------------------

  drawWeather(container, layout, m, rng) {
    this.drawBarLabel(container, m.x, m.y, m.label);

    const kind = pickOne(['sun', 'cloud', 'rain', 'storm'], rng);
    const temperature = 6 + Math.floor(rng() * 18);
    const centerX = m.x + m.width / 2;

    this.drawWeatherIcon(container, kind, centerX, m.y + 86);

    container.add(this.makeText(centerX, m.y + 152, `${temperature}°C`, {
      fontFamily: SERIF, fontSize: '38px', color: INK, stroke: INK, strokeThickness: 1
    }, 0.5, 0));

    const entries = [
      { head: 'TODAY', text: WEATHER_TODAY[kind] },
      { head: 'TOMORROW', text: pickOne(WEATHER_TOMORROW, rng) },
      { head: __dialogueText("ui/NewspaperUI.js", "t_d6abf11bd201a421cd90"), text: pickOne(WEATHER_TOP_NEWS, rng) }
    ];

    entries.forEach((entry, index) => {
      const y = m.y + 206 + index * 54;

      container.add(this.makeText(m.x + 14, y, entry.head, {
        fontFamily: PIXEL, fontSize: '8px', color: RED
      }, 0, 0));

      this.fitBlock(container, entry.text, {
        x: m.x + 14,
        y: y + 14,
        width: m.width - 28,
        maxHeight: 36,
        maxSize: 15,
        minSize: 11,
        style: { fontFamily: SERIF, color: BODY, lineSpacing: 2 }
      });
    });
  }

  drawWeatherIcon(container, kind, cx, cy) {
    const g = this.scene.add.graphics();
    const dark = 0x3a2c1f;

    const cloud = (ox, oy) => {
      g.fillStyle(dark, 1);
      g.fillCircle(ox - 24, oy + 8, 18);
      g.fillCircle(ox, oy - 6, 26);
      g.fillCircle(ox + 26, oy + 8, 17);
      g.fillRect(ox - 24, oy + 8, 50, 18);
    };

    if (kind === 'sun') {
      g.fillStyle(dark, 1);
      g.fillCircle(cx, cy, 26);
      g.lineStyle(5, dark, 1);

      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        g.lineBetween(
          cx + Math.cos(angle) * 36,
          cy + Math.sin(angle) * 36,
          cx + Math.cos(angle) * 50,
          cy + Math.sin(angle) * 50
        );
      }
    } else {
      cloud(cx, cy - 8);

      if (kind === 'rain') {
        g.lineStyle(4, dark, 1);
        [-22, 0, 22].forEach(offset => {
          g.lineBetween(cx + offset, cy + 26, cx + offset - 8, cy + 44);
        });
      }

      if (kind === 'storm') {
        g.fillStyle(RED_HEX, 1);
        g.fillPoints([
          { x: cx + 4, y: cy + 20 },
          { x: cx - 10, y: cy + 40 },
          { x: cx, y: cy + 40 },
          { x: cx - 6, y: cy + 58 },
          { x: cx + 16, y: cy + 34 },
          { x: cx + 6, y: cy + 34 },
          { x: cx + 14, y: cy + 20 }
        ], true);
      }
    }

    container.add(g);
  }

  // ---- classifieds --------------------------------------------------------

  drawClassifieds(container, layout, m, rng) {
    this.drawBarLabel(container, m.x, m.y, m.label);

    const items = pickMany(CLASSIFIEDS, 4, rng);
    const pitch = 82;

    items.forEach((item, index) => {
      const y = m.y + 36 + index * pitch;

      container.add(this.makeText(m.x + 12, y, item.head, {
        fontFamily: PIXEL, fontSize: '9px', color: RED
      }, 0, 0));

      this.fitBlock(container, item.text, {
        x: m.x + 12,
        y: y + 15,
        width: m.width - 24,
        maxHeight: 54,
        maxSize: 15,
        minSize: 11,
        style: { fontFamily: SERIF, color: BODY, lineSpacing: 2 }
      });

      if (index < items.length - 1) {
        this.drawDottedLine(container, m.x + 12, m.x + m.width - 12, y + pitch - 10);
      }
    });
  }

  drawDottedLine(container, x1, x2, y) {
    const g = this.scene.add.graphics();
    g.fillStyle(INK_HEX, 0.6);

    for (let px = x1; px < x2; px += 6) {
      g.fillRect(px, y, 2, 1.5);
    }

    container.add(g);
  }

  // ---- crossword ----------------------------------------------------------

  drawCrossword(container, layout, m) {
    this.drawBarLabel(container, m.x, m.y, m.label);

    const scene = this.scene;
    const pattern = ['.....', '.#.#.', '.....', '.#.#.', '.....'];
    const cell = 34;
    const gridSize = cell * 5;
    const gx = m.x + (m.width - gridSize) / 2;
    const gy = m.y + 40;

    const g = scene.add.graphics();

    pattern.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        const cx = gx + c * cell;
        const cy = gy + r * cell;

        if (ch === '#') {
          g.fillStyle(INK_HEX, 0.9);
          g.fillRect(cx, cy, cell, cell);
        } else {
          g.fillStyle(CREAM_HEX, 0.7);
          g.fillRect(cx, cy, cell, cell);
        }
      });
    });

    g.lineStyle(1.5, INK_HEX, 0.9);
    for (let i = 0; i <= 5; i++) {
      g.lineBetween(gx, gy + i * cell, gx + gridSize, gy + i * cell);
      g.lineBetween(gx + i * cell, gy, gx + i * cell, gy + gridSize);
    }

    container.add(g);

    // clue numbers
    [
      { text: __dialogueText("ui/NewspaperUI.js", "t_6b86b273ff34fce19d6b"), r: 0, c: 2 },
      { text: __dialogueText("ui/NewspaperUI.js", "t_d4735e3a265e16eee03f"), r: 2, c: 0 }
    ].forEach(n => {
      container.add(this.makeText(gx + n.c * cell + 3, gy + n.r * cell + 2, n.text, {
        fontFamily: SERIF, fontSize: '11px', color: INK
      }, 0, 0));
    });

    // someone already solved 1 DOWN - in pen
    [...'THIEF'].forEach((letter, r) => {
      const t = this.makeText(gx + 2 * cell + cell / 2, gy + r * cell + cell / 2 + 2, letter, {
        fontFamily: PIXEL, fontSize: '14px', color: PEN_BLUE
      }, 0.5, 0.5);
      t.setAngle(((r * 37) % 7) - 3);
      container.add(t);
    });

    this.fitBlock(container,
      __dialogueText("ui/NewspaperUI.js", "t_6a9caccf68d82acc7a05"),
      {
        x: m.x + 12,
        y: gy + gridSize + 16,
        width: m.width - 24,
        maxHeight: 64,
        maxSize: 15,
        minSize: 11,
        style: { fontFamily: SERIF, color: BODY, lineSpacing: 4 }
      }
    );

    this.fitBlock(container, __dialogueText("ui/NewspaperUI.js", "t_acd5081b845720262542"), {
      x: m.x + 12,
      y: m.y + m.height - 40,
      width: m.width - 24,
      maxHeight: 32,
      maxSize: 12,
      minSize: 10,
      style: { fontFamily: SERIF, color: MUTED, fontStyle: 'italic', lineSpacing: 2 }
    });
  }

  // ---- ticker -------------------------------------------------------------

  drawTicker(container, m, rng) {
    const items = pickMany(TICKER, 4, rng).join('   |   ');
    const centerY = m.y + m.height / 2;

    container.add(this.makeText(m.x + 8, centerY, 'MARKETS', {
      fontFamily: PIXEL, fontSize: '9px', color: RED
    }, 0, 0.5));

    this.fitLine(container, m.x + 112, centerY, items, {
      fontFamily: SERIF, color: INK
    }, m.width - 124, 16, 10, 0, 0.5);
  }

  // ---- ads ----------------------------------------------------------------

  drawAds(container, m, rng) {
    const ads = pickMany(ADS, m.heights.length, rng);
    let y = m.y;

    ads.forEach((ad, index) => {
      this.drawAd(container, ad, m.x, y, m.width, m.heights[index]);
      y += m.heights[index] + m.gap;
    });
  }

  drawAd(container, ad, x, y, w, h) {
    const scene = this.scene;

    const back = scene.add.graphics();
    back.fillStyle(0xd8c59a, 0.35);
    back.fillRect(x, y, w, h);
    back.lineStyle(3, INK_HEX, 0.9);
    back.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    back.lineStyle(1, INK_HEX, 0.9);
    back.strokeRect(x + 7, y + 7, w - 14, h - 14);
    container.add(back);

    const pad = 20;

    if (ad.kind === 'burst') {
      const cx = x + 88;
      const cy = y + h / 2;
      const star = scene.add.graphics();
      star.fillStyle(INK_HEX, 0.92);
      star.fillPoints(this.starPoints(cx, cy, 66, 52, 16), true);
      container.add(star);

      this.fitLine(container, cx, cy, ad.head, {
        fontFamily: SERIF, color: CREAM, stroke: CREAM, strokeThickness: 1
      }, 92, 26, 10, 0.5, 0.5);

      const textX = x + 170;
      const textW = w - 170 - pad;

      this.fitBlock(container, ad.sub, {
        x: textX,
        y: y + 28,
        width: textW,
        maxHeight: 50,
        maxSize: 11,
        minSize: 8,
        style: { fontFamily: PIXEL, color: INK, lineSpacing: 5 }
      });

      this.fitBlock(container, ad.fine, {
        x: textX,
        y: y + 88,
        width: textW,
        maxHeight: h - 88 - 16,
        maxSize: 14,
        minSize: 10,
        style: { fontFamily: SERIF, color: MUTED, fontStyle: 'italic', lineSpacing: 2 }
      });
      return;
    }

    if (ad.kind === 'banner') {
      const bar = scene.add.graphics();
      bar.fillStyle(INK_HEX, 0.92);
      bar.fillRect(x + 7, y + 7, w - 14, 44);
      container.add(bar);

      this.fitLine(container, x + w / 2, y + 29, ad.head, {
        fontFamily: SERIF, color: CREAM, stroke: CREAM, strokeThickness: 1
      }, w - 44, 24, 11, 0.5, 0.5);

      this.fitBlock(container, ad.sub, {
        x: x + w / 2,
        y: y + 64,
        width: w - pad * 2,
        maxHeight: 44,
        maxSize: 20,
        minSize: 12,
        align: 'center',
        originX: 0.5,
        style: { fontFamily: SERIF, color: INK, stroke: INK, strokeThickness: 1, lineSpacing: 2 }
      });

      this.fitBlock(container, ad.fine, {
        x: x + w / 2,
        y: y + 112,
        width: w - pad * 2,
        maxHeight: h - 112 - 16,
        maxSize: 14,
        minSize: 10,
        align: 'center',
        originX: 0.5,
        style: { fontFamily: SERIF, color: MUTED, fontStyle: 'italic', lineSpacing: 2 }
      });
      return;
    }

    // boxed
    this.fitLine(container, x + w / 2, y + 36, ad.head, {
      fontFamily: SERIF, color: INK, stroke: INK, strokeThickness: 2
    }, w - pad * 2, 30, 14, 0.5, 0.5);

    this.fitBlock(container, ad.sub, {
      x: x + w / 2,
      y: y + 64,
      width: w - pad * 2,
      maxHeight: 34,
      maxSize: 10,
      minSize: 7,
      align: 'center',
      originX: 0.5,
      style: { fontFamily: PIXEL, color: RED, lineSpacing: 4 }
    });

    this.fitBlock(container, ad.fine, {
      x: x + w / 2,
      y: y + 104,
      width: w - pad * 2,
      maxHeight: h - 104 - 16,
      maxSize: 14,
      minSize: 10,
      align: 'center',
      originX: 0.5,
      style: { fontFamily: SERIF, color: MUTED, fontStyle: 'italic', lineSpacing: 2 }
    });
  }

  starPoints(cx, cy, outer, inner, points) {
    const result = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      result.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    }

    return result;
  }

  // ---- comic strip --------------------------------------------------------

  drawComic(container, layout, m, rng) {
    this.drawBarLabel(container, m.x, m.y, m.label);

    const gag = pickOne(COMICS, rng);
    const panelW = m.width - 16;
    const panelH = 106;
    const gap = 8;

    gag.forEach((panel, index) => {
      const px = m.x + 8;
      const py = m.y + 30 + index * (panelH + gap);

      const g = this.scene.add.graphics();
      g.fillStyle(CREAM_HEX, 0.5);
      g.fillRect(px, py, panelW, panelH);
      g.lineStyle(2, INK_HEX, 0.95);
      g.strokeRect(px, py, panelW, panelH);
      g.lineStyle(1, INK_HEX, 0.4);
      g.lineBetween(px + 6, py + panelH - 8, px + 72, py + panelH - 8);
      container.add(g);

      const figureX = px + 40;
      const baseline = py + panelH - 8;

      if (panel.who === 'pigeon') this.drawPigeon(container, figureX, baseline);
      else this.drawPete(container, figureX, baseline);

      this.drawBubble(container, px + 84, py + 10, panelW - 84 - 10, panelH - 24, panel.say);
    });
  }

  drawPete(container, fx, fy) {
    const g = this.scene.add.graphics();
    const s = 0.9;

    g.lineStyle(3, INK_HEX, 1);
    g.lineBetween(fx - 6 * s, fy - 26 * s, fx - 8 * s, fy);
    g.lineBetween(fx + 6 * s, fy - 26 * s, fx + 8 * s, fy);

    g.fillStyle(INK_HEX, 1);
    g.fillPoints([
      { x: fx - 14 * s, y: fy - 62 * s },
      { x: fx + 14 * s, y: fy - 62 * s },
      { x: fx + 18 * s, y: fy - 24 * s },
      { x: fx - 18 * s, y: fy - 24 * s }
    ], true);

    g.fillStyle(0xe8d3a8, 1);
    g.fillCircle(fx, fy - 74 * s, 11 * s);
    g.lineStyle(2, INK_HEX, 1);
    g.strokeCircle(fx, fy - 74 * s, 11 * s);

    g.fillStyle(INK_HEX, 1);
    g.fillEllipse(fx, fy - 82 * s, 36 * s, 8 * s);
    g.fillRect(fx - 10 * s, fy - 96 * s, 20 * s, 14 * s);

    container.add(g);
  }

  drawPigeon(container, fx, fy) {
    const g = this.scene.add.graphics();

    g.lineStyle(2, INK_HEX, 1);
    g.lineBetween(fx - 4, fy - 12, fx - 4, fy);
    g.lineBetween(fx + 6, fy - 12, fx + 6, fy);

    g.fillStyle(0x6b5a48, 1);
    g.fillEllipse(fx, fy - 24, 42, 26);
    g.fillTriangle(fx - 18, fy - 26, fx - 34, fy - 18, fx - 16, fy - 16);

    g.fillCircle(fx + 16, fy - 40, 9);

    g.fillStyle(0xb8741a, 1);
    g.fillTriangle(fx + 24, fy - 42, fx + 34, fy - 38, fx + 24, fy - 36);

    g.fillStyle(CREAM_HEX, 1);
    g.fillCircle(fx + 18, fy - 42, 2);
    g.fillStyle(INK_HEX, 1);
    g.fillCircle(fx + 18.5, fy - 42, 1);

    container.add(g);
  }

  drawBubble(container, x, y, w, h, text) {
    const g = this.scene.add.graphics();

    g.fillStyle(BUBBLE_HEX, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, INK_HEX, 1);
    g.strokeRoundedRect(x, y, w, h, 8);

    // tail pointing at the speaker on the left
    g.fillStyle(BUBBLE_HEX, 1);
    g.fillTriangle(x + 1, y + h - 22, x + 1, y + h - 8, x - 13, y + h - 4);
    g.lineStyle(2, INK_HEX, 1);
    g.lineBetween(x, y + h - 22, x - 13, y + h - 4);
    g.lineBetween(x - 13, y + h - 4, x, y + h - 8);

    container.add(g);

    const t = this.fitBlock(container, text, {
      x: x + w / 2,
      y: y + 8,
      width: w - 18,
      maxHeight: h - 14,
      maxSize: 17,
      minSize: 11,
      align: 'center',
      originX: 0.5,
      style: { fontFamily: SERIF, color: INK, lineSpacing: 2 }
    });

    t.y = y + (h - t.height) / 2;
  }

  // ---- shared drawing helpers --------------------------------------------

  // Label text on the dark bars that NewspaperPaper prints.
  drawBarLabel(container, x, y, text) {
    container.add(this.makeText(x + 8, y + 7, text, {
      fontFamily: PIXEL, fontSize: '9px', color: CREAM
    }, 0, 0));
  }

  drawStamp(container, x, y, text, color, colorHex, angle) {
    const scene = this.scene;
    const pad = 7;

    const label = this.makeText(0, 0, text, {
      fontFamily: PIXEL, fontSize: '10px', color
    }, 0, 0);

    const box = scene.add.graphics();
    box.lineStyle(2, colorHex, 0.9);
    box.strokeRect(-pad, -pad, label.width + pad * 2, label.height + pad * 2);

    const stamp = scene.add.container(x + pad, y + pad, [box, label]);
    stamp.setAngle(angle);
    container.add(stamp);
  }

  drawPhoto(container, key, x, y, w, h, angle) {
    const scene = this.scene;
    const border = 8;

    const group = scene.add.container(x + w / 2, y + h / 2);
    group.setAngle(angle);

    group.add(scene.add.rectangle(5, 6, w + border * 2, h + border * 2, 0x2a1d10, 0.28));
    group.add(scene.add.rectangle(0, 0, w + border * 2, h + border * 2, 0xf4ead2, 1));

    if (key && scene.textures.exists(key)) {
      const frame = scene.textures.get(key).get();
      const iw = frame.width;
      const ih = frame.height;

      // "cover" fit: scale to fill, crop the overflow
      const scale = Math.max(w / iw, h / ih);
      const cropW = w / scale;
      const cropH = h / scale;
      const cropX = (iw - cropW) / 2;
      const cropY = (ih - cropH) / 2;

      const image = scene.add.image(
        -w / 2 - cropX * scale,
        -h / 2 - cropY * scale,
        key
      )
        .setOrigin(0, 0)
        .setScale(scale)
        .setCrop(cropX, cropY, cropW, cropH);

      group.add(image);

      // sepia wash + halftone dots = "printed photo"
      group.add(
        scene.add.rectangle(0, 0, w, h, 0xb8996a, 0.42)
          .setBlendMode(Phaser.BlendModes.MULTIPLY)
      );

      if (scene.textures.exists(HALFTONE_KEY)) {
        group.add(
          scene.add.tileSprite(0, 0, w, h, HALFTONE_KEY)
            .setAlpha(0.22)
            .setBlendMode(Phaser.BlendModes.MULTIPLY)
        );
      }
    } else {
      group.add(scene.add.rectangle(0, 0, w, h, 0xcdbb94, 1));
      group.add(this.makeText(0, 0, __dialogueText("ui/NewspaperUI.js", "t_9226eca2ee357fa76930"), {
        fontFamily: PIXEL, fontSize: '10px', color: MUTED, align: 'center', lineSpacing: 8
      }, 0.5, 0.5));
    }

    // tape on the top corners
    [-1, 1].forEach(side => {
      group.add(
        scene.add.rectangle(side * (w / 2 - 6), -h / 2 - 4, 54, 18, 0xf3e6a8, 0.7)
          .setAngle(side * 32)
      );
    });

    container.add(group);
  }

  // Single-line text shrunk to fit a maximum width.
  fitLine(container, x, y, text, style, maxWidth, maxSize, minSize, originX = 0, originY = 0) {
    const t = this.makeText(x, y, text, {
      ...style,
      fontSize: `${maxSize}px`
    }, originX, originY);

    let size = maxSize;

    while (t.width > maxWidth && size > minSize) {
      size -= 1;
      t.setFontSize(size);
    }

    if (t.width > maxWidth) t.setScale(maxWidth / t.width);

    container.add(t);
    return t;
  }

  // Word-wrapped text shrunk until it fits in maxHeight; ellipsis as a last resort.
  fitBlock(container, text, o) {
    const content = String(text ?? '');

    const t = this.makeText(o.x, o.y, content, {
      ...o.style,
      fontSize: `${o.maxSize}px`,
      align: o.align || 'left',
      wordWrap: { width: o.width, useAdvancedWrap: true }
    }, o.originX ?? 0, 0);

    let size = o.maxSize;

    while (t.height > o.maxHeight && size > o.minSize) {
      size -= 1;
      t.setFontSize(size);
    }

    if (t.height > o.maxHeight) {
      const lines = t.getWrappedText(content);
      const lineHeight = t.height / Math.max(1, lines.length);
      const maxLines = Math.max(1, Math.floor(o.maxHeight / lineHeight));

      if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines).join(' ').replace(/[\s.,;:!?-]+$/, '');
        t.setText(`${kept.slice(0, Math.max(0, kept.length - 3))}${__dialogueText("ui/NewspaperUI.js", "t_ab5df625bc76dbd4e163")}`);
      }
    }

    container.add(t);
    return t;
  }

  // Text flowed over several columns (used when the lead story has no photo).
  flowColumns(container, text, o) {
    const colWidth = (o.width - o.gap * (o.cols - 1)) / o.cols;

    const probe = this.makeText(0, 0, text, {
      ...o.style,
      fontSize: `${o.maxSize}px`,
      wordWrap: { width: colWidth, useAdvancedWrap: true }
    }, 0, 0);

    let size = o.maxSize;
    let lines = probe.getWrappedText(text);
    let perColumn = 1;

    for (;;) {
      probe.setFontSize(size);
      lines = probe.getWrappedText(text);

      const lineHeight = probe.height / Math.max(1, lines.length);
      perColumn = Math.max(1, Math.floor(o.height / lineHeight));

      if (lines.length <= perColumn * o.cols || size <= o.minSize) break;
      size -= 1;
    }

    probe.destroy();

    const capacity = perColumn * o.cols;

    if (lines.length > capacity) {
      lines = lines.slice(0, capacity);
      const last = lines[capacity - 1].replace(/[\s.,;:!?-]+$/, '');
      lines[capacity - 1] = `${last.slice(0, Math.max(0, last.length - 3))}...`;
    }

    for (let c = 0; c < o.cols; c++) {
      const chunk = lines.slice(c * perColumn, (c + 1) * perColumn);
      if (!chunk.length) break;

      container.add(this.makeText(
        o.x + c * (colWidth + o.gap),
        o.y,
        chunk.join('\n'),
        { ...o.style, fontSize: `${size}px` },
        0,
        0
      ));
    }
  }

  // =========================================================================
  // TABLOID (unchanged)
  // =========================================================================

  renderTabloid(container, layout, cityData) {
    const title = this.makeText(layout.title.x, layout.title.y, cityData.title || '', {
      fontFamily: 'SpecialElite', fontSize: '60px', color: '#2a1313', align: 'left'
    });
    const subtitle = this.makeText(layout.subtitle.x, layout.subtitle.y, cityData.subtitle || '', {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#5c4545', align: 'left'
    });
    container.add([title, subtitle]);
    const articlesBySlot = {};
    (cityData.articles || []).forEach((article, index) => {
      const slotId = article.slotId || layout.articles[index]?.id;
      if (slotId) articlesBySlot[slotId] = article;
    });
    layout.articles.forEach(slot => {
      const article = articlesBySlot[slot.id];
      if (!article) return;
      const headline = this.makeText(slot.x, slot.y, article.headline || '', {
        fontFamily: 'SpecialElite', fontSize: `${slot.headlineSize}px`, color: '#2a1616',
        wordWrap: { width: slot.width }, align: 'left', lineSpacing: 8
      });
      const lead = article.lead ? this.makeText(slot.x, headline.y + headline.height + 8,
        article.lead, {
          fontFamily: 'SpecialElite', fontSize: '17px', color: '#5b4747',
          wordWrap: { width: slot.width }, align: 'left', lineSpacing: 6
        }) : null;
      const bodyY = lead ? lead.y + lead.height + 10 : headline.y + headline.height + 20;
      const body = this.makeText(slot.x, bodyY, article.body || '', {
        fontFamily: 'SpecialElite', fontSize: `${slot.bodySize}px`, color: '#3a2a2a',
        wordWrap: { width: slot.width }, align: 'left', lineSpacing: 10
      });
      if (lead) container.add(lead);
      container.add([headline, body]);
    });
  }

  // =========================================================================
  // TIME - painted cover (legacy renderer kept below as fallback)
  // =========================================================================

  resolveTimeCover(cityData) {
    // The current overlay passes only coverLines. Read the original cached
    // JSON here as well so existing { covers: [...] } files keep working.
    const scene = this.scene;
    const jsonKey = scene.jsonKey || `newspaper_time_${scene.cityId || 'warsaw'}`;
    const cached = scene.cache.json.get(jsonKey);
    const raw = cached && typeof cached === 'object' ? cached : (cityData || {});
    const covers = Array.isArray(raw.covers)
      ? raw.covers.filter(cover => cover && Array.isArray(cover.coverLines)) : [];
    if (covers.length) {
      const day = scene.buildTemplateContext?.().day ?? 1;
      const salt = `${scene.cityId || 'warsaw'}_time_cover`;
      const picked = typeof scene.pickVariant === 'function'
        ? scene.pickVariant(covers, day, salt)
        : covers[Math.abs(Math.floor(day) - 1) % covers.length];
      return { ...raw, ...picked };
    }
    return { ...(cityData || {}), ...raw };
  }

  renderTime(container, layout, cityData) {
    const scene = this.scene;
    let paintedKey = null;

    try {
      paintedKey = ensureTimeCoverTexture(scene, layout);
      if (paintedKey && scene.paperBg) scene.paperBg.setTexture(paintedKey);
    } catch (error) {
      console.warn('[NewspaperLayout] Could not paint TIME cover:', error);
      paintedKey = null;
    }

    if (!paintedKey || !layout.cover) {
      this.renderTimeLegacy(container, layout, cityData);
      return;
    }

    const cover = this.resolveTimeCover(cityData);
    const context = scene.buildTemplateContext?.() || {};
    const day = Number(context.day) || 1;
    const rng = makeRng(`${scene.cityId || 'city'}_${day}_time`);

    const c = layout.cover;
    const cx = c.x + c.width / 2;
    const innerLeft = c.x + c.border + 30;
    const innerRight = c.x + c.width - c.border - 30;

    const lines = (Array.isArray(cover.coverLines) ? cover.coverLines : [])
      .map(value => typeof value === 'string' ? value.trim() : '')
      .filter(Boolean)
      .slice(0, 4)
      .map(value => typeof scene.fillTemplate === 'function' && context
        ? scene.fillTemplate(value, context)
        : value);

    // top strip: date + price
    container.add(this.makeText(innerLeft, layout.stripY, formatEdition(day).date.toUpperCase(), {
      fontFamily: SERIF, fontSize: '14px', color: NAVY
    }, 0, 0.5));

    container.add(this.makeText(innerRight, layout.stripY, __dialogueText("ui/NewspaperUI.js", "t_83a3125adfef2ebb4b59"), {
      fontFamily: SERIF, fontSize: '14px', color: TIME_RED, stroke: TIME_RED, strokeThickness: 1
    }, 1, 0.5));

    container.add(this.makeText(cx, layout.taglineY, __dialogueText("ui/NewspaperUI.js", "t_4ecc21ab325ea3e3e4fe"), {
      fontFamily: PIXEL, fontSize: '9px', color: TIME_RED
    }, 0.5, 0));

    // sticker text on the painted burst
    const badge = layout.badge;
    if (badge) {
      container.add(
        this.makeText(badge.x, badge.y, __dialogueText("ui/NewspaperUI.js", "t_03c26b5280dcff93558b"), {
          fontFamily: PIXEL, fontSize: '8px', color: CREAM, align: 'center', lineSpacing: 6
        }, 0.5, 0.5).setAngle(-12)
      );
    }

    // caption under the picture
    this.fitBlock(container, pickOne(TIME_CAPTIONS, rng), {
      x: cx,
      y: layout.caption.y,
      width: layout.illustration.width,
      maxHeight: layout.caption.height,
      maxSize: 15,
      minSize: 11,
      align: 'center',
      originX: 0.5,
      style: { fontFamily: SERIF, color: MUTED, fontStyle: 'italic', lineSpacing: 2 }
    });

    if (!lines.length) {
      console.warn('[NewspaperLayout] TIME cover has no coverLines:', scene.jsonKey);
      return;
    }

    // main cover line
    this.fitBlock(container, lines[0], {
      x: cx,
      y: layout.headline.y,
      width: innerRight - innerLeft,
      maxHeight: layout.headline.height,
      maxSize: layout.headline.size,
      minSize: layout.headline.min,
      align: 'center',
      originX: 0.5,
      style: { fontFamily: SERIF, color: NAVY, stroke: NAVY, strokeThickness: 1, lineSpacing: 4 }
    });

    // teasers with red square bullets
    const t = layout.teasers;
    lines.slice(1, 4).forEach((line, index) => {
      const y = t.y + index * t.pitch;

      container.add(this.scene.add.rectangle(t.x - 16, y + 10, 10, 10, TIME_RED_HEX, 1));

      this.fitBlock(container, line, {
        x: t.x,
        y,
        width: t.width,
        maxHeight: t.height,
        maxSize: t.size,
        minSize: t.min,
        style: { fontFamily: SERIF, color: '#2a2a33', lineSpacing: 3 }
      });
    });
  }

  renderTimeLegacy(container, _layout, cityData) {
    const scene = this.scene;
    const cover = this.resolveTimeCover(cityData);
    const backgroundKey = ['paper_time_bg', 'paper_time_bg_1920x1080']
      .find(key => scene.textures.exists(key));
    if (backgroundKey && scene.paperBg) scene.paperBg.setTexture(backgroundKey);
    // TIME is already printed on the supplied background. Do not add a second logo.
    const lines = (Array.isArray(cover.coverLines) ? cover.coverLines : [])
      .map(value => typeof value === 'string' ? value.trim() : '')
      .filter(Boolean).slice(0, TIME_SLOTS.length);
    if (!lines.length) {
      console.warn('[NewspaperLayout] TIME cover has no coverLines:', scene.jsonKey);
      return;
    }
    const context = scene.buildTemplateContext?.();
    lines.forEach((value, index) => {
      const slot = TIME_SLOTS[index];
      const content = context && typeof scene.fillTemplate === 'function'
        ? scene.fillTemplate(value, context) : value;
      const text = this.makeText(slot.x + slot.width / 2, slot.y + slot.height / 2,
        content, {
          fontFamily: 'SpecialElite',
          fontSize: `${slot.fontSize}px`,
          color: index === 0 ? '#161720' : '#282830',
          align: 'center',
          lineSpacing: 5,
          wordWrap: { width: slot.width, useAdvancedWrap: true }
        }, 0.5, 0.5);
      for (let size = slot.fontSize; size >= slot.minSize; size--) {
        text.setFontSize(size);
        if (text.width <= slot.width && text.height <= slot.height) break;
      }
      const fit = Math.min(1, slot.width / Math.max(1, text.width),
        slot.height / Math.max(1, text.height));
      if (fit < 1) text.setScale(fit);
      container.add(text);
      if (index === 0 && lines.length > 1) {
        const rule = scene.add.graphics();
        rule.lineStyle(3, 0xb71920, 1);
        rule.lineBetween(830, 644, 1090, 644);
        container.add(rule);
      }
    });
  }

  // =========================================================================
  // shared
  // =========================================================================

  makeText(x, y, text, style, originX = 0, originY = 0) {
    return this.scene.add.text(x, y, text, style).setOrigin(originX, originY);
  }

  makeImage(x, y, key, w, h) {
    const img = this.scene.add.image(x, y, key).setOrigin(0, 0);
    img.displayWidth = w;
    img.displayHeight = h;
    return img;
  }
}