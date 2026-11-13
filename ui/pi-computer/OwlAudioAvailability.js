import { getDeadMenMail } from '../../managers/DeadMenCallingService.js';
import { ComputerAudio } from './ComputerAudio.js';

const INSTALLED = Symbol.for('lostArtifacts.owlAudioAvailability.v1');
const TRANSCRIPTS = new Set([
  'dead_men_recording_1',
  'dead_men_recording_2',
  'dead_men_recording_3'
]);

export function canUseOwlAudio() {
  return getDeadMenMail().some(message => TRANSCRIPTS.has(message.id));
}

export function installOwlAudioAvailability(ui) {
  if (ui[INSTALLED]) return;
  ui[INSTALLED] = true;

  const ensureApp = () => {
    if (!canUseOwlAudio()) return false;
    if (!ui.audioApp) ui.audioApp = new ComputerAudio(ui);
    return true;
  };

  const createIcon = ui.desktop.createIcon;
  ui.desktop.createIcon = function (...args) {
    const label = args[3];
    const kind = args[4];
    if ((label === 'Owl Audio' || kind === 'audio') && !canUseOwlAudio()) {
      return;
    }
    return createIcon.apply(this, args);
  };

  const drawStartMenu = ui.shell.drawStartMenu;
  ui.shell.drawStartMenu = function (layout, items, ...args) {
    const available = canUseOwlAudio();
    const filtered = items.filter(item => item.app !== 'audio' || available);
    return drawStartMenu.call(this, layout, filtered, ...args);
  };

  const openApp = ui.openApp;
  ui.openApp = function (app, ...args) {
    if (app === 'audio') {
      if (this.destroyed || !this.isOpen || this.suspended || this.booting) return;
      if (!ensureApp()) {
        this.menuOpen = false;
        this.notice = 'Owl Audio will be available when the case transcripts arrive.';
        this.render();
        return;
      }
    }
    return openApp.call(this, app, ...args);
  };

  const shellOpen = ui.shell.open;
  ui.shell.open = function (app, ...args) {
    if (app === 'audio' && !ensureApp()) return false;
    return shellOpen.call(this, app, ...args);
  };

  const renderApplication = ui.monitor.renderApplication;
  ui.monitor.renderApplication = function (...args) {
    if (ui.app === 'audio' && !ensureApp()) {
      const box = ui.window || ui.layout;
      if (box) {
        ui.drawing.text(
          box.x + 20,
          box.y + 54,
          'Owl Audio will be available when the case transcripts arrive.',
          16,
          '#e4dfc2',
          Math.max(100, box.w - 40)
        );
      }
      return;
    }
    return renderApplication.apply(this, args);
  };
}