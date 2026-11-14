export function isForumPage(page) {
  if (!page || page.layout === 'default') {
    return false;
  }

  return (
    page.template === 'forum' ||
    page.theme === 'forum' ||
    page.layout === 'retro-forum' ||
    /\bforum\b/i.test(page.brand || '')
  );
}

function forumPosts(page) {
  if (Array.isArray(page.posts) && page.posts.length) {
    return page.posts.map((post, index) => ({
      author: post.author || 'Archived member',
      role: post.role || 'Member',
      date: post.date || '',
      number: index + 1,
      blocks: Array.isArray(post.blocks)
        ? post.blocks
        : [[String(post.body || '')]]
    }));
  }

  return (page.blocks || []).map((block, index) => {
    const parts = block.map(part =>
      typeof part === 'string'
        ? part
        : { ...part }
    );

    let author = 'Archived post';
    let role = 'Archive';

    if (typeof parts[0] === 'string') {
      const match = parts[0].match(
        /^([A-Z][A-Z0-9_ -]{1,35}):\s*/
      );

      if (match) {
        author = match[1];

        role = /MODERATOR/i.test(author)
          ? 'Moderator'
          : 'Member';

        parts[0] = parts[0].slice(
          match[0].length
        );
      }
    }

    return {
      author,
      role,
      date: '',
      number: index + 1,
      blocks: [parts]
    };
  });
}

