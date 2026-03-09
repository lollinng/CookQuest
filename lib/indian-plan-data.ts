export interface PlanDay {
  day: number;
  title: string;
  subtitle: string;
  recipeId: string;
  goals: string[];
  skillsLearned: string[];
  isAssemblyDay?: boolean;
}

export interface PlanWeek {
  week: number;
  title: string;
  focus: string;
  days: PlanDay[];
}

export const INDIAN_COOKING_PLAN: PlanWeek[] = [
  {
    week: 1,
    title: 'Week 1 — Absolute Basics',
    focus: 'Knife skills, boiling, simple pan cooking, rice, dal',
    days: [
      {
        day: 1,
        title: 'Kitchen Basics & Cutting Onion',
        subtitle: 'Learn how to hold a knife and chop vegetables',
        recipeId: 'ic-cutting-onion',
        goals: ['Learn how to hold a knife', 'Learn chopping technique'],
        skillsLearned: ['Knife control', 'Vegetable preparation'],
      },
      {
        day: 2,
        title: 'Make Tea & Boil Eggs',
        subtitle: 'Understand heat levels and boiling technique',
        recipeId: 'ic-chai-and-eggs',
        goals: ['Understand heat levels', 'Learn boiling technique'],
        skillsLearned: ['Boiling', 'Stove control'],
      },
      {
        day: 3,
        title: 'Masala Omelette',
        subtitle: 'Pan cooking with Indian spices',
        recipeId: 'ic-masala-omelette',
        goals: ['Learn pan cooking', 'Practice timing'],
        skillsLearned: ['Pan cooking', 'Timing'],
      },
      {
        day: 4,
        title: 'Cooking Rice',
        subtitle: 'Master the absorption method for perfect rice',
        recipeId: 'ic-plain-rice',
        goals: ['Learn water ratios', 'Practice simmering'],
        skillsLearned: ['Water ratios', 'Simmering'],
      },
      {
        day: 5,
        title: 'Simple Dal',
        subtitle: 'Your first lentil dish with tadka tempering',
        recipeId: 'ic-simple-dal',
        goals: ['Use a pressure cooker', 'Learn tempering (tadka)'],
        skillsLearned: ['Pressure cooker', 'Tadka'],
      },
      {
        day: 6,
        title: 'Aloo Sabzi',
        subtitle: 'A simple dry potato curry with cumin',
        recipeId: 'ic-aloo-sabzi',
        goals: ['Learn vegetable frying', 'Practice spice mixing'],
        skillsLearned: ['Vegetable frying'],
      },
      {
        day: 7,
        title: 'First Full Meal',
        subtitle: 'Cook rice + dal + aloo sabzi together',
        recipeId: 'ic-first-full-meal',
        goals: ['Cook multiple dishes simultaneously', 'Practice meal timing'],
        skillsLearned: ['Meal assembly', 'Multi-dish timing'],
        isAssemblyDay: true,
      },
    ],
  },
  {
    week: 2,
    title: 'Week 2 — Core Indian Cooking Skills',
    focus: 'Roti, masala base, quick protein meals, breakfast dishes',
    days: [
      {
        day: 8,
        title: 'Dough & Roti',
        subtitle: 'Knead dough and cook flatbread on a tawa',
        recipeId: 'ic-roti',
        goals: ['Learn dough consistency', 'Practice tawa cooking'],
        skillsLearned: ['Dough consistency', 'Tawa cooking'],
      },
      {
        day: 9,
        title: 'Egg Bhurji',
        subtitle: 'Spiced Indian scrambled eggs with masala',
        recipeId: 'ic-egg-bhurji',
        goals: ['Learn basic masala cooking'],
        skillsLearned: ['Basic masala cooking'],
      },
      {
        day: 10,
        title: 'Upma',
        subtitle: 'South Indian tempered semolina breakfast',
        recipeId: 'ic-upma',
        goals: ['Practice tempering', 'Learn grain cooking'],
        skillsLearned: ['Tempering', 'Grain cooking'],
      },
      {
        day: 11,
        title: 'Jeera Rice',
        subtitle: 'Cumin-tempered fragrant basmati rice',
        recipeId: 'jeera-rice',
        goals: ['Practice flavor layering with ghee and cumin'],
        skillsLearned: ['Flavor layering'],
      },
      {
        day: 12,
        title: 'Onion Tomato Masala Base',
        subtitle: 'The universal Indian curry foundation',
        recipeId: 'ic-masala-base',
        goals: ['Master bhuna masala technique'],
        skillsLearned: ['Bhuna masala'],
      },
      {
        day: 13,
        title: 'Chana Masala',
        subtitle: 'Hearty spiced chickpea curry',
        recipeId: 'chana-masala',
        goals: ['Cook a complete gravy dish'],
        skillsLearned: ['Gravy dishes'],
      },
      {
        day: 14,
        title: 'Full Indian Thali',
        subtitle: 'Roti + Dal + Curry — your graduation meal',
        recipeId: 'ic-full-thali',
        goals: ['Prepare a complete Indian thali', 'Time multiple dishes perfectly'],
        skillsLearned: ['Complete meal preparation'],
        isAssemblyDay: true,
      },
    ],
  },
];

// Helper: get all unique recipe IDs from the plan
export function getPlanRecipeIds(): string[] {
  return INDIAN_COOKING_PLAN.flatMap(w => w.days.map(d => d.recipeId));
}

// Helper: total days in the plan
export const TOTAL_PLAN_DAYS = INDIAN_COOKING_PLAN.reduce((sum, w) => sum + w.days.length, 0);
