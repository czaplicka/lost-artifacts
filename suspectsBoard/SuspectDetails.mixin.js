// Handles the desktop details side-panel, the mobile full-screen details
// modal, and shared text formatting/labeling helpers.

export const SuspectDetailsMixin = {
  renderDetailsPanel() {
    const { width, height } = this.scale;

    if (width <= 700 || this.excludeMode) return;

    const selected = this.getAllSuspects().find(
      (suspect) => suspect.id === this.selectedSuspectId
    );

    const isTablet = width <= 1100;
    const panelWidth = isTablet ? 330 : 430;
    const panelX = width - panelWidth / 2 - 20;
    const panelTop = 184;
    const panelBottom = height - 72;
    const panelHeight = panelBottom - panelTop;
    const panelY = panelTop + panelHeight / 2;

    const panelBg = this.add
      .rectangle(
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        0x211711,
        0.98
      )
      .setStrokeStyle(2, 0x8b6c38, 0.9);

    this.detailsContainer.add(panelBg);

    if (!selected) {
      const noSelection = this.add
        .text(panelX, panelY, 'Select a suspect file.', {
          fontFamily: 'Special Elite',
          fontSize: '20px',
          color: '#dcc99e',
          align: 'center'
        })
        .setOrigin(0.5);

      this.detailsContainer.add(noSelection);
      return;
    }

    const isEliminated = Boolean(
      selected.deductionState?.eliminated
    );

    const details = this.buildDetailsText(selected);

    const heading = this.add
      .text(panelX, panelTop + 18, 'CASE NOTES', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#d4af37'
      })
      .setOrigin(0.5, 0);

    const suspectName = this.add
      .text(panelX, panelTop + 48, selected.name, {
        fontFamily: 'Special Elite',
        fontSize: isTablet ? '25px' : '29px',
        color: isEliminated ? '#b69891' : '#fff0cd',
        align: 'center',
        wordWrap: {
          width: panelWidth - 34,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5, 0);

    const body = this.add
      .text(
        panelX - panelWidth / 2 + 18,
        panelTop + 110,
        details,
        {
          fontFamily: 'Special Elite',
          fontSize: isTablet ? '16px' : '18px',
          color: '#e2d1ad',
          lineSpacing: 6,
          wordWrap: {
            width: panelWidth - 36,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0, 0);

    this.detailsContainer.add([
      heading,
      suspectName,
      body
    ]);

    if (isEliminated) {
      const clearedStamp = this.add
        .text(
          panelX,
          panelBottom - 18,
          'EXCLUDED FROM CURRENT LEADS',
          {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#ec726a',
            align: 'center',
            wordWrap: {
              width: panelWidth - 30,
              useAdvancedWrap: true
            }
          }
        )
        .setOrigin(0.5, 1);

      this.detailsContainer.add(clearedStamp);
    }
  },

  buildDetailsText(suspect) {
    const state = suspect.deductionState || {};
    const restrictedProfile = suspect.restrictedProfile || {};
    const forensic = restrictedProfile.forensicAttributes || {};

    const visibleTraits = Array.isArray(suspect.visibleTraits)
      ? suspect.visibleTraits
      : [];

    const unlockedFields = Array.isArray(
      restrictedProfile.unlockedFields
    )
      ? restrictedProfile.unlockedFields
      : [];

    const unlockedFieldSet = new Set(
      unlockedFields
        .map((field) => {
          if (typeof field === 'string') return field;

          return (
            field?.field ||
            field?.id ||
            field?.key ||
            null
          );
        })
        .filter(Boolean)
    );

    const lines = [];

    lines.push(`Role: ${suspect.occupation || 'Unknown'}`);

    if (suspect.caseConnection) {
      lines.push(`\nConnection:\n${suspect.caseConnection}`);
    }

    lines.push('\nVisible notes:');

    if (visibleTraits.length) {
      visibleTraits.forEach((trait) => {
        lines.push(`• ${trait}`);
      });
    } else {
      lines.push('• No visible traits recorded');
    }

    lines.push('\nForensics:');

    const unlockedForensicEntries = Object.entries(forensic).filter(
      ([field, data]) =>
        Boolean(data?.unlocked) || unlockedFieldSet.has(field)
    );

    if (!unlockedForensicEntries.length) {
      lines.push('• Lab analysis pending');
    } else {
      unlockedForensicEntries.forEach(([field, data]) => {
        const label = this.formatEvidenceField(field);
        const value = data?.value || 'pending';

        lines.push(
          `• ${label}: ${String(value).toUpperCase()}`
        );
      });
    }

    lines.push('\nDeduction status:');
    lines.push(`• Lab: ${this.formatStatus(state.labStatus)}`);
    lines.push(`• Method: ${this.formatStatus(state.hypothesisStatus)}`);
    lines.push(`• Interview: ${this.formatStatus(state.interviewStatus)}`);
    lines.push(`• Alibi: ${this.formatStatus(state.alibiStatus)}`);

    if (
      Array.isArray(state.eliminationReasons) &&
      state.eliminationReasons.length
    ) {
      lines.push('\nWhy cleared:');

      state.eliminationReasons.forEach((reason) => {
        lines.push(`• ${reason.label || 'Evidence'}`);

        if (reason.note) {
          lines.push(`  ${reason.note}`);
        }
      });
    }

    if (
      Array.isArray(state.notesUnlocked) &&
      state.notesUnlocked.length
    ) {
      lines.push('\nInvestigator notes:');

      state.notesUnlocked.slice(-3).forEach((note) => {
        lines.push(`• ${note}`);
      });
    }

    return lines.join('\n');
  },

  formatEvidenceField(field) {
    const labels = {
      hair_color: 'Hair result',
      eye_color: 'Witness description',
      blood_type: 'Blood result',
      biological_sex: 'DNA profile',
      shoe_size_category: 'Footwear result'
    };

    return labels[field] || String(field).replace(/_/g, ' ');
  },

  formatStatus(status) {
    const labels = {
      pending: 'Pending',
      match: 'Consistent',
      eliminated: 'Excluded',
      locked: 'Locked',
      unlocked: 'Available',
      suspicious: 'Questioned',
      confirmed: 'Confirmed',
      not_applicable: 'Not applicable',
      unverified: 'Unverified',
      corroborated: 'Corroborated',
      contradicted: 'Contradicted'
    };

    return labels[status] || 'Pending';
  },

  showMobileDetails(suspect) {
    const { width, height } = this.scale;

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setDepth(100)
      .setInteractive();

    const panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        width - 36,
        height - 90,
        0x211711,
        1
      )
      .setStrokeStyle(3, 0xd4af37, 0.9)
      .setDepth(101);

    const title = this.add
      .text(width / 2, 72, suspect.name, {
        fontFamily: 'Special Elite',
        fontSize: '28px',
        color: '#fff0cd',
        align: 'center',
        wordWrap: {
          width: width - 70,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(102);

    const body = this.add
      .text(34, 126, this.buildDetailsText(suspect), {
        fontFamily: 'Special Elite',
        fontSize: '17px',
        color: '#e2d1ad',
        lineSpacing: 5,
        wordWrap: {
          width: width - 68,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0, 0)
      .setDepth(102);

    const closeButton = this.createUiButton({
      x: width / 2,
      y: height - 54,
      width: 180,
      height: 42,
      label: '[ CLOSE FILE ]',
      fontSize: '10px',
      depth: 102,
      normalFill: 0xd4af37,
      hoverFill: 0xf0c653,
      normalColor: '#20150e',
      hoverColor: '#20150e'
    });

    const closeDetails = () => {
      [
        overlay,
        panel,
        title,
        body,
        closeButton
      ].forEach((item) => {
        item.removeAllListeners?.();
        item.destroy?.();
      });
    };

    overlay.on('pointerdown', closeDetails);
    closeButton.buttonBackground.on(
      'pointerdown',
      closeDetails
    );
  }
};