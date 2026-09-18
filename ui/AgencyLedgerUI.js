// ui/AgencyLedgerUI.js
// ============================================================
// "THE BOOKS" - panel księgowości Mark Agency.
// Czyta gameState.moneyLog (prowadzony przez MoneyManager - patrz
// MoneyManager.js) i pokazuje bilans + historię transakcji jako
// stronicowaną listę, w stylu starej księgi rachunkowej.
//
// Otwiera się klawiszem 'L' (Ledger) albo wywołaniem open() z UI
// biura (np. hotspot "biurko / księga" w OfficeScene).
// ============================================================

import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { moneyManager } from '../MoneyManager.js';

const CATEGORY_META = {
    travel: { icon: '✈', label: 'Travel' },
    hotel: { icon: '🏨', label: 'Hotel' },
    food: { icon: '🍽', label: 'Food' },
    drink: { icon: '🍸', label: 'Drink' },
    newspaper: { icon: '📰', label: 'Newspaper' },
    phone: { icon: '☎', label: 'Phone' },
    taxi: { icon: '🚕', label: 'Taxi' },
    informant: { icon: '🕵', label: 'Informant' },
    side_case: { icon: '💰', label: 'Side case' },
    mission_reward: { icon: '🏆', label: 'Mission reward' },
    office_upgrade: { icon: '🛠', label: 'Office upgrade' },
    item: { icon: '🎒', label: 'Item' },
    agency_advance: { icon: '🏦', label: 'Agency advance' },
    refund: { icon: '💸', label: 'Refund' }
};

const ROWS_PER_PAGE = 8;

// Komentarz "księgowego" skaluje się z długiem agencji. Czysty humor,
// zero wpływu na mechanikę.
const DEBT_QUIPS = [
    { min: 0, max: 0, text: '"The books are balanced." - said no detective agency ever, until now.' },
    { min: 1, max: 150, text: 'A little red ink never hurt anybody. Probably.' },
    { min: 151, max: 400, text: 'The accountant has started drinking during work hours.' },
    { min: 401, max: 900, text: 'Mark Agency Finance has stopped returning your calls.' },
    { min: 901, max: Infinity, text: 'A man in a cheap suit keeps loitering outside the office.' }
];

