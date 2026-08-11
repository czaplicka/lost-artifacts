import { BaseScene } from './BaseScene.js';

const COLORS = {
    ink: 0x201814,
    paper: 0xe8d6aa,
    paperDark: 0xc5aa72,
    paperShadow: 0x8d7047,
    burgundy: 0x6d1e21,
    burgundyDark: 0x451113,
    gold: 0xd4a338,
    goldLight: 0xf2d477,
    green: 0x476842,
    greenLight: 0x8fb180,
    red: 0xa13a32,
    grey: 0x6d675b,
    cream: 0xfff4d0,
    white: 0xffffff
};

const PROFILES = [
    {
        id: 'analyst',
        name: 'THE ANALYST',
        icon: '⌕',
        bonus: 'Deduction +1',
        description: 'You notice patterns, contradictions, and coffee stains shaped like motives.'
    },
    {
        id: 'charmer',
        name: 'THE CHARMER',
        icon: '♥',
        bonus: 'Rapport +1',
        description: 'People keep telling you secrets. Often by accident. Sometimes while crying.'
    },
    {
        id: 'streetwise',
        name: 'THE STREETWISE',
        icon: '◆',
        bonus: 'Resourcefulness +1',
        description: 'You know which alley to avoid and which bartender to bribe.'
    },
    {
        id: 'archivist',
        name: 'THE ARCHIVIST',
        icon: '▤',
        bonus: 'Observation +1',
        description: 'If it was catalogued, cursed, forged, or misfiled, you probably read about it.'
    },
    {
        id: 'improviser',
        name: 'THE IMPROVISER',
        icon: '!',
        bonus: 'One free retry per case',
        description: 'Planning is nice. Surviving the consequences is nicer.'
    }
];

const DIFFICULTIES = [
    {
        id: 'routine',
        name: 'ROUTINE CASE',
        subtitle: 'For detectives with standards and a healthy respect for hints.',
        details: 'More hints · Softer penalties · Relaxed time pressure'
    },
    {
        id: 'standard',
        name: 'COMPLICATED MESS',
        subtitle: 'The recommended amount of professional discomfort.',
        details: 'Standard hints · Standard penalties · Standard time pressure'
    },
    {
        id: 'hard',
        name: 'CAREER-LIMITING DECISION',
        subtitle: 'For people who consider consequences a personal insult.',
        details: 'Few hints · Tough penalties · Strict time pressure'
    }
];

const STAT_DEFINITIONS = [
    {
        id: 'observation',
        name: 'OBSERVATION',
        description: 'Spot hidden details and suspiciously placed objects.'
    },
    {
        id: 'deduction',
        name: 'DEDUCTION',
        description: 'Connect evidence before it starts connecting itself.'
    },
    {
        id: 'rapport',
        name: 'RAPPORT',
        description: 'Make people talk. Preferably truthfully.'
    },
    {
        id: 'resourcefulness',
        name: 'RESOURCEFULNESS',
        description: 'Find shortcuts, favours, and morally flexible solutions.'
    }
];

export class CharacterCreationScene extends BaseScene {
    constructor() {
        super({ key: 'CharacterCreationScene' });

        this.playerData = {
            name: '',
            alias: '',
            profile: 'analyst',
            difficulty: 'standard',
            stats: {
                observation: 1,
                deduction: 1,
                rapport: 1,
                resourcefulness: 1
            }
        };

        this.remainingPoints = 2;
        this.currentStep = 0;
        this.steps = ['IDENTITY', 'INSTINCTS', 'CASE PRESSURE', 'DOSSIER'];
        this.pageObjects = [];
    }

    init(data = {}) {
        this.authMode = data.authMode || 'guest';
        this.playerId = data.playerId || null;
        this.playerEmail = data.playerEmail || null;
        this.returnScene = data.returnScene || 'EnterScene';

        if (data.playerData) {
            this.playerData = {
                ...this.playerData,
                ...data.playerData,
                stats: {
                    ...this.playerData.stats,
                    ...(data.playerData.stats || {})
                }
            };
        }

        if (data.difficulty) {
            this.playerData.difficulty = data.difficulty;
        }
    }

