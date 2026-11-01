import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';

const TIME_SLOTS = [
  { x: 500, y: 476, width: 920, height: 150, fontSize: 48, minSize: 30 },
  { x: 500, y: 662, width: 920, height: 90, fontSize: 32, minSize: 24 },
  { x: 500, y: 783, width: 920, height: 90, fontSize: 32, minSize: 24 },
  { x: 500, y: 904, width: 920, height: 90, fontSize: 32, minSize: 24 }
];

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

  renderDaily(container, layout, cityData) {
    const title = this.makeText(layout.title.x, layout.title.y, cityData.title || '', {
      fontFamily: 'SpecialElite', fontSize: '50px', color: '#1e1a16', align: 'left'
    });
    const subtitle = this.makeText(layout.subtitle.x, layout.subtitle.y, cityData.subtitle || '', {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#4c433b', align: 'left'
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
      if (article.imageKey) {
        const imageConfig = article.image || {};
        const image = this.makeImage(
          imageConfig.x ?? (slot.x + slot.width - 120),
          imageConfig.y ?? (slot.y + 20), article.imageKey,
          imageConfig.width ?? 220, imageConfig.height ?? 140
        );
        container.add(image);
      }
      const headline = this.makeText(slot.x, slot.y, article.headline || '', {
        fontFamily: 'SpecialElite', fontSize: `${slot.headlineSize}px`, color: '#201912',
        wordWrap: { width: slot.width }, align: 'left', lineSpacing: 8
      });
      const lead = article.lead ? this.makeText(slot.x, headline.y + headline.height + 8,
        article.lead, {
          fontFamily: 'SpecialElite', fontSize: '18px', color: '#4b3e33',
          wordWrap: { width: slot.width }, align: 'left', lineSpacing: 6
        }) : null;
      const bodyY = lead ? lead.y + lead.height + 10 : headline.y + headline.height + 20;
      const body = this.makeText(slot.x, bodyY, article.body || '', {
        fontFamily: 'SpecialElite', fontSize: `${slot.bodySize}px`, color: '#2f271f',
        wordWrap: { width: slot.width }, align: 'left', lineSpacing: 10
      });
      if (lead) container.add(lead);
      container.add([headline, body]);
      if (article.imageCaption && article.image) {
        const imageRight = article.image.x + article.image.width;
        const captionX = imageRight + 40;
        const captionMaxWidth = Math.max(160, slot.x + slot.width - captionX - 14);
        const cap = this.makeText(captionX, article.image.y, article.imageCaption, {
          fontFamily: 'SpecialElite', fontSize: '20px', color: '#6a5a4d',
          wordWrap: { width: captionMaxWidth }, align: 'left'
        });
        cap.y = article.image.y + (article.image.height - cap.height) / 2;
        container.add(cap);
      }
    });
  }

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

  renderTime(container, _layout, cityData) {
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