export class AgencyLedgerUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.page = 0;
        this.rows = [];
        this.boundKeyHandler = this.onLedgerKeyDown.bind(this);

        const { width, height } = this.scene.scale;

        this.container = this.scene.add
            .container(0, 0)
            .setDepth(30)
            .setVisible(false);

        this.overlay = this.scene.add
            .rectangle(0, 0, width, height, 0x000000, 0.82)
            .setOrigin(0)
            .setInteractive();

        this.overlay.on('pointerdown', () => this.close());
        this.container.add(this.overlay);

        this.buildPanel(width, height);
        this.registerKeyboard();

        this.scene.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => this.destroy()
        );
    }

    registerKeyboard() {
        if (!this.scene?.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('L');
        this.scene.input.keyboard.on('keydown-L', this.boundKeyHandler);
    }

    onLedgerKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping) return;

        event.preventDefault();

        if (this.isOpen) this.close();
        else this.open();
    }

    buildPanel(width, height) {
        const panelWidth = 640;
        const panelHeight = 560;
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;

        this.panel = this.scene.add.container(panelX, panelY);

        const bg = this.scene.add
            .rectangle(0, 0, panelWidth, panelHeight, 0x14100a, 0.97)
            .setOrigin(0)
            .setStrokeStyle(3, 0xd4af37);

        const headerBg = this.scene.add
            .rectangle(0, 0, panelWidth, 70, 0x2a1f12, 1)
            .setOrigin(0)
            .setStrokeStyle(2, 0xd4af37);

        const title = this.scene.add.text(24, 22, 'MARK AGENCY \u2014 THE BOOKS', {
            fontFamily: 'PressStart2P',
            fontSize: '15px',
            color: '#f4e7c1'
        });

        this.closeBtn = this.scene.add
            .text(panelWidth - 50, 14, 'X', {
                fontFamily: 'SpecialElite',
                fontSize: '34px',
                color: '#fbff00'
            })
            .setInteractive({ useHandCursor: true });

        this.closeBtn.on('pointerdown', () => this.close());

        this.summaryText = this.scene.add.text(24, 92, '', {
            fontFamily: 'SpecialElite',
            fontSize: '19px',
            color: '#d6e4f0',
            lineSpacing: 10
        });

        this.quipText = this.scene.add.text(24, 168, '', {
            fontFamily: 'SpecialElite',
            fontSize: '15px',
            color: '#ff9d6b',
            wordWrap: { width: panelWidth - 48, useAdvancedWrap: true }
        });

        const divider = this.scene.add
            .rectangle(24, 210, panelWidth - 48, 2, 0xd4af37, 0.6)
            .setOrigin(0);

        this.listContainer = this.scene.add.container(24, 226);

        this.emptyText = this.scene.add
            .text(0, 30, 'No transactions yet. The agency is (temporarily) solvent.', {
                fontFamily: 'SpecialElite',
                fontSize: '16px',
                color: '#8fa0ad'
            })
            .setVisible(false);

        this.listContainer.add(this.emptyText);

        this.pageLabel = this.scene.add
            .text(panelWidth / 2, panelHeight - 38, '', {
                fontFamily: 'SpecialElite',
                fontSize: '15px',
                color: '#c6d7e5'
            })
            .setOrigin(0.5);

        this.prevBtn = this.scene.add
            .text(40, panelHeight - 42, '\u25c0 PREV', {
                fontFamily: 'SpecialElite',
                fontSize: '16px',
                color: '#ffd166'
            })
            .setInteractive({ useHandCursor: true });

        this.prevBtn.on('pointerdown', () => this.changePage(-1));

        this.nextBtn = this.scene.add
            .text(panelWidth - 132, panelHeight - 42, 'NEXT \u25b6', {
                fontFamily: 'SpecialElite',
                fontSize: '16px',
                color: '#ffd166'
            })
            .setInteractive({ useHandCursor: true });

        this.nextBtn.on('pointerdown', () => this.changePage(1));

        this.panel.add([
            bg,
            headerBg,
            title,
            this.closeBtn,
            this.summaryText,
            this.quipText,
            divider,
            this.listContainer,
            this.pageLabel,
            this.prevBtn,
            this.nextBtn
        ]);

        this.container.add(this.panel);
    }

    getQuip(debt) {
        const found = DEBT_QUIPS.find((q) => debt >= q.min && debt <= q.max);
        return found ? found.text : '';
    }

    formatMoney(amount) {
        const safe = Math.round(Number(amount) || 0);
        return `$${safe.toLocaleString('en-US')}`;
    }

    refreshSummary() {
        const cash = Math.max(0, Math.floor(gameState.cash || 0));
        const budget = Math.max(0, Math.floor(gameState.agencyBudget || 0));
        const debt = Math.max(0, Math.floor(gameState.agencyDebt || 0));

        this.summaryText.setText(
            `\ud83d\udcb5 Cash: ${this.formatMoney(cash)}     ` +
            `\ud83c\udfe2 Agency budget: ${this.formatMoney(budget)}\n` +
            `\ud83d\udcd5 Agency debt: ${this.formatMoney(debt)}`
        );

        this.summaryText.setColor(debt > 0 ? '#ffd166' : '#d6e4f0');
        this.quipText.setText(this.getQuip(debt));
    }

    clearRows() {
        this.rows.forEach((row) => row?.destroy?.(true));
        this.rows = [];
    }

    refreshList() {
        this.clearRows();

        const allEntries = moneyManager.getRecentTransactions(100);
        this.emptyText.setVisible(allEntries.length === 0);

        const totalPages = Math.max(1, Math.ceil(allEntries.length / ROWS_PER_PAGE));
        this.page = Math.min(this.page, totalPages - 1);

        const startIndex = this.page * ROWS_PER_PAGE;
        const pageEntries = allEntries.slice(startIndex, startIndex + ROWS_PER_PAGE);

        pageEntries.forEach((entry, index) => {
            const y = 12 + index * 36;
            const meta = CATEGORY_META[entry.category] || { icon: '\u2754', label: entry.category || 'Other' };

            const isPositive =
                entry.type === 'income' ||
                entry.type === 'refund' ||
                entry.type === 'mission_settled';

            const isDebt = entry.type === 'debt';
            const sign = isPositive ? '+' : '-';
            const color = isPositive ? '#8ef29b' : (isDebt ? '#ff6b6b' : '#ffd166');

            const date = entry.createdAt ? new Date(entry.createdAt) : null;
            const dateLabel = date
                ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                : '';

            const row = this.scene.add.container(0, y);

            const icon = this.scene.add.text(0, 0, meta.icon, {
                fontFamily: 'SpecialElite',
                fontSize: '20px',
                color: '#ffffff'
            });

            const desc = this.scene.add.text(34, 3, entry.description || meta.label, {
                fontFamily: 'SpecialElite',
                fontSize: '15px',
                color: '#d6e4f0',
                wordWrap: { width: 350, useAdvancedWrap: true }
            });

            const amount = this.scene.add
                .text(462, 3, `${sign}${this.formatMoney(entry.amount)}`, {
                    fontFamily: 'SpecialElite',
                    fontSize: '16px',
                    color
                })
                .setOrigin(0, 0);

            const time = this.scene.add.text(562, 3, dateLabel, {
                fontFamily: 'SpecialElite',
                fontSize: '13px',
                color: '#8fa0ad'
            });

            row.add([icon, desc, amount, time]);
            this.listContainer.add(row);
            this.rows.push(row);
        });

        this.pageLabel.setText(`Page ${this.page + 1} / ${totalPages}`);
        this.prevBtn.setAlpha(this.page > 0 ? 1 : 0.4);
        this.nextBtn.setAlpha(this.page < totalPages - 1 ? 1 : 0.4);
    }

    changePage(direction) {
        const next = this.page + direction;
        if (next < 0) return;
        this.page = next;
        this.refreshList();
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.page = 0;
        EventBus.emit('hideHUD');
        this.container.setVisible(true);
        this.refreshSummary();
        this.refreshList();
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.container.setVisible(false);
        EventBus.emit('showHUD');
    }

    destroy() {
        this.clearRows();

        this.scene?.input?.keyboard?.off('keydown-L', this.boundKeyHandler);
        this.closeBtn?.removeAllListeners();
        this.prevBtn?.removeAllListeners();
        this.nextBtn?.removeAllListeners();
        this.overlay?.removeAllListeners();

        this.container?.destroy(true);
        this.rows = [];
        this.isOpen = false;
    }
}