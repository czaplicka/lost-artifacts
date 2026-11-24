import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";

const ASSETS_ROOT = new URL('../assets/', import.meta.url);
const FALLBACK_IMAGE = new URL('artifacts/artifact_unknown.webp', ASSETS_ROOT).href;
const GAME_ROOT = new URL('../', import.meta.url);
const anchors = ['top', 'right', 'bottom', 'left'].map(side =>
  `<button class="crime-board__anchor crime-board__anchor--${side}" data-anchor="${side}" type="button" aria-label="Connect from ${side}"></button>`).join('');

// Accept only raster assets inside this game's assets directory, never arbitrary remote URLs.
export function safeBoardImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return FALLBACK_IMAGE;
  try {
    const url = new URL(value.trim(), GAME_ROOT);
    if (!['https:', 'http:'].includes(url.protocol) ||
        url.origin !== ASSETS_ROOT.origin || url.username || url.password ||
        !url.pathname.startsWith(ASSETS_ROOT.pathname) ||
        /%(?:2f|5c|2e|25)/i.test(url.pathname) ||
        !/\.(?:webp|png|jpe?g|gif|avif)$/i.test(url.pathname)) return FALLBACK_IMAGE;
    // Query strings are unnecessary for board photos and may carry tracking identifiers.
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return FALLBACK_IMAGE;
  }
}

function anchorPosition(rect, root, side) {
  const left = rect.left - root.left;
  const top = rect.top - root.top;
  switch (side) {
    case 'top': return { x: left + rect.width / 2, y: top };
    case 'bottom': return { x: left + rect.width / 2, y: top + rect.height };
    case 'left': return { x: left, y: top + rect.height / 2 };
    default: return { x: left + rect.width, y: top + rect.height / 2 };
  }
}

