import {
    ComputerSearch as ComputerSearchCore
} from './ComputerSearchCore.js';

export * from './ComputerSearchCore.js';

/*
 * Retro magazine presentation for Owl Search.
 * Search logic, saves and quest integrations remain in ComputerSearchCore.
 */

const MAGAZINE_THEMES = new Set([
    'magazine',
    'tabloid',
    'gossip'
]);

const COLORS = {
    frame: 0x3d304a,
    chrome: 0x4a3b57,
    chromeDark: 0x2d2238,
    paper: 0xede6d5,
    panel: 0xf7f3e8,
    toolbar: 0xb0a48f,
    banner: 0x8c2663,
    bannerDark: 0x4a1235,
    photo: 0xd9d0be,
    ink: '#2b2330',
    muted: '#716452',
    cream: '#ffe7a1',
    keyword: '#8c2663',
    collected: '#346148'
};

export class ComputerSearch extends ComputerSearchCore {
    render() {
        const page = this.definition?.pages?.find(
            item => item.id === this.pageId
        );

        if (
            this.view === 'page' &&
            page &&
            this.isRetroMagazine(page)
        ) {
            this.renderRetroMagazine(page);
            return;
        }

        return super.render();
    }

    isRetroMagazine(page) {
        if (page.layout === 'default') return false;

        return (
            page.layout === 'retro-magazine' ||
            MAGAZINE_THEMES.has(page.theme)
        );
    }

    retroText(
        x,
        y,
        value,
        size = 16,
        color = COLORS.ink,
        width = 0,
        pixel = false
    ) {
        return this.ui.drawing.text(
            x,
            y,
            value,
            size,
            color,
            width,
            pixel ? 'pixel' : 'body'
        );
    }

    retroFit(
        x,
        y,
        value,
        width,
        size = 12,
        color = COLORS.ink,
        pixel = false
    ) {
        const text = this.retroText(
            x,
            y,
            value,
            size,
            color,
            0,
            pixel
        );

        this.ui.drawing.fit(text, value, Math.max(1, width));

        return text;
    }

