// TV station identities and display text. Fictional stories contain no live case facts.
export const TV_STATIONS = [
  {
    "id": "aurora",
    "name": "Aurora One",
    "number": "01",
    "movie": "drama",
    "label": "DRAMA",
    "title": "Aurora Cinema",
    "anchorKey": "tv_anchor_generic",
    "anchorName": "Arthur Factwell",
    "bulletinTitle": "The Heritage Desk",
    "tagline": "Objects matter. Context is everything.",
    "theme": {
      "screenColor": "#142933",
      "topBarColor": "#21495b",
      "badgeColor": "#bc9141",
      "bottomColor": "#09151d"
    },
    "tickers": [
      "AURORA ONE: VERIFIED BEFORE TELEVISED",
      "CORRECTION: THE BRONZE AGE WAS NOT A FINANCIAL QUARTER",
      "MUSEUM AUDIO GUIDE APOLOGISES FOR TELLING VISITORS TO TURN LEFT INTO A WALL"
    ],
    "videoFile": "drama.mp4"
  },
  {
    "id": "velvet",
    "name": "Velvet TV",
    "number": "02",
    "movie": "romance",
    "label": "ROMANCE",
    "title": "Velvet Picture House",
    "anchorKey": "tv_anchor_genericf",
    "anchorName": "Vera Much",
    "bulletinTitle": "The Other News",
    "tagline": "Big feelings. Small print.",
    "theme": {
      "screenColor": "#30182e",
      "topBarColor": "#633454",
      "badgeColor": "#ce627f",
      "bottomColor": "#1c101d"
    },
    "tickers": [
      "VELVET TV: IF IT FEELS TRUE, WE WILL STILL ASK LEGAL",
      "TONIGHT: TWO PEOPLE ALMOST COMMUNICATE FOR NINETY MINUTES",
      "VIEWER POLL: 82 PERCENT WANT LESS ADVERTISING; OUR SPONSORS DISAGREE"
    ],
    "videoFile": "romance.mp4"
  },
  {
    "id": "reckless",
    "name": "Reckless TV",
    "number": "03",
    "movie": "action",
    "label": "ACTION",
    "title": "Reckless Cinema",
    "anchorKey": "tv_anchor_generic",
    "anchorName": "Rex Wreckford",
    "presenterTint": 16766114,
    "bulletinTitle": "Reckless Field Report",
    "tagline": "History. Danger. Questionable insurance.",
    "theme": {
      "screenColor": "#302317",
      "topBarColor": "#785026",
      "badgeColor": "#b83a22",
      "bottomColor": "#16120e"
    },
    "tickers": [
      "RECKLESS TV: HISTORY. DANGER. QUESTIONABLE INSURANCE.",
      "LOCAL HERO ESCAPES ANCIENT TRAP, ENTERS GIFT SHOP",
      "EXPEDITION LEADER ADMITS X WAS A COFFEE STAIN",
      "HENCHMAN UNION DEMANDS RAILINGS AROUND LAVA",
      "MYSTERIOUS LEVER FOUND TO CONTROL LIGHTS",
      "ARCHAEOLOGIST RETURNS ARTIFACT; MUSEUM REQUESTS RECEIPT",
      "COMING UP: CAN YOU OUTRUN A CURSE IN SENSIBLE SHOES?"
    ],
    "videoFile": "action.mp4"
  }
];

export const TV_WORDS = {
  "heritage": "HERITAGE",
  "local": "LOCAL NEWS",
  "news": "NEWS",
  "bulletin": "BULLETIN",
  "sponsored": "SPONSORED",
  "advertisement": "ADVERTISEMENT",
  "feature": "FEATURE",
  "field": "FIELD REPORT",
  "alive": "STILL ALIVE",
  "movieWarning": "The following film contains peril, poor planning and a suspicious number of identical henchmen.",
  "movieAfter": "No historical accuracy was harmed during this production. None was present.",
  "controls": "TUNE: change channel · 1 / 2 / 3: select · X: news · P: pause"
};

export const TV_HERITAGE_STORIES = [
  {
    "id": "heritage-label",
    "title": "A Small Label, A Large Argument",
    "lines": [
      "A museum has corrected a label that described a ceremonial spoon as a tiny shovel.",
      "The curator called it a triumph for accuracy. The gift shop is keeping the tiny shovels."
    ]
  },
  {
    "id": "heritage-chair",
    "title": "Please Do Not Sit On History",
    "lines": [
      "Conservators have restored a historic chair to its original condition: deeply uncomfortable.",
      "Visitors are reminded that surviving three centuries does not make furniture available for sitting."
    ]
  },
  {
    "id": "heritage-guide",
    "title": "Audio Guide Enters Its Quiet Era",
    "lines": [
      "A museum audio guide now includes thirty seconds of silence in front of every painting.",
      "The director says it encourages reflection. An engineer says somebody forgot to record track seven."
    ]
  },
  {
    "id": "heritage-vase",
    "title": "Ancient Vase Still A Vase",
    "lines": [
      "Researchers have completed a six-year study of an ancient vase.",
      "Their conclusion: probably a vase. Funding has been requested to establish what went inside."
    ]
  }
];

