import {
  agencyManualData,
  hasAgencyFieldManual,
  getAgencyManualPages,
  getAgencyManualPageIndex
} from '../managers/AgencyManualService.js';

import {
  prepareManualReaderAudio,
  playManualReaderAudio
} from './ManualReaderAudio.js';

let active = null;

const STYLE_ID = 'agency-field-manual-reader-style';

export function isAgencyManualOpen() {
  return Boolean(active);
}

export function closeAgencyFieldManual() {
  active?.close();
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;

  style.textContent = `
    .agency-manual-reader {
      width: min(980px, 94vw);
      max-height: 90vh;
      box-sizing: border-box;
      margin: auto;
      padding: 0;
      border: 3px solid #ad8d50;
      background: #e9ddbd;
      color: #342d23;
      box-shadow: 12px 14px 0 #0007;
      font-family: SpecialElite, monospace;
      overflow: auto;
    }

    .agency-manual-reader *,
    .agency-manual-reader *::before,
    .agency-manual-reader *::after {
      box-sizing: border-box;
    }

    .agency-manual-reader::backdrop {
      background: #030906d9;
    }

    .agency-manual-reader header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 20px 24px;
      background: #173527;
      color: #ffe2a0;
    }

    .agency-manual-reader h1 {
      font-size: 21px;
      margin: 0;
    }

    .agency-manual-reader .manual-subtitle {
      margin: 8px 0 0;
      font-size: 15px;
    }

    .agency-manual-reader nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 14px 20px;
      border-bottom: 1px solid #ac9468;
    }

    .agency-manual-reader button {
      font: inherit;
      font-size: 17px;
      padding: 8px 12px;
      cursor: pointer;
      border: 1px solid #8d7144;
      background: #f6ebd0;
      color: #342d23;
    }

    .agency-manual-reader button:hover {
      background: #fff5db;
    }

    .agency-manual-reader button:focus-visible {
      outline: 3px solid #497359;
      outline-offset: 2px;
    }

    .agency-manual-reader button[aria-current="page"] {
      background: #284936;
      color: #ffe2a0;
    }

    .agency-manual-reader button:disabled {
      opacity: .45;
      cursor: default;
    }

    .agency-manual-reader article {
      padding: 12px 28px 24px;
      font-size: 20px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .agency-manual-reader article h2 {
      font-size: 26px;
      line-height: 1.3;
    }

    .agency-manual-reader article h3 {
      font-size: 22px;
    }

    .agency-manual-reader article p,
    .agency-manual-reader article li {
      white-space: pre-wrap;
    }

    .agency-manual-reader article li {
      margin-bottom: 10px;
    }

    .agency-manual-reader .manual-table-wrap {
      width: 100%;
      overflow-x: auto;
      margin: 18px 0;
    }

    .agency-manual-reader table {
      width: 100%;
      border-collapse: collapse;
      font-size: 18px;
    }

    .agency-manual-reader th,
    .agency-manual-reader td {
      padding: 10px;
      border: 1px solid #a58c60;
      text-align: left;
      vertical-align: top;
    }

    .agency-manual-reader th {
      background: #d6c49d;
    }

    .agency-manual-reader .manual-note {
      padding: 12px 16px;
      border-left: 4px solid #7a5c35;
      background: #e0cda3;
      font-style: italic;
    }

    .agency-manual-reader .manual-warning {
      margin: 18px 0;
      padding: 14px 18px;
      border: 2px solid #8f543c;
      background: #ead0a8;
    }

    .agency-manual-reader .manual-warning h3 {
      margin-top: 0;
    }

    .agency-manual-reader .manual-stamp {
      display: inline-block;
      padding: 8px 12px;
      border: 2px solid #92563e;
      color: #92563e;
      text-transform: uppercase;
      transform: rotate(-2deg);
    }

    .agency-manual-reader figure {
      margin: 20px 0;
    }

    .agency-manual-reader pre {
      overflow-x: auto;
      white-space: pre;
      font-family: monospace;
    }

    .agency-manual-reader figcaption {
      font-size: 16px;
      font-style: italic;
    }

    .agency-manual-reader .manual-toc,
    .agency-manual-reader .manual-index {
      list-style: none;
      padding-left: 0;
    }

    .agency-manual-reader .manual-toc button {
      width: 100%;
      text-align: left;
    }

    .agency-manual-reader .manual-index button {
      margin: 3px 4px;
      font-size: 16px;
    }

    .agency-manual-reader footer {
      padding: 14px 24px;
      background: #dac9a5;
      font-size: 16px;
    }

    .agency-manual-reader .manual-pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    @media (max-width: 600px) {
      .agency-manual-reader header {
        padding: 14px;
        align-items: flex-start;
      }

      .agency-manual-reader h1 {
        font-size: 17px;
      }

      .agency-manual-reader article {
        font-size: 17px;
        padding: 8px 16px 20px;
      }

      .agency-manual-reader article h2 {
        font-size: 21px;
      }

      .agency-manual-reader nav {
        padding: 10px;
      }

      .agency-manual-reader nav button {
        font-size: 14px;
        padding: 6px 8px;
      }

      .agency-manual-reader footer {
        padding: 12px;
      }
    }
  `;

  document.head.appendChild(style);
}

