export const NEWSSTAND_CONFIG = {
  designWidth: 1920,
  designHeight: 1080,

  backgroundKey: 'newsstand_bg',
  imageZoom: 1.30,
  videoZoom: 1.20,
  dimAlpha: 0.42,

  videoUrl: 'assets/video/newsstand.mp4',
  videoDelayMs: 10000,
  videoCheckDelayMs: 5000,

  newspaperAccessKey: 'dailyNewspaperAccess'
};

export const LOCAL_DEBUG_ALLOWED = [
  '127.0.0.1',
  'localhost'
].includes(window.location.hostname);

export const NEWSSTAND_HOTSPOTS = [
  {
    id: 'daily',
    kind: 'newspaper',
    label: 'DAILY PAPER',

    x: 510,
    y: 710,
    width: 460,
    height: 230,

    type: 'daily',
    backgroundKey: 'paper_daily_bg',

    price: 5,
    depth: 10,
    labelDepth: 11
  },
  {
    id: 'time',
    kind: 'newspaper',
    label: 'TIME',

    x: 1030,
    y: 710,
    width: 360,
    height: 230,

    type: 'time',
    backgroundKey: 'paper_time_bg',

    price: 5,
    depth: 10,
    labelDepth: 11
  },
  {
    id: 'comix_1',
    kind: 'comix',
    label: 'COMIX',

    x: 1500,
    y: 710,
    width: 250,
    height: 230,

    textureKey: 'comix1',

    price: 1,
    depth: 12,
    labelDepth: 13
  }
];

const CITY_ALIASES = {
  new_york: 'new_york_city',
  new_dehli: 'new_delhi'
};

export function normalizeNewsstandCityId(value) {
  const normalized = String(value || 'paris')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return CITY_ALIASES[normalized] || normalized;
}

export function isEditableTarget(event) {
  const target = event?.target;

  return Boolean(
    target?.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
  );
}