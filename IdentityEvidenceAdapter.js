/**
 * IdentityEvidenceAdapter
 * Tłumaczy identityEvidence z CrimeLabManager.js (attribute/thief_value)
 * na format hardEvidence oczekiwany przez SuspectGenerator/forensicEvidence.js
 * (field/value, zgodny z getForensicFieldConfig() w suspectFactory.js).
 *
 * Jedyny przypadek wymagający tłumaczenia: 'dna_gender' (XX/XY) mapuje się
 * na istniejące pole 'biological_sex' (female/male) - to ta sama cecha,
 * tylko inny zapis wartości w CrimeLabManager.
 */
export function mapIdentityEvidenceToHardEvidenceField(identityEvidence) {
  if (!identityEvidence) return null;

  if (identityEvidence.attribute === 'dna_gender') {
    return {
      field: 'biological_sex',
      value: identityEvidence.thief_value === 'XY' ? 'male' : 'female'
    };
  }

  // hair_color, blood_type, fingerprint_pattern - przechodzą 1:1,
  // bo te nazwy już są zgodne z getForensicFieldConfig().
  return {
    field: identityEvidence.attribute,
    value: identityEvidence.thief_value
  };
}