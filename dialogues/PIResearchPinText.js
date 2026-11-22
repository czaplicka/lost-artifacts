export const PI_RESEARCH_PIN_TEXT = Object.freeze({
  pin:'PIN TO BOARD', pinned:'PINNED',
  help:'Pin this research note to the case board. This does not verify the lead.',
  done:'Pinned: {label}', existing:'This note is already on this case board.',
  unknown:'Only collected research notes can be pinned.',
  noCase:'No investigation board is assigned to this notebook case.',
  ambiguous:'This notebook case matches more than one investigation. Nothing was pinned.',
  unavailable:'The case board is not available right now.',
  source:'Research notebook — {title}',
  warning:'A research lead, not a verified conclusion.'
});
export function piResearchPinText(id,values={}){
  const text=PI_RESEARCH_PIN_TEXT[id];
  if(typeof text!=='string')throw new Error(`Unknown research pin text: ${id}`);
  return text.replace(/\{(\w+)\}/g,(match,key)=>Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):match);
}
