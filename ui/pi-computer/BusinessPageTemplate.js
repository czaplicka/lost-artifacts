import { drawWebsiteNavigation } from './WebsiteNavigation.js';
import {
  isForumPage,
  renderForum
} from './ForumPageTemplate.js';

import {
  organisationKind,
  renderOrganisation
} from './OrganisationPageTemplate.js';

import {
  isPublicDirectoryPage,
  renderPublicDirectory
} from './PublicDirectoryTemplate.js';

const INSTALLED = Symbol('business-pages');

const FAMILY_PAGE_IDS = new Set([
  'dm_memorial',
  'dm_family_contact',
  'dm_margaret_thanks'
]);

const CLUB_PAGE_IDS = new Set([
  'dm_edward_bowls_namesake'
]);

const ALIBI_TEMPLATES = {
  copper_home: 'restaurant',
  copper_menu: 'restaurant',
  copper_notice: 'restaurant',
  copper_contact: 'restaurant',

  club_home: 'business',
  club_packages: 'business',
  club_contact: 'business',

  nora_profile: 'directory',
  simon_profile: 'directory',
  evelyn_profile: 'directory',

  pie_results: 'organisation',
  game_results: 'association',

  morrow_notice: 'business',
  morrow_contact: 'business',

  search_context: 'news',
  search_noise: 'classifieds',
  cooker_repair: 'business',

  arthur_directory: 'directory',
  arthur_namesake: 'business',

  owl_copper_review_archive: 'news',
  owl_copper_cutlery: 'news',
  owl_copper_jobs: 'restaurant',

  owl_soup_recipe: 'news',
  owl_wine_stains: 'news',
  owl_wine_merchants: 'business',

  owl_kitchen_forum: 'forum',
  owl_receipt_stationery: 'business',

  owl_arthur_birds: 'news',
  owl_nora_namesake: 'business',
  owl_simon_namesake: 'business',
  owl_evelyn_namesake: 'business',

  owl_tuesday_parcels: 'business',
  owl_revision_guide: 'news',
  owl_dinner_etiquette: 'news',
  owl_free_samples: 'news',
  owl_tuesday_calendar: 'news',
  owl_table_for_one: 'news'
};

const ALIBI_PRESENTATION = {
  club_home: {
    tagline: 'PRIVATE SERVICES & ENQUIRIES',
    sectionLabel: 'ABOUT OUR SERVICES'
  },

  club_packages: {
    tagline: 'PRIVATE SERVICES & ENQUIRIES',
    sectionLabel: 'PACKAGES & DEMONSTRATIONS'
  },

  club_contact: {
    tagline: 'PRIVATE SERVICES & ENQUIRIES',
    sectionLabel: 'CONTACT & ENQUIRIES'
  },

  pie_results: {
    tagline: 'CIVIC EVENTS OFFICE',
    sectionLabel: 'OFFICIAL EVENT RESULTS'
  },

  game_results: {
    tagline: 'TABLETOP CIRCLE',
    sectionLabel: 'OFFICIAL MATCH RECORDS'
  },

  morrow_notice: {
    sectionLabel: 'PUBLIC COMPANY STATEMENT'
  },

  morrow_contact: {
    sectionLabel: 'AUTHORISED COMPANY CONTACT'
  },

  arthur_namesake: {
    tagline: 'PERSONAL COLLECTION ARCHIVE',
    sectionLabel: 'COLLECTION NOTES'
  },

  owl_wine_merchants: {
    sectionLabel: 'SHOP OFFERS'
  },

  owl_receipt_stationery: {
    sectionLabel: 'STATIONERY & SUPPLIES'
  },

  owl_nora_namesake: {
    sectionLabel: 'ABOUT THE BAKERY'
  },

  owl_simon_namesake: {
    sectionLabel: 'SHOP & EQUIPMENT'
  },

  owl_evelyn_namesake: {
    sectionLabel: 'COSTUME HIRE'
  },

  owl_tuesday_parcels: {
    sectionLabel: 'COLLECTION SERVICES'
  }
};

