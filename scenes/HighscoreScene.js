import { ScoreManager } from '../ScoreManager.js';
import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';

export class HighscoreScene extends BaseScene {
    constructor() {
        super({ key: 'HighscoreScene' });

        this.scoreManager = null;
    }

    create() {
        super.create();

        this.scene.sleep('UIScene');

        const { width, height } = this.scale;

        this.scoreManager = new ScoreManager();

        if (this.textures.exists('backgroundhi')) {
            this.add.image(width / 2, height / 2, 'backgroundhi')
                .setDisplaySize(width, height);
        }

        if (this.textures.exists('backgroundpc')) {
            this.add.image(width / 2, height / 2, 'backgroundpc')
                .setDisplaySize(width, height);
        }

        audioManager.init(this);

        this.createBackButton(width, height);
        this.createHeader(width, height);
        this.createRankingCards(width, height);
    }

    createBackButton(width, height) {
        const backBtn = this.add.image(
            width * 0.12,
            height * 0.86,
            'back',
        )
            .setInteractive({ useHandCursor: true })
            .setScale(0.7);

        this.addHoverEffect(backBtn, 0.7, 0.8);

        backBtn.on('pointerdown', () => {
            this.goto('MenuScene');
        });
    }

    createHeader(width, height) {
        const headerStyle = {
            fontFamily: 'PressStart2P',
            color: '#0ea333',
            fontStyle: 'bold',
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 0,
                fill: true,
            },
        };

        this.add.text(
            width / 2,
            height * 0.12,
            'INTERPOL DATABASE',
            {
                ...headerStyle,
                fontSize: '22px',
            },
        )
            .setOrigin(0.5)
            .setDepth(20);

        this.add.text(
            width / 2,
            height * 0.18,
            'MARK AGENCY CLEARANCE RECORDS',
            {
                ...headerStyle,
                fontSize: '14px',
                color: '#6ee77d',
            },
        )
            .setOrigin(0.5)
            .setDepth(20);
    }

    createRankingCards(width, height) {
        const rankings = [
            {
                difficulty: 'rookie',
                title: 'ROOKIE',
                subtitle: 'DETECTIVE',
                color: 0x386641,
                accent: '#91d18b',
            },
            {
                difficulty: 'field',
                title: 'FIELD',
                subtitle: 'AGENT',
                color: 0x8a6a26,
                accent: '#f3cf67',
            },
            {
                difficulty: 'master',
                title: 'MASTER',
                subtitle: 'SLEUTH',
                color: 0x6f2833,
                accent: '#ef99a2',
            },
        ];

        const cardWidth = width * 0.245;
        const cardHeight = height * 0.60;
        const startX = width * 0.225;
        const gap = width * 0.275;
        const cardY = height * 0.54;

        rankings.forEach((ranking, index) => {
            const cardX = startX + (gap * index);

            this.createRankingCard(
                cardX,
                cardY,
                cardWidth,
                cardHeight,
                ranking,
            );
        });
    }

    createRankingCard(x, y, width, height, ranking) {
        const scores = this.scoreManager.getScores(
            ranking.difficulty,
        );

        const container = this.add.container(x, y)
            .setDepth(20);

        const outerPanel = this.add.rectangle(
            0,
            0,
            width,
            height,
            0x08140b,
            0.93,
        )
            .setStrokeStyle(3, ranking.color, 1);

        const innerPanel = this.add.rectangle(
            0,
            0,
            width - 14,
            height - 14,
            0x0c2211,
            0.88,
        )
            .setStrokeStyle(1, 0x4f8452, 0.7);

        const title = this.add.text(
            0,
            -height / 2 + 30,
            ranking.title,
            {
                fontFamily: 'PressStart2P',
                fontSize: '15px',
                color: ranking.accent,
                align: 'center',
            },
        )
            .setOrigin(0.5);

        const subtitle = this.add.text(
            0,
            -height / 2 + 55,
            ranking.subtitle,
            {
                fontFamily: 'PressStart2P',
                fontSize: '11px',
                color: '#d5ead1',
                align: 'center',
            },
        )
            .setOrigin(0.5);

        const divider = this.add.rectangle(
            0,
            -height / 2 + 76,
            width - 30,
            2,
            ranking.color,
            0.9,
        );

        container.add([
            outerPanel,
            innerPanel,
            title,
            subtitle,
            divider,
        ]);

        const rowStartY = -height / 2 + 105;
        const rowHeight = 39;
        const maxRows = 10;

        for (let index = 0; index < maxRows; index += 1) {
            const score = scores[index];
            const y = rowStartY + (index * rowHeight);

            const rankLabel = `${index + 1}.`;

            const agentName = score?.name || '—';
            const points = Number.isFinite(score?.points)
                ? score.points.toLocaleString('en-US')
                : '—';

            const rowColor = index < 3
                ? ranking.accent
                : '#cce5c9';

            const rankText = this.add.text(
                -width / 2 + 18,
                y,
                rankLabel,
                {
                    fontFamily: 'PressStart2P',
                    fontSize: '10px',
                    color: rowColor,
                },
            )
                .setOrigin(0, 0.5);

            const nameText = this.add.text(
                -width / 2 + 46,
                y,
                agentName,
                {
                    fontFamily: 'PressStart2P',
                    fontSize: '9px',
                    color: '#e6f3e0',
                    wordWrap: {
                        width: width * 0.48,
                    },
                },
            )
                .setOrigin(0, 0.5);

            const pointsText = this.add.text(
                width / 2 - 18,
                y,
                points,
                {
                    fontFamily: 'PressStart2P',
                    fontSize: '9px',
                    color: rowColor,
                },
            )
                .setOrigin(1, 0.5);

            container.add([
                rankText,
                nameText,
                pointsText,
            ]);
        }
    }

    addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
        button.on('pointerover', () => {
            button.setScale(hoverScale);
        });

        button.on('pointerout', () => {
            button.setScale(baseScale);
        });
    }
}