import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    el.className = `${"crime-board__item crime-board__item--"}${item.type}`;
    el.dataset.id = item.id;


    if (item.pinned) el.classList.add('is-pinned');
    if (!item.discovered) el.classList.add('is-hidden');
    if (item.createdByPlayer) el.classList.add('is-player-item');
    if (item.editableByPlayer) el.classList.add('is-editable');


    if (item.motiveVerdict === 'correct') el.classList.add('is-motive-correct');
    if (item.motiveVerdict === 'incorrect') el.classList.add('is-motive-incorrect');


    this.applyTagClasses(el, item);


    el.innerHTML = this.getItemMarkup(item);


    el.addEventListener('pointerdown', event => this.onItemPointerDown(event, item.id));
    el.addEventListener('click', event => {
      event.stopPropagation();
      this.selectItem(item.id);
    });


    el.querySelectorAll('[data-anchor]').forEach(anchor => {
      anchor.addEventListener('click', event => {
        event.stopPropagation();
        const anchorName = anchor.dataset.anchor;
        this.handleAnchorClick(item.id, anchorName);
      });
    });


    return el;
  },

  applyTagClasses(el, item) {
    if (!Array.isArray(item.tags) || !item.tags.length) return;


    item.tags.forEach(tag => {
      const safeTag = String(tag)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');


      if (safeTag) {
        el.classList.add(`crime-board__item--tag-${safeTag}`);
      }
    });
  },

  getItemMarkup(item) {
    if (item.type === 'photo') {
      return `${"\n        <div class=\"crime-board__card crime-board__card--photo\">\n          <button class=\"crime-board__anchor crime-board__anchor--top\" data-anchor=\"top\" type=\"button\" aria-label=\"Connect from top\"></button>\n          <button class=\"crime-board__anchor crime-board__anchor--right\" data-anchor=\"right\" type=\"button\" aria-label=\"Connect from right\"></button>\n          <button class=\"crime-board__anchor crime-board__anchor--bottom\" data-anchor=\"bottom\" type=\"button\" aria-label=\"Connect from bottom\"></button>\n          <button class=\"crime-board__anchor crime-board__anchor--left\" data-anchor=\"left\" type=\"button\" aria-label=\"Connect from left\"></button>\n\n\n          <div class=\"crime-board__photo-frame\">\n            <img src=\""}${this.escapeHtml(item.image || '/assets/ui/placeholder-clue.png')}${__dialogueText("crimeBoard/BoardRendering.js", "t_1340c518c0fe44c21e19")}${this.escapeHtml(item.label)}${"\" draggable=\"false\">\n          </div>\n          <h3 class=\"crime-board__label\">"}${this.escapeHtml(item.label)}${"</h3>\n          "}${item.caption ? `${"<p class=\"crime-board__caption\">"}${this.escapeHtml(item.caption)}${"</p>"}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_84fa99eaa1ae972aaeb1")}${item.meta?.length ? `${"<ul class=\"crime-board__meta\">"}${item.meta.map(value => `<li>${this.escapeHtml(value)}</li>`).join('')}${"</ul>"}` : ''}${"\n        </div>\n      "}`;
    }


    if (item.type === 'evidence') {
      return `${"\n        <div class=\"crime-board__card crime-board__card--evidence\">\n          <button class=\"crime-board__anchor crime-board__anchor--top\" data-anchor=\"top\" type=\"button\" aria-label=\"Connect from top\"></button>\n          <button class=\"crime-board__anchor crime-board__anchor--right\" data-anchor=\"right\" type=\"button\" aria-label=\"Connect from right\"></button>\n          <button class=\"crime-board__anchor crime-board__anchor--bottom\" data-anchor=\"bottom\" type=\"button\" aria-label=\"Connect from bottom\"></button>\n          <button class=\"crime-board__anchor crime-board__anchor--left\" data-anchor=\"left\" type=\"button\" aria-label=\"Connect from left\"></button>\n\n\n          <p class=\"crime-board__tag\">"}${this.escapeHtml(item.tag || __dialogueText("crimeBoard/BoardRendering.js", "t_03867aea70acaf4c5dce"))}${"</p>\n          <h3 class=\"crime-board__label\">"}${this.escapeHtml(item.label)}${"</h3>\n          "}${item.body ? `${"<p class=\"crime-board__body\">"}${this.escapeHtml(item.body)}${"</p>"}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_84fa99eaa1ae972aaeb1")}${item.fields?.length ? `${"\n            <dl class=\"crime-board__facts\">\n              "}${item.fields.map(row => `${"\n                <div class=\"crime-board__fact\">\n                  <dt>"}${this.escapeHtml(row.key || '')}${"</dt>\n                  <dd>"}${this.escapeHtml(row.value || '')}${"</dd>\n                </div>\n              "}`).join('')}${"\n            </dl>\n          "}` : ''}${"\n        </div>\n      "}`;
    }


    return `${"\n      <div class=\"crime-board__card crime-board__card--note crime-board__card--"}${this.escapeHtml(item.color || 'yellow')}${"\">\n        <button class=\"crime-board__anchor crime-board__anchor--top\" data-anchor=\"top\" type=\"button\" aria-label=\"Connect from top\"></button>\n        <button class=\"crime-board__anchor crime-board__anchor--right\" data-anchor=\"right\" type=\"button\" aria-label=\"Connect from right\"></button>\n        <button class=\"crime-board__anchor crime-board__anchor--bottom\" data-anchor=\"bottom\" type=\"button\" aria-label=\"Connect from bottom\"></button>\n        <button class=\"crime-board__anchor crime-board__anchor--left\" data-anchor=\"left\" type=\"button\" aria-label=\"Connect from left\"></button>\n\n\n        <h3 class=\"crime-board__label\">"}${this.escapeHtml(item.label)}${"</h3>\n        "}${item.text ? `${"<p class=\"crime-board__body\">"}${this.escapeHtml(item.text)}${"</p>"}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_ac1e06ffe7bf6c03d4ee")}${item.metaText ? `${"<p class=\"crime-board__meta-text\">"}${this.escapeHtml(item.metaText)}${"</p>"}` : ''}${"\n      </div>\n    "}`;
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


    group.appendChild(path);


    if (link.editableByPlayer) {
      group.addEventListener('click', event => {
        event.stopPropagation();
        this.removeLink(link.id);
      });
    }


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
    if (!this._isBoardUsable()) return;


    this.state.links.forEach(link => {
      const group = this.linkElements.get(link.id);
      const path = group?.querySelector('path');
      if (!path) return;


      const fromPoint = this.getAnchorPosition(link.from, link.fromAnchor);
      const toPoint = this.getAnchorPosition(link.to, link.toAnchor);
      if (!fromPoint || !toPoint) return;


      this._setSvgAttr(path, 'd', this.buildLinkPath(fromPoint, toPoint));
      this._setSvgAttr(path, 'stroke', link.color || '#b3131b');
    });


    if (this.connectionMode.active && this.tempPath) {
      this._setSvgAttr(this.tempPath, 'stroke', '#b3131b');
    }
  },

  renderSelectionState() {
    this.itemElements.forEach((el, id) => {
      el.classList.toggle('is-selected', id === this.selectedItemId);
    });
  },

  renderLinksPanel() {
    const list = this.editor.linksList;
    const empty = this.editor.linksEmpty;
    if (!list || !empty) return;


    list.innerHTML = '';


    if (!this.state.links.length) {
      empty.hidden = false;
      return;
    }


    empty.hidden = true;


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
        btn.className = "crime-board-btn crime-board-btn--ghost crime-board-btn--mini";
        btn.textContent = __dialogueText("crimeBoard/BoardRendering.js", "t_e2d0a54968ead24efc0d");
        btn.addEventListener('click', () => this.removeLink(link.id));
        li.appendChild(btn);
      }


      list.appendChild(li);
    });
  }
};