const PALETTES = {
  hotel: {
    dark: 0x23494d,
    light: 0xdde8df,
    gold: 0xc3a465,
    label: 'HOTEL & HOSPITALITY',
    section: 'GUEST INFORMATION',
    navigation: 'OFFICIAL WEBSITE',
    paper: 0xf8f2e5,
    navigationColor: 0xe5dac5
  },

  restaurant: {
    dark: 0x653b3d,
    light: 0xeee1d3,
    gold: 0xc6a16b,
    label: 'RESTAURANT & DINING',
    section: 'FROM THE HOUSE',
    navigation: 'OFFICIAL WEBSITE',
    paper: 0xf8f2e5,
    navigationColor: 0xe5dac5
  },

  business: {
    dark: 0x354a65,
    light: 0xdce4e9,
    gold: 0xc0a36a,
    label: 'SERVICES & ENQUIRIES',
    section: 'COMPANY INFORMATION',
    navigation: 'OFFICIAL WEBSITE',
    paper: 0xf8f2e5,
    navigationColor: 0xe5dac5
  },

  memorial: {
    dark: 0x414b43,
    light: 0xe3e5d9,
    gold: 0xb8b092,
    label: 'MEMORIES & FAMILY CORRESPONDENCE',
    section: 'FAMILY ARCHIVE',
    navigation: 'FAMILY PAGES',
    paper: 0xf6f3e9,
    navigationColor: 0xe4e3d7
  },

  classifieds: {
    dark: 0x65543f,
    light: 0xe5dcc5,
    gold: 0xc8ab70,
    label: 'LOCAL CLASSIFIEDS',
    section: 'COMMUNITY NOTICEBOARD',
    navigation: 'PUBLIC NOTICES',
    paper: 0xf5edda,
    navigationColor: 0xe6d9b9
  }
};

function templateTheme(template) {
  if (
    ['news', 'magazine', 'tabloid'].includes(
      template
    )
  ) {
    return 'magazine';
  }

  if (
    ['association', 'club'].includes(template)
  ) {
    return 'organisation';
  }

  return template;
}

function prepareAlibiPages(definition) {
  if (
    definition?.id !== 'borrowed_alibi' ||
    !Array.isArray(definition.pages)
  ) {
    return;
  }

  for (const page of definition.pages) {
    if (!page || page.layout === 'default') {
      continue;
    }

    // FaceSpace keeps its existing dedicated renderer.
    if (page.socialProfile) {
      page.template = 'social';
      page.theme = 'social';
      continue;
    }

    const template = ALIBI_TEMPLATES[page.id];

    if (!template) continue;

    page.template = template;
    page.theme = templateTheme(template);

    const presentation =
      ALIBI_PRESENTATION[page.id];

    if (presentation) {
      Object.assign(page, presentation);
    }
  }
}

function isMemorialPage(page) {
  if (!page || page.layout === 'default') {
    return false;
  }

  const selected =
    page.template ||
    page.businessType ||
    page.theme;

  return (
    selected === 'memorial' ||
    selected === 'family-archive' ||
    FAMILY_PAGE_IDS.has(page.id)
  );
}

function isClubOverride(page) {
  return Boolean(
    page &&
    page.layout !== 'default' &&
    CLUB_PAGE_IDS.has(page.id)
  );
}

export function businessKind(page) {
  if (!page || page.layout === 'default') {
    return null;
  }

  if (isMemorialPage(page)) {
    return 'memorial';
  }

  if (isClubOverride(page)) {
    return null;
  }

  const selected =
    page.template ||
    page.businessType ||
    page.theme;

  if (
    [
      'hotel',
      'restaurant',
      'business',
      'classifieds'
    ].includes(selected)
  ) {
    return selected;
  }

  if (page.layout === 'retro-business') {
    return 'business';
  }

  if (
    page.id?.startsWith('copper_') ||
    page.brand === 'THE COPPER SPOON'
  ) {
    return 'restaurant';
  }

  if (page.brand === 'SWIFTWING') {
    return 'business';
  }

  return null;
}