    retroButton(
        x,
        y,
        width,
        height,
        label,
        callback,
        {
            enabled = true,
            pink = false
        } = {}
    ) {
        const d = this.ui.drawing;

        const normal = pink ? 0x9d3170 : 0xd8ceb9;
        const hover = pink ? 0xb83b83 : 0xeee5d2;

        d.bevel(
            x,
            y,
            width,
            height,
            enabled ? normal : 0xb8ae9d
        );

        const hit = d.rectangle(
            x,
            y,
            width,
            height,
            normal,
            0.001
        );

        const text = this.retroFit(
            x + 6,
            y,
            label,
            width - 12,
            9,
            enabled
                ? (pink ? '#ffffff' : '#302735')
                : '#827968',
            true
        );

        text.setY(y + Math.round((height - text.height) / 2));

        if (enabled) {
            hit
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    hit.setFillStyle(hover, 0.3);
                })
                .on('pointerout', () => {
                    hit.setFillStyle(normal, 0.001);
                })
                .on('pointerdown', () => {
                    this.ui.options.onSfx?.('click');
                    callback();
                });
        }

        return hit;
    }

    retroPanel(x, y, width, height, color = COLORS.panel) {
        this.ui.drawing.bevel(
            x,
            y,
            width,
            height,
            color,
            true
        );
    }

    renderRetroMagazine(page) {
        const ui = this.ui;
        const d = ui.drawing;
        const layout = ui.layout;

        const b = {
            x: layout.x + 14,
            y: layout.y + 10,
            w: layout.w - 28,
            h: layout.h - 58
        };

        ui.window = b;

        const compact = b.w < 760 || b.h < 470;
        const gap = compact ? 8 : 12;
        const brand = page.brand || 'THE DAILY DIRT';

        d.rectangle(b.x + 5, b.y + 5, b.w, b.h, 0x000000, 0.35);
        d.rectangle(b.x, b.y, b.w, b.h, COLORS.paper);
        d.frame(b.x, b.y, b.w, b.h, COLORS.frame, 1, 4);

        // Browser title bar.
        d.rectangle(
            b.x + 4,
            b.y + 4,
            b.w - 8,
            30,
            COLORS.chrome
        );

        d.rectangle(
            b.x + 12,
            b.y + 10,
            18,
            18,
            0xd63384
        );

        this.retroText(
            b.x + 16,
            b.y + 14,
            '!',
            10,
            '#ffffff',
            0,
            true
        );

        this.retroFit(
            b.x + 40,
            b.y + 14,
            `OWL NAVIGATOR / ${brand}`,
            b.w - 92,
            compact ? 8 : 9,
            COLORS.cream,
            true
        );

        this.retroButton(
            b.x + b.w - 34,
            b.y + 8,
            24,
            22,
            'X',
            () => this.back()
        );

        // Address bar.
        const addressY = b.y + 37;
        const addressHeight = 32;

        d.rectangle(
            b.x + 4,
            addressY - 3,
            b.w - 8,
            39,
            COLORS.toolbar
        );

        this.retroButton(
            b.x + 10,
            addressY,
            42,
            addressHeight,
            '<',
            () => this.back()
        );

        this.retroButton(
            b.x + 57,
            addressY,
            62,
            addressHeight,
            'OWL',
            () => this.goHome()
        );

        const addressX = b.x + 126;
        const addressWidth = b.w - 192;

        this.retroPanel(
            addressX,
            addressY,
            addressWidth,
            addressHeight
        );

        this.retroFit(
            addressX + 9,
            addressY + 9,
            page.address || page.url || `${brand} / ${page.id}`,
            addressWidth - 18,
            compact ? 12 : 14,
            '#285c48'
        );

        this.retroButton(
            b.x + b.w - 58,
            addressY,
            48,
            addressHeight,
            'GO!',
            () => this.refresh(),
            { pink: true }
        );

        // Site banner.
        const bannerX = b.x + gap;
        const bannerY = b.y + 80;
        const bannerW = b.w - gap * 2;
        const bannerH = compact ? 55 : 69;

        d.rectangle(
            bannerX + 3,
            bannerY + 3,
            bannerW,
            bannerH,
            0x000000,
            0.22
        );

        d.rectangle(
            bannerX,
            bannerY,
            bannerW,
            bannerH,
            COLORS.banner
        );

        d.frame(
            bannerX,
            bannerY,
            bannerW,
            bannerH,
            COLORS.bannerDark,
            1,
            3
        );

        this.retroFit(
            bannerX + 12,
            bannerY + 12,
            brand,
            bannerW - 24,
            compact ? 14 : 18,
            '#ffe46b',
            true
        );

        this.retroFit(
            bannerX + 12,
            bannerY + bannerH - 20,
            page.tagline ||
                'News. Opinions. Suspiciously confident punctuation.',
            bannerW - 24,
            compact ? 10 : 12,
            '#f5c9de'
        );

        // Current-page teaser only: no unreached quest information.
        const tickerY = bannerY + bannerH + gap;

        d.rectangle(
            bannerX,
            tickerY,
            bannerW,
            24,
            0x18131b
        );

        this.retroText(
            bannerX + 7,
            tickerY + 6,
            'EXTRA!',
            8,
            '#ff818b',
            0,
            true
        );

        this.retroFit(
            bannerX + 65,
            tickerY + 5,
            page.ticker || page.snippet || 'Read all about it.',
            bannerW - 74,
            12,
            '#ffe46b'
        );

        // Main page.
        const contentY = tickerY + 24 + gap;
        const footerY = b.y + b.h - 36;
        const contentH = Math.max(50, footerY - contentY - gap);

        const showPortrait = b.w >= 650 && contentH >= 125;
        const portraitW = showPortrait
            ? Math.min(260, Math.floor(bannerW * 0.29))
            : 0;

        const articleW = showPortrait
            ? bannerW - portraitW - gap
            : bannerW;

        this.renderRetroArticle(
            page,
            bannerX,
            contentY,
            articleW,
            contentH,
            compact
        );

        if (showPortrait) {
            this.renderRetroPortrait(
                page,
                bannerX + articleW + gap,
                contentY,
                portraitW,
                contentH
            );
        }

        this.renderRetroFooter(
            page,
            bannerX,
            footerY,
            bannerW
        );
    }

    renderRetroArticle(page, x, y, width, height, compact) {
        const d = this.ui.drawing;
        const padding = compact ? 10 : 14;

        this.retroPanel(x, y, width, height);

        const innerX = x + padding;
        const innerW = width - padding * 2;
        const title = page.heading || page.title || 'Latest news';

        this.retroFit(
            innerX,
            y + 13,
            title,
            innerW,
            compact ? 10 : 12,
            '#47213e',
            true
        );

        d.rectangle(
            innerX,
            y + 38,
            innerW,
            2,
            0xb6a992
        );

        const textY = y + 49;
        const metaHeight = height >= 170 ? 28 : 0;
        const textHeight = Math.max(
            24,
            height - 54 - metaHeight
        );

        const fontSize = compact ? 14 : 16;
        const lineHeight = compact ? 23 : 26;

        const lines = this.retroArticleLines(
            page,
            innerW,
            fontSize
        );

        const perPage = Math.max(
            1,
            Math.floor(textHeight / lineHeight)
        );

        const pageCount = Math.max(
            1,
            Math.ceil(lines.length / perPage)
        );

        this.bodyPage = Math.min(
            pageCount - 1,
            Math.max(0, Number(this.bodyPage) || 0)
        );

        this.retroPageCount = pageCount;

        const visible = lines.slice(
            this.bodyPage * perPage,
            (this.bodyPage + 1) * perPage
        );

        visible.forEach((line, index) => {
            let cursorX = innerX;
            const lineY = textY + index * lineHeight;

            for (const part of line) {
                const keyword = Boolean(part.keywordId);
                const known = keyword &&
                    this.progress.known.includes(part.keywordId);

                const color = part.pageId
                    ? '#315a8b'
                    : keyword
                        ? (known ? COLORS.collected : COLORS.keyword)
                        : COLORS.ink;

                const text = this.retroText(
                    cursorX,
                    lineY,
                    part.text,
                    fontSize,
                    color
                );

                if (keyword || part.pageId) {
                    const underlineY = lineY + text.height + 1;

                    d.rectangle(
                        cursorX,
                        underlineY,
                        Math.max(1, text.width),
                        1,
                        part.pageId
                            ? 0x315a8b
                            : known
                                ? 0x346148
                                : 0x8c2663
                    );

                    text
                        .setInteractive({ useHandCursor: true })
                        .on('pointerover', () => text.setAlpha(0.65))
                        .on('pointerout', () => text.setAlpha(1))
                        .on('pointerdown', () => {
                            this.ui.options.onSfx?.('click');

                            if (part.pageId) {
                                this.openPage(part.pageId);
                            } else {
                                this.collect(part.keywordId);
                            }
                        });
                }

                cursorX += this.textWidth(part.text, fontSize);
            }
        });

        if (metaHeight) {
            const metaY = y + height - 25;

            d.rectangle(
                innerX,
                metaY,
                innerW,
                1,
                0xb6a992
            );

            this.retroFit(
                innerX,
                metaY + 7,
                [
                    `BY ${page.author || page.reporter || 'THE EDITORIAL DESK'}`,
                    page.category || 'FEATURES'
                ].join('  /  '),
                innerW,
                10,
                COLORS.muted
            );
        }
    }

    retroArticleLines(page, width, fontSize) {
        const blocks = (page.blocks || []).map(block =>
            block.map(part => {
                if (typeof part === 'string') {
                    return { text: part };
                }

                const keyword = this.definition.keywords.find(
                    item => item.id === part.keywordId
                );

                return {
                    text: part.text ?? keyword?.label ?? '',
                    keywordId: part.keywordId
                };
            })
        );

        for (const link of page.links || []) {
            blocks.push([{
                text: `> ${link.label}`,
                pageId: link.pageId
            }]);
        }

        const lines = [];

        for (const block of blocks) {
            let line = [];
            let used = 0;

            const flush = () => {
                if (line.length) lines.push(line);
                line = [];
                used = 0;
            };

            for (const part of block) {
                const tokens = String(part.text).match(/\n|[^\S\n]+|[^\s]+/g) || [];

                for (let token of tokens) {
                    if (token === '\n') {
                        flush();
                        continue;
                    }

                    const whitespace = /^\s+$/.test(token);

                    if (whitespace) {
                        if (!line.length) continue;
                        token = ' ';
                    }

                    let tokenWidth = this.textWidth(token, fontSize);

                    if (used + tokenWidth > width && line.length) {
                        flush();
                        if (whitespace) continue;
                    }

                    // Very long addresses and email strings can wrap too.
                    if (tokenWidth > width) {
                        let fragment = '';

                        for (const character of token) {
                            const candidate = fragment + character;

                            if (
                                fragment &&
                                this.textWidth(candidate, fontSize) > width
                            ) {
                                line.push({ ...part, text: fragment });
                                flush();
                                fragment = character;
                            } else {
                                fragment = candidate;
                            }
                        }

                        if (fragment) {
                            line.push({ ...part, text: fragment });
                            used = this.textWidth(fragment, fontSize);
                        }

                        continue;
                    }

                    const previous = line[line.length - 1];

                    if (
                        previous &&
                        previous.keywordId === part.keywordId &&
                        previous.pageId === part.pageId
                    ) {
                        previous.text += token;
                    } else {
                        line.push({ ...part, text: token });
                    }

                    used += tokenWidth;
                }
            }

            flush();
            lines.push([]);
        }

        if (lines.length && !lines[lines.length - 1].length) {
            lines.pop();
        }

        return lines;
    }

    renderRetroPortrait(page, x, y, width, height) {
        const d = this.ui.drawing;

        this.retroPanel(x, y, width, height);

        this.retroFit(
            x + 10,
            y + 12,
            page.imageHeading || 'IN THE PICTURE',
            width - 20,
            8,
            '#544735',
            true
        );

        const photoX = x + 10;
        const photoY = y + 36;
        const photoW = width - 20;
        const photoH = Math.max(35, height - 72);

        d.rectangle(
            photoX,
            photoY,
            photoW,
            photoH,
            COLORS.photo
        );

        d.frame(
            photoX,
            photoY,
            photoW,
            photoH,
            0x524636,
            1,
            3
        );

        const image = this.art(
            page.imageKey,
            photoX + 5,
            photoY + 5,
            Math.max(1, photoW - 10),
            Math.max(1, photoH - 10)
        );

        if (!image) {
            const centerX = photoX + photoW / 2;
            const centerY = photoY + photoH / 2;
            const unit = Math.max(
                3,
                Math.min(8, photoW / 22, photoH / 14)
            );

            d.rectangle(
                centerX - unit * 2,
                centerY - unit * 4,
                unit * 4,
                unit * 4,
                0xa79a84
            );

            d.rectangle(
                centerX - unit * 4,
                centerY + unit,
                unit * 8,
                unit * 4,
                0xa79a84
            );

            this.retroFit(
                photoX + 8,
                photoY + photoH - 19,
                page.imageKey ? 'PHOTO UNAVAILABLE' : 'NO PHOTO ON FILE',
                photoW - 16,
                8,
                '#756852'
            );
        }

        this.retroFit(
            x + 10,
            y + height - 24,
            page.imageCaption ||
                page.caption ||
                (image ? 'Editorial photograph' : 'The camera declined to comment.'),
            width - 20,
            10,
            COLORS.muted
        );
    }

    renderRetroFooter(page, x, y, width) {
        const count = this.retroPageCount || 1;

        this.retroButton(
            x,
            y,
            48,
            27,
            '<',
            () => {
                this.bodyPage -= 1;
                this.refresh();
            },
            { enabled: this.bodyPage > 0 }
        );

        this.retroButton(
            x + 54,
            y,
            48,
            27,
            '>',
            () => {
                this.bodyPage += 1;
                this.refresh();
            },
            { enabled: this.bodyPage < count - 1 }
        );

        this.retroFit(
            x + 112,
            y + 8,
            `${this.bodyPage + 1} / ${count}`,
            100,
            11,
            COLORS.muted
        );

        const notesWidth = 84;

        if (width > 460) {
            this.retroFit(
                x + 212,
                y + 8,
                'Underlined text: investigate / save clue',
                width - 212 - notesWidth - 16,
                10,
                COLORS.muted
            );
        }

        this.retroButton(
            x + width - notesWidth,
            y,
            notesWidth,
            27,
            'NOTES',
            () => {
                this.notesOpen = !this.notesOpen;
                this.refresh();
            },
            { pink: true }
        );
    }
}