import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";

function boardGeometry(board) {
  const layer = board.itemsLayer || board.root;
  const rect = layer.getBoundingClientRect();
  const width = layer.clientWidth || board.root.clientWidth || 0;
  const height = layer.clientHeight || board.root.clientHeight || 0;
  if (!(width > 0 && height > 0 && rect.width > 0 && rect.height > 0)) return null;
  return { left: rect.left, top: rect.top, width, height,
    scaleX: rect.width / width, scaleY: rect.height / height };
}

export const BoardInteraction = {
  bindSidebar() {
    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.addEventListener('click', () => {
        if (this.sidebar?.classList.contains('is-collapsed')) {
          this.expandSidebar();
        } else {
          this.collapseSidebar();
        }
      });
    }
    if (this.sidebarTabBtn) {
      this.sidebarTabBtn.addEventListener('click', () => {
        if (this.sidebar?.classList.contains('is-collapsed')) {
          this.expandSidebar();
        } else {
          this.collapseSidebar();
        }
      });
    }
  },

  collapseSidebar() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove('is-open');
    this.sidebar.classList.add('is-collapsed');
    this.app.classList.add('is-sidebar-collapsed');
    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.textContent = __dialogueText("crimeBoard/BoardInteraction.js", "t_0df6f1cad36c49da768a");
      this.sidebarToggleBtn.setAttribute('aria-expanded', 'false');
    }
    if (this.sidebarTabBtn) this.sidebarTabBtn.setAttribute('aria-expanded', 'false');
  },

  expandSidebar() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove('is-collapsed');
    this.sidebar.classList.add('is-open');
    this.app.classList.remove('is-sidebar-collapsed');
    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.textContent = __dialogueText("crimeBoard/BoardInteraction.js", "t_ac20a57bfde0bbc40bfe");
      this.sidebarToggleBtn.setAttribute('aria-expanded', 'true');
    }
    if (this.sidebarTabBtn) this.sidebarTabBtn.setAttribute('aria-expanded', 'true');
  },

  constrainItemPosition(item, element, x = item.x, y = item.y) {
    const geometry = boardGeometry(this);
    if (!geometry || !element) return false;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    if (!(width > 0 && height > 0)) return false;
    const angle = (Number.isFinite(item.rotation) ? item.rotation : 0) * Math.PI / 180;
    const rotatedWidth = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height;
    const rotatedHeight = Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height;
    const extraX = (rotatedWidth - width) / 2;
    const extraY = (rotatedHeight - height) / 2;
    const margin = 12;
    const minX = Math.max(0, margin + extraX);
    const minY = Math.max(0, margin + extraY);
    // Oversized cards cannot fit in full: keep their top-left area reachable.
    const maxX = Math.max(minX, geometry.width - width - extraX - margin);
    const maxY = Math.max(minY, geometry.height - height - extraY - margin);
    const nextX = Math.min(maxX, Math.max(minX, Number.isFinite(x) ? x : minX));
    const nextY = Math.min(maxY, Math.max(minY, Number.isFinite(y) ? y : minY));
    const changed = item.x !== nextX || item.y !== nextY;
    item.x = nextX;
    item.y = nextY;
    return changed;
  },

  // May also be called by the UI to recover previously saved out-of-bounds cards.
  recoverOutsideItems() {
    if (!this._isBoardUsable()) return false;
    let changed = false;
    for (const item of this.state.items) {
      const element = this.itemElements.get(item.id);
      if (this.constrainItemPosition(item, element)) {
        this.renderItemPosition(item);
        changed = true;
      }
    }
    if (changed) {
      this.renderLinks();
      this.syncJsonOutput();
    }
    return changed;
  },

  onItemPointerDown(event, itemId) {
    if (event.button !== 0 || event.isPrimary === false || !this._isBoardUsable()) return;
    const item = this.getItemById(itemId);
    const el = this.itemElements.get(itemId);
    const geometry = boardGeometry(this);
    if (!item || !el || !geometry) return;
    this.clearDragState();
    this.constrainItemPosition(item, el);
    this.drag.activeId = itemId;
    this.drag.pointerId = event.pointerId;
    // Offset from the unrotated layout position prevents a jump on rotated cards.
    this.drag.offsetX = (event.clientX - geometry.left) / geometry.scaleX - item.x;
    this.drag.offsetY = (event.clientY - geometry.top) / geometry.scaleY - item.y;
    item.z = this.nextZ();
    el.classList?.add('is-dragging');
    this.renderItemPosition(item);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointercancel', this.boundPointerUp);
    try { el.setPointerCapture?.(event.pointerId); } catch { /* Pointer may no longer be active. */ }
    event.preventDefault();
  },

  onWindowPointerMove(event) {
    if (this.drag.activeId == null) return;
    if (event.pointerId !== this.drag.pointerId) return;
    if (!this._isBoardUsable()) {
      this.clearDragState();
      return;
    }
    const item = this.getItemById(this.drag.activeId);
    const el = this.itemElements.get(this.drag.activeId);
    const geometry = boardGeometry(this);
    if (!item || !el || !geometry) {
      this.clearDragState();
      return;
    }
    const x = (event.clientX - geometry.left) / geometry.scaleX - this.drag.offsetX;
    const y = (event.clientY - geometry.top) / geometry.scaleY - this.drag.offsetY;
    this.constrainItemPosition(item, el, x, y);
    this.renderItemPosition(item);
    this.renderLinks();
  },

  onWindowPointerUp(event) {
    if (this.drag.activeId == null) return;
    if (event?.pointerId != null && event.pointerId !== this.drag.pointerId) return;
    this.clearDragState();
    this.syncJsonOutput();
  },

  clearDragState() {
    const el = this.itemElements?.get(this.drag.activeId);
    const pointerId = this.drag.pointerId;
    this.drag.activeId = null;
    this.drag.pointerId = null;
    this.drag.offsetX = 0;
    this.drag.offsetY = 0;
    el?.classList?.remove('is-dragging');
    try {
      if (pointerId != null && el?.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch { /* The browser may have already released capture. */ }
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerUp);
  }
};