export function installBusinessPages(ui) {
  const search = ui.search;

  if (search[INSTALLED]) return;

  if (
    typeof search.render !== 'function' ||
    typeof search.retroArticleLines !== 'function'
  ) {
    throw new Error(
      '[BusinessPages] ComputerSearch with ' +
      'retroArticleLines is required.'
    );
  }

  search[INSTALLED] = true;

  const previous = search.render.bind(search);

  search.render = function (...args) {
    const definition = this.definition;

    prepareAlibiPages(definition);

    const page = definition?.pages?.find(
      item => item.id === this.pageId
    );

    if (this.view === 'page' && page) {
      if (isForumPage(page)) {
        return renderForum(this, page);
      }

      if (isPublicDirectoryPage(page)) {
        return renderPublicDirectory(this, page);
      }

      if (isClubOverride(page)) {
        return renderOrganisation(
          this,
          {
            ...page,
            template: 'association',
            theme: 'organisation',
            sectionLabel:
              page.sectionLabel || 'CLUB MEMBERS',
            tagline:
              page.tagline || 'CLUB & COMMUNITY'
          },
          'association'
        );
      }

      const kind = businessKind(page);

      if (kind) {
        return renderBusiness(this, page, kind);
      }

      const organisation = organisationKind(page);

      if (organisation) {
        return renderOrganisation(
          this,
          page,
          organisation
        );
      }
    }

    return previous(...args);
  };
}

function photoForPage(search, page, kind) {
  if (page.showImage === false) return null;

  if (page.imageKey) return page;

  // Hotel subpages can share a general hotel photograph.
  // Other page types never borrow a photograph.
  if (kind !== 'hotel') return null;

  return search.definition?.pages?.find(
    item =>
      item.brand === page.brand &&
      item.theme === 'hotel' &&
      item.imageKey &&
      item.showImage !== false
  ) || null;
}

