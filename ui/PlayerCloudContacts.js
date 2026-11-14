import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';

import {
  notebookContact
} from './pi-computer/NotebookContactActions.js';

// OFFICE_NOTEBOOK_MANUAL_OPEN_V1

function canOpenComputerFromNotes(ui) {
  const scene = ui.scene;

  return Boolean(
    !ui.destroyed &&
    !ui.suspended &&
    !scene.disposed &&
    !scene.navigating &&
    !scene.debugMode &&
    scene.sys?.isActive() &&
    typeof scene.canUseOffice === 'function' &&
    scene.canUseOffice()
  );
}

function ensureComputerOpen(ui) {
  if (ui.destroyed || ui.suspended || ui.booting) {
    return false;
  }

  if (ui.isOpen) return true;
  if (!canOpenComputerFromNotes(ui)) return false;

  const hadOption = Object.prototype.hasOwnProperty.call(
    ui.options,
    'skipBoot'
  );

  const previous = ui.options.skipBoot;

  try {
    ui.options.skipBoot = true;
    ui.open();

    return Boolean(
      ui.isOpen &&
      !ui.suspended &&
      !ui.destroyed &&
      !ui.booting
    );
  } finally {
    if (hadOption) {
      ui.options.skipBoot = previous;
    } else {
      delete ui.options.skipBoot;
    }
  }
}

export async function useCloudKeyword(
  ui,
  definition,
  keyword
) {
  if (
    ui.destroyed ||
    ui.suspended ||
    ui.booting ||
    !definition ||
    !keyword
  ) {
    return;
  }

  const known =
    gameState.piKeywordSearch?.cases?.[definition.id]
      ?.known || [];

  if (!known.includes(keyword.id)) return;

  const length = Number(
    ui.scene.cache.json.get('piPhoneDirectory')
      ?.numberLength
  ) || 3;

  const contact = notebookContact(
    keyword,
    length
  );

  // Only an explicit USE WORDS action opens an application.
  // Organising or opening the notebook does not.
  if (!contact) {
    if (!ensureComputerOpen(ui)) return;

    if (ui.app !== 'search') {
      ui.openApp('search');
    }

    if (ui.search.definition?.id !== definition.id) {
      ui.search.selectCase(definition.id);
    }

    ui.search.selectKeyword(keyword.id);
    return;
  }

  if (contact.kind === 'email') {
    if (!ensureComputerOpen(ui)) return;

    const mail = ui.photoQuest?.contactMail;

    if (!mail) return;

    if (ui.app === 'mail' && mail.composing) {
      ui.search.selectCase(definition.id);
      ui.search.selectKeyword(keyword.id);
      return;
    }

    ui.openApp('mail');
    ui.search.selectCase(definition.id);

    const opening = mail.openComposer();
    const token = ui.viewToken;

    await opening;

    if (
      ui.destroyed ||
      !ui.isOpen ||
      ui.suspended ||
      ui.app !== 'mail' ||
      !mail.composing ||
      ui.viewToken !== token
    ) {
      return;
    }

    ui.search.selectKeyword(keyword.id);
    return;
  }

  const scene = ui.scene;
  const phone = scene.phoneUI;

  if (
    !phone ||
    phone.destroyed ||
    typeof scene.openPhone !== 'function'
  ) {
    if (ui.isOpen) {
      ui.notice = __dialogueText("ui/PlayerCloudContacts.js", "t_3ea333989221dd184e10");
      ui.render();
    } else {
      scene.showFeedback?.(
        __dialogueText("ui/PlayerCloudContacts.js", "t_3ea333989221dd184e10")
      );
    }

    return;
  }

  if (
    scene.navigating ||
    scene.disposed ||
    scene.debugMode ||
    !scene.sys?.isActive()
  ) {
    return;
  }

  if (ui.isOpen) {
    ui.close();
  }

  scene.openPhone();

  if (!phone.isOpen || phone.destroyed) return;

  const run = phone.run;

  await phone.investigation?.load();

  if (
    phone.destroyed ||
    !phone.isOpen ||
    phone.run !== run ||
    phone.state !== 'on_hook'
  ) {
    return;
  }

  const target = phone.contacts.find(
    item => String(item.number) === contact.value
  ) || {
    number: contact.value,
    name: keyword.contactName || keyword.label
  };

  phone.pickContact(target);
  phone.pickUp();

  if (phone.state !== 'ready') return;

  phone.number = contact.value;
  phone.startCall();
}
