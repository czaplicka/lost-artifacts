import { DialogManager as DialogManagerBase } from './DialogManagerBase.js';
import { holmesDailyHintService } from '../managers/HolmesDailyHintService.js';

export class DialogManager extends DialogManagerBase {
  constructor(scene,gameState) {
    super(scene,gameState);
    this.holmesRequest=0;
    this.claimingHolmesHint=false;
  }
  discoverContactKeys() {return [...new Set([...super.discoverContactKeys(),'holmes'])];}
  hasContact(key) {return key==='holmes' || super.hasContact(key);}
  startDialog(key,contact) {
    this.holmesRequest++;
    if (key==='holmes') return this.startHolmesDialog();
    return super.startDialog(key,contact);
  }
  openHolmes(lines,options={}) {
    if (!this.dialogUI || this.dialogUI.destroyed) return;
    this.dialogUI.open({speaker:'Insp. Holmes',portraitKey:'portrait_holmes',lines},options);
  }
  isCurrentHolmesRequest(token) {
    return token===this.holmesRequest && this.dialogUI && !this.dialogUI.destroyed && this.dialogUI.isOpen;
  }
  resetText(value) {
    const date=new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return 'the next midnight UTC';
    return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date)+' UTC';
  }
  showHolmesFailure(reason) {
    const messages={
      login_required:['Daily free hints are for signed-in players.','Sign in to your game account, then call me again.'],
      registered_account_required:['This consultation requires a registered account.','A guest or anonymous Supabase session is not eligible.'],
      connection_error:['I cannot reach the consultation register.','Check your internet connection and call again. If a delivery was interrupted, the same request will be retried.'],
      migration_required:['My new consultation register has not been installed yet.','The game administrator needs to run the Holmes delivery v2 SQL migration.'],
      storage_unavailable:['I cannot safely record the pending hint delivery on this device.','Allow local storage and try again. The daily limit itself is stored on the server.'],
      save_failed:['The hint delivery could not be saved safely.','Check that the game can save, then call me again to retry any pending delivery.'],
      different_save:['An unfinished hint delivery belongs to a different campaign.','Load the campaign in which you started collecting it, then call me again.'],
      account_changed:['The signed-in account changed during the consultation.','No hint will be delivered to the other account. Sign back into the original account to resume.'],
      no_active_save:['Start or load a game before collecting the hint.','I need a campaign to attach the delivery to. Even generosity needs a file number.']
    };
    this.openHolmes(messages[reason] || ['The consultation could not be completed safely.','Please try again. No extra hint will be issued without server confirmation.']);
  }
  async startHolmesDialog() {
    if (this.claimingHolmesHint) return;
    const token=++this.holmesRequest;
    this.openHolmes(['Checking the consultation register. Watson has promised not to alphabetise the internet again.']);
    const status=await holmesDailyHintService.getStatus();
    if (!this.isCurrentHolmesRequest(token)) return;
    if (!status.success) {this.showHolmesFailure(status.reason);return;}
    if (status.pendingDelivery) {
      this.openHolmes(['There is an unfinished hint delivery for this account.','Shall we resume it? No second daily reward will be created.'],{
        choices:[
          {text:'RESUME DELIVERY',callback:()=>{void this.claimHolmesHint(status.userId);}},
          {text:'NOT NOW',callback:()=>{}}
        ]});return;
    }
    if (!status.available) {
      this.openHolmes(['Today’s free hint has already been collected on this account.',
        `The next offer starts at ${this.resetText(status.nextResetAt)}.`,
        'Changing devices will not change my appointment book. Watson has tested that too.']);return;
    }
    this.openHolmes(['One complimentary hint per real-world day, for your signed-in account.',
      'Would you like one free hint added to this game’s hint pool?',
      'The register uses server time. The daily reset is midnight UTC.'],{
      choices:[
        {text:'CLAIM TODAY’S FREE HINT',callback:()=>{void this.claimHolmesHint(status.userId);}},
        {text:'NOT NOW',callback:()=>{}}
      ]});
  }
  async claimHolmesHint(expectedUserId) {
    if (this.claimingHolmesHint) return;
    this.claimingHolmesHint=true;
    const token=++this.holmesRequest;
    this.openHolmes(['Recording your hint delivery. Please hold. The violin is optional.']);
    try {
      const result=await holmesDailyHintService.claim({expectedUserId});
      if (!this.isCurrentHolmesRequest(token)) return;
      if (result.success) {
        this.openHolmes([result.granted===1 ? 'One free hint has been added to this game’s hint pool.'
          : 'Your earlier hint delivery is already recorded in this save. No duplicate was added.',
          'Use the existing free-hint option when you need assistance.',
          'Elementary. Unlike the paperwork.']);
      } else if (result.reason==='already_claimed') {
        this.openHolmes(['Today’s hint was already collected on this account.',
          `The next offer starts at ${this.resetText(result.nextResetAt)}.`]);
      } else {this.showHolmesFailure(result.reason);}
    } catch(error) {
      console.error('[Holmes] Consultation failed.',error);
      if (this.isCurrentHolmesRequest(token)) this.showHolmesFailure('connection_error');
    } finally {this.claimingHolmesHint=false;}
  }
}