function renderBusiness(search, page, kind) {
  const ui = search.ui;
  const drawing = ui.drawing;
  const palette = PALETTES[kind];

  const { x, y, w, h } = ui.layout;

  const bounds = {
    x: x + 14,
    y: y + 10,
    w: w - 28,
    h: h - 58
  };

  ui.window = bounds;

  const compact =
    bounds.w < 760 ||
    bounds.h < 460;

  const gap = compact ? 9 : 14;

  const css = value =>
    '#' + value.toString(16).padStart(6, '0');

  const text = (
    tx,
    ty,
    value,
    size = 15,
    color = '#342e28',
    pixel = false
  ) => drawing.text(
    tx,
    ty,
    value,
    size,
    color,
    0,
    pixel ? 'pixel' : 'body'
  );

  const fit = (
    tx,
    ty,
    value,
    width,
    size = 12,
    color = '#342e28',
    pixel = false
  ) => {
    const object = text(
      tx,
      ty,
      value,
      size,
      color,
      pixel
    );

    drawing.fit(
      object,
      String(value),
      Math.max(1, width)
    );

    return object;
  };

  const button = (
    tx,
    ty,
    width,
    height,
    label,
    callback,
    enabled = true,
    active = false
  ) => {
    drawing.bevel(
      tx,
      ty,
      width,
      height,
      active ? palette.dark : 0xe0d4bc
    );

    const hit = drawing.rectangle(
      tx,
      ty,
      width,
      height,
      0xffffff,
      0.001
    );

    const caption = fit(
      tx + 7,
      ty,
      label,
      width - 14,
      8,
      !enabled
        ? '#918673'
        : active
          ? '#fff1ce'
          : '#3b352e',
      true
    );

    caption.setY(
      ty + Math.round(
        (height - caption.height) / 2
      )
    );

    if (enabled) {
      hit
        .setInteractive({
          useHandCursor: true
        })
        .on('pointerover', () => {
          hit.setFillStyle(0xffffff, 0.15);
        })
        .on('pointerout', () => {
          hit.setFillStyle(0xffffff, 0.001);
        })
        .on('pointerdown', () => {
          ui.options.onSfx?.('click');
          callback();
        });
    }

    return hit;
  };

  const brand =
    page.brand ||
    page.title ||
    'WEBSITE';

  drawing.rectangle(
    bounds.x + 5,
    bounds.y + 5,
    bounds.w,
    bounds.h,
    0x000000,
    0.3
  );

  drawing.bevel(
    bounds.x,
    bounds.y,
    bounds.w,
    bounds.h,
    0xc8bda7
  );

  drawing.rectangle(
    bounds.x + 4,
    bounds.y + 4,
    bounds.w - 8,
    28,
    0x493e50
  );

  fit(
    bounds.x + 13,
    bounds.y + 13,
    `OWL NAVIGATOR / ${brand}`,
    bounds.w - 148,
    8,
    '#f9e8bb',
    true
  );

  button(
    bounds.x + bounds.w - 32,
    bounds.y + 7,
    23,
    21,
    'X',
    () => search.back()
  );

  const addressY = bounds.y + 38;

  button(
    bounds.x + 10,
    addressY,
    45,
    27,
    '<',
    () => search.back()
  );

  button(
    bounds.x + 61,
    addressY,
    58,
    27,
    'OWL',
    () => search.goHome()
  );

  drawing.bevel(
    bounds.x + 126,
    addressY,
    bounds.w - 184,
    27,
    0xf7f2e5,
    true
  );

  fit(
    bounds.x + 134,
    addressY + 7,
    page.address || page.url || page.id,
    bounds.w - 200,
    12,
    '#355d4d'
  );

  button(
    bounds.x + bounds.w - 51,
    addressY,
    41,
    27,
    'GO',
    () => search.refresh()
  );

  const sectionX = bounds.x + gap;
  const sectionW = bounds.w - gap * 2;
  const headerY = bounds.y + 75;
  const headerH = compact ? 63 : 80;

  drawing.rectangle(
    sectionX,
    headerY,
    sectionW,
    headerH,
    palette.dark
  );

  drawing.frame(
    sectionX,
    headerY,
    sectionW,
    headerH,
    0x1e282b,
    1,
    2
  );

  drawing.rectangle(
    sectionX + 5,
    headerY + 5,
    sectionW - 10,
    1,
    palette.gold,
    0.9
  );

  drawing.rectangle(
    sectionX + 5,
    headerY + headerH - 6,
    sectionW - 10,
    1,
    palette.gold,
    0.9
  );

  const hasLogo = Boolean(
    page.logoKey &&
    search.textureOk(page.logoKey)
  );

  const logoWidth = hasLogo
    ? compact ? 46 : 58
    : 0;

  if (hasLogo) {
    search.art(
      page.logoKey,
      sectionX + 14,
      headerY + 11,
      logoWidth,
      headerH - 22
    );
  }

  const brandX =
    sectionX + 16 +
    (logoWidth ? logoWidth + 12 : 0);

  fit(
    brandX,
    headerY + (compact ? 16 : 19),
    brand,
    sectionW - (brandX - sectionX) - 18,
    compact ? 14 : 19,
    '#f9e9bd',
    true
  );

  fit(
    brandX,
    headerY + headerH - 25,
    page.tagline || palette.label,
    sectionW - (brandX - sectionX) - 18,
    compact ? 10 : 12,
    '#e6d5ae'
  );

  const navigationY =
    headerY + headerH + 6;

  const links = page.links || [];

  const navigationHeight = drawWebsiteNavigation(
    search,
    page,
    {
      x: sectionX,
      y: navigationY,
      width: sectionW,
      button,
      background: palette.navigationColor
    }
  );

  const contentY =
    navigationY + navigationHeight + gap;

  const footerY =
    bounds.y + bounds.h - 35;

  const contentH =
    footerY - contentY - gap;

  if (contentH < 65) {
    fit(
      sectionX + 8,
      contentY,
      'Enlarge the game window to read this page.',
      sectionW - 16,
      12
    );
    return;
  }

  const photoPage = photoForPage(
    search,
    page,
    kind
  );

  const withPhoto = Boolean(
    photoPage &&
    bounds.w >= 610 &&
    contentH >= 150
  );

  const photoWidth = withPhoto
    ? Math.floor((sectionW - gap) * 0.43)
    : 0;

  const articleX =
    sectionX +
    (withPhoto ? photoWidth + gap : 0);

  const articleW =
    sectionW -
    (withPhoto ? photoWidth + gap : 0);

  if (withPhoto) {
    drawing.rectangle(
      sectionX + 3,
      contentY + 3,
      photoWidth,
      contentH,
      0x000000,
      0.12
    );

    drawing.bevel(
      sectionX,
      contentY,
      photoWidth,
      contentH,
      palette.paper
    );

    const imageHeight = contentH - 54;

    drawing.rectangle(
      sectionX + 8,
      contentY + 8,
      photoWidth - 16,
      imageHeight,
      palette.light
    );

    const image = search.art(
      photoPage.imageKey,
      sectionX + 10,
      contentY + 10,
      photoWidth - 20,
      imageHeight - 4
    );

    if (!image) {
      fit(
        sectionX + 18,
        contentY + 24,
        'PHOTOGRAPH UNAVAILABLE',
        photoWidth - 36,
        8,
        css(palette.dark),
        true
      );
    }

    fit(
      sectionX + 12,
      contentY + contentH - 35,
      page.imageCaption ||
        photoPage.imageCaption ||
        brand,
      photoWidth - 24,
      11,
      css(palette.dark)
    );

    fit(
      sectionX + 12,
      contentY + contentH - 19,
      page.photoCredit ||
        photoPage.photoCredit ||
        palette.navigation,
      photoWidth - 24,
      8,
      '#84745b',
      true
    );
  }

  drawing.bevel(
    articleX,
    contentY,
    articleW,
    contentH,
    palette.paper,
    true
  );

  drawing.rectangle(
    articleX + 10,
    contentY + 11,
    4,
    18,
    palette.gold
  );

  fit(
    articleX + 22,
    contentY + 16,
    page.sectionLabel || palette.section,
    articleW - 35,
    8,
    css(palette.dark),
    true
  );

  drawing.rectangle(
    articleX + 12,
    contentY + 37,
    articleW - 24,
    1,
    0xcabd9f
  );

  const fontSize = compact ? 14 : 16;
  const lineHeight = compact ? 23 : 26;

  const rows = Math.max(
    1,
    Math.floor(
      (contentH - 52) / lineHeight
    )
  );

  const lines = search.retroArticleLines(
    {
      ...page,
      blocks: [
        [page.heading || page.title || brand],
        ...(page.blocks || [])
      ],
      links
    },
    articleW - 30,
    fontSize
  );

  const pageCount = Math.max(
    1,
    Math.ceil(lines.length / rows)
  );

  search.bodyPage = Math.max(
    0,
    Math.min(
      pageCount - 1,
      Number(search.bodyPage) || 0
    )
  );

  const visibleLines = lines.slice(
    search.bodyPage * rows,
    (search.bodyPage + 1) * rows
  );

  if (kind === 'classifieds') {
    for (
      let row = 0;
      row < rows;
      row++
    ) {
      drawing.rectangle(
        articleX + 13,
        contentY + 45 +
          row * lineHeight +
          lineHeight - 2,
        articleW - 26,
        1,
        0xcdbd94,
        0.35
      );
    }
  }

  visibleLines.forEach((line, index) => {
    let cursorX = articleX + 15;

    const lineY =
      contentY + 46 +
      index * lineHeight;

    for (const part of line) {
      const known =
        part.keywordId &&
        search.progress.known.includes(
          part.keywordId
        );

      const color = part.pageId
        ? '#315d85'
        : part.keywordId
          ? known
            ? '#416c4c'
            : '#994e2e'
          : '#39352e';

      const label = text(
        cursorX,
        lineY,
        part.text,
        fontSize,
        color
      );

      if (part.pageId || part.keywordId) {
        drawing.rectangle(
          cursorX,
          lineY + label.height + 1,
          Math.max(1, label.width),
          1,
          parseInt(color.slice(1), 16)
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
            ui.options.onSfx?.('click');

            if (part.pageId) {
              search.openPage(part.pageId);
            } else {
              search.collect(
                part.keywordId
              );
            }
          });
      }

      cursorX += search.textWidth(
        part.text,
        fontSize
      );
    }
  });

  button(
    sectionX,
    footerY,
    42,
    26,
    '<',
    () => {
      search.bodyPage--;
      search.refresh();
    },
    search.bodyPage > 0
  );

  button(
    sectionX + 48,
    footerY,
    42,
    26,
    '>',
    () => {
      search.bodyPage++;
      search.refresh();
    },
    search.bodyPage < pageCount - 1
  );

  fit(
    sectionX + 100,
    footerY + 8,
    `${search.bodyPage + 1} / ${pageCount}`,
    70,
    11,
    '#6c604e'
  );

  fit(
    sectionX + 180,
    footerY + 8,
    brand,
    Math.max(1, sectionW - 280),
    10,
    css(palette.dark)
  );

  button(
    sectionX + sectionW - 86,
    footerY,
    86,
    26,
    'NOTES',
    () => {
      if (ui.caseCloudNotebook) {
        ui.caseCloudNotebook.toggle();
      } else {
        search.notesOpen =
          !search.notesOpen;

        search.refresh();
      }
    }
  );
}