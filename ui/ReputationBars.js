import { EventBus } from '../EventBus.js';

import {
  getReputation,
  REPUTATION_CHANGED
} from '../managers/ReputationManager.js';

const PANEL_HEIGHT = 168;

const COLORS = {
  shadow: 0x000000,
  background: 0x20170f,
  inset: 0x140f0b,
  border: 0x80643b,
  borderInner: 0x463622,
  gold: 0xc6a66a,
  goldHighlight: 0xe4cc93,
  track: 0x0d0b08,
  trackBorder: 0x51412c,
  positive: 0x7d9e91,
  positiveHighlight: 0xb0c6b9,
  negative: 0xaa7566,
  negativeHighlight: 0xd2a08d,
  neutral: 0xb8aa90
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getReputationTitle(fame) {
  if (fame >= 80) return 'Renowned';
  if (fame >= 50) return 'Recognized';
  if (fame >= 20) return 'Local name';

  return 'Unknown';
}

function getIntegrityTitle(integrity) {
  if (integrity >= 40) return 'Police trusted';
  if (integrity <= -40) return 'Underworld trusted';

  return 'Unaffiliated';
}

export function createReputationBars(
  scene,
  {
    x = null,
    right = 24,
    y = 120,
    width = 248,
    depth = 100
  } = {}
) {
  const panelWidth = Math.max(
    210,
    Number.isFinite(width) ? width : 248
  );

  const rightMargin = Number.isFinite(right)
    ? right
    : 24;

  const topPosition = Number.isFinite(y)
    ? y
    : 120;

  let disposed = false;

  const root = scene.add
    .container(0, topPosition)
    .setDepth(depth)
    .setScrollFactor(0);

  const graphics = scene.add.graphics();

  const padding = 16;
  const contentWidth = panelWidth - padding * 2;

  const makeText = (
    textX,
    textY,
    text,
    {
      size = 14,
      color = '#e5d6b7',
      font = 'SpecialElite',
      align = 'left',
      originX = 0
    } = {}
  ) => {
    return scene.add
      .text(textX, textY, text, {
        fontFamily: font,
        fontSize: `${size}px`,
        color,
        align
      })
      .setOrigin(originX, 0);
  };

  const header = makeText(
    padding,
    12,
    'AGENT STANDING',
    {
      size: 10,
      font: 'PressStart2P',
      color: '#d4bc89'
    }
  );

  const fameLabel = makeText(
    padding,
    42,
    'REPUTATION',
    {
      size: 13,
      color: '#d8c6a0'
    }
  );

  const fameValue = makeText(
    panelWidth - padding,
    41,
    '',
    {
      size: 15,
      color: '#ecd49c',
      align: 'right',
      originX: 1
    }
  );

  const fameStatus = makeText(
    padding,
    77,
    '',
    {
      size: 12,
      color: '#a99a7e'
    }
  );

  const integrityLabel = makeText(
    padding,
    101,
    'INTEGRITY',
    {
      size: 13,
      color: '#d8c6a0'
    }
  );

  const integrityValue = makeText(
    panelWidth - padding,
    100,
    '',
    {
      size: 15,
      color: '#d9cfba',
      align: 'right',
      originX: 1
    }
  );

  const integrityStatus = makeText(
    padding,
    143,
    '',
    {
      size: 12,
      color: '#a99a7e'
    }
  );

  root.add([
    graphics,
    header,
    fameLabel,
    fameValue,
    fameStatus,
    integrityLabel,
    integrityValue,
    integrityStatus
  ]);

  function positionPanel() {
    if (disposed) return;

    const viewportWidth = scene.scale.width;
    const viewportHeight = scene.scale.height;

    // Przy bardzo małym ekranie zmniejszamy cały panel,
    // zamiast wypuszczać go poza krawędź.
    const availableWidth = Math.max(
      1,
      viewportWidth - rightMargin * 2
    );

    const scale = Math.min(
      1,
      availableWidth / panelWidth
    );

    root.setScale(scale);

    const displayWidth = panelWidth * scale;
    const displayHeight = PANEL_HEIGHT * scale;

    const panelX = Number.isFinite(x)
      ? x
      : viewportWidth - rightMargin - displayWidth;

    const maxY = Math.max(
      0,
      viewportHeight - displayHeight - 12
    );

    root.setPosition(
      Math.max(0, panelX),
      clamp(topPosition, 0, maxY)
    );
  }

  function drawTrack(trackY) {
    graphics.fillStyle(COLORS.track, 1);

    graphics.fillRoundedRect(
      padding,
      trackY,
      contentWidth,
      9,
      4
    );

    graphics.lineStyle(
      1,
      COLORS.trackBorder,
      0.9
    );

    graphics.strokeRoundedRect(
      padding,
      trackY,
      contentWidth,
      9,
      4
    );
  }

  function drawFameBar(fame) {
    const trackY = 63;

    drawTrack(trackY);

    const usableWidth = contentWidth - 4;
    const fillWidth = usableWidth * fame / 100;

    if (fillWidth <= 0) return;

    const radius = Math.min(
      2,
      fillWidth / 2
    );

    graphics.fillStyle(COLORS.gold, 1);

    graphics.fillRoundedRect(
      padding + 2,
      trackY + 2,
      fillWidth,
      5,
      radius
    );

    graphics.fillStyle(
      COLORS.goldHighlight,
      0.55
    );

    graphics.fillRect(
      padding + 2,
      trackY + 2,
      fillWidth,
      1
    );
  }

  function drawIntegrityBar(integrity) {
    const trackY = 122;

    drawTrack(trackY);

    const innerX = padding + 2;
    const usableWidth = contentWidth - 4;

    const middleX = innerX + usableWidth / 2;

    const fillWidth =
      (usableWidth / 2) *
      Math.abs(integrity) / 100;

    if (fillWidth > 0) {
      const positive = integrity > 0;

      const fillX = positive
        ? middleX
        : middleX - fillWidth;

      graphics.fillStyle(
        positive
          ? COLORS.positive
          : COLORS.negative,
        1
      );

      graphics.fillRect(
        fillX,
        trackY + 2,
        fillWidth,
        5
      );

      graphics.fillStyle(
        positive
          ? COLORS.positiveHighlight
          : COLORS.negativeHighlight,
        0.65
      );

      graphics.fillRect(
        fillX,
        trackY + 2,
        fillWidth,
        1
      );
    }

    // Próg kontaktów półświatka i policji.
    graphics.lineStyle(
      1,
      COLORS.gold,
      0.6
    );

    for (const threshold of [-40, 40]) {
      const markerX =
        innerX +
        ((threshold + 100) / 200) * usableWidth;

      graphics.lineBetween(
        markerX,
        trackY + 11,
        markerX,
        trackY + 14
      );
    }

    // Neutralny środek osi.
    graphics.lineStyle(
      1,
      COLORS.neutral,
      0.9
    );

    graphics.lineBetween(
      middleX,
      trackY - 2,
      middleX,
      trackY + 11
    );
  }

  function drawPanel() {
    graphics.clear();

    graphics.fillStyle(
      COLORS.shadow,
      0.28
    );

    graphics.fillRoundedRect(
      3,
      5,
      panelWidth,
      PANEL_HEIGHT,
      7
    );

    graphics.fillStyle(
      COLORS.background,
      0.96
    );

    graphics.fillRoundedRect(
      0,
      0,
      panelWidth,
      PANEL_HEIGHT,
      7
    );

    graphics.lineStyle(
      1,
      COLORS.border,
      0.9
    );

    graphics.strokeRoundedRect(
      0,
      0,
      panelWidth,
      PANEL_HEIGHT,
      7
    );

    graphics.lineStyle(
      1,
      COLORS.borderInner,
      0.8
    );

    graphics.strokeRoundedRect(
      4,
      4,
      panelWidth - 8,
      PANEL_HEIGHT - 8,
      4
    );

    graphics.fillStyle(
      COLORS.inset,
      0.65
    );

    graphics.fillRoundedRect(
      8,
      7,
      panelWidth - 16,
      25,
      3
    );

    graphics.lineStyle(
      1,
      COLORS.border,
      0.45
    );

    graphics.lineBetween(
      padding,
      33,
      panelWidth - padding,
      33
    );

    graphics.lineStyle(
      1,
      COLORS.borderInner,
      0.8
    );

    graphics.lineBetween(
      padding,
      95,
      panelWidth - padding,
      95
    );
  }

  function refresh() {
    if (disposed) return;

    const state = getReputation();

    const fame = clamp(
      Number.isFinite(state.fame) ? state.fame : 0,
      0,
      100
    );

    const integrity = clamp(
      Number.isFinite(state.integrity)
        ? state.integrity
        : 0,
      -100,
      100
    );

    fameValue.setText(`${fame}/100`);
    fameStatus.setText(getReputationTitle(fame));

    integrityValue.setText(
      integrity > 0
        ? `+${integrity}`
        : String(integrity)
    );

    integrityStatus.setText(
      getIntegrityTitle(integrity)
    );

    integrityValue.setColor(
      integrity > 0
        ? '#b0c6b9'
        : integrity < 0
          ? '#d2a08d'
          : '#c3b69c'
    );

    drawPanel();
    drawFameBar(fame);
    drawIntegrityBar(integrity);

    positionPanel();
  }

  function dispose() {
    if (disposed) return;

    disposed = true;

    EventBus.off(
      REPUTATION_CHANGED,
      refresh
    );

    scene.scale.off(
      'resize',
      positionPanel
    );

    scene.events.off('wake', refresh);
    scene.events.off('resume', refresh);
    scene.events.off('shutdown', dispose);
    scene.events.off('destroy', dispose);

    root.destroy();
  }

  EventBus.on(
    REPUTATION_CHANGED,
    refresh
  );

  scene.scale.on(
    'resize',
    positionPanel
  );

  scene.events.on('wake', refresh);
  scene.events.on('resume', refresh);
  scene.events.once('shutdown', dispose);
  scene.events.once('destroy', dispose);

  refresh();

  return {
    root,
    refresh,
    destroy: dispose
  };
}