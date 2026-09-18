// ApartmentObjectsConfig.js
// ============================================================
// Konfiguracja obiektów dla każdego mieszkania złodzieja
// Każdy złodziej (suspeict ID) ma inną konfigurację
// ============================================================

export const APARTMENT_OBJECTS = {
  // ============================================================
  // EXAMPLE: Sofia Vargas (gambling_debt motive)
  // ============================================================
  'sofia_vargas': {
    background: {
      // Proceduralne tło (ako nie ma grafiki)
      color: 0x2c2c2c,
      pattern: 'luxury_apartment',
      // Gdy się pojawi grafika:
      // imageKey: 'apartment_sofia_vargas',
      // imagePath: 'assets/apartments/apartment_sofia_vargas.jpg'
    },
    width: 1280,
    height: 720,
    title: "Sofia Vargas's Apartment",
    subtitle: 'Luxury. Risky. Desperate.',
    objects: [
      // ============================================================
      // CLUE OBJECTS (znaleźć + combine)
      // ============================================================
      {
        id: 'desk_drawer',
        type: 'furniture',
        label: 'Mahogany Desk',
        description: 'An expensive desk. Drawer is locked.',
        position: { x: 300, y: 400 },
        size: { w: 120, h: 80 },
        icon: 'icon_desk',
        
        // Stan obiektu
        state: 'locked',
        states: {
          locked: { text: 'Locked. Needs a key.' },
          open: { text: 'Inside: bank statement, casino receipts' }
        },
        
        // Aby otworzyć: potrzebny klucz
        requiresItem: 'desk_key',
        unlocks: [
          {
            id: 'bank_statement_1',
            type: 'document',
            label: 'Bank Statement (Fragment 1)',
            description: 'Part of a bank transfer log. Large sum to "Lucky Seven Casino".',
            quantity: 1
          },
          {
            id: 'casino_receipt',
            type: 'document',
            label: 'Casino Receipt',
            description: 'Receipt from Lucky Seven Casino. Loss of 50,000€ in one night.',
            quantity: 1
          }
        ],
        
        // Animation gdy otworzymy
        animation: {
          type: 'slide_open_right',
          duration: 600
        }
      },

      {
        id: 'bedroom_nightstand',
        type: 'furniture',
        label: 'Nightstand',
        description: 'Wooden nightstand. Small drawer.',
        position: { x: 800, y: 350 },
        size: { w: 80, h: 100 },
        icon: 'icon_nightstand',
        
        state: 'closed',
        states: {
          closed: { text: 'Closed drawer. Might hide something.' },
          open: { text: 'Inside: a small golden key' }
        },
        
        unlocks: [
          {
            id: 'desk_key',
            type: 'key',
            label: 'Small Golden Key',
            description: 'Ornate key. Fits the desk drawer perfectly.',
            quantity: 1
          }
        ],
        
        animation: {
          type: 'slide_open_down',
          duration: 500
        }
      },

      {
        id: 'wall_painting',
        type: 'decoration',
        label: 'Monet Painting',
        description: 'An expensive copy of a Monet. Frame looks loose.',
        position: { x: 600, y: 250 },
        size: { w: 140, h: 100 },
        icon: 'icon_painting',
        
        state: 'frame_on',
        states: {
          frame_on: { text: 'Painting is framed. Frame feels loose.' },
          frame_off: { text: 'Behind the frame: a torn document' }
        },
        
        unlocks: [
          {
            id: 'bank_statement_2',
            type: 'document',
            label: 'Bank Statement (Fragment 2)',
            description: 'The second half of the transfer log. Reveals creditor name: "Victor\'s Collection".',
            quantity: 1
          }
        ],
        
        animation: {
          type: 'slide_reveal_left',
          duration: 700
        }
      },

      {
        id: 'bookshelf',
        type: 'furniture',
        label: 'Bookshelf',
        description: 'Books, trophies, and... something hidden behind them?',
        position: { x: 100, y: 300 },
        size: { w: 150, h: 200 },
        icon: 'icon_bookshelf',
        
        state: 'hidden',
        states: {
          hidden: { text: 'Books are neatly arranged. One looks misplaced.' },
          revealed: { text: 'Inside: a black notebook' }
        },
        
        unlocks: [
          {
            id: 'debt_notebook',
            type: 'document',
            label: 'Debt Notebook',
            description: 'Hand-written log of gambling losses and debts. Escalating amounts. Recent entry: "Final payment due Friday."',
            quantity: 1
          }
        ],
        
        animation: {
          type: 'fade_in',
          duration: 600
        }
      },

      {
        id: 'bathroom_mirror',
        type: 'mirror',
        label: 'Bathroom Mirror',
        description: 'A mirror with multiple medications on the shelf below.',
        position: { x: 1050, y: 280 },
        size: { w: 120, h: 150 },
        icon: 'icon_mirror',
        
        state: 'closed',
        states: {
          closed: { text: 'Medicine cabinet. Closed.' },
          open: { text: 'Medications, sleeping pills, anxiety prescriptions.' }
        },
        
        unlocks: [
          {
            id: 'medications',
            type: 'clue',
            label: 'Medications & Prescriptions',
            description: 'Sleeping pills, anti-anxiety drugs. Recent purchases. Suggests someone was stressed, not sleeping.',
            quantity: 1
          }
        ],
        
        animation: {
          type: 'swing_open',
          duration: 500
        }
      },

      // ============================================================
      // RED HERRINGS (nie wnoszą nic, ale wyglądają relevantnie)
      // ============================================================
      {
        id: 'framed_photo',
        type: 'decoration',
        label: 'Family Photo',
        description: 'Sofia with her family at a beach resort.',
        position: { x: 450, y: 150 },
        size: { w: 100, h: 120 },
        icon: 'icon_photo',
        
        onInteract: {
          text: 'A happy memory. Pre-debt. But who\'s the man in the background? Always there in every photo.',
          isRedHerring: true
        }
      },

      {
        id: 'wine_collection',
        type: 'decoration',
        label: 'Wine Collection',
        description: 'Expensive wines. Some bottles are missing from the rack.',
        position: { x: 950, y: 500 },
        size: { w: 100, h: 140 },
        icon: 'icon_wine',
        
        onInteract: {
          text: 'Bottles of fine wine worth thousands each. Several gaps in the collection. Recently sold? Or consumed in panic?',
          isRedHerring: false, // To jest ważne - sprzedaż dla pieniędzy
          hint: 'Signs of financial desperation'
        }
      },

      {
        id: 'empty_jewelry_box',
        type: 'container',
        label: 'Jewelry Box',
        description: 'Velvet-lined box. Empty except for dust.',
        position: { x: 750, y: 200 },
        size: { w: 80, h: 60 },
        icon: 'icon_jewelry_box',
        
        onInteract: {
          text: 'Recently emptied. Items were probably valuable and hastily sold.',
          isRedHerring: false,
          hint: 'Someone needed quick cash'
        }
      }
    ]
  },

  // ============================================================
  // TEMPLATE - kopiuj dla innych złodziei
  // ============================================================
  // '{suspect_id}': {
  //   background: { ... },
  //   objects: [ ... ]
  // }
};

