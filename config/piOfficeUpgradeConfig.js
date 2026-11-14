import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const ROOT = 'assets/pi/office/';

export const PI_OFFICE_IMAGES = [
  ['bigger-office', `${ROOT}bigger-office.webp`],
  ['bigger-office-ad', `${ROOT}bigger-office-ad.webp`],
  ['bigger-office-reality', `${ROOT}bigger-office-reality.webp`],
  ['artifact', `${ROOT}artifact.webp`],
  ['books', `${ROOT}books.webp`],
  ['case-files', `${ROOT}case-files.webp`],
  ['chairs', `${ROOT}chairs.webp`],
  ['coffee', `${ROOT}coffee.webp`],
  ['pi__office__crime-board', `${ROOT}crime-board.webp`],
  ['notepad', `${ROOT}notepad.webp`],
  ['painting', `${ROOT}painting.webp`],
  ['printer', `${ROOT}printer.webp`],
  ['pi__office__tv', `${ROOT}tv.webp`]
];

export const PI_OFFICE_LAYERS = [
  {
    id: 'office_books',
    key: 'books',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_624612ef68aa9af92b9d"),
    action: 'inspect',
    message:
      __dialogueText("config/piOfficeUpgradeConfig.js", "t_2029d545d7c7988d27df")
  },
  {
    id: 'office_painting',
    key: 'painting',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_7118439e7f0ed2acb9e8"),
    action: 'inspect',
    message:
      __dialogueText("config/piOfficeUpgradeConfig.js", "t_cd7be85c0566fcfc5f7e")
  },
  {
    id: 'office_artifact',
    key: 'artifact',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_5df13116a952957967c3"),
    action: 'inspect',
    message:
      __dialogueText("config/piOfficeUpgradeConfig.js", "t_b01fae5dc3c8dafb5aa0")
  },
  {
    id: 'office_chairs',
    key: 'chairs',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_917422d8b9d4e7be5f2c"),
    action: 'inspect',
    message:
      __dialogueText("config/piOfficeUpgradeConfig.js", "t_b5cf7a7dd2a8e5a7b6da")
  },
  {
    id: 'office_coffee',
    key: 'coffee',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_f5caf04f3b23704c3131"),
    action: 'inspect',
    message:
      __dialogueText("config/piOfficeUpgradeConfig.js", "t_f41bea6c7508c3e35529")
  },
  {
    id: 'office_tv',
    key: 'pi__office__tv',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_7e7536a95dcfb769ac5b"),
    action: 'inspect',
    message:
      __dialogueText("config/piOfficeUpgradeConfig.js", "t_ee726bd3862b4c6c5df4")
  },
  {
    id: 'office_crime_board',
    key: 'pi__office__crime-board',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_761dc89ce50bae18728a"),
    action: 'investigations'
  },
  {
    id: 'office_case_files',
    key: 'case-files',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_379b0a5b2b40623a825b"),
    action: 'archive'
  },
  {
    id: 'office_printer',
    key: 'printer',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_024eac5b1a63e0f892e1"),
    action: 'documents'
  },
  {
    id: 'office_notepad',
    key: 'notepad',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_54c2a0df2066284a217f"),
    action: 'notebook'
  }
];

// Współrzędne względne: środek X/Y i szerokość/wysokość.
export const PI_BIG_OFFICE_HOTSPOTS = [
  {
    id: 'computer',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_76ed42d22129dc354362"),
    x: 0.531,
    y: 0.554,
    w: 0.116,
    h: 0.246,
    action: 'computer'
  },
  {
    id: 'phone',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_63dceb8800b2dd4af956"),
    x: 0.621,
    y: 0.613,
    w: 0.071,
    h: 0.103,
    action: 'phone'
  },
  {
    id: 'city-door',
    label: __dialogueText("config/piOfficeUpgradeConfig.js", "t_a702c0a54c9e904b9a09"),
    x: 0.424,
    y: 0.418,
    w: 0.093,
    h: 0.322,
    action: 'city'
  }
];