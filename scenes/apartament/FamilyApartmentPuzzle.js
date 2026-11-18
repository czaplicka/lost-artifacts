const KEY_ID = 'family_spare_box_key';

function requireSlot(objects, slotId) {
  const object = objects.find(entry => entry.layoutSlotId === slotId);

  if (!object) {
    throw new Error(`[FamilyApartmentPuzzle] Missing hotspot: ${slotId}`);
  }

  return object;
}

function setInspection(object, text) {
  object.description = text;
  object.inspectText = text;
  object.actionHint = '';
}

function setEmptyResult(object, text) {
  object.emptySearchText = text;
  object.afterSearchText = text;
}

function setClue(object, text) {
  setInspection(object, text);
  setEmptyResult(object, text);
}

export function prepareFamilyApartmentPuzzle(objects) {
  const fridge = requireSlot(objects, 'family_fridge_notes');
  const tin = requireSlot(objects, 'family_biscuit_tin');
  const games = requireSlot(objects, 'family_board_games');
  const star = requireSlot(objects, 'family_lunchbox_star');
  const fish = requireSlot(objects, 'family_lunchbox_fish');
  const leaf = requireSlot(objects, 'family_lunchbox_leaf');
  const box = requireSlot(objects, 'family_keepsake_box');
  const desk = requireSlot(objects, 'family_desk');

  const escapeLeads = new Map();

  for (const object of objects) {
    for (const item of object.unlocks || []) {
      if (item?.id && item.isEscapeClue === true) {
        escapeLeads.set(item.id, item);
      }
    }
  }

  if (!escapeLeads.size) {
    console.warn(
      '[FamilyApartmentPuzzle] No escape document; keeping normal hotspots.'
    );
    return;
  }

  // Preserve existing box contents and keep them available at the desk.
  const deskItems = new Map();

  for (const item of [...(desk.unlocks || []), ...(box.unlocks || [])]) {
    if (item?.id && !escapeLeads.has(item.id)) {
      deskItems.set(item.id, item);
    }
  }

  // Move the existing case documents, keeping their IDs and metadata.
  for (const object of objects) {
    object.unlocks = (object.unlocks || []).filter(
      item => !escapeLeads.has(item?.id)
    );
  }

  desk.unlocks = [...deskItems.values()];

  setClue(
    fridge,
    '“The spare key is in the usual place. Not the old usual place. ' +
    'We talked about this. Check the biscuit tin if you forgot again.”'
  );

  setClue(
    tin,
    'A note under the lid: “Key moved to the board games. ' +
    'Apparently biscuit tins are for biscuits.”'
  );

  setClue(
    games,
    '“The key is no longer in the games. It’s in the lunchbox ' +
    'with the animal on it. A star is not an animal, Dad.”'
  );

  setClue(
    star,
    'A napkin folded into a star. This household commits to a theme.'
  );

  setClue(
    leaf,
    'A note: “Please stop packing actual leaves as a joke.” No key.'
  );

  fish.discoveryAction = 'search';
  setInspection(
    fish,
    'A blue lunchbox with a yellow fish. Something rattles inside.'
  );
  fish.afterSearchText = 'The fish lunchbox is empty now.';
  fish.unlocks = [
    ...(fish.unlocks || []),
    {
      id: KEY_ID,
      type: 'key',
      label: 'Spare Box Key',
      description: 'A small brass key. Its tag reads: “Desk box. Not the front door.”',
      metadata: {
        useMessage: 'This key belongs to the wooden box on the desk.'
      }
    }
  ];

  box.state = 'locked';
  box.requiresItem = KEY_ID;
  box.consumeRequiredItem = false;
  box.discoveryAction = 'search';
  box.unlocks = [...escapeLeads.values()];
  box.afterSearchText = 'You’ve already taken the documents from the box.';

  setInspection(
    box,
    'A small wooden keepsake box with a brass lock. It needs a key.'
  );
}