export const ALIBI_SILENCE_FLAG='alibi_silence_offer_requested';
export function alibiSilenceOfferKnown(state){
 const flags=state.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[];
 const finale=state.piBorrowedAlibiFinale;
 return flags.includes(ALIBI_SILENCE_FLAG)||finale?.draft?.endingId==='silence'||finale?.settlement?.preview?.endingId==='silence';
}
export const ALIBI_GUIDANCE_RULES=[
  {
    "id": "alibi_v3_restaurant_sample_vs_visit",
    "number": "427",
    "terms": [
      "tuesday_package"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "I have a sample account describing dinner at your restaurant. Does that establish a booking?"
      },
      {
        "speaker": "Manager",
        "text": "No. Anyone can write our name above an imaginary soup."
      },
      {
        "speaker": "You",
        "text": "Then I need to check whether the meal could be served, and what Arthur actually ordered."
      },
      {
        "speaker": "Manager",
        "text": "Two separate enquiries. Ask me about Tuesday’s service. Use the authorised receipt procedure for Arthur’s individual record."
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_reference",
    "number": "427",
    "terms": [
      "sample_code"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Does TUE-DC-02 identify a reservation or receipt here?"
      },
      {
        "speaker": "Manager",
        "text": "Not in our records. That reference belongs to whoever supplied your sample."
      },
      {
        "speaker": "You",
        "text": "So I need your actual service confirmation and the customer’s authorised record."
      },
      {
        "speaker": "Manager",
        "text": "Exactly. A template can supply words. It cannot make our cooker work retrospectively."
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_verify_meal",
    "number": "427",
    "terms": [
      "copper_spoon",
      "tomato_soup"
    ],
    "requiresFlags": [],
    "grantFlags": [
      "no_hot_food"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "The normal menu includes tomato soup. Is that enough to check a Tuesday account?"
      },
      {
        "speaker": "Manager",
        "text": "No. The menu says what we usually offer. Ask about service on the particular evening."
      },
      {
        "speaker": "You",
        "text": "Tuesday, then."
      },
      {
        "speaker": "Manager",
        "text": "The hot kitchen was closed all Tuesday evening. Cold sandwiches and drinks only."
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_receipt_scope",
    "number": "427",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_read",
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "What should I compare in Arthur’s receipt?"
      },
      {
        "speaker": "Manager",
        "text": "The customer, date, transaction times, recorded covers and actual order."
      },
      {
        "speaker": "You",
        "text": "Not merely whether his name appears on paper."
      },
      {
        "speaker": "Manager",
        "text": "Correct. Compare that visit with the three claimed dinners. The total is not a personality test."
      }
    ]
  },
  {
    "id": "alibi_v3_restaurant_receipt_unread",
    "number": "427",
    "terms": [
      "arthur_finch",
      "receipt"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 30,
    "lines": [
      {
        "speaker": "You",
        "text": "The receipt has arrived. Can you explain the finding?"
      },
      {
        "speaker": "Manager",
        "text": "Open the copy first. Check its date, guest count, times and order, then ask about anything unclear."
      },
      {
        "speaker": "You",
        "text": "Receiving the message is not the same as reading the evidence."
      },
      {
        "speaker": "Manager",
        "text": "An excellent principle. Our accountant has been campaigning for it for years."
      }
    ]
  },
  {
    "id": "alibi_v3_club_footer",
    "number": "428",
    "terms": [
      "tuesday_package",
      "revision_two"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "This label appears at the bottom of a dinner account. Is it one of your versions?"
      },
      {
        "speaker": "Membership secretary",
        "text": "It is the version label used on our Dinner Companion material."
      },
      {
        "speaker": "You",
        "text": "Can I inspect the actual wording?"
      },
      {
        "speaker": "Membership secretary",
        "text": "Ask about the package and request the free sample. A version label is not a customer list. Several people have discovered the number two independently."
      }
    ]
  },
  {
    "id": "alibi_v3_club_truth_of_dinner",
    "number": "428",
    "terms": [
      "tomato_soup"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can you confirm that the meal described in your material was served?"
      },
      {
        "speaker": "Membership secretary",
        "text": "We sell an account. We do not operate the restaurant."
      },
      {
        "speaker": "You",
        "text": "Then I need their own records."
      },
      {
        "speaker": "Membership secretary",
        "text": "Quite. Ask us for our source material. Ask the restaurant about the actual evening."
      }
    ]
  },
  {
    "id": "alibi_v3_club_sample_reference",
    "number": "428",
    "terms": [
      "dinner_package",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [
      "alibi_silence_offer_requested"
    ],
    "grantKeywords": [],
    "condition": "sample_read",
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "I intend to quote the TUE-DC-02 demonstration when reporting the dinner requests."
      },
      {
        "speaker": "Membership secretary",
        "text": "Perhaps you would prefer a private customer-feedback arrangement."
      },
      {
        "speaker": "You",
        "text": "What sort of arrangement?"
      },
      {
        "speaker": "Membership secretary",
        "text": "We can offer $120 for keeping the package and your findings out of further reports. I will send the terms in writing."
      },
      {
        "speaker": "You",
        "text": "That is an offer of payment for silence, not a refund."
      },
      {
        "speaker": "Membership secretary",
        "text": "Correct. Nothing is paid unless you explicitly accept. We prefer our questionable arrangements to be administratively clear."
      }
    ]
  },
  {
    "id": "alibi_v3_nora_needs_actual_receipt",
    "number": "429",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 100,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the sample and a reply from the restaurant."
      },
      {
        "speaker": "Nora Bell",
        "text": "Then open the actual receipt before saying what it establishes. Check the recorded visit, not just the fact that somebody sent you a message."
      }
    ]
  },
  {
    "id": "alibi_v3_nora_needs_actual_sample",
    "number": "429",
    "terms": [
      "nora_bell",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "sample_unread",
    "priority": 90,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the reference from the demonstration."
      },
      {
        "speaker": "Nora Bell",
        "text": "Read the original example before comparing it with my wording. A reference identifies a document; it does not replace its contents."
      }
    ]
  },
  {
    "id": "alibi_v3_nora_continuous_attendance",
    "number": "429",
    "terms": [
      "nora_bell",
      "pie_contest"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "You won the competition. Does that prove you stayed there?"
      },
      {
        "speaker": "Nora Bell",
        "text": "Winning proves I ate an inadvisable amount of pie. The judge’s stage record says whether I left."
      },
      {
        "speaker": "You",
        "text": "So I need the attendance record, not merely the results."
      },
      {
        "speaker": "Nora Bell",
        "text": "Yes. Please use the judge’s paperwork rather than my description of my own heroism."
      }
    ]
  },
  {
    "id": "alibi_v3_nora_own_statement_limit",
    "number": "429",
    "terms": [
      "nora_bell",
      "records_breakin"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can your account alone exclude you from the incident?"
      },
      {
        "speaker": "Nora Bell",
        "text": "No. Check the independent record from Civic Pie Challenge.",
        "fragments": [
          "No. Check the independent record from ",
          {
            "keywordId": "pie_contest",
            "text": "Civic Pie Challenge"
          },
          "."
        ]
      },
      {
        "speaker": "You",
        "text": "Against the whole incident interval."
      },
      {
        "speaker": "Nora Bell",
        "text": "Yes. Read the record’s times, not just the headline. I cannot independently confirm myself."
      }
    ]
  },
  {
    "id": "alibi_v3_nora_document_confirmed",
    "number": "429",
    "terms": [
      "nora_bell",
      "nora_verified"
    ],
    "requiresFlags": [
      "nora_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the independent attendance record."
      },
      {
        "speaker": "Nora Bell",
        "text": "Then compare its times with the company’s verified incident interval. Keep what the record establishes separate from why I originally lied about dinner."
      }
    ]
  },
  {
    "id": "alibi_v3_simon_needs_actual_receipt",
    "number": "430",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 100,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the sample and a reply from the restaurant."
      },
      {
        "speaker": "Simon Pike",
        "text": "Then open the actual receipt before saying what it establishes. Check the recorded visit, not just the fact that somebody sent you a message."
      }
    ]
  },
  {
    "id": "alibi_v3_simon_needs_actual_sample",
    "number": "430",
    "terms": [
      "simon_pike",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "sample_unread",
    "priority": 90,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the reference from the demonstration."
      },
      {
        "speaker": "Simon Pike",
        "text": "Read the original example before comparing it with my wording. A reference identifies a document; it does not replace its contents."
      }
    ]
  },
  {
    "id": "alibi_v3_simon_continuous_attendance",
    "number": "430",
    "terms": [
      "simon_pike",
      "board_tournament"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Your name appears in the tournament results. Could you have left?"
      },
      {
        "speaker": "Simon Pike",
        "text": "Read the referee’s signed, timed match sheet. It records the supervised final, including breaks and substitutions."
      },
      {
        "speaker": "You",
        "text": "I need to compare that interval with the incident, not merely find your name."
      },
      {
        "speaker": "Simon Pike",
        "text": "Precisely. A tournament result is not a tracking collar. The referee was considering those, though."
      }
    ]
  },
  {
    "id": "alibi_v3_simon_own_statement_limit",
    "number": "430",
    "terms": [
      "simon_pike",
      "records_breakin"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Can your account alone exclude you from the incident?"
      },
      {
        "speaker": "Simon Pike",
        "text": "No. Check the independent record from Rook & Ruin Open.",
        "fragments": [
          "No. Check the independent record from ",
          {
            "keywordId": "board_tournament",
            "text": "Rook & Ruin Open"
          },
          "."
        ]
      },
      {
        "speaker": "You",
        "text": "Against the whole incident interval."
      },
      {
        "speaker": "Simon Pike",
        "text": "Yes. Read the record’s times, not just the headline. I cannot independently confirm myself."
      }
    ]
  },
  {
    "id": "alibi_v3_simon_document_confirmed",
    "number": "430",
    "terms": [
      "simon_pike",
      "simon_verified"
    ],
    "requiresFlags": [
      "simon_admitted"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the independent attendance record."
      },
      {
        "speaker": "Simon Pike",
        "text": "Then compare its times with the company’s verified incident interval. Keep what the record establishes separate from why I originally lied about dinner."
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_slip_without_answer",
    "number": "431",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
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
        "text": "Where did that description come from?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Ask the company. I am not adding to my statement."
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_slip_without_answer_named",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_confronted"
    ],
    "grantFlags": [
      "evelyn_slip"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "What do you know about the Tuesday break-in and the missing item?"
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
        "text": "Where did that description come from?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Ask the company. I am not adding to my statement."
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_needs_receipt_read",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "receipt_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "receipt_unread",
    "priority": 100,
    "lines": [
      {
        "speaker": "You",
        "text": "The restaurant has replied about Arthur’s visit."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "Then read the receipt before claiming it contradicts me. You have announced the arrival of a document, not its contents."
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_needs_sample_read",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "sample_code"
    ],
    "requiresFlags": [
      "club_sample_received"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": "sample_unread",
    "priority": 90,
    "lines": [
      {
        "speaker": "You",
        "text": "I have the sample reference."
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "A reference is not a comparison. Read the actual demonstration before putting its wording to me."
      }
    ]
  },
  {
    "id": "alibi_v3_evelyn_after_description",
    "number": "431",
    "terms": [
      "evelyn_shaw",
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Will you explain where you heard that description?"
      },
      {
        "speaker": "Evelyn Shaw",
        "text": "I have nothing to add."
      },
      {
        "speaker": "You",
        "text": "Then I will preserve your exact words and check what information the company actually published."
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_interval_method",
    "number": "432",
    "terms": [
      "records_breakin"
    ],
    "requiresFlags": [],
    "grantFlags": [
      "company_incident_verified"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "What interval must an independent attendance record actually cover?"
      },
      {
        "speaker": "Records liaison",
        "text": "The secure-office intrusion was between 20:10 and 20:25 on Tuesday."
      },
      {
        "speaker": "You",
        "text": "Being somewhere at seven would not establish being there at twenty past eight."
      },
      {
        "speaker": "Records liaison",
        "text": "Correct. Check the whole interval, the same Tuesday and the same person. A matching surname is not a teleportation certificate."
      },
      {
        "speaker": "You",
        "text": "What did the public statement disclose?"
      },
      {
        "speaker": "Records liaison",
        "text": "The interval and that an item was taken. Not its physical description or contents."
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_public_scope",
    "number": "432",
    "terms": [
      "morrow_records"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "What information can I compare with a witness’s statement?"
      },
      {
        "speaker": "Records liaison",
        "text": "Our public Tuesday break-in statement gives the interval and says an item was taken. It does not describe the object.",
        "fragments": [
          "Our public ",
          {
            "keywordId": "records_breakin",
            "text": "Tuesday break-in"
          },
          " statement gives the interval and says an item was taken. It does not describe the object."
        ]
      },
      {
        "speaker": "You",
        "text": "Then I should distinguish a witness’s own detail from information I supplied in my question."
      },
      {
        "speaker": "Records liaison",
        "text": "Exactly. Preserve both the question and the answer. Paperwork is dramatic enough without invented dialogue."
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_nora_record_method",
    "number": "432",
    "terms": [
      "nora_verified",
      "records_breakin"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "I have an independent attendance record. How should I compare it with your incident?"
      },
      {
        "speaker": "Records liaison",
        "text": "Does its recorded presence cover all of 20:10–20:25 on the same Tuesday?"
      },
      {
        "speaker": "You",
        "text": "A result or a booking alone does not establish continuous presence."
      },
      {
        "speaker": "Records liaison",
        "text": "Correct. Check breaks, departures and substitutions. Make the comparison yourself; do not ask a document to establish more than it records."
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_simon_record_method",
    "number": "432",
    "terms": [
      "simon_verified",
      "records_breakin"
    ],
    "requiresFlags": [],
    "grantFlags": [],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "I have an independent attendance record. How should I compare it with your incident?"
      },
      {
        "speaker": "Records liaison",
        "text": "Does its recorded presence cover all of 20:10–20:25 on the same Tuesday?"
      },
      {
        "speaker": "You",
        "text": "A result or a booking alone does not establish continuous presence."
      },
      {
        "speaker": "Records liaison",
        "text": "Correct. Check breaks, departures and substitutions. Make the comparison yourself; do not ask a document to establish more than it records."
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_description_limit",
    "number": "432",
    "terms": [
      "blue_folder"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Evelyn volunteered “blue folder” when I asked about a missing item. Was that description public?"
      },
      {
        "speaker": "Records liaison",
        "text": "I checked with the records manager. It matches the missing item’s physical description. It was not public, and Evelyn was not on the internal notification list."
      },
      {
        "speaker": "You",
        "text": "So the source of her knowledge remains unexplained."
      },
      {
        "speaker": "Records liaison",
        "text": "Yes. Preserve the exact exchange. It warrants investigation, not a finding of guilt. An undisclosed source is still possible."
      }
    ]
  },
  {
    "id": "alibi_v3_morrow_description_limit_named",
    "number": "432",
    "terms": [
      "blue_folder",
      "records_breakin"
    ],
    "requiresFlags": [
      "evelyn_slip"
    ],
    "grantFlags": [
      "folder_detail_verified"
    ],
    "grantKeywords": [],
    "condition": null,
    "priority": 10,
    "lines": [
      {
        "speaker": "You",
        "text": "Please check Evelyn’s volunteered description against the Tuesday incident record."
      },
      {
        "speaker": "Records liaison",
        "text": "It matches the missing item’s physical description. The detail was withheld publicly, and she was not on the internal notification list."
      },
      {
        "speaker": "You",
        "text": "I will report the discrepancy without calling it proof of theft."
      },
      {
        "speaker": "Records liaison",
        "text": "That is the distinction. A factual referral is useful; a telephone conviction is not."
      }
    ]
  }
];
export function resolveAlibiGuidance(number,terms,state){
 if(!Array.isArray(terms)||!terms.length||terms.length>2||new Set(terms).size!==terms.length)return null;
 const known=state.piKeywordSearch?.cases?.borrowed_alibi?.known||[];
 if(!terms.every(id=>known.includes(id)))return null;
 const flags=state.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[],read=state.piBorrowedAlibi?.read||[];
 const sig=ids=>[...ids].sort().join('|');
 const conditions={receipt_read:read.includes('alibi_copper_receipt'),receipt_unread:!read.includes('alibi_copper_receipt'),
  sample_read:read.includes('alibi_club_sample'),sample_unread:!read.includes('alibi_club_sample')};
 return ALIBI_GUIDANCE_RULES.filter(rule=>rule.number===number&&sig(rule.terms)===sig(terms)
  &&rule.requiresFlags.every(id=>flags.includes(id))&&(!rule.condition||conditions[rule.condition]===true))
  .sort((a,b)=>b.priority-a.priority)[0]||null;
}
