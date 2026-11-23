export const PIGEON_NAMING_TEXT = Object.freeze({
  unnamed:'Pigeon', suggestion:'Watson', next:'You need a name.', choose:'Choose a name',
  intro:"You: So. You're staying?\nPigeon: Coo.\nYou: I'll take that as a lease agreement.",
  proposal:"You: You need a name. Watson, perhaps?\nPigeon: Coo.\nYou: A partner who can't contradict me. Excellent.",
  renameIntro:"You: We should discuss your professional identity.\nPigeon: Coo.\nYou: No, this is not a promotion.",
  named:"You: {name}, it is.\n{name}: Coo.\nYou: Your business cards will be printed on breadcrumbs.",
  namedWatson:"You: Watson, it is.\nWatson: Coo.\nYou: Elementary. Bread first, deductions later.",
  title:'NAME YOUR PARTNER', label:"Pigeon's name", hint:'Suggestion: Watson. Or choose a name of your own.',
  useSuggestion:'USE WATSON', confirm:'CONFIRM NAME', cancel:'NOT NOW',
  empty:'Please enter a name, or choose USE WATSON.',
  tooLong:'Please keep the name to {max} characters.',
  unavailable:'Your partner is not here right now.', failed:'The name could not be saved.',
  naming:'Choosing a name...'
});
export function pigeonNamingText(id,values={}){
  const value=PIGEON_NAMING_TEXT[id];
  if(typeof value!=='string')throw new Error(`Unknown pigeon naming text: ${id}`);
  return value.replace(/\{(\w+)\}/g,(match,key)=>Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):match);
}
