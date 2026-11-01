import { OFFICE_CONFIG } from '../../config/detectiveOfficeConfig.js';
import { PI_OFFICE_PROPS } from '../../config/piOfficePropsLayout.js';
import { collectEmployeeIncome } from '../../managers/PIOfficeShopManager.js';

const owns = (state, id) => Object.prototype.hasOwnProperty.call(state?.piOfficeShop?.owned || {}, id);
const ACTIONS = {
  computer: scene => scene.openComputer(),
  phone: scene => scene.openPhone(),
  city: scene => scene.goToCity(),
  gotoCity: scene => scene.goToCity(),
  archive: scene => scene.openOfficeApplication('office-archive'),
  documents: scene => scene.openOfficeApplication('office-documents'),
  employee: scene => {
    const result = collectEmployeeIncome();
    scene.showFeedback(result.message);
    return result;
  },
  assistant: scene => {
    const percent = scene.gameState.piOfficeShop?.owned?.office_assistant?.rewardBonusPercent;
    const benefit = Number.isFinite(percent)
      ? `Negotiation bonus: ${percent}% on eligible PI contract fees.`
      : 'I handle appointments. Your questionable decisions remain your responsibility.';
    scene.showFeedback(`"Your calendar is organised. Your life remains under review."\n${benefit}`);
  }
};
export function createOfficeObjectDefinitions() {
  const additions = new Map(PI_OFFICE_PROPS.map(prop => [prop.id, prop]));
  const original = OFFICE_CONFIG.hotspots || [];
  const definitions = original.map(config => additions.has(config.id)
    ? { ...additions.get(config.id), ...config, relative:false, purchasedProp:true, imageFit:'contain' }
    : { ...config });
  for (const prop of PI_OFFICE_PROPS) {
    if (!definitions.some(entry => entry.id === prop.id)) {
      definitions.push({ ...prop, relative:true, purchasedProp:true, imageFit:'contain' });
    }
  }
  return definitions.map(definition => {
    definition.tooltip = definition.tooltip || definition.label || definition.id;
    if (definition.purchasedProp) {
      definition.condition = state => owns(state, definition.itemId);
    } else if (['phone','computer'].includes(definition.id) || ['phone','computer'].includes(definition.action)) {
      definition.condition = () => true;
    }
    if (typeof definition.onClick !== 'function') definition.onClick = scene => {
      const action = ACTIONS[definition.action];
      if (action) return action(scene);
      console.warn('[PI office] Unknown object action:', definition.id, definition.action);
    };
    return definition;
  });
}
export function applyOfficePropLayout(definitions, source, state) {
  const saved = state?.piOfficePropLayout?.props || {};
  for (const config of definitions) {
    if (!config.purchasedProp) continue;
    const stored = saved[config.id];
    const valid = stored && ['x','y','w','h'].every(key => Number.isFinite(stored[key])) &&
      stored.x >= 0 && stored.x <= 1 && stored.y >= 0 && stored.y <= 1 &&
      stored.w > 0 && stored.w <= 1 && stored.h > 0 && stored.h <= 1;
    const layout = valid ? stored : config.relative ? config : null;
    if (layout) {
      config.x = layout.x * source.width;
      config.y = layout.y * source.height;
      config.w = layout.w * source.width;
      config.h = layout.h * source.height;
    }
    config.relative = false;
  }
}
export function serialiseOfficePropLayout(definitions, source) {
  const clamp = value => Math.max(0, Math.min(1, value));
  const props = {};
  for (const config of definitions) {
    if (!config.purchasedProp) continue;
    props[config.id] = {
      x:clamp(config.x / Math.max(1, source.width)),
      y:clamp(config.y / Math.max(1, source.height)),
      w:Math.max(0.005, clamp(config.w / Math.max(1, source.width))),
      h:Math.max(0.005, clamp(config.h / Math.max(1, source.height)))
    };
  }
  return { version:1, props };
}