    create() {
        super.create();

        this.cameras.main.setBackgroundColor('#17110e');
        this.drawOfficeBackground();
        this.createPaperForm();
        this.createHeader();
        this.createStepNavigation();
        this.createFooter();
        this.showStep(0);

        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    drawOfficeBackground() {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x17110e);

        const windowX = width * 0.08;
        const windowY = height * 0.12;
        const windowW = width * 0.22;
        const windowH = height * 0.42;

        this.add.rectangle(windowX + windowW / 2, windowY + windowH / 2, windowW, windowH, 0x090b0e);
        this.add.rectangle(windowX + windowW / 2, windowY + windowH / 2, windowW - 10, windowH - 10, 0x1f3140);

        for (let i = 0; i < 7; i += 1) {
            const y = windowY + 24 + i * 38;
            this.add.rectangle(windowX + windowW / 2, y, windowW - 10, 5, 0x121719, 0.8);
        }

        this.add.rectangle(windowX + windowW / 2, windowY + windowH / 2, 5, windowH, 0x0a0a09);
        this.add.rectangle(windowX + windowW / 2, windowY + windowH / 2, windowW, 5, 0x0a0a09);

        const deskY = height * 0.8;
        this.add.rectangle(width / 2, deskY, width, height * 0.25, 0x352015);
        this.add.rectangle(width / 2, deskY - 8, width, 16, 0x6a422a);

        this.add.ellipse(width * 0.85, height * 0.72, 110, 42, 0x17100c, 0.65);
        this.add.rectangle(width * 0.85, height * 0.65, 70, 12, 0x45301d);
        this.add.rectangle(width * 0.87, height * 0.59, 14, 115, 0x45301d);
        this.add.ellipse(width * 0.87, height * 0.52, 130, 60, 0xe0bb60, 0.55);

        this.add.text(width * 0.04, height * 0.91, 'MARK AGENCY — EMPLOYEES ENTER AT THEIR OWN RISK', {
            fontFamily: '"Press Start 2P"',
            fontSize: '9px',
            color: '#8f7a59'
        }).setAlpha(0.7);
    }

    createPaperForm() {
        const { width, height } = this.scale;
        const panelWidth = Math.min(940, width * 0.72);
        const panelHeight = Math.min(620, height * 0.82);

        this.formBounds = {
            x: (width - panelWidth) / 2,
            y: (height - panelHeight) / 2,
            width: panelWidth,
            height: panelHeight
        };

        const { x, y, width: w, height: h } = this.formBounds;

        this.add.rectangle(x + 12, y + 14, w, h, COLORS.ink, 0.55);
        this.add.rectangle(x, y, w, h, COLORS.paperShadow);
        this.add.rectangle(x + 6, y + 6, w - 12, h - 12, COLORS.paper);

        for (let lineY = y + 82; lineY < y + h - 70; lineY += 28) {
            this.add.rectangle(x + 24, lineY, w - 48, 1, COLORS.paperDark, 0.35);
        }

        this.add.rectangle(x + 14, y + 14, w - 28, 3, COLORS.burgundy);
        this.add.rectangle(x + 14, y + h - 17, w - 28, 3, COLORS.burgundy);
    }

    createHeader() {
        const { x, y, width } = this.formBounds;

        this.add.text(x + 34, y + 30, 'MARK AGENCY', {
            fontFamily: '"Special Elite"',
            fontSize: '28px',
            color: '#421113',
            fontStyle: 'bold'
        });

        this.add.text(x + 34, y + 60, 'PERSONNEL INTAKE FORM — TEMPORARY / PROBABLY LEGAL', {
            fontFamily: '"Press Start 2P"',
            fontSize: '9px',
            color: '#6d675b'
        });

        const stamp = this.add.container(x + width - 137, y + 47);
        stamp.add([
            this.add.rectangle(0, 0, 166, 44, COLORS.burgundy, 0.12)
                .setStrokeStyle(2, COLORS.burgundy, 0.75),
            this.add.text(0, 0, 'PENDING\nREGRET', {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#6d1e21',
                align: 'center',
                lineSpacing: 5
            }).setOrigin(0.5)
        ]);
        stamp.setRotation(-0.07);
    }

