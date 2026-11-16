import { gameState } from '../GameData.js';

import {
  readWorldReactions,
  worldOfficeText
} from '../systems/WorldReactionModel.js';

import {
  unsupersededWorldEvents
} from '../systems/AgencyOperationReactions.js';

const installed = new WeakMap();

function getAgencyBulletinMessages() {
  const history = readWorldReactions(gameState);

  const events = history.events.filter(event =>
    event.system === 'agency' &&
    String(event.campaignId) === String(gameState._createdAt)
  );

  return unsupersededWorldEvents(events)
    .slice()
    .sort(
      (a, b) =>
        (Number(b.createdAt) || 0) -
        (Number(a.createdAt) || 0)
    )
    .map(event => {
      const caseId = String(event.caseId ?? '');
      const cityName = String(event.cityName || '').trim();

      const subject = [
        'Office Bulletin',
        caseId ? `Case ${caseId}` : '',
        cityName
      ]
        .filter(Boolean)
        .join(' — ');

      const day = Number(event.day);

      return {
        id: `world_agency_bulletin:${event.id}`,

        from: 'Mark Agency // Internal Communications',

        subject,

        date: Number.isFinite(day) && day > 0
          ? `Day ${Math.floor(day)}`
          : 'Internal correspondence',

        category: 'memo',

        threadId: `world_agency:${caseId}`,

        worldEventId: event.id,

        body: worldOfficeText(event)
      };
    });
}

export function installAgencyWorldReactionMail(ui) {
  if (
    !ui ||
    ui.destroyed ||
    typeof ui.mail?.getMail !== 'function' ||
    !ui.scene?.events
  ) {
    return null;
  }

  const existing = installed.get(ui);

  if (existing) return existing;

  const mail = ui.mail;
  const originalGetMail = mail.getMail;
  const originalDestroy = ui.destroy;
  const sceneEvents = ui.scene.events;

  let dead = false;

  function wrappedGetMail(...args) {
    const originalMessages = originalGetMail.apply(this, args);

    if (dead || ui.destroyed) {
      return originalMessages;
    }

    const messages = Array.isArray(originalMessages)
      ? originalMessages
      : [];

    const bulletins = getAgencyBulletinMessages();

    const bulletinIds = new Set(
      bulletins.map(message => message.id)
    );

    return [
      ...bulletins,

      ...messages.filter(
        message => !bulletinIds.has(message.id)
      )
    ];
  }

  function wrappedDestroy(...args) {
    destroy();

    return originalDestroy.apply(this, args);
  }

  function destroy() {
    if (dead) return;

    dead = true;

    if (mail.getMail === wrappedGetMail) {
      mail.getMail = originalGetMail;
    }

    if (ui.destroy === wrappedDestroy) {
      ui.destroy = originalDestroy;
    }

    sceneEvents.off('shutdown', destroy);
    sceneEvents.off('destroy', destroy);

    installed.delete(ui);
  }

  mail.getMail = wrappedGetMail;

  if (typeof originalDestroy === 'function') {
    ui.destroy = wrappedDestroy;
  }

  const api = { destroy };

  installed.set(ui, api);

  sceneEvents.once('shutdown', destroy);
  sceneEvents.once('destroy', destroy);

  return api;
}