// Handles static UI construction: background, header, generic buttons,
// filter bar, navigation controls, exclusion controls and resize rebuild.

export const SuspectBoardUIMixin = {
  createBackground() {
    const { width, height } = this.scale;

    this.add
      .rectangle(0, 0, width, height, 0x16110d, 1)
      .setOrigin(0, 0)
      .setDepth(-10);

    this.add
      .rectangle(0, 0, width, 110, 0x261a12, 1)
      .setOrigin(0, 0)
      .setDepth(-9);

    this.add
      .rectangle(0, 108, width, 3, 0xd4af37, 0.9)
      .setOrigin(0, 0)
      .setDepth(-8);

    this.add
      .rectangle(0, height - 56, width, 56, 0x120d0a, 0.95)
      .setOrigin(0, 0)
      .setDepth(-8);
  },

  createHeader() {
    const { width } = this.scale;

    this.headerText = this.add
      .text(width / 2, 18, 'SUSPECT FILES', {
        fontFamily: 'Special Elite',
        fontSize: '34px',
        color: '#f5e7c6',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.summaryText = this.add
      .text(width / 2, 60, '', {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#d9c998',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.modeHintText = this.add
      .text(width / 2, 88, '', {
        fontFamily: 'Special Elite',
        fontSize: '17px',
        color: '#ffdc73',
        align: 'center',
        wordWrap: {
          width: width - 40,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0)
      .setDepth(10);
  },

  createUiButton({
    x,
    y,
    width,
    height,
    label,
    fontSize = '9px',
    depth = 15,
    normalFill = 0x2d2118,
    hoverFill = 0x4b3322,
    normalColor = '#d8c59b',
    hoverColor = '#fff4d6',
    activeFill = 0xd4af37,
    activeColor = '#17110c',
    onClick = null
  }) {
    const container = this.add.container(x, y).setDepth(depth);

    const background = this.add
      .rectangle(0, 0, width, height, normalFill, 1)
      .setStrokeStyle(2, 0x766044, 0.9)
      .setInteractive({
        useHandCursor: true
      });

    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'PressStart2P',
        fontSize,
        color: normalColor,
        align: 'center',
        wordWrap: {
          width: width - 18,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    container.add([background, text]);

    container.buttonBackground = background;
    container.buttonText = text;
    container.buttonLabel = label;
    container.buttonStyle = {
      normalFill,
      hoverFill,
      normalColor,
      hoverColor,
      activeFill,
      activeColor
    };
    container.isActive = false;

    const applyStyle = () => {
      const style = container.buttonStyle;

      if (container.isActive) {
        background.setFillStyle(style.activeFill, 1);
        text.setColor(style.activeColor);
        background.setStrokeStyle(2, 0xf4d36b, 1);
        return;
      }

      background.setFillStyle(style.normalFill, 1);
      text.setColor(style.normalColor);
      background.setStrokeStyle(2, 0x766044, 0.9);
    };

    background.on('pointerover', () => {
      if (container.isActive) return;

      background.setFillStyle(container.buttonStyle.hoverFill, 1);
      text.setColor(container.buttonStyle.hoverColor);
      background.setStrokeStyle(2, 0xd4af37, 1);
    });

    background.on('pointerout', applyStyle);

    if (typeof onClick === 'function') {
      background.on('pointerdown', onClick);
    }

    container.applyStyle = applyStyle;

    return container;
  },

  setButtonEnabled(button, enabled) {
    if (!button?.buttonBackground || !button?.buttonText) return;

    button.setAlpha(enabled ? 1 : 0.45);

    if (enabled) {
      button.buttonBackground.setInteractive({
        useHandCursor: true
      });
    } else {
      button.buttonBackground.disableInteractive();
    }
  },

  createFilters() {
    const { width } = this.scale;

    const filters = [
      { id: 'all', label: 'ALL FILES' },
      { id: 'active', label: 'ACTIVE' },
      { id: 'eliminated', label: 'ELIMINATED' }
    ];

    const gap = 14;
    const buttonWidth = Math.min(
      150,
      Math.max(106, (width - 48 - gap * 2) / 3)
    );
    const buttonHeight = 40;

    const totalWidth =
      filters.length * buttonWidth +
      (filters.length - 1) * gap;

    const startX =
      width / 2 - totalWidth / 2 + buttonWidth / 2;

    filters.forEach((filter, index) => {
      const button = this.createUiButton({
        x: startX + index * (buttonWidth + gap),
        y: 142,
        width: buttonWidth,
        height: buttonHeight,
        label: filter.label,
        onClick: () => {
          if (this.excludeMode) return;

          this.filterMode = filter.id;
          this.currentPage = 0;
          this.refreshBoard();
        }
      });

      button.filterId = filter.id;
      this.filterButtons.push(button);
    });
  },

  createContentContainers() {
    this.cardsContainer = this.add.container(0, 0).setDepth(5);
    this.detailsContainer = this.add.container(0, 0).setDepth(6);

    this.emptyText = this.add
      .text(0, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#d9c998',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  },

  createNavigation() {
    const { width, height } = this.scale;

    this.previousPageButton = this.createUiButton({
      x: 38,
      y: height - 28,
      width: 46,
      height: 38,
      label: '◀',
      fontSize: '22px',
      depth: 30,
      normalFill: 0x211711,
      hoverFill: 0x4b3322,
      normalColor: '#d4af37',
      hoverColor: '#fff4d6',
      onClick: () => {
        if (this.currentPage <= 0) return;

        this.currentPage -= 1;
        this.refreshBoard();
      }
    });

    this.nextPageButton = this.createUiButton({
      x: 94,
      y: height - 28,
      width: 46,
      height: 38,
      label: '▶',
      fontSize: '22px',
      depth: 30,
      normalFill: 0x211711,
      hoverFill: 0x4b3322,
      normalColor: '#d4af37',
      hoverColor: '#fff4d6',
      onClick: () => {
        const pageCount = this.getPageCount();

        if (this.currentPage >= pageCount - 1) return;

        this.currentPage += 1;
        this.refreshBoard();
      }
    });

    this.pageText = this.add
      .text(126, height - 28, '', {
        fontFamily: 'PressStart2P',
        fontSize: '9px',
        color: '#d9c998'
      })
      .setOrigin(0, 0.5)
      .setDepth(30);

    this.closeButton = this.createUiButton({
      x: width - 94,
      y: height - 28,
      width: 138,
      height: 38,
      label: '[ RETURN ]',
      fontSize: '9px',
      depth: 30,
      normalFill: 0x3a201b,
      hoverFill: 0x6b3328,
      normalColor: '#f6e7bf',
      hoverColor: '#ffffff',
      onClick: () => this.closeScene()
    });
  },

  createExclusionControls() {
    const { width, height } = this.scale;

    this.exclusionButton = this.createUiButton({
      x: width / 2 - 145,
      y: height - 28,
      width: 235,
      height: 38,
      label: '[ EXCLUDE MODE ]',
      fontSize: '9px',
      depth: 30,
      normalFill: 0x3d261c,
      hoverFill: 0x6a3928,
      normalColor: '#ffd09b',
      hoverColor: '#ffffff',
      activeFill: 0xa7352c,
      activeColor: '#fff2dd',
      onClick: () => this.toggleExcludeMode()
    });

    this.continueButton = this.createUiButton({
      x: width / 2 + 145,
      y: height - 28,
      width: 250,
      height: 38,
      label: '[ EVIDENCE GRID ]',
      fontSize: '9px',
      depth: 30,
      normalFill: 0x25422a,
      hoverFill: 0x35633c,
      normalColor: '#d3ffd1',
      hoverColor: '#ffffff',
      onClick: () => this.openEvidenceGrid()
    });

    this.updateExclusionControls();
  },

  rebuildScene() {
    this.cardsContainer?.destroy();
    this.detailsContainer?.destroy();
    this.emptyText?.destroy();

    this.cardsContainer = this.add.container(0, 0).setDepth(5);
    this.detailsContainer = this.add.container(0, 0).setDepth(6);

    this.emptyText = this.add
      .text(0, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#d9c998',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    const { width, height } = this.scale;

    this.headerText.setPosition(width / 2, 18);
    this.summaryText.setPosition(width / 2, 60);
    this.modeHintText.setPosition(width / 2, 88);

    const gap = 14;

    const buttonWidth = Math.min(
      150,
      Math.max(106, (width - 48 - gap * 2) / 3)
    );

    const totalWidth =
      this.filterButtons.length * buttonWidth +
      (this.filterButtons.length - 1) * gap;

    const startX =
      width / 2 - totalWidth / 2 + buttonWidth / 2;

    this.filterButtons.forEach((button, index) => {
      button.setPosition(
        startX + index * (buttonWidth + gap),
        142
      );

      button.buttonBackground.setSize(buttonWidth, 40);
    });

    this.previousPageButton.setPosition(38, height - 28);
    this.nextPageButton.setPosition(94, height - 28);
    this.pageText.setPosition(126, height - 28);
    this.closeButton.setPosition(width - 94, height - 28);

    this.exclusionButton?.setPosition(width / 2 - 145, height - 28);
    this.continueButton?.setPosition(width / 2 + 145, height - 28);

    this.updateExclusionControls();
    this.refreshBoard();
  }
};