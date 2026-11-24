import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { LOCAL_DEBUG_ALLOWED, FONT, COLOR, TAG_W, BOARD_W, FALLBACK_DESCRIPTIONS, SHOP_SIGNS, QUIPS, normalizeCityId, hashString, seededRandom } from './ShopSceneData.js';

export const shopSceneDebug = {
  setDebugMode(enabled) {
    if (!LOCAL_DEBUG_ALLOWED) return;
    this.debugMode = Boolean(enabled); this.hideTooltip();
    this.hotspots.forEach(hs => { hs.hovered = false; this.input.setDraggable(hs.zone, this.debugMode); }); this.updateDebug();
  },
  updateDebug() {
    if (!LOCAL_DEBUG_ALLOWED) return;
    this.hotspots.forEach(hs => this.drawHotspot(hs)); const cfg = this.hotspots[this.selectedIndex]?.cfg;
    this.debugText?.setVisible(this.debugMode).setText(this.debugMode ? [
      `${__dialogueText("scenes/ShopScene.js", "t_cb40a67f6cdee4b5ad52")}${cfg?.id || __dialogueText("scenes/ShopScene.js", "t_a7b605aae185f602d654")}${__dialogueText("scenes/ShopScene.js", "t_1bcb682bca445116a9df")}${this.cityId}${__dialogueText("scenes/ShopScene.js", "t_643654cebb2e43070c60")}${this.getShopDay()}`,
      `${__dialogueText("scenes/ShopScene.js", "t_51e33c7c7efbc350d26f")}${cfg?.x}${__dialogueText("scenes/ShopScene.js", "t_8278a5c11d3d9380f821")}${cfg?.y}${__dialogueText("scenes/ShopScene.js", "t_1b89a9604b178452218e")}${cfg?.w}${__dialogueText("scenes/ShopScene.js", "t_3f4674b8e35cc249a199")}${cfg?.h}`,
      __dialogueText("scenes/ShopScene.js", "t_ab723c339f7fee296c8c"),
      __dialogueText("scenes/ShopScene.js", "t_8a8e5fa4a5df6de70337"), __dialogueText("scenes/ShopScene.js", "t_03f07483af5fb2894ac7")
    ].join(__dialogueText("scenes/ShopScene.js", "t_01ba4719c80b6fe911b0")) : '');
  },
  isEditableTarget(event) {
    const target = event.target;
    return Boolean(target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName));
  },
  onEscape(event) { if (this.isEditableTarget(event) || this.hudPanelOpen) return; this.exitShop(); },
  onDebugKey(event) {
    if (!LOCAL_DEBUG_ALLOWED || this.isEditableTarget(event) || this.hudPanelOpen || this.exiting || event.ctrlKey || event.metaKey) return;
    if (event.code === 'KeyD') { if (!event.repeat) this.setDebugMode(!this.debugMode); return; }
    if (!this.debugMode) return;
    if (event.code === 'KeyC') { if (!event.repeat) this.printConfig(); return; }
    if (!this.hotspots.length) return;
    if (event.code === "Tab") {
      event.preventDefault(); const delta = event.shiftKey ? -1 : 1;
      this.selectedIndex = (this.selectedIndex + delta + this.hotspots.length) % this.hotspots.length; this.updateDebug(); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault(); const hs = this.hotspots[this.selectedIndex], cfg = hs.cfg, step = event.altKey ? 1 : 5;
    const horizontal = event.code === 'ArrowLeft' || event.code === 'ArrowRight';
    const direction = event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    cfg[key] += direction * step; cfg.w = Math.max(10, cfg.w); cfg.h = Math.max(10, cfg.h);
    this.syncHotspot(hs); this.updateDebug();
  },
  printConfig() {
    if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return;
    console.log('COPY INTO config/shopConfig.js -> hotspots:'); console.log(JSON.stringify(this.allProducts, null, 2));
  }
};
