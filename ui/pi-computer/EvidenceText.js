import { bindKeywordStyle, refreshKeywordStyles, keywordSurface } from './KeywordStyle.js';

export function drawEvidenceText(ui, {
  blocks, x, y, width, fontSize = 16, lineHeight = 25,
  onCollect, isKnown = () => false, surface = null
}) {
  const drawing = ui.drawing;
  const probe = ui.scene.add.text(0, 0, '', {
    fontFamily: 'SpecialElite, "Special Elite", monospace', fontSize: `${fontSize}px`
  }).setVisible(false);
  const measure = value => { probe.setText(value); return probe.width; };
  let offsetX = 0, offsetY = 0;
  const newline = () => { offsetX = 0; offsetY += lineHeight; };
  try {
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      for (const part of blocks[blockIndex]) {
        const fragment = typeof part === 'string' ? { text: part } : part;
        const keywordId = fragment.keywordId;
        const tokens = String(fragment.text || '').split(/(\n|[^\S\n]+)/).filter(Boolean);
        for (const token of tokens) {
          if (token === '\n') { newline(); continue; }
          if (/^\s+$/.test(token)) { if (offsetX) offsetX += measure(token); continue; }
          const chunks = []; let chunk = '';
          for (const character of token) {
            if (chunk && measure(chunk + character) > width) { chunks.push(chunk); chunk = ''; }
            chunk += character;
          }
          if (chunk) chunks.push(chunk);
          for (const text of chunks) {
            const textWidth = measure(text);
            if (offsetX && offsetX + textWidth > width) newline();
            const label = drawing.text(x + offsetX, y + offsetY, text, fontSize, '#343e35');
            if (keywordId) {
              bindKeywordStyle(ui.scene, label, {
                isKnown: () => isKnown(keywordId),
                surface: surface === null ? () => keywordSurface(ui, label) : surface
              });
              if (!isKnown(keywordId) && typeof onCollect === 'function') {
                label.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, lx, ly, event) => {
                  event?.stopPropagation();
                  if (!isKnown(keywordId)) onCollect(keywordId);
                  refreshKeywordStyles(ui.scene);
                });
              }
            }
            offsetX += textWidth;
          }
        }
      }
      if (blockIndex < blocks.length - 1) newline();
    }
  } finally { probe.destroy(); }
  return offsetY + lineHeight;
}