export const BoardRendering = {
  render() {
    if (!this._isBoardUsable()) return;
    this.itemsLayer.innerHTML = '';
    this.svg.innerHTML = '';
    this.itemElements.clear();
    this.linkElements.clear();
    this.state.items.forEach(item => {
      const el = this.createItemElement(item);
      this.itemsLayer.appendChild(el);
      this.itemElements.set(item.id, el);
    });
    this.state.links.forEach(link => {
      const group = this.createLinkElement(link);
      this.svg.appendChild(group);
      this.linkElements.set(link.id, group);
    });
    this.renderItemPositions();
    this.renderLinks();
    this.renderSelectionState();
    this.renderLinksPanel();
  },
  createItemElement(item) {
    const el = document.createElement('article');
    el.className = `crime-board__item crime-board__item--${item.type}`;
    el.dataset.id = item.id;
    // Keep the rendered state safe for other board views reading these same cards.
    if (item.type === 'photo') item.image = safeBoardImageUrl(item.image);
    if (item.pinned) el.classList.add('is-pinned');
    if (!item.discovered) el.classList.add('is-hidden');
    if (item.createdByPlayer) el.classList.add('is-player-item');
    if (item.editableByPlayer) el.classList.add('is-editable');
    if (item.motiveVerdict === 'correct') el.classList.add('is-motive-correct');
    if (item.motiveVerdict === 'incorrect') el.classList.add('is-motive-incorrect');
    this.applyTagClasses(el, item);
    el.innerHTML = this.getItemMarkup(item);
    el.addEventListener('pointerdown', event => this.onItemPointerDown(event, item.id));
    el.addEventListener('click', event => { event.stopPropagation(); this.selectItem(item.id); });
    el.querySelectorAll('[data-anchor]').forEach(anchor => {
      anchor.addEventListener('click', event => {
        event.stopPropagation();
        this.handleAnchorClick(item.id, anchor.dataset.anchor);
      });
    });
    return el;
  },
  applyTagClasses(el, item) {
    if (!Array.isArray(item.tags)) return;
    item.tags.forEach(tag => {
      const safeTag = String(tag).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      if (safeTag) el.classList.add(`crime-board__item--tag-${safeTag}`);
    });
  },
  getItemMarkup(item) {
    const escape = value => this.escapeHtml(value);
    if (item.type === 'photo') {
      return `<div class="crime-board__card crime-board__card--photo">${anchors}
        <div class="crime-board__photo-frame"><img src="${escape(safeBoardImageUrl(item.image))}" alt="${escape(item.label)}" referrerpolicy="no-referrer" draggable="false"></div>
        <h3 class="crime-board__label">${escape(item.label)}</h3>
        ${item.caption ? `<p class="crime-board__caption">${escape(item.caption)}</p>` : ''}
        ${item.meta?.length ? `<ul class="crime-board__meta">${item.meta.map(value => `<li>${escape(value)}</li>`).join('')}</ul>` : ''}
      </div>`;
    }
    if (item.type === 'evidence') {
      return `<div class="crime-board__card crime-board__card--evidence">${anchors}
        <p class="crime-board__tag">${escape(item.tag || __dialogueText("crimeBoard/BoardRendering.js", "t_03867aea70acaf4c5dce"))}</p>
        <h3 class="crime-board__label">${escape(item.label)}</h3>
        ${item.body ? `<p class="crime-board__body">${escape(item.body)}</p>` : ''}
        ${item.fields?.length ? `<dl class="crime-board__facts">${item.fields.map(row => `<div class="crime-board__fact"><dt>${escape(row.key || '')}</dt><dd>${escape(row.value || '')}</dd></div>`).join('')}</dl>` : ''}
      </div>`;
    }
    return `<div class="crime-board__card crime-board__card--note crime-board__card--${escape(item.color || 'yellow')}">${anchors}
      <h3 class="crime-board__label">${escape(item.label)}</h3>
      ${item.text ? `<p class="crime-board__body">${escape(item.text)}</p>` : ''}
      ${item.metaText ? `<p class="crime-board__meta-text">${escape(item.metaText)}</p>` : ''}
    </div>`;
  },
  createLinkElement(link) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('crime-board__link');
    group.dataset.id = link.id;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('crime-board__link-path');
    this._setSvgAttr(path, 'fill', 'none');
    this._setSvgAttr(path, 'stroke', link.color || '#b3131b');
    this._setSvgAttr(path, 'stroke-width', '3');
    this._setSvgAttr(path, 'stroke-linecap', 'round');
    this._setSvgAttr(path, 'stroke-linejoin', 'round');
    this._setSvgAttr(group, 'pointer-events', 'none');
    this._setSvgAttr(path, 'pointer-events', 'none');
    group.appendChild(path);
    return group;
  },
  renderItemPositions() {
    this.state.items.forEach(item => this.renderItemPosition(item));
  },
  renderItemPosition(item) {
    const el = this.itemElements.get(item.id);
    if (!el) return;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.zIndex = String(item.z || 1);
    el.style.transform = `rotate(${item.rotation || 0}deg)`;
  },
  renderLinks() {
    if (!this._isBoardUsable() || this._linksRenderQueued) return;
    if (typeof globalThis.requestAnimationFrame !== 'function') {
      this.flushLinkRendering();
      return;
    }
    this._linksRenderQueued = true;
    globalThis.requestAnimationFrame(() => {
      this._linksRenderQueued = false;
      if (this._isBoardUsable()) this.flushLinkRendering();
    });
  },
  flushLinkRendering() {
    if (!this._isBoardUsable()) return;
    const links = this.state.links;
    if (!links.length) return;
    const rootRect = this.root.getBoundingClientRect();
    const rects = new Map();
    const pending = [];
    const rectFor = id => {
      if (!rects.has(id)) rects.set(id, this.itemElements.get(id)?.getBoundingClientRect() || null);
      return rects.get(id);
    };
    // Read all geometry before making any SVG writes; measure each linked card just once.
    for (const link of links) {
      const path = this.linkElements.get(link.id)?.querySelector('path');
      if (!path) continue;
      const fromRect = rectFor(link.from);
      const toRect = rectFor(link.to);
      if (!fromRect || !toRect) continue;
      pending.push({ path, color: link.color || '#b3131b', d: this.buildLinkPath(
        anchorPosition(fromRect, rootRect, link.fromAnchor),
        anchorPosition(toRect, rootRect, link.toAnchor || 'left')) });
    }
    for (const update of pending) {
      this._setSvgAttr(update.path, 'd', update.d);
      this._setSvgAttr(update.path, 'stroke', update.color);
    }
    if (this.connectionMode.active && this.tempPath) this._setSvgAttr(this.tempPath, 'stroke', '#b3131b');
  },
  renderSelectionState() {
    this.itemElements.forEach((el, id) => el.classList.toggle('is-selected', id === this.selectedItemId));
  },
  renderLinksPanel() {
    const list = this.editor.linksList;
    const empty = this.editor.linksEmpty;
    if (!list || !empty) return;
    list.innerHTML = '';
    empty.hidden = this.state.links.length > 0;
    this.state.links.forEach(link => {
      const from = this.getItemById(link.from);
      const to = this.getItemById(link.to);
      const li = document.createElement('li');
      li.className = 'crime-board-links-list__item';
      const label = document.createElement('span');
      label.textContent = `${from?.label || link.from} → ${to?.label || link.to}`;
      li.appendChild(label);
      if (link.editableByPlayer) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'crime-board-btn crime-board-btn--ghost crime-board-btn--mini';
        btn.textContent = __dialogueText("crimeBoard/BoardRendering.js", "t_e2d0a54968ead24efc0d");
        btn.addEventListener('click', event => { event.stopPropagation(); this.removeLink(link.id); });
        li.appendChild(btn);
      }
      list.appendChild(li);
    });
  }
};
