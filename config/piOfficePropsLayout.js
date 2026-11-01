// Initial staging layout, relative to the source background (not final art direction).
// D in PI office previews all props without granting ownership.
// Drag / arrows move; Shift+arrows resize; S saves this game's layout; C exports.
export const PI_OFFICE_PROPS = [
  { id:'secretary', itemId:'office_assistant', label:'Assistant',
    textureKey:'office_assistant', textureUrl:'assets/pi/office/office_assistant.webp',
    x:0.12, y:0.57, w:0.15, h:0.49, depth:30, action:'assistant' },
  { id:'case_files', itemId:'office_case_files', label:'Case files',
    textureKey:'office_case_files', textureUrl:'assets/pi/office/office_case_files.webp',
    x:0.55, y:0.82, w:0.13, h:0.14, depth:40, action:'archive' },
  { id:'printer', itemId:'office_printer', label:'Printer',
    textureKey:'office_printer', textureUrl:'assets/pi/office/office_printer.webp',
    x:0.64, y:0.68, w:0.17, h:0.20, depth:35, action:'documents' },
  { id:'employee', itemId:'office_employee', label:'Junior investigator',
    textureKey:'office_employee', textureUrl:'assets/pi/office/office_employee.webp',
    x:0.89, y:0.49, w:0.14, h:0.46, depth:25, action:'employee' }
];
