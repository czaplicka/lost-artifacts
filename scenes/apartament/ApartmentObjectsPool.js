// scenes/apartament/ApartmentObjectsPool.js
// Item comments live with item definitions in metadata.useMessage.

export const APARTMENT_CONTENT_ROLES = {
  "MISSION_ARTIFACT": "__MISSION_ARTIFACT__",
  "ESCAPE_CLUE": "__ESCAPE_CLUE__",
  "ESCAPE_FRAGMENT_A": "__ESCAPE_FRAGMENT_A__",
  "ESCAPE_FRAGMENT_B": "__ESCAPE_FRAGMENT_B__"
};

export const APARTMENT_OBJECTS_POOL = {
  "desk": {
    "id": "desk",
    "label": "Mahogany Desk",
    "type": "furniture",
    "description": "An expensive desk. It has a drawer and the confidence of a man who owns cufflinks.",
    "position": {
      "x": 300,
      "y": 400
    },
    "size": {
      "w": 120,
      "h": 80
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "desk_key",
        "type": "key",
        "label": "Small Desk Key",
        "weight": 15,
        "metadata": {
          "useMessage": "A small key. I'll need a matching lock, not a smaller imagination."
        }
      },
      {
        "id": "bank_statement",
        "type": "document",
        "label": "Bank Statement",
        "weight": 20,
        "metadata": {
          "useMessage": "I check the numbers. Still not my money. A consistent disappointment."
        }
      },
      {
        "id": "casino_receipt",
        "type": "document",
        "label": "Casino Receipt",
        "weight": 20,
        "metadata": {
          "useMessage": "I hold it up to the light. Still not a winning ticket."
        }
      },
      {
        "id": "medical_bill",
        "type": "document",
        "label": "Medical Invoice",
        "weight": 15,
        "metadata": {
          "useMessage": "I read the total. I may now require medical attention myself."
        }
      },
      {
        "id": "threatening_letter",
        "type": "document",
        "label": "Threatening Letter",
        "weight": 18,
        "metadata": {
          "useMessage": "I consider replying 'unsubscribe'. Probably not legally binding."
        }
      },
      {
        "id": "plane_ticket_receipt",
        "type": "document",
        "label": "Flight Booking Receipt",
        "weight": 20,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "A booking receipt, not a boarding pass. Confidence alone won't get me onto a plane."
        }
      },
      {
        "id": "__ESCAPE_CLUE__",
        "type": "document",
        "label": "Travel Evidence",
        "role": "escapeClue",
        "metadata": {
          "useMessage": "I keep the travel evidence flat. No paper aeroplanes until after the trial."
        }
      },
      {
        "id": "map_location",
        "type": "document",
        "label": "Map with Marked Location",
        "weight": 15,
        "metadata": {
          "useMessage": "I rotate the map. Now I'm confused in a different direction."
        }
      },
      {
        "id": "handwritten_notes",
        "type": "document",
        "label": "Handwritten Notes",
        "weight": 12,
        "metadata": {
          "useMessage": "I try to read the handwriting. The pen appears to have been fleeing the scene."
        }
      },
      {
        "id": "audit_report",
        "type": "document",
        "label": "Audit Report",
        "weight": 15,
        "metadata": {
          "useMessage": "I begin reading the audit. For a moment, I understand the appeal of fleeing the country."
        }
      },
      {
        "id": "visa_stamp",
        "type": "document",
        "label": "Visa / Travel Document",
        "weight": 18,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "I inspect the stamp. International borders remain unimpressed by my paperwork collection."
        }
      }
    ],
    "animation": {
      "type": "slide_open_right",
      "duration": 600
    },
    "afterSearchText": "The drawer is empty now. The desk remains smug."
  },
  "bookshelf": {
    "id": "bookshelf",
    "label": "Bookshelf",
    "type": "furniture",
    "description": "A wooden bookshelf with books and trinkets. Several books have never known the sensation of being opened.",
    "position": {
      "x": 100,
      "y": 300
    },
    "size": {
      "w": 150,
      "h": 200
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "debt_notebook",
        "type": "document",
        "label": "Debt Notebook",
        "weight": 25,
        "metadata": {
          "useMessage": "I open the notebook. It does not improve anyone's financial situation."
        }
      },
      {
        "id": "diary",
        "type": "document",
        "label": "Personal Diary",
        "weight": 15,
        "metadata": {
          "useMessage": "Dear diary: today a detective violated your privacy."
        }
      },
      {
        "id": "hidden_key",
        "type": "key",
        "label": "Hidden Key",
        "weight": 18,
        "metadata": {
          "useMessage": "A hidden key. Now all I need is a less hidden lock."
        }
      },
      {
        "id": "old_letters",
        "type": "document",
        "label": "Old Letters",
        "weight": 12,
        "metadata": {
          "useMessage": "Paper: the original way to leave someone on read."
        }
      },
      {
        "id": "artifact_research",
        "type": "document",
        "label": "Artifact Research Notes",
        "weight": 20,
        "metadata": {
          "useMessage": "I study the notes. The closest I've come to doing my homework in years."
        }
      },
      {
        "id": "medical_reports",
        "type": "document",
        "label": "Medical Reports",
        "weight": 15,
        "metadata": {
          "useMessage": "My professional diagnosis: I am not a doctor."
        }
      },
      {
        "id": "blackmail_photo",
        "type": "photo",
        "label": "Compromising Photo",
        "weight": 15,
        "metadata": {
          "useMessage": "I examine the photograph without touching the surface. My eyebrows do the touching instead."
        }
      },
      {
        "id": "travel_guide",
        "type": "document",
        "label": "Travel Guide (Heavily Marked)",
        "weight": 16,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "I open the travel guide. Sightseeing will have to wait for a less criminal holiday."
        }
      },
      {
        "id": "__ESCAPE_FRAGMENT_A__",
        "type": "document",
        "label": "Torn Travel Document",
        "role": "escapeFragmentA",
        "metadata": {
          "useMessage": "Squinting does not restore the missing half. Worth ruling out."
        }
      }
    ],
    "animation": {
      "type": "fade_in",
      "duration": 600
    },
    "afterSearchText": "You have checked every shelf. Even the self-help section cannot help now."
  },
  "painting": {
    "id": "painting",
    "label": "Wall Painting",
    "type": "decoration",
    "description": "A painting on the wall. The frame is loose enough to qualify as an accessory to a crime.",
    "position": {
      "x": 600,
      "y": 250
    },
    "size": {
      "w": 140,
      "h": 100
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "hidden_document",
        "type": "document",
        "label": "Document Behind Frame",
        "weight": 22,
        "metadata": {
          "useMessage": "I unfold the document. I'll resist hiding it behind another painting."
        }
      },
      {
        "id": "safe_key",
        "type": "key",
        "label": "Safe Key",
        "weight": 18,
        "metadata": {
          "useMessage": "A safe key. I'll need to introduce it to a safe."
        }
      },
      {
        "id": "money_stash",
        "type": "object",
        "label": "Cash Stash",
        "weight": 15,
        "metadata": {
          "useMessage": "I keep the cash with the evidence. My rent will have to find another solution."
        }
      },
      {
        "id": "plane_ticket_receipt",
        "type": "document",
        "label": "Flight Booking Receipt",
        "weight": 20,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "A booking receipt, not a boarding pass. Confidence alone won't get me onto a plane."
        }
      },
      {
        "id": "passport_copy",
        "type": "document",
        "label": "Fake Passport",
        "weight": 16,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "I compare the passport with my face. No. Not even after a difficult weekend."
        }
      },
      {
        "id": "__ESCAPE_CLUE__",
        "type": "document",
        "label": "Travel Evidence",
        "role": "escapeClue",
        "metadata": {
          "useMessage": "I keep the travel evidence flat. No paper aeroplanes until after the trial."
        }
      }
    ],
    "animation": {
      "type": "slide_reveal_left",
      "duration": 700
    },
    "afterSearchText": "The only thing behind the painting now is an aggressively beige wall."
  },
  "cabinet": {
    "id": "cabinet",
    "label": "Side Cabinet",
    "type": "furniture",
    "description": "A wooden cabinet beside the sofa. It is trying extremely hard to look innocent.",
    "position": {
      "x": 800,
      "y": 450
    },
    "size": {
      "w": 80,
      "h": 100
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "medications",
        "type": "object",
        "label": "Medications & Prescriptions",
        "weight": 18,
        "metadata": {
          "useMessage": "I leave the medication sealed. Random prescriptions are not a detective power-up."
        }
      },
      {
        "id": "insurance_papers",
        "type": "document",
        "label": "Insurance Documents",
        "weight": 15,
        "metadata": {
          "useMessage": "I check the small print. It appears to contain even smaller print."
        }
      },
      {
        "id": "gun_license",
        "type": "document",
        "label": "Firearm Permit",
        "weight": 10,
        "metadata": {
          "useMessage": "A permit. Not a gun. My dramatic pointing remains finger-based."
        }
      },
      {
        "id": "jewelry",
        "type": "object",
        "label": "Jewelry Box",
        "weight": 12,
        "metadata": {
          "useMessage": "I resist trying it on. Evidence shouldn't have to coordinate with my outfit."
        }
      },
      {
        "id": "burglary_tools",
        "type": "object",
        "label": "Lock Picking Kit",
        "weight": 20,
        "metadata": {
          "useMessage": "I inspect the tools. Owning these would make my job easier and my defence harder."
        }
      },
      {
        "id": "rope_coil",
        "type": "object",
        "label": "Coil of Rope",
        "weight": 15,
        "metadata": {
          "useMessage": "I consider a dramatic rope entrance. My knees request a second opinion."
        }
      },
      {
        "id": "lockpick_set",
        "type": "object",
        "label": "Professional Lock Picks",
        "weight": 18,
        "metadata": {
          "useMessage": "I'll need a lock. Otherwise I'm just poking the atmosphere."
        }
      },
      {
        "id": "fake_id",
        "type": "document",
        "label": "Fake ID Cards",
        "weight": 14,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "Tempting, but I'd have to remember another birthday."
        }
      }
    ],
    "animation": {
      "type": "slide_open_down",
      "duration": 500
    },
    "afterSearchText": "The cabinet is empty. For once, furniture has no secrets."
  },
  "safe": {
    "id": "safe",
    "label": "Wall Safe",
    "type": "furniture",
    "description": "A small wall-mounted safe. It requires a key and has the emotional warmth of a tax audit.",
    "position": {
      "x": 950,
      "y": 350
    },
    "size": {
      "w": 90,
      "h": 110
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "requiresItem": "safe_key",
    "possibleContents": [
      {
        "id": "passport_original",
        "type": "document",
        "label": "Passport (Original)",
        "weight": 25,
        "metadata": {
          "useMessage": "I leave the passport intact. Identity theft would complicate the paperwork."
        }
      },
      {
        "id": "diamond_ring",
        "type": "object",
        "label": "Diamond Ring",
        "weight": 15,
        "metadata": {
          "useMessage": "Sparkly. Still evidence. Tragically not my bonus."
        }
      },
      {
        "id": "offshore_account_info",
        "type": "document",
        "label": "Offshore Account Info",
        "weight": 20,
        "metadata": {
          "useMessage": "I inspect the account details. My savings remain aggressively onshore."
        }
      },
      {
        "id": "will_document",
        "type": "document",
        "label": "Will / Testament",
        "weight": 12,
        "metadata": {
          "useMessage": "I read the will. Leaving everything to 'the detective' would have been a nice touch."
        }
      },
      {
        "id": "blackmail_evidence",
        "type": "document",
        "label": "Blackmail Evidence",
        "weight": 18,
        "metadata": {
          "useMessage": "I resist adding dramatic red string. Professional restraint."
        }
      },
      {
        "id": "escape_fund",
        "type": "object",
        "label": "Large Cash Bundle (Escape Fund)",
        "weight": 22,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "None of this goes into my own pockets. An inspiring display of professional ethics."
        }
      },
      {
        "id": "plane_booking",
        "type": "document",
        "label": "Plane Booking (Confirmed)",
        "weight": 21,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "I hold it like a boarding pass. Nothing happens. Particularly not boarding."
        }
      }
    ],
    "animation": {
      "type": "swing_open",
      "duration": 500
    },
    "afterSearchText": "The safe is empty. It has been robbed of its dignity."
  },
  "instrument_case": {
    "id": "instrument_case",
    "label": "Instrument Case",
    "type": "container",
    "description": "An oversized instrument case. Either someone plays cello, or someone watches too many crime films.",
    "position": {
      "x": 710,
      "y": 585
    },
    "size": {
      "w": 185,
      "h": 90
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "preferredForMissionArtifact": true,
    "possibleContents": [
      {
        "id": "__MISSION_ARTIFACT__",
        "type": "artifact",
        "label": "Stolen Artefact",
        "role": "missionArtifact",
        "metadata": {
          "useMessage": "'The detective broke it' would be a terrible ending to the recovery report."
        }
      },
      {
        "id": "__ESCAPE_CLUE__",
        "type": "document",
        "label": "Travel Evidence",
        "role": "escapeClue",
        "metadata": {
          "useMessage": "I keep the travel evidence flat. No paper aeroplanes until after the trial."
        }
      },
      {
        "id": "artifact_research",
        "type": "document",
        "label": "Artifact Research Notes",
        "weight": 20,
        "metadata": {
          "useMessage": "I study the notes. The closest I've come to doing my homework in years."
        }
      },
      {
        "id": "travel_guide",
        "type": "document",
        "label": "Travel Guide (Heavily Marked)",
        "weight": 16,
        "isEscapeClue": true,
        "metadata": {
          "useMessage": "I open the travel guide. Sightseeing will have to wait for a less criminal holiday."
        }
      },
      {
        "id": "old_letters",
        "type": "document",
        "label": "Old Letters",
        "weight": 12,
        "metadata": {
          "useMessage": "Paper: the original way to leave someone on read."
        }
      }
    ],
    "animation": {
      "type": "swing_open",
      "duration": 500
    },
    "afterSearchText": "The case is empty now. Even the cello has an alibi."
  },
  "wine_rack": {
    "id": "wine_rack",
    "label": "Wine Rack",
    "type": "decoration",
    "description": "Wine bottles. Several are missing, presumably on an extended vacation.",
    "position": {
      "x": 400,
      "y": 550
    },
    "size": {
      "w": 100,
      "h": 140
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "wine_sale_receipt",
        "type": "document",
        "label": "Recent Wine Sale Receipt",
        "weight": 18,
        "metadata": {
          "useMessage": "I inspect the receipt. It has considerably less body than the wine."
        }
      },
      {
        "id": "auction_catalog",
        "type": "document",
        "label": "Auction House Catalog",
        "weight": 15,
        "metadata": {
          "useMessage": "I browse the catalogue. My budget can comfortably cover the page numbers."
        }
      },
      {
        "id": "empty_wine_bottles",
        "type": "object",
        "label": "Empty Wine Bottles (Recently Sold)",
        "weight": 12,
        "isRedHerring": true,
        "metadata": {
          "useMessage": "I check the bottle. Still empty. A tragedy with excellent repeatability."
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": "Nothing else here. The wine has made a cleaner getaway than the suspect."
  },
  "jewelry_box": {
    "id": "jewelry_box",
    "label": "Jewelry Box",
    "type": "container",
    "description": "An ornate jewelry box on the shelf. Small enough for secrets, not large enough for a stolen statue.",
    "position": {
      "x": 500,
      "y": 200
    },
    "size": {
      "w": 80,
      "h": 60
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "engagement_ring",
        "type": "object",
        "label": "Engagement Ring",
        "weight": 15,
        "metadata": {
          "useMessage": "I consider proposing to the case. We're already spending too much time together."
        }
      },
      {
        "id": "family_heirloom_photo",
        "type": "photo",
        "label": "Photo of Family Heirloom",
        "weight": 22,
        "metadata": {
          "useMessage": "I study the photograph. Handling it more dramatically won't make it clearer."
        }
      },
      {
        "id": "empty_jewelry_box",
        "type": "object",
        "label": "Box (Recently Emptied)",
        "weight": 12,
        "metadata": {
          "useMessage": "I open it again. It remains committed to its central theme."
        }
      }
    ],
    "animation": {
      "type": "swing_open",
      "duration": 500
    },
    "afterSearchText": "The jewelry box contains no more mysteries. Just felt lining and disappointment."
  },
  "lamp": {
    "id": "lamp",
    "label": "Table Lamp",
    "type": "furniture",
    "description": "A brass table lamp. The base seems hollow, which is suspiciously on brand for this apartment.",
    "position": {
      "x": 700,
      "y": 450
    },
    "size": {
      "w": 40,
      "h": 100
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "hidden_cash",
        "type": "object",
        "label": "Hidden Money in Base",
        "weight": 20,
        "metadata": {
          "useMessage": "Evidence money. The least spendable kind of money."
        }
      },
      {
        "id": "usb_drive",
        "type": "object",
        "label": "USB Drive (Evidence)",
        "weight": 18,
        "metadata": {
          "useMessage": "I'll keep it away from random computers. Evidence isn't improved by adding malware."
        }
      },
      {
        "id": "memory_card",
        "type": "object",
        "label": "Memory Card (Photos)",
        "weight": 15,
        "metadata": {
          "useMessage": "My eyes remain stubbornly incompatible with digital storage."
        }
      },
      {
        "id": "key_in_lamp",
        "type": "key",
        "label": "Key Hidden in Lamp Base",
        "weight": 16,
        "metadata": {
          "useMessage": "I inspect the key. It needs a lock, not another lamp."
        }
      }
    ],
    "animation": {
      "type": "shake",
      "duration": 400
    },
    "afterSearchText": "The lamp has no more secrets. It is still a terrible lamp."
  },
  "sofa": {
    "id": "sofa",
    "label": "Sofa Cushions",
    "type": "furniture",
    "description": "Soft cushions. Something may be hidden between them, along with several years of crumbs.",
    "position": {
      "x": 550,
      "y": 380
    },
    "size": {
      "w": 180,
      "h": 60
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "lost_key",
        "type": "key",
        "label": "Lost Key",
        "weight": 18,
        "metadata": {
          "useMessage": "I turn the key in the air. The air remains unlocked."
        }
      },
      {
        "id": "love_letter",
        "type": "document",
        "label": "Love Letter",
        "weight": 12,
        "metadata": {
          "useMessage": "I practise reading it romantically. The evidence declines to press charges."
        }
      },
      {
        "id": "lost_cash",
        "type": "object",
        "label": "Forgotten Cash",
        "weight": 15,
        "metadata": {
          "useMessage": "I resist adopting it. Evidence bag, not retirement plan."
        }
      },
      {
        "id": "broken_necklace",
        "type": "object",
        "label": "Broken Necklace",
        "weight": 10,
        "metadata": {
          "useMessage": "Jewellery repair remains outside my jurisdiction."
        }
      },
      {
        "id": "hotel_key_card",
        "type": "key",
        "label": "Hotel Key Card",
        "weight": 14,
        "metadata": {
          "useMessage": "Trying every door in town would apparently constitute a crime spree."
        }
      },
      {
        "id": "torn_ticket",
        "type": "document",
        "label": "Torn Ticket (Fragment)",
        "weight": 12,
        "metadata": {
          "useMessage": "Squinting does not restore the missing half. Worth ruling out."
        }
      },
      {
        "id": "__ESCAPE_FRAGMENT_B__",
        "type": "key",
        "label": "Hotel Key Card",
        "role": "escapeFragmentB",
        "metadata": {
          "useMessage": "I'll need the right door. Waving it confidently is not a substitute."
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": "You have searched the cushions. Your hand will never feel clean again."
  },
  "desk_computer": {
    "id": "desk_computer",
    "label": "Desktop Computer",
    "type": "furniture",
    "description": "An old desktop computer. Powered down, unlike its owner’s escape plan.",
    "position": {
      "x": 350,
      "y": 200
    },
    "size": {
      "w": 100,
      "h": 80
    },
    "canBeLocked": false,
    "canBeOpen": false,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "email_screenshot",
        "type": "document",
        "label": "Email Confirmation (Screenshot)",
        "weight": 20,
        "metadata": {
          "useMessage": "I consider replying to the screenshot. Technology wisely refuses."
        }
      },
      {
        "id": "search_history",
        "type": "document",
        "label": "Browser History Printout",
        "weight": 15,
        "metadata": {
          "useMessage": "Some things cannot be unseen. Most of them should never be printed."
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": "The computer has been searched. Its browser history is somehow even sadder than expected."
  },
  "nightstand_drawer": {
    "id": "nightstand_drawer",
    "label": "Side Table Drawer",
    "type": "furniture",
    "description": "A small drawer. It may be locked, which is a lot of drama for a piece of furniture this size.",
    "position": {
      "x": 200,
      "y": 500
    },
    "size": {
      "w": 60,
      "h": 70
    },
    "canBeLocked": true,
    "canBeOpen": true,
    "canHoldRequiredContent": false,
    "possibleContents": [
      {
        "id": "nightstand_key",
        "type": "key",
        "label": "Small Key (Drawer Key)",
        "weight": 12,
        "metadata": {
          "useMessage": "A tiny key with a very specific career ahead of it."
        }
      },
      {
        "id": "private_letters",
        "type": "document",
        "label": "Private Letters (Bundled)",
        "weight": 18,
        "metadata": {
          "useMessage": "Professional nosiness is in my job description. Somewhere near the bottom."
        }
      },
      {
        "id": "sleeping_pills",
        "type": "object",
        "label": "Sleeping Pills (Empty Bottle)",
        "weight": 10,
        "metadata": {
          "useMessage": "I leave the empty bottle alone. It has already done all the sleeping it can."
        }
      },
      {
        "id": "passport_page",
        "type": "document",
        "label": "Passport (Single Page)",
        "weight": 14,
        "metadata": {
          "useMessage": "Not enough to travel. Plenty enough to look suspicious at an airport."
        }
      }
    ],
    "animation": {
      "type": "slide_open_right",
      "duration": 400
    },
    "afterSearchText": "The tiny drawer has surrendered all of its tiny secrets."
  },
  "framed_photo": {
    "id": "framed_photo",
    "label": "Framed Photo",
    "type": "decoration",
    "description": "A photo in a frame on the shelf. The back looks more interesting than the smiling faces.",
    "position": {
      "x": 450,
      "y": 150
    },
    "size": {
      "w": 100,
      "h": 120
    },
    "canBeLocked": false,
    "canBeOpen": true,
    "canHoldRequiredContent": true,
    "possibleContents": [
      {
        "id": "photo_back_message",
        "type": "document",
        "label": "Message on Photo Back",
        "weight": 15,
        "metadata": {
          "useMessage": "I turn it over carefully. No need to give the message a second crime scene."
        }
      },
      {
        "id": "hidden_behind_frame",
        "type": "key",
        "label": "Item Hidden Behind Frame",
        "weight": 16,
        "metadata": {
          "useMessage": "I'll need something with a keyhole. Preferably the correct keyhole."
        }
      },
      {
        "id": "__ESCAPE_FRAGMENT_A__",
        "type": "document",
        "label": "Torn Travel Document",
        "role": "escapeFragmentA",
        "metadata": {
          "useMessage": "Squinting does not restore the missing half. Worth ruling out."
        }
      }
    ],
    "animation": {
      "type": "none",
      "duration": 0
    },
    "afterSearchText": "The photo smiles back. It knows nothing. Probably."
  }
};

export const RED_HERRING_CONTENTS = [
  {
    "id": "theater_tickets",
    "type": "document",
    "label": "Theater Tickets",
    "hint": "A night out. Innocent.",
    "metadata": {
      "useMessage": "This case already contains enough questionable performances."
    }
  },
  {
    "id": "restaurant_receipt",
    "type": "document",
    "label": "Restaurant Receipt",
    "hint": "Expensive dinner. But for a date?",
    "metadata": {
      "useMessage": "Looking at someone else's dinner does not count as lunch."
    }
  },
  {
    "id": "concert_poster",
    "type": "photo",
    "label": "Concert Poster (Signed)",
    "hint": "Collectable memorabilia.",
    "metadata": {
      "useMessage": "I resist putting it on the office wall. Evidence isn't a decorating budget."
    }
  },
  {
    "id": "birthday_card",
    "type": "document",
    "label": "Birthday Card",
    "hint": "From someone who cares.",
    "metadata": {
      "useMessage": "No money falls out. This investigation has everything except perks."
    }
  },
  {
    "id": "gym_membership",
    "type": "document",
    "label": "Gym Membership Card",
    "hint": "Fitness routine. Normal.",
    "metadata": {
      "useMessage": "I hold the card. My fitness does not improve. False advertising."
    }
  },
  {
    "id": "magazine",
    "type": "document",
    "label": "Magazine",
    "hint": "Hobby interest. Nothing suspicious.",
    "metadata": {
      "useMessage": "I leaf through it carefully. The quizzes can wait until after the arrest."
    }
  },
  {
    "id": "pet_vaccination",
    "type": "document",
    "label": "Pet Vaccination Record",
    "hint": "Responsible pet owner.",
    "metadata": {
      "useMessage": "The pet has better paperwork than most of our suspects."
    }
  },
  {
    "id": "library_card",
    "type": "document",
    "label": "Library Card",
    "hint": "Well-read person.",
    "metadata": {
      "useMessage": "I could borrow 'How to Finish This Case'. Ideally before it's overdue."
    }
  },
  {
    "id": "lottery_ticket",
    "type": "document",
    "label": "Lottery Ticket",
    "hint": "Dreams of fortune like everyone else.",
    "metadata": {
      "useMessage": "I check it hopefully. Detective work remains my primary source of income."
    }
  },
  {
    "id": "property_deed",
    "type": "document",
    "label": "Property Deed",
    "hint": "Real estate. Legitimate ownership.",
    "metadata": {
      "useMessage": "Holding this doesn't make me a homeowner. I've checked twice."
    }
  },
  {
    "id": "coffee_receipt",
    "type": "document",
    "label": "Coffee Shop Receipt",
    "hint": "Just a morning coffee.",
    "metadata": {
      "useMessage": "I try to extract caffeine from the receipt. Science lets me down again."
    }
  },
  {
    "id": "vacation_brochure",
    "type": "document",
    "label": "Vacation Brochure",
    "hint": "Dreams of travel. Who does not have those?",
    "metadata": {
      "useMessage": "For three glorious seconds, I'm emotionally on holiday."
    }
  },
  {
    "id": "book_receipt",
    "type": "document",
    "label": "Book Store Receipt",
    "hint": "Enjoys reading.",
    "metadata": {
      "useMessage": "I read the receipt. Technically, that counts as reading."
    }
  },
  {
    "id": "concert_ticket",
    "type": "document",
    "label": "Concert Ticket Stub",
    "hint": "Went to a show.",
    "metadata": {
      "useMessage": "No music. Not even a refund."
    }
  },
  {
    "id": "museum_pass",
    "type": "document",
    "label": "Museum Annual Pass",
    "hint": "Cultural interests.",
    "metadata": {
      "useMessage": "Usually I enter museums after someone has made a much less polite entrance."
    }
  }
];

export const ESCAPE_CLUES = {
  "plane_ticket_receipt": {
    "id": "plane_ticket_receipt",
    "type": "document",
    "label": "Flight Booking Receipt",
    "weight": 22,
    "description": "A booking under a false identity. Departure: tomorrow morning.",
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": "A booking receipt, not a boarding pass. Confidence alone won't get me onto a plane."
    }
  },
  "passport_copy": {
    "id": "passport_copy",
    "type": "document",
    "label": "Fake Passport",
    "weight": 20,
    "description": "A convincing fake. Different name. Different identity. Same terrible photo.",
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": "I compare the passport with my face. No. Not even after a difficult weekend."
    }
  },
  "travel_guide": {
    "id": "travel_guide",
    "type": "document",
    "label": "Travel Guide (Heavily Marked)",
    "weight": 18,
    "description": "Several cities are marked. This is not a holiday itinerary.",
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": "I open the travel guide. Sightseeing will have to wait for a less criminal holiday."
    }
  },
  "escape_fund": {
    "id": "escape_fund",
    "type": "object",
    "label": "Large Cash Bundle (Escape Fund)",
    "weight": 24,
    "description": "Hundreds of thousands in various currencies. Someone planned a very expensive disappearance.",
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": "None of this goes into my own pockets. An inspiring display of professional ethics."
    }
  },
  "plane_booking": {
    "id": "plane_booking",
    "type": "document",
    "label": "Plane Booking (Confirmed)",
    "weight": 25,
    "description": "A printed confirmation for a flight departing in six hours.",
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": "I hold it like a boarding pass. Nothing happens. Particularly not boarding."
    }
  },
  "hotel_reservation": {
    "id": "hotel_reservation",
    "type": "document",
    "label": "Foreign Hotel Reservation",
    "weight": 20,
    "description": "A hotel booking abroad. Check-in: tomorrow.",
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": "I consider room service. Then I remember whose reservation this is."
    }
  },
  "visa_stamp": {
    "id": "visa_stamp",
    "type": "document",
    "label": "Fresh Visa Stamp",
    "weight": 19,
    "description": "Recent visa approval. Destination: South America.",
    "isEscapeClue": true,
    "escapeMethod": "direct",
    "metadata": {
      "useMessage": "I inspect the stamp. International borders remain unimpressed by my paperwork collection."
    }
  }
};

