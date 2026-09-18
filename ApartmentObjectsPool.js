// ApartmentObjectsPool.js
// ============================================================
// PULA obiektów dla wszystkich mieszkań (22 podejrzanych)
// Każdy obiekt jest SZABLONEM - rzeczywista zawartość jest wygenerowana
// Living room only - jedna scena dla wszystkich
// ============================================================

/**
 * PULA wszystkich możliwych obiektów w living room
 * Każdy obiekt jest SZABLONEM - rzeczywista zawartość jest wygenerowana
 */
export const APARTMENT_OBJECTS_POOL = {
  desk: {
    id: 'desk',
    label: 'Mahogany Desk',
    type: 'furniture',
    description: 'An expensive desk. Has a drawer.',
    position: { x: 300, y: 400 },
    size: { w: 120, h: 80 },
    
    canBeLocked: true,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'desk_key', type: 'key', label: 'Small Desk Key', weight: 15 },
      { id: 'bank_statement', type: 'document', label: 'Bank Statement', weight: 20 },
      { id: 'casino_receipt', type: 'document', label: 'Casino Receipt', weight: 20 },
      { id: 'medical_bill', type: 'document', label: 'Medical Invoice', weight: 15 },
      { id: 'threatening_letter', type: 'document', label: 'Threatening Letter', weight: 18 },
      { id: 'plane_ticket_receipt', type: 'document', label: 'Flight Booking Receipt', weight: 20, isEscapeClue: true },
      { id: 'map_location', type: 'document', label: 'Map with Marked Location', weight: 15 },
      { id: 'handwritten_notes', type: 'document', label: 'Handwritten Notes', weight: 12 },
      { id: 'audit_report', type: 'document', label: 'Audit Report', weight: 15 },
      { id: 'visa_stamp', type: 'document', label: 'Visa/Travel Document', weight: 18, isEscapeClue: true }
    ],
    
    animation: {
      type: 'slide_open_right',
      duration: 600
    }
  },

  bookshelf: {
    id: 'bookshelf',
    label: 'Bookshelf',
    type: 'furniture',
    description: 'Wooden bookshelf with books and trinkets.',
    position: { x: 100, y: 300 },
    size: { w: 150, h: 200 },
    
    canBeLocked: false,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'debt_notebook', type: 'document', label: 'Debt Notebook', weight: 25 },
      { id: 'diary', type: 'document', label: 'Personal Diary', weight: 15 },
      { id: 'hidden_key', type: 'key', label: 'Hidden Key', weight: 18 },
      { id: 'old_letters', type: 'document', label: 'Old Letters', weight: 12 },
      { id: 'artifact_research', type: 'document', label: 'Artifact Research Notes', weight: 20 },
      { id: 'medical_reports', type: 'document', label: 'Medical Reports', weight: 15 },
      { id: 'blackmail_photo', type: 'photo', label: 'Compromising Photo', weight: 15 },
      { id: 'travel_guide', type: 'document', label: 'Travel Guide (Marked)', weight: 16, isEscapeClue: true }
    ],
    
    animation: {
      type: 'fade_in',
      duration: 600
    }
  },

  painting: {
    id: 'painting',
    label: 'Wall Painting',
    type: 'decoration',
    description: 'A painting on the wall. Frame looks loose.',
    position: { x: 600, y: 250 },
    size: { w: 140, h: 100 },
    
    canBeLocked: false,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'hidden_document', type: 'document', label: 'Document Behind Frame', weight: 22 },
      { id: 'safe_key', type: 'key', label: 'Safe Key', weight: 18 },
      { id: 'money_stash', type: 'object', label: 'Cash Stash', weight: 15 },
      { id: 'plane_ticket', type: 'document', label: 'One-way Plane Ticket', weight: 20, isEscapeClue: true },
      { id: 'second_passport', type: 'document', label: 'Fake Passport', weight: 16, isEscapeClue: true }
    ],
    
    animation: {
      type: 'slide_reveal_left',
      duration: 700
    }
  },

  cabinet: {
    id: 'cabinet',
    label: 'Side Cabinet',
    type: 'furniture',
    description: 'Wooden cabinet next to the sofa.',
    position: { x: 800, y: 450 },
    size: { w: 80, h: 100 },
    
    canBeLocked: true,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'medications', type: 'object', label: 'Medications & Prescriptions', weight: 18 },
      { id: 'insurance_papers', type: 'document', label: 'Insurance Documents', weight: 15 },
      { id: 'gun_license', type: 'document', label: 'Firearm Permit', weight: 10 },
      { id: 'jewelry', type: 'object', label: 'Jewelry Box', weight: 12 },
      { id: 'burglary_tools', type: 'object', label: 'Lock Picking Kit', weight: 20 },
      { id: 'rope_coil', type: 'object', label: 'Coil of Rope', weight: 15 },
      { id: 'lockpick_set', type: 'object', label: 'Professional Lock Picks', weight: 18 },
      { id: 'fake_id', type: 'document', label: 'Fake ID Cards', weight: 14, isEscapeClue: true }
    ],
    
    animation: {
      type: 'slide_open_down',
      duration: 500
    }
  },

  safe: {
    id: 'safe',
    label: 'Wall Safe',
    type: 'furniture',
    description: 'A small wall-mounted safe. Requires a key.',
    position: { x: 950, y: 350 },
    size: { w: 90, h: 110 },
    
    canBeLocked: true,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'passport_original', type: 'document', label: 'Passport (Original)', weight: 25 },
      { id: 'diamond_ring', type: 'object', label: 'Diamond Ring', weight: 15 },
      { id: 'offshore_account_info', type: 'document', label: 'Offshore Account Info', weight: 20 },
      { id: 'will_document', type: 'document', label: 'Will/Testament', weight: 12 },
      { id: 'blackmail_evidence', type: 'document', label: 'Blackmail Evidence', weight: 18 },
      { id: 'escape_fund', type: 'object', label: 'Escape Fund (Cash Bundle)', weight: 22, isEscapeClue: true },
      { id: 'plane_booking_confirmation', type: 'document', label: 'Plane Booking (Confirmation)', weight: 21, isEscapeClue: true }
    ],
    
    animation: {
      type: 'swing_open',
      duration: 500
    }
  },

  wine_rack: {
    id: 'wine_rack',
    label: 'Wine Rack',
    type: 'decoration',
    description: 'Wine bottles. Some bottles are missing.',
    position: { x: 400, y: 550 },
    size: { w: 100, h: 140 },
    
    canBeLocked: false,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'wine_sale_receipt', type: 'document', label: 'Recent Wine Sale Receipt', weight: 18 },
      { id: 'auction_catalog', type: 'document', label: 'Auction House Catalog', weight: 15 },
      { id: 'empty_wine_bottles', type: 'object', label: 'Empty Wine Bottles (Recently Sold)', weight: 12, isRedHerring: true }
    ],
    
    animation: {
      type: 'none',
      duration: 0
    }
  },

  jewelry_box: {
    id: 'jewelry_box',
    label: 'Jewelry Box',
    type: 'container',
    description: 'Ornate jewelry box on the shelf.',
    position: { x: 500, y: 200 },
    size: { w: 80, h: 60 },
    
    canBeLocked: false,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'engagement_ring', type: 'object', label: 'Engagement Ring', weight: 15 },
      { id: 'family_heirloom_photo', type: 'photo', label: 'Photo of Family Heirloom', weight: 22 },
      { id: 'empty_jewelry_box', type: 'object', label: 'Box (Recently Emptied)', weight: 12 }
    ],
    
    animation: {
      type: 'swing_open',
      duration: 500
    }
  },

  lamp: {
    id: 'lamp',
    label: 'Table Lamp',
    type: 'furniture',
    description: 'A brass table lamp. Base seems hollow?',
    position: { x: 700, y: 450 },
    size: { w: 40, h: 100 },
    
    canBeLocked: false,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'hidden_cash', type: 'object', label: 'Hidden Money in Base', weight: 20 },
      { id: 'usb_drive', type: 'object', label: 'USB Drive (Evidence)', weight: 18 },
      { id: 'memory_card', type: 'object', label: 'Memory Card (Photos)', weight: 15 },
      { id: 'key_in_lamp', type: 'key', label: 'Key Hidden in Lamp Base', weight: 16 }
    ],
    
    animation: {
      type: 'shake',
      duration: 400
    }
  },

  sofa: {
    id: 'sofa',
    label: 'Sofa Cushions',
    type: 'furniture',
    description: 'Soft cushions. Something might be hidden between them.',
    position: { x: 550, y: 380 },
    size: { w: 180, h: 60 },
    
    canBeLocked: false,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'lost_key', type: 'key', label: 'Lost Key', weight: 18 },
      { id: 'love_letter', type: 'document', label: 'Love Letter', weight: 12 },
      { id: 'lost_cash', type: 'object', label: 'Forgotten Cash', weight: 15 },
      { id: 'broken_necklace', type: 'object', label: 'Broken Necklace', weight: 10 },
      { id: 'hotel_key_card', type: 'key', label: 'Hotel Key Card', weight: 14, isEscapeClue: true },
      { id: 'torn_ticket', type: 'document', label: 'Torn Ticket (Fragment)', weight: 12 }
    ],
    
    animation: {
      type: 'none',
      duration: 0
    }
  },

  desk_computer: {
    id: 'desk_computer',
    label: 'Desktop Computer',
    type: 'furniture',
    description: 'An old desktop computer. Powered down.',
    position: { x: 350, y: 200 },
    size: { w: 100, h: 80 },
    
    canBeLocked: false,
    canBeOpen: false,
    
    possibleContents: [
      { id: 'email_screenshot', type: 'document', label: 'Email Confirmation (Screenshot)', weight: 20 },
      { id: 'search_history', type: 'document', label: 'Browser History Printout', weight: 15 }
    ],
    
    animation: {
      type: 'none',
      duration: 0
    }
  },

  nightstand_drawer: {
    id: 'nightstand_drawer',
    label: 'Side Table Drawer',
    type: 'furniture',
    description: 'Small drawer. Might be locked.',
    position: { x: 200, y: 500 },
    size: { w: 60, h: 70 },
    
    canBeLocked: true,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'nightstand_key', type: 'key', label: 'Small Key (Drawer Key)', weight: 12 },
      { id: 'private_letters', type: 'document', label: 'Private Letters (Bundled)', weight: 18 },
      { id: 'sleeping_pills', type: 'object', label: 'Sleeping Pills (Empty Bottle)', weight: 10 },
      { id: 'passport_page', type: 'document', label: 'Passport (Single Page)', weight: 14 }
    ],
    
    animation: {
      type: 'slide_open_right',
      duration: 400
    }
  },

  framed_photo: {
    id: 'framed_photo',
    label: 'Framed Photo',
    type: 'decoration',
    description: 'A photo in a frame on the shelf. Can you remove it?',
    position: { x: 450, y: 150 },
    size: { w: 100, h: 120 },
    
    canBeLocked: false,
    canBeOpen: true,
    
    possibleContents: [
      { id: 'photo_back_message', type: 'document', label: 'Message on Photo Back', weight: 15 },
      { id: 'hidden_behind_frame', type: 'key', label: 'Item Hidden Behind Frame', weight: 16 }
    ],
    
    animation: {
      type: 'none',
      duration: 0
    }
  }
};

