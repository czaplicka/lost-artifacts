import { dialogueText as __dialogueText } from './DialogueText.js';
import { DialogManager as DialogManagerBase } from './DialogManagerBase.js';
import { getHQGuidance } from './HQGuidance.js';
import { holmesDailyHintService } from '../managers/HolmesDailyHintService.js';

const t = id => __dialogueText('dialogues/DialogManager.js', id);

export class DialogManager extends DialogManagerBase {
  constructor(scene, gameState) {
    super(scene, gameState);
    this.holmesRequest = 0;
    this.claimingHolmesHint = false;
  }

  discoverContactKeys() {
    return [...new Set([...super.discoverContactKeys(), 'holmes', 'hq'])];
  }

  hasContact(key) {
    return key === 'hq' || key === 'holmes' || super.hasContact(key);
  }

  startDialog(key, contact) {
    this.holmesRequest++;
    if (key === 'hq') return this.startHQDialog();
    if (key === 'holmes') return this.startHolmesDialog();
    return super.startDialog(key, contact);
  }

  startHQDialog() {
    if (!this.dialogUI || this.dialogUI.destroyed) return;
    const guidance = getHQGuidance(this.gameState);
    this.dialogUI.open({ speaker: 'HQ', portraitKey: 'portrait_hq', lines: guidance.lines });
  }

  openHolmes(lines, options = {}) {
    if (!this.dialogUI || this.dialogUI.destroyed) return;
    this.dialogUI.open({
      speaker: t('t_57b8c27ea7eba9802798'),
      portraitKey: 'portrait_holmes',
      lines
    }, options);
  }

  isCurrentHolmesRequest(token) {
    return token === this.holmesRequest && this.dialogUI &&
      !this.dialogUI.destroyed && this.dialogUI.isOpen;
  }

  // Wynik sieciowy może nadejść od razu. Zatrzymujemy go do chwili,
  // gdy gracz sam zakończy czytanie aktualnej kwestii.
  beginHolmesReadGate(token, lines) {
    const ui = this.dialogUI;
    let acknowledged = false;
    let pending = null;
    let openingSession = null;
    let delivered = false;

    const valid = () => {
      if (!ui || ui.destroyed || this.dialogUI !== ui || token !== this.holmesRequest) return false;
      if (Number.isFinite(openingSession) && Number.isFinite(ui.session)) {
        const expected = openingSession + (acknowledged ? 1 : 0);
        if (ui.session !== expected) return false;
      }
      return true;
    };

    const flush = () => {
      if (delivered || !acknowledged || !pending || !valid()) return;
      const callback = pending;
      pending = null;
      delivered = true;
      callback();
    };

    this.openHolmes(lines, {
      onClose: () => {
        acknowledged = true;
        flush();
      }
    });
    openingSession = ui?.session ?? null;

    return callback => {
      if (delivered || !valid()) return;
      pending = callback;
      flush();
    };
  }

  resetText(value) {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return t('t_eb29e4c46b8f65082d5c');
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'
    }).format(date) + t('t_de92d152d78269b791f8');
  }

  showHolmesFailure(reason) {
    const messages = {
      login_required: ['t_8135ab3fd7eddc5a0572', 't_03a20beab1ca77b9c20f'],
      registered_account_required: ['t_79a0fd087217e566c3fe', 't_f85dd2269a6ce317ead2'],
      connection_error: ['t_0542395cb5eaf533c16a', 't_68132fff316f998c3c1f'],
      migration_required: ['t_6b7776c84dcbcd63bded', 't_56ca63b98d673f532d5c'],
      storage_unavailable: ['t_11202c0cf6d597d7aa4b', 't_e391747781b91c96a268'],
      save_failed: ['t_3bbca05ad81352a65f87', 't_30cc974506cbe8f915ba'],
      different_save: ['t_e737f934e9068129edfb', 't_62701344cb75bf125253'],
      account_changed: ['t_e2fa72da20730ba9c6eb', 't_3d2b041398170703b8cc'],
      no_active_save: ['t_0356906a728a69b63369', 't_1c98f4e2d518a1aa47da']
    };
    this.openHolmes((messages[reason] || [
      't_63afa96df7ebff18f37c', 't_25a51980df04c268431f'
    ]).map(t));
  }

  async startHolmesDialog() {
    if (this.claimingHolmesHint || !this.dialogUI || this.dialogUI.destroyed) return;
    const token = ++this.holmesRequest;
    const deliver = this.beginHolmesReadGate(token, [t('t_f5d20d13cd020db99010')]);
    try {
      const status = await holmesDailyHintService.getStatus();
      deliver(() => this.showHolmesStatus(status));
    } catch (error) {
      console.error('[Holmes] Status check failed.', error);
      deliver(() => this.showHolmesFailure('connection_error'));
    }
  }

  showHolmesStatus(status) {
    if (!status?.success) {
      this.showHolmesFailure(status?.reason || 'connection_error');
      return;
    }
    if (status.pendingDelivery) {
      this.openHolmes([
        t('t_2d1c84837f6b35056f7b'), t('t_2b7b18616466a9494e4c')
      ], {
        choices: [
          {
            text: t('t_acfdb92cdcfc1665c362'),
            callback: () => { void this.claimHolmesHint(status.userId); }
          },
          { text: t('t_095c9dd474d6ca229bb1'), callback: () => {} }
        ]
      });
      return;
    }
    if (!status.available) {
      this.openHolmes([
        t('t_f88cae585822019076db'),
        `${t('t_1c085f06422ea7eb9af3')}${this.resetText(status.nextResetAt)}${t('t_cdb4ee2aea69cc6a8333')}`,
        t('t_32e0215e56e7d0de39a5')
      ]);
      return;
    }
    this.openHolmes([
      t('t_c25b3646ca4038263c29'),
      t('t_4b21c2de993cb27c21fc'),
      t('t_da170ed61d69f531772c')
    ], {
      choices: [
        {
          text: t('t_d438866b4b4bf2177e08'),
          callback: () => { void this.claimHolmesHint(status.userId); }
        },
        { text: t('t_095c9dd474d6ca229bb1'), callback: () => {} }
      ]
    });
  }

  async claimHolmesHint(expectedUserId) {
    if (this.claimingHolmesHint || !this.dialogUI || this.dialogUI.destroyed) return;
    this.claimingHolmesHint = true;
    const token = ++this.holmesRequest;
    const deliver = this.beginHolmesReadGate(token, [t('t_ea72c0591683f00b26f2')]);
    try {
      const result = await holmesDailyHintService.claim({ expectedUserId });
      deliver(() => this.showHolmesClaimResult(result));
    } catch (error) {
      console.error('[Holmes] Consultation failed.', error);
      deliver(() => this.showHolmesFailure('connection_error'));
    } finally {
      this.claimingHolmesHint = false;
    }
  }

  showHolmesClaimResult(result) {
    if (result?.success) {
      this.openHolmes([
        result.granted === 1 ? t('t_faa63e04e13275b9ee7e') : t('t_3483fcea4dc8778fc66f'),
        t('t_0b8a7a0ae85f166ec3b6'),
        t('t_8f13ed05c87ae499a688')
      ]);
    } else if (result?.reason === 'already_claimed') {
      this.openHolmes([
        t('t_bbeb693aa74e5bcbe83f'),
        `${t('t_1c085f06422ea7eb9af3')}${this.resetText(result.nextResetAt)}${t('t_cdb4ee2aea69cc6a8333')}`
      ]);
    } else {
      this.showHolmesFailure(result?.reason || 'connection_error');
    }
  }
}