export const TV_OTHER_NEWS = [
  {
    "id": "local-queue",
    "title": "Queue Forms For Unexplained Reasons",
    "lines": [
      "A queue formed outside a closed building this morning after one person stopped to tie a shoelace.",
      "By noon it had a committee, a waiting list and a man insisting he had been there first."
    ]
  },
  {
    "id": "local-weather",
    "title": "Weather Remains Outside",
    "lines": [
      "The forecast is a chance of weather, increasing if you leave the house.",
      "Our meteorologist advises bringing a coat, unless you already regret bringing a coat."
    ]
  },
  {
    "id": "local-dog",
    "title": "Dog Declines To Comment",
    "lines": [
      "A dog interrupted a council meeting and received the highest approval rating of any participant.",
      "Asked about its policy platform, the dog ate a corner of it."
    ]
  },
  {
    "id": "local-phone",
    "title": "Man Answers Unknown Number",
    "lines": [
      "A local man has answered a call from an unknown number without first rehearsing a false identity.",
      "He describes the experience as life-changing. His extended warranty is now under review."
    ]
  },
  {
    "id": "local-book",
    "title": "Library Announces Extremely Quiet Scandal",
    "lines": [
      "A library dispute escalated today after a reader folded the corner of a page.",
      "Staff say the situation is under control. The phrase \"we know where you live\" was used at an appropriate volume."
    ]
  },
  {
    "id": "local-pigeons",
    "title": "Pigeons Win Right Of Way",
    "lines": [
      "Pedestrians have informally surrendered the main square to a group of pigeons.",
      "Negotiations failed when both parties insisted the other one should move first."
    ]
  }
];

export const TV_CITY_NEWS = {
  "hq": {
    "id": "local-hq",
    "title": "Agency Printer Promoted To Management",
    "lines": [
      "The office printer has been promoted after successfully delegating every task sent to it.",
      "Its first decision was to request more paper, then refuse to recognise the paper."
    ]
  },
  "paris": {
    "id": "local-paris",
    "title": "Croissant Sparks Philosophical Dispute",
    "lines": [
      "A Paris cafe has introduced a perfectly straight croissant.",
      "Customers describe it as technically edible but emotionally unacceptable."
    ]
  },
  "warsaw": {
    "id": "local-warsaw",
    "title": "Shortcut Found To Be Longer",
    "lines": [
      "A Warsaw resident has admitted that his favourite shortcut adds twelve minutes to every journey.",
      "He insists those are better minutes."
    ]
  },
  "berlin": {
    "id": "local-berlin",
    "title": "Form For Missing Forms Now Available",
    "lines": [
      "Berlin officials have introduced a form for reporting that the required form is unavailable.",
      "It must be collected from the office that does not currently have it."
    ]
  },
  "london": {
    "id": "local-london",
    "title": "Tea Goes Cold During Formal Complaint",
    "lines": [
      "A London resident has filed a formal complaint about a cup of tea going cold while he wrote a formal complaint.",
      "The matter has been referred to a warmer department."
    ]
  },
  "new_delhi": {
    "id": "local-delhi",
    "title": "Directions Include A Disappearing Landmark",
    "lines": [
      "A driver following directions to turn at the old tea stall has discovered the stall moved three years ago.",
      "Everyone agrees the directions are still perfectly clear."
    ]
  },
  "new_york_city": {
    "id": "local-nyc",
    "title": "Apartment Advertised With Separate Air",
    "lines": [
      "A New York apartment has been listed as featuring a separate breathing area.",
      "The landlord says the window is decorative and the breathing area is extra."
    ]
  }
};