/**
 * PULA zawartości RED HERRINGS (nie wnoszą nic do śledztwa)
 * Ale wyglądają suspect!
 */
export const RED_HERRING_CONTENTS = [
  { id: 'theater_tickets', type: 'document', label: 'Theater Tickets', hint: 'A night out. Innocent.' },
  { id: 'restaurant_receipt', type: 'document', label: 'Restaurant Receipt', hint: 'Expensive dinner. But for a date?' },
  { id: 'concert_poster', type: 'photo', label: 'Concert Poster (Signed)', hint: 'Collectable memorabilia.' },
  { id: 'birthday_card', type: 'document', label: 'Birthday Card', hint: 'From someone who cares.' },
  { id: 'gym_membership', type: 'document', label: 'Gym Membership Card', hint: 'Fitness routine. Normal.' },
  { id: 'magazine', type: 'document', label: 'Magazine', hint: 'Hobby interest. Nothing suspicious.' },
  { id: 'pet_vaccination', type: 'document', label: 'Pet Vaccination Record', hint: 'Responsible pet owner.' },
  { id: 'library_card', type: 'document', label: 'Library Card', hint: 'Well-read person.' },
  { id: 'lottery_ticket', type: 'document', label: 'Lottery Ticket', hint: 'Dreams of fortune like everyone else.' },
  { id: 'property_deed', type: 'document', label: 'Property Deed', hint: 'Real estate. Legitimate ownership.' },
  { id: 'coffee_receipt', type: 'document', label: 'Coffee Shop Receipt', hint: 'Just a morning coffee.' },
  { id: 'vacation_brochure', type: 'document', label: 'Vacation Brochure', hint: 'Dreams of travel. Who doesn\'t have those?' },
  { id: 'book_receipt', type: 'document', label: 'Book Store Receipt', hint: 'Enjoys reading.' },
  { id: 'concert_ticket', type: 'document', label: 'Concert Ticket Stub', hint: 'Went to a show.' },
  { id: 'museum_pass', type: 'document', label: 'Museum Annual Pass', hint: 'Cultural interests.' }
];

