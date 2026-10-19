  export function createOfficeHotspotDefinitions(scene) {
    const { rooms } = scene;

    return [
      {
        id: 'desk',
        room: 'office',
        x: rooms.office.x + 300,
        y: 500,
        width: 720,
        height: 250,
        label: 'Desk',
        monologueKey: 'inspect.desk',
        action: () => scene.openWarrant()
      },
      {
        id: 'crime-board',
        room: 'office',
        x: rooms.office.x + 10,
        y: 10,
        width: 800,
        height: 470,
        label: 'Crime Board',
        monologueKey: 'inspect.crimeBoard',
        action: () => scene.openCrimeBoard()
      },
      {
        id: 'globe',
        room: 'storage',
        x: rooms.storage.x + 1065,
        y: 490,
        width: 135,
        height: 160,
        label: 'Globe',
        monologueKey: 'inspect.globe',
        action: () => scene.openDestinations()
      },
      {
        id: 'cabinet-casefile',
        room: 'storage',
        x: rooms.storage.x + 1525,
        y: 480,
        width: 380,
        height: 450,
        label: 'Case File Cabinet',
        monologueKey: 'inspect.caseFileCabinet',
        action: () => scene.openCasefile()
      },
          {
        id: 'ledger',
        room: 'cabinet',
        x: rooms.cabinet.x + 290,
        y: 620,
        width: 340,
        height: 150,
        label: 'Money Ledger',
        monologueKey: 'inspect.ledger',
        action: () => scene.agencyLedgerUI.open()
      },
      {
        id: 'book-notes',
        room: 'cabinet',
        x: rooms.cabinet.x + 525,
        y: 705,
        width: 190,
        height: 100,
        label: 'Book',
        monologueKey: 'inspect.notesBook',
        action: () => scene.openNotes()
      },
      {
        id: 'wanted-database',
        room: 'cabinet',
        x: rooms.cabinet.x + 605,
        y: 480,
        width: 130,
        height: 130,
        label: 'Wanted Database',
        monologueKey: 'inspect.wantedDatabase',
        action: () => {
          void scene.openWantedDatabase();
        }
      },
      {
        id: 'recovered-artifacts',
        room: 'cabinet',
        x: rooms.cabinet.x + 820,
        y: 150,
        width: 785,
        height: 725,
        label: 'Recovered Artifacts',
        monologueKey: 'inspect.recoveredArtifacts',
        action: () => {
          void scene.openRecoveredArtifacts();
        }
      },
      {
        id: 'atlas',
        room: 'cabinet',
        x: rooms.cabinet.x + 280,
        y: 270,
        width: 325,
        height: 270,
        label: 'Atlas',
        monologueKey: 'inspect.atlas',
        action: () => scene.openAtlas()
      },
      {
        id: 'brokenElevator',
        room: 'elevator',
        x: rooms.elevator.x + 660,
        y: 200,
        width: 590,
        height: 700,
        label: 'Broken Elevator',
        monologueKey: 'inspect.brokenElevator',
        action: () => {
          scene.showOfficeStatusMessage(
            'The elevator is broken. A bold architectural statement.'
          );
        }
      }
    ];
  }