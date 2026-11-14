import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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

  style.textContent = `${__dialogueText("ui/AgencyManualReader.js", "t_5f03efaae99b96432423")}`;

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
      message: __dialogueText("ui/AgencyManualReader.js", "t_88d147bbc7a940260a62")
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
  nav.setAttribute('aria-label', __dialogueText("ui/AgencyManualReader.js", "t_f339920a9248a126c9a9"));

  const article = document.createElement('article');
  const footer = document.createElement('footer');
  const pagination = document.createElement('div');

  pagination.className = 'manual-pagination';

  const pageCounter = document.createElement('span');
  pageCounter.setAttribute('aria-live', 'polite');

  const note = document.createElement('div');
  note.textContent =
    __dialogueText("ui/AgencyManualReader.js", "t_6b40295f0990b9bdd5c6") +
    __dialogueText("ui/AgencyManualReader.js", "t_a53c8068e840aae691cc");

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
          ? `${__dialogueText("ui/AgencyManualReader.js", "t_bb82c40a9dd355294bea")}${index + 1}`
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
              document.createTextNode(`${__dialogueText("ui/AgencyManualReader.js", "t_2dabb1ede6783ed390e6")}${entry.see}`)
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
      `${__dialogueText("ui/AgencyManualReader.js", "t_f8119b8ecd8507346fa7")}${index + 1}${__dialogueText("ui/AgencyManualReader.js", "t_005e1574a2b5c8163046")}${pages.length}`;

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

    if (event.key === __dialogueText("ui/AgencyManualReader.js", "t_037c968467aa3fd7c059")) {
      event.preventDefault();
      finish();
    }
  }

  const closeButton = makeButton(__dialogueText("ui/AgencyManualReader.js", "t_01244bcb87769b89d93f"), finish);

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
      message: `${__dialogueText("ui/AgencyManualReader.js", "t_1a84fd9237a09558848c")}${error.message}`
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