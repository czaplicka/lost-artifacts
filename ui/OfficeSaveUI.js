import { saveManager } from '../saveGameService.js';

export const SAVE_LOCATION_TYPES = Object.freeze([
    'office',
    'hotel'
]);

const SLOT_KEYS = [
    'slot_1',
    'slot_2',
    'slot_3'
];

const DEPTH = 20000;

const stop = event => {
    event?.stopPropagation?.();
};

export class OfficeSaveUI {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.locationType = String(
            options.locationType ?? 'office'
        ).trim().toLowerCase();

        if (
            !SAVE_LOCATION_TYPES.includes(
                this.locationType
            )
        ) {
            throw new Error('Invalid save location.');
        }

        this.locationCode =
            options.locationCode ||
            (
                this.locationType === 'hotel'
                    ? 'hotel_room'
                    : 'agency_headquarters'
            );

        this.cityCode =
            options.cityCode ||
            (
                this.locationType === 'hotel'
                    ? 'unknown_city'
                    : 'hq'
            );

        this.button = null;
        this.panel = null;
        this.backdrop = null;
        this.statusText = null;

        this.slotButtons = [];

        this.isOpen = false;
        this.isSaving = false;
        this.destroyed = false;

        this._buttonLocked = false;
        this._openToken = null;
        this._slots = [];
        this._panelObjects = [];

        this._centerX = 0;
        this._centerY = 0;
        this._scale = 1;

