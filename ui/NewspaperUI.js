import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';

export class NewspaperLayout {
  constructor(scene) {
    this.scene = scene;
  }

  render(container, config) {
    const layout = NewspaperLayoutConfig[config.type];
    if (!layout) {
      throw new Error(`Unknown newspaper layout type: ${config.type}`);
    }

    if (config.type === 'daily') {
      this.renderDaily(container, layout, config.data);
      return;
    }

    if (config.type === 'tabloid') {
      this.renderTabloid(container, layout, config.data);
      return;
    }

    if (config.type === 'time') {
      this.renderTime(container, layout, config.data);
      return;
    }
  }

renderDaily(container, layout, cityData) {
  const title = this.makeText(layout.title.x, layout.title.y, cityData.title || '', {
    fontFamily: 'SpecialElite',
    fontSize: '56px',
    color: '#1e1a16',
    align: 'left'    // lewy
  }, layout.title.originX, layout.title.originY);

  const subtitle = this.makeText(layout.subtitle.x, layout.subtitle.y, cityData.subtitle || '', {
    fontFamily: 'SpecialElite',
    fontSize: '24px',
    color: '#4c433b',
    align: 'left'    // lewy
  }, layout.subtitle.originX, layout.subtitle.originY);

    container.add([title, subtitle]);

    const articlesBySlot = {};
    (cityData.articles || []).forEach((article, index) => {
      const slotId = article.slotId || layout.articles[index]?.id;
      if (slotId) {
        articlesBySlot[slotId] = article;
      }
    });

    layout.articles.forEach((slot) => {
      const article = articlesBySlot[slot.id];
      if (!article) return;

      if (article.imageKey) {
        const image = this.makeImage(slot.x + slot.width - 120, slot.y + 20, article.imageKey, 220, 140);
        container.add(image);
      }

      const headline = this.makeText(slot.x, slot.y, article.headline || '', {
        fontFamily: 'SpecialElite',
        fontSize: `${slot.headlineSize}px`,
        color: '#201912',
        wordWrap: { width: slot.width },
        align: 'left',
        lineSpacing: 8
      });

      const lead = article.lead ? this.makeText(slot.x, headline.y + headline.height + 8, article.lead, {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#4b3e33',
        wordWrap: { width: slot.width },
        align: 'left',
        lineSpacing: 6
      }) : null;

      const bodyY = lead ? lead.y + lead.height + 10 : headline.y + headline.height + 20;

      const body = this.makeText(slot.x, bodyY, article.body || '', {
        fontFamily: 'SpecialElite',
        fontSize: `${slot.bodySize}px`,
        color: '#2f271f',
        wordWrap: { width: slot.width },
        align: 'left',
        lineSpacing: 10
      });

      if (lead) container.add(lead);
      container.add([headline, body]);

      if (article.imageCaption) {
        const cap = this.makeText(slot.x, slot.y + slot.height - 40, article.imageCaption, {
          fontFamily: 'SpecialElite',
          fontSize: '14px',
          color: '#6a5a4d',
          wordWrap: { width: slot.width - 20 },
          align: 'left'
        });
        container.add(cap);
      }
    });
  }

renderTabloid(container, layout, cityData) {
  const title = this.makeText(layout.title.x, layout.title.y, cityData.title || '', {
    fontFamily: 'SpecialElite',
    fontSize: '60px',
    color: '#2a1313',
    align: 'left'
  }, layout.title.originX, layout.title.originY);

  const subtitle = this.makeText(layout.subtitle.x, layout.subtitle.y, cityData.subtitle || '', {
    fontFamily: 'SpecialElite',
    fontSize: '24px',
    color: '#5c4545',
    align: 'left'
  }, layout.subtitle.originX, layout.subtitle.originY);

    container.add([title, subtitle]);

    const articlesBySlot = {};
    (cityData.articles || []).forEach((article, index) => {
      const slotId = article.slotId || layout.articles[index]?.id;
      if (slotId) {
        articlesBySlot[slotId] = article;
      }
    });

    layout.articles.forEach((slot) => {
      const article = articlesBySlot[slot.id];
      if (!article) return;

      const headline = this.makeText(slot.x, slot.y, article.headline || '', {
        fontFamily: 'SpecialElite',
        fontSize: `${slot.headlineSize}px`,
        color: '#2a1616',
        wordWrap: { width: slot.width },
        align: 'left',
        lineSpacing: 8
      });

      const lead = article.lead ? this.makeText(slot.x, headline.y + headline.height + 8, article.lead, {
        fontFamily: 'SpecialElite',
        fontSize: '17px',
        color: '#5b4747',
        wordWrap: { width: slot.width },
        align: 'left',
        lineSpacing: 6
      }) : null;

      const bodyY = lead ? lead.y + lead.height + 10 : headline.y + headline.height + 20;

      const body = this.makeText(slot.x, bodyY, article.body || '', {
        fontFamily: 'SpecialElite',
        fontSize: `${slot.bodySize}px`,
        color: '#3a2a2a',
        wordWrap: { width: slot.width },
        align: 'left',
        lineSpacing: 10
      });

      if (lead) container.add(lead);
      container.add([headline, body]);
    });
  }

  renderTime(container, layout, cityData) {
    const title = this.makeText(layout.title.x, layout.title.y, cityData.title || 'Time', {
      fontFamily: 'Times New Roman',
      fontStyle: 'bold',
      fontSize: '110px',
      color: '#b31515',
      align: 'left'
    }, layout.title.originX, layout.title.originY);

    container.add(title);

    (cityData.coverLines || []).slice(0, 4).forEach((line, index) => {
      const slot = layout.coverLines[index];
      if (!slot) return;

      const text = this.makeText(slot.x, slot.y, line, {
        fontFamily: 'Arial',
        fontStyle: 'bold',
        fontSize: `${slot.fontSize}px`,
        color: '#111111',
        wordWrap: { width: slot.width },
        align: 'left',
        lineSpacing: 6
      });

      container.add(text);
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