import type { Recipe } from '@/lib/types'

export const RECIPES: Recipe[] = [
  // Basic Cooking Skills
  {
    id: 'boiled-egg',
    title: 'Perfect Boiled Egg',
    description: 'Learn the basics of boiling eggs to perfection',
    skill: 'basic-cooking',
    difficulty: 'beginner',
    xpReward: 100,
    time: '10 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?w=800&fit=crop&q=80',
    emoji: '🥚',
    ingredients: [
      '2 large eggs',
      'Water (enough to cover eggs)',
      'Salt (pinch)',
      'Ice water for cooling'
    ],
    instructions: [
      'Bring a pot of water to a rolling boil',
      'Gently lower eggs into the boiling water using a spoon',
      'Cook for 6-7 minutes for soft-boiled, 8-10 for hard-boiled',
      'Immediately transfer to ice water to stop cooking',
      'Let cool for 2 minutes before peeling'
    ],
    tips: [
      'Use eggs that are at least a week old for easier peeling',
      'Start timing once the water returns to a boil',
      'The ice bath prevents overcooking and gray rings'
    ]
  },
  {
    id: 'make-rice',
    title: 'Perfect Rice',
    description: 'Master the art of cooking fluffy, perfect rice every time',
    skill: 'basic-cooking',
    difficulty: 'beginner',
    xpReward: 100,
    time: '20 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400',
    emoji: '🍚',
    ingredients: [
      '1 cup long-grain white rice',
      '2 cups water',
      '1/2 teaspoon salt',
      '1 tablespoon butter (optional)'
    ],
    instructions: [
      'Rinse rice in cold water until water runs clear',
      'Combine rice, water, and salt in a medium saucepan',
      'Bring to a boil over medium-high heat',
      'Reduce heat to low, cover, and simmer for 18 minutes',
      'Remove from heat and let stand 5 minutes',
      'Fluff with a fork before serving'
    ],
    tips: [
      'The ratio is key: 1:2 rice to water for most white rice',
      'Don\'t lift the lid during cooking',
      'Let it rest - this step is crucial for fluffy rice'
    ]
  },
  {
    id: 'chop-onion',
    title: 'Proper Onion Chopping',
    description: 'Learn knife skills and proper onion dicing technique',
    skill: 'basic-cooking', 
    difficulty: 'beginner',
    xpReward: 100,
    time: '5 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400',
    emoji: '🧅',
    ingredients: [
      '1 medium yellow onion',
      'Sharp chef\'s knife',
      'Cutting board'
    ],
    instructions: [
      'Cut onion in half from root to tip',
      'Peel off outer layer, leaving root end intact',
      'Make horizontal cuts toward root (don\'t cut through)',
      'Make vertical cuts from top to bottom',
      'Finally, slice across to create uniform dice',
      'Discard root end'
    ],
    tips: [
      'Keep the root end intact until the final cuts',
      'Use a sharp knife to minimize tears',
      'Cut near a window or use a fan to reduce crying'
    ]
  },

  // Heat Control Skills
  {
    id: 'sear-steak',
    title: 'Perfect Steak Searing',
    description: 'Master high-heat searing for restaurant-quality steaks',
    skill: 'heat-control',
    difficulty: 'intermediate',
    xpReward: 150,
    time: '15 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',
    emoji: '🥩',
    ingredients: [
      '2 ribeye or NY strip steaks (1-inch thick)',
      '2 tablespoons vegetable oil',
      'Salt and freshly ground black pepper',
      '2 tablespoons butter',
      '2 garlic cloves',
      'Fresh thyme sprigs'
    ],
    instructions: [
      'Remove steaks from fridge 30 minutes before cooking',
      'Season generously with salt and pepper',
      'Heat cast iron skillet over high heat until smoking',
      'Add oil and carefully place steaks in pan',
      'Sear 3-4 minutes without moving',
      'Flip and sear other side 3-4 minutes',
      'Add butter, garlic, and thyme; baste steaks',
      'Check internal temperature and rest 5 minutes'
    ]
  },
  {
    id: 'simmer-soup',
    title: 'Gentle Simmering',
    description: 'Learn to maintain perfect simmering temperature',
    skill: 'heat-control',
    difficulty: 'beginner',
    xpReward: 100,
    time: '45 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    emoji: '🍲',
    ingredients: [
      '4 cups chicken or vegetable broth',
      '1 cup diced vegetables',
      '1/2 cup grains or pasta',
      'Herbs and seasonings'
    ],
    instructions: [
      'Bring liquid to a rolling boil',
      'Reduce heat to low-medium',
      'Adjust until you see gentle bubbles breaking surface',
      'Maintain this temperature throughout cooking',
      'Add ingredients based on cooking time needed'
    ]
  },
  {
    id: 'deep-fry',
    title: 'Safe Deep Frying',
    description: 'Master temperature control for perfect deep frying',
    skill: 'heat-control',
    difficulty: 'advanced',
    xpReward: 200,
    time: '30 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&fit=crop&q=80',
    emoji: '🍟',
    ingredients: [
      'Neutral oil for frying',
      'Food thermometer',
      'Food to fry',
      'Paper towels',
      'Wire rack'
    ],
    instructions: [
      'Fill pot with oil 2-3 inches deep',
      'Heat to 350°F (175°C)',
      'Test temperature with thermometer',
      'Carefully add food in small batches',
      'Don\'t overcrowd the oil',
      'Remove when golden brown',
      'Drain on wire rack'
    ]
  },
  {
    id: 'stir-fry',
    title: 'High-Heat Stir Frying',
    description: 'Quick cooking over very high heat',
    skill: 'heat-control',
    difficulty: 'intermediate',
    xpReward: 150,
    time: '10 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
    emoji: '🥘',
    ingredients: [
      '2 cups mixed vegetables',
      '2 tablespoons oil',
      'Sauce ingredients',
      'Protein (optional)'
    ],
    instructions: [
      'Heat wok or large skillet until smoking',
      'Add oil in a circle around pan',
      'Add ingredients in order of cooking time',
      'Keep food moving constantly',
      'Cook quickly over highest heat'
    ]
  },
  {
    id: 'grill-chicken',
    title: 'Grilling Technique',
    description: 'Master direct and indirect heat grilling',
    skill: 'heat-control',
    difficulty: 'intermediate',
    xpReward: 150,
    time: '25 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&fit=crop&q=80',
    emoji: '🔥',
    ingredients: [
      'Chicken pieces',
      'Marinade or seasoning',
      'Oil for grates'
    ],
    instructions: [
      'Preheat grill to medium-high',
      'Oil the grates',
      'Start chicken skin-side down',
      'Don\'t move until ready to flip',
      'Use thermometer to check doneness'
    ]
  },

  // Flavor Building Skills
  {
    id: 'make-sauce',
    title: 'Basic Pan Sauce',
    description: 'Create flavorful sauces from pan drippings',
    skill: 'flavor-building',
    difficulty: 'intermediate',
    xpReward: 150,
    time: '10 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&fit=crop&q=80',
    emoji: '🥄',
    ingredients: [
      'Pan drippings',
      '1/4 cup wine or stock',
      '2 tablespoons butter',
      'Herbs and seasonings'
    ],
    instructions: [
      'Remove protein from pan, keep warm',
      'Pour out excess fat, leaving brown bits',
      'Add liquid to deglaze pan',
      'Scrape up browned bits with wooden spoon',
      'Reduce liquid by half',
      'Whisk in cold butter for richness',
      'Season and strain if desired'
    ]
  },
  {
    id: 'season-taste',
    title: 'Seasoning to Taste',
    description: 'Develop your palate and seasoning skills',
    skill: 'flavor-building',
    difficulty: 'beginner',
    xpReward: 100,
    time: '15 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
    emoji: '🧂',
    ingredients: [
      'Salt',
      'Acid (lemon juice, vinegar)',
      'Fat (butter, oil)',
      'Heat (pepper, spice)'
    ],
    instructions: [
      'Taste your dish before seasoning',
      'Add salt gradually - you can always add more',
      'Balance with acid to brighten flavors',
      'Consider fat for richness and mouthfeel',
      'Adjust heat level to preference',
      'Taste after each addition'
    ]
  },
  {
    id: 'herb-pairing',
    title: 'Herb and Spice Pairing',
    description: 'Learn classic flavor combinations',
    skill: 'flavor-building',
    difficulty: 'beginner',
    xpReward: 100,
    time: '20 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    emoji: '🌿',
    ingredients: [
      'Fresh herbs (basil, thyme, rosemary)',
      'Dried spices (cumin, paprika, oregano)',
      'Base ingredients to season'
    ],
    instructions: [
      'Learn classic pairings: tomato + basil',
      'Understand herb families and strengths',
      'Add hardy herbs early, delicate ones late',
      'Toast whole spices to release oils',
      'Build layers of flavor'
    ]
  },
  {
    id: 'spice-blend',
    title: 'Creating Spice Blends',
    description: 'Mix your own signature spice combinations',
    skill: 'flavor-building',
    difficulty: 'intermediate',
    xpReward: 150,
    time: '15 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
    emoji: '🌶️',
    ingredients: [
      'Whole spices',
      'Ground spices',
      'Salt',
      'Sugar (optional)'
    ],
    instructions: [
      'Toast whole spices in dry pan',
      'Cool completely before grinding',
      'Combine with pre-ground spices',
      'Balance heat, sweet, savory elements',
      'Store in airtight container'
    ]
  },
  {
    id: 'marinate',
    title: 'Marinating Techniques',
    description: 'Infuse foods with flavor and tenderness',
    skill: 'flavor-building',
    difficulty: 'beginner',
    xpReward: 100,
    time: '2-24 hours',
    imageUrl: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400',
    emoji: '🥩',
    ingredients: [
      'Acid (citrus, vinegar, wine)',
      'Oil',
      'Aromatics (herbs, garlic)',
      'Salt',
      'Protein or vegetables'
    ],
    instructions: [
      'Combine acid, oil, and aromatics',
      'Don\'t over-marinate delicate proteins',
      'Use non-reactive containers',
      'Reserve some marinade before adding raw meat',
      'Pat dry before cooking for better browning'
    ]
  },
  {
    id: 'balance-flavors',
    title: 'Flavor Balance',
    description: 'Master the art of balancing sweet, salty, sour, bitter',
    skill: 'flavor-building',
    difficulty: 'advanced',
    xpReward: 200,
    time: '30 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    emoji: '⚖️',
    ingredients: [
      'Various dishes to taste and adjust',
      'Salt',
      'Sugar or honey',
      'Acid (lemon, vinegar)',
      'Bitter elements (herbs, greens)'
    ],
    instructions: [
      'Identify dominant flavors in your dish',
      'Add opposing elements to create balance',
      'Too salty? Add acid or sweet',
      'Too sweet? Add salt or acid',
      'Too rich? Add acid or bitter greens',
      'Taste and adjust incrementally'
    ]
  },
  {
    id: 'umami-boost',
    title: 'Understanding Umami',
    description: 'Add depth with the fifth taste',
    skill: 'flavor-building',
    difficulty: 'intermediate',
    xpReward: 150,
    time: '20 minutes',
    imageUrl: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400',
    emoji: '🍄',
    ingredients: [
      'Mushrooms',
      'Tomato paste',
      'Parmesan cheese',
      'Soy sauce or fish sauce',
      'Miso paste'
    ],
    instructions: [
      'Identify umami-rich ingredients',
      'Layer multiple umami sources',
      'Brown mushrooms to concentrate flavor',
      'Use aged cheeses and cured meats',
      'Add small amounts of fermented ingredients',
      'Build umami through cooking techniques'
    ]
  }
]

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find(recipe => recipe.id === id)
}

export function getRecipesBySkill(skill: string): Recipe[] {
  return RECIPES.filter(recipe => recipe.skill === skill)
}

export function getAllSkills() {
  return [
    {
      id: 'basic-cooking' as const,
      name: 'Basic Cooking',
      description: 'Essential cooking fundamentals',
      icon: '👨‍🍳',
      recipes: ['boiled-egg', 'make-rice', 'chop-onion'],
      color: 'blue'
    },
    {
      id: 'heat-control' as const,
      name: 'Heat Control',
      description: 'Master temperature and timing',
      icon: '🔥',
      recipes: ['sear-steak', 'simmer-soup', 'deep-fry', 'stir-fry', 'grill-chicken'],
      color: 'orange'
    },
    {
      id: 'flavor-building' as const,
      name: 'Flavor Building',
      description: 'Develop complex, balanced flavors',
      icon: '🌟',
      recipes: ['make-sauce', 'season-taste', 'herb-pairing', 'spice-blend', 'marinate', 'balance-flavors', 'umami-boost'],
      color: 'purple'
    }
  ]
}