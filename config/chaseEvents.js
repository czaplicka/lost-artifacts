export const CHASE_EVENTS = [
  {
    "id": "chase_01",
    "background": "street",
    "text": "A delivery van blocks the corner. A passage cuts through the courtyard.",
    "options": [
      {
        "text": "Take the courtyard shortcut",
        "type": "shortcut"
      },
      {
        "text": "Follow around the van",
        "type": "follow"
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
        "bonus": 0.15
      },
      {
        "text": "Stay on the street",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Follow the ramp",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Run around the terrace",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Follow behind the bus",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow the pavement",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Follow along the wall",
        "type": "follow"
      }
    ]
  },
  {
    "id": "chase_08",
    "background": "stairs",
    "text": "The suspect takes a broad stairway. A side ramp offers an interception.",
    "options": [
      {
        "text": "Race up the stairway",
        "type": "follow"
      },
      {
        "text": "Cut across to the ramp",
        "type": "shortcut"
      }
    ]
  },
  {
    "id": "chase_09",
    "background": "street",
    "text": "A handcart narrows the pavement. An alley bypasses the delivery.",
    "options": [
      {
        "text": "Squeeze past the handcart",
        "type": "follow"
      },
      {
        "text": "Try the alley shortcut",
        "type": "shortcut"
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
        "bonus": -0.15
      },
      {
        "text": "Run through the gateway",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow the outer aisle",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Slow down and pass the dogs",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow around the fountain",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Take the clear ramp",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow around the group",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow the street",
        "type": "follow"
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
        "bonus": 0.15
      },
      {
        "text": "Stick to the pavement",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Follow the outside edge",
        "type": "follow"
      }
    ]
  },
  {
    "id": "chase_19",
    "background": "stairs",
    "text": "The suspect climbs towards a walkway. A lower path reaches the far end.",
    "options": [
      {
        "text": "Follow onto the walkway",
        "type": "follow"
      },
      {
        "text": "Intercept via the lower path",
        "type": "shortcut"
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
        "type": "shortcut"
      },
      {
        "text": "Follow around the kiosk",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Keep the suspect in sight",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow around the queue",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Run around the taxi",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow the outside steps",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Follow the outside path",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow the clear route",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Follow past the bakery",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Use the parallel ramp",
        "type": "follow"
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
        "bonus": 0.15
      },
      {
        "text": "Stay on the street",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Follow around the statue",
        "type": "follow"
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
        "type": "desperate"
      },
      {
        "text": "Stay on the clear street",
        "type": "follow"
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
        "type": "shortcut"
      },
      {
        "text": "Keep following outside",
        "type": "follow"
      }
    ]
  }
];