export const TV_ACTION_NEWS = [
  {
    "id": "action-temple",
    "title": "The Temple of Pending Approval",
    "lines": [
      "An explorer has reached a sealed chamber untouched for three thousand years.",
      "Entry has been delayed pending approval from the building administrator.",
      "The ancient curse is expected to expire before the permit."
    ]
  },
  {
    "id": "action-pursuit",
    "title": "High-Speed Pursuit Enters Pedestrian Zone",
    "lines": [
      "A dramatic pursuit ended this morning when both vehicles encountered a pedestrian zone.",
      "The suspect continued on foot. The detective stopped to understand the parking signs.",
      "The investigation is ongoing. So is the parking charge."
    ]
  },
  {
    "id": "action-floor",
    "title": "The Floor Is Historically Significant",
    "lines": [
      "An adventurer escaped a collapsing temple by leaping across a priceless mosaic.",
      "He has been praised for his courage and invoiced for his landing.",
      "Archaeologists say the real treasure would have been using the designated walkway."
    ]
  },
  {
    "id": "action-shots",
    "title": "Shots Fired, Nobody Qualified",
    "lines": [
      "A warehouse shootout has left fourteen crates dramatically damaged.",
      "Nobody was injured, although one henchman has requested a transfer to accounting.",
      "Police recovered several hundred cartridges and no convincing explanation."
    ]
  },
  {
    "id": "action-boulder",
    "title": "Boulder Given Right Of Way",
    "lines": [
      "An expedition was interrupted by a large rolling boulder.",
      "The team initially tried reasoning with it.",
      "Negotiations have now moved to a brisk running format."
    ]
  },
  {
    "id": "action-studio",
    "title": "Reporting From Somewhere Extremely Dangerous",
    "lines": [
      "We're coming to you from an undisclosed location. Mostly because nobody booked the studio.",
      "Our correspondent has located the emergency exit, a suspicious lever and the last remaining sandwich.",
      "Only one of these discoveries is expected to survive the expedition."
    ]
  }
];

export const TV_CHANNEL_ADS = {
  "aurora": [
    {
      "id": "aurora-alibi",
      "title": "Alibi Mutual Insurance",
      "lines": [
        "When life asks where you were, be financially prepared.",
        "Alibi Mutual: cover for accidents, not explanations. Witnesses sold separately."
      ]
    },
    {
      "id": "aurora-vault",
      "title": "Probably Secure Safes",
      "lines": [
        "Our safes have never been opened by a dissatisfied customer.",
        "Probably Secure. Even we have misplaced the combination."
      ]
    },
    {
      "id": "aurora-coffee",
      "title": "Exhibit A Coffee",
      "lines": [
        "For the detective who has been awake since the previous plot twist.",
        "Exhibit A: strong enough to make paperwork look like a lead."
      ]
    },
    {
      "id": "aurora-frame",
      "title": "Frame & Fortune",
      "lines": [
        "A tasteful frame can transform any painting into an insurance conversation.",
        "Frame & Fortune. We frame art. Your relatives can handle the rest."
      ]
    }
  ],
  "velvet": [
    {
      "id": "velvet-perfume",
      "title": "Unresolved: The Fragrance",
      "lines": [
        "Top notes of mystery. A heart of poor decisions. A lingering trace of somebody else's coat.",
        "Unresolved. Leave them asking questions you do not intend to answer."
      ]
    },
    {
      "id": "velvet-couch",
      "title": "Second Chance Sofas",
      "lines": [
        "For couples who need space, but share a lease.",
        "Second Chance Sofas. Now with an emotional distance of up to three cushions."
      ]
    },
    {
      "id": "velvet-soup",
      "title": "Closure In A Cup",
      "lines": [
        "They never called back. The kettle will.",
        "Closure In A Cup: instant soup for complicated evenings."
      ]
    },
    {
      "id": "velvet-flowers",
      "title": "Last Minute Flowers",
      "lines": [
        "Say \"I remembered\" with flowers purchased while running.",
        "Last Minute Flowers. We remove the price tag and most of the evidence."
      ]
    }
  ],
  "reckless": [
    {
      "id": "reckless-rope",
      "title": "Last Rope",
      "lines": [
        "You checked the map. You checked the torch. Did you check the rope? Neither did our previous spokesman.",
        "Last Rope. Make your next cliffhanger a narrative choice."
      ]
    },
    {
      "id": "reckless-clothes",
      "title": "RuinWear",
      "lines": [
        "Clothes that say 'respected archaeologist' and wash like 'suspect fled through a sewer'.",
        "RuinWear. Dress for the civilisation you intend to disturb."
      ]
    },
    {
      "id": "reckless-henchcare",
      "title": "HenchCare",
      "lines": [
        "Dental. Pension. Clearly marked escape routes.",
        "Ask your villain about HenchCare. Now covering work-related monologues."
      ]
    },
    {
      "id": "reckless-insurance",
      "title": "Boulder Mutual",
      "lines": [
        "Covered for falling rocks. Rolling rocks require our premium plan.",
        "Boulder Mutual. Read the small print before the ceiling does."
      ]
    },
    {
      "id": "reckless-travel",
      "title": "Exit Strategy Travel",
      "lines": [
        "We book the journey out. You explain why the bridge is missing.",
        "Exit Strategy Travel. Return tickets are an expression of optimism."
      ]
    },
    {
      "id": "reckless-repellent",
      "title": "Relic Repellent",
      "lines": [
        "Keeps mosquitoes away. Ancient guardians remain a separate problem.",
        "Relic Repellent. Apply liberally. Apologise to the deity separately."
      ]
    }
  ]
};

