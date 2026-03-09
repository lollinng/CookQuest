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
  {
    week: 3,
    title: 'Week 3 — Foundation & Flavours',
    focus: 'Paneer, one-pot meals, new vegetables, diverse dals',
    days: [
      {
        day: 15,
        title: 'Poha (Flattened Rice Breakfast)',
        subtitle: 'Quick one-pot breakfast with tempered spices',
        recipeId: 'ic-poha',
        goals: ['One-pot cooking', 'Tempering whole spices', 'Balancing flavors'],
        skillsLearned: ['Poha preparation', 'Spice tempering'],
      },
      {
        day: 16,
        title: 'Paneer Bhurji (Paneer Scramble)',
        subtitle: 'Spiced crumbled paneer — sauteing without gravy',
        recipeId: 'ic-paneer-bhurji',
        goals: ['Sauteing technique', 'Spice-blending without gravy'],
        skillsLearned: ['Paneer handling', 'Dry masala cooking'],
      },
      {
        day: 17,
        title: 'Matar Paneer (Peas & Paneer Curry)',
        subtitle: 'North Indian curry with onion-tomato-cashew base',
        recipeId: 'ic-matar-paneer',
        goals: ['Simmering in curry base', 'Blending/pureeing technique'],
        skillsLearned: ['Curry base', 'Simmering'],
      },
      {
        day: 18,
        title: 'Vegetable Pulao (One-pot Rice)',
        subtitle: 'Aromatic basmati rice with mixed vegetables',
        recipeId: 'ic-veg-pulao',
        goals: ['One-pot rice cooking', 'Timing management'],
        skillsLearned: ['Pulao technique', 'Whole spice infusion'],
      },
      {
        day: 19,
        title: 'Bhindi Masala (Okra Stir-fry)',
        subtitle: 'Crispy okra with spices — timing to avoid sliminess',
        recipeId: 'ic-bhindi-masala',
        goals: ['Stir-frying vegetables', 'Timing for texture'],
        skillsLearned: ['Okra cooking', 'Dry stir-fry'],
      },
      {
        day: 20,
        title: 'Masoor Dal Tadka (Red Lentil)',
        subtitle: 'Quick-cooking red lentils with spiced tempering',
        recipeId: 'ic-masoor-dal',
        goals: ['Boiling lentils', 'Tempering technique'],
        skillsLearned: ['Red lentil cooking', 'Tadka variations'],
      },
      {
        day: 21,
        title: 'Week 3 Thali',
        subtitle: 'Combine rotis, rice, dal, and sabzis into a full meal',
        recipeId: 'ic-week3-thali',
        goals: ['Multi-dish meal planning', 'Plating a balanced thali'],
        skillsLearned: ['Thali assembly', 'Week 3 techniques'],
        isAssemblyDay: true,
      },
    ],
  },
  {
    week: 4,
    title: 'Week 4 — Deeper Flavours & Techniques',
    focus: 'Stuffed breads, marination, bean curries, yogurt dishes, comfort food',
    days: [
      {
        day: 22,
        title: 'Aloo Paratha (Stuffed Flatbread)',
        subtitle: 'Dough pockets stuffed with spiced mashed potato',
        recipeId: 'ic-aloo-paratha',
        goals: ['Dough handling with filling', 'Shallow-frying'],
        skillsLearned: ['Paratha technique', 'Stuffing and rolling'],
      },
      {
        day: 23,
        title: 'Paneer Tikka (Grilled Paneer)',
        subtitle: 'Yogurt-marinated paneer grilled until charred',
        recipeId: 'ic-paneer-tikka',
        goals: ['Marination technique', 'High-heat grilling'],
        skillsLearned: ['Marination', 'Grilling/broiling'],
      },
      {
        day: 24,
        title: 'Gajar Matar Sabzi (Carrot-Pea Curry)',
        subtitle: 'Simple dry curry of carrots and peas',
        recipeId: 'ic-gajar-matar',
        goals: ['Vegetable seasoning', 'Cooking time control'],
        skillsLearned: ['Quick sabzi', 'Vegetable timing'],
      },
      {
        day: 25,
        title: 'Rajma Masala (Kidney Bean Curry)',
        subtitle: 'Hearty Punjabi-style kidney bean curry',
        recipeId: 'ic-rajma-masala',
        goals: ['Pressure-cooking beans', 'Slow simmering'],
        skillsLearned: ['Bean cooking', 'Thick curry gravy'],
      },
      {
        day: 26,
        title: 'Kadhi (Yogurt-Gram Flour Curry)',
        subtitle: 'Tangy yogurt curry thickened with besan',
        recipeId: 'ic-kadhi',
        goals: ['Whisking yogurt smoothly', 'Tempering spices'],
        skillsLearned: ['Yogurt-based curry', 'Besan handling'],
      },
      {
        day: 27,
        title: 'Khichdi (Rice-Dal Comfort Food)',
        subtitle: 'One-pot rice and lentil porridge — Indian comfort food',
        recipeId: 'ic-khichdi',
        goals: ['One-pot slow cooking', 'Water balance'],
        skillsLearned: ['Khichdi technique', 'Porridge consistency'],
      },
      {
        day: 28,
        title: 'Week 4 Thali',
        subtitle: 'North Indian feast: rajma, kadhi, rice, roti, raita',
        recipeId: 'ic-week4-thali',
        goals: ['Full North Indian meal assembly', 'Reheat and plate'],
        skillsLearned: ['Thali assembly', 'Week 4 techniques'],
        isAssemblyDay: true,
      },
    ],
  },
  {
    week: 5,
    title: 'Week 5 — Culmination & Feast',
    focus: 'Deep-frying, batters, rich curries, biryani, grand thali',
    days: [
      {
        day: 29,
        title: 'Puri Bhaji (Fried Bread & Potato Curry)',
        subtitle: 'Crispy deep-fried puris with spiced potato sabzi',
        recipeId: 'ic-puri-bhaji',
        goals: ['Deep-frying bread', 'Making potato bhaji'],
        skillsLearned: ['Deep-frying', 'Puri dough'],
      },
      {
        day: 30,
        title: 'Besan Chilla (Savory Pancake)',
        subtitle: 'Chickpea-flour pancake like an eggless omelette',
        recipeId: 'ic-besan-chilla',
        goals: ['Batter preparation', 'Pan-frying technique'],
        skillsLearned: ['Besan batter', 'Chilla cooking'],
      },
      {
        day: 31,
        title: 'Paneer Butter Masala',
        subtitle: 'Rich creamy paneer in cashew-tomato gravy',
        recipeId: 'ic-paneer-butter-masala',
        goals: ['Pureeing and blending', 'Balancing creaminess'],
        skillsLearned: ['Restaurant-style curry', 'Cream balancing'],
      },
      {
        day: 32,
        title: 'Dal Tadka (Yellow Lentils)',
        subtitle: 'Spiced yellow dal with a different tempering variation',
        recipeId: 'ic-dal-tadka-yellow',
        goals: ['Dal variation', 'New spice combinations'],
        skillsLearned: ['Toor/moong dal', 'Tadka variations'],
      },
      {
        day: 33,
        title: 'Vegetable Biryani',
        subtitle: 'Celebratory layered rice with whole spices',
        recipeId: 'ic-veg-biryani',
        goals: ['Layering technique', 'Whole spice mastery'],
        skillsLearned: ['Biryani layering', 'Dum cooking'],
      },
      {
        day: 34,
        title: 'Salad & Raita',
        subtitle: 'Fresh cucumber-tomato salad and cooling yogurt raita',
        recipeId: 'ic-salad-raita',
        goals: ['Fresh side dishes', 'Flavor balance'],
        skillsLearned: ['Raita preparation', 'Salad assembly'],
      },
      {
        day: 35,
        title: 'Grand Finale Thali',
        subtitle: 'The ultimate 5-week graduation feast',
        recipeId: 'ic-grand-thali',
        goals: ['Complete Indian feast', 'Master all techniques'],
        skillsLearned: ['Full feast preparation', '5-week mastery'],
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