        this._saveRevision = 0;
    }

    _isCurrentOpening(token) {
        return Boolean(
            !this.destroyed &&
            this.isOpen &&
            this._openToken === token &&
            this.panel?.active
        );
    }

    _notifyPanelState() {
        this.scene.events?.emit(
            'ui-panel-state-changed',
            {
                panel: 'save',
                isOpen: this.isOpen
            }
        );

        if (
            typeof this.scene.refreshPanelLock ===
            'function'
        ) {
            this.scene.refreshPanelLock();
            return;
        }

        const hud =
            this.scene.getPlayerHud?.() ??
            this.scene.getPlayerHudScene?.();

        this.scene.applyLock?.(
            Boolean(
                this.isOpen ||
                this.scene.agencyLedgerUI?.isOpen ||
                hud?.isAnyPanelOpen?.()
            )
        );
    }

    createButton() {
        if (
            this.destroyed ||
            this.button?.active
        ) {
            return;
        }

        const { width, height } = this.scene.scale;

        const x = Math.min(1780, width - 95);
        const y = height - 66;

        if (
            this.scene.textures.exists('btnSave')
        ) {
            this.button = this.scene.add
                .image(x, y, 'btnSave')
                .setScale(0.5);
        } else {
            this.button = this.scene.add.text(
                x,
                y,
                'SAVE',
                {
                    fontFamily:
                        'SpecialElite, monospace',
                    fontSize: '18px',
                    color: '#f1d480',
                    backgroundColor: '#1c1109',
                    padding: {
                        x: 12,
                        y: 8
                    }
                }
            );
        }

        this.button
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(1000);

        this.button.on(
            'pointerdown',
            (pointer, x, y, event) => {
                stop(event);

                if (
                    this.destroyed ||
                    this._buttonLocked ||
                    this.scene.uiLocked ||
                    this.isOpen ||
                    this.isSaving
                ) {
                    return;
                }

                void this.open().catch(error => {
                    console.error(
                        '[OfficeSaveUI] Opening failed:',
                        error
                    );
                });
            }
        );

        this.setLocked(this._buttonLocked);
    }

    setLocked(locked) {
        this._buttonLocked = Boolean(locked);

        if (!this.button?.active) return;

        this.button.setAlpha(
            this._buttonLocked ? 0.4 : 1
        );

        if (this._buttonLocked) {
            this.button.disableInteractive();
        } else {
            this.button.setInteractive({
                useHandCursor: true
            });
        }
    }

    screenPoint(x, y) {
        return {
            x: this._centerX + x * this._scale,
            y: this._centerY + y * this._scale
        };
    }

    makeRectangle(
        x,
        y,
        width,
        height,
        color,
        depth
    ) {
        const point = this.screenPoint(x, y);

        return this.scene.add.rectangle(
            point.x,
            point.y,
            width * this._scale,
            height * this._scale,
            color
        )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(depth);
    }

    makeText(
        x,
        y,
        text,
        size = 17,
        color = '#d4c4a6'
    ) {
        const point = this.screenPoint(x, y);

        return this.scene.add.text(
            point.x,
            point.y,
            text,
            {
                fontFamily:
                    'SpecialElite, monospace',
                fontSize: `${size}px`,
                color,
                align: 'center',
                wordWrap: {
                    width: 550
                },
                lineSpacing: 4
            }
        )
            .setOrigin(0.5)
            .setScale(this._scale)
            .setScrollFactor(0)
            .setDepth(DEPTH + 2);
    }

    isInsidePanel(pointer) {
        const halfWidth = 320 * this._scale;
        const halfHeight = 300 * this._scale;

        return Boolean(
            pointer &&
            pointer.x >= this._centerX - halfWidth &&
            pointer.x <= this._centerX + halfWidth &&
            pointer.y >= this._centerY - halfHeight &&
            pointer.y <= this._centerY + halfHeight
        );
    }

    async open() {
        if (
            this.destroyed ||
            this.isOpen ||
            this.isSaving ||
            !this.scene.sys.isActive()
        ) {
            return;
        }

        const token = Symbol('save-panel');

        this._openToken = token;
        this.isOpen = true;

        const { width, height } = this.scene.scale;

        this._centerX = width / 2;
        this._centerY = height / 2;

        this._scale = Math.max(
            0.01,
            Math.min(
                1,
                (width - 24) / 660,
                (height - 24) / 620
            )
        );

        try {
            this.backdrop = this.scene.add
                .rectangle(
                    width / 2,
                    height / 2,
                    width,
                    height,
                    0x000000,
                    0.8
                )
                .setScrollFactor(0)
                .setDepth(DEPTH)
                .setInteractive();

            this.backdrop.on(
                'pointerdown',
                (pointer, x, y, event) => {
                    stop(event);

                    if (
                        this.isSaving ||
                        this.isInsidePanel(pointer)
                    ) {
                        return;
                    }

                    this.close();
                }
            );

            this.panel = this.makeRectangle(
                0,
                0,
                640,
                600,
                0x17100b,
                DEPTH + 1
            )
                .setStrokeStyle(
                    Math.max(1, 4 * this._scale),
                    0xc99738
                )
                .setInteractive();

            this.panel.on(
                'pointerdown',
                (pointer, x, y, event) => {
                    stop(event);
                }
            );

            const title = this.makeText(
                0,
                -255,
                this.locationType === 'hotel'
                    ? 'HOTEL SAFE'
                    : 'AGENCY ARCHIVES',
                29,
                '#f2d989'
            );

            const subtitle = this.makeText(
                0,
                -212,
                'Choose a case file to save your investigation.',
                18
            );

            const close = this.makeText(
                280,
                -263,
                'X',
                28,
                '#f0c2b6'
            )
                .setDepth(DEPTH + 5)
                .setInteractive({
                    useHandCursor: true
                });

            close.on(
                'pointerdown',
                (pointer, x, y, event) => {
                    stop(event);

                    if (!this.isSaving) {
                        this.close();
                    }
                }
            );

            this.statusText = this.makeText(
                0,
                240,
                'Choose a slot. Local saving is ready.',
                18
            );

            this._panelObjects = [
                title,
                subtitle,
                close,
                this.statusText
            ];

            this._slots = SLOT_KEYS.map(
                slotKey => ({
                    slotKey,
                    localMeta:
                        saveManager.readLocalMeta(
                            slotKey
                        ),
                    cloudMeta: null,
                    preferredSource: 'local'
                })
            );

            this.createSlotButtons(this._slots);
            this._notifyPanelState();
        } catch (error) {
            console.error(
                '[OfficeSaveUI] Panel creation failed:',
                error
            );

            this.close();
            throw error;
        }

        const revision = this._saveRevision;

        try {
            const slots =
                await saveManager.listSlots();

            if (
                !this._isCurrentOpening(token) ||
                this.isSaving ||
                revision !== this._saveRevision
            ) {
                return;
            }

            this.createSlotButtons(slots);

            this.setStatus(
                'Choose a save slot.'
            );
        } catch (error) {
            console.warn(
                '[OfficeSaveUI] Slot listing failed:',
                error
            );

            if (
                this._isCurrentOpening(token) &&
                !this.isSaving &&
                revision === this._saveRevision
            ) {
                this.setStatus(
                    'Cloud unavailable. Local saving is ready.',
                    '#f3d28a'
                );
            }
        }
    }

    _destroySlotButtons() {
        for (const slot of this.slotButtons) {
            slot.background?.destroy();
            slot.text?.destroy();
        }

        this.slotButtons = [];
    }

    getPreferredMeta(slot) {
        if (!slot) return null;

        if (slot.preferredSource === 'cloud') {
            return (
                slot.cloudMeta ??
                slot.localMeta ??
                null
            );
        }

        return (
            slot.localMeta ??
            slot.cloudMeta ??
            null
        );
    }

    formatSlotLabel(
        number,
        meta,
        source = ''
    ) {
        const city = String(
            meta.cityCode || 'UNKNOWN CITY'
        ).toUpperCase();

        const location = String(
            meta.locationCode ||
            'unknown location'
        ).replaceAll('_', ' ');

        const agent =
            meta.agentName ||
            'Name unavailable in this older save';

        const hour = String(
            meta.inGameHour ?? 8
        ).padStart(2, '0');

        return [
            `SLOT ${number} — ${city}`,
            `Agent: ${agent}`,
            source,
            `Day ${meta.dayNumber ?? 1}, ${hour}:00 — ${location}`
        ].join('\n');
    }

    createSlotButtons(slots = []) {
        if (
            this.destroyed ||
            !this.isOpen ||
            !this.panel?.active
        ) {
            return;
        }

        this._slots = Array.isArray(slots)
            ? slots
            : [];

        this._destroySlotButtons();

        for (
            let index = 0;
            index < SLOT_KEYS.length;
            index++
        ) {
            const slotKey = SLOT_KEYS[index];

            const slot = this._slots.find(
                item => item.slotKey === slotKey
            );

            const meta =
                this.getPreferredMeta(slot);

            const sources = [
                slot?.localMeta ? 'LOCAL' : '',
                slot?.cloudMeta ? 'CLOUD' : ''
            ]
                .filter(Boolean)
                .join(' + ');

            const preferred = String(
                slot?.preferredSource || 'local'
            ).toUpperCase();

            const source = sources
                ? `${sources} | Latest: ${preferred}`
                : '';

            const label = meta
                ? this.formatSlotLabel(
                    index + 1,
                    meta,
                    source
                )
                : (
                    `SLOT ${index + 1}\n` +
                    'Empty case file'
                );

            const y = -125 + index * 120;

            const background =
                this.makeRectangle(
                    0,
                    y,
                    570,
                    108,
                    0x24170e,
                    DEPTH + 3
                )
                    .setStrokeStyle(
                        Math.max(
                            1,
                            2 * this._scale
                        ),
                        0x8f6b35
                    )
                    .setName(
                        `save-slot-${index + 1}-background`
                    );

            const text = this.makeText(
                0,
                y,
                label,
                17,
                meta ? '#f1deb0' : '#a99a80'
            )
                .setDepth(DEPTH + 4)
                .setName(
                    `save-slot-${index + 1}-text`
                );

            const onClick = (
                pointer,
                x,
                y,
                event
            ) => {
                stop(event);

                if (
                    this.destroyed ||
                    !this.isOpen ||
                    this.isSaving
                ) {
                    return;
                }

                void this.saveToSlot(slotKey);
            };

            const onOver = () => {
                if (
                    !this.isSaving &&
                    background.active
                ) {
                    background.setFillStyle(
                        0x4a3219
                    );
                }
            };

            const onOut = () => {
                if (
                    !this.isSaving &&
                    background.active
                ) {
                    background.setFillStyle(
                        0x24170e
                    );
                }
            };

            for (
                const object of [
                    background,
                    text
                ]
            ) {
                object
                    .setInteractive({
                        useHandCursor: true
                    })
                    .on(
                        'pointerdown',
                        onClick
                    )
                    .on(
                        'pointerover',
                        onOver
                    )
                    .on(
                        'pointerout',
                        onOut
                    );
            }

            this.slotButtons.push({
                slotKey,
                background,
                text
            });
        }

        this.setSlotButtonsEnabled(
            !this.isSaving
        );
    }

    async saveToSlot(slotKey) {
        if (
            this.destroyed ||
            !this.isOpen ||
            this.isSaving ||
            !SLOT_KEYS.includes(slotKey)
        ) {
            return;
        }

        const token = this._openToken;

        this.isSaving = true;
        this._saveRevision += 1;

        this.setSlotButtonsEnabled(false);

        this.setStatus(
            'Saving locally...',
            '#f1d480'
        );

        try {
            const result =
                await saveManager.save(
                    slotKey,
                    {
                        locationType:
                            this.locationType,

                        locationCode:
                            this.locationCode,

                        cityCode:
                            this.cityCode,

                        sceneKey:
                            this.scene.sys.settings.key,

                        onLocalSaved: payload => {
                            if (
                                !this._isCurrentOpening(
                                    token
                                )
                            ) {
                                return;
                            }

                            this.updateSlot(
                                slotKey,
                                payload.meta,
                                false
                            );

                            this.setStatus(
                                'LOCAL saved. Checking CLOUD...',
                                '#a8e796'
                            );
                        }
                    }
                );

            if (
                !this._isCurrentOpening(token)
            ) {
                return;
            }

            if (
                !result?.ok ||
                !result.payload?.meta
            ) {
                throw new Error(
                    'Save was not confirmed.'
                );
            }

            this.updateSlot(
                slotKey,
                result.payload.meta,
                result.mode === 'cloud+local'
            );

            if (
                result.mode === 'cloud+local'
            ) {
                this.setStatus(
                    'Saved: LOCAL + CLOUD.',
                    '#a8e796'
                );
            } else if (
                result.mode === 'local-fallback'
            ) {
                this.setStatus(
                    'Saved: LOCAL. CLOUD not confirmed.',
                    '#f3d28a'
                );
            } else {
                this.setStatus(
                    'Saved: LOCAL. No active cloud session.',
                    '#a8e796'
                );
            }
        } catch (error) {
            console.error(
                '[OfficeSaveUI] Save failed:',
                error
            );

            if (
                this._isCurrentOpening(token)
            ) {
                this.setStatus(
                    'Save failed: ' +
                    (
                        error?.message ||
                        String(error)
                    ),
                    '#ff9f91'
                );
            }
        } finally {
            this.isSaving = false;

            if (
                this._isCurrentOpening(token)
            ) {
                this.setSlotButtonsEnabled(
                    true
                );
            }
        }
    }

    updateSlot(
        slotKey,
        meta,
        cloudConfirmed
    ) {
        this._slots = this._slots
            .filter(
                slot => (
                    slot.slotKey !== slotKey
                )
            )
            .concat({
                slotKey,
                localMeta: meta,
                cloudMeta: cloudConfirmed
                    ? meta
                    : null,
                preferredSource: 'local'
            });

        this.createSlotButtons(
            this._slots
        );
    }

    setSlotButtonsEnabled(enabled) {
        for (
            const slot of this.slotButtons
        ) {
            for (
                const object of [
                    slot.background,
                    slot.text
                ]
            ) {
                if (!object?.active) {
                    continue;
                }

                if (enabled) {
                    object.setInteractive({
                        useHandCursor: true
                    });
                } else {
                    object.disableInteractive();
                }
            }

            slot.background?.setAlpha(
                enabled ? 1 : 0.65
            );

            slot.text?.setAlpha(
                enabled ? 1 : 0.8
            );
        }
    }

    setStatus(
        text,
        color = '#d8c49a'
    ) {
        if (
            this.statusText?.active
        ) {
            this.statusText
                .setText(text)
                .setColor(color);
        }
    }

    close() {
        this._openToken = null;

        const wasOpen = this.isOpen;

        this.isOpen = false;

        this._destroySlotButtons();

        for (
            const object of this._panelObjects
        ) {
            object?.destroy();
        }

        this._panelObjects = [];

        this.panel?.destroy();
        this.backdrop?.destroy();

        this.panel = null;
        this.backdrop = null;
        this.statusText = null;

        if (wasOpen) {
            this._notifyPanelState();
        }
    }

    destroy() {
        if (this.destroyed) return;

        this.destroyed = true;

        this.close();

        this.button?.destroy();
        this.button = null;
    }
}