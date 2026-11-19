const THEMES = {
  player: { fill: 0x263729, edge: 0x88b589, text: '#e3f0d7' },
  npc: { fill: 0x2a2012, edge: 0xb58a42, text: '#f3e7c4' },
  note: { fill: 0x201c17, edge: 0x776953, text: '#dfcfac' },
};

export function showDialogueBubbles(panel, messages) {
  const { lx, lw, bodyY, bodyH, s } = panel.L;
  const padding = Math.max(2, Math.min(10 * s, lw * 0.06));
  const bubbleWidth = Math.max(1, lw * 0.88);
  const wrapWidth = Math.max(1, bubbleWidth - padding * 2);
  const fontSize = Math.max(1, 16 * s);
  const spacing = 4 * s;
  const rowsPerPage = Math.max(
    1,
    Math.floor((bodyH - padding) / (fontSize * 1.45 + spacing))
  );

  panel.body
    .setFontSize(fontSize)
    .setLineSpacing(spacing)
    .setAlign('left')
    .setWordWrapWidth(wrapWidth, true);

  const pages = [];

  for (const { speaker, text } of messages) {
    if (!String(text ?? '').trim()) continue;
    const rows = panel.body.getWrappedText(String(text));

    for (let i = 0; i < rows.length; i += rowsPerPage) {
      pages.push({
        speaker,
        text: rows.slice(i, i + rowsPerPage).join('\n'),
      });
    }
  }

  if (!pages.length) pages.push({ speaker: 'note', text: '' });

  const bubble = panel.scene.add.graphics();
  panel.root.addAt(bubble, panel.root.getIndex(panel.body));

  const renderPage = panel.renderTextPage.bind(panel);

  panel.renderTextPage = () => {
    const page = pages[panel.pageIndex];
    const theme = THEMES[page.speaker] ?? THEMES.note;
    const x = page.speaker === 'player' ? lx + lw - bubbleWidth : lx;
    const radius = Math.max(1, Math.min(8 * s, bubbleWidth / 4));
    const height = Math.max(1, bodyH + padding);

    bubble.clear();
    bubble.fillStyle(theme.fill, 1);
    bubble.fillRoundedRect(x, bodyY - padding, bubbleWidth, height, radius);
    bubble.lineStyle(Math.max(1, s), theme.edge, 1);
    bubble.strokeRoundedRect(x, bodyY - padding, bubbleWidth, height, radius);

    panel.body
      .setPosition(x + padding, bodyY)
      .setColor(theme.text);

    renderPage();

    const label = page.speaker === 'player'
      ? 'YOU'
      : page.speaker === 'npc' ? 'WITNESS' : 'CASE NOTES';

    panel.pageLabel.setText(`${label}  ${panel.pageIndex + 1}/${pages.length}`);
  };

  panel.pages = pages.map(page => page.text);
  panel.pageIndex = 0;
  panel.renderTextPage();
}