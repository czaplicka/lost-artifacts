import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { W, H, ORDER, LOCAL, P, FONT, BEAM, BEAM_CENTER, WINDOW_FLY, LINES, pick, timeText, goldPlate } from './PigeonLoftData.js';

export const pigeonLoftEditor = {
  editorText() {
    const c = this.configs[this.selectedIndex];
    return `${__dialogueText("scenes/PigeonLoftScene.js", "t_0d1e521aa39df970320a")}${c?.id}${__dialogueText("scenes/PigeonLoftScene.js", "t_01c59aaed25f30342584")}${Math.round(c?.x || 0)}${__dialogueText("scenes/PigeonLoftScene.js", "t_8278a5c11d3d9380f821")}${Math.round(c?.y || 0)}${__dialogueText("scenes/PigeonLoftScene.js", "t_1b89a9604b178452218e")}${Math.round(c?.w || 0)}${__dialogueText("scenes/PigeonLoftScene.js", "t_3f4674b8e35cc249a199")}${Math.round(c?.h || 0)}${__dialogueText("scenes/PigeonLoftScene.js", "t_01ba4719c80b6fe911b0")}` +
      __dialogueText("scenes/PigeonLoftScene.js", "t_dce34ac4de6aee5976a9");
  },
  drawEditorHelp() {
    this.debugText = this.add.text(24, 160, this.editorText(), { fontFamily: FONT.body, fontSize: '18px', color: '#a5ffd4',
      backgroundColor: '#201409', padding: { x: 10, y: 8 }, wordWrap: { width: 1100 } }).setDepth(120);
    this.hud.add(this.debugText);
  },
  onKey(event, fromSharedPanel = false) {
    if ((event.defaultPrevented && !fromSharedPanel) || this.pigeonNameEditor) return;
    if (event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.code === "Escape") {
      if (this.modal) this.closeModal();
      else if (this.dialogue) this.closeDialogue();
      else if (this.debugMode) { this.debugMode = false; this.renderLoft(); } return;
    }
    if (this.dialogue?.isOpen && !this.modal && !this.debugMode) {
      const m = /^(Digit|Numpad)([1-9])$/.exec(event.code);
      if (m) { event.preventDefault(); this.dialogue.triggerTopic(Number(m[2]) - 1); return; }
    }
    if (!LOCAL || event.ctrlKey || event.metaKey || this.leaving) return;
    if (event.code === 'KeyD' && !event.repeat) {
      this.debugMode = !this.debugMode; this.modal = null; if (this.debugMode) this.closeDialogue(); this.renderLoft(); return;
    }
    if (!this.debugMode) return;
    if (event.code === 'KeyC' && !event.repeat) {
      console.log('COPY INTO config/pigeonHotspots.js:');
      console.log('export const PIGEON_HOTSPOTS = ' + JSON.stringify(this.configs.map(c => ({ ...c, auto: false })), null, 2) + ';'); return;
    }
    if (event.code === "Tab") {
      event.preventDefault(); this.selectedIndex = (this.selectedIndex + (event.shiftKey ? -1 : 1) + this.configs.length) % this.configs.length;
      this.drawAllHotspots(); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault(); const c = this.configs[this.selectedIndex], step = event.altKey ? 1 : 5;
    const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.code), direction = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    c[key] += direction * step; c.w = Math.max(10, c.w); c.h = Math.max(10, c.h); c.auto = false;
    const hs = this.hotspots.find(h => h.cfg === c); if (hs) this.syncHotspot(hs); this.drawAllHotspots();
  }
};
