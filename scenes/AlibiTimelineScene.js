// AlibiInterviewManager.js
// Tracks alibi-witness conversations per remaining suspect, collects timeline cards,
// and resolves "who is lying" once the player has talked to all 3 witnesses.
// Plugs into suspect.deductionState.alibiStatus (SuspectGenerator.js / suspectUtils.js /
// SuspectsScene.js) and into CrimeCityScene's encounter/textureKey system.

import { generateAlibiWitnesses } from './AlibiWitnessData.js';

const ALIBI_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  CONTRADICTED: 'contradicted',
  CONFIRMED: 'confirmed'
};

export class AlibiInterviewManager {
  /**
   * @param {Object} options
   * @param {string} options.caseSeed - stable seed for deterministic witness generation
   * @param {Array} options.suspects - remaining suspects (expects .id and .name)
   */
  constructor({ caseSeed, suspects }) {
    this.caseSeed = caseSeed;
    this.state = {}; // suspectId -> { witnesses, trueTimeline, boardCards, visited: Set, accusedLiar: null }

    suspects.forEach((suspect) => {
      const generated = generateAlibiWitnesses(suspect, caseSeed);
      this.state[suspect.id] = {
        suspect,
        witnesses: generated.witnesses,
        trueTimeline: generated.trueTimeline,
        boardCards: generated.boardCards,
        visitedNpcIds: new Set(),
        accusedLiar: null,
        collectedMotiveFragments: []
      };
    });
  }

  getWitnessesFor(suspectId) {
    const entry = this.state[suspectId];
    return entry ? entry.witnesses : [];
  }

  getWitness(suspectId, npcId) {
    const entry = this.state[suspectId];
    if (!entry) return null;
    return entry.witnesses.find((w) => w.npcId === npcId) || null;
  }

  /**
   * Builds CrimeCityScene-compatible encounter objects for every witness of the
   * given suspects, ready to be merged into the city's encounter list.
   * Shape matches what CrimeCityScene.getNpcTextureKey(encounter) expects:
   * { id, npcId, suspectId, locationId, textureKey, enabled }.
   *
   * @param {Array<string>} locationIds - one location id per witness, in the
   *   order witnesses were generated (assign real map locations here).
   */
  buildCityEncounters(suspectId, locationIds = []) {
    const entry = this.state[suspectId];
    if (!entry) return [];

    return entry.witnesses.map((witness, index) => ({
      id: `encounter_${witness.npcId}`,
      npcId: witness.npcId,
      suspectId: witness.suspectId,
      locationId: locationIds[index] || 'alibi_contact',
      textureKey: witness.textureKey,
      label: witness.role,
      enabled: true
    }));
  }

  /**
   * Convenience: builds encounters for ALL suspects currently tracked.
   * @param {Object} locationIdsBySuspect - { [suspectId]: string[] }
   */
  buildAllCityEncounters(locationIdsBySuspect = {}) {
    return Object.keys(this.state).flatMap((suspectId) =>
      this.buildCityEncounters(suspectId, locationIdsBySuspect[suspectId] || [])
    );
  }

  /**
   * Call this after a dialogue with an alibi witness completes.
   * Returns the dialogue payload (statement, hint, timeline card, motive fragment,
   * portrait/texture key) to feed into DialogManager / MonologueManager.
   */
  talkToWitness(suspectId, npcId) {
    const entry = this.state[suspectId];
    if (!entry) return null;

    const witness = entry.witnesses.find((w) => w.npcId === npcId);
    if (!witness) return null;

    entry.visitedNpcIds.add(npcId);
    if (witness.motiveFragment) {
      entry.collectedMotiveFragments.push(witness.motiveFragment);
    }

    return {
      suspectId,
      npcId,
      role: witness.role,
      tone: witness.tone,
      textureKey: witness.textureKey,
      statement: witness.statement,
      contradictionHint: witness.contradictionHint,
      timelineCard: witness.timelineCard,
      allWitnessesVisited: this.allWitnessesVisited(suspectId)
    };
  }

  allWitnessesVisited(suspectId) {
    const entry = this.state[suspectId];
    if (!entry) return false;
    return entry.witnesses.every((w) => entry.visitedNpcIds.has(w.npcId));
  }

  /**
   * Player's guess at which witness is lying, unlocked once all 3 are visited.
   * Returns { correct, message } and updates alibiStatus accordingly.
   */
  accuseLiar(suspectId, npcId) {
    const entry = this.state[suspectId];
    if (!entry || !this.allWitnessesVisited(suspectId)) {
      return { correct: false, message: 'Talk to all three witnesses first.' };
    }

    const witness = entry.witnesses.find((w) => w.npcId === npcId);
    if (!witness) return { correct: false, message: 'Unknown witness.' };

    entry.accusedLiar = npcId;
    const correct = witness.isLiar;

    return {
      correct,
      message: correct
        ? `Got it. ${witness.role} was lying — their story never matched the timeline.`
        : `${witness.role} was telling the truth. The liar is still out there.`,
      nextStatus: correct ? ALIBI_STATUS.IN_PROGRESS : ALIBI_STATUS.PENDING
    };
  }

  /**
   * Cards available for the Timeline Reconstruction mini-game board (true + decoys).
   */
  getBoardCards(suspectId) {
    const entry = this.state[suspectId];
    return entry ? entry.boardCards : [];
  }

  getTrueTimeline(suspectId) {
    const entry = this.state[suspectId];
    return entry ? entry.trueTimeline : [];
  }

  getMotiveFragments(suspectId) {
    const entry = this.state[suspectId];
    return entry ? entry.collectedMotiveFragments : [];
  }

  /**
   * Call after the player wins the Timeline Reconstruction mini-game (see
   * AlibiTimelineScene.js). Returns the alibiStatus value to write back onto
   * suspect.deductionState.alibiStatus.
   */
  resolveTimelineSuccess(suspectId) {
    const entry = this.state[suspectId];
    if (!entry) return ALIBI_STATUS.PENDING;
    if (entry.accusedLiar === null) return ALIBI_STATUS.PENDING;

    const liarConfirmed = entry.witnesses.find((w) => w.npcId === entry.accusedLiar)?.isLiar;
    return liarConfirmed ? ALIBI_STATUS.CONTRADICTED : ALIBI_STATUS.PENDING;
  }
}

export const AlibiStatus = ALIBI_STATUS;