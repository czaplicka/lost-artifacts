import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { computerUiCanInteract, playComputerUiClick } from './ComputerUiAudio.js';
import {
  prepareComputerNotebookAudio,
  playComputerNotebookAudio
} from './ComputerNotebookAudio.js';

const FILE = 'ui/pi-computer/ComputerSearchNotebook.js';
const t = id => __dialogueText(FILE, id);

export class ComputerSearchNotebook {
  renderNotebook() {
    if (!this.data || !this.definition) return;
    const ui = this.ui;
    const scene = ui.scene;
    prepareComputerNotebookAudio(scene);

    const token = ui.viewToken;
    const caseId = this.definition.id;
    const live = () => (
      !this.dead && computerUiCanInteract(ui) && !ui.booting &&
      ui.app === 'search' && ui.viewToken === token &&
      this.definition?.id === caseId
    );
    const { width, height } = scene.scale;
    const margin = 8;
    const buttonWidth = Math.min(104, Math.max(1, width - margin * 2));
    const paperWidth = Math.max(1, Math.min(340, width - margin * 2));
    const paperHeight = Math.max(1, Math.min(620, height - 66));
    const paperX = width - paperWidth - margin;
    const paperY = Math.min(54, Math.max(margin, height - paperHeight - margin));
    let panel = null;
    let busy = false;

    const stop = (pointer, localX, localY, event) => event?.stopPropagation();
    const toggle = () => {
      if (!live() || busy) return;
      if (!this.notesOpen) {
        this.notesOpen = true;
        this.notebookAnimateOpen = true;
        playComputerNotebookAudio(ui, 'paper');
        this.refresh();
        return;
      }
      this.notesOpen = false;
      this.notebookAnimateOpen = false;
      playComputerUiClick(ui);
      if (!panel || !panel.scene || panel.active === false) {
        this.refresh();
        return;
      }
      busy = true;
      scene.tweens.killTweensOf(panel);
      scene.tweens.add({
        targets: panel,
        x: width + 12,
        duration: 180,
        ease: 'Sine.easeIn',
        onComplete: () => {
          if (live()) this.refresh();
        }
      });
    };

    if (this.notesOpen) {
      panel = scene.add.container(paperX, paperY);
      ui.root.add(panel);
      const currentPanel = panel;
      panel.once('destroy', () => scene.tweens?.killTweensOf(currentPanel));

      const rectangle = (x, y, w, h, color, alpha = 1) => {
        const object = scene.add.rectangle(x, y, w, h, color, alpha).setOrigin(0);
        panel.add(object);
        return object;
      };
      const text = (x, y, value, size = 16, color = '#3d4034') => {
        const object = scene.add.text(x, y, value, {
          fontFamily: 'SpecialElite, "Special Elite", monospace',
          fontSize: `${size}px`,
          color
        });
        panel.add(object);
        return object;
      };
      const fit = (label, maxWidth) => {
        if (label.width > maxWidth && label.width > 0) {
          label.setScale(Math.max(0.01, maxWidth / label.width));
        }
        return label;
      };
      const onClick = (object, callback) => {
        object.setInteractive({ useHandCursor: true });
        object.on('pointerdown', (pointer, localX, localY, event) => {
          event?.stopPropagation();
          if (!live() || busy || !this.notesOpen || object.active === false || !object.scene) return;
          callback();
        });
        return object;
      };

      rectangle(5, 7, paperWidth, paperHeight, 0x000000, 0.35);
      const paper = rectangle(0, 0, paperWidth, paperHeight, 0xeee3b8).setInteractive();
      paper.on('pointerdown', stop);
      paper.on('pointerup', stop);
      paper.on('pointermove', stop);
      paper.on('wheel', (pointer, dx, dy, dz, event) => event?.stopPropagation());
      rectangle(34, 12, 1, Math.max(1, paperHeight - 24), 0xbc7466, 0.55);
      for (let y = 65; y < paperHeight - 32; y += 25) {
        rectangle(12, y, Math.max(1, paperWidth - 24), 1, 0x9baf9a, 0.35);
      }
      for (let y = 30; y < paperHeight - 20; y += 48) {
        panel.add(scene.add.circle(12, y, 4, 0x6b6a56, 0.7));
      }
      fit(text(46, 20, t('t_12c42506eefd4f2c93f3'), 19), Math.max(1, paperWidth - 98));
      onClick(text(paperWidth - 31, 16, 'X', 21), toggle);

      if (this.data.cases.length > 1) {
        const title = fit(text(46, 44, this.definition.title, 12), Math.max(1, paperWidth - 62));
        onClick(title, () => {
          const before = this.definition.id;
          const nextIndex = (this.data.cases.indexOf(this.definition) + 1) % this.data.cases.length;
          this.notePage = 0;
          this.selectCase(this.data.cases[nextIndex].id);
          if (this.definition?.id !== before) playComputerNotebookAudio(ui, 'page');
        });
      }

      const lines = [];
      const maxTextWidth = Math.max(1, paperWidth - 65);
      const probe = text(0, 0, '', 16).setVisible(false);
      const measure = value => {
        probe.setText(value);
        return probe.width;
      };
      const keywords = this.definition.keywords.filter(
        keyword => this.progress.known.includes(keyword.id)
      );
      for (const keyword of keywords) {
        let current = '';
        const emit = () => {
          if (!current) return;
          lines.push({ label: current, id: keyword.id, line: lines.length });
          current = '';
        };
        for (const word of String(keyword.label).split(/\s+/).filter(Boolean)) {
          const candidate = current ? `${current} ${word}` : word;
          if (current && measure(candidate) > maxTextWidth) emit();
          if (measure(word) <= maxTextWidth) {
            current = current ? `${current} ${word}` : word;
          } else {
            emit();
            for (const character of word) {
              if (current && measure(current + character) > maxTextWidth) emit();
              current += character;
            }
          }
        }
        emit();
      }
      probe.destroy();

      const rows = Math.max(1, Math.floor((paperHeight - 116) / 25));
      const pages = Math.max(1, Math.ceil(lines.length / rows));
      this.notePage = Math.max(0, Math.min(Number(this.notePage) || 0, pages - 1));
      for (const item of lines.filter(entry => Math.floor(entry.line / rows) === this.notePage)) {
        const label = text(
          46, 70 + (item.line % rows) * 25,
          item.label, 16,
          this.terms.includes(item.id) ? '#a14d35' : '#384b43'
        );
        onClick(label, () => {
          const selected = this.terms.includes(item.id);
          this.selectKeyword(item.id);
          if (this.terms.includes(item.id) !== selected) playComputerUiClick(ui);
        });
      }
      if (!lines.length) {
        text(46, 74, 'No clues yet.', 15, '#696954');
      }
      if (pages > 1) {
        const turn = direction => {
          const before = this.notePage;
          this.notePage = (this.notePage + direction + pages) % pages;
          if (this.notePage !== before) {
            playComputerNotebookAudio(ui, 'page');
            this.refresh();
          }
        };
        onClick(text(46, paperHeight - 31, '<', 18), () => turn(-1));
        text(paperWidth / 2 - 15, paperHeight - 28, `${this.notePage + 1}/${pages}`, 13);
        onClick(text(paperWidth - 38, paperHeight - 31, '>', 18), () => turn(1));
      }

      if (this.notebookAnimateOpen) {
        this.notebookAnimateOpen = false;
        panel.x = width + 12;
        scene.tweens.add({
          targets: panel,
          x: paperX,
          duration: 220,
          ease: 'Cubic.easeOut'
        });
      }
    }

    const button = scene.add.text(
      width - buttonWidth - margin, margin,
      this.notesOpen ? 'Notes  >' : '<  Notes',
      {
        fontFamily: 'SpecialElite, "Special Elite", monospace',
        fontSize: '16px',
        color: '#fff1c6',
        backgroundColor: '#374540',
        padding: { x: 10, y: 10 }
      }
    ).setFixedSize(buttonWidth, 36).setInteractive({ useHandCursor: true });
    ui.root.add(button);
    button.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation();
      if (button.active === false || !button.scene) return;
      toggle();
    });
    button.on('pointerover', () => button.setBackgroundColor('#4a6056'));
    button.on('pointerout', () => button.setBackgroundColor('#374540'));
  }

  paginate(blocks, width, height) {
    const probe = this.ui.scene.add.text(0, 0, '', {
      fontFamily: 'SpecialElite, "Special Elite", monospace',
      fontSize: '16px'
    }).setVisible(false);
    const measure = value => { probe.setText(value); return probe.width; };
    const pages = [[]];
    let x = 0;
    let y = 0;
    const nextLine = () => {
      x = 0;
      y += 25;
      if (y + 22 > height) { pages.push([]); y = 0; }
    };
    try {
      for (const block of blocks) {
        for (const part of block) {
          const id = typeof part === 'object' ? part.keywordId : null;
          const value = id
            ? (part.text || this.definition.keywords.find(keyword => keyword.id === id).label)
            : part;
          for (const token of value.split(/(\s+)/).filter(Boolean)) {
            if (/^\s+$/.test(token)) { if (x) x += measure(' '); continue; }
            const emit = chunk => {
              const textWidth = measure(chunk);
              if (x && x + textWidth > width) nextLine();
              pages[pages.length - 1].push({ text: chunk, keywordId: id, x, y });
              x += textWidth;
            };
            let word = '';
            for (const character of token) {
              if (word && measure(word + character) > width) {
                emit(word);
                nextLine();
                word = '';
              }
              word += character;
            }
            if (word) emit(word);
          }
        }
        nextLine();
        if (y) nextLine();
      }
    } finally { probe.destroy(); }
    if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
    return pages;
  }
}