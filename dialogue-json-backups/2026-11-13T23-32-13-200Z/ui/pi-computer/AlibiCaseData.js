import { ALIBI_INTERVIEW_SEARCH, ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';
export const ALIBI_SEARCH_ID = 'borrowed_alibi';
export const ALIBI_CONTACT_ID = 'alibi_copper_spoon';
export const ALIBI_CLUB_CONTACT_ID = 'alibi_tuesday_club';
export const ALIBI_DATA_REVISION = 4;
const BASE_SEARCH = {
  "id": "borrowed_alibi",
  "title": "The Borrowed Alibi",
  "initialKeywords": [],
  "clouds": [
    {
      "id": "places",
      "title": "PLACES / CONTACTS"
    },
    {
      "id": "people",
      "title": "PEOPLE"
    },
    {
      "id": "dinner",
      "title": "TUESDAY DINNER"
    },
    {
      "id": "documents",
      "title": "DOCUMENTS / PERMISSION"
    },
    {
      "id": "club",
      "title": "THE ALIBI BUSINESS"
    }
  ],
  "keywords": [
    {
      "id": "copper_spoon",
      "label": "The Copper Spoon",
      "cloudId": "places"
    },
    {
      "id": "tuesday",
      "label": "Tuesday",
      "cloudId": "dinner"
    },
    {
      "id": "tomato_soup",
      "label": "tomato soup",
      "cloudId": "dinner"
    },
    {
      "id": "red_wine",
      "label": "red wine",
      "cloudId": "dinner"
    },
    {
      "id": "arthur_finch",
      "label": "Arthur Finch",
      "cloudId": "people"
    },
    {
      "id": "nora_bell",
      "label": "Nora Bell",
      "cloudId": "people"
    },
    {
      "id": "simon_pike",
      "label": "Simon Pike",
      "cloudId": "people"
    },
    {
      "id": "evelyn_shaw",
      "label": "Evelyn Shaw",
      "cloudId": "people"
    },
    {
      "id": "consent",
      "label": "permission to release my receipt",
      "cloudId": "documents"
    },
    {
      "id": "receipt",
      "label": "receipt",
      "cloudId": "documents"
    },
    {
      "id": "copper_phone",
      "label": "427",
      "cloudId": "places"
    },
    {
      "id": "kitchen_failure",
      "label": "kitchen failure",
      "cloudId": "dinner"
    },
    {
      "id": "one_guest",
      "label": "one guest",
      "cloudId": "documents"
    },
    {
      "id": "tuesday_package",
      "label": "Tuesday package",
      "cloudId": "club"
    },
    {
      "id": "revision_two",
      "label": "revision 2",
      "cloudId": "club"
    },
    {
      "id": "alibi_club",
      "label": "Tuesday Alibi Club",
      "cloudId": "club"
    },
    {
      "id": "club_phone",
      "label": "428",
      "cloudId": "club"
    },
    {
      "id": "dinner_package",
      "label": "Dinner Companion package",
      "cloudId": "club"
    },
    {
      "id": "respectable_witness",
      "label": "respectable companion",
      "cloudId": "club"
    },
    {
      "id": "sample",
      "label": "free sample",
      "cloudId": "club"
    },
    {
      "id": "sample_code",
      "label": "TUE-DC-02",
      "cloudId": "club"
    }
  ],
  "pages": [
    {
      "id": "copper_home",
      "title": "The Copper Spoon | Dinner without drama",
      "address": "www.copperspoon.local",
      "brand": "THE COPPER SPOON",
      "blocks": [
        [
          {
            "keywordId": "copper_spoon"
          },
          " — sensible food, unreasonable tablecloths."
        ],
        [
          "Open Monday to Saturday, 12:00–22:00. Cold sandwiches available even when our ambitions exceed our equipment."
        ]
      ],
      "links": [
        {
          "label": "Menu",
          "pageId": "copper_menu"
        },
        {
          "label": "Service notice",
          "pageId": "copper_notice"
        },
        {
          "label": "Contact",
          "pageId": "copper_contact"
        }
      ],
      "snippet": "Menus, opening hours and restaurant enquiries."
    },
    {
      "id": "copper_menu",
      "title": "Menu | The Copper Spoon",
      "address": "www.copperspoon.local/menu",
      "brand": "THE COPPER SPOON",
      "blocks": [
        [
          "USUAL EVENING MENU"
        ],
        [
          {
            "keywordId": "tomato_soup"
          },
          " — $6. Cheese sandwich — $8. Sparkling water — $3."
        ],
        [
          "This is our standard menu, not a record of what was served on a particular evening."
        ]
      ],
      "links": [
        {
          "label": "Service notice",
          "pageId": "copper_notice"
        },
        {
          "label": "Contact",
          "pageId": "copper_contact"
        }
      ],
      "snippet": "Our usual menu. Availability may vary."
    },
    {
      "id": "copper_notice",
      "title": "Tuesday service notice | The Copper Spoon",
      "address": "www.copperspoon.local/notices/tuesday",
      "brand": "THE COPPER SPOON",
      "blocks": [
        [
          "A NOTE ABOUT ",
          {
            "keywordId": "tuesday"
          },
          " EVENING"
        ],
        [
          "Due to a ",
          {
            "keywordId": "kitchen_failure"
          },
          ", the hot kitchen was closed throughout Tuesday evening. Cold sandwiches and drinks remained available."
        ],
        [
          "For questions about a particular visit, please contact the manager. We apologise for the inconvenience. The cooker has declined to comment."
        ]
      ],
      "links": [
        {
          "label": "Contact",
          "pageId": "copper_contact"
        },
        {
          "label": "Menu",
          "pageId": "copper_menu"
        }
      ],
      "snippet": "An apology from the kitchen."
    },
    {
      "id": "copper_contact",
      "title": "Contact | The Copper Spoon",
      "address": "www.copperspoon.local/contact",
      "brand": "THE COPPER SPOON",
      "blocks": [
        [
          "Restaurant enquiries: ",
          {
            "keywordId": "copper_phone"
          },
          " (local)."
        ],
        [
          "Ask the manager about service on a particular evening."
        ],
        [
          "Copies of a customer’s ",
          {
            "keywordId": "receipt"
          },
          " require that customer’s permission. We protect your privacy even when you order extra mayonnaise."
        ]
      ],
      "links": [
        {
          "label": "Home",
          "pageId": "copper_home"
        },
        {
          "label": "Service notice",
          "pageId": "copper_notice"
        }
      ],
      "snippet": "Speak to the manager about a visit or receipt."
    },
    {
      "id": "club_home",
      "title": "Tuesday Alibi Club | A better yesterday",
      "address": "www.tuesdayclub.local",
      "brand": "TUESDAY ALIBI CLUB",
      "blocks": [
        [
          {
            "keywordId": "alibi_club"
          }
        ],
        [
          "Our next meeting has been cancelled on legal advice. Telephone enquiries remain open. The lawyer did not specifically mention the telephone."
        ],
        [
          "Looking for our ",
          {
            "keywordId": "tuesday_package"
          },
          "? Browse our companionship services."
        ]
      ],
      "links": [
        {
          "label": "Packages",
          "pageId": "club_packages"
        },
        {
          "label": "Contact",
          "pageId": "club_contact"
        }
      ],
      "snippet": "Were you somewhere last Tuesday? Would you like to have been somewhere else?"
    },
    {
      "id": "club_packages",
      "title": "Dinner Companion | Tuesday Alibi Club",
      "address": "www.tuesdayclub.local/packages/tuesday",
      "brand": "TUESDAY ALIBI CLUB",
      "blocks": [
        [
          {
            "keywordId": "dinner_package"
          }
        ],
        [
          "A named dining companion, a restaurant and a memorable evening. Available as the ",
          {
            "keywordId": "tuesday_package"
          },
          ", ",
          {
            "keywordId": "revision_two"
          },
          "."
        ],
        [
          "Includes venue details and a conversation outline. Optional embarrassment available at no extra charge."
        ],
        [
          "Prospective clients may telephone for a demonstration. Packages describe a story; they do not make that story true."
        ]
      ],
      "links": [
        {
          "label": "Home",
          "pageId": "club_home"
        },
        {
          "label": "Contact",
          "pageId": "club_contact"
        }
      ],
      "snippet": "Dinner companions, conversational details and impressive consistency."
    },
    {
      "id": "club_contact",
      "title": "Enquiries | Tuesday Alibi Club",
      "address": "www.tuesdayclub.local/contact",
      "brand": "TUESDAY ALIBI CLUB",
      "blocks": [
        [
          "Enquiries: ",
          {
            "keywordId": "club_phone"
          },
          " (local)."
        ],
        [
          "Ask about the ",
          {
            "keywordId": "dinner_package"
          },
          ". Demonstration material can be sent to a mailbox you nominate during the call."
        ],
        [
          "Do not ask where we were last Tuesday. That information is available in our premium package."
        ]
      ],
      "links": [
        {
          "label": "Packages",
          "pageId": "club_packages"
        },
        {
          "label": "Home",
          "pageId": "club_home"
        }
      ],
      "snippet": "Private enquiries. Public denials."
    }
  ],
  "recipes": [
    {
      "terms": [
        "copper_spoon"
      ],
      "pageIds": [
        "copper_home",
        "copper_notice"
      ]
    },
    {
      "terms": [
        "copper_spoon",
        "tuesday"
      ],
      "pageIds": [
        "copper_notice",
        "copper_contact"
      ]
    },
    {
      "terms": [
        "copper_spoon",
        "tomato_soup"
      ],
      "pageIds": [
        "copper_menu",
        "copper_notice"
      ]
    },
    {
      "terms": [
        "copper_spoon",
        "receipt"
      ],
      "pageIds": [
        "copper_contact"
      ]
    },
    {
      "terms": [
        "copper_phone"
      ],
      "pageIds": [
        "copper_contact"
      ]
    },
    {
      "terms": [
        "tuesday_package"
      ],
      "pageIds": [
        "club_packages",
        "club_home"
      ]
    },
    {
      "terms": [
        "tuesday_package",
        "revision_two"
      ],
      "pageIds": [
        "club_packages"
      ]
    },
    {
      "terms": [
        "alibi_club"
      ],
      "pageIds": [
        "club_home",
        "club_contact"
      ]
    },
    {
      "terms": [
        "dinner_package"
      ],
      "pageIds": [
        "club_packages",
        "club_contact"
      ]
    },
    {
      "terms": [
        "club_phone"
      ],
      "pageIds": [
        "club_contact"
      ]
    }
  ]
};
export const ALIBI_SEARCH_CASE = {
 ...BASE_SEARCH,
 clouds: [...BASE_SEARCH.clouds, ...ALIBI_INTERVIEW_SEARCH.clouds],
 keywords: [...BASE_SEARCH.keywords, ...ALIBI_INTERVIEW_SEARCH.keywords],
 pages: [...BASE_SEARCH.pages, ...ALIBI_INTERVIEW_SEARCH.pages],
 recipes: [...BASE_SEARCH.recipes, ...ALIBI_INTERVIEW_SEARCH.recipes]
};
export const ALIBI_PHONE_CONTACT = {
  "id": "alibi_copper_spoon",
  "caseId": "borrowed_alibi",
  "number": "427",
  "name": "The Copper Spoon — Manager",
  "requiresKeyword": "copper_phone",
  "choicePrompt": "The manager is listening. Choose one or two details from your notes.",
  "greeting": [
    {
      "speaker": "Manager",
      "text": "The Copper Spoon. If this is about Tuesday, the cooker is still refusing interviews."
    },
    {
      "speaker": "You",
      "text": "I am investigating a dinner. May I ask a few questions?"
    },
    {
      "speaker": "Manager",
      "text": "Certainly. Please be more specific than our last restaurant critic."
    }
  ],
  "fallback": [
    {
      "speaker": "Manager",
      "text": "I cannot confirm a connection between those details. Ask about Tuesday service, or name the customer and the permission they gave you."
    }
  ],
  "topics": [
    {
      "id": "tuesday_service",
      "terms": [
        "tuesday"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "no_hot_food"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "What did you serve on Tuesday evening?"
        },
        {
          "speaker": "Manager",
          "text": "Cold sandwiches and drinks. The hot kitchen was out of action all evening. No soup. We served sandwiches and an apology."
        }
      ]
    },
    {
      "id": "tuesday_soup",
      "terms": [
        "tuesday",
        "tomato_soup"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "no_hot_food"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "Could someone have ordered tomato soup on Tuesday evening?"
        },
        {
          "speaker": "Manager",
          "text": "No. The hot kitchen was closed throughout the evening. Tomato soup appears on our usual menu, but it was not served that Tuesday."
        }
      ]
    },
    {
      "id": "kitchen_failure",
      "terms": [
        "kitchen_failure"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "no_hot_food"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "How long was the kitchen out of service?"
        },
        {
          "speaker": "Manager",
          "text": "The whole of Tuesday evening. We kept the dining room open for cold food and drinks. The cooker had a better evening than we did."
        }
      ]
    },
    {
      "id": "arthur_privacy",
      "terms": [
        "arthur_finch"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": "You",
          "text": "Can you confirm Arthur Finch’s order and who was with him?"
        },
        {
          "speaker": "Manager",
          "text": "I cannot disclose a customer’s individual records without permission. If Mr Finch has authorised release of his receipt, tell me that."
        }
      ]
    },
    {
      "id": "receipt_privacy",
      "terms": [
        "receipt"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": "You",
          "text": "Can I obtain a customer’s receipt?"
        },
        {
          "speaker": "Manager",
          "text": "With their permission. I need the customer’s name and their authorisation. Being curious is not an authorisation."
        }
      ]
    },
    {
      "id": "consent_general",
      "terms": [
        "consent"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": "You",
          "text": "I have the customer’s permission to release a receipt."
        },
        {
          "speaker": "Manager",
          "text": "Then please give me the customer’s name together with that permission."
        }
      ]
    },
    {
      "id": "arthur_receipt",
      "terms": [
        "arthur_finch",
        "consent"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "receipt_received"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "Arthur Finch gave me permission to obtain his Tuesday receipt. Please send a copy to my office."
        },
        {
          "speaker": "Manager",
          "text": "I have his written authorisation through the classifieds relay. Here is the relevant receipt: one diner, one cheese sandwich and one sparkling water."
        },
        {
          "speaker": "Manager",
          "text": "Opened at 19:04. Paid at 19:48. There is no soup or wine on that order. I have sent the copy to your office mailbox."
        }
      ]
    },
    {
      "id": "wine_general",
      "terms": [
        "red_wine"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": "You",
          "text": "Does a story about spilled red wine identify a particular diner?"
        },
        {
          "speaker": "Manager",
          "text": "Not by itself. Stained tablecloths are not a guest register. I would need an authorised record for the customer you are asking about."
        }
      ]
    }
  ]
};
export const ALIBI_CLUB_CONTACT = {
  "id": "alibi_tuesday_club",
  "caseId": "borrowed_alibi",
  "number": "428",
  "name": "Tuesday Alibi Club — Membership",
  "requiresKeyword": "club_phone",
  "choicePrompt": "You are posing as a prospective customer. What do you ask?",
  "greeting": [
    {
      "speaker": "Membership secretary",
      "text": "Tuesday Alibi Club. Yesterday, improved."
    },
    {
      "speaker": "You",
      "text": "I am enquiring as a prospective customer."
    },
    {
      "speaker": "Membership secretary",
      "text": "Wonderful. Discretion is our second-most important principle. We cannot disclose the first."
    }
  ],
  "fallback": [
    {
      "speaker": "Membership secretary",
      "text": "Start with our Dinner Companion package. If we have discussed it, I can offer a free sample. We do not discuss existing clients."
    }
  ],
  "topics": [
    {
      "id": "club_general",
      "terms": [
        "alibi_club"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": "You",
          "text": "Your website says the meeting was cancelled. Are you still taking enquiries?"
        },
        {
          "speaker": "Membership secretary",
          "text": "The meeting was cancelled. Not the concept of having been somewhere else. Our Dinner Companion package is still available."
        }
      ]
    },
    {
      "id": "club_dinner_pitch",
      "terms": [
        "dinner_package"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "club_pitch_heard"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "I saw your Dinner Companion package. I might need a more sociable Tuesday. What does it include?"
        },
        {
          "speaker": "Membership secretary",
          "text": "A restaurant, a timetable and a respectable companion. Our clients find consistency very reassuring.",
          "fragments": [
            "A restaurant, a timetable and a ",
            {
              "keywordId": "respectable_witness",
              "text": "respectable companion"
            },
            ". Our clients find consistency very reassuring."
          ]
        },
        {
          "speaker": "Membership secretary",
          "text": "You may request a free sample before deciding. No payment or subscription is required.",
          "fragments": [
            "You may request a ",
            {
              "keywordId": "sample",
              "text": "free sample"
            },
            " before deciding. No payment or subscription is required."
          ]
        }
      ]
    },
    {
      "id": "club_companion",
      "terms": [
        "respectable_witness"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [
        "club_witness_claim"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "Does the respectable companion know they are my companion?"
        },
        {
          "speaker": "Membership secretary",
          "text": "Our companions are independent. Some are so independent they do not know they work for us."
        }
      ]
    },
    {
      "id": "club_sample",
      "terms": [
        "sample"
      ],
      "requiresFlags": [
        "club_pitch_heard"
      ],
      "grantKeywords": [],
      "grantFlags": [
        "club_sample_received"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "Please send the free sample to my office mailbox through the same classifieds reply relay I am using for this enquiry."
        },
        {
          "speaker": "Membership secretary",
          "text": "Certainly. A demonstration only — no purchase and no subscription."
        },
        {
          "speaker": "Membership secretary",
          "text": "I have sent the Dinner Companion example, TUE-DC-02. Please read the small print. It is where we keep most of the honesty."
        }
      ]
    },
    {
      "id": "club_sample_named",
      "terms": [
        "dinner_package",
        "sample"
      ],
      "requiresFlags": [
        "club_pitch_heard"
      ],
      "grantKeywords": [],
      "grantFlags": [
        "club_sample_received"
      ],
      "lines": [
        {
          "speaker": "You",
          "text": "May I see the free sample for the Dinner Companion package? Please send it to my office mailbox through my classifieds reply relay."
        },
        {
          "speaker": "Membership secretary",
          "text": "Sent. The demonstration is free. Please do not mistake sample companionship for an actual social life."
        }
      ]
    },
    {
      "id": "club_privacy_arthur",
      "terms": [
        "arthur_finch"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": "You",
          "text": "Do your dinner packages use Arthur Finch?"
        },
        {
          "speaker": "Membership secretary",
          "text": "We do not discuss names from our demonstration material over the telephone. Request the sample if you want to inspect what is on offer."
        }
      ]
    },
    {
      "id": "club_privacy_evelyn",
      "terms": [
        "evelyn_shaw"
      ],
      "requiresFlags": [],
      "grantKeywords": [],
      "grantFlags": [],
      "lines": [
        {
          "speaker": "You",
          "text": "Is Evelyn Shaw a customer?"
        },
        {
          "speaker": "Membership secretary",
          "text": "We do not discuss existing clients. Not even the ones who ask us to remove the footer before sending the story."
        }
      ]
    }
  ]
};
export function mergeAlibiSearch(data) {
 return {...data,cases:[...(data.cases||[]).filter(c=>c.id!==ALIBI_SEARCH_ID),ALIBI_SEARCH_CASE]};
}
export function mergeAlibiPhone(data) {
 const contacts=[ALIBI_PHONE_CONTACT,ALIBI_CLUB_CONTACT,...ALIBI_INTERVIEW_CONTACTS];
 const ids=new Set(contacts.map(c=>c.id));
 return {...data,contacts:[...(data.contacts||[]).filter(c=>!ids.has(c.id)),...contacts]};
}
