import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  installMarkAgencyComputer
} from '../../ui/markAgencyComputerInstaller.js';

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
      label: __dialogueText("scenes/office/officeHotspots.js", "t_210e51e019366706681f"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_216776170504f412af27"),
      action: () => scene.openWarrant()
    },
    {
      id: 'crime-board',
      room: 'office',
      x: 1930,
      y: 10,
      width: 800,
      height: 430,
      label: __dialogueText("scenes/office/officeHotspots.js", "t_f4c2190c4738d459c48d"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_eadbfd908567fd5952a7"),
      action: () => scene.openCrimeBoard()
    },
    {
      id: 'globe',
      room: 'storage',
      x: 1065,
      y: 476,
      width: 160,
      height: 160,
      label: __dialogueText("scenes/office/officeHotspots.js", "t_b565e65f5df7c2f5d588"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_0808b7aac30c2db656f6"),
      action: () => scene.openDestinations()
    },
    {
      id: 'cabinet-casefile',
      room: 'storage',
      x: 1546,
      y: 457,
      width: 370,
      height: 600,
      label: __dialogueText("scenes/office/officeHotspots.js", "t_9a5f3b57e45f2ffd2284"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_8e86b283b1afa736b1b9"),
      action: () => scene.openCasefile()
    },
    {
      id: 'ledger',
      room: 'cabinet',
      x: 4101,
      y: 610,
      width: 340,
      height: 150,
      label: __dialogueText("scenes/office/officeHotspots.js", "t_23754348a003977afbf1"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_fb121486eee92f81e424"),
      action: () => scene.agencyLedgerUI.open()
    },
    {
      id: 'book-notes',
      room: 'cabinet',
      x: 4371,
      y: 703,
      width: 190,
      height: 100,
      label: __dialogueText("scenes/office/officeHotspots.js", "t_909cb81127c5e1944b16"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_ac6f0152cf68a96aa403"),
      action: () => scene.openNotes()
    },
    {
      id: 'wanted-database',
      room: 'cabinet',
      x: 4435,
      y: 469,
      width: 165,
      height: 155,
      label: __dialogueText("scenes/office/officeHotspots.js", "t_3222baf08382591a146f"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_18ad122f9da11bf604b2"),
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
      label: __dialogueText("scenes/office/officeHotspots.js", "t_ebcabaff441b24debdff"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_16d24874dd17dbdf1a10"),
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
      label: __dialogueText("scenes/office/officeHotspots.js", "t_9dee1c0ed39ef4e2686f"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_e7ee68e78b0d90c14242"),
      action: () => scene.openAtlas()
    },
    {
      id: 'brokenElevator',
      room: 'elevator',
      x: -1244,
      y: 193,
      width: 590,
      height: 760,
      label: __dialogueText("scenes/office/officeHotspots.js", "t_3baea391162382d303e4"),
      monologueKey: __dialogueText("scenes/office/officeHotspots.js", "t_fa39c3b51b271bec0391"),
      action: () => {
        scene.showOfficeStatusMessage(
          __dialogueText("scenes/office/officeHotspots.js", "t_fa98b3af7252a0132504")
        );
      }
    },
    {
      ...computer.hotspot,
      id: 'agency-computer',
      x: 2366,
      y: 444,
      width: 275,
      height: 215
    }
  ];
}