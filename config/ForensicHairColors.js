// One explicit bridge between forensic vocabulary and the avatar palette.
export const FORENSIC_HAIR_TO_AVATAR = Object.freeze({
  black:'black', brown:'brown', 'dark brown':'brown', 'light brown':'brown', brunette:'brown',
  blonde:'blonde', blond:'blonde', 'dark blonde':'blonde', 'light blonde':'blonde',
  red:'red', ginger:'red', auburn:'auburn', grey:'grey', gray:'grey',
  'dark grey':'grey', 'dark gray':'grey', white:'white', silver:'white',
  'silver grey':'white', 'silver gray':'white', teal:'teal', pink:'pink'
});
export function forensicHairAvatarId(value){
  const key=String(value??'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  return key ? FORENSIC_HAIR_TO_AVATAR[key] ?? null : null;
}
