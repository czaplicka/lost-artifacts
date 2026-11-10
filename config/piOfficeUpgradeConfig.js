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
    label: 'Reference books',
    action: 'inspect',
    message:
      'An impressive collection. Some of the books have even been opened.'
  },
  {
    id: 'office_painting',
    key: 'painting',
    label: 'Framed painting',
    action: 'inspect',
    message:
      'Original art. According to the receipt, which is also original art.'
  },
  {
    id: 'office_artifact',
    key: 'artifact',
    label: 'Display artefact',
    action: 'inspect',
    message:
      'A legally acquired conversation piece. Please stop asking.'
  },
  {
    id: 'office_chairs',
    key: 'chairs',
    label: 'Visitor chairs',
    action: 'inspect',
    message:
      'Clients can now sit comfortably while withholding relevant information.'
  },
  {
    id: 'office_coffee',
    key: 'coffee',
    label: 'Coffee machine',
    action: 'inspect',
    message:
      'The coffee is strong. The business model remains under investigation.'
  },
  {
    id: 'office_tv',
    key: 'pi__office__tv',
    label: 'Television',
    action: 'inspect',
    message:
      'The television is installed. Programme selection will follow.'
  },
  {
    id: 'office_crime_board',
    key: 'pi__office__crime-board',
    label: 'Investigation board',
    action: 'investigations'
  },
  {
    id: 'office_case_files',
    key: 'case-files',
    label: 'Case files',
    action: 'archive'
  },
  {
    id: 'office_printer',
    key: 'printer',
    label: 'Printer',
    action: 'documents'
  },
  {
    id: 'office_notepad',
    key: 'notepad',
    label: 'Case notes',
    action: 'notebook'
  }
];

// Współrzędne względne: środek X/Y i szerokość/wysokość.
export const PI_BIG_OFFICE_HOTSPOTS = [
  {
    id: 'computer',
    label: 'Computer',
    x: 0.531,
    y: 0.554,
    w: 0.116,
    h: 0.246,
    action: 'computer'
  },
  {
    id: 'phone',
    label: 'Phone',
    x: 0.621,
    y: 0.613,
    w: 0.071,
    h: 0.103,
    action: 'phone'
  },
  {
    id: 'city-door',
    label: 'Go to your city',
    x: 0.424,
    y: 0.418,
    w: 0.093,
    h: 0.322,
    action: 'city'
  }
];