/**
 * ESCAPE CLUES - obiekty które triggernąjf Escape Phase
 * Gracz może znaleźć tylko JEDEN z tych - zależy od motywu
 */
export const ESCAPE_CLUES = {
  plane_ticket_receipt: {
    id: 'plane_ticket_receipt',
    type: 'document',
    label: 'Flight Booking Receipt',
    description: 'Departure booking. Name looks familiar. Leaves tomorrow.',
    isEscapeClue: true,
    weight: 22
  },
  passport_copy: {
    id: 'passport_copy',
    type: 'document',
    label: 'Fake Passport',
    description: 'A convincing fake. Different name. Different identity.',
    isEscapeClue: true,
    weight: 20
  },
  travel_guide: {
    id: 'travel_guide',
    type: 'document',
    label: 'Travel Guide (Heavily Marked)',
    description: 'Multiple countries marked. Escape route planned.',
    isEscapeClue: true,
    weight: 18
  },
  escape_fund: {
    id: 'escape_fund',
    type: 'object',
    label: 'Large Cash Bundle (Escape Fund)',
    description: 'Hundreds of thousands in various currencies. Ready to flee.',
    isEscapeClue: true,
    weight: 24
  },
  plane_booking: {
    id: 'plane_booking',
    type: 'document',
    label: 'Plane Booking (Confirmed)',
    description: 'Confirmation email printed. Flight departing in 6 hours.',
    isEscapeClue: true,
    weight: 25
  },
  hotel_reservation: {
    id: 'hotel_reservation',
    type: 'document',
    label: 'Hotel Reservation (Foreign)',
    description: 'Hotel booking in Thailand. Check-in date: tomorrow.',
    isEscapeClue: true,
    weight: 20
  },
  visa_stamp: {
    id: 'visa_stamp',
    type: 'document',
    label: 'Fresh Visa Stamp',
    description: 'Recent visa approval. Destination: South America.',
    isEscapeClue: true,
    weight: 19
  }
};

/**
 * Combine rules - jak kombinować przedmioty
 */
export const COMBINE_RULES = {
  split_bank_statements: {
    requires: ['bank_statement_part1', 'bank_statement_part2'],
    produces: {
      id: 'bank_statement_complete',
      type: 'document',
      label: 'Complete Bank Statement',
      description: 'Now you can see the full transfer logs and amounts.',
      isClue: true
    }
  },
  split_letter: {
    requires: ['letter_piece_1', 'letter_piece_2'],
    produces: {
      id: 'letter_complete',
      type: 'document',
      label: 'Complete Letter',
      description: 'The full message is now readable.',
      isClue: true
    }
  },
  torn_ticket_assembly: {
    requires: ['torn_ticket', 'hotel_key_card'],
    produces: {
      id: 'ticket_identity_matched',
      type: 'document',
      label: 'Matching Booking Details',
      description: 'The ticket matches the hotel reservation. Same person.',
      isClue: true
    }
  }
};

export default APARTMENT_OBJECTS_POOL;