import { ALIBI_SEARCH_CASE, ALIBI_PHONE_CONTACT, ALIBI_CLUB_CONTACT } from './AlibiCaseData.js';
import { ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';

export const COPPER_EMAIL='receipts@copperspoon.local';
export const ALIBI_DIALOGUE_RULES=[
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_tuesday",
    "terms": [
      "tuesday"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Was the restaurant open on Tuesday evening?"
      },
      {
        "speaker": "Manager",
        "text": "The dining room was. The hot kitchen was not. Cold sandwiches, drinks and increasingly detailed apologies."
      },
      {
        "speaker": "You",
        "text": "For the whole evening?"
      },
      {
        "speaker": "Manager",
        "text": "The whole evening. A printed menu is not a record of what we could actually serve."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_soup",
    "terms": [
      "tuesday",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Could anyone have ordered tomato soup on Tuesday evening?"
      },
      {
        "speaker": "Manager",
        "text": "No. Our hot kitchen was closed throughout the evening. The soup remained on the website, where it enjoyed excellent health."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_failure",
    "terms": [
      "kitchen_failure"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "How long did the kitchen failure last?"
      },
      {
        "speaker": "Manager",
        "text": "All Tuesday evening. Cold food and drinks only. If someone claims a hot meal, compare that claim with this service record."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_wine",
    "terms": [
      "red_wine"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Would you remember spilled wine?"
      },
      {
        "speaker": "Manager",
        "text": "Perhaps. But a stained tablecloth is not a guest register."
      },
      {
        "speaker": "You",
        "text": "What would establish the visit?"
      },
      {
        "speaker": "Manager",
        "text": "An authorised receipt request. Ask me about a receipt and I will give you the address."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_arthur",
    "terms": [
      "arthur_finch"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you check Arthur Finch’s Tuesday order?"
      },
      {
        "speaker": "Manager",
        "text": "With his written permission, not just a name on the telephone."
      },
      {
        "speaker": "You",
        "text": "How do I request the record?"
      },
      {
        "speaker": "Manager",
        "text": "Ask about a receipt. I will give you our email address. The request and the authorisation must be in writing."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_arthur_permission",
    "terms": [
      "arthur_finch"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [
      "consent"
    ],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": "You",
        "text": "Arthur’s correspondence includes permission to release his receipt."
      },
      {
        "speaker": "Manager",
        "text": "Then ask for our receipt address and forward that authorisation with your request. A conversation is not a delivered document."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_receipt",
    "terms": [
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Where do I request a receipt?"
      },
      {
        "speaker": "Manager",
        "text": "receipts@copperspoon.local. Include the customer’s name, the evening and their written permission.",
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": "receipts@copperspoon.local"
          },
          ". Include the customer’s name, the evening and their written permission."
        ]
      },
      {
        "speaker": "You",
        "text": "You will reply to that email?"
      },
      {
        "speaker": "Manager",
        "text": "With the relevant record once the permission checks out. No guessing which sandwich belongs to your investigation."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_receipt_named",
    "terms": [
      "copper_spoon",
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Where do I request a receipt?"
      },
      {
        "speaker": "Manager",
        "text": "receipts@copperspoon.local. Include the customer’s name, the evening and their written permission.",
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": "receipts@copperspoon.local"
          },
          ". Include the customer’s name, the evening and their written permission."
        ]
      },
      {
        "speaker": "You",
        "text": "You will reply to that email?"
      },
      {
        "speaker": "Manager",
        "text": "With the relevant record once the permission checks out. No guessing which sandwich belongs to your investigation."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_authorised",
    "terms": [
      "arthur_finch",
      "consent"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Where do I request a receipt?"
      },
      {
        "speaker": "Manager",
        "text": "receipts@copperspoon.local. Include the customer’s name, the evening and their written permission.",
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": "receipts@copperspoon.local"
          },
          ". Include the customer’s name, the evening and their written permission."
        ]
      },
      {
        "speaker": "You",
        "text": "You will reply to that email?"
      },
      {
        "speaker": "Manager",
        "text": "With the relevant record once the permission checks out. No guessing which sandwich belongs to your investigation."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_consent",
    "terms": [
      "consent"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "I have written permission to obtain a receipt."
      },
      {
        "speaker": "Manager",
        "text": "Put the customer’s name and that authorisation in the request to receipts@copperspoon.local. “Someone said it was fine” is not an accepted document format.",
        "fragments": [
          "Put the customer’s name and that authorisation in the request to ",
          {
            "keywordId": "copper_email",
            "text": "receipts@copperspoon.local"
          },
          ". “Someone said it was fine” is not an accepted document format."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_receipt_repeat",
    "terms": [
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [
      "copper_email"
    ],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you remind me how to request the receipt?"
      },
      {
        "speaker": "Manager",
        "text": "Use receipts@copperspoon.local. Name Arthur Finch, specify Tuesday evening and forward his permission. Then check our reply in Mail. Starting a second telephone conversation does not send the first email.",
        "fragments": [
          "Use ",
          {
            "keywordId": "copper_email",
            "text": "receipts@copperspoon.local"
          },
          ". Name Arthur Finch, specify Tuesday evening and forward his permission. Then check our reply in Mail. Starting a second telephone conversation does not send the first email."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_record_received",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the receipt. What can it actually establish?"
      },
      {
        "speaker": "Manager",
        "text": "Read its date, transaction times, order and recorded guest count. Compare those facts with the original dinner claims. The total is not a personality test."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_request_record",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Where do I request a receipt?"
      },
      {
        "speaker": "Manager",
        "text": "receipts@copperspoon.local. Include the customer’s name, the evening and their written permission.",
        "fragments": [
          {
            "keywordId": "copper_email",
            "text": "receipts@copperspoon.local"
          },
          ". Include the customer’s name, the evening and their written permission."
        ]
      },
      {
        "speaker": "You",
        "text": "You will reply to that email?"
      },
      {
        "speaker": "Manager",
        "text": "With the relevant record once the permission checks out. No guessing which sandwich belongs to your investigation."
      }
    ]
  },
  {
    "contactId": "alibi_copper_spoon",
    "id": "copper_wrong_supplier",
    "terms": [
      "tuesday_package"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Does this Tuesday package establish a dinner here?"
      },
      {
        "speaker": "Manager",
        "text": "A story sold somewhere else is not an entry in our till. Ask us about Tuesday’s service or an authorised receipt. Ask the supplier for its sample."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_general",
    "terms": [
      "alibi_club"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Do you sell actual dinners?"
      },
      {
        "speaker": "Membership secretary",
        "text": "Descriptions of dinners. Actual food is difficult to standardise. Ask about the Dinner Companion package; it comes with an impressively specific yesterday."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_pitch",
    "terms": [
      "dinner_package"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "club_pitch_heard"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "What is included in Dinner Companion?"
      },
      {
        "speaker": "Membership secretary",
        "text": "A restaurant, a timetable and a respectable companion. Details make a story reassuringly specific.",
        "fragments": [
          "A restaurant, a timetable and a ",
          {
            "keywordId": "respectable_witness",
            "text": "respectable companion"
          },
          ". Details make a story reassuringly specific."
        ]
      },
      {
        "speaker": "You",
        "text": "Can I inspect an example?"
      },
      {
        "speaker": "Membership secretary",
        "text": "Ask for a free sample. No payment, subscription or actual friend required.",
        "fragments": [
          "Ask for a ",
          {
            "keywordId": "sample",
            "text": "free sample"
          },
          ". No payment, subscription or actual friend required."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_early",
    "terms": [
      "sample"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "club_pitch_heard"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": "You",
        "text": "Please send a sample."
      },
      {
        "speaker": "Membership secretary",
        "text": "Of which product? Ask about the Dinner Companion package first. Otherwise I might send our extremely unconvincing fishing trip."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample",
    "terms": [
      "sample"
    ],
    "requiresFlags": [
      "club_pitch_heard"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [
      "club_sample_received"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": "You",
        "text": "Please send the Dinner Companion demonstration to my office mailbox."
      },
      {
        "speaker": "Membership secretary",
        "text": "A demonstration only: TUE-DC-02. No payment and no subscription."
      },
      {
        "speaker": "You",
        "text": "The full example wording?"
      },
      {
        "speaker": "Membership secretary",
        "text": "Yes. It is now in your mailbox. Please read the small print. It is where we keep most of the honesty."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_repeat",
    "terms": [
      "sample"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": "You",
        "text": "Can I have the sample again?"
      },
      {
        "speaker": "Membership secretary",
        "text": "The demonstration is already in your mailbox. Read its reference and exact wording. We do not charge for repeated instructions for opening a letter."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_named_early",
    "terms": [
      "dinner_package",
      "sample"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "club_pitch_heard"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": "You",
        "text": "Please send a sample."
      },
      {
        "speaker": "Membership secretary",
        "text": "Of which product? Ask about the Dinner Companion package first. Otherwise I might send our extremely unconvincing fishing trip."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_named",
    "terms": [
      "dinner_package",
      "sample"
    ],
    "requiresFlags": [
      "club_pitch_heard"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [
      "club_sample_received"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 40,
    "lines": [
      {
        "speaker": "You",
        "text": "Please send the Dinner Companion demonstration to my office mailbox."
      },
      {
        "speaker": "Membership secretary",
        "text": "A demonstration only: TUE-DC-02. No payment and no subscription."
      },
      {
        "speaker": "You",
        "text": "The full example wording?"
      },
      {
        "speaker": "Membership secretary",
        "text": "Yes. It is now in your mailbox. Please read the small print. It is where we keep most of the honesty."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_sample_named_repeat",
    "terms": [
      "dinner_package",
      "sample"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": "You",
        "text": "Can I have the sample again?"
      },
      {
        "speaker": "Membership secretary",
        "text": "The demonstration is already in your mailbox. Read its reference and exact wording. We do not charge for repeated instructions for opening a letter."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_footer",
    "terms": [
      "tuesday_package",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Your version label appears on a dinner document."
      },
      {
        "speaker": "Membership secretary",
        "text": "It is a version label, not a customer list. Ask about the Dinner Companion package and request a sample. Compare the full wording, not merely the number two."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_witness",
    "terms": [
      "respectable_witness"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Does the named companion know they are my witness?"
      },
      {
        "speaker": "Membership secretary",
        "text": "Some are so independent they do not know they work for us. The package supplies an account, not independent confirmation."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_arthur",
    "terms": [
      "arthur_finch"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you tell me whether this person used your material?"
      },
      {
        "speaker": "Membership secretary",
        "text": "We do not disclose customers. We can supply a demonstration. Compare it with a document you already possess; I cannot make that comparison for you."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_evelyn",
    "terms": [
      "evelyn_shaw"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you tell me whether this person used your material?"
      },
      {
        "speaker": "Membership secretary",
        "text": "We do not disclose customers. We can supply a demonstration. Compare it with a document you already possess; I cannot make that comparison for you."
      }
    ]
  },
  {
    "contactId": "alibi_tuesday_club",
    "id": "club_soup",
    "terms": [
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you confirm that the soup was served?"
      },
      {
        "speaker": "Membership secretary",
        "text": "We sell an account. We do not operate the restaurant. Ask them about the meal and ask us about the Dinner Companion sample."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_intro",
    "terms": [
      "nora_bell"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "You asked Arthur Finch to confirm a Tuesday dinner. Did he agree?"
      },
      {
        "speaker": "Nora Bell",
        "text": "No. He has the original message I sent."
      },
      {
        "speaker": "You",
        "text": "Three requests contain the same meal and incident."
      },
      {
        "speaker": "Nora Bell",
        "text": "Then compare the actual accounts. If you think I used a sample, bring its reference. A shared fondness for soup is not your strongest argument."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_soup",
    "terms": [
      "nora_bell",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Your message describes tomato soup."
      },
      {
        "speaker": "Nora Bell",
        "text": "That is what it says. Have you checked service on that specific Tuesday? The usual menu does not tell you what the kitchen actually served."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_footer",
    "terms": [
      "nora_bell",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Do you recognise “revision 2” on the dinner document?"
      },
      {
        "speaker": "Nora Bell",
        "text": "A document version is not a confession. Find the actual sample and its reference if you believe the wording came from it."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_needs_receipt",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": "You",
        "text": "Your account matches TUE-DC-02."
      },
      {
        "speaker": "Nora Bell",
        "text": "Have you checked Arthur’s actual visit?"
      },
      {
        "speaker": "You",
        "text": "He says he was alone."
      },
      {
        "speaker": "Nora Bell",
        "text": "Then obtain his authorised restaurant receipt. Do not settle a documented question by choosing whose voice sounds more convincing."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_needs_service",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [
      "no_hot_food"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the sample and Arthur’s receipt."
      },
      {
        "speaker": "Nora Bell",
        "text": "And have you asked the restaurant about Tuesday’s service? Check that specific evening before claiming the meal was impossible."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_needs_sample",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 35,
    "lines": [
      {
        "speaker": "You",
        "text": "I want to compare your account with the sample."
      },
      {
        "speaker": "Nora Bell",
        "text": "Then obtain the original demonstration from its supplier. A reference without the source is not the comparison you say you have."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_confront",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received",
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "nora_admitted"
    ],
    "grantFlags": [
      "nora_admitted"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": "You",
        "text": "TUE-DC-02 repeats your account. Arthur’s receipt records one diner, and the restaurant confirms there was no soup. Why send that story?"
      },
      {
        "speaker": "Nora Bell",
        "text": "All right. I bought it. Arthur was never with me."
      },
      {
        "speaker": "You",
        "text": "Where were you?"
      },
      {
        "speaker": "Nora Bell",
        "text": "At the Civic Pie Challenge. I won. This is considerably less dignified than the dinner I invented.",
        "fragments": [
          "At the ",
          {
            "keywordId": "pie_contest",
            "text": "Civic Pie Challenge"
          },
          ". I won. This is considerably less dignified than the dinner I invented."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_confront_repeat",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 100,
    "lines": [
      {
        "speaker": "You",
        "text": "Who can independently check your Civic Pie Challenge attendance?",
        "fragments": [
          "Who can independently check your ",
          {
            "keywordId": "pie_contest",
            "text": "Civic Pie Challenge"
          },
          " attendance?"
        ]
      },
      {
        "speaker": "Nora Bell",
        "text": "The event office publishes the Tuesday results and the judge’s continuous stage record."
      },
      {
        "speaker": "You",
        "text": "Not just a list of participants?"
      },
      {
        "speaker": "Nora Bell",
        "text": "The record gives check-in, the award and whether I left. I could not slip away quietly with seven slices of pie in me."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_event",
    "terms": [
      "nora_bell",
      "pie_contest"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Who can independently check your Civic Pie Challenge attendance?"
      },
      {
        "speaker": "Nora Bell",
        "text": "The event office publishes the Tuesday results and the judge’s continuous stage record."
      },
      {
        "speaker": "You",
        "text": "Not just a list of participants?"
      },
      {
        "speaker": "Nora Bell",
        "text": "The record gives check-in, the award and whether I left. I could not slip away quietly with seven slices of pie in me."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_repeat",
    "terms": [
      "nora_bell"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": "You",
        "text": "Who can independently check your Civic Pie Challenge attendance?",
        "fragments": [
          "Who can independently check your ",
          {
            "keywordId": "pie_contest",
            "text": "Civic Pie Challenge"
          },
          " attendance?"
        ]
      },
      {
        "speaker": "Nora Bell",
        "text": "The event office publishes the Tuesday results and the judge’s continuous stage record."
      },
      {
        "speaker": "You",
        "text": "Not just a list of participants?"
      },
      {
        "speaker": "Nora Bell",
        "text": "The record gives check-in, the award and whether I left. I could not slip away quietly with seven slices of pie in me."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_private",
    "terms": [
      "nora_bell",
      "tuesday"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Why invent dinner?"
      },
      {
        "speaker": "Nora Bell",
        "text": "My sister organised a family meal. I claimed a prior engagement with someone respectable. Competitive pie eating under fluorescent lighting was harder to explain."
      }
    ]
  },
  {
    "contactId": "alibi_nora_bell",
    "id": "nora_wine",
    "terms": [
      "nora_bell",
      "red_wine"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Tell me about the wine incident."
      },
      {
        "speaker": "Nora Bell",
        "text": "Repeating the written account would not make it independent evidence. If you have the actual sample reference and restaurant records, put those to me."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_intro",
    "terms": [
      "simon_pike"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "You asked Arthur Finch to confirm a Tuesday dinner. Did he agree?"
      },
      {
        "speaker": "Simon Pike",
        "text": "No. He has the original message I sent."
      },
      {
        "speaker": "You",
        "text": "Three requests contain the same meal and incident."
      },
      {
        "speaker": "Simon Pike",
        "text": "Then compare the actual accounts. If you think I used a sample, bring its reference. A shared fondness for soup is not your strongest argument."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_soup",
    "terms": [
      "simon_pike",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Your message describes tomato soup."
      },
      {
        "speaker": "Simon Pike",
        "text": "That is what it says. Have you checked service on that specific Tuesday? The usual menu does not tell you what the kitchen actually served."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_footer",
    "terms": [
      "simon_pike",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Do you recognise “revision 2” on the dinner document?"
      },
      {
        "speaker": "Simon Pike",
        "text": "A document version is not a confession. Find the actual sample and its reference if you believe the wording came from it."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_needs_receipt",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": "You",
        "text": "Your account matches TUE-DC-02."
      },
      {
        "speaker": "Simon Pike",
        "text": "Have you checked Arthur’s actual visit?"
      },
      {
        "speaker": "You",
        "text": "He says he was alone."
      },
      {
        "speaker": "Simon Pike",
        "text": "Then obtain his authorised restaurant receipt. Do not settle a documented question by choosing whose voice sounds more convincing."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_needs_service",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [
      "no_hot_food"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the sample and Arthur’s receipt."
      },
      {
        "speaker": "Simon Pike",
        "text": "And have you asked the restaurant about Tuesday’s service? Check that specific evening before claiming the meal was impossible."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_needs_sample",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 35,
    "lines": [
      {
        "speaker": "You",
        "text": "I want to compare your account with the sample."
      },
      {
        "speaker": "Simon Pike",
        "text": "Then obtain the original demonstration from its supplier. A reference without the source is not the comparison you say you have."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_confront",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received",
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "simon_admitted"
    ],
    "grantFlags": [
      "simon_admitted"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": "You",
        "text": "TUE-DC-02 repeats your dinner account. Arthur’s receipt and the restaurant’s service confirmation contradict it. Where were you?"
      },
      {
        "speaker": "Simon Pike",
        "text": "I bought the story to avoid a compulsory company dinner. Arthur did not agree to any of it."
      },
      {
        "speaker": "You",
        "text": "Your actual evening?"
      },
      {
        "speaker": "Simon Pike",
        "text": "I was playing in the Rook & Ruin Open. Describing it as a serious strategic commitment was entirely accurate.",
        "fragments": [
          "I was playing in the ",
          {
            "keywordId": "board_tournament",
            "text": "Rook & Ruin Open"
          },
          ". Describing it as a serious strategic commitment was entirely accurate."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_confront_repeat",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 100,
    "lines": [
      {
        "speaker": "You",
        "text": "Who can check your Rook & Ruin match times?"
      },
      {
        "speaker": "Simon Pike",
        "text": "The club publishes the official results and referee’s signed, timed match sheet."
      },
      {
        "speaker": "You",
        "text": "Does it record breaks and substitutes?"
      },
      {
        "speaker": "Simon Pike",
        "text": "Yes. The final table was supervised. Check the sheet rather than my account. The referee noticed everything, including my expression after the dice roll."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_event",
    "terms": [
      "simon_pike",
      "board_tournament"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Who can check your Rook & Ruin match times?"
      },
      {
        "speaker": "Simon Pike",
        "text": "The club publishes the official results and referee’s signed, timed match sheet."
      },
      {
        "speaker": "You",
        "text": "Does it record breaks and substitutes?"
      },
      {
        "speaker": "Simon Pike",
        "text": "Yes. The final table was supervised. Check the sheet rather than my account. The referee noticed everything, including my expression after the dice roll."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_repeat",
    "terms": [
      "simon_pike"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": "You",
        "text": "Who can check your Rook & Ruin match times?"
      },
      {
        "speaker": "Simon Pike",
        "text": "The club publishes the official results and referee’s signed, timed match sheet."
      },
      {
        "speaker": "You",
        "text": "Does it record breaks and substitutes?"
      },
      {
        "speaker": "Simon Pike",
        "text": "Yes. The final table was supervised. Check the sheet rather than my account. The referee noticed everything, including my expression after the dice roll."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_private",
    "terms": [
      "simon_pike",
      "tuesday"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Why conceal the tournament?"
      },
      {
        "speaker": "Simon Pike",
        "text": "The company dinner was described as optional but professionally revealing. At the tournament the rules were merely complicated. At work they were apparently metaphysical."
      }
    ]
  },
  {
    "contactId": "alibi_simon_pike",
    "id": "simon_wine",
    "terms": [
      "simon_pike",
      "red_wine"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Tell me about the wine incident."
      },
      {
        "speaker": "Simon Pike",
        "text": "Repeating the written account would not make it independent evidence. If you have the actual sample reference and restaurant records, put those to me."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_intro",
    "terms": [
      "evelyn_shaw"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Arthur disputes the dinner account you sent him."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Then identify a detail you have checked. “It sounds suspicious” is not evidence wearing a better coat."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_soup",
    "terms": [
      "evelyn_shaw",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Your account says tomato soup."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Have you checked that evening’s restaurant service? Quoting the dish back at me is not the same thing as contradicting it."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_footer",
    "terms": [
      "evelyn_shaw",
      "revision_two"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Your attachment says “Tuesday package — revision 2”."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "A document can have a version number. If you think it came from a product, obtain that product’s actual sample."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_needs_receipt",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 20,
    "lines": [
      {
        "speaker": "You",
        "text": "Your account matches TUE-DC-02."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Wording is one question. Arthur’s actual visit is another. Obtain his authorised receipt before saying that it contradicts me."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_needs_service",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "unlessFlags": [
      "no_hot_food"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 30,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the sample and the receipt."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Then check Tuesday service with the restaurant. Their standard menu does not establish what was served."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_needs_sample",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 35,
    "lines": [
      {
        "speaker": "Evelyn Shaw",
        "text": "Obtain the original demonstration. I will not argue about a source you have not requested."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_confront",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received",
      "receipt_received",
      "no_hot_food"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "evelyn_confronted"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 60,
    "lines": [
      {
        "speaker": "You",
        "text": "The TUE-DC-02 sample repeats your account. Arthur’s receipt records one diner, and the restaurant served no soup. Do you stand by it?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "A copied account proves that words were copied. I stand by what I sent."
      },
      {
        "speaker": "You",
        "text": "Is there anything else about Tuesday you expect questions about?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "If you mean the Tuesday break-in at my employer, ask about that. I have no intention of defending soup all evening.",
        "fragments": [
          "If you mean the ",
          {
            "keywordId": "records_breakin",
            "text": "Tuesday break-in"
          },
          " at my employer, ask about that. I have no intention of defending soup all evening."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident_early",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "What do you know about the Tuesday break-in?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "The company’s liaison handles its public statement. If you dispute my dinner account, finish that question with the sample and restaurant evidence first."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": "You",
        "text": "The public statement says an item was taken during the Tuesday break-in. What do you know about it?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "That blue folder was empty anyway. You are making a great deal out of nothing.",
        "fragments": [
          "That ",
          {
            "keywordId": "blue_folder",
            "text": "blue folder"
          },
          " was empty anyway. You are making a great deal out of nothing."
        ]
      },
      {
        "speaker": "You",
        "text": "I said an item. I did not describe a folder or its colour."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Then ask the company what they published. I have nothing else to add."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident_named_early",
    "terms": [
      "evelyn_shaw",
      "records_breakin"
    ],
    "requiresFlags": [],
    "unlessFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "What do you know about the Tuesday break-in?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "The company’s liaison handles its public statement. If you dispute my dinner account, finish that question with the sample and restaurant evidence first."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_incident_named",
    "terms": [
      "evelyn_shaw",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 50,
    "lines": [
      {
        "speaker": "You",
        "text": "The public statement says an item was taken during the Tuesday break-in. What do you know about it?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "That blue folder was empty anyway. You are making a great deal out of nothing.",
        "fragments": [
          "That ",
          {
            "keywordId": "blue_folder",
            "text": "blue folder"
          },
          " was empty anyway. You are making a great deal out of nothing."
        ]
      },
      {
        "speaker": "You",
        "text": "I said an item. I did not describe a folder or its colour."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Then ask the company what they published. I have nothing else to add."
      }
    ]
  },
  {
    "contactId": "alibi_evelyn_shaw",
    "id": "evelyn_after_slip",
    "terms": [
      "evelyn_shaw",
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Where did you hear the description of the missing item?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "I am not adding to my statement."
      },
      {
        "speaker": "You",
        "text": "Then I will preserve your exact words and ask the records liaison whether the description was public."
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_general",
    "terms": [
      "morrow_records"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Who handles the incident statement?"
      },
      {
        "speaker": "Records liaison",
        "text": "This office. Ask about the Tuesday break-in or bring a specific witness detail for us to check. Keep observation and inference separate; I am running out of coloured pens.",
        "fragments": [
          "This office. Ask about the ",
          {
            "keywordId": "records_breakin",
            "text": "Tuesday break-in"
          },
          " or bring a specific witness detail for us to check. Keep observation and inference separate; I am running out of coloured pens."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_incident",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [
      "company_incident_verified"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you confirm the interval and what you published?"
      },
      {
        "speaker": "Records liaison",
        "text": "Tuesday, 20:10 to 20:25. The alarm and responding staff establish the interval. An item was taken; its physical description and contents were withheld."
      },
      {
        "speaker": "You",
        "text": "So a name on an event list would not be enough to check someone’s whereabouts?"
      },
      {
        "speaker": "Records liaison",
        "text": "Correct. You need independent records covering the whole interval, not just evidence that they attended at some point."
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_employee",
    "terms": [
      "evelyn_shaw"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Evelyn works for you. Does that establish involvement?"
      },
      {
        "speaker": "Records liaison",
        "text": "Employment establishes employment. Bring a specific statement she volunteered about the incident, quoted accurately. We cannot check an atmosphere of suspicion."
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_soup",
    "terms": [
      "tomato_soup"
    ],
    "requiresFlags": [],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you verify the soup account?"
      },
      {
        "speaker": "Records liaison",
        "text": "Company records, not restaurant orders. Ask the restaurant about dinner and ask us about the Tuesday break-in.",
        "fragments": [
          "Company records, not restaurant orders. Ask the restaurant about dinner and ask us about the ",
          {
            "keywordId": "records_breakin",
            "text": "Tuesday break-in"
          },
          "."
        ]
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_folder",
    "terms": [
      "blue_folder",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Evelyn volunteered “blue folder” and said it was empty. I had only mentioned a missing item. Was that description public?"
      },
      {
        "speaker": "Records liaison",
        "text": "I checked with the records manager. The physical description matches the missing item. It was not public, and Evelyn was not on the internal notification list."
      },
      {
        "speaker": "You",
        "text": "That leaves the source of her knowledge unexplained."
      },
      {
        "speaker": "Records liaison",
        "text": "Yes. Preserve her words. This is a concrete discrepancy, not proof of theft. Someone else could have told her."
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_folder_short",
    "terms": [
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "unlessFlags": [],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Evelyn volunteered “blue folder” and said it was empty. I had only mentioned a missing item. Was that description public?"
      },
      {
        "speaker": "Records liaison",
        "text": "I checked with the records manager. The physical description matches the missing item. It was not public, and Evelyn was not on the internal notification list."
      },
      {
        "speaker": "You",
        "text": "That leaves the source of her knowledge unexplained."
      },
      {
        "speaker": "Records liaison",
        "text": "Yes. Preserve her words. This is a concrete discrepancy, not proof of theft. Someone else could have told her."
      }
    ]
  },
  {
    "contactId": "alibi_morrow_liaison",
    "id": "morrow_next",
    "terms": [
      "blue_folder"
    ],
    "requiresFlags": [
      "folder_detail_verified"
    ],
    "unlessFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "requiresKeywords": [],
    "unlessKeywords": [],
    "priority": 80,
    "lines": [
      {
        "speaker": "You",
        "text": "What belongs in the report?"
      },
      {
        "speaker": "Records liaison",
        "text": "The contradicted account, the independent checks and Evelyn’s exact words. Separate those supported findings from the unanswered question. A useful report does not need to pretend it is a verdict."
      }
    ]
  }
];
const marker=Symbol.for('lostArtifacts.alibiDialogueDataV2');
export function ensureAlibiDialogueDefinitions(definition=ALIBI_SEARCH_CASE) {
  if (definition?.id!=='borrowed_alibi') return;
  if (!definition.keywords.some(k=>k.id==='copper_email')) definition.keywords.push({
    id:'copper_email',label:COPPER_EMAIL,email:COPPER_EMAIL,contactName:'The Copper Spoon — Receipts',cloudId:'places'
  });
}
export function installAlibiDialogueData() {
  ensureAlibiDialogueDefinitions();
  for (const contact of [ALIBI_PHONE_CONTACT,ALIBI_CLUB_CONTACT,...ALIBI_INTERVIEW_CONTACTS]) {
    if (contact[marker]) continue;
    const own=ALIBI_DIALOGUE_RULES.filter(rule=>rule.contactId===contact.id);
    if (!own.length) continue;
    contact.topics=own.map(rule=>({...rule,terms:[...rule.terms]}));
    contact.choicePrompt='Choose one or two collected clues. Click highlighted words in the transcript to add new leads. Replies explain missing evidence.';
    contact.fallback=[{speaker:'You',text:'Those clues do not form a precise question for this contact. I should ask about the dinner, its source document, or the relevant incident — and keep the people separate.'}];
    contact.fallbackVariants=undefined;
    contact[marker]=true;
  }
}
export function selectAlibiDialogueRule(contact,terms,known,flags) {
  const sig=ids=>[...new Set(ids)].sort().join('|');
  if (contact?.caseId!=='borrowed_alibi') return null;
  return contact.topics.filter(topic=>sig(topic.terms)===sig(terms)
    && (topic.requiresFlags||[]).every(id=>flags.includes(id))
    && !(topic.unlessFlags||[]).some(id=>flags.includes(id))
    && (topic.requiresKeywords||[]).every(id=>known.includes(id))
    && !(topic.unlessKeywords||[]).some(id=>known.includes(id)))
    .sort((a,b)=>(b.priority||0)-(a.priority||0))[0]||null;
}
installAlibiDialogueData();
