/**
 * officeProps.js
 * -----------------------------------------------------------------------
 * Data-driven definitions for interactive objects placed on top of the
 * DetectiveOfficeScene background. Mirrors the pattern used in
 * scenes/office/officeHotspots.js for the Mark Agency office, so the two
 * systems stay consistent and you can eventually merge them if needed.
 *
 * Each entry:
 *  - id:        unique string, used for save/debug/lookup
 *  - textureKey: key of the image/sprite to draw (transparent PNG recommended)
 *  - x, y:      position as a FRACTION of screen width/height (0..1) so it
 *               stays responsive on different resolutions
 *  - scale:     optional scale multiplier (default 1)
 *  - condition: (state) => boolean — whether this prop should be visible
 *               right now, based on gameState. Omit for "always visible".
 *  - tooltip:   short label shown on hover (PressStart2P)
 *  - onClick:   (scene) => void — what happens when clicked
 * -----------------------------------------------------------------------
 */

export function createOfficeObjectDefinitions(scene) {
  return [
    {
      id: 'phone',
      textureKey: 'prop_phone',
      x: 0.86,
      y: 0.78,
      scale: 1,
      tooltip: 'Phone',
      condition: () => true, // always on the desk
      onClick: (s) => {
        s.scene.launch('PhoneCallScene');
        s.scene.pause();
      },
    },
    {
      id: 'computer',
      textureKey: 'prop_computer',
      x: 0.72,
      y: 0.74,
      scale: 1,
      tooltip: 'Computer',
      condition: (state) => state.office?.hasComputer === true,
      onClick: (s) => {
        s.openComputerUI ? s.openComputerUI() : s.scene.launch('EmailScene');
      },
    },
    {
      id: 'secretary',
      textureKey: 'npc_secretary',
      x: 0.12,
      y: 0.62,
      scale: 1,
      tooltip: 'Secretary',
      condition: (state) => state.office?.hasSecretary === true,
      onClick: (s) => {
        s.startDialogue ? s.startDialogue('secretary_smalltalk') : null;
      },
    },
    {
      id: 'case_files',
      textureKey: 'prop_case_files',
      x: 0.5,
      y: 0.82,
      scale: 0.9,
      tooltip: 'Case files',
      condition: (state) => state.office?.hasOpenCase === true,
      onClick: (s) => {
        s.scene.launch('CrimeBoardScene');
        s.scene.pause();
      },
    },
  ];
}