const EVIDENCE_COLORS = {
  normalText: '#343e35',

  newText: '#171717',
  newBackground: 0xffe600,

  knownText: '#303030',
  knownBackground: 0xd9d9d9
};

export function drawEvidenceText(
  ui,
  {
    blocks,
    x,
    y,
    width,
    fontSize = 16,
    lineHeight = 25,
    onCollect,
    isKnown = () => false
  }
) {
  const drawing = ui.drawing;

  const probe = ui.scene.add.text(
    0,
    0,
    '',
    {
      fontFamily:
        'SpecialElite, "Special Elite", monospace',
      fontSize: `${fontSize}px`
    }
  ).setVisible(false);

  const measure = value => {
    probe.setText(value);
    return probe.width;
  };

  let offsetX = 0;
  let offsetY = 0;

  const newline = () => {
    offsetX = 0;
    offsetY += lineHeight;
  };

  try {
    for (
      let blockIndex = 0;
      blockIndex < blocks.length;
      blockIndex++
    ) {
      for (const part of blocks[blockIndex]) {
        const fragment =
          typeof part === 'string'
            ? { text: part }
            : part;

        const keywordId = fragment.keywordId;

        const known = Boolean(
          keywordId &&
          isKnown(keywordId)
        );

        const tokens = String(
          fragment.text || ''
        )
          .split(/(\n|[^\S\n]+)/)
          .filter(Boolean);

        for (const token of tokens) {
          if (token === '\n') {
            newline();
            continue;
          }

          if (/^\s+$/.test(token)) {
            if (offsetX) {
              offsetX += measure(token);
            }

            continue;
          }

          const chunks = [];
          let chunk = '';

          for (const character of token) {
            if (
              chunk &&
              measure(chunk + character) > width
            ) {
              chunks.push(chunk);
              chunk = '';
            }

            chunk += character;
          }

          if (chunk) {
            chunks.push(chunk);
          }

          for (const text of chunks) {
            const textWidth = measure(text);

            if (
              offsetX &&
              offsetX + textWidth > width
            ) {
              newline();
            }

            const textColor = keywordId
              ? (
                  known
                    ? EVIDENCE_COLORS.knownText
                    : EVIDENCE_COLORS.newText
                )
              : EVIDENCE_COLORS.normalText;

            const label = drawing.text(
              x + offsetX,
              y + offsetY,
              text,
              fontSize,
              textColor
            );

            if (keywordId) {
              const background =
                drawing.rectangle(
                  label.x - 1,
                  label.y,
                  label.width + 2,
                  lineHeight - 2,
                  known
                    ? EVIDENCE_COLORS.knownBackground
                    : EVIDENCE_COLORS.newBackground
                );

              ui.content.moveBelow(
                background,
                label
              );

              if (
                !known &&
                typeof onCollect === 'function'
              ) {
                label
                  .setInteractive({
                    useHandCursor: true
                  })
                  .on('pointerdown', () => {
                    if (!isKnown(keywordId)) {
                      onCollect(keywordId);
                    }
                  });
              }
            }

            offsetX += textWidth;
          }
        }
      }

      if (blockIndex < blocks.length - 1) {
        newline();
      }
    }
  } finally {
    probe.destroy();
  }

  return offsetY + lineHeight;
}