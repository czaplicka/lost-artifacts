export const PI_COMPUTER_CONFIG = {
  mail: [
    {
      id: 'welcome',
      from: 'Office Administration',
      subject: 'Your office is ready',
      body:
        'Detective,\n\n' +
        'Your office is officially open.\n' +
        'The computer works. The phone probably works. ' +
        'The landlord insists the noises in the walls are structural.\n\n' +
        'Check the classifieds for private work. ' +
        'Your personal ledger tracks your own money, not agency funds.'
    },
    {
      id: 'anonymous-warning',
      from: 'Unknown sender',
      subject: 'Do not trust the man with the umbrella',
      body:
        'Especially when it is not raining.\n\n' +
        'That is all I can say for now.'
    }
  ],

  classifieds: [
    {
      id: 'missing-briefcase',
      kind: 'pi_case',
      title: 'Missing briefcase. Discretion required.',
      contact: 'E. Mercer',
      reward: 120,
      body:
        'A brown leather briefcase disappeared from the tavern last night.\n\n' +
        'I need it returned unopened. The contents are personal. ' +
        'The fact that it is handcuffed to someone is a complication, ' +
        'not an invitation to ask questions.'
    },
    {
      id: 'window-watcher',
      kind: 'pi_case',
      title: 'Someone is watching my window',
      contact: 'Mrs. Bell, above the bakery',
      reward: 80,
      body:
        'Every evening at nine, someone stands across the street ' +
        'and watches my window.\n\n' +
        'The police say it is a parking meter. ' +
        'A parking meter would not judge my curtains.'
    },
    {
      id: 'haunted-chair',
      kind: 'oddity',
      title: 'For sale: possibly haunted chair',
      contact: 'Ask at the tavern',
      body:
        'Excellent condition. One previous owner. ' +
        'One current occupant, depending on your beliefs.\n\n' +
        'Collection only. Bring a friend.'
    },
    {
      id: 'alibi-club',
      kind: 'oddity',
      title: 'Tuesday Alibi Club',
      contact: 'The back room',
      body:
        'Were you somewhere last Tuesday?\n' +
        'Would you like to have been somewhere else?\n\n' +
        'Our next meeting has been cancelled on legal advice.'
    }
  ]
};