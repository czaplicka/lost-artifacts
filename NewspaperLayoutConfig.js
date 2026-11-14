import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
// ---------------------------------------------------------------------------
// NewspaperLayoutConfig.js
//
// DAILY  - redesigned two-page spread. The paper background is now painted in
//          code (ui/NewspaperPaper.js) from the `structure` block below, so
//          every printed rule, frame and label bar lines up with the text.
// TABLOID - unchanged.
// TIME   - redesigned: painted cover on a wooden desk (ui/NewspaperTimeCover.js).
//
// All numbers are in 1920x1080 page space.
// ---------------------------------------------------------------------------

const LEFT_X = 56;
const RIGHT_X = 1016;
const PAGE_W = 848;

const COL_W = 268;
const COL_GAP = 22;
const colX = index => LEFT_X + index * (COL_W + COL_GAP);

const TOP_Y = 52;
const TOP_H = 516;
const BOTTOM_Y = 656;
const BOTTOM_H = 368;

const ARTICLE_W = 436;
const RIGHT_RULE_X = 1470;
const SIDE_X = 1488;
const SIDE_W = 376;

const BAR_H = 22;

const dailyModules = {
  weather: {
    x: colX(0), y: BOTTOM_Y, width: COL_W, height: BOTTOM_H, label: __dialogueText("NewspaperLayoutConfig.js", "t_0a244108837bc27421ac")
  },
  classifieds: {
    x: colX(1), y: BOTTOM_Y, width: COL_W, height: BOTTOM_H, label: __dialogueText("NewspaperLayoutConfig.js", "t_7c38821aea8aca6dea61")
  },
  crossword: {
    x: colX(2), y: BOTTOM_Y, width: COL_W, height: BOTTOM_H, label: __dialogueText("NewspaperLayoutConfig.js", "t_b683bca717fec1800b46")
  },
  ticker: {
    x: RIGHT_X, y: 580, width: PAGE_W, height: 48
  },
  ads: {
    x: SIDE_X, y: TOP_Y, width: SIDE_W, heights: [158, 170, 160], gap: 14
  },
  comic: {
    x: SIDE_X, y: BOTTOM_Y, width: SIDE_W, height: BOTTOM_H, label: __dialogueText("NewspaperLayoutConfig.js", "t_ed467ef60f6882e6ceae")
  }
};

const dailyArticles = [
  {
    id: 'lead',
    x: LEFT_X,
    y: 206,
    width: PAGE_W,
    height: 430,
    headlineSize: 34,
    headlineMin: 24,
    headlineMaxH: 92,
    deckSize: 18,
    bodySize: 19,
    bodyMin: 13,
    photo: { width: 360, height: 200 }
  },
  {
    id: 'secondary_1',
    x: RIGHT_X,
    y: TOP_Y,
    width: ARTICLE_W,
    height: TOP_H,
    headlineSize: 36,
    headlineMin: 22,
    headlineMaxH: 150,
    bodySize: 22,
    bodyMin: 15,
    pullQuote: true
  },
  {
    id: 'secondary_2',
    x: RIGHT_X,
    y: BOTTOM_Y,
    width: ARTICLE_W,
    height: BOTTOM_H,
    headlineSize: 30,
    headlineMin: 20,
    headlineMaxH: 112,
    bodySize: 20,
    bodyMin: 13,
    pullQuote: false
  }
];

