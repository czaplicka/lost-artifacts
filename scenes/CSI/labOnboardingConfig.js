export const LAB_ONBOARDING_CONFIG = {
  call_only: {
    backgroundKey: 'crimelab_point_assistant',
    playerGameCount: 0,
    assistantResultCount: 3,
    assistantPresent: true,
    hintTitle: 'FORENSIC RESULTS READY',
    hintText: 'The lab assistant has finished all three analyses. Review the evidence to narrow the suspect list.',
    assistantLine: 'I handled the samples. You handle the part where the suspect panics.'
  },

  single_game: {
    backgroundKey: 'crimelab_point_assistant',
    playerGameCount: 1,
    assistantResultCount: 2,
    assistantPresent: true,
    hintTitle: 'ONE SAMPLE NEEDS YOU',
    hintText: 'Two results are ready. Complete one analysis to finish the forensic profile.',
    assistantLine: 'I have two results. You get one machine and a very flattering amount of responsibility.'
  },

  two_games: {
    backgroundKey: 'crimelab_point_assistant',
    playerGameCount: 2,
    assistantResultCount: 1,
    assistantPresent: true,
    hintTitle: 'TWO SAMPLES REMAIN',
    hintText: 'One result is ready. Complete two analyses to finish the forensic profile.',
    assistantLine: 'I saved you the interesting samples. That was either kindness or a mistake.'
  },

  three_games: {
    backgroundKey: 'crimelab_point',
    playerGameCount: 3,
    assistantResultCount: 0,
    assistantPresent: false,
    hintTitle: 'LABORATORY ACCESS GRANTED',
    hintText: 'The assistant is unavailable. Complete all three analyses to build the forensic profile.',
    assistantLine: 'NOTE: Use the machines in the order the labels suggest. The labels are mostly right.'
  }
};

export function getLabOnboardingConfig(labMode) {
  return LAB_ONBOARDING_CONFIG[labMode]
    || LAB_ONBOARDING_CONFIG.three_games;
}