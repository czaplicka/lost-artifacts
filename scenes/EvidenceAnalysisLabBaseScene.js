import { BaseScene } from './BaseScene.js';
import { LabTerminal, TERM } from './CSI/LabTerminal.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';

const PAGE_SIZE = 4;

function text(value, fallback = 'Unknown') {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function short(value, length = 75) {
  const result = text(value);
  return result.length > length
    ? `${result.slice(0, length - 3)}...`
    : result;
}

function record(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export class EvidenceAnalysisLabScene extends BaseScene {
  constructor() {
    super({ key: 'EvidenceAnalysisLabScene' });
  }

  init(data = {}) {
    this.cityId =
      data.cityId ??
      gameState.currentMission?.city ??
      null;

    this.returnScene = data.returnScene || 'CrimeCityScene';

    this.returnData = record(data.returnData)
      ? { ...data.returnData }
      : {};

    if (this.cityId) {
      this.returnData.cityId = this.cityId;
    }

    this.terminal = null;
    this.view = { page: 'home', index: 0 };
    this.version = 0;
    this.leaving = false;
    this.notice = '';
  }

  create() {
    super.create();

    this.cameras.main.resetFX();
    this.cameras.main.setBackgroundColor('#050805');

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-ESC',
      this.handleEscape
    );

    this.scale.on('resize', this.redraw, this);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupTerminal,
      this
    );

    this.redraw();
  }

  getCaseKey() {
    const mission = gameState.currentMission || {};

    return JSON.stringify([
      mission.id ?? null,
      mission.city ?? this.cityId,
      mission.artifact ?? gameState.currentArtifact ?? null
    ]);
  }

  getObjectKey(item) {
    return JSON.stringify([
      item.uniqueKey ?? null,
      item.id,
      item.sceneId,
      item.cityId,
      item.foundAt ?? null
    ]);
  }

  getEvidence() {
    const source =
      gameState.crimeBoardData?.sceneFoundObjects;

    if (!Array.isArray(source)) return [];

    const seen = new Set();
    const city = String(this.cityId ?? '').toLowerCase();

    return source.filter(item => {
      if (!record(item) || item.id == null) return false;

      if (
        city &&
        String(item.cityId ?? '').toLowerCase() !== city
      ) {
        return false;
      }

      const key = this.getObjectKey(item);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  getReports() {
    const reports =
      gameState.crimeBoardData?.evidenceAnalysisReports;

    if (!Array.isArray(reports)) return [];

    const caseKey = this.getCaseKey();

    return reports.filter(report => {
      return (
        record(report) &&
        report.caseKey === caseKey &&
        report.type === 'evidence_registration'
      );
    });
  }

  getReport(item) {
    const objectKey = this.getObjectKey(item);

    return this.getReports().find(
      report => report.objectKey === objectKey
    ) || null;
  }

  open(page, options = {}) {
    if (this.leaving || this._cleanupDone) return;

    this.view = {
      page,
      index: 0,
      ...options
    };

    this.redraw();
  }

  redraw() {
    void this.render().catch(error => {
      if (!this._cleanupDone) {
        console.error(
          '[EvidenceAnalysisLabScene] Render failed:',
          error
        );
      }
    });
  }

  async render() {
    if (this.leaving || this._cleanupDone) return;

    const version = ++this.version;

    this.terminal?.destroy();

    const terminal = new LabTerminal(this, {
      title: 'MARK AGENCY // EVIDENCE WORKSTATION',
      width: Math.min(1100, this.scale.width - 32),
      height: Math.min(740, this.scale.height - 32),
      maxLines: 10,
      charDelay: 0
    });

    this.terminal = terminal;

    const current = () => (
      version === this.version &&
      terminal === this.terminal &&
      !terminal.destroyed &&
      !this.leaving &&
      !this._cleanupDone
    );

    const line = async (
      content,
      color = TERM.green,
      action = null
    ) => {
      if (!current()) return false;

      const completed = await terminal.print(content, {
        color,
        fontSize: '20px',
        charDelay: 0
      });

      if (!completed || !current()) return false;

      if (action) {
        const label = terminal.logLines[
          terminal.logLines.length - 1
        ];

        label
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            if (current()) label.setColor(TERM.amber);
          })
          .on('pointerout', () => {
            if (current()) label.setColor(color);
          })
          .on('pointerdown', () => {
            if (!current()) return;

            terminal.blip();
            action();
          });
      }

      return true;
    };

    const button = (label, action, color = TERM.green) => {
      if (!current()) return;

      terminal.button(label, color, () => {
        if (current()) action();
      });
    };

    const back = () => {
      button('MENU', () => this.open('home'));
    };

    const evidence = this.getEvidence();
    const view = this.view;

    if (view.page === 'home') {
      await line('EVIDENCE ANALYSIS WORKSTATION', TERM.amber);
      await line('Facts first. Dramatic accusations later.');
      await line('');
      await line(`Recovered objects: ${evidence.length}`);
      await line(`Registration reports: ${this.getReports().length}`);
      await line('');
      await line(
        'Select an object to check its evidence documentation.'
      );
      await line(
        'The computer cannot determine guilt. Neither can the printer.',
        TERM.dim
      );

      button('EVIDENCE', () => this.open('evidence'));
      button('REPORTS', () => this.open('reports'));
      button('EXIT', () => void this.leave(), TERM.amber);
      return;
    }

    if (
      view.page === 'evidence' ||
      view.page === 'reports'
    ) {
      const reportsMode = view.page === 'reports';
      const entries = reportsMode
        ? this.getReports()
        : evidence;

      const maxPage = Math.max(
        0,
        Math.ceil(entries.length / PAGE_SIZE) - 1
      );

      const index = Math.min(
        Math.max(0, view.index),
        maxPage
      );

      this.view.index = index;

      await line(
        reportsMode ? 'SAVED REPORTS' : 'RECOVERED OBJECTS',
        TERM.amber
      );

      await line(
        `Page ${index + 1}/${maxPage + 1} — click an entry.`,
        TERM.dim
      );

      const visible = entries.slice(
        index * PAGE_SIZE,
        (index + 1) * PAGE_SIZE
      );

      if (!visible.length) {
        await line(
          reportsMode
            ? 'No reports yet. Examine a recovered object first.'
            : 'No recovered objects registered for this city.'
        );
      }

      for (let i = 0; i < visible.length; i += 1) {
        const entry = visible[i];

        const label = reportsMode
          ? entry.itemName
          : entry.item;

        const completed = reportsMode ||
          Boolean(this.getReport(entry));

        await line(
          `${index * PAGE_SIZE + i + 1}. ` +
          `${short(label, 60)}${completed ? ' [FILED]' : ''}`,
          TERM.green,
          () => this.open(
            reportsMode ? 'report' : 'object',
            reportsMode
              ? { report: entry }
              : { item: entry }
          )
        );
      }

      if (index > 0) {
        button('PREV', () => this.open(view.page, {
          index: index - 1
        }));
      }

      if (index < maxPage) {
        button('NEXT', () => this.open(view.page, {
          index: index + 1
        }));
      }

      back();
      return;
    }

    if (view.page === 'object') {
      const item = view.item;

      if (!this.isAvailable(item)) {
        this.open('evidence');
        return;
      }

      const report = this.getReport(item);

      await line(short(item.item), TERM.amber);
      await line(`Evidence ID: ${text(item.id)}`);
      await line(`Recovery site: ${text(item.sceneId)}`);
      await line(`City: ${text(item.cityId)}`);
      await line('');
      await line(
        report
          ? 'Documentation checked. Registration report available.'
          : 'Available procedure: evidence-label verification.'
      );
      await line(
        'This checks the record, not how the object was used.',
        TERM.dim
      );

      if (report) {
        button('REPORT', () => this.open('report', {
          report
        }));
      } else {
        button('EXAMINE', () => this.startExamination(item));
      }

      button('BACK', () => this.open('evidence'));
      return;
    }

    if (view.page === 'examination') {
      const item = view.item;

      if (!this.isAvailable(item)) {
        this.open('evidence');
        return;
      }

      await line('EVIDENCE-LABEL VERIFICATION', TERM.amber);
      await line(short(item.item));
      await line(
        `Recovery record: ${text(item.cityId)} / ${text(item.sceneId)}`
      );
      await line('');
      await line('Which label matches the recovery record?');

      if (this.notice) {
        await line(this.notice, TERM.amber);
      }

      for (let i = 0; i < view.labels.length; i += 1) {
        const candidate = view.labels[i];

        await line(
          `${i + 1}. ${short(candidate.label, 85)}`,
          TERM.green,
          () => this.checkLabel(item, candidate.correct)
        );
      }

      button('CANCEL', () => this.open('object', { item }));
      return;
    }

    if (view.page === 'report') {
      const report = view.report;

      if (!this.getReports().some(
        entry => entry.id === report?.id
      )) {
        this.open('reports');
        return;
      }

      await line('EVIDENCE REGISTRATION REPORT', TERM.amber);
      await line(short(report.itemName));
      await line(`Evidence ID: ${text(report.itemId)}`);
      await line(`Recovery site: ${text(report.sceneId)}`);
      await line(`City: ${text(report.cityId)}`);
      await line('');
      await line(report.observation);
      await line(
        'Use in the theft: NOT ESTABLISHED.',
        TERM.amber
      );
      await line(
        this.notice || 'Filed. The paperwork is now legally heavier.',
        TERM.dim
      );

      button('REPORTS', () => {
        this.notice = '';
        this.open('reports');
      });

      button('EVIDENCE', () => {
        this.notice = '';
        this.open('evidence');
      });

      back();
    }
  }

  isAvailable(item) {
    if (!item) return false;

    const key = this.getObjectKey(item);

    return this.getEvidence().some(
      entry => this.getObjectKey(entry) === key
    );
  }

  startExamination(item) {
    if (!this.isAvailable(item)) return;

    this.notice = '';

    const city = text(item.cityId);
    const site = text(item.sceneId);

    const labels = [
      {
        label: `${city} / ${site}`,
        correct: true
      },
      {
        label: `${city} / unverified storage room`,
        correct: false
      },
      {
        label: `${city} / staff cafeteria lost property`,
        correct: false
      }
    ];

    for (let i = labels.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));

      [labels[i], labels[j]] = [labels[j], labels[i]];
    }

    this.open('examination', { item, labels });
  }

  checkLabel(item, correct) {
    if (!this.isAvailable(item)) {
      this.open('evidence');
      return;
    }

    if (!correct) {
      this.notice =
        'Label mismatch. Check the recovery record again.';

      this.redraw();
      return;
    }

    const existing = this.getReport(item);

    if (existing) {
      this.open('report', { report: existing });
      return;
    }

    const report = {
      id: JSON.stringify([
        this.getCaseKey(),
        this.getObjectKey(item),
        'evidence_registration'
      ]),
      type: 'evidence_registration',
      caseKey: this.getCaseKey(),
      objectKey: this.getObjectKey(item),
      itemId: String(item.id),
      itemName: text(item.item),
      sceneId: text(item.sceneId),
      cityId: text(item.cityId),
      observation:
        'The selected evidence label matches the recorded recovery location.',
      createdAt: Date.now()
    };

    const board = record(gameState.crimeBoardData)
      ? gameState.crimeBoardData
      : {};

    const previous = Array.isArray(
      board.evidenceAnalysisReports
    )
      ? board.evidenceAnalysisReports
      : [];

    gameState.crimeBoardData = {
      ...board,
      evidenceAnalysisReports: [...previous, report]
    };

    const saved = saveGameState();

    this.notice = saved
      ? 'Report saved.'
      : 'Report is in memory. Disk save failed or is unavailable.';

    this.open('report', { report });
  }

  handleEscape() {
    if (this.leaving || this._cleanupDone) return;

    this.notice = '';

    if (this.view.page === 'home') {
      void this.leave();
      return;
    }

    if (this.view.page === 'examination') {
      this.open('object', {
        item: this.view.item
      });
      return;
    }

    this.open('home');
  }

  async leave() {
    if (this.leaving || this._cleanupDone) return false;

    this.leaving = true;

    try {
      const source = this.getRegisteredScene(
        this.returnScene
      );

      if (
        source &&
        (
          source.sys.isPaused() ||
          source.sys.isSleeping() ||
          source.sys.isActive()
        )
      ) {
        source.sys.setVisible(true);

        if (source.sys.isPaused()) {
          this.scene.resume(this.returnScene);
        }

        if (source.sys.isSleeping()) {
          this.scene.wake(this.returnScene);
        }

        this.scene.stop();
        return true;
      }

      const moved = await this.goto(
        this.returnScene,
        this.returnData
      );

      if (!moved && !this._cleanupDone) {
        this.leaving = false;
        this.redraw();
      }

      return moved;
    } catch (error) {
      console.error(
        '[EvidenceAnalysisLabScene] Exit failed:',
        error
      );

      if (!this._cleanupDone) {
        this.leaving = false;
        this.redraw();
      }

      return false;
    }
  }

  cleanupTerminal() {
    this.version += 1;

    this.scale.off('resize', this.redraw, this);

    this.terminal?.destroy();
    this.terminal = null;
  }
}