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
    el.className = `${__dialogueText("crimeBoard/BoardRendering.js", "t_7286fbf0d4d24b376bbb")}${item.type}`;
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
      return `${__dialogueText("crimeBoard/BoardRendering.js", "t_12d0ba68b4d51c494f99")}${this.escapeHtml(item.image || '/assets/ui/placeholder-clue.png')}${__dialogueText("crimeBoard/BoardRendering.js", "t_1340c518c0fe44c21e19")}${this.escapeHtml(item.label)}${__dialogueText("crimeBoard/BoardRendering.js", "t_9cc2964476c4a6bf4267")}${this.escapeHtml(item.label)}${__dialogueText("crimeBoard/BoardRendering.js", "t_17991d61c7c678c3eb6b")}${item.caption ? `${__dialogueText("crimeBoard/BoardRendering.js", "t_be9dab14fd7c396e820f")}${this.escapeHtml(item.caption)}${__dialogueText("crimeBoard/BoardRendering.js", "t_75276f3cd0194a647ce8")}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_84fa99eaa1ae972aaeb1")}${item.meta?.length ? `${__dialogueText("crimeBoard/BoardRendering.js", "t_defbeba7842b6c974ba2")}${item.meta.map(value => `<li>${this.escapeHtml(value)}</li>`).join('')}${__dialogueText("crimeBoard/BoardRendering.js", "t_348845d8804b5c895e2a")}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_b75c14a915cf9a76eb1e")}`;
    }


    if (item.type === 'evidence') {
      return `${__dialogueText("crimeBoard/BoardRendering.js", "t_5e515334e95138b2e812")}${this.escapeHtml(item.tag || __dialogueText("crimeBoard/BoardRendering.js", "t_03867aea70acaf4c5dce"))}${__dialogueText("crimeBoard/BoardRendering.js", "t_81baf74355f4cafb45ed")}${this.escapeHtml(item.label)}${__dialogueText("crimeBoard/BoardRendering.js", "t_17991d61c7c678c3eb6b")}${item.body ? `${__dialogueText("crimeBoard/BoardRendering.js", "t_561901cf233ade5155d0")}${this.escapeHtml(item.body)}${__dialogueText("crimeBoard/BoardRendering.js", "t_75276f3cd0194a647ce8")}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_84fa99eaa1ae972aaeb1")}${item.fields?.length ? `${__dialogueText("crimeBoard/BoardRendering.js", "t_4b271bc2da82ca4f8387")}${item.fields.map(row => `${__dialogueText("crimeBoard/BoardRendering.js", "t_c46ab75c82302760fe4f")}${this.escapeHtml(row.key || '')}${__dialogueText("crimeBoard/BoardRendering.js", "t_6689939c82e0f67dcc7c")}${this.escapeHtml(row.value || '')}${__dialogueText("crimeBoard/BoardRendering.js", "t_515219eba26668611d00")}`).join('')}${__dialogueText("crimeBoard/BoardRendering.js", "t_9a0348008be359086499")}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_b75c14a915cf9a76eb1e")}`;
    }


    return `${__dialogueText("crimeBoard/BoardRendering.js", "t_27a84bf68323b5f8b7f8")}${this.escapeHtml(item.color || 'yellow')}${__dialogueText("crimeBoard/BoardRendering.js", "t_e16b7f700fcce87762cc")}${this.escapeHtml(item.label)}${__dialogueText("crimeBoard/BoardRendering.js", "t_0c4638f7ae71f88ff6c8")}${item.text ? `${__dialogueText("crimeBoard/BoardRendering.js", "t_561901cf233ade5155d0")}${this.escapeHtml(item.text)}${__dialogueText("crimeBoard/BoardRendering.js", "t_75276f3cd0194a647ce8")}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_ac1e06ffe7bf6c03d4ee")}${item.metaText ? `${__dialogueText("crimeBoard/BoardRendering.js", "t_afff344a989932066c4c")}${this.escapeHtml(item.metaText)}${__dialogueText("crimeBoard/BoardRendering.js", "t_75276f3cd0194a647ce8")}` : ''}${__dialogueText("crimeBoard/BoardRendering.js", "t_01043c89f1403fad8b07")}`;
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
        btn.className = __dialogueText("crimeBoard/BoardRendering.js", "t_971e08e3ce07c3709b9c");
        btn.textContent = __dialogueText("crimeBoard/BoardRendering.js", "t_e2d0a54968ead24efc0d");
        btn.addEventListener('click', () => this.removeLink(link.id));
        li.appendChild(btn);
      }


      list.appendChild(li);
    });
  }
};
