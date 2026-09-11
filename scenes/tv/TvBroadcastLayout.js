const TV_LAYOUT_DEFAULTS = {
  fallbackTvWidthRatio: 0.8,
  fallbackTvHeightRatio: 0.6,

  screenWidthRatio: 0.555,
  screenHeightRatio: 0.778,

  screenOffsetXRatio: -0.04,
  screenOffsetYRatio: -0.052,

  screenChamferRatio: 0.03,

  screenSafeInsetXRatio: 0.035,
  screenSafeInsetTopRatio: 0.055,
  screenSafeInsetBottomRatio: 0.05
};

function getSafeNumber(value, fallback) {
  return Number.isFinite(value)
    ? value
    : fallback;
}

function getTextureSourceImage(scene, textureKey) {
  if (
    !scene?.textures ||
    !textureKey ||
    !scene.textures.exists(textureKey)
  ) {
    return null;
  }

  const texture = scene.textures.get(textureKey);

  return texture?.getSourceImage?.() || null;
}

export function createTvBroadcastLayout(
  scene,
  options = {}
) {
  const config = {
    ...TV_LAYOUT_DEFAULTS,
    ...options
  };

  const width = getSafeNumber(
    scene?.scale?.width,
    1280
  );

  const height = getSafeNumber(
    scene?.scale?.height,
    720
  );

  const televisionTextureKey =
    options.televisionTextureKey || 'television';

  const sourceImage = getTextureSourceImage(
    scene,
    televisionTextureKey
  );

  const tvWidth = getSafeNumber(
    sourceImage?.width,
    width * config.fallbackTvWidthRatio
  );

  const tvHeight = getSafeNumber(
    sourceImage?.height,
    height * config.fallbackTvHeightRatio
  );

  const screenWidth =
    tvWidth * config.screenWidthRatio;

  const screenHeight =
    tvHeight * config.screenHeightRatio;

  const screenOffsetX =
    tvWidth * config.screenOffsetXRatio;

  const screenOffsetY =
    tvHeight * config.screenOffsetYRatio;

  const screenChamfer =
    tvWidth * config.screenChamferRatio;

  const screenSafeInsetX =
    tvWidth * config.screenSafeInsetXRatio;

  const screenSafeInsetTop =
    tvHeight * config.screenSafeInsetTopRatio;

  const screenSafeInsetBottom =
    tvHeight * config.screenSafeInsetBottomRatio;

  const centerX = width * 0.5;
  const centerY = height * 0.5;

  const screenLeft =
    -screenWidth / 2 +
    screenSafeInsetX;

  const screenRight =
    screenWidth / 2 -
    screenSafeInsetX;

  const screenTop =
    -screenHeight / 2 +
    screenSafeInsetTop;

  const screenBottom =
    screenHeight / 2 -
    screenSafeInsetBottom;

  const screenSafeWidth =
    screenRight - screenLeft;

  const screenSafeHeight =
    screenBottom - screenTop;

  return {
    width,
    height,

    centerX,
    centerY,

    tvWidth,
    tvHeight,

    screenWidth,
    screenHeight,

    screenOffsetX,
    screenOffsetY,

    screenChamfer,

    screenSafeInsetX,
    screenSafeInsetTop,
    screenSafeInsetBottom,

    screenLeft,
    screenRight,
    screenTop,
    screenBottom,

    screenSafeWidth,
    screenSafeHeight
  };
}