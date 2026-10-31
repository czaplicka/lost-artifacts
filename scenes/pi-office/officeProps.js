import { OFFICE_CONFIG } from '../../config/detectiveOfficeConfig.js';

/**
 * Obiekty PI office.
 *
 * Istniejące hotspoty zachowują współrzędne z OFFICE_CONFIG:
 * x, y, w, h są podane w pikselach oryginalnego tła.
 *
 * Dla przyszłych obiektów można dodać:
 * - condition: (state, scene) => boolean
 * - onClick: (scene) => void
 * - textureKey: klucz wcześniej załadowanej grafiki
 * - textureUrl: opcjonalny adres grafiki do załadowania
 * - scale: skala grafiki względem oryginalnego tła
 * - depth: głębokość obiektu
 *
 * Telefon i komputer nie potrzebują osobnych grafik.
 */

const ACTIONS = {
  computer: scene => scene.openComputer(),
  phone: scene => scene.openPhone(),
  city: scene => scene.goToCity(),
  gotoCity: scene => scene.goToCity()
};

export function createOfficeObjectDefinitions() {
  return (OFFICE_CONFIG.hotspots || []).map(config => {
    const definition = { ...config };

    definition.tooltip =
      definition.tooltip ||
      definition.label ||
      definition.id;

    // Podstawowe wyposażenie nie wymaga zakupu.
    if (
      definition.id === 'phone' ||
      definition.id === 'computer' ||
      definition.action === 'phone' ||
      definition.action === 'computer'
    ) {
      definition.condition = () => true;
    }

    if (typeof definition.onClick !== 'function') {
      definition.onClick = scene => {
        const action = ACTIONS[definition.action];

        if (action) {
          return action(scene);
        }

        console.warn(
          '[PI office] Unknown object action:',
          definition.id,
          definition.action
        );
      };
    }

    return definition;
  });
}