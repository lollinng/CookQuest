export const VALID_SKILL_IDS = ['basic-cooking', 'heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine'] as const;

export type SkillId = typeof VALID_SKILL_IDS[number];

export const SKILL_COLOR_NAME: Record<SkillId, string> = {
  'basic-cooking': 'blue',
  'heat-control': 'orange',
  'flavor-building': 'purple',
  'air-fryer': 'emerald',
  'indian-cuisine': 'amber',
};

export const RECIPE_ID_REGEX = /^[a-z0-9][a-z0-9-]{2,49}$/;
