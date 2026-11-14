import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  ComputerSearch as ComputerSearchCore
} from './ComputerSearchCore.js';

import {
  expandDeadMenSearch
} from './DeadMenSearchExpansion.js';

export * from './ComputerSearchCore.js';

const MAGAZINE_THEMES = new Set([
  'magazine',
  'tabloid',
  'gossip'
]);

const COLORS = {
  frame: 0x3d304a,
  chrome: 0x4a3b57,
  chromeDark: 0x2d2238,
  paper: 0xede6d5,
  panel: 0xf7f3e8,
  toolbar: 0xb0a48f,
  banner: 0x8c2663,
  bannerDark: 0x4a1235,
  photo: 0xd9d0be,

  ink: '#2b2330',
  muted: '#716452',
  cream: '#ffe7a1',
  keyword: '#8c2663',
  collected: '#346148'
};

export function isPhoneSearchKeyword(keyword) {
  if (!keyword || typeof keyword !== 'object') {
    return false;
  }

  const label = String(
    keyword.label || ''
  ).trim();

  if (label.includes('@')) return false;

  const explicit = [
    keyword.number,
    keyword.phone,
    keyword.telephone
  ];

  if (
    explicit.some(value =>
      /^\+?[\d\s()-]{3,}$/.test(
        String(value ?? '').trim()
      )
    )
  ) {
    return true;
  }

  if (
    /^(?:tel(?:ephone)?|phone)?\s*:?\s*\d{3}(?:\s*[—–-]\s*.+)?$/i
      .test(label)
  ) {
    return true;
  }

  const phoneId =
    /(?:^|_)(?:phone|telephone|tel|number)(?:_|$)/i
      .test(String(keyword.id || ''));

  return (
    phoneId &&
    /(?:^|\D)\d{3}(?!\d)/.test(label) &&
    !/\d:\d/.test(label)
  );
}

export class ComputerSearch extends ComputerSearchCore {
  get definition() {
    expandDeadMenSearch(this.data);

    const definition = super.definition;

    if (
      !this._hidePhoneSuggestions ||
      !definition
    ) {
      return definition;
    }

    return {
      ...definition,
      keywords: definition.keywords.filter(
        keyword => !isPhoneSearchKeyword(keyword)
      )
    };
  }

  get progress() {
    const progress = super.progress;

    if (!this._hidePhoneSuggestions) {
      return progress;
    }

    const definition = super.definition;

    const hidden = new Set(
      (definition?.keywords || [])
        .filter(isPhoneSearchKeyword)
        .map(keyword => keyword.id)
    );

    return {
      ...progress,
      known: (progress.known || []).filter(
        id => !hidden.has(id)
      )
    };
  }

  render() {
    const page = this.definition?.pages?.find(
      item => item.id === this.pageId
    );

    if (
      this.view === 'page' &&
      page &&
      this.isRetroMagazine(page)
    ) {
      this.renderRetroMagazine(page);
      return;
    }

    const previous = this._hidePhoneSuggestions;

    this._hidePhoneSuggestions =
      this.view !== 'page';

    try {
      return super.render();
    } finally {
      this._hidePhoneSuggestions = previous;
    }
  }

  isRetroMagazine(page) {
    if (page.layout === 'default') return false;

    return (
      page.layout === 'retro-magazine' ||
      MAGAZINE_THEMES.has(page.theme)
    );
  }

  retroText(
    x,
    y,
    value,
    size = 16,
    color = COLORS.ink,
    width = 0,
    pixel = false
  ) {
    return this.ui.drawing.text(
      x,
      y,
      value,
      size,
      color,
      width,
      pixel ? 'pixel' : 'body'
    );
  }

  retroFit(
    x,
    y,
    value,
    width,
    size = 12,
    color = COLORS.ink,
    pixel = false
  ) {
    const text = this.retroText(
      x,
      y,
      value,
      size,
      color,
      0,
      pixel
    );

    this.ui.drawing.fit(
      text,
      String(value),
      Math.max(1, width)
    );

    return text;
  }

