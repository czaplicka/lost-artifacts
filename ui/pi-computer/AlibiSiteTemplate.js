import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const SITES = Object.freeze({
  copper: {
    brand: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_b4783cdbda4aa272dec8"),
    tagline: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_c0601e8367164641156e"),
    footer: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_e2e8c75ecef16f57a7a1"),
    background: 0xe7d5b5,
    paper: 0xfff7e7,
    header: 0x693727,
    trim: 0xb77743,
    navigation: 0xf3e4cc,
    photo: 0xd7c2a0,
    title: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_e84927ae2b5acd4cc41a"),
    ink: '#362c25',
    muted: '#74604e',
    headerText: '#fff0cf',
    headerMuted: '#e8c6a2',
    link: '#713b28',
    clue: '#852c52',
    known: '#35633f',
    links: [
      { label: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_0e2226b5235f0ff94a27"), pageId: 'copper_home' },
      { label: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_99af6606ff9d6cd5154d"), pageId: 'copper_menu' },
      { label: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_1a8c5ee7fcda5ea75fbd"), pageId: 'copper_notice' },
      { label: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_2b5c3d26721ae9c350cf"), pageId: 'copper_contact' }
    ]
  },

  club: {
    brand: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_ff2a51dce7fff690bfa6"),
    tagline: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_4c5292751941a8155ca3"),
    footer: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_d836449bdcbad49b3563"),
    background: 0x152f29,
    paper: 0xf2ecd9,
    header: 0x183e32,
    trim: 0xb79b59,
    navigation: 0xe6dcc1,
    photo: 0xc9bea1,
    title: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_d509ca0a65871f4e3804"),
    ink: '#2c352d',
    muted: '#686653',
    headerText: '#ecd7a0',
    headerMuted: '#c7cdb9',
    link: '#244e3d',
    clue: '#81355c',
    known: '#35633f',
    links: [
      { label: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_b7141497fc92ac0dbbc2"), pageId: 'club_home' },
      { label: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_40a2085371b8effbae52"), pageId: 'club_packages' },
      { label: __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_a3763557b6c7814e1c18"), pageId: 'club_contact' }
    ]
  }
});

function fit(search, x, y, value, width, size, color, pixel = false) {
  const drawing = search.ui.drawing;

  const label = drawing.text(
    x,
    y,
    String(value ?? ''),
    size,
    color,
    0,
    pixel ? 'pixel' : 'body'
  );

  drawing.fit(label, label.text, Math.max(1, width));

  return label;
}

function click(search, object, callback) {
  object
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => object.setAlpha(0.7))
    .on('pointerout', () => object.setAlpha(1))
    .on('pointerdown', () => {
      search.ui.options.onSfx?.('click');
      callback();
    });

  return object;
}

function button(search, x, y, width, label, enabled, callback) {
  const drawing = search.ui.drawing;

  drawing.bevel(
    x,
    y,
    width,
    28,
    enabled ? 0xe2d7bc : 0xc6c0b1
  );

  const hit = drawing.rectangle(
    x,
    y,
    width,
    28,
    0xffffff,
    0.001
  );

  fit(
    search,
    x + 7,
    y + 7,
    label,
    width - 14,
    12,
    enabled ? '#303b32' : '#807b70'
  );

  if (enabled) {
    click(search, hit, callback);
  }
}

function renderPhoto(search, page, box, palette) {
  const drawing = search.ui.drawing;
  const padding = 10;

  drawing.rectangle(
    box.x,
    box.y,
    box.w,
    box.h,
    palette.navigation
  );

  drawing.rectangle(
    box.x,
    box.y,
    box.w,
    3,
    palette.trim
  );

  fit(
    search,
    box.x + padding,
    box.y + 12,
    page.imageHeading || 'WELCOME',
    box.w - padding * 2,
    9,
    palette.title,
    true
  );

  const imageX = box.x + padding;
  const imageY = box.y + 35;
  const imageW = box.w - padding * 2;
  const captionH = 44;
  const imageH = Math.max(1, box.h - 35 - captionH);

  drawing.rectangle(
    imageX,
    imageY,
    imageW,
    imageH,
    palette.photo
  );

  const image = search.art(
    page.imageKey,
    imageX + 3,
    imageY + 3,
    Math.max(1, imageW - 6),
    Math.max(1, imageH - 6)
  );

  if (!image) {
    fit(
      search,
      imageX + 8,
      imageY + 12,
      __dialogueText("ui/pi-computer/AlibiSiteTemplate.js", "t_415383a0c49f598c0dd9"),
      imageW - 16,
      10,
      palette.muted
    );
  }

  const caption = drawing.text(
    box.x + padding,
    box.y + box.h - captionH + 7,
    page.imageCaption || '',
    12,
    palette.muted,
    box.w - padding * 2,
    'body'
  );

  if (caption.height > captionH - 10) {
    drawing.fit(
      caption,
      page.imageCaption || '',
      box.w - padding * 2
    );
  }
}

function renderBody(search, page, box, palette, compact) {
  const drawing = search.ui.drawing;

  fit(
    search,
    box.x,
    box.y,
    page.heading || page.title,
    box.w,
    compact ? 17 : 21,
    palette.title
  );

  drawing.rectangle(
    box.x,
    box.y + 30,
    box.w,
    2,
    palette.trim
  );

  const fontSize = compact ? 14 : 16;
  const lineHeight = compact ? 22 : 26;
  const textY = box.y + 43;

  const available = Math.max(1, box.h - 43);
  const perPage = Math.max(
    1,
    Math.floor(available / lineHeight)
  );

  // Navigation is separate; do not repeat it inside the article.
  const lines = search.retroArticleLines(
    { ...page, links: [] },
    box.w,
    fontSize
  );

  const count = Math.max(
    1,
    Math.ceil(lines.length / perPage)
  );

  search.bodyPage = Math.max(
    0,
    Math.min(
      count - 1,
      Number(search.bodyPage) || 0
    )
  );

  const known = new Set(search.progress.known || []);
  const visible = lines.slice(
    search.bodyPage * perPage,
    (search.bodyPage + 1) * perPage
  );

  visible.forEach((line, index) => {
    let x = box.x;
    const y = textY + index * lineHeight;

    for (const part of line) {
      const keyword = Boolean(part.keywordId);
      const collected = keyword && known.has(part.keywordId);

      const color = part.pageId
        ? palette.link
        : keyword
          ? collected ? palette.known : palette.clue
          : palette.ink;

      const label = drawing.text(
        x,
        y,
        part.text,
        fontSize,
        color,
        0,
        'body'
      );

      if (keyword || part.pageId) {
        const underlineColor = Number.parseInt(
          color.slice(1),
          16
        );

        drawing.rectangle(
          x,
          y + label.height,
          Math.max(1, label.width),
          1,
          underlineColor
        );

        click(search, label, () => {
          if (part.pageId) {
            search.openPage(part.pageId);
          } else {
            search.collect(part.keywordId);
          }
        });
      }

      x += search.textWidth(part.text, fontSize);
    }
  });

  return count;
}

export function renderAlibiSite(search, page, area) {
  const palette = SITES[page.alibiSite];

  if (!palette) return false;

  const drawing = search.ui.drawing;
  const compact = area.w < 720 || area.h < 410;
  const padding = compact ? 12 : 18;
  const gap = compact ? 10 : 18;
  const headerH = compact ? 65 : 78;

  drawing.rectangle(
    area.x,
    area.y,
    area.w,
    area.h,
    palette.background
  );

  const sheet = {
    x: area.x + 5,
    y: area.y + 5,
    w: Math.max(1, area.w - 10),
    h: Math.max(1, area.h - 10)
  };

  drawing.rectangle(
    sheet.x,
    sheet.y,
    sheet.w,
    sheet.h,
    palette.paper
  );

  drawing.rectangle(
    sheet.x,
    sheet.y,
    sheet.w,
    headerH,
    palette.header
  );

  drawing.rectangle(
    sheet.x,
    sheet.y + headerH - 3,
    sheet.w,
    3,
    palette.trim
  );

  fit(
    search,
    sheet.x + padding,
    sheet.y + 13,
    palette.brand,
    sheet.w - padding * 2,
    compact ? 13 : 17,
    palette.headerText,
    true
  );

  fit(
    search,
    sheet.x + padding,
    sheet.y + headerH - 26,
    palette.tagline,
    sheet.w - padding * 2,
    compact ? 12 : 14,
    palette.headerMuted
  );

  const validIds = new Set(
    search.definition.pages.map(item => item.id)
  );

  const links = [];
  const seen = new Set();

  for (const link of [
    ...palette.links,
    ...(page.links || [])
  ]) {
    if (
      !validIds.has(link.pageId) ||
      seen.has(link.pageId)
    ) {
      continue;
    }

    seen.add(link.pageId);
    links.push(link);
  }

  const navX = sheet.x + padding;
  const navW = Math.max(1, sheet.w - padding * 2);
  const navTop = sheet.y + headerH + 10;

  let cursorX = navX;
  let cursorY = navTop;

  for (const link of links) {
    const active = link.pageId === page.id;
    const value = active ? `[ ${link.label} ]` : link.label;

    const label = fit(
      search,
      cursorX,
      cursorY,
      value,
      navW,
      compact ? 13 : 15,
      active ? palette.title : palette.link
    );

    if (
      cursorX > navX &&
      cursorX + label.width > navX + navW
    ) {
      cursorX = navX;
      cursorY += 25;
      label.setPosition(cursorX, cursorY);
    }

    if (!active) {
      click(search, label, () => search.openPage(link.pageId));
    }

    cursorX += label.width + 22;
  }

  const contentY = cursorY + 31;
  const footerY = sheet.y + sheet.h - 55;
  const contentH = Math.max(1, footerY - contentY - 10);

  const content = {
    x: navX,
    y: contentY,
    w: navW,
    h: contentH
  };

  const hasImage = Boolean(
    page.imageKey &&
    page.showImage !== false
  );

  const sideImage = (
    hasImage &&
    content.w >= 540 &&
    content.h >= 140
  );

  const topImage = (
    hasImage &&
    !sideImage &&
    content.h >= 290
  );

  const article = { ...content };

  if (sideImage) {
    const photoW = Math.min(
      300,
      Math.floor(content.w * 0.36)
    );

    article.w = content.w - photoW - gap;

    renderPhoto(
      search,
      page,
      {
        x: content.x + article.w + gap,
        y: content.y,
        w: photoW,
        h: content.h
      },
      palette
    );
  } else if (topImage) {
    const photoH = Math.min(
      175,
      Math.floor(content.h * 0.42)
    );

    renderPhoto(
      search,
      page,
      {
        x: content.x,
        y: content.y,
        w: content.w,
        h: photoH
      },
      palette
    );

    article.y += photoH + gap;
    article.h -= photoH + gap;
  }

  const count = renderBody(
    search,
    page,
    article,
    palette,
    compact
  );

  drawing.rectangle(
    navX,
    footerY,
    navW,
    1,
    palette.trim
  );

  button(
    search,
    navX,
    footerY + 7,
    42,
    '<',
    search.bodyPage > 0,
    () => {
      search.bodyPage--;
      search.refresh();
    }
  );

  fit(
    search,
    navX + 52,
    footerY + 14,
    `${search.bodyPage + 1} / ${count}`,
    60,
    12,
    palette.muted
  );

  button(
    search,
    navX + 115,
    footerY + 7,
    42,
    '>',
    search.bodyPage < count - 1,
    () => {
      search.bodyPage++;
      search.refresh();
    }
  );

  if (navW > 480) {
    fit(
      search,
      navX + 175,
      footerY + 15,
      palette.footer,
      navW - 270,
      11,
      palette.muted
    );
  }

  button(
    search,
    navX + navW - 78,
    footerY + 7,
    78,
    'NOTES',
    true,
    () => {
      if (search.ui.caseCloudNotebook) {
        search.ui.caseCloudNotebook.toggle();
      } else {
        search.notesOpen = !search.notesOpen;
        search.refresh();
      }
    }
  );

  return true;
}