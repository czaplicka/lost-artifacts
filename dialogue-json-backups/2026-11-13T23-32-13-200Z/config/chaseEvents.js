export const CHASE_EVENTS = [
  {
    "id": "chase_01",
    "background": "street",
    "text": "A delivery van blocks the corner. A passage cuts through the courtyard.",
    "options": [
      {
        "text": "Take the courtyard shortcut",
        "type": "shortcut",
        "success": "You clear the courtyard before the suspect reaches the corner.",
        "failure": "The courtyard exit is blocked. Excellent place for a delivery."
      },
      {
        "text": "Follow around the van",
        "type": "follow",
        "success": "You round the van without losing your footing.",
        "failure": "The van forces you into a wider turn."
      }
    ]
  },
  {
    "id": "chase_02",
    "background": "courtyard",
    "text": "A caretaker is opening the side gate. The suspect stays on the street.",
    "options": [
      {
        "text": "Cut through the opening gate",
        "type": "shortcut",
        "success": "The caretaker holds the gate. Public service at last.",
        "failure": "The gate catches your coat. The caretaker looks disappointed.",
        "bonus": 0.15
      },
      {
        "text": "Stay on the street",
        "type": "follow",
        "success": "You keep a steady pace along the street.",
        "failure": "The longer street costs you ground."
      }
    ]
  },
  {
    "id": "chase_03",
    "background": "stairs",
    "text": "The suspect runs upstairs. A ramp curves around the building.",
    "options": [
      {
        "text": "Take the stairs two at a time",
        "type": "desperate",
        "success": "You clear the steps. Your knees reserve the right to complain.",
        "failure": "You miss a step and recover your balance, not your dignity."
      },
      {
        "text": "Follow the ramp",
        "type": "follow",
        "success": "The clear ramp lets you keep your pace.",
        "failure": "The ramp bends farther than you expected."
      }
    ]
  },
  {
    "id": "chase_04",
    "background": "square",
    "text": "The suspect circles a cafe terrace. There is a gap between the tables.",
    "options": [
      {
        "text": "Cut between the tables",
        "type": "shortcut",
        "success": "You clear the tables without ordering anything.",
        "failure": "A chair wins this round."
      },
      {
        "text": "Run around the terrace",
        "type": "follow",
        "success": "You round the terrace cleanly.",
        "failure": "A waiter crosses the outer path and slows you down."
      }
    ]
  },
  {
    "id": "chase_05",
    "background": "street",
    "text": "A stationary bus hides the suspect for a moment. Both ends are clear.",
    "options": [
      {
        "text": "Sprint around the front",
        "type": "desperate",
        "success": "You round the front and regain the suspect.",
        "failure": "The bus is longer than your estimate. Much longer."
      },
      {
        "text": "Follow behind the bus",
        "type": "follow",
        "success": "You keep the suspect in sight behind the bus.",
        "failure": "The rear corner forces you to slow down."
      }
    ]
  },
  {
    "id": "chase_06",
    "background": "courtyard",
    "text": "An open service passage leads towards the next street.",
    "options": [
      {
        "text": "Try the service passage",
        "type": "shortcut",
        "success": "The passage delivers you to the next corner early.",
        "failure": "You take the wrong exit. Service not included."
      },
      {
        "text": "Follow the pavement",
        "type": "follow",
        "success": "You maintain a clean line along the pavement.",
        "failure": "The pavement detour costs a few metres."
      }
    ]
  },
  {
    "id": "chase_07",
    "background": "square",
    "text": "A crowd spills out of a theatre. The suspect heads along the wall.",
    "options": [
      {
        "text": "Push straight through the crowd",
        "type": "desperate",
        "success": "You slip through a gap in the audience.",
        "failure": "The audience gives you a standing obstruction."
      },
      {
        "text": "Follow along the wall",
        "type": "follow",
        "success": "The wall-side route stays clear.",
        "failure": "A cluster of theatre-goers blocks the wall-side route."
      }
    ]
  },
  {
    "id": "chase_08",
    "background": "stairs",
    "text": "The suspect takes a broad stairway. A side ramp offers an interception.",
    "options": [
      {
        "text": "Cut across to the ramp",
        "type": "shortcut",
        "success": "The ramp brings you out ahead of the landing.",
        "failure": "The ramp doubles back. A bold architectural choice."
      },
      {
        "text": "Race up the stairway",
        "type": "follow",
        "success": "You climb steadily and gain ground.",
        "failure": "The climb takes more out of you than expected."
      }
    ]
  },
  {
    "id": "chase_09",
    "background": "street",
    "text": "A handcart narrows the pavement. An alley bypasses the delivery.",
    "options": [
      {
        "text": "Try the alley shortcut",
        "type": "shortcut",
        "success": "The alley cuts off the delivery corner.",
        "failure": "A stack of crates turns the alley into a waiting room."
      },
      {
        "text": "Squeeze past the handcart",
        "type": "follow",
        "success": "You slip past the cart without slowing.",
        "failure": "The cart handle catches your sleeve."
      }
    ]
  },
  {
    "id": "chase_10",
    "background": "courtyard",
    "text": "Fresh paint glistens on a low fence. An open gateway lies beyond it.",
    "options": [
      {
        "text": "Vault the painted fence",
        "type": "desperate",
        "success": "You clear the fence. Your palms acquire a new colour.",
        "failure": "The wet rail slips under your hand.",
        "bonus": -0.15
      },
      {
        "text": "Run through the gateway",
        "type": "follow",
        "success": "The gateway provides a clean route.",
        "failure": "The longer route through the gate costs ground."
      }
    ]
  },
  {
    "id": "chase_11",
    "background": "square",
    "text": "Market stalls divide the square. The suspect sticks to the outer aisle.",
    "options": [
      {
        "text": "Cut through the stalls",
        "type": "shortcut",
        "success": "You gain ground and an opinion about tomatoes.",
        "failure": "A produce crate blocks the gap between stalls."
      },
      {
        "text": "Follow the outer aisle",
        "type": "follow",
        "success": "You keep a steady pace through the outer aisle.",
        "failure": "A shopper stops in the aisle to reconsider a cabbage."
      }
    ]
  },
  {
    "id": "chase_12",
    "background": "street",
    "text": "A dog walker blocks half the pavement. A clear side lane bends ahead.",
    "options": [
      {
        "text": "Sprint into the side lane",
        "type": "shortcut",
        "success": "The lane brings you back closer to the suspect.",
        "failure": "The lane curves away. The dogs look sympathetic."
      },
      {
        "text": "Slow down and pass the dogs",
        "type": "follow",
        "success": "You pass the leads cleanly and pick up speed.",
        "failure": "A lead stretches across your path. You wait for clearance."
      }
    ]
  },
  {
    "id": "chase_13",
    "background": "courtyard",
    "text": "The suspect skirts a fountain. A narrow path crosses the garden.",
    "options": [
      {
        "text": "Take the garden path",
        "type": "shortcut",
        "success": "The path cuts across the fountain detour.",
        "failure": "A low branch makes you duck and lose speed."
      },
      {
        "text": "Follow around the fountain",
        "type": "follow",
        "success": "You round the fountain without slipping.",
        "failure": "Wet paving makes you slow down."
      }
    ]
  },
  {
    "id": "chase_14",
    "background": "stairs",
    "text": "The suspect runs down a staircase. The adjacent ramp is longer but clear.",
    "options": [
      {
        "text": "Leap down the last steps",
        "type": "desperate",
        "success": "You land cleanly and close the gap.",
        "failure": "You stumble on landing and have to recover."
      },
      {
        "text": "Take the clear ramp",
        "type": "follow",
        "success": "You accelerate down the clear ramp.",
        "failure": "The ramp is longer than it looked from above."
      }
    ]
  },
  {
    "id": "chase_15",
    "background": "square",
    "text": "A guided tour stops for a photograph. The suspect skirts the group.",
    "options": [
      {
        "text": "Cut behind the photographer",
        "type": "shortcut",
        "success": "You cross behind the camera before the shutter clicks.",
        "failure": "The photographer steps backwards into your route."
      },
      {
        "text": "Follow around the group",
        "type": "follow",
        "success": "You pass the tour group cleanly.",
        "failure": "The guide stretches an arm across your path."
      }
    ]
  },
  {
    "id": "chase_16",
    "background": "street",
    "text": "A street cleaner occupies the corner. A broad passage runs behind it.",
    "options": [
      {
        "text": "Use the passage",
        "type": "shortcut",
        "success": "You emerge beyond the cleaning vehicle.",
        "failure": "The passage bends back towards the wrong corner."
      },
      {
        "text": "Follow the street",
        "type": "follow",
        "success": "You pass the cleaner and gain a little ground.",
        "failure": "You slow down to avoid the wet pavement."
      }
    ]
  },
  {
    "id": "chase_17",
    "background": "courtyard",
    "text": "An open loading gate reveals a route across the yard.",
    "options": [
      {
        "text": "Cross the loading yard",
        "type": "shortcut",
        "success": "The open yard gives you a clean interception line.",
        "failure": "A worker rolls a pallet across your route.",
        "bonus": 0.15
      },
      {
        "text": "Stick to the pavement",
        "type": "follow",
        "success": "You keep your pace along the pavement.",
        "failure": "The outer route gives the suspect extra room."
      }
    ]
  },
  {
    "id": "chase_18",
    "background": "square",
    "text": "A musician and a small audience stand between you and the next exit.",
    "options": [
      {
        "text": "Rush around the audience",
        "type": "desperate",
        "success": "You clear the audience to absolutely no applause.",
        "failure": "The audience shifts into your route."
      },
      {
        "text": "Follow the outside edge",
        "type": "follow",
        "success": "You keep to the clear edge of the square.",
        "failure": "The audience spreads towards the outside edge."
      }
    ]
  },
  {
    "id": "chase_19",
    "background": "stairs",
    "text": "The suspect climbs towards a walkway. A lower path reaches the far end.",
    "options": [
      {
        "text": "Intercept via the lower path",
        "type": "shortcut",
        "success": "The lower path reaches the far steps in time.",
        "failure": "The path ends in another flight of steps. Naturally."
      },
      {
        "text": "Follow onto the walkway",
        "type": "follow",
        "success": "You gain ground on the walkway.",
        "failure": "The climb onto the walkway slows you down."
      }
    ]
  },
  {
    "id": "chase_20",
    "background": "street",
    "text": "The suspect rounds a newspaper kiosk. A narrow gap offers a shorter route.",
    "options": [
      {
        "text": "Squeeze through the gap",
        "type": "shortcut",
        "success": "You clear the gap without becoming a headline.",
        "failure": "The gap is narrower than your coat."
      },
      {
        "text": "Follow around the kiosk",
        "type": "follow",
        "success": "You round the kiosk at a steady pace.",
        "failure": "A customer steps away from the kiosk into your path."
      }
    ]
  },
  {
    "id": "chase_21",
    "background": "courtyard",
    "text": "Two open gates lead through a service yard. The suspect runs outside.",
    "options": [
      {
        "text": "Dash through both gates",
        "type": "desperate",
        "success": "You race through both gates and cut the corner.",
        "failure": "The second gate swings into your path."
      },
      {
        "text": "Keep the suspect in sight",
        "type": "follow",
        "success": "You maintain contact along the outer route.",
        "failure": "The outside route costs you a few metres."
      }
    ]
  },
  {
    "id": "chase_22",
    "background": "square",
    "text": "A queue snakes across the plaza. The suspect runs around its end.",
    "options": [
      {
        "text": "Cut through a gap in the queue",
        "type": "shortcut",
        "success": "The queue lets you through with only mild judgement.",
        "failure": "The gap closes. Nobody is surrendering their place."
      },
      {
        "text": "Follow around the queue",
        "type": "follow",
        "success": "You round the queue cleanly.",
        "failure": "The queue extends farther than it first appeared."
      }
    ]
  },
  {
    "id": "chase_23",
    "background": "street",
    "text": "A parked taxi narrows the corner. A short alley meets the street ahead.",
    "options": [
      {
        "text": "Try the alley",
        "type": "shortcut",
        "success": "The alley brings you out closer to the suspect.",
        "failure": "A bin blocks the far end of the alley."
      },
      {
        "text": "Run around the taxi",
        "type": "follow",
        "success": "You round the taxi without breaking stride.",
        "failure": "The narrow corner makes you slow down."
      }
    ]
  },
  {
    "id": "chase_24",
    "background": "stairs",
    "text": "A broad stairway splits around a landing. The suspect takes the outside.",
    "options": [
      {
        "text": "Take the inside steps",
        "type": "shortcut",
        "success": "The inside flight cuts across the landing.",
        "failure": "You take a wrong turn on the landing."
      },
      {
        "text": "Follow the outside steps",
        "type": "follow",
        "success": "You gain a few steps on the outside flight.",
        "failure": "The outside turn costs you momentum."
      }
    ]
  },
  {
    "id": "chase_25",
    "background": "courtyard",
    "text": "The suspect skirts a row of bins. The middle passage looks narrow.",
    "options": [
      {
        "text": "Squeeze between the bins",
        "type": "desperate",
        "success": "You clear the bins. Your coat requests dry cleaning.",
        "failure": "A bin lid catches your elbow."
      },
      {
        "text": "Follow the outside path",
        "type": "follow",
        "success": "You pass the bins without trouble.",
        "failure": "The outside path bends farther around the bins."
      }
    ]
  },
  {
    "id": "chase_26",
    "background": "square",
    "text": "Cafe staff are moving chairs. The suspect takes the clear outer route.",
    "options": [
      {
        "text": "Thread between the chairs",
        "type": "shortcut",
        "success": "You pass between the chairs before they are moved.",
        "failure": "A chair legs its way into your route."
      },
      {
        "text": "Follow the clear route",
        "type": "follow",
        "success": "You gain ground on the clear outer route.",
        "failure": "A staff member carries a chair across the outer route."
      }
    ]
  },
  {
    "id": "chase_27",
    "background": "street",
    "text": "The suspect turns past a bakery. An open arcade leads to the same junction.",
    "options": [
      {
        "text": "Take the arcade",
        "type": "shortcut",
        "success": "The arcade brings you to the junction early.",
        "failure": "A bakery queue blocks the arcade exit."
      },
      {
        "text": "Follow past the bakery",
        "type": "follow",
        "success": "You pass the bakery and keep your pace.",
        "failure": "The pavement narrows beside the bakery."
      }
    ]
  },
  {
    "id": "chase_28",
    "background": "stairs",
    "text": "The suspect heads down towards an underpass. A parallel ramp is visible.",
    "options": [
      {
        "text": "Sprint down the steps",
        "type": "desperate",
        "success": "You reach the underpass with a burst of speed.",
        "failure": "You stumble on the last step."
      },
      {
        "text": "Use the parallel ramp",
        "type": "follow",
        "success": "You descend the ramp at a steady pace.",
        "failure": "The ramp takes a long turn before the underpass."
      }
    ]
  },
  {
    "id": "chase_29",
    "background": "courtyard",
    "text": "A gardener opens a wide gate. The suspect keeps to the longer street.",
    "options": [
      {
        "text": "Cross the garden",
        "type": "shortcut",
        "success": "The gardener waves you through. Finally, a useful witness.",
        "failure": "A hose crosses the path and makes you stop short.",
        "bonus": 0.15
      },
      {
        "text": "Stay on the street",
        "type": "follow",
        "success": "You keep moving along the street.",
        "failure": "The garden detour gives the suspect a little more room."
      }
    ]
  },
  {
    "id": "chase_30",
    "background": "square",
    "text": "The suspect circles a statue. A gap in the crowd leads to the far exit.",
    "options": [
      {
        "text": "Sprint through the gap",
        "type": "desperate",
        "success": "You reach the far exit before the gap closes.",
        "failure": "The crowd closes ranks in front of you."
      },
      {
        "text": "Follow around the statue",
        "type": "follow",
        "success": "You round the statue smoothly.",
        "failure": "The route around the statue gets crowded."
      }
    ]
  },
  {
    "id": "chase_31",
    "background": "street",
    "text": "A delivery trolley rolls across an alley entrance. The street remains clear.",
    "options": [
      {
        "text": "Try the alley before it closes",
        "type": "desperate",
        "success": "You clear the entrance just ahead of the trolley.",
        "failure": "The trolley blocks the entrance before you reach it."
      },
      {
        "text": "Stay on the clear street",
        "type": "follow",
        "success": "You keep a steady pace on the clear street.",
        "failure": "The street takes a wider turn than the alley."
      }
    ]
  },
  {
    "id": "chase_32",
    "background": "courtyard",
    "text": "A service door is propped open. You can see another exit across the yard.",
    "options": [
      {
        "text": "Cut across the service yard",
        "type": "shortcut",
        "success": "Both exits are clear and you close the gap.",
        "failure": "A worker crosses the yard with a ladder."
      },
      {
        "text": "Keep following outside",
        "type": "follow",
        "success": "You maintain a good pace along the outer wall.",
        "failure": "The outside route takes an extra turn."
      }
    ]
  }
];