export const ESCAPE_COMBINATION_ITEMS = {
  "torn_ticket": {
    "id": "torn_ticket",
    "type": "document",
    "label": "Torn Ticket (Fragment)",
    "description": "Only the departure code and half a surname remain.",
    "isClue": false,
    "isEscapeFragment": true,
    "escapeFragmentRole": "A",
    "metadata": {
      "useMessage": "Squinting does not restore the missing half. Worth ruling out."
    }
  },
  "hotel_key_card": {
    "id": "hotel_key_card",
    "type": "key",
    "label": "Hotel Key Card",
    "description": "A hotel key card. The hotel is abroad; the suspect apparently is too.",
    "isClue": false,
    "isEscapeFragment": true,
    "escapeFragmentRole": "B",
    "metadata": {
      "useMessage": "Trying every door in town would apparently constitute a crime spree."
    }
  }
};

export const COMBINE_RULES = {
  "split_bank_statements": {
    "requires": [
      "bank_statement_part1",
      "bank_statement_part2"
    ],
    "produces": {
      "id": "bank_statement_complete",
      "type": "document",
      "label": "Complete Bank Statement",
      "description": "The complete transfer log reveals amounts, dates and a very poor financial strategy.",
      "isClue": true,
      "metadata": {
        "useMessage": "A complete statement. More closure than my personal life."
      }
    }
  },
  "split_letter": {
    "requires": [
      "letter_piece_1",
      "letter_piece_2"
    ],
    "produces": {
      "id": "letter_complete",
      "type": "document",
      "label": "Complete Letter",
      "description": "The full message is readable at last.",
      "isClue": true,
      "metadata": {
        "useMessage": "No more missing pieces. Emotionally, I envy it."
      }
    }
  },
  "torn_ticket_assembly": {
    "requires": [
      "torn_ticket",
      "hotel_key_card"
    ],
    "produces": {
      "id": "ticket_identity_matched",
      "type": "document",
      "label": "Matching Booking Details",
      "description": "The ticket and hotel reservation identify the same false identity and the next destination.",
      "isClue": true,
      "isEscapeClue": true,
      "escapeMethod": "combined",
      "metadata": {
        "useMessage": "I keep the matched details together. No celebratory origami with the evidence."
      }
    }
  }
};

