export const CHASE_OUTCOME = Object.freeze({
  NOT_CAUGHT: 'not_caught',
  MISSING_WARRANT: 'missing_warrant',
  WARRANT_MISMATCH: 'warrant_mismatch',
  ARRESTED: 'arrested'
});

export function evaluateChaseOutcome({
  distance,
  suspectId,
  arrestWarrantIssued,
  warrantSuspectId
}) {
  if (
    suspectId == null ||
    !Number.isFinite(distance)
  ) {
    throw new TypeError(
      'Chase outcome requires a suspect ID and finite distance.'
    );
  }

  if (distance > 0) {
    return CHASE_OUTCOME.NOT_CAUGHT;
  }

  if (!arrestWarrantIssued || warrantSuspectId == null) {
    return CHASE_OUTCOME.MISSING_WARRANT;
  }

  if (String(warrantSuspectId) !== String(suspectId)) {
    return CHASE_OUTCOME.WARRANT_MISMATCH;
  }

  return CHASE_OUTCOME.ARRESTED;
}