// Everything the painter prints onto the paper (multiply-blended "ink").
const dailyStructure = {
  rules: [
    // masthead
    { x1: LEFT_X, y1: 146, x2: LEFT_X + PAGE_W, y2: 146, style: 'double' },
    { x1: LEFT_X, y1: 192, x2: LEFT_X + PAGE_W, y2: 192, w: 1.5 },
    // lead story / bottom row divider
    { x1: LEFT_X, y1: 642, x2: LEFT_X + PAGE_W, y2: 642, style: 'double' },
    // ticker strip on the right page
    { x1: RIGHT_X, y1: 574, x2: RIGHT_X + PAGE_W, y2: 574, w: 1.5 },
    { x1: RIGHT_X, y1: 634, x2: RIGHT_X + PAGE_W, y2: 634, w: 1.5 },
    // column rules between article and side column
    { x1: RIGHT_RULE_X, y1: TOP_Y, x2: RIGHT_RULE_X, y2: TOP_Y + TOP_H, w: 1.5 },
    { x1: RIGHT_RULE_X, y1: BOTTOM_Y, x2: RIGHT_RULE_X, y2: BOTTOM_Y + BOTTOM_H, w: 1.5 }
  ],

  frames: [
    { x: dailyModules.weather.x, y: BOTTOM_Y, w: COL_W, h: BOTTOM_H, lw: 2 },
    { x: dailyModules.classifieds.x, y: BOTTOM_Y, w: COL_W, h: BOTTOM_H, lw: 2 },
    { x: dailyModules.crossword.x, y: BOTTOM_Y, w: COL_W, h: BOTTOM_H, lw: 2 },
    { x: SIDE_X, y: BOTTOM_Y, w: SIDE_W, h: BOTTOM_H, lw: 2 }
  ],

  // dark label bars - the label text itself is drawn by NewspaperUI
  bars: [
    { x: dailyModules.weather.x, y: BOTTOM_Y, w: COL_W, h: BAR_H },
    { x: dailyModules.classifieds.x, y: BOTTOM_Y, w: COL_W, h: BAR_H },
    { x: dailyModules.crossword.x, y: BOTTOM_Y, w: COL_W, h: BAR_H },
    { x: SIDE_X, y: BOTTOM_Y, w: SIDE_W, h: BAR_H },
    { x: RIGHT_X, y: TOP_Y, w: ARTICLE_W, h: BAR_H },
    { x: RIGHT_X, y: BOTTOM_Y, w: ARTICLE_W, h: BAR_H }
  ]
};

export const NewspaperLayoutConfig = {
  daily: {
    pageWidth: 1920,
    pageHeight: 1080,

    // kept for backward compatibility with anything that still reads them
    title: { x: LEFT_X, y: 70, originX: 0, originY: 0 },
    subtitle: { x: LEFT_X, y: 160, originX: 0, originY: 0 },

    masthead: {
      x: LEFT_X,
      w: PAGE_W,
      earY: 52,
      titleY: 104,
      titleMaxW: 800,
      titleSize: 60,
      titleMin: 30,
      datelineY: 170
    },

    barHeight: BAR_H,
    articles: dailyArticles,
    modules: dailyModules,
    structure: dailyStructure
  },

  tabloid: {
    pageWidth: 1920,
    pageHeight: 1080,

    title: {
      x: 60,
      y: 964,
      originX: 0,
      originY: 0
    },

    subtitle: {
      x: 960,
      y: 900,
      originX: 0,
      originY: 0
    },

    // sloty tekstowe powiazane z ramkami na grafice
    articles: [
      {
        id: 'hot_issue_left',
        x: 340,
        y: 260,
        width: 520,
        height: 260,
        headlineSize: 20,
        bodySize: 14
      },
      {
        id: 'hot_pick',
        x: 340,
        y: 560,
        width: 520,
        height: 240,
        headlineSize: 20,
        bodySize: 12
      },
      {
        id: 'red_carpet',
        x: 140,
        y: 840,
        width: 520,
        height: 200,
        headlineSize: 34,
        bodySize: 22
      },
      {
        id: 'feature_right',
        x: 1020,
        y: 220,
        width: 760,
        height: 740,
        headlineSize: 42,
        bodySize: 26
      }
    ]
  },

  time: {
    pageWidth: 1920,
    pageHeight: 1080,

    // --- procedural TIME cover (see ui/NewspaperTimeCover.js) ---
    cover: { x: 580, y: 36, width: 760, height: 1008, border: 22 },
    stripY: 68,
    logo: { baseline: 222, size: 176 },
    rules: { top: 236, bottom: 280 },
    taglineY: 252,
    illustration: { x: 640, y: 304, width: 640, height: 386 },
    badge: { x: 1226, y: 378, radius: 54 },
    caption: { y: 700, height: 34 },
    headline: { y: 742, height: 96, size: 38, min: 22 },
    divider: { y: 850, width: 260 },
    teasers: { x: 668, y: 866, width: 608, pitch: 52, height: 50, size: 22, min: 14 },

    // --- legacy (only used if the painted cover fails) ---
    title: { x: 260, y: 140, originX: 0, originY: 0 },
    subtitle: null,
    coverLines: [
      { id: 'cover_1', x: 260, y: 320, width: 1400, fontSize: 52 },
      { id: 'cover_2', x: 260, y: 440, width: 1400, fontSize: 38 },
      { id: 'cover_3', x: 260, y: 540, width: 1400, fontSize: 34 },
      { id: 'cover_4', x: 260, y: 660, width: 1400, fontSize: 30 }
    ]
  }
};