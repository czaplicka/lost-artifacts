import { ShortShortsPanel } from '../ui/ShortShortsPanel.js';
import { TableForThreeCameraInput } from '../ui/TableForThreeCameraInput.js';
import { attachTableForThreeEvidenceViewer } from '../ui/TableForThreeEvidenceViewer.js';
import { paintShortShorts, cropShortShorts, ART_WIDTH, ART_HEIGHT } from '../ui/ShortShortsArt.js';
import { SHORT_SHORTS_CONFIG as CONFIG } from '../config/ShortShortsConfig.js';
import { getTown } from '../config/RoadTripTowns.js';
import { getCurrentTownId } from '../managers/RoadTripManager.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { readShortShorts, readShortShortsEvidence, dispatchShortShorts, captureShortShortsEvidence } from '../managers/ShortShortsService.js';
import { validateShortShortsFrame } from '../managers/ShortShortsCapturePolicy.js';
import { returnFromShortShorts } from '../managers/ShortShortsTravel.js';

export class ShortShortsScene extends Phaser.Scene {
  constructor() { super({ key: CONFIG.sceneKey }); }
  create() {
    this.cameraInput = null;
    this.panel = new ShortShortsPanel(this);
    this.cleanup = () => this.disposeCamera();
    this.events.once('shutdown', this.cleanup);
    this.events.once('destroy', this.cleanup);
    if (getCurrentTownId() !== CONFIG.townId) { this.screen('Location unavailable', 'You are not in ' + getTown(CONFIG.townId).name + '.', [['DRIVE HOME', () => this.home()]]); return; }
    const s = readShortShorts();
    if (!s) { this.screen('Missing contract', 'Accept Who Wears Short Shorts? from the office classifieds.'); return; }
    if (s.stage === 'travel') {
      const r = dispatchShortShorts({ type: 'ARRIVE' }, { inTown: true });
      if (!r.ok) { this.screen('Not yet', r.reason, [['DRIVE HOME', () => this.home()]]); return; }
    }
    this.menu();
  }
  disposeCamera() { const camera = this.cameraInput; this.cameraInput = null; camera?.destroy(); }
  screen(title, body, choices = []) { this.disposeCamera(); this.panel.render(title, body, choices); }
  act(type, extra = {}, context = {}) {
    const result = dispatchShortShorts({ type, ...extra }, context);
    if (!result.ok) this.screen('Not yet', result.reason, [['BACK', () => this.menu()]]);
    return result.ok;
  }
  menu() {
    const s = readShortShorts();
    const place = getTown(CONFIG.townId).name;
    if (!s) { this.screen('Missing contract', 'Restore an accepted contract.'); return; }
    const choices = [['EVIDENCE', () => this.gallery()], ['DRIVE HOME', () => this.home()]];
    let body = CONFIG.subjectName + ' lives opposite your observation spot. It is snowing. This will matter.';
    if (s.stage === 'observation') choices.unshift(['OBSERVE', () => this.observe()]);
    else if (s.stage === 'report') {
      body = 'You have both photographs: the refrigerator, and the face behind it.\n\nKolpon wants proof. Gus wants a quiet winter. You want to be paid.';
      choices.unshift(['REPORT TO KOLPON', () => this.ending()]);
    } else if (s.stage === 'reply') body = 'Your report is sent. Kolpon’s reply is waiting in your office mailbox.';
    else if (s.stage === 'closed') body = 'The case is closed.';
    this.screen('Who Wears Short Shorts? — ' + place, body, choices);
  }
  ending() {
    this.screen('What do you send?', 'Both photographs clearly show ' + CONFIG.subjectName + ' lifting a refrigerator in shorts. Once sent, this cannot be taken back.', [
      ['SEND BOTH PHOTOGRAPHS TO KOLPON', () => this.confirm('deliver')],
      ['REPORT “INCONCLUSIVE” AND KEEP THE PHOTOS', () => this.confirm('spare')],
      ['BACK', () => this.menu()]
    ]);
  }
  confirm(ending) {
    const text = ending === 'deliver'
      ? 'Kolpon receives the evidence. Gus’s claim is reviewed. The full fee applies.'
      : 'Kolpon receives a polite report with no useful photographs. The fee is reduced. Gus never learns how close it was.';
    this.screen('Are you sure?', text, [
      ['YES, SEND IT', () => { if (this.act('CHOOSE_ENDING', { ending })) this.menu(); }],
      ['BACK', () => this.ending()]
    ]);
  }
  observe() {
    let s = readShortShorts();
    if (!s || s.stage !== 'observation') { this.menu(); return; }
    if (!s.cameraChecked && !this.act('CHECK_CAMERA', {}, { hasCamera: piInventoryManager.hasItem('camera') })) return;
    s = readShortShorts();
    const beat = s.phase;
    const choices = [['BACK', () => this.menu()]];
    let body = 'Drag a frame over the subject, then use TAKE PHOTO or Enter. Escape clears the selection. Test artwork.';
    if (beat === 'idle') {
      body += '\n\nGus’s window. The refrigerator waits by the wall. So does the weather.';
      choices.unshift(['WAIT FOR GUS', () => { if (this.act('START_LIFT')) this.observe(); }]);
    } else if (beat === 'lift') {
      body += '\n\nGus raises a refrigerator over his head. He is wearing shorts. It is snowing. His face is behind the fridge, which is rude.' + (s.liftPhoto ? '\n\nThe lift is photographed. Now you need his face, same lift.' : '');
      choices.unshift(['LOOK AWAY', () => { if (this.act('REST')) this.observe(); }]);
      choices.unshift(['KEEP WATCHING', () => { if (this.act('SHOW_FACE')) this.observe(); }]);
    } else if (beat === 'face') {
      body += '\n\nGus peeks over the refrigerator to check whether anyone is watching. Someone is.';
      choices.unshift(['LOOK AWAY', () => { if (this.act('REST')) this.observe(); }]);
    }
    this.screen('Observation — Gus’s window', body, choices);
    const revision = this.panel.revision;
    const canvas = document.createElement('canvas');
    canvas.width = ART_WIDTH; canvas.height = ART_HEIGHT;
    Object.assign(canvas.style, { display: 'block', width: 'min(960px,100%)', height: 'auto', marginTop: '18px', touchAction: 'none', cursor: 'crosshair', imageRendering: 'pixelated' });
    const status = document.createElement('p');
    status.textContent = 'Select a frame. Releasing the pointer does not take a photograph.'; status.setAttribute('role', 'status');
    const controls = document.createElement('div');
    Object.assign(controls.style, { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' });
    const button = label => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      Object.assign(b.style, { padding: '12px 18px', fontFamily: 'SpecialElite, monospace', fontSize: '18px', background: '#263729', color: '#e3f0d7', border: '1px solid #88b589', cursor: 'pointer' });
      controls.append(b); return b;
    };
    const shutter = button('TAKE PHOTO'), clear = button('CLEAR FRAME');
    this.panel.root.append(canvas, status, controls);
    const ctx = canvas.getContext('2d');
    const camera = new TableForThreeCameraInput(canvas, {
      isActive: () => !this.panel.destroyed && !this.panel.pendingAction && this.panel.revision === revision && canvas.isConnected,
      draw: frame => {
        paintShortShorts(ctx, beat);
        if (frame) { ctx.strokeStyle = '#ffe4ac'; ctx.lineWidth = 3; ctx.strokeRect(frame.x * ART_WIDTH, frame.y * ART_HEIGHT, frame.w * ART_WIDTH, frame.h * ART_HEIGHT); }
      },
      onFrame: (frame, flags) => { shutter.disabled = !frame || flags.busy || flags.dragging; clear.disabled = !frame || flags.busy; },
      onStatus: text => { status.textContent = text; },
      onCapture: frame => {
        const result = captureShortShortsEvidence(frame);
        if (result.ok) this.photoResult(result.evidenceId);
        return result;
      }
    });
    this.cameraInput = camera;
    shutter.onclick = () => void camera.capture();
    clear.onclick = () => camera.clear();
  }
  photoResult(id) {
    const s = readShortShorts();
    const choices = s?.stage === 'observation' ? [['CONTINUE OBSERVATION', () => this.observe()]] : [['CONTINUE', () => this.menu()]];
    this.screen('Photograph recorded', 'Evidence added. This is the crop recorded for your report.', [...choices, ['EVIDENCE', () => this.gallery()], ['BACK', () => this.menu()]]);
    const record = readShortShortsEvidence()[id];
    if (record) this.appendCrop(record);
  }
  appendCrop(record) {
    const check = validateShortShortsFrame(record?.beat, record?.frame);
    if (record?.rendererVersion !== CONFIG.rendererVersion || !check.ok || check.kind !== record.kind) {
      const warning = document.createElement('p');
      warning.textContent = 'This crop is invalid or uses an unsupported renderer. It has not been changed.';
      this.panel.root.append(warning); return;
    }
    const canvas = document.createElement('canvas');
    cropShortShorts(canvas, record);
    Object.assign(canvas.style, { maxWidth: '100%', imageRendering: 'pixelated', border: '1px solid #c0ab7b' });
    attachTableForThreeEvidenceViewer(canvas, record);
    this.panel.root.append(canvas);
  }
  gallery() {
    const records = Object.values(readShortShortsEvidence());
    this.screen('Photographic evidence', records.length ? 'Saved crops of the observation.' : 'No photographs yet.', [['BACK', () => this.menu()]]);
    for (const record of records) {
      const label = document.createElement('h3');
      label.textContent = record?.kind === 'lift' ? 'The lift' : 'The face';
      this.panel.root.append(label); this.appendCrop(record);
    }
  }
  home() {
    const result = returnFromShortShorts(this);
    if (!result.ok) this.screen('Cannot travel', result.message || 'Travel was cancelled.', [['BACK', () => this.menu()]]);
  }
}
