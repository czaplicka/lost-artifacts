import { gameState } from '../../GameData.js';
import { piInventoryManager } from '../../managers/PIInventoryManager.js';
import { getCurrentTownId, canStartRoadTrip } from '../../managers/RoadTripManager.js';
import { openShortShortsTrip } from '../../managers/ShortShortsTravel.js';
import { readShortShorts, dispatchShortShorts } from '../../managers/ShortShortsService.js';
import { SHORT_SHORTS_CONFIG as CONFIG } from '../../config/ShortShortsConfig.js';

const ID = CONFIG.caseId, MAIL = 'short_shorts_kolpon_briefing', REPLY = 'short_shorts_kolpon_reply';
const quest = () => gameState.piQuests?.quests?.[ID];
const done = () => quest()?.rewardSettlement?.completed === true;
export function installShortShortsComputer(ui, documents) {
  const oldMail = documents.getMail, oldRender = documents.render, oldPaged = documents.renderPagedText;
  let destroyed = false, launching = false;
  const alive = () => !destroyed && !ui.destroyed && ui.isOpen && !ui.suspended;
  const state = () => (quest() ? readShortShorts() : null);
  const viewing = () => ui.app === 'mail' && ui.selectedId === MAIL && !!quest();
  const viewingReply = () => ui.app === 'mail' && ui.selectedId === REPLY && ['reply', 'closed'].includes(state()?.stage);
  const canTravel = () => viewing() && !done() && ['briefing', 'travel', 'observation', 'report'].includes(state()?.stage) && ['active', 'settling'].includes(quest()?.status);
  const canClose = () => viewingReply() && ['active', 'settling'].includes(quest()?.status) && !done();
  const getMail = function (...args) {
    const messages = (oldMail.apply(this, args) || []).filter(m => ![MAIL, REPLY].includes(m.id));
    if (!quest()) return messages;
    const s = state();
    const brief = { id: MAIL, from: 'Ray Kolpon', date: 'Case correspondence', subject: 'Who Wears Short Shorts? — Upper Downington',
      body: 'Detective,\n\nClaimant #4 is Gus Pellegrino. His paperwork says he cannot lift a fork. His neighbours say he lifts refrigerators. For cardio.\n\n' +
        'I need two photographs from the SAME lift: the refrigerator in the air, and his face while he is carrying it. One without the other proves nothing.\n\n' +
        'LOCATION: Upper Downington. It is cold. Gus does not appear to mind.\n\nBring your camera and enough cash for fuel. Agreed fee: $200.\n\nRay Kolpon\nKolpon & Sons Adjustments' };
    if (!['reply', 'closed'].includes(s?.stage)) return [brief, ...messages];
    const deliver = s.ending === 'deliver';
    return [{ id: REPLY, from: 'Ray Kolpon', date: 'Reply received',
      subject: deliver ? 'Who Wears Short Shorts? — Exhibit B' : 'Who Wears Short Shorts? — Inconclusive',
      body: deliver
        ? 'Detective,\n\nThe refrigerator. The face. The shorts. In snow.\n\nGus’s claim will be reviewed, and he will be offered a medically supervised return to forks. The shorts are now Exhibit B.\n\nKolpon'
        : 'Detective,\n\nInconclusive. I see. A man, a refrigerator and your professional discretion.\n\nI will pay half, and I will pretend I do not notice that Gus’s family has sent you a fruit basket the size of a refrigerator.\n\nKolpon' + (done() ? '' : '\n\nAcknowledge this reply to close the case and collect your fee.') },
      brief, ...messages];
  };
  const paged = function (body, x, y, w, h) { return oldPaged.call(this, body, x, y, w, Math.max(40, h - ((canTravel() || canClose()) ? 64 : 0))); };
  async function launch() {
    if (!alive() || launching || !canTravel()) return;
    if (!piInventoryManager.hasItem('camera')) { ui.notice = 'Bring your camera from the Spy Shop.'; ui.render(); return; }
    const here = getCurrentTownId();
    if (here !== CONFIG.townId) { const check = canStartRoadTrip(here, CONFIG.townId, { mode: 'pi' }); if (!check.ok) { ui.notice = check.message; ui.render(); return; } }
    if (state()?.stage === 'briefing') { const r = dispatchShortShorts({ type: 'READ_BRIEFING' }); if (!r.ok) { ui.notice = r.reason; ui.render(); return; } }
    launching = true; ui.notice = 'Preparing your journey...'; ui.render();
    try {
      const result = await openShortShortsTrip(ui);
      if (!result.ok && !ui.destroyed) ui.notice = result.message;
    } catch (error) { console.error('[ShortShortsComputer]', error); if (!ui.destroyed) ui.notice = 'Could not start the journey. Check the console.'; }
    finally { launching = false; if (alive()) ui.render(); }
  }
  const render = function (...args) {
    const result = oldRender.apply(this, args), b = ui.window;
    if (b && canTravel()) {
      const here = getCurrentTownId();
      const check = here === CONFIG.townId ? null : canStartRoadTrip(here, CONFIG.townId, { mode: 'pi' });
      const label = launching ? 'OPENING...' : here === CONFIG.townId ? 'VISIT UPPER DOWNINGTON' : 'DRIVE TO UPPER DOWNINGTON' + (check?.ok ? ' — $' + check.quote.fuelCost : '');
      ui.drawing.button(b.x + 312, b.y + b.h - 108, label, () => void launch(), !launching && !ui.accepting);
    }
    if (b && canClose()) ui.drawing.button(b.x + 312, b.y + b.h - 108, 'ACKNOWLEDGE AND CLOSE CASE', () => {
      const r = dispatchShortShorts({ type: 'READ_REPLY' });
      ui.notice = r.ok ? (r.warning || r.settlement?.message || 'Case closed.') : r.reason;
      ui.render();
    });
    return result;
  };
  documents.getMail = getMail; documents.render = render; documents.renderPagedText = paged;
  const destroy = () => {
    destroyed = true;
    if (documents.getMail === getMail) documents.getMail = oldMail;
    if (documents.render === render) documents.render = oldRender;
    if (documents.renderPagedText === paged) documents.renderPagedText = oldPaged;
    ui.scene.events.off('shutdown', destroy);
  };
  ui.scene.events.once('shutdown', destroy);
  return { destroy };
}