export const APARTMENT_ADDITIONAL_ITEMS = {
  "family_photo": {
    "id": "family_photo",
    "type": "photo",
    "label": "Family Photo",
    "metadata": {
      "useMessage": "I study the photograph. Saying 'enhance' achieves absolutely nothing."
    }
  },
  "recycling_bin_receipt": {
    "id": "recycling_bin_receipt",
    "type": "document",
    "label": "Recycling Bin Receipt",
    "metadata": {
      "useMessage": "I read the receipt. Even the rubbish has a better filing system than I do."
    }
  },
  "bank_statement_part1": {
    "id": "bank_statement_part1",
    "type": "document",
    "label": "Bank Statement (Part 1)",
    "metadata": {
      "useMessage": "Half a bank statement. Somehow still enough to make me feel underpaid."
    }
  },
  "bank_statement_part2": {
    "id": "bank_statement_part2",
    "type": "document",
    "label": "Bank Statement (Part 2)",
    "metadata": {
      "useMessage": "The other half of somebody else's money problems."
    }
  },
  "letter_piece_1": {
    "id": "letter_piece_1",
    "type": "document",
    "label": "Letter (Fragment 1)",
    "metadata": {
      "useMessage": "I'll keep the fragment flat. Origami won't improve the handwriting."
    }
  },
  "letter_piece_2": {
    "id": "letter_piece_2",
    "type": "document",
    "label": "Letter (Fragment 2)",
    "metadata": {
      "useMessage": "I inspect the paper. It would make more sense with the rest of the letter."
    }
  }
};

export default APARTMENT_OBJECTS_POOL;