import { PhonebookUI as PhonebookBaseUI } from './PhonebookBaseUI.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';

const isRecord=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
function captureContext(city,key) {
  const mission=gameState.currentMission;
  return {city,key,run:city._runToken,cityId:city.cityId,caseId:gameState.currentCaseId,
    campaignId:gameState._createdAt,missionId:mission?.id,legacyMissionId:mission?.missionId,
    sceneId:mission?.scene,notified:false};
}
function matchesContext(phone,context) {
  const city=phone.scene,mission=gameState.currentMission;
  return !phone._destroyed&&city===context.city&&!city._cleanupDone&&city.sys.isActive()&&
    city._runToken===context.run&&city.cityId===context.cityId&&String(city.getCaseKey())===context.key&&
    Object.is(gameState.currentCaseId,context.caseId)&&Object.is(gameState._createdAt,context.campaignId)&&
    Object.is(mission?.id,context.missionId)&&Object.is(mission?.missionId,context.legacyMissionId)&&
    Object.is(mission?.scene,context.sceneId);
}

export class PhonebookUI extends PhonebookBaseUI {
  finishCall(contact) {
    if (this._csiHandoffBusy) return false;
    if (contact?.key!=='csi'||!this.isCalling||this._callPhase!=='connected'||!this.canAccessPhone()) {
      return super.finishCall(contact);
    }
    const city=this.scene;
    if (city.sys.settings.key!=='CrimeCityScene') return super.finishCall(contact);
    const caseKey=city.getCaseKey();
    if ((typeof caseKey!=='string'&&typeof caseKey!=='number')||
        (typeof caseKey==='number'&&!Number.isFinite(caseKey))||!String(caseKey).trim()) {
      return super.finishCall(contact);
    }
    const key=String(caseKey);
    const gridState=gameState.suspectExclusionState?.[key];
    const gridInProgress=city.scene.isActive('SuspectGridScene')||city.scene.isPaused('SuspectGridScene')||city.scene.isSleeping('SuspectGridScene');
    const hypothesisInProgress=city.scene.isActive('HypothesisScene')||city.scene.isPaused('HypothesisScene')||city.scene.isSleeping('HypothesisScene');
    // Use the city's existing completion check instead of a second truthy-result test.
    if (!city.isCrimeLabCompleted()||hypothesisInProgress||city.isGridCompleted()||gridState?.finished===true||
        gridInProgress||city.hasVisitedApartment()||city.isTransitioning) return super.finishCall(contact);

    const callId=this._callId;
    let context=this._csiHandoffContext;
    if (!context||!matchesContext(this,context)||context.key!==key) {
      context=captureContext(city,key);
      this._csiHandoffContext=context;
    }
    const ownsCall=()=>!this._destroyed&&this._callId===callId&&this.isCalling&&this._callPhase==='connected';
    const cancelStaleCall=()=>{ if (ownsCall()) this.close(); return false; };
    this._csiHandoffBusy=true;
    try {
      const decisions=isRecord(gameState.suspectFilesPhoneDecisions)?gameState.suspectFilesPhoneDecisions:{};
      gameState.suspectFilesPhoneDecisions={...decisions,[key]:'answer'};
      // Keep prepared progress in memory on failure so a retry can save it unchanged.
      advanceCrimeTutorial(gameState,'phone_lab');
      if (!matchesContext(this,context)||!ownsCall()) return cancelStaleCall();
      if (saveGameState()!==true) throw new Error('CSI call progress could not be saved.');
      if (!matchesContext(this,context)||!ownsCall()) return cancelStaleCall();

      this.close();
      if (!matchesContext(this,context)) return false;
      city.closeAllUIPanels();
      if (!matchesContext(this,context)) return false;
      if (city.scene.isActive('PhoneCallScene')) city.scene.stop('PhoneCallScene');
      if (!matchesContext(this,context)) return false;
      if (!context.notified) {
        context.notified=true;
        try { EventBus.emit('crimeCityTutorialStep',{step:'phone_lab'}); }
        catch (error) { console.error('[PhonebookUI] CSI tutorial notification failed:',error); }
      }
      if (!matchesContext(this,context)) return false;
      const started=city.transitionTo('HypothesisScene',{
        cityId:context.cityId,caseKey,sourceScene:'CrimeCityScene',returnScene:'CrimeCityScene',
        returnData:{cityId:context.cityId,showSuspectTutorial:true}
      });
      if (started===false&&matchesContext(this,context)) city.showMessage?.('The reconstruction could not be opened. Call CSI again to retry.',4000,'ERROR');
      return started;
    } catch (error) {
      console.error('[PhonebookUI] CSI handoff failed:',error);
      if (matchesContext(this,context)) {
        if (ownsCall()) {
          this.stopCallAudio();
          this.isCalling=false;
          this.restoreEntryColors();
          this.restoreEntryInteractivity();
          this.setStatus('Could not save or open the reconstruction. Call CSI again to retry.');
        } else {
          city.showMessage?.('The reconstruction could not be opened. Call CSI again to retry.',4000,'ERROR');
        }
      } else if (ownsCall()) {
        this.close();
      }
      return false;
    } finally {
      this._csiHandoffBusy=false;
    }
  }
}