export function renderForum(search, page) {
  const ui = search.ui;
  const d = ui.drawing;
  const layout = ui.layout;

  const b = {
    x: layout.x + 14,
    y: layout.y + 10,
    w: layout.w - 28,
    h: layout.h - 58
  };

  ui.window = b;

  const ink = '#263747';
  const muted = '#637581';
  const brand = page.brand || 'COMMUNITY FORUM';

  const text = (
    x,
    y,
    value,
    size = 14,
    color = ink
  ) => d.text(x, y, value, size, color);

  const fit = (
    x,
    y,
    value,
    width,
    size = 12,
    color = ink,
    pixel = false
  ) => {
    const node = d.text(
      x,
      y,
      String(value),
      size,
      color,
      0,
      pixel ? 'pixel' : 'body'
    );

    d.fit(
      node,
      String(value),
      Math.max(1, width)
    );

    return node;
  };

  const button = (
    x,
    y,
    width,
    height,
    label,
    action,
    enabled = true
  ) => {
    d.bevel(
      x,
      y,
      width,
      height,
      enabled ? 0xd7e1e5 : 0xc4cbd0
    );

    const node = fit(
      x + 7,
      y,
      label,
      width - 14,
      9,
      enabled ? ink : '#88939b',
      true
    );

    node.setY(
      y + Math.round(
        (height - node.height) / 2
      )
    );

    if (!enabled) return;

    d.rectangle(
      x,
      y,
      width,
      height,
      0xffffff,
      0.001
    )
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        ui.options.onSfx?.('click');
        action();
      });
  };

  d.rectangle(
    b.x + 5, b.y + 5,
    b.w, b.h,
    0x000000, 0.3
  );

  d.bevel(b.x, b.y, b.w, b.h, 0xc8d0d5);

  d.rectangle(
    b.x + 4, b.y + 4,
    b.w - 8, 28,
    0x344c62
  );

  fit(
    b.x + 12,
    b.y + 13,
    `OWL NAVIGATOR / ${brand}`,
    b.w - 148,
    8,
    '#f1e5bd',
    true
  );

  button(
    b.x + b.w - 34,
    b.y + 7,
    24,
    22,
    'X',
    () => search.back()
  );

  const addressY = b.y + 38;

  button(
    b.x + 10, addressY,
    42, 27, '<',
    () => search.back()
  );

  button(
    b.x + 58, addressY,
    59, 27, 'OWL',
    () => search.goHome()
  );

  d.bevel(
    b.x + 124,
    addressY,
    b.w - 182,
    27,
    0xf5f7f5,
    true
  );

  fit(
    b.x + 132,
    addressY + 8,
    page.address || page.url || page.id,
    b.w - 202,
    12,
    '#3c635b'
  );

  button(
    b.x + b.w - 50,
    addressY,
    40, 27, 'GO',
    () => search.refresh()
  );

  const left = b.x + 12;
  const width = b.w - 24;

  d.rectangle(
    left, b.y + 75,
    width, 55,
    0x284b65
  );

  fit(
    left + 14,
    b.y + 87,
    brand,
    width - 28,
    16,
    '#f1e6bb',
    true
  );

  fit(
    left + 14,
    b.y + 114,
    page.tagline ||
      'Discussion archive / Read-only access',
    width - 28,
    11,
    '#c3d9e1'
  );

  const hasImage = Boolean(
    page.imageKey &&
    page.showImage !== false
  );

  const attachmentOpen =
    hasImage &&
    search._forumAttachmentPageId === page.id;

  d.rectangle(
    left, b.y + 136,
    width, 30,
    0xe0e9ec
  );

  fit(
    left + 10,
    b.y + 147,
    page.sectionLabel ||
      'FORUM INDEX > ARCHIVED DISCUSSIONS',
    width - (hasImage ? 126 : 20),
    9,
    muted,
    true
  );

  if (hasImage) {
    button(
      left + width - 100,
      b.y + 138,
      96,
      26,
      attachmentOpen ? 'THREAD' : 'IMAGE',
      () => {
        search._forumAttachmentPageId =
          attachmentOpen ? null : page.id;

        search.refresh();
      }
    );
  }

  fit(
    left + 10,
    b.y + 180,
    page.heading || page.title || 'Discussion',
    width - 20,
    13,
    ink,
    true
  );

  const top = b.y + 205;
  const footer = b.y + b.h - 35;
  const available = footer - top - 10;

  if (available < 85) {
    fit(
      left + 10,
      top,
      'Enlarge the window to read this thread.',
      width - 20,
      12
    );

    return;
  }

  const drawAttachment = (x, y, w, h) => {
    d.bevel(x, y, w, h, 0xe0e8ed);

    fit(
      x + 10,
      y + 12,
      'ATTACHED IMAGE',
      w - 20,
      8,
      muted,
      true
    );

    const image = search.art(
      page.imageKey,
      x + 10,
      y + 35,
      w - 20,
      Math.max(1, h - 70)
    );

    if (!image) {
      fit(
        x + 12,
        y + 48,
        'IMAGE LOADING / UNAVAILABLE',
        w - 24,
        8,
        muted,
        true
      );
    }

    fit(
      x + 10,
      y + h - 24,
      page.imageCaption ||
        page.caption ||
        'Archived thread attachment',
      w - 20,
      10,
      muted
    );
  };

  const sidebar = (
    hasImage &&
    !attachmentOpen &&
    width >= 720 &&
    available >= 180
  );

  const attachmentWidth = sidebar
    ? Math.min(240, Math.floor(width * 0.28))
    : 0;

  const threadWidth = sidebar
    ? width - attachmentWidth - 10
    : width;

  let pageCount = 1;

  if (attachmentOpen) {
    drawAttachment(
      left,
      top,
      width,
      available
    );
  } else {
    if (sidebar) {
      drawAttachment(
        left + threadWidth + 10,
        top,
        attachmentWidth,
        available
      );
    }

    const font = 14;
    const lineHeight = 22;

    const authorWidth =
      threadWidth >= 650 ? 142 : 100;

    const bodyWidth = Math.max(
      40,
      threadWidth - authorWidth - 32
    );

    const posts = forumPosts(page);

    if (page.links?.length) {
      posts.push({
        author: 'Related threads',
        role: 'Navigation',
        number: null,
        date: '',
        blocks: [],
        links: page.links
      });
    }

    if (!posts.length) {
      posts.push({
        author: 'Archive',
        role: 'Read only',
        number: null,
        date: '',
        blocks: [['No archived posts available.']]
      });
    }

    const capacity = Math.max(
      3,
      Math.floor(available / lineHeight)
    );

    const sheets = [[]];

    let used = 0;

    for (const post of posts) {
      const lines = search.retroArticleLines(
        {
          ...page,
          blocks: post.blocks,
          links: post.links || []
        },
        bodyWidth,
        font
      );

      if (!lines.length) lines.push([]);

      let offset = 0;

      while (offset < lines.length) {
        if (capacity - used < 3) {
          sheets.push([]);
          used = 0;
        }

        const count = Math.min(
          lines.length - offset,
          capacity - used - 2
        );

        sheets[sheets.length - 1].push({
          post,
          lines: lines.slice(
            offset,
            offset + count
          ),
          continued: offset > 0,
          rows: count + 2
        });

        offset += count;
        used += count + 2;

        if (offset < lines.length) {
          sheets.push([]);
          used = 0;
        }
      }
    }

    pageCount = sheets.length;

    search.bodyPage = Math.max(
      0,
      Math.min(
        pageCount - 1,
        Number(search.bodyPage) || 0
      )
    );

    let cursorY = top;

    for (const chunk of sheets[search.bodyPage]) {
      const cardHeight =
        chunk.rows * lineHeight - 5;

      d.rectangle(
        left, cursorY,
        threadWidth, cardHeight,
        0xf7f8f2
      );

      d.rectangle(
        left, cursorY,
        authorWidth, cardHeight,
        0xe0e8ed
      );

      d.rectangle(
        left, cursorY,
        threadWidth, 1,
        0xb1c2ca
      );

      fit(
        left + 9,
        cursorY + 12,
        chunk.post.author,
        authorWidth - 18,
        12,
        '#284b65'
      );

      fit(
        left + 9,
        cursorY + 33,
        chunk.post.role,
        authorWidth - 18,
        10,
        muted
      );

      if (cardHeight >= 75) {
        fit(
          left + 9,
          cursorY + 54,
          '[ archived ]',
          authorWidth - 18,
          9,
          muted
        );
      }

      const bodyX = left + authorWidth + 12;

      const metadata = [
        chunk.post.number
          ? '#' + chunk.post.number
          : null,
        chunk.post.date,
        chunk.continued ? 'continued' : null
      ].filter(Boolean).join(' / ');

      fit(
        bodyX,
        cursorY + 7,
        metadata || 'Archived content',
        bodyWidth,
        10,
        muted
      );

      chunk.lines.forEach((line, index) => {
        let x = bodyX;

        const y =
          cursorY + 26 + index * lineHeight;

        for (const part of line) {
          const known = (
            part.keywordId &&
            search.progress.known.includes(
              part.keywordId
            )
          );

          const color = part.pageId
            ? '#315d91'
            : part.keywordId
              ? known ? '#41714c' : '#9b5236'
              : ink;

          const node = text(
            x, y,
            part.text,
            font,
            color
          );

          if (part.pageId || part.keywordId) {
            d.rectangle(
              x,
              y + node.height + 1,
              Math.max(1, node.width),
              1,
              parseInt(color.slice(1), 16)
            );

            node
              .setInteractive({
                useHandCursor: true
              })
              .on(
                'pointerover',
                () => node.setAlpha(0.65)
              )
              .on(
                'pointerout',
                () => node.setAlpha(1)
              )
              .on('pointerdown', () => {
                ui.options.onSfx?.('click');

                if (part.pageId) {
                  search.openPage(part.pageId);
                } else {
                  search.collect(part.keywordId);
                }
              });
          }

          x += search.textWidth(
            part.text,
            font
          );
        }
      });

      cursorY += chunk.rows * lineHeight;
    }
  }

  button(
    left, footer,
    42, 26, '<',
    () => {
      search.bodyPage--;
      search.refresh();
    },
    !attachmentOpen && search.bodyPage > 0
  );

  button(
    left + 48, footer,
    42, 26, '>',
    () => {
      search.bodyPage++;
      search.refresh();
    },
    !attachmentOpen &&
      search.bodyPage < pageCount - 1
  );

  fit(
    left + 102,
    footer + 9,
    attachmentOpen
      ? 'IMAGE'
      : `${search.bodyPage + 1} / ${pageCount}`,
    90,
    11,
    muted
  );

  fit(
    left + 200,
    footer + 9,
    'ARCHIVED THREAD / REPLIES DISABLED',
    Math.max(1, width - 300),
    9,
    muted,
    true
  );

  button(
    left + width - 88,
    footer,
    88,
    26,
    'NOTES',
    () => {
      if (ui.caseCloudNotebook) {
        ui.caseCloudNotebook.toggle();
      } else {
        search.notesOpen = !search.notesOpen;
        search.refresh();
      }
    }
  );
}