  retroButton(
    x,
    y,
    width,
    height,
    label,
    callback,
    {
      enabled = true,
      pink = false
    } = {}
  ) {
    const drawing = this.ui.drawing;

    const normal = pink
      ? 0x9d3170
      : 0xd8ceb9;

    const hover = pink
      ? 0xb83b83
      : 0xeee5d2;

    drawing.bevel(
      x,
      y,
      width,
      height,
      enabled ? normal : 0xb8ae9d
    );

    const hit = drawing.rectangle(
      x,
      y,
      width,
      height,
      normal,
      0.001
    );

    const caption = this.retroFit(
      x + 6,
      y,
      label,
      width - 12,
      9,
      enabled
        ? pink ? '#ffffff' : '#302735'
        : '#827968',
      true
    );

    caption.setY(
      y + Math.round(
        (height - caption.height) / 2
      )
    );

    if (enabled) {
      hit
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          hit.setFillStyle(hover, 0.3);
        })
        .on('pointerout', () => {
          hit.setFillStyle(normal, 0.001);
        })
        .on('pointerdown', () => {
          this.ui.options.onSfx?.('click');
          callback();
        });
    }

    return hit;
  }

  retroPanel(
    x,
    y,
    width,
    height,
    color = COLORS.panel
  ) {
    this.ui.drawing.bevel(
      x,
      y,
      width,
      height,
      color,
      true
    );
  }

  renderRetroMagazine(page) {
    const ui = this.ui;
    const drawing = ui.drawing;
    const layout = ui.layout;

    const bounds = {
      x: layout.x + 14,
      y: layout.y + 10,
      w: layout.w - 28,
      h: layout.h - 58
    };

    ui.window = bounds;

    const compact =
      bounds.w < 760 ||
      bounds.h < 470;

    const gap = compact ? 8 : 12;
    const brand = page.brand || __dialogueText("ui/pi-computer/ComputerSearch.js", "t_c6bff8c5af6e1e2792c0");

    drawing.rectangle(
      bounds.x + 5,
      bounds.y + 5,
      bounds.w,
      bounds.h,
      0x000000,
      0.35
    );

    drawing.rectangle(
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      COLORS.paper
    );

    drawing.frame(
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      COLORS.frame,
      1,
      4
    );

    drawing.rectangle(
      bounds.x + 4,
      bounds.y + 4,
      bounds.w - 8,
      30,
      COLORS.chrome
    );

    drawing.rectangle(
      bounds.x + 12,
      bounds.y + 10,
      18,
      18,
      0xd63384
    );

    this.retroText(
      bounds.x + 16,
      bounds.y + 14,
      '!',
      10,
      '#ffffff',
      0,
      true
    );

    this.retroFit(
      bounds.x + 40,
      bounds.y + 14,
      `${__dialogueText("ui/pi-computer/ComputerSearch.js", "t_6a5469aa820b1a95a6fd")}${brand}`,
      bounds.w - 178,
      compact ? 8 : 9,
      COLORS.cream,
      true
    );

    this.retroButton(
      bounds.x + bounds.w - 34,
      bounds.y + 8,
      24,
      22,
      'X',
      () => this.back()
    );

    const addressY = bounds.y + 37;
    const addressHeight = 32;

    drawing.rectangle(
      bounds.x + 4,
      addressY - 3,
      bounds.w - 8,
      39,
      COLORS.toolbar
    );

    this.retroButton(
      bounds.x + 10,
      addressY,
      42,
      addressHeight,
      '<',
      () => this.back()
    );

    this.retroButton(
      bounds.x + 57,
      addressY,
      62,
      addressHeight,
      'OWL',
      () => this.goHome()
    );

    const addressX = bounds.x + 126;
    const addressWidth = bounds.w - 192;

    this.retroPanel(
      addressX,
      addressY,
      addressWidth,
      addressHeight
    );

    this.retroFit(
      addressX + 9,
      addressY + 9,
      page.address ||
        page.url ||
        `${brand} / ${page.id}`,
      addressWidth - 18,
      compact ? 12 : 14,
      '#285c48'
    );

    this.retroButton(
      bounds.x + bounds.w - 58,
      addressY,
      48,
      addressHeight,
      __dialogueText("ui/pi-computer/ComputerSearch.js", "t_64db8c5cb274ab232479"),
      () => this.refresh(),
      { pink: true }
    );

    const bannerX = bounds.x + gap;
    const bannerY = bounds.y + 80;
    const bannerW = bounds.w - gap * 2;
    const bannerH = compact ? 55 : 69;

    drawing.rectangle(
      bannerX + 3,
      bannerY + 3,
      bannerW,
      bannerH,
      0x000000,
      0.22
    );

    drawing.rectangle(
      bannerX,
      bannerY,
      bannerW,
      bannerH,
      COLORS.banner
    );

    drawing.frame(
      bannerX,
      bannerY,
      bannerW,
      bannerH,
      COLORS.bannerDark,
      1,
      3
    );

    this.retroFit(
      bannerX + 12,
      bannerY + 12,
      brand,
      bannerW - 24,
      compact ? 14 : 18,
      '#ffe46b',
      true
    );

    this.retroFit(
      bannerX + 12,
      bannerY + bannerH - 20,
      page.tagline ||
        __dialogueText("ui/pi-computer/ComputerSearch.js", "t_e7e369c16fb8c5179d81"),
      bannerW - 24,
      compact ? 10 : 12,
      '#f5c9de'
    );

    const tickerY = bannerY + bannerH + gap;

    drawing.rectangle(
      bannerX,
      tickerY,
      bannerW,
      24,
      0x18131b
    );

    this.retroText(
      bannerX + 7,
      tickerY + 6,
      __dialogueText("ui/pi-computer/ComputerSearch.js", "t_74c56d5c885b8df9266c"),
      8,
      '#ff818b',
      0,
      true
    );

    this.retroFit(
      bannerX + 65,
      tickerY + 5,
      page.ticker ||
        page.snippet ||
        __dialogueText("ui/pi-computer/ComputerSearch.js", "t_ca3fd65b468e302a7a1d"),
      bannerW - 74,
      12,
      '#ffe46b'
    );

    const contentY = tickerY + 24 + gap;
    const footerY = bounds.y + bounds.h - 36;

    const contentH = Math.max(
      50,
      footerY - contentY - gap
    );

    // A page without a declared photograph uses the full width.
    const showPortrait = Boolean(
      page.imageKey &&
      page.showImage !== false &&
      bounds.w >= 650 &&
      contentH >= 125
    );

    const portraitW = showPortrait
      ? Math.min(
          260,
          Math.floor(bannerW * 0.29)
        )
      : 0;

    const articleW = showPortrait
      ? bannerW - portraitW - gap
      : bannerW;

    this.renderRetroArticle(
      page,
      bannerX,
      contentY,
      articleW,
      contentH,
      compact
    );

    if (showPortrait) {
      this.renderRetroPortrait(
        page,
        bannerX + articleW + gap,
        contentY,
        portraitW,
        contentH
      );
    }

    this.renderRetroFooter(
      page,
      bannerX,
      footerY,
      bannerW
    );
  }

  renderRetroArticle(
    page,
    x,
    y,
    width,
    height,
    compact
  ) {
    const drawing = this.ui.drawing;
    const padding = compact ? 10 : 14;

    this.retroPanel(x, y, width, height);

    const innerX = x + padding;
    const innerW = width - padding * 2;

    const title =
      page.heading ||
      page.title ||
      __dialogueText("ui/pi-computer/ComputerSearch.js", "t_f74e23c21f4131b4bb77");

    this.retroFit(
      innerX,
      y + 13,
      title,
      innerW,
      compact ? 10 : 12,
      '#47213e',
      true
    );

    drawing.rectangle(
      innerX,
      y + 38,
      innerW,
      2,
      0xb6a992
    );

    const textY = y + 49;
    const metaHeight = height >= 170 ? 28 : 0;

    const textHeight = Math.max(
      24,
      height - 54 - metaHeight
    );

    const fontSize = compact ? 14 : 16;
    const lineHeight = compact ? 23 : 26;

    const lines = this.retroArticleLines(
      page,
      innerW,
      fontSize
    );

    const perPage = Math.max(
      1,
      Math.floor(textHeight / lineHeight)
    );

    const pageCount = Math.max(
      1,
      Math.ceil(lines.length / perPage)
    );

    this.bodyPage = Math.min(
      pageCount - 1,
      Math.max(0, Number(this.bodyPage) || 0)
    );

    this.retroPageCount = pageCount;

    const visible = lines.slice(
      this.bodyPage * perPage,
      (this.bodyPage + 1) * perPage
    );

    visible.forEach((line, index) => {
      let cursorX = innerX;
      const lineY = textY + index * lineHeight;

      for (const part of line) {
        const keyword = Boolean(part.keywordId);

        const known =
          keyword &&
          this.progress.known.includes(
            part.keywordId
          );

        const color = part.pageId
          ? '#315a8b'
          : keyword
            ? known
              ? COLORS.collected
              : COLORS.keyword
            : COLORS.ink;

        const label = this.retroText(
          cursorX,
          lineY,
          part.text,
          fontSize,
          color
        );

        if (keyword || part.pageId) {
          drawing.rectangle(
            cursorX,
            lineY + label.height + 1,
            Math.max(1, label.width),
            1,
            part.pageId
              ? 0x315a8b
              : known
                ? 0x346148
                : 0x8c2663
          );

          label
            .setInteractive({
              useHandCursor: true
            })
            .on('pointerover', () => {
              label.setAlpha(0.65);
            })
            .on('pointerout', () => {
              label.setAlpha(1);
            })
            .on('pointerdown', () => {
              this.ui.options.onSfx?.('click');

              if (part.pageId) {
                this.openPage(part.pageId);
              } else {
                this.collect(part.keywordId);
              }
            });
        }

        cursorX += this.textWidth(
          part.text,
          fontSize
        );
      }
    });

    if (metaHeight) {
      const metaY = y + height - 25;

      drawing.rectangle(
        innerX,
        metaY,
        innerW,
        1,
        0xb6a992
      );

      this.retroFit(
        innerX,
        metaY + 7,
        [
          `${__dialogueText("ui/pi-computer/ComputerSearch.js", "t_3c724ef2b86ef0ae1745")}${
            page.author ||
            page.reporter ||
            __dialogueText("ui/pi-computer/ComputerSearch.js", "t_a851cdc8e238285fcad7")
          }`,
          page.category || 'FEATURES'
        ].join('  /  '),
        innerW,
        10,
        COLORS.muted
      );
    }
  }

  retroArticleLines(page, width, fontSize) {
    const keywords =
      this.definition?.keywords || [];

    const blocks = (page.blocks || []).map(
      block => block.map(part => {
        if (typeof part === 'string') {
          return { text: part };
        }

        const keyword = keywords.find(
          item => item.id === part.keywordId
        );

        return {
          text:
            part.text ??
            keyword?.label ??
            '',
          keywordId: part.keywordId
        };
      })
    );

    for (const link of page.links || []) {
      blocks.push([
        {
          text: `${__dialogueText("ui/pi-computer/ComputerSearch.js", "t_ec4f8e3d1f7cafbdb86e")}${link.label}`,
          pageId: link.pageId
        }
      ]);
    }

    const lines = [];

    for (const block of blocks) {
      let line = [];
      let used = 0;

      const flush = () => {
        if (line.length) lines.push(line);
        line = [];
        used = 0;
      };

      for (const part of block) {
        const tokens =
          String(part.text).match(
            /\n|[^\S\n]+|[^\s]+/g
          ) || [];

        for (let token of tokens) {
          if (token === '\n') {
            flush();
            continue;
          }

          const whitespace = /^\s+$/.test(token);

          if (whitespace) {
            if (!line.length) continue;
            token = ' ';
          }

          const tokenWidth = this.textWidth(
            token,
            fontSize
          );

          if (
            used + tokenWidth > width &&
            line.length
          ) {
            flush();
            if (whitespace) continue;
          }

          if (tokenWidth > width) {
            let fragment = '';

            for (const character of token) {
              const candidate =
                fragment + character;

              if (
                fragment &&
                this.textWidth(
                  candidate,
                  fontSize
                ) > width
              ) {
                line.push({
                  ...part,
                  text: fragment
                });

                flush();
                fragment = character;
              } else {
                fragment = candidate;
              }
            }

            if (fragment) {
              line.push({
                ...part,
                text: fragment
              });

              used = this.textWidth(
                fragment,
                fontSize
              );
            }

            continue;
          }

          const previous = line[line.length - 1];

          if (
            previous &&
            previous.keywordId === part.keywordId &&
            previous.pageId === part.pageId
          ) {
            previous.text += token;
          } else {
            line.push({
              ...part,
              text: token
            });
          }

          used += tokenWidth;
        }
      }

      flush();
      lines.push([]);
    }

    if (
      lines.length &&
      !lines[lines.length - 1].length
    ) {
      lines.pop();
    }

    return lines;
  }

  renderRetroPortrait(
    page,
    x,
    y,
    width,
    height
  ) {
    const drawing = this.ui.drawing;

    this.retroPanel(x, y, width, height);

    this.retroFit(
      x + 10,
      y + 12,
      page.imageHeading || __dialogueText("ui/pi-computer/ComputerSearch.js", "t_b7e1b5d0d1aa21f9351d"),
      width - 20,
      8,
      '#544735',
      true
    );

    const photoX = x + 10;
    const photoY = y + 36;
    const photoW = width - 20;
    const photoH = Math.max(35, height - 72);

    drawing.rectangle(
      photoX,
      photoY,
      photoW,
      photoH,
      COLORS.photo
    );

    drawing.frame(
      photoX,
      photoY,
      photoW,
      photoH,
      0x524636,
      1,
      3
    );

    const image = this.art(
      page.imageKey,
      photoX + 5,
      photoY + 5,
      Math.max(1, photoW - 10),
      Math.max(1, photoH - 10)
    );

    if (!image) {
      this.retroFit(
        photoX + 8,
        photoY + 16,
        __dialogueText("ui/pi-computer/ComputerSearch.js", "t_81e8132432559fda2441"),
        photoW - 16,
        8,
        '#756852'
      );
    }

    this.retroFit(
      x + 10,
      y + height - 24,
      page.imageCaption ||
        page.caption ||
        __dialogueText("ui/pi-computer/ComputerSearch.js", "t_496bdf960b951f36e329"),
      width - 20,
      10,
      COLORS.muted
    );
  }

  renderRetroFooter(page, x, y, width) {
    const count = this.retroPageCount || 1;

    this.retroButton(
      x,
      y,
      48,
      27,
      '<',
      () => {
        this.bodyPage--;
        this.refresh();
      },
      { enabled: this.bodyPage > 0 }
    );

    this.retroButton(
      x + 54,
      y,
      48,
      27,
      '>',
      () => {
        this.bodyPage++;
        this.refresh();
      },
      { enabled: this.bodyPage < count - 1 }
    );

    this.retroFit(
      x + 112,
      y + 8,
      `${this.bodyPage + 1} / ${count}`,
      100,
      11,
      COLORS.muted
    );

    const notesWidth = 84;

    if (width > 460) {
      this.retroFit(
        x + 212,
        y + 8,
        __dialogueText("ui/pi-computer/ComputerSearch.js", "t_77a8ccdcd5cfcf1e0758"),
        width - 212 - notesWidth - 16,
        10,
        COLORS.muted
      );
    }

    this.retroButton(
      x + width - notesWidth,
      y,
      notesWidth,
      27,
      'NOTES',
      () => {
        if (this.ui.caseCloudNotebook) {
          this.ui.caseCloudNotebook.toggle();
        } else {
          this.notesOpen = !this.notesOpen;
          this.refresh();
        }
      },
      { pink: true }
    );
  }
}