    createStepNavigation() {
        const { x, y, width } = this.formBounds;
        this.stepNavigation = [];

        this.steps.forEach((step, index) => {
            const itemX = x + 42 + index * ((width - 84) / this.steps.length);
            const container = this.add.container(itemX, y + 105);

            const circle = this.add.circle(0, 0, 13, COLORS.paperDark)
                .setStrokeStyle(2, COLORS.ink, 0.35);

            const label = this.add.text(0, 0, String(index + 1), {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#3e3022'
            }).setOrigin(0.5);

            const name = this.add.text(0, 24, step, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: '#6d675b'
            }).setOrigin(0.5);

            container.add([circle, label, name]);
            this.stepNavigation.push({ container, circle, label, name });
        });
    }

    createFooter() {
        const { x, y, width, height } = this.formBounds;

        this.backButton = this.createButton(
            x + 122,
            y + height - 44,
            166,
            38,
            '← BACK',
            () => this.goBack()
        );

        this.nextButton = this.createButton(
            x + width - 176,
            y + height - 44,
            240,
            38,
            'CONTINUE →',
            () => this.goForward(),
            true
        );

        this.footerHint = this.add.text(x + width / 2, y + height - 44, '', {
            fontFamily: '"Special Elite"',
            fontSize: '15px',
            color: '#6d675b',
            align: 'center',
            wordWrap: { width: 300 }
        }).setOrigin(0.5);
    }

    showStep(stepIndex) {
        this.currentStep = Phaser.Math.Clamp(stepIndex, 0, this.steps.length - 1);

        this.pageObjects.forEach((item) => item.destroy());
        this.pageObjects = [];

        this.updateStepNavigation();
        this.updateFooter();

        if (this.currentStep === 0) {
            this.createIdentityPage();
        }

        if (this.currentStep === 1) {
            this.createInstinctsPage();
        }

        if (this.currentStep === 2) {
            this.createDifficultyPage();
        }

        if (this.currentStep === 3) {
            this.createDossierPage();
        }
    }

    updateStepNavigation() {
        this.stepNavigation.forEach((item, index) => {
            const active = index === this.currentStep;
            const complete = index < this.currentStep;

            item.circle.setFillStyle(active ? COLORS.burgundy : complete ? COLORS.green : COLORS.paperDark);
            item.circle.setStrokeStyle(2, active ? COLORS.goldLight : COLORS.ink, active ? 1 : 0.35);
            item.label.setColor(active || complete ? '#fff4d0' : '#3e3022');
            item.name.setColor(active ? '#6d1e21' : complete ? '#476842' : '#6d675b');
        });
    }

    updateFooter() {
        const isFirst = this.currentStep === 0;
        const isLast = this.currentStep === this.steps.length - 1;

        this.backButton.setVisible(!isFirst);
        this.nextButton.setText(isLast ? 'SIGN, STAMP & REGRET LATER' : 'CONTINUE →');

        if (this.currentStep === 0) {
            this.footerHint.setText('No pressure. Your identity will only follow you around all game.');
        } else if (this.currentStep === 1) {
            this.footerHint.setText(`Instinct points remaining: ${this.remainingPoints}`);
        } else if (this.currentStep === 2) {
            this.footerHint.setText('This changes assistance and pressure — not your dignity.');
        } else {
            this.footerHint.setText('Review your highly employable professional identity.');
        }
    }

    createIdentityPage() {
        const { x, y, width } = this.formBounds;
        const contentY = y + 160;

        this.addPageText(x + 42, contentY, 'IDENTIFY YOURSELF', 25, COLORS.burgundy);
        this.addPageText(
            x + 42,
            contentY + 36,
            'For administrative purposes, legal ambiguity, and an ID badge nobody will respect.',
            16,
            COLORS.grey
        );

        this.addPageText(x + 42, contentY + 88, 'NAME', 12, COLORS.ink, 'pixel');
        this.nameInput = this.createTextInput(
            x + 42,
            contentY + 114,
            340,
            this.playerData.name,
            'e.g. Alex Mercer'
        );

        this.addPageText(x + 42, contentY + 183, 'ALIAS', 12, COLORS.ink, 'pixel');
        this.aliasInput = this.createTextInput(
            x + 42,
            contentY + 209,
            340,
            this.playerData.alias,
            'e.g. The Last Honest Invoice'
        );

        const randomButton = this.createButton(
            x + 214,
            contentY + 271,
            170,
            34,
            'RANDOMIZE',
            () => this.randomizeIdentity()
        );
        this.trackPageObject(randomButton);

        this.createPortraitPlaceholder(x + width - 196, contentY + 155);
    }

    createPortraitPlaceholder(centerX, centerY) {
        const portrait = this.add.container(centerX, centerY);
        portrait.add([
            this.add.rectangle(0, 0, 220, 260, COLORS.paperDark)
                .setStrokeStyle(3, COLORS.burgundy),
            this.add.rectangle(0, 0, 202, 242, 0x75664c),
            this.add.circle(0, -40, 47, 0x33261e),
            this.add.circle(0, -45, 38, 0xd2a173),
            this.add.rectangle(0, 57, 106, 82, 0x35251f),
            this.add.text(0, 106, 'PHOTO\nPENDING', {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#ead7a9',
                align: 'center',
                lineSpacing: 5
            }).setOrigin(0.5)
        ]);

        this.trackPageObject(portrait);

        this.addPageText(centerX, centerY + 152, 'Badge photos are forever.', 14, COLORS.grey, 'typewriter', 0.5);
    }

    createInstinctsPage() {
        const { x, y, width } = this.formBounds;
        const contentY = y + 160;

        this.addPageText(x + 42, contentY, 'YOUR PROFESSIONAL INSTINCTS', 25, COLORS.burgundy);
        this.addPageText(
            x + 42,
            contentY + 36,
            'Assign 2 points. This shapes your approach, not your worth as a human being.',
            16,
            COLORS.grey
        );

        this.addPageText(x + width - 72, contentY + 11, `${this.remainingPoints}`, 27,
            this.remainingPoints > 0 ? COLORS.burgundy : COLORS.green, 'typewriter', 0.5);
        this.addPageText(x + width - 72, contentY + 35, 'POINTS LEFT', 8, COLORS.grey, 'pixel', 0.5);

        STAT_DEFINITIONS.forEach((stat, index) => {
            const rowY = contentY + 83 + index * 69;
            this.createStatRow(x + 42, rowY, width - 84, stat);
        });
    }

    createStatRow(x, y, width, stat) {
        const value = this.playerData.stats[stat.id];
        const row = this.add.container(x, y);

        const background = this.add.rectangle(width / 2, 0, width, 56, 0xf0dfb5, 0.5)
            .setStrokeStyle(1, COLORS.paperShadow, 0.55);

        const title = this.add.text(18, -14, stat.name, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#201814'
        });

        const description = this.add.text(18, 7, stat.description, {
            fontFamily: '"Special Elite"',
            fontSize: '15px',
            color: '#6d675b'
        });

        const minus = this.createSmallButton(width - 118, 0, '−', () => this.changeStat(stat.id, -1));
        const valueLabel = this.add.text(width - 74, 0, String(value), {
            fontFamily: '"Press Start 2P"',
            fontSize: '15px',
            color: '#6d1e21'
        }).setOrigin(0.5);

        const plus = this.createSmallButton(width - 30, 0, '+', () => this.changeStat(stat.id, 1));

        row.add([background, title, description, minus, valueLabel, plus]);
        this.trackPageObject(row);
    }

    createDifficultyPage() {
        const { x, y, width } = this.formBounds;
        const contentY = y + 160;

        this.addPageText(x + 42, contentY, 'CASE PRESSURE', 25, COLORS.burgundy);
        this.addPageText(
            x + 42,
            contentY + 36,
            'How much chaos would you like professionally documented?',
            16,
            COLORS.grey
        );

        DIFFICULTIES.forEach((difficulty, index) => {
            const cardY = contentY + 88 + index * 100;
            this.createDifficultyCard(x + 42, cardY, width - 84, difficulty);
        });
    }

    createDifficultyCard(x, y, width, difficulty) {
        const selected = this.playerData.difficulty === difficulty.id;
        const card = this.add.container(x, y);
        const background = this.add.rectangle(width / 2, 0, width, 82,
            selected ? 0xf0d895 : 0xf0dfb5,
            selected ? 0.95 : 0.6
        ).setStrokeStyle(selected ? 3 : 1, selected ? COLORS.burgundy : COLORS.paperShadow, selected ? 1 : 0.5);

        const indicator = this.add.circle(28, 0, 13, selected ? COLORS.burgundy : COLORS.paperDark)
            .setStrokeStyle(2, COLORS.ink, 0.3);

        const indicatorText = this.add.text(28, 0, selected ? '✓' : String(DIFFICULTIES.indexOf(difficulty) + 1), {
            fontFamily: '"Press Start 2P"',
            fontSize: selected ? '11px' : '9px',
            color: selected ? '#fff4d0' : '#3e3022'
        }).setOrigin(0.5);

        const name = this.add.text(58, -22, difficulty.name, {
            fontFamily: '"Press Start 2P"',
            fontSize: '11px',
            color: selected ? '#6d1e21' : '#201814'
        });

        const subtitle = this.add.text(58, 0, difficulty.subtitle, {
            fontFamily: '"Special Elite"',
            fontSize: '16px',
            color: '#6d675b'
        });

        const details = this.add.text(58, 24, difficulty.details, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#476842'
        });

        card.add([background, indicator, indicatorText, name, subtitle, details]);
        card.setSize(width, 82);
        card.setInteractive({ useHandCursor: true });

        card.on('pointerover', () => {
            if (this.playerData.difficulty !== difficulty.id) {
                background.setFillStyle(0xf4e5bf, 0.9);
            }
        });

        card.on('pointerout', () => {
            if (this.playerData.difficulty !== difficulty.id) {
                background.setFillStyle(0xf0dfb5, 0.6);
            }
        });

        card.on('pointerup', () => {
            this.playerData.difficulty = difficulty.id;
            this.showStep(2);
        });

        this.trackPageObject(card);
    }

    createDossierPage() {
        const { x, y, width } = this.formBounds;
        const contentY = y + 158;
        const profile = PROFILES.find((item) => item.id === this.playerData.profile);
        const difficulty = DIFFICULTIES.find((item) => item.id === this.playerData.difficulty);

        this.addPageText(x + 42, contentY, 'PRELIMINARY DOSSIER', 25, COLORS.burgundy);
        this.addPageText(
            x + 42,
            contentY + 36,
            'Please inspect carefully. Mark Agency accepts no responsibility for spelling, fate, or consequences.',
            16,
            COLORS.grey
        );

        const boxX = x + 42;
        const boxY = contentY + 80;
        const boxW = width - 84;
        const boxH = 290;

        const dossier = this.add.container(boxX, boxY);
        dossier.add([
            this.add.rectangle(boxW / 2, boxH / 2, boxW, boxH, 0xf0dfb5, 0.8)
                .setStrokeStyle(2, COLORS.paperShadow, 0.7),
            this.add.text(26, 24, 'FIELD OPERATIVE', {
                fontFamily: '"Press Start 2P"',
                fontSize: '9px',
                color: '#6d675b'
            }),
            this.add.text(26, 54, this.getDisplayName(), {
                fontFamily: '"Special Elite"',
                fontSize: '28px',
                color: '#201814'
            }),
            this.add.text(26, 93, `ALIAS: ${this.playerData.alias.trim() || 'UNLISTED — SUSPICIOUSLY MODEST'}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '9px',
                color: '#6d1e21'
            }),
            this.add.text(26, 132, `PROFILE: ${profile.name}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#201814'
            }),
            this.add.text(26, 157, profile.description, {
                fontFamily: '"Special Elite"',
                fontSize: '16px',
                color: '#6d675b',
                wordWrap: { width: boxW - 52 }
            }),
            this.add.text(26, 211, `CASE PRESSURE: ${difficulty.name}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '10px',
                color: '#476842'
            }),
            this.add.text(26, 239, this.getStatsSummary(), {
                fontFamily: '"Press Start 2P"',
                fontSize: '9px',
                color: '#6d675b',
                lineSpacing: 8
            })
        ]);

        this.trackPageObject(dossier);
    }

    createTextInput(x, y, width, value, placeholder) {
        const container = this.add.container(x, y);
        const box = this.add.rectangle(width / 2, 0, width, 38, COLORS.cream, 0.75)
            .setStrokeStyle(2, COLORS.paperShadow, 0.7);

        const text = this.add.text(12, 0, value || placeholder, {
            fontFamily: '"Special Elite"',
            fontSize: '19px',
            color: value ? '#201814' : '#8d7047'
        }).setOrigin(0, 0.5);

        container.add([box, text]);
        container.setSize(width, 38);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerup', () => {
            const isName = container === this.nameInput;
            this.openBrowserTextInput(isName ? 'name' : 'alias', placeholder);
        });

        this.trackPageObject(container);
        return container;
    }

    openBrowserTextInput(field, placeholder) {
        const currentValue = this.playerData[field] || '';
        const result = window.prompt(placeholder, currentValue);

        if (result === null) {
            return;
        }

        this.playerData[field] = result.trim().slice(0, 28);
        this.showStep(0);
    }

    randomizeIdentity() {
        const firstNames = ['Alex', 'Sam', 'Jamie', 'Riley', 'Morgan', 'Taylor', 'Quinn', 'Jordan'];
        const surnames = ['Blackwood', 'Vale', 'Carter', 'Rowe', 'Voss', 'Wilde', 'Mercer', 'Holloway'];
        const aliases = [
            'The Last Honest Invoice',
            'The Unpaid Overtime',
            'Inspector Probably',
            'The Human Filing Error',
            'No Relation to That Case',
            'Detective By Accident'
        ];

        this.playerData.name = `${Phaser.Utils.Array.GetRandom(firstNames)} ${Phaser.Utils.Array.GetRandom(surnames)}`;
        this.playerData.alias = Phaser.Utils.Array.GetRandom(aliases);
        this.showStep(0);
    }

    changeStat(statId, change) {
        const current = this.playerData.stats[statId];
        const minimum = 1;
        const maximum = 4;

        if (change > 0 && this.remainingPoints <= 0) {
            this.cameras.main.shake(80, 0.002);
            return;
        }

        if (change < 0 && current <= minimum) {
            this.cameras.main.shake(80, 0.002);
            return;
        }

        if (change > 0 && current >= maximum) {
            this.cameras.main.shake(80, 0.002);
            return;
        }

        this.playerData.stats[statId] += change;
        this.remainingPoints -= change;
        this.showStep(1);
    }

    goBack() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    goForward() {
        if (this.currentStep === 1 && this.remainingPoints > 0) {
            this.cameras.main.shake(110, 0.002);
            this.footerHint.setText(`You still have ${this.remainingPoints} instinct point${this.remainingPoints === 1 ? '' : 's'} to spend.`);
            return;
        }

        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
            return;
        }

        this.confirmDossier();
    }

    confirmDossier() {
        if (!this.playerData.name.trim()) {
            this.showStep(0);
            this.footerHint.setText('A name is required. Even a suspiciously good fake one.');
            return;
        }

        const profile = PROFILES.find((item) => item.id === this.playerData.profile);

        this.playerData.profileBonus = profile.bonus;
        this.playerData.createdAt = new Date().toISOString();
        this.playerData.authMode = this.authMode;
        this.playerData.playerId = this.playerId;

        this.registry.set('playerData', this.playerData);
        this.registry.set('difficulty', this.playerData.difficulty);

        this.cameras.main.fadeOut(350, 0, 0, 0);

        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start(this.returnScene, {
                authMode: this.authMode,
                playerId: this.playerId,
                playerEmail: this.playerEmail,
                playerData: this.playerData,
                difficulty: this.playerData.difficulty,
                isNewGame: true
            });
        });
    }

    createButton(x, y, width, height, label, callback, primary = false) {
        const container = this.add.container(x, y);
        const background = this.add.rectangle(0, 0, width, height, primary ? COLORS.burgundy : COLORS.paperDark)
            .setStrokeStyle(2, primary ? COLORS.goldLight : COLORS.ink, primary ? 0.8 : 0.35);

        const text = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '9px',
            color: primary ? '#fff4d0' : '#201814',
            align: 'center'
        }).setOrigin(0.5);

        container.add([background, text]);
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => {
            background.setFillStyle(primary ? COLORS.burgundyDark : COLORS.goldLight);
        });

        container.on('pointerout', () => {
            background.setFillStyle(primary ? COLORS.burgundy : COLORS.paperDark);
        });

        container.on('pointerup', callback);

        return container;
    }

    createSmallButton(x, y, label, callback) {
        const button = this.add.container(x, y);
        const background = this.add.rectangle(0, 0, 32, 32, COLORS.burgundy)
            .setStrokeStyle(1, COLORS.goldLight, 0.75);
        const text = this.add.text(0, -1, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '13px',
            color: '#fff4d0'
        }).setOrigin(0.5);

        button.add([background, text]);
        button.setSize(32, 32);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => background.setFillStyle(COLORS.burgundyDark));
        button.on('pointerout', () => background.setFillStyle(COLORS.burgundy));
        button.on('pointerup', callback);

        return button;
    }

    addPageText(x, y, text, fontSize, color, type = 'typewriter', origin = 0) {
        const fontFamily = type === 'pixel' ? '"Press Start 2P"' : '"Special Elite"';

        const object = this.add.text(x, y, text, {
            fontFamily,
            fontSize: `${fontSize}px`,
            color: `#${color.toString(16).padStart(6, '0')}`,
            wordWrap: { width: this.formBounds.width - 84 }
        }).setOrigin(origin, 0);

        this.trackPageObject(object);
        return object;
    }

    trackPageObject(object) {
        this.pageObjects.push(object);
        return object;
    }

    getDisplayName() {
        return this.playerData.name.trim() || 'UNNAMED APPLICANT';
    }

    getStatsSummary() {
        return [
            `OBSERVATION ${this.playerData.stats.observation}   DEDUCTION ${this.playerData.stats.deduction}`,
            `RAPPORT ${this.playerData.stats.rapport}   RESOURCEFULNESS ${this.playerData.stats.resourcefulness}`
        ].join('\n');
    }
}