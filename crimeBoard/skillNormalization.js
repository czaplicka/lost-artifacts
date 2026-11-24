export function normalizeSkillId(value) {
  if (typeof value !== 'string') return '';
  const id=value.trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  return ['pickpocket','pickpocketing','pick pocketing'].includes(id)?'pickpocket':id;
}
