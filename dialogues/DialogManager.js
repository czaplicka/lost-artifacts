import { dialogueText as __dialogueText } from "./DialogueText.js";
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
    this.dialogUI.open({speaker:__dialogueText("dialogues/DialogManager.js", "t_57b8c27ea7eba9802798"),portraitKey:'portrait_holmes',lines},options);
  }
  isCurrentHolmesRequest(token) {
    return token===this.holmesRequest && this.dialogUI && !this.dialogUI.destroyed && this.dialogUI.isOpen;
  }
  resetText(value) {
    const date=new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return __dialogueText("dialogues/DialogManager.js", "t_eb29e4c46b8f65082d5c");
    return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date)+__dialogueText("dialogues/DialogManager.js", "t_de92d152d78269b791f8");
  }
  showHolmesFailure(reason) {
    const messages={
      login_required:[__dialogueText("dialogues/DialogManager.js", "t_8135ab3fd7eddc5a0572"),__dialogueText("dialogues/DialogManager.js", "t_03a20beab1ca77b9c20f")],
      registered_account_required:[__dialogueText("dialogues/DialogManager.js", "t_79a0fd087217e566c3fe"),__dialogueText("dialogues/DialogManager.js", "t_f85dd2269a6ce317ead2")],
      connection_error:[__dialogueText("dialogues/DialogManager.js", "t_0542395cb5eaf533c16a"),__dialogueText("dialogues/DialogManager.js", "t_68132fff316f998c3c1f")],
      migration_required:[__dialogueText("dialogues/DialogManager.js", "t_6b7776c84dcbcd63bded"),__dialogueText("dialogues/DialogManager.js", "t_56ca63b98d673f532d5c")],
      storage_unavailable:[__dialogueText("dialogues/DialogManager.js", "t_11202c0cf6d597d7aa4b"),__dialogueText("dialogues/DialogManager.js", "t_e391747781b91c96a268")],
      save_failed:[__dialogueText("dialogues/DialogManager.js", "t_3bbca05ad81352a65f87"),__dialogueText("dialogues/DialogManager.js", "t_30cc974506cbe8f915ba")],
      different_save:[__dialogueText("dialogues/DialogManager.js", "t_e737f934e9068129edfb"),__dialogueText("dialogues/DialogManager.js", "t_62701344cb75bf125253")],
      account_changed:[__dialogueText("dialogues/DialogManager.js", "t_e2fa72da20730ba9c6eb"),__dialogueText("dialogues/DialogManager.js", "t_3d2b041398170703b8cc")],
      no_active_save:[__dialogueText("dialogues/DialogManager.js", "t_0356906a728a69b63369"),__dialogueText("dialogues/DialogManager.js", "t_1c98f4e2d518a1aa47da")]
    };
    this.openHolmes(messages[reason] || [__dialogueText("dialogues/DialogManager.js", "t_63afa96df7ebff18f37c"),__dialogueText("dialogues/DialogManager.js", "t_25a51980df04c268431f")]);
  }
  async startHolmesDialog() {
    if (this.claimingHolmesHint) return;
    const token=++this.holmesRequest;
    this.openHolmes([__dialogueText("dialogues/DialogManager.js", "t_f5d20d13cd020db99010")]);
    const status=await holmesDailyHintService.getStatus();
    if (!this.isCurrentHolmesRequest(token)) return;
    if (!status.success) {this.showHolmesFailure(status.reason);return;}
    if (status.pendingDelivery) {
      this.openHolmes([__dialogueText("dialogues/DialogManager.js", "t_2d1c84837f6b35056f7b"),__dialogueText("dialogues/DialogManager.js", "t_2b7b18616466a9494e4c")],{
        choices:[
          {text:__dialogueText("dialogues/DialogManager.js", "t_acfdb92cdcfc1665c362"),callback:()=>{void this.claimHolmesHint(status.userId);}},
          {text:__dialogueText("dialogues/DialogManager.js", "t_095c9dd474d6ca229bb1"),callback:()=>{}}
        ]});return;
    }
    if (!status.available) {
      this.openHolmes([__dialogueText("dialogues/DialogManager.js", "t_f88cae585822019076db"),
        `${__dialogueText("dialogues/DialogManager.js", "t_1c085f06422ea7eb9af3")}${this.resetText(status.nextResetAt)}${__dialogueText("dialogues/DialogManager.js", "t_cdb4ee2aea69cc6a8333")}`,
        __dialogueText("dialogues/DialogManager.js", "t_32e0215e56e7d0de39a5")]);return;
    }
    this.openHolmes([__dialogueText("dialogues/DialogManager.js", "t_c25b3646ca4038263c29"),
      __dialogueText("dialogues/DialogManager.js", "t_4b21c2de993cb27c21fc"),
      __dialogueText("dialogues/DialogManager.js", "t_da170ed61d69f531772c")],{
      choices:[
        {text:__dialogueText("dialogues/DialogManager.js", "t_d438866b4b4bf2177e08"),callback:()=>{void this.claimHolmesHint(status.userId);}},
        {text:__dialogueText("dialogues/DialogManager.js", "t_095c9dd474d6ca229bb1"),callback:()=>{}}
      ]});
  }
  async claimHolmesHint(expectedUserId) {
    if (this.claimingHolmesHint) return;
    this.claimingHolmesHint=true;
    const token=++this.holmesRequest;
    this.openHolmes([__dialogueText("dialogues/DialogManager.js", "t_ea72c0591683f00b26f2")]);
    try {
      const result=await holmesDailyHintService.claim({expectedUserId});
      if (!this.isCurrentHolmesRequest(token)) return;
      if (result.success) {
        this.openHolmes([result.granted===1 ? __dialogueText("dialogues/DialogManager.js", "t_faa63e04e13275b9ee7e")
          : __dialogueText("dialogues/DialogManager.js", "t_3483fcea4dc8778fc66f"),
          __dialogueText("dialogues/DialogManager.js", "t_0b8a7a0ae85f166ec3b6"),
          __dialogueText("dialogues/DialogManager.js", "t_8f13ed05c87ae499a688")]);
      } else if (result.reason==='already_claimed') {
        this.openHolmes([__dialogueText("dialogues/DialogManager.js", "t_bbeb693aa74e5bcbe83f"),
          `${__dialogueText("dialogues/DialogManager.js", "t_1c085f06422ea7eb9af3")}${this.resetText(result.nextResetAt)}${__dialogueText("dialogues/DialogManager.js", "t_cdb4ee2aea69cc6a8333")}`]);
      } else {this.showHolmesFailure(result.reason);}
    } catch(error) {
      console.error('[Holmes] Consultation failed.',error);
      if (this.isCurrentHolmesRequest(token)) this.showHolmesFailure('connection_error');
    } finally {this.claimingHolmesHint=false;}
  }
}
