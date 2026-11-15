import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { generateCaseCityState } from '../../city-encounter-generator.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { addSessionScore } from '../../managers/InvestigationManager.js';
import { getPursuitCityContext } from '../../managers/PursuitCityContext.js';
import { getForgerAccess } from '../../systems/ForgerObservation.js';
import { ForgerObservationUI } from '../../ui/ForgerObservationUI.js';
import { queueLocationIcons, createLocationIcon, getLocationLabel } from '../../locationIcons.js';

const MAP_ICON_SIZE = 132;
const MAP_ICON_HOVER = 1.1;

export class CityEncounters {
  ensureCityEncounterState(locations) {
    const existing = gameState.cityEncounterState || {};
    if (Array.isArray(existing[this.cityId])) return;
    const caseId = gameState.currentMission?.id || gameState.currentMission?.caseId || gameState.currentArtifact || `${this.cityId}-default`;
    const generated = generateCaseCityState(locations, String(caseId), {});
    gameState.cityEncounterState = {...generated, ...existing};
    if (!Array.isArray(gameState.cityEncounterState[this.cityId])) gameState.cityEncounterState[this.cityId] = generated[this.cityId] || [];
  }
  ensureHarborEncounter() {
    const encounters = gameState.cityEncounterState?.[this.cityId];
    if (!Array.isArray(encounters)) return;
    const configured = Number(this.city?.encounterRules?.count ?? 3);
    const count = Number.isFinite(configured) ? Math.max(0, Math.floor(configured)) : 3;
    let excess = encounters.filter(e => e && typeof e === 'object' && e.enabled !== false).length - count;
    if (excess <= 0) return;
    const next = encounters.filter(e => {
      const legacyExtra = e && e.enabled !== false && e.slotId === 'harbor_extra' && e.npcId === 'sailor' && e.locationId === 'harbor';
      if (excess > 0 && legacyExtra) { excess--; return false; }
      return true;
    });
    if (next.length === encounters.length) return;
    gameState.cityEncounterState = {...gameState.cityEncounterState, [this.cityId]:next};
    saveGameState();
  }
  getEncounters() {
    const list = gameState.cityEncounterState?.[this.cityId];
    const base = Array.isArray(list) ? list.filter(e => e && typeof e === 'object' && e.enabled !== false) : [];
    const places = Object.values(this.city?.cityPlaces || {}).filter(p => p && p.enabled !== false).map(p => ({
      id:`city_place:${this.cityId}:${p.id}`, placeId:p.id, cityPlace:true,
      cityId:this.cityId, locationId:p.id, npcId:p.npcId || null, name:p.name,
      cityX:this.scale.width * Number(p.x) / 100, cityY:this.scale.height * Number(p.y) / 100, enabled:true
    }));
    return [...base, ...places];
  }
  isEncounterVisited(id) { return gameState.hasEncounter(id); }
  getEncounterMemory(id) {
    if (!id) return null;
    const m = gameState.encounterMemory;
    return m && typeof m === 'object' && !Array.isArray(m) ? m[id] || null : null;
  }
  getEncounterStatus(e) {
    const isVisited = this.isEncounterVisited(e.id), memory = this.getEncounterMemory(e.id);
    return {isVisited, memory, hasMemory:Boolean(memory), isRepeat:isVisited || Boolean(memory)};
  }
  createEncounters() {
    this.destroyEncounterViews();
    queueLocationIcons(this);
    for (const encounter of this.getEncounters()) this.createEncounterView(encounter);
    this.createForgerObservationButton();
    if (!this.load.isLoading()) this.load.start();
  }
  createForgerObservationButton() {
    this.forgerObservationButton?.destroy(true);
    this.forgerObservationButton = null;
    const access = getForgerAccess(this.cityId);
    if (!access.available) return;
    const root = this.add.container(this.scale.width - 220, 155).setDepth(8);
    const bg = this.add.rectangle(0, 0, 380, 64, 0x34251a).setStrokeStyle(2, 0xd4af37).setInteractive({useHandCursor:true});
    const label = this.add.text(0, 0, access.completed ? __dialogueText('scenes/city/CityEncounters.js', 't_c1abec826396059421c5') : __dialogueText('scenes/city/CityEncounters.js', 't_159b45db787832bbdafa'), {
      fontFamily:'SpecialElite', fontSize:'22px', color:'#ffe0a3', align:'center', wordWrap:{width:350}
    }).setOrigin(.5);
    root.add([bg, label]);
    bg.on('pointerover', () => bg.setFillStyle(0x5c4229));
    bg.on('pointerout', () => bg.setFillStyle(0x34251a));
    bg.on('pointerdown', () => {
      if (!this.canStartInteraction()) return;
      const current = getForgerAccess(this.cityId);
      if (!current.available) return;
      const observation = new ForgerObservationUI(this);
      if (current.completed) observation.page = 'notes';
      observation.open();
    });
    this.forgerObservationButton = root;
    this.forgerObservationButtonLabel = label;
  }
  createEncounterView(encounter) {
    let view = null;
    const icon = createLocationIcon(this, encounter.cityX, encounter.cityY, encounter.locationId, this.city, encounter.npcId, MAP_ICON_SIZE, image => {
      if (!view || !image.active) return;
      view.baseScale = image.scaleX;
      this.updateEncounterView(view);
    }).setDepth(3).setInteractive({useHandCursor:true});
    const label = encounter.name || getLocationLabel(encounter.locationId, this.city, encounter.npcId);
    const nameLabel = this.add.text(0, 0, label, {
      fontFamily:'SpecialElite', fontSize:'20px', color:'#ffffff', backgroundColor:'#000000bb',
      padding:{left:8, right:8, top:4, bottom:4}, align:'center', wordWrap:{width:220}
    }).setOrigin(.5, 0).setDepth(4);
    const statusLabel = this.add.text(0, 0, '', {
      fontFamily:'SpecialElite', fontSize:'15px', color:'#f1e6b8', backgroundColor:'#000000cc', padding:{left:6, right:6, top:3, bottom:3}
    }).setOrigin(.5, 1).setDepth(4).setVisible(false);
    view = {encounter, icon, nameLabel, statusLabel, hovered:false, baseScale:icon.scaleX};
    icon.on('pointerover', () => { if (!this.canStartInteraction()) return; view.hovered = true; this.updateEncounterView(view); });
    icon.on('pointerout', () => { view.hovered = false; this.updateEncounterView(view); });
    icon.on('pointerdown', pointer => {
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      this.visitEncounter(encounter);
    });
    this.encounterViews.push(view);
    this.interactiveObjects.push(icon);
    this.updateEncounterView(view);
  }
  updateEncounterView(view) {
    if (!view.icon?.active) return;
    const {isVisited, memory, hasMemory} = this.getEncounterStatus(view.encounter);
    const custom = view.encounter.cityPlace;
    view.icon.setScale(view.baseScale * (view.hovered ? MAP_ICON_HOVER : 1))
      .setAlpha(isVisited ? (view.hovered ? .88 : .72) : 1).setTint(isVisited ? 0xc8c8c8 : 0xffffff);
    const hw = view.icon.displayWidth / 2, hh = view.icon.displayHeight / 2;
    const minX = hw + 12, maxX = this.scale.width - hw - 12, minY = hh + 115, maxY = this.scale.height - hh - 125;
    view.icon.setPosition(
      Phaser.Math.Clamp(Number(view.encounter.cityX) || this.scale.width / 2, Math.min(minX, maxX), Math.max(minX, maxX)),
      Phaser.Math.Clamp(Number(view.encounter.cityY) || this.scale.height / 2, Math.min(minY, maxY), Math.max(minY, maxY))
    );
    view.nameLabel.setPosition(view.icon.x, view.icon.y + hh + 10)
      .setColor(view.hovered ? (isVisited ? '#f1e6b8' : '#ffe066') : (isVisited ? '#d0d0d0' : '#ffffff'));
    view.statusLabel.setPosition(view.icon.x, view.icon.y - hh - 8).setVisible(isVisited);
    if (isVisited) view.statusLabel.setText(custom && !view.encounter.npcId
      ? __dialogueText('scenes/city/CityEncounters.js', 't_ec1e62325e1c2397750b')
      : hasMemory && memory.reminderShown === false
        ? __dialogueText('scenes/city/CityEncounters.js', 't_e4eac23338826cd2de9c')
        : __dialogueText('scenes/city/CityEncounters.js', 't_35bd0d3c226beaa1065e'));
  }
  refreshEncounterViews() {
    for (const view of this.encounterViews) { view.hovered = false; this.updateEncounterView(view); }
    const access = getForgerAccess(this.cityId);
    this.forgerObservationButton?.setVisible(access.available);
    this.forgerObservationButtonLabel?.setText(access.completed ? __dialogueText('scenes/city/CityEncounters.js', 't_c1abec826396059421c5') : __dialogueText('scenes/city/CityEncounters.js', 't_159b45db787832bbdafa'));
  }
  destroyEncounterViews() {
    this.forgerObservationButton?.destroy(true);
    this.forgerObservationButton = null;
    this.forgerObservationButtonLabel = null;
    const views = this.encounterViews.splice(0), icons = new Set(views.map(v => v.icon));
    this.interactiveObjects = this.interactiveObjects.filter(o => !icons.has(o));
    for (const {icon, nameLabel, statusLabel, pinText} of views) for (const o of [icon, nameLabel, statusLabel, pinText]) {
      o?.destroy?.();
    }
  }
  visitEncounter(encounter) {
    if (!this.canStartInteraction()) return false;
    this.closeAllUIPanels();
    const flags = this.getCityProgressFlags(), target = this.getDialogueTargetCityId(flags);
    if (!this.isLocationOpen(encounter.locationId)) { this.showLocationClosedPopup(encounter.locationId, encounter, target); return false; }
    return this.openEncounter(encounter, target);
  }
  openEncounter(encounter, dialogueTargetCityId) {
    if (!this.canStartInteraction()) return false;
    if (encounter.cityPlace) {
      const place = this.city?.cityPlaces?.[encounter.placeId];
      if (!place || place.enabled === false) return false;
    }
    if (!this.isLocationOpen(encounter.locationId)) { this.showLocationClosedPopup(encounter.locationId, encounter, dialogueTargetCityId); return false; }
    if (encounter.cityPlace && !encounter.npcId) return this.transitionTo('CityPlaceScene', {cityId:this.cityId, placeId:encounter.placeId});
    const status = this.getEncounterStatus(encounter), flags = this.getCityProgressFlags();
    return this.transitionTo('LocationScene', {
      cityId:this.cityId, encounterId:encounter.id, npcId:encounter.npcId, locationId:encounter.locationId,
      isRepeat:status.isRepeat, isCrimeCity:flags.isCrimeCity, isNextTargetCity:flags.isNextTargetCity,
      isCorrectCity:flags.isCorrectCity,
      dialogueTargetCityId:dialogueTargetCityId === undefined ? this.getDialogueTargetCityId(flags) : dialogueTargetCityId
    });
  }
  getDialogueTargetCityId() { return getPursuitCityContext(gameState, this.cityId).targetCityId; }
  getCityProgressFlags() { return getPursuitCityContext(gameState, this.cityId); }
  changeScore(points, label = __dialogueText('scenes/city/CityEncounters.js', 't_45f6b797951e3bea1d82')) {
    const delta = Number.isFinite(points) ? Math.trunc(points) : 0;
    if (!delta) return gameState.score || 0;
    const total = addSessionScore(delta, label), hud = this.getPlayerHudScene();
    hud?.refreshNotebook?.(); hud?.refreshUI?.();
    return total;
  }
}
