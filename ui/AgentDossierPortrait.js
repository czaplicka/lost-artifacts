import { avatarManager } from '../managers/AvatarManager.js';
import { gameState } from '../GameData.js';

const portraits = new WeakMap();

export function renderAgentDossierPortrait(scene, host) {
  if (!host?.isConnected) return;

  const appearance = gameState.appearance;
  let entry = portraits.get(host);

  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
    if (entry) {
      entry.canvas.remove();
      entry.legacyLayers.forEach(({ element, display }) => {
        element.style.display = display;
      });
      portraits.delete(host);
    }
    return;
  }

  if (!entry) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');

    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      display: 'none',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      objectPosition: 'center',
      backgroundColor: '#efe4c8',
      pointerEvents: 'none'
    });

    entry = {
      canvas,
      legacyLayers: Array.from(host.children, element => ({
        element,
        display: element.style.display
      })),
      renderedKey: null,
      pendingKey: null
    };

    host.appendChild(canvas);
    portraits.set(host, entry);
  }

  const key = JSON.stringify(appearance);
  if (entry.renderedKey === key || entry.pendingKey === key) return;

  entry.pendingKey = key;
  const snapshot = { ...appearance };

  const draw = () => {
    if (scene._isDestroyed || !host.isConnected) return false;
    if (portraits.get(host) !== entry || entry.pendingKey !== key) return false;
    if (JSON.stringify(gameState.appearance) !== key) return false;

    const drawn = avatarManager.drawToCanvas(entry.canvas, snapshot, {
      height: 512,
      background: '#efe4c8'
    });

    if (!drawn) return false;

    entry.legacyLayers.forEach(({ element }) => {
      element.style.display = 'none';
    });

    entry.canvas.style.display = 'block';
    entry.renderedKey = key;
    return true;
  };

  void (async () => {
    try {
      if (draw()) return;
      await avatarManager.ensureLoaded(scene);
      draw();
    } catch (error) {
      console.warn('[AgentDossierPortrait] Could not draw portrait:', error);
    } finally {
      if (entry.pendingKey === key) entry.pendingKey = null;
    }
  })();
}