function appendFormattedText(element, value) {
  const text = String(value ?? '');
  const pattern = /\*\*(.+?)\*\*/g;

  let previousIndex = 0;

  for (const match of text.matchAll(pattern)) {
    element.appendChild(
      document.createTextNode(
        text.slice(previousIndex, match.index)
      )
    );

    const strong = document.createElement('strong');
    strong.textContent = match[1];
    element.appendChild(strong);

    previousIndex = match.index + match[0].length;
  }

  element.appendChild(
    document.createTextNode(text.slice(previousIndex))
  );

  return element;
}

function pageTitle(page) {
  const heading = page.blocks.find(block => block?.t === 'h1');

  return heading?.text || page.header || page.id;
}

function makeButton(label, callback) {
  const button = document.createElement('button');

  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', callback);

  return button;
}

export function openAgencyFieldManual(
  chapterId = 'overview',
  { ownerScene = null } = {}
) {
  if (!hasAgencyFieldManual()) {
    return {
      ok: false,
      consumed: false,
      message: agencyManualData.missingMessage
    };
  }

  if (active) {
    active.select(chapterId);
    active.dialog.focus();

    return {
      ok: true,
      consumed: false,
      openedDocument: true,
      message: ''
    };
  }

  const pages = getAgencyManualPages();

  if (
    !Array.isArray(pages) ||
    pages.length === 0 ||
    pages.some(page =>
      !page ||
      typeof page.id !== 'string' ||
      !Array.isArray(page.blocks)
    )
  ) {
    return {
      ok: false,
      consumed: false,
      message: 'The Field Manual has invalid page data.'
    };
  }

  ensureStyles();

  const game = window.game;

  const owner =
    ownerScene ||
    game?.scene?.keys?.[
      game?.registry?.get('currentSceneKey')
    ];

  const dialog = document.createElement('dialog');
  dialog.className = 'agency-manual-reader';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-label', agencyManualData.title);

  const header = document.createElement('header');
  const titleGroup = document.createElement('div');
  const title = document.createElement('h1');

  title.textContent = agencyManualData.title;
  titleGroup.appendChild(title);

  if (agencyManualData.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = 'manual-subtitle';
    subtitle.textContent = agencyManualData.subtitle;
    titleGroup.appendChild(subtitle);
  }

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Manual pages');

  const article = document.createElement('article');
  const footer = document.createElement('footer');
  const pagination = document.createElement('div');

  pagination.className = 'manual-pagination';

  const pageCounter = document.createElement('span');
  pageCounter.setAttribute('aria-live', 'polite');

  const note = document.createElement('div');
  note.textContent =
    'Reading is free. The book remains in your inventory. ' +
    'Missing copy? Ask Alex in Storage.';

  let currentIndex = -1;
  let closed = false;

  const buttons = [];

  function playSound(key) {
    try {
      playManualReaderAudio(owner, key);
    } catch (error) {
      console.warn('[AgencyManualReader] Audio unavailable:', error);
    }
  }

  function pageLink(id, label = null) {
    const index = getAgencyManualPageIndex(id);

    const button = makeButton(
      label || (
        index >= 0
          ? `p. ${index + 1}`
          : String(id)
      ),
      () => select(id)
    );

    button.disabled = index < 0;

    if (index >= 0) {
      button.title = pageTitle(pages[index]);
    }

    return button;
  }

  function renderBlock(block) {
    if (!block) return;

    if (typeof block === 'string') {
      const paragraph = document.createElement('p');
      appendFormattedText(paragraph, block);
      article.appendChild(paragraph);
      return;
    }

    switch (block.t) {
      case 'h1':
      case 'h2': {
        const heading = document.createElement(
          block.t === 'h1' ? 'h2' : 'h3'
        );

        appendFormattedText(heading, block.text);
        article.appendChild(heading);
        break;
      }

      case 'list': {
        const list = document.createElement(
          block.ordered ? 'ol' : 'ul'
        );

        for (const text of block.items || []) {
          const item = document.createElement('li');
          appendFormattedText(item, text);
          list.appendChild(item);
        }

        article.appendChild(list);
        break;
      }

      case 'table': {
        const wrapper = document.createElement('div');
        wrapper.className = 'manual-table-wrap';

        const table = document.createElement('table');

        if (Array.isArray(block.head)) {
          const head = document.createElement('thead');
          const row = document.createElement('tr');

          for (const text of block.head) {
            const cell = document.createElement('th');
            cell.scope = 'col';
            appendFormattedText(cell, text);
            row.appendChild(cell);
          }

          head.appendChild(row);
          table.appendChild(head);
        }

        const body = document.createElement('tbody');

        for (const values of block.rows || []) {
          const row = document.createElement('tr');

          for (const text of values) {
            const cell = document.createElement('td');
            appendFormattedText(cell, text);
            row.appendChild(cell);
          }

          body.appendChild(row);
        }

        table.appendChild(body);
        wrapper.appendChild(table);
        article.appendChild(wrapper);
        break;
      }

      case 'toc': {
        const list = document.createElement('ul');
        list.className = 'manual-toc';

        for (const entry of block.entries || []) {
          const item = document.createElement('li');

          item.appendChild(
            pageLink(entry.page, entry.title)
          );

          list.appendChild(item);
        }

        article.appendChild(list);
        break;
      }

      case 'index': {
        const list = document.createElement('ul');
        list.className = 'manual-index';

        for (const entry of block.entries || []) {
          const item = document.createElement('li');

          appendFormattedText(item, entry.term);

          if (entry.see) {
            item.appendChild(
              document.createTextNode(` — see ${entry.see}`)
            );
          }

          for (const id of entry.pages || []) {
            item.appendChild(pageLink(id));
          }

          list.appendChild(item);
        }

        article.appendChild(list);
        break;
      }

      case 'warn': {
        const box = document.createElement('aside');
        box.className = 'manual-warning';

        if (block.title) {
          const heading = document.createElement('h3');
          appendFormattedText(heading, block.title);
          box.appendChild(heading);
        }

        const paragraph = document.createElement('p');
        appendFormattedText(paragraph, block.text);
        box.appendChild(paragraph);
        article.appendChild(box);
        break;
      }

      case 'figure': {
        const figure = document.createElement('figure');
        const art = document.createElement('pre');

        art.textContent = block.art || '';
        figure.appendChild(art);

        if (block.caption) {
          const caption = document.createElement('figcaption');
          appendFormattedText(caption, block.caption);
          figure.appendChild(caption);
        }

        article.appendChild(figure);
        break;
      }

      default: {
        const paragraph = document.createElement('p');

        if (block.t === 'hand') {
          paragraph.className = 'manual-note';
        } else if (block.t === 'stamp') {
          paragraph.className = 'manual-stamp';
        }

        appendFormattedText(paragraph, block.text);
        article.appendChild(paragraph);
      }
    }
  }

  function select(id, { sound = true } = {}) {
    if (closed) return;

    const resolvedIndex = getAgencyManualPageIndex(id);
    const index = resolvedIndex >= 0 ? resolvedIndex : 0;
    const changed = currentIndex !== index;

    currentIndex = index;

    article.replaceChildren();

    for (const block of pages[index].blocks) {
      renderBlock(block);
    }

    for (const entry of buttons) {
      if (entry.index === index) {
        entry.button.setAttribute('aria-current', 'page');
      } else {
        entry.button.removeAttribute('aria-current');
      }
    }

    previousButton.disabled = index === 0;
    nextButton.disabled = index === pages.length - 1;

    pageCounter.textContent =
      `PAGE ${index + 1} / ${pages.length}`;

    if (changed) {
      dialog.scrollTop = 0;

      if (sound && active?.dialog === dialog) {
        playSound('page');
      }
    }
  }

  function finish() {
    if (closed) return;

    closed = true;

    if (active?.dialog === dialog) {
      active = null;
    }

    window.removeEventListener('keydown', stopKeys, true);

    owner?.events?.off('shutdown', finish);
    owner?.events?.off('sleep', finish);
    game?.events?.off('destroy', finish);

    if (dialog.open) {
      dialog.close();
    }

    dialog.remove();
  }

  function stopKeys(event) {
    if (active?.dialog !== dialog) return;

    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      finish();
    }
  }

  const closeButton = makeButton('CLOSE / ESC', finish);

  header.append(titleGroup, closeButton);

  const previousButton = makeButton('PREVIOUS', () => {
    if (currentIndex > 0) {
      select(pages[currentIndex - 1].id);
    }
  });

  const nextButton = makeButton('NEXT', () => {
    if (currentIndex < pages.length - 1) {
      select(pages[currentIndex + 1].id);
    }
  });

  pagination.append(
    previousButton,
    pageCounter,
    nextButton
  );

  footer.append(pagination, note);

  pages.forEach((page, index) => {
    const label = `${index + 1}. ${page.header || pageTitle(page)}`;

    const button = makeButton(
      label,
      () => select(page.id)
    );

    button.title = pageTitle(page);

    nav.appendChild(button);
    buttons.push({ index, button });
  });

  dialog.append(header, nav, article, footer);

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    finish();
  });

  dialog.addEventListener('close', finish);

  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();

    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      finish();
    }
  });

  try {
    document.body.appendChild(dialog);

    active = {
      dialog,
      select,
      close: finish
    };

    window.addEventListener('keydown', stopKeys, true);

    owner?.events?.once('shutdown', finish);
    owner?.events?.once('sleep', finish);
    game?.events?.once('destroy', finish);

    select(chapterId, { sound: false });

    dialog.showModal();
    dialog.focus();
  } catch (error) {
    finish();

    console.error('[AgencyManualReader] Opening failed:', error);

    return {
      ok: false,
      consumed: false,
      message: `The manual could not be opened: ${error.message}`
    };
  }

  try {
    prepareManualReaderAudio(owner);
    playSound('paper');
  } catch (error) {
    console.warn('[AgencyManualReader] Audio preparation failed:', error);
  }

  return {
    ok: true,
    consumed: false,
    openedDocument: true,
    message: ''
  };
}