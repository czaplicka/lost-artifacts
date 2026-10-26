import { installMarkAgencyComputer } from '../../ui/markAgencyComputerInstaller.js';

export function createOfficeHotspotDefinitions(scene) {
  const computer = installMarkAgencyComputer(scene);

  return [
    {
      id: 'desk',
      room: 'office',
      x: 2083,
      y: 687,
      width: 995,
      height: 270,
      label: 'Desk',
      monologueKey: 'inspect.desk',
      action: () => scene.openWarrant()
    },
    {
      id: 'crime-board',
      room: 'office',
      x: 1930,
      y: 10,
      width: 800,
      height: 430,
      label: 'Crime Board',
      monologueKey: 'inspect.crimeBoard',
      action: () => scene.openCrimeBoard()
    },
    {
      id: 'globe',
      room: 'storage',
      x: 1065,
      y: 476,
      width: 160,
      height: 160,
      label: 'Globe',
      monologueKey: 'inspect.globe',
      action: () => scene.openDestinations()
    },
    {
      id: 'cabinet-casefile',
      room: 'storage',
      x: 1546,
      y: 457,
      width: 370,
      height: 600,
      label: 'Case File Cabinet',
      monologueKey: 'inspect.caseFileCabinet',
      action: () => scene.openCasefile()
    },
    {
      id: 'ledger',
      room: 'cabinet',
      x: 4101,
      y: 610,
      width: 340,
      height: 150,
      label: 'Money Ledger',
      monologueKey: 'inspect.ledger',
      action: () => scene.agencyLedgerUI.open()
    },
    {
      id: 'book-notes',
      room: 'cabinet',
      x: 4371,
      y: 703,
      width: 190,
      height: 100,
      label: 'Book',
      monologueKey: 'inspect.notesBook',
      action: () => scene.openNotes()
    },
    {
      id: 'wanted-database',
      room: 'cabinet',
      x: 4435,
      y: 469,
      width: 165,
      height: 155,
      label: 'Wanted Database',
      monologueKey: 'inspect.wantedDatabase',
      action: () => {
        void scene.openWantedDatabase();
      }
    },
    {
      id: 'recovered-artifacts',
      room: 'cabinet',
      x: 4661,
      y: 150,
      width: 815,
      height: 780,
      label: 'Recovered Artifacts',
      monologueKey: 'inspect.recoveredArtifacts',
      action: () => {
        void scene.openRecoveredArtifacts();
      }
    },
    {
      id: 'atlas',
      room: 'cabinet',
      x: 4120,
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
      x: -1244,
      y: 193,
      width: 590,
      height: 760,
      label: 'Broken Elevator',
      monologueKey: 'inspect.brokenElevator',
      action: () => {
        scene.showOfficeStatusMessage(
          'The elevator is broken. A bold architectural statement.'
        );
      }
    },
    {
      ...computer.hotspot,
      id: 'agency-computer',
      x: 2730,
      y: 418,
      width: 190,
      height: 200
    }
  ];
}