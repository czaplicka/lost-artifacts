export function drawEvidenceText(ui, { blocks, x, y, width, fontSize = 16, lineHeight = 25, onCollect, isKnown = () => false }) {
  const d = ui.drawing;
  const probe = ui.scene.add.text(0, 0, '', {
    fontFamily: 'SpecialElite, "Special Elite", monospace',
    fontSize: `${fontSize}px`
  }).setVisible(false);
  const measure = value => { probe.setText(value); return probe.width; };
  let dx = 0, dy = 0;
  const newline = () => { dx = 0; dy += lineHeight; };
  try {
    for (let i = 0; i < blocks.length; i++) {
      for (const part of blocks[i]) {
        const fragment = typeof part === 'string' ? { text: part } : part;
        for (const token of String(fragment.text || '').split(/(\n|[^\S\n]+)/).filter(Boolean)) {
          if (token === '\n') { newline(); continue; }
          if (/^\s+$/.test(token)) { if (dx) dx += measure(token); continue; }
          const chunks = [];
          let chunk = '';
          for (const char of token) {
            if (chunk && measure(chunk + char) > width) { chunks.push(chunk); chunk = ''; }
            chunk += char;
          }
          if (chunk) chunks.push(chunk);
          for (const text of chunks) {
            const tw = measure(text);
            if (dx && dx + tw > width) newline();
            const id = fragment.keywordId;
            const t = d.text(x + dx, y + dy, text, fontSize, id ? '#ffe56c' : '#343e35');
            if (id) {
              const bg = d.rectangle(t.x - 1, t.y, t.width + 2, lineHeight - 2, isKnown(id) ? 0x596150 : 0x344841);
              ui.content.moveBelow(bg, t);
              t.setInteractive({ useHandCursor: true }).on('pointerdown', () => onCollect(id));
            }
            dx += tw;
          }
        }
      }
      if (i < blocks.length - 1) newline();
    }
  } finally { probe.destroy(); }
  return dy + lineHeight;
}
