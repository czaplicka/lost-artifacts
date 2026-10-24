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
      this.sidebarToggleBtn.textContent = 'Show';
      this.sidebarToggleBtn.setAttribute('aria-expanded', 'false');
    }


    if (this.sidebarTabBtn) {
      this.sidebarTabBtn.setAttribute('aria-expanded', 'false');
    }
  },

  expandSidebar() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove('is-collapsed');
    this.sidebar.classList.add('is-open');
    this.app.classList.remove('is-sidebar-collapsed');


    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.textContent = 'Hide';
      this.sidebarToggleBtn.setAttribute('aria-expanded', 'true');
    }


    if (this.sidebarTabBtn) {
      this.sidebarTabBtn.setAttribute('aria-expanded', 'true');
    }
  },

  onItemPointerDown(event, itemId) {
    if (event.button !== 0) return;
    if (!this._isBoardUsable()) return;


    const item = this.getItemById(itemId);
    const el = this.itemElements.get(itemId);
    if (!item || !el) return;


    const rect = el.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();


    this.drag.activeId = itemId;
    this.drag.pointerId = event.pointerId;
    this.drag.offsetX = event.clientX - rect.left;
    this.drag.offsetY = event.clientY - rect.top;


    item.z = this.nextZ();
    this.renderItemPosition(item);


    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);


    el.setPointerCapture?.(event.pointerId);
    event.preventDefault();


    this.drag.rootRect = rootRect;
  },

  onWindowPointerMove(event) {
    if (!this.drag.activeId) return;
    if (!this._isBoardUsable()) {
      this.clearDragState();
      return;
    }


    const item = this.getItemById(this.drag.activeId);
    if (!item) return;


    const rootRect = this.root.getBoundingClientRect();
    item.x = event.clientX - rootRect.left - this.drag.offsetX;
    item.y = event.clientY - rootRect.top - this.drag.offsetY;


    this.renderItemPosition(item);
    this.renderLinks();
  },

  onWindowPointerUp() {
    if (!this.drag.activeId) return;
    this.clearDragState();
    this.syncJsonOutput();
  },

  clearDragState() {
    this.drag.activeId = null;
    this.drag.pointerId = null;
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
  }
};
