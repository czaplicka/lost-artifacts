import { THEMES, DEFAULT_THEME } from './ComputerSearchShared.js';
import { prepareSearchEvidenceAudio, playSearchEvidenceAudio } from './SearchEvidenceAudio.js';

export class ComputerSearchPages {
    collectPageKeyword(id, pageId, caseId) {
        const ui = this.ui;
        if (this.dead || ui.destroyed || !ui.isOpen || ui.suspended || ui.booting || ui.app !== 'search' ||
            !ui.scene.sys.isActive() || this.view !== 'page' || this.pageId !== pageId || this.definition?.id !== caseId) return;
        const wasKnown = this.progress.known.includes(id);
        this.collect(id);
        if (!wasKnown && this.definition?.id === caseId && this.progress.known.includes(id)) playSearchEvidenceAudio(ui);
    }
    drawPage(page, area) {
        prepareSearchEvidenceAudio(this.ui.scene);
        const caseId = this.definition?.id;
        const drawing = this.ui.drawing, theme = THEMES[page.theme] || DEFAULT_THEME;
        drawing.rectangle(area.x, area.y, area.w, 52, theme.bg);
        this.favicon(area.x + 14, area.y + 11, 30, page);
        const masthead = drawing.text(area.x + 56, area.y + 15, page.brand || page.title, 25, theme.fg);
        drawing.fit(masthead, masthead.text, area.w - 76);
        let linkX = area.x + 20, navigationY = area.y + 64;
        const rightEdge = area.x + area.w - 20;
        for (const link of page.links || []) {
            const active = link.pageId === page.id, label = active ? '[' + link.label + ']' : link.label;
            const text = drawing.text(linkX, navigationY, label, 14, active ? '#23494d' : '#315279');
            drawing.fit(text, text.text, Math.max(1, area.w - 40));
            if (linkX > area.x + 20 && linkX + text.width > rightEdge) {
                linkX = area.x + 20; navigationY += 28; text.setPosition(linkX, navigationY);
            }
            if (!active) text.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openPage(link.pageId));
            linkX += text.width + 24;
        }
        let start = navigationY + 32;
        if (page.imageKey && this.ui.scene.textures.exists(page.imageKey)) {
            drawing.add(this.ui.scene.add.image(area.x + area.w - 125, start + 43, page.imageKey).setDisplaySize(200, 86));
            start += 100;
        }
        const title = drawing.text(area.x + 22, start, page.heading || page.title, 21, '#303f3a');
        drawing.fit(title, title.text, area.w - 44);
        const available = Math.max(30, area.y + area.h - 45 - (start + 38));
        const layouts = this.paginate(page.blocks, area.w - 44, available);
        this.bodyPage = Math.min(this.bodyPage, layouts.length - 1);
        for (const item of layouts[this.bodyPage] || []) {
            const text = drawing.text(area.x + 22 + item.x, start + 38 + item.y, item.text, 16,
                item.keywordId ? '#ffe56c' : '#3b423c');
            if (item.keywordId) {
                const highlight = drawing.rectangle(text.x - 1, text.y, text.width + 2, 22,
                    this.progress.known.includes(item.keywordId) ? 0x596150 : 0x344841);
                this.ui.content.moveBelow(highlight, text);
                text.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
                    if (text.active === false || !text.scene) return;
                    this.collectPageKeyword(item.keywordId, page.id, caseId);
                });
            }
        }
        if (layouts.length > 1) {
            this.pager(area.x + 22, area.y + area.h - 34, area.w - 44, this.bodyPage, layouts.length,
                index => { this.bodyPage = index; this.refresh(); });
        }
    }
    pager(x, y, width, page, count, change) {
        const drawing = this.ui.drawing;
        drawing.button(x, y, '<', () => change(page - 1), page > 0);
        drawing.text(x + 55, y + 9, `${page + 1} / ${count}`, 13, '#657061');
        drawing.button(x + width - 40, y, '>', () => change(page + 1), page < count - 1);
    }
}
