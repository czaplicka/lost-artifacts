export const GRID = {
  cellW: 140, cellH: 100, padX: 12, padY: 10, iconW: 128, iconH: 94
};

export const NOTE = { col: 4, row: 1, cols: 1, rows: 2 };

const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class DesktopGrid {
  constructor() {
    this.layout = null;
    this.used = new Set();
    this.reserved = [];
    this.cols = 1;
    this.rows = 1;
  }

  reset(layout) {
    this.layout = layout;
    this.used = new Set();
    this.reserved = [];
    if (!layout) return;
    this.cols = Math.max(1, Math.floor((layout.w - GRID.padX) / GRID.cellW));
    this.rows = Math.max(1, Math.floor((layout.h - 36 - GRID.padY) / GRID.cellH));
  }

  reserveRect(rect) {
    this.reserved.push(rect);
  }

  cellRect(col, row) {
    return {
      x: GRID.padX + col * GRID.cellW,
      y: GRID.padY + row * GRID.cellH,
      w: GRID.iconW,
      h: GRID.iconH
    };
  }

  noteRect() {
    const first = this.cellRect(NOTE.col, NOTE.row);
    return {
      x: first.x,
      y: first.y,
      w: NOTE.cols * GRID.cellW,
      h: NOTE.rows * GRID.cellH
    };
  }

  noteCenter() {
    const r = this.noteRect();
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  isFree(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    if (this.used.has(`${col}:${row}`)) return false;
    const rect = this.cellRect(col, row);
    return !this.reserved.some(r => overlaps(rect, r));
  }

  claim(x, y) {
    const layout = this.layout;
    if (!layout) return { x, y };
    const wantCol = Math.min(this.cols - 1, Math.max(0,
      Math.round((x - layout.x - GRID.padX) / GRID.cellW)));
    const wantRow = Math.min(this.rows - 1, Math.max(0,
      Math.round((y - layout.y - GRID.padY) / GRID.cellH)));
    const total = this.cols * this.rows;
    const start = wantRow * this.cols + wantCol;
    for (let i = 0; i < total; i++) {
      const index = (start + i) % total;
      const row = Math.floor(index / this.cols);
      const col = index % this.cols;
      if (!this.isFree(col, row)) continue;
      this.used.add(`${col}:${row}`);
      if (i > 0) console.warn(`[DesktopGrid] Cell ${wantCol}:${wantRow} busy, using ${col}:${row}.`);
      return {
        x: layout.x + GRID.padX + col * GRID.cellW,
        y: layout.y + GRID.padY + row * GRID.cellH
      };
    }
    console.warn('[DesktopGrid] No free cell left on the desktop.');
    return { x, y };
  }
}