/**
 * Utility: Zwróć konfigurację dla konkretnego mieszkania
 */
export function getApartmentConfig(suspectId) {
  const config = APARTMENT_OBJECTS[suspectId];
  if (!config) {
    console.warn(`[ApartmentConfig] No apartment config for suspect: ${suspectId}`);
    return APARTMENT_OBJECTS['sofia_vargas']; // Fallback
  }
  return config;
}

/**
 * Zwróć wszystkie clue objects (nie red herrings)
 */
export function getClueObjects(suspectId) {
  const config = getApartmentConfig(suspectId);
  return config.objects.filter(obj => obj.unlocks || (obj.onInteract && !obj.onInteract.isRedHerring));
}

/**
 * Zwróć combine rules dla puzzli (np. 2 połowy = całość)
 */
export const COMBINE_RULES = {
  bank_statement_1_and_2: {
    requires: ['bank_statement_1', 'bank_statement_2'],
    produces: {
      id: 'bank_statement_full',
      type: 'document',
      label: 'Complete Bank Statement',
      description: 'Full transfer log: Sofia transferred 150,000€ to "Victor\'s Collection" (a known debt collector). Date: one day before the heist.',
      quantity: 1,
      isClue: true
    },
    animation: {
      type: 'merge_documents',
      duration: 800
    }
  },
  
  // Możesz dodać więcej kombinacji
};

export default APARTMENT_OBJECTS;