import {
  EvidenceAnalysisLabScene as EvidenceAnalysisLabBaseScene
} from './EvidenceAnalysisLabBaseScene.js';

import { LabTerminal, TERM } from './CSI/LabTerminal.js';

import {
  EXAMINATION_PROFILES
} from './evidenceAnalysis/ExaminationProfiles.js';

import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';

const PAGE_SIZE = 4;

function shorten(value, length = 78) {
  const result = String(value ?? '').trim() || 'Unknown';

  return result.length > length
    ? `${result.slice(0, length - 3)}...`
    : result;
}

function shuffle(entries) {
  const result = [...entries];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export class EvidenceAnalysisLabScene
  extends EvidenceAnalysisLabBaseScene {

  init(data = {}) {
    super.init(data);

    this.examinationNotice = '';
  }

  getProfile(item) {
    if (!item) return null;

    return EXAMINATION_PROFILES[String(item.id)] || null;
  }

  getFindings() {
    const source =
      gameState.crimeBoardData?.evidenceLabFindings;

    if (!Array.isArray(source)) return [];

    const caseKey = this.getCaseKey();

    return source.filter(entry => {
      return (
        entry &&
        typeof entry === 'object' &&
        entry.caseKey === caseKey &&
        entry.type === 'object_examination'
      );
    });
  }

  getFinding(item) {
    if (!item) return null;

    const objectKey = this.getObjectKey(item);

    return this.getFindings().find(
      entry => entry.objectKey === objectKey
    ) || null;
  }

  openExamination(item) {
    if (!this.isAvailable(item)) {
      this.open('evidence');
      return;
    }

    const existing = this.getFinding(item);

    if (existing) {
      this.open('labFinding', { finding: existing });
      return;
    }

    const profile = this.getProfile(item);

    if (!profile) return;

    this.examinationNotice = '';

    this.open('labMethod', {
      item,
      methods: shuffle(profile.methods)
    });
  }

  chooseMethod(item, method) {
    if (
      this._cleanupDone ||
      this.leaving ||
      !this.isAvailable(item)
    ) {
      return;
    }

    if (!method.correct) {
      this.examinationNotice =
        'Procedure rejected. Preserve the evidence and try again.';

      this.redraw();
      return;
    }

    const profile = this.getProfile(item);

    if (!profile) return;

    this.examinationNotice = '';

    this.open('labInterpretation', {
      item,
      interpretations: shuffle(profile.interpretations)
    });
  }

  saveFinding(item, interpretation) {
    if (
      this._cleanupDone ||
      this.leaving ||
      !this.isAvailable(item)
    ) {
      return;
    }

    const profile = this.getProfile(item);

    if (
      !profile ||
      !profile.interpretations.includes(interpretation)
    ) {
      return;
    }

    const existing = this.getFinding(item);

    if (existing) {
      this.open('labFinding', { finding: existing });
      return;
    }

    const finding = {
      id: JSON.stringify([
        this.getCaseKey(),
        this.getObjectKey(item),
        'object_examination'
      ]),

      type: 'object_examination',
      caseKey: this.getCaseKey(),
      objectKey: this.getObjectKey(item),

      itemId: String(item.id),
      itemName: String(item.item || item.id),
      cityId: item.cityId || null,
      sceneId: item.sceneId || null,

      observation: profile.observation,
      limitation: profile.limitation,

      interpretation,
      interpretationStatus: 'player_hypothesis',

      createdAt: Date.now()
    };

    const board = gameState.crimeBoardData || {};

    const previous = Array.isArray(
      board.evidenceLabFindings
    )
      ? board.evidenceLabFindings
      : [];

    gameState.crimeBoardData = {
      ...board,
      evidenceLabFindings: [...previous, finding]
    };

    const saved = saveGameState();

    this.examinationNotice = saved
      ? 'Examination report saved.'
      : 'Report kept in memory. Disk save is unavailable.';

    this.open('labFinding', { finding });
  }

  async render() {
    const customPages = new Set([
      'labObjects',
      'labMethod',
      'labInterpretation',
      'labFindings',
      'labFinding'
    ]);

    if (!customPages.has(this.view.page)) {
      const requestedView = this.view;

      await super.render();

      if (
        this._cleanupDone ||
        this.leaving ||
        this.view !== requestedView ||
        !this.terminal ||
        this.terminal.destroyed
      ) {
        return;
      }

      const terminal = this.terminal;
      const version = this.version;

      const addButton = (label, action) => {
        terminal.button(label, TERM.amber, () => {
          if (
            terminal !== this.terminal ||
            version !== this.version ||
            this.leaving ||
            this._cleanupDone
          ) {
            return;
          }

          action();
        });
      };

      if (this.view.page === 'home') {
        addButton(
          'LAB TESTS',
          () => this.open('labObjects')
        );
      }

      if (
        this.view.page === 'object' &&
        this.getProfile(this.view.item)
      ) {
        const item = this.view.item;

        addButton(
          this.getFinding(item) ? 'FINDING' : 'LAB TEST',
          () => this.openExamination(item)
        );
      }

      if (this.view.page === 'reports') {
        addButton(
          'LAB REPORTS',
          () => this.open('labFindings')
        );
      }

      return;
    }

    if (this._cleanupDone || this.leaving) return;

    const version = ++this.version;

    this.terminal?.destroy();

    const terminal = new LabTerminal(this, {
      title: 'MARK AGENCY // OBJECT EXAMINATION',
      width: Math.min(1100, this.scale.width - 32),
      height: Math.min(740, this.scale.height - 32),
      maxLines: 12,
      charDelay: 0
    });

    this.terminal = terminal;

    const current = () => (
      terminal === this.terminal &&
      version === this.version &&
      !terminal.destroyed &&
      !this._cleanupDone &&
      !this.leaving
    );

    const line = async (
      content,
      color = TERM.green,
      action = null
    ) => {
      if (!current()) return false;

      const completed = await terminal.print(content, {
        color,
        fontSize: '19px',
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

    const button = (label, action) => {
      if (!current()) return;

      terminal.button(label, TERM.green, () => {
        if (current()) action();
      });
    };

    const menu = () => {
      button('MENU', () => this.open('home'));
    };

    const view = this.view;

    if (
      view.page === 'labObjects' ||
      view.page === 'labFindings'
    ) {
      const reportsMode = view.page === 'labFindings';

      const entries = reportsMode
        ? this.getFindings()
        : this.getEvidence().filter(
            item => Boolean(this.getProfile(item))
          );

      const maxIndex = Math.max(
        0,
        Math.ceil(entries.length / PAGE_SIZE) - 1
      );

      const index = Math.min(
        Math.max(0, view.index || 0),
        maxIndex
      );

      this.view.index = index;

      await line(
        reportsMode ? 'EXAMINATION REPORTS' : 'AVAILABLE LAB TESTS',
        TERM.amber
      );

      await line(
        `Page ${index + 1}/${maxIndex + 1}. Click an entry.`,
        TERM.dim
      );

      const visible = entries.slice(
        index * PAGE_SIZE,
        (index + 1) * PAGE_SIZE
      );

      if (!visible.length) {
        await line(
          reportsMode
            ? 'No object examinations filed yet.'
            : 'No recovered object has an examination profile yet.'
        );

        if (!reportsMode) {
          await line(
            'Current profiles: blueprint, glass, art book, origami note.',
            TERM.dim
          );
        }
      }

      for (let i = 0; i < visible.length; i += 1) {
        const entry = visible[i];

        await line(
          `${index * PAGE_SIZE + i + 1}. ` +
          shorten(
            reportsMode ? entry.itemName : entry.item,
            65
          ),
          TERM.green,
          () => {
            if (reportsMode) {
              this.examinationNotice = '';

              this.open('labFinding', {
                finding: entry
              });
            } else {
              this.openExamination(entry);
            }
          }
        );
      }

      if (index > 0) {
        button('PREV', () => this.open(view.page, {
          index: index - 1
        }));
      }

      if (index < maxIndex) {
        button('NEXT', () => this.open(view.page, {
          index: index + 1
        }));
      }

      button(
        reportsMode ? 'TESTS' : 'REPORTS',
        () => this.open(
          reportsMode ? 'labObjects' : 'labFindings'
        )
      );

      menu();
      return;
    }

    if (
      view.page === 'labMethod' ||
      view.page === 'labInterpretation'
    ) {
      const item = view.item;
      const profile = this.getProfile(item);

      if (!profile || !this.isAvailable(item)) {
        this.open('labObjects');
        return;
      }

      await line(profile.title, TERM.amber);
      await line(shorten(item.item));

      if (view.page === 'labMethod') {
        await line(profile.question);
        await line(
          this.examinationNotice ||
          'Choose a non-destructive procedure.',
          TERM.dim
        );

        for (let i = 0; i < view.methods.length; i += 1) {
          const method = view.methods[i];

          await line(
            `${i + 1}. ${method.label}`,
            TERM.green,
            () => this.chooseMethod(item, method)
          );
        }

        button('CANCEL', () => this.open('labObjects'));
        return;
      }

      await line(`OBSERVATION: ${profile.observation}`);
      await line(profile.limitation, TERM.amber);
      await line(profile.joke, TERM.dim);
      await line('Choose your working interpretation:');

      for (
        let i = 0;
        i < view.interpretations.length;
        i += 1
      ) {
        const interpretation = view.interpretations[i];

        await line(
          `${i + 1}. ${interpretation}`,
          TERM.green,
          () => this.saveFinding(item, interpretation)
        );
      }

      button('CANCEL', () => this.open('labObjects'));
      return;
    }

    if (view.page === 'labFinding') {
      const finding = this.getFindings().find(
        entry => entry.id === view.finding?.id
      );

      if (!finding) {
        this.open('labFindings');
        return;
      }

      await line('OBJECT EXAMINATION REPORT', TERM.amber);
      await line(shorten(finding.itemName));
      await line(
        `Site: ${shorten(finding.sceneId, 35)} / ` +
        `${shorten(finding.cityId, 25)}`,
        TERM.dim
      );

      await line(`OBSERVATION: ${finding.observation}`);
      await line(`LIMITATION: ${finding.limitation}`, TERM.amber);
      await line('YOUR WORKING HYPOTHESIS:', TERM.dim);
      await line(finding.interpretation);

      await line(
        this.examinationNotice ||
        'A recorded hypothesis is not a verified fact.',
        TERM.dim
      );

      button('REPORTS', () => {
        this.examinationNotice = '';
        this.open('labFindings');
      });

      button('TESTS', () => {
        this.examinationNotice = '';
        this.open('labObjects');
      });

      menu();
    }
  }

  handleEscape() {
    if (this.leaving || this._cleanupDone) return;

    if (
      this.view.page === 'labMethod' ||
      this.view.page === 'labInterpretation'
    ) {
      this.examinationNotice = '';
      this.open('labObjects');
      return;
    }

    if (this.view.page === 'labFinding') {
      this.examinationNotice = '';
      this.open('labFindings');
      return;
    }

    super.handleEscape();
  }
}