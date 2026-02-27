-- CookQuest Seed Data
-- Initial data to populate the database

-- ================================
-- Skills Data
-- ================================

INSERT INTO skills (id, name, description, icon, color, sort_order) VALUES
('basic-cooking', 'Basic Cooking', 'Essential cooking fundamentals', '👨‍🍳', 'blue', 1),
('heat-control', 'Heat Control', 'Master temperature and timing', '🔥', 'orange', 2),
('flavor-building', 'Flavor Building', 'Develop complex, balanced flavors', '🌟', 'purple', 3),
('air-fryer', 'Air Fryer Mastery', 'Master the art of crispy, healthy air fryer cooking', '🍟', 'emerald', 4),
('indian-cuisine', 'Indian Cuisine', 'Explore the rich flavors and techniques of Indian cooking', '🍛', 'amber', 5);

-- ================================
-- Recipes Data (migrated from TypeScript)
-- ================================

INSERT INTO recipes (id, title, description, skill_id, difficulty, prep_time, cook_time, total_time, servings, image_url, emoji, instructions, ingredients, tips) VALUES
-- Basic Cooking Recipes
('boiled-egg', 'Perfect Boiled Egg', 'Learn the basics of boiling eggs to perfection', 'basic-cooking', 'beginner', 2, 8, '10 minutes', 2, 'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?w=800&fit=crop&q=80', '🥚',
'["Bring a pot of water to a rolling boil", "Gently lower eggs into the boiling water using a spoon", "Cook for 6-7 minutes for soft-boiled, 8-10 for hard-boiled", "Immediately transfer to ice water to stop cooking", "Let cool for 2 minutes before peeling"]',
'["2 large eggs", "Water (enough to cover eggs)", "Salt (pinch)", "Ice water for cooling"]',
'["Use eggs that are at least a week old for easier peeling", "Start timing once the water returns to a boil", "The ice bath prevents overcooking and gray rings"]'),

('make-rice', 'Perfect Rice', 'Master the art of cooking fluffy, perfect rice every time', 'basic-cooking', 'beginner', 5, 18, '20 minutes', 4, 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400', '🍚',
'["Rinse rice in cold water until water runs clear", "Combine rice, water, and salt in a medium saucepan", "Bring to a boil over medium-high heat", "Reduce heat to low, cover, and simmer for 18 minutes", "Remove from heat and let stand 5 minutes", "Fluff with a fork before serving"]',
'["1 cup long-grain white rice", "2 cups water", "1/2 teaspoon salt", "1 tablespoon butter (optional)"]',
'["The ratio is key: 1:2 rice to water for most white rice", "Don\'t lift the lid during cooking", "Let it rest - this step is crucial for fluffy rice"]'),

('chop-onion', 'Proper Onion Chopping', 'Learn knife skills and proper onion dicing technique', 'basic-cooking', 'beginner', 5, 0, '5 minutes', 1, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400', '🧅',
'["Cut onion in half from root to tip", "Peel off outer layer, leaving root end intact", "Make horizontal cuts toward root (don\'t cut through)", "Make vertical cuts from top to bottom", "Finally, slice across to create uniform dice", "Discard root end"]',
'["1 medium yellow onion", "Sharp chef\'s knife", "Cutting board"]',
'["Keep the root end intact until the final cuts", "Use a sharp knife to minimize tears", "Cut near a window or use a fan to reduce crying"]'),

-- Heat Control Recipes
('sear-steak', 'Perfect Steak Searing', 'Master high-heat searing for restaurant-quality steaks', 'heat-control', 'intermediate', 5, 10, '15 minutes', 2, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400', '🥩',
'["Remove steaks from fridge 30 minutes before cooking", "Season generously with salt and pepper", "Heat cast iron skillet over high heat until smoking", "Add oil and carefully place steaks in pan", "Sear 3-4 minutes without moving", "Flip and sear other side 3-4 minutes", "Add butter, garlic, and thyme; baste steaks", "Check internal temperature and rest 5 minutes"]',
'["2 ribeye or NY strip steaks (1-inch thick)", "2 tablespoons vegetable oil", "Salt and freshly ground black pepper", "2 tablespoons butter", "2 garlic cloves", "Fresh thyme sprigs"]',
'[]'),

('simmer-soup', 'Gentle Simmering', 'Learn to maintain perfect simmering temperature', 'heat-control', 'beginner', 10, 35, '45 minutes', 4, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400', '🍲',
'["Bring liquid to a rolling boil", "Reduce heat to low-medium", "Adjust until you see gentle bubbles breaking surface", "Maintain this temperature throughout cooking", "Add ingredients based on cooking time needed"]',
'["4 cups chicken or vegetable broth", "1 cup diced vegetables", "1/2 cup grains or pasta", "Herbs and seasonings"]',
'[]'),

('deep-fry', 'Safe Deep Frying', 'Master temperature control for perfect deep frying', 'heat-control', 'advanced', 10, 20, '30 minutes', 4, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&fit=crop&q=80', '🍟',
'["Fill pot with oil 2-3 inches deep", "Heat to 350°F (175°C)", "Test temperature with thermometer", "Carefully add food in small batches", "Don\'t overcrowd the oil", "Remove when golden brown", "Drain on wire rack"]',
'["Neutral oil for frying", "Food thermometer", "Food to fry", "Paper towels", "Wire rack"]',
'[]'),

('stir-fry', 'High-Heat Stir Frying', 'Quick cooking over very high heat', 'heat-control', 'intermediate', 15, 5, '10 minutes', 2, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400', '🥘',
'["Heat wok or large skillet until smoking", "Add oil in a circle around pan", "Add ingredients in order of cooking time", "Keep food moving constantly", "Cook quickly over highest heat"]',
'["2 cups mixed vegetables", "2 tablespoons oil", "Sauce ingredients", "Protein (optional)"]',
'[]'),

('grill-chicken', 'Grilling Technique', 'Master direct and indirect heat grilling', 'heat-control', 'intermediate', 15, 20, '25 minutes', 4, 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&fit=crop&q=80', '🔥',
'["Preheat grill to medium-high", "Oil the grates", "Start chicken skin-side down", "Don\'t move until ready to flip", "Use thermometer to check doneness"]',
'["Chicken pieces", "Marinade or seasoning", "Oil for grates"]',
'[]'),

-- Flavor Building Recipes
('make-sauce', 'Basic Pan Sauce', 'Create flavorful sauces from pan drippings', 'flavor-building', 'intermediate', 5, 5, '10 minutes', 4, 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&fit=crop&q=80', '🥄',
'["Remove protein from pan, keep warm", "Pour out excess fat, leaving brown bits", "Add liquid to deglaze pan", "Scrape up browned bits with wooden spoon", "Reduce liquid by half", "Whisk in cold butter for richness", "Season and strain if desired"]',
'["Pan drippings", "1/4 cup wine or stock", "2 tablespoons butter", "Herbs and seasonings"]',
'[]'),

('season-taste', 'Seasoning to Taste', 'Develop your palate and seasoning skills', 'flavor-building', 'beginner', 15, 0, '15 minutes', 1, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400', '🧂',
'["Taste your dish before seasoning", "Add salt gradually - you can always add more", "Balance with acid to brighten flavors", "Consider fat for richness and mouthfeel", "Adjust heat level to preference", "Taste after each addition"]',
'["Salt", "Acid (lemon juice, vinegar)", "Fat (butter, oil)", "Heat (pepper, spice)"]',
'[]'),

('herb-pairing', 'Herb and Spice Pairing', 'Learn classic flavor combinations', 'flavor-building', 'beginner', 20, 0, '20 minutes', 1, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', '🌿',
'["Learn classic pairings: tomato + basil", "Understand herb families and strengths", "Add hardy herbs early, delicate ones late", "Toast whole spices to release oils", "Build layers of flavor"]',
'["Fresh herbs (basil, thyme, rosemary)", "Dried spices (cumin, paprika, oregano)", "Base ingredients to season"]',
'[]'),

('spice-blend', 'Creating Spice Blends', 'Mix your own signature spice combinations', 'flavor-building', 'intermediate', 15, 0, '15 minutes', 1, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400', '🌶️',
'["Toast whole spices in dry pan", "Cool completely before grinding", "Combine with pre-ground spices", "Balance heat, sweet, savory elements", "Store in airtight container"]',
'["Whole spices", "Ground spices", "Salt", "Sugar (optional)"]',
'[]'),

('marinate', 'Marinating Techniques', 'Infuse foods with flavor and tenderness', 'flavor-building', 'beginner', 10, 0, '2-24 hours', 4, 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400', '🥩',
'["Combine acid, oil, and aromatics", "Don\'t over-marinate delicate proteins", "Use non-reactive containers", "Reserve some marinade before adding raw meat", "Pat dry before cooking for better browning"]',
'["Acid (citrus, vinegar, wine)", "Oil", "Aromatics (herbs, garlic)", "Salt", "Protein or vegetables"]',
'[]'),

('balance-flavors', 'Flavor Balance', 'Master the art of balancing sweet, salty, sour, bitter', 'flavor-building', 'advanced', 30, 0, '30 minutes', 1, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', '⚖️',
'["Identify dominant flavors in your dish", "Add opposing elements to create balance", "Too salty? Add acid or sweet", "Too sweet? Add salt or acid", "Too rich? Add acid or bitter greens", "Taste and adjust incrementally"]',
'["Various dishes to taste and adjust", "Salt", "Sugar or honey", "Acid (lemon, vinegar)", "Bitter elements (herbs, greens)"]',
'[]'),

('umami-boost', 'Understanding Umami', 'Add depth with the fifth taste', 'flavor-building', 'intermediate', 20, 0, '20 minutes', 4, 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400', '🍄',
'["Identify umami-rich ingredients", "Layer multiple umami sources", "Brown mushrooms to concentrate flavor", "Use aged cheeses and cured meats", "Add small amounts of fermented ingredients", "Build umami through cooking techniques"]',
'["Mushrooms", "Tomato paste", "Parmesan cheese", "Soy sauce or fish sauce", "Miso paste"]',
'[]'),

-- Air Fryer Recipes
('air-fryer-fries', 'Crispy Air Fryer Fries', 'Golden, crispy fries with minimal oil using the air fryer', 'air-fryer', 'beginner', 5, 15, '20 minutes', 2, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', '🍟',
'["Cut potatoes into even 1/4-inch sticks and soak in cold water for 30 minutes", "Drain and pat completely dry with paper towels", "Toss with olive oil, salt, paprika, and garlic powder", "Preheat air fryer to 380°F (190°C)", "Cook in a single layer for 15-18 minutes, shaking basket halfway"]',
'["2 large russet potatoes", "1 tablespoon olive oil", "1/2 teaspoon salt", "1/4 teaspoon paprika", "1/4 teaspoon garlic powder"]',
'["Soaking removes starch for crispier results", "Don''t overcrowd the basket — cook in batches if needed", "Pat potatoes very dry before tossing with oil"]'),

('air-fryer-chicken-wings', 'Air Fryer Chicken Wings', 'Perfectly crispy wings without deep frying', 'air-fryer', 'beginner', 5, 20, '25 minutes', 4, 'https://images.unsplash.com/photo-1527477396000-e27163b4bbed?w=400', '🍗',
'["Pat wings dry and toss with baking powder, salt, pepper, and garlic powder", "Preheat air fryer to 380°F (190°C)", "Arrange wings in a single layer in the basket", "Cook for 12 minutes, flip, then cook 10-12 more minutes", "Toss with your favorite sauce and serve immediately"]',
'["2 lbs chicken wings", "1 tablespoon baking powder", "1 teaspoon salt", "1/2 teaspoon black pepper", "1/2 teaspoon garlic powder", "Your favorite wing sauce"]',
'["Baking powder is the secret to extra crispy skin", "Flip wings halfway for even browning", "Let wings rest 2 minutes before saucing"]'),

('air-fryer-salmon', 'Air Fryer Glazed Salmon', 'Flaky, perfectly cooked salmon with a caramelized glaze', 'air-fryer', 'intermediate', 5, 10, '15 minutes', 2, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', '🐟',
'["Mix soy sauce, honey, sesame oil, ginger, and garlic for the glaze", "Brush salmon fillets generously with the glaze", "Preheat air fryer to 400°F (200°C)", "Place salmon skin-side down in the basket", "Cook for 8-10 minutes until internal temp reaches 145°F"]',
'["2 salmon fillets (6 oz each)", "2 tablespoons soy sauce", "1 tablespoon honey", "1 teaspoon sesame oil", "1/2 teaspoon ginger (grated)", "1 clove garlic (minced)"]',
'["Don''t overcook — salmon continues cooking after removal", "Line the basket with parchment for easy cleanup"]'),

('air-fryer-vegetables', 'Roasted Air Fryer Vegetables', 'Caramelized, tender vegetables in minutes', 'air-fryer', 'beginner', 5, 10, '15 minutes', 2, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400', '🥦',
'["Cut vegetables into similar-sized pieces for even cooking", "Toss with olive oil, salt, and pepper", "Preheat air fryer to 375°F (190°C)", "Spread vegetables in a single layer", "Cook for 8-12 minutes, shaking basket halfway through"]',
'["2 cups broccoli florets", "1 cup bell pepper strips", "1 cup zucchini slices", "1 tablespoon olive oil", "1/2 teaspoon salt", "1/4 teaspoon black pepper"]',
'["Cut denser vegetables smaller so everything cooks evenly", "A light spray of oil gives the best browning", "Don''t overcrowd — leave space for air circulation"]'),

('air-fryer-tofu', 'Crispy Air Fryer Tofu', 'Perfectly crispy tofu cubes with a golden crust', 'air-fryer', 'intermediate', 5, 15, '20 minutes', 2, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', '🧈',
'["Press tofu for 15 minutes to remove excess moisture", "Cut into 1-inch cubes and toss with soy sauce and sesame oil", "Sprinkle with cornstarch and garlic powder, toss to coat", "Preheat air fryer to 400°F (200°C)", "Cook for 12-15 minutes, shaking basket every 5 minutes"]',
'["1 block extra-firm tofu (14 oz)", "1 tablespoon soy sauce", "1 tablespoon cornstarch", "1 teaspoon sesame oil", "1/2 teaspoon garlic powder"]',
'["Pressing tofu is essential for crispiness", "Cornstarch creates the crispy coating", "Serve immediately for maximum crunch"]'),

('air-fryer-donuts', 'Air Fryer Cinnamon Donuts', 'Light, fluffy donuts with a cinnamon sugar coating', 'air-fryer', 'intermediate', 5, 6, '25 minutes', 4, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400', '🍩',
'["Separate biscuit dough and cut a hole in the center of each", "Preheat air fryer to 350°F (175°C)", "Place donuts in a single layer, leaving space between each", "Cook for 5-6 minutes until golden brown", "Brush with melted butter and toss in cinnamon-sugar mixture"]',
'["1 can refrigerated biscuit dough", "2 tablespoons melted butter", "1/4 cup granulated sugar", "1 teaspoon cinnamon", "1/4 teaspoon nutmeg"]',
'["Use a small round cutter or bottle cap for the donut hole", "Cook the donut holes too — they only need 3-4 minutes", "Coat in cinnamon sugar while still warm for best adhesion"]'),

-- Indian Cuisine Recipes
('dal-tadka', 'Dal Tadka', 'Classic Indian lentil dish with a fragrant tempering of spices', 'indian-cuisine', 'beginner', 10, 25, '30 minutes', 4, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400', '🍛',
'["Wash and boil toor dal with turmeric until soft and mushy", "Mash the dal lightly with a ladle", "Heat ghee in a small pan for the tadka", "Add cumin seeds, mustard seeds, dried red chilies, and let them splutter", "Add chopped onions, garlic, and green chilies — sauté until golden", "Pour the tadka over the dal and stir in fresh cilantro"]',
'["1 cup toor dal (split pigeon peas)", "1/2 teaspoon turmeric powder", "2 tablespoons ghee", "1 teaspoon cumin seeds", "1/2 teaspoon mustard seeds", "2 dried red chilies", "1 medium onion (chopped)", "3 cloves garlic (minced)", "2 green chilies (slit)", "Fresh cilantro for garnish", "Salt to taste"]',
'["The tadka (tempering) is what gives this dish its soul", "Dal should be slightly runny — it thickens as it cools", "Use ghee for authentic flavor, not oil"]'),

('butter-chicken', 'Butter Chicken', 'Rich and creamy tomato-based chicken curry with aromatic spices', 'indian-cuisine', 'intermediate', 20, 30, '45 minutes', 4, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', '🍗',
'["Marinate chicken in yogurt, garam masala, turmeric, and chili powder for 30 minutes", "Grill or pan-sear the marinated chicken pieces until charred", "In a separate pan, sauté onions, ginger, and garlic until soft", "Add tomato puree, kashmiri chili powder, and cook until oil separates", "Add cream, butter, honey, and dried fenugreek leaves (kasuri methi)", "Add the cooked chicken and simmer for 10 minutes"]',
'["500g chicken thighs (boneless)", "1/2 cup yogurt", "2 teaspoons garam masala", "1 teaspoon turmeric", "1 teaspoon kashmiri chili powder", "2 tablespoons butter", "1 cup tomato puree", "1/2 cup heavy cream", "1 teaspoon dried fenugreek leaves (kasuri methi)", "1 teaspoon honey", "Salt to taste"]',
'["Kasuri methi is the secret ingredient — don''t skip it", "Marinate overnight for deeper flavor", "Finish with a swirl of cream for restaurant-style presentation"]'),

('jeera-rice', 'Jeera Rice', 'Fragrant cumin-tempered basmati rice — the perfect Indian side dish', 'indian-cuisine', 'beginner', 5, 18, '20 minutes', 4, 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400', '🍚',
'["Wash and soak basmati rice for 20 minutes, then drain", "Heat ghee in a heavy-bottomed pan", "Add cumin seeds and let them splutter and turn golden", "Add the drained rice and gently sauté for 2 minutes", "Add water (1:1.5 ratio) and salt, bring to a boil", "Cover and cook on low heat for 15 minutes, then fluff with a fork"]',
'["1 cup basmati rice", "1.5 cups water", "1 tablespoon ghee", "1 teaspoon cumin seeds (jeera)", "2 green cardamom pods", "1 bay leaf", "Salt to taste"]',
'["Soaking rice ensures long, separate grains", "Don''t stir the rice while cooking — it breaks the grains", "The cumin should sizzle and darken before adding rice"]'),

('aloo-gobi', 'Aloo Gobi', 'Classic dry curry of potatoes and cauliflower with warm spices', 'indian-cuisine', 'beginner', 10, 20, '25 minutes', 4, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400', '🥔',
'["Cut potatoes and cauliflower into similar-sized florets and cubes", "Heat oil and add cumin seeds until they splutter", "Add diced onions, ginger, and green chilies — sauté until soft", "Add turmeric, coriander powder, cumin powder, and red chili powder", "Add potatoes first and cook for 5 minutes, then add cauliflower", "Cover and cook on low until vegetables are tender, garnish with cilantro"]',
'["2 medium potatoes (cubed)", "1 small cauliflower (florets)", "1 medium onion (diced)", "1 teaspoon cumin seeds", "1/2 teaspoon turmeric", "1 teaspoon coriander powder", "1/2 teaspoon cumin powder", "1/2 teaspoon red chili powder", "2 tablespoons oil", "Fresh cilantro", "Salt to taste"]',
'["Don''t add water — let the vegetables cook in their own moisture", "Add potatoes before cauliflower since they take longer", "A squeeze of lemon at the end brightens the dish"]'),

('naan-bread', 'Naan Bread', 'Soft, pillowy Indian flatbread baked to perfection', 'indian-cuisine', 'intermediate', 20, 10, '40 minutes', 6, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400', '🫓',
'["Mix flour, yogurt, yeast, sugar, salt, and warm water into a soft dough", "Knead for 8-10 minutes until smooth and elastic", "Cover and let the dough rise for 1 hour until doubled", "Divide into 6 balls and roll each into an oval shape", "Cook on a very hot skillet or tawa until bubbles form, then flip", "Brush with melted butter and garlic (optional)"]',
'["2 cups all-purpose flour", "1/4 cup yogurt", "1 teaspoon instant yeast", "1 teaspoon sugar", "1/2 teaspoon salt", "1/2 cup warm water", "2 tablespoons melted butter", "1 clove garlic (minced, optional)"]',
'["Yogurt makes the naan extra soft and tangy", "The hotter the pan, the better the char and puff", "Brush with butter immediately after cooking"]'),

('chana-masala', 'Chana Masala', 'Hearty spiced chickpea curry with tangy tomato gravy', 'indian-cuisine', 'beginner', 10, 25, '30 minutes', 4, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400', '🫘',
'["Heat oil and add cumin seeds, bay leaf, and cinnamon stick", "Add diced onions and cook until deeply golden brown", "Add ginger-garlic paste and sauté for 2 minutes", "Add tomato puree, coriander, cumin, garam masala, and amchur powder", "Add drained chickpeas and 1 cup water, simmer for 20 minutes", "Garnish with fresh cilantro, ginger juliennes, and a squeeze of lemon"]',
'["2 cans chickpeas (drained)", "2 medium onions (diced)", "1 cup tomato puree", "1 tablespoon ginger-garlic paste", "1 teaspoon cumin seeds", "1 teaspoon coriander powder", "1 teaspoon garam masala", "1/2 teaspoon amchur (dry mango powder)", "1 bay leaf", "1 small cinnamon stick", "Fresh cilantro and lemon", "Salt to taste"]',
'["Browning the onions deeply is the key to rich flavor", "Amchur adds authentic tanginess — lime juice works as a substitute", "This tastes even better the next day"]'),

('mango-lassi', 'Mango Lassi', 'Creamy, refreshing yogurt-based mango smoothie', 'indian-cuisine', 'beginner', 5, 0, '5 minutes', 2, 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400', '🥭',
'["Add mango pulp, yogurt, milk, and sugar to a blender", "Blend on high until completely smooth and frothy", "Taste and adjust sweetness", "Pour into glasses over ice", "Garnish with a pinch of cardamom powder and saffron strands"]',
'["1 cup mango pulp (fresh or canned)", "1 cup thick yogurt", "1/2 cup cold milk", "2 tablespoons sugar (adjust to taste)", "1/4 teaspoon cardamom powder", "A few saffron strands (optional)", "Ice cubes"]',
'["Use Alphonso mango pulp for the most authentic flavor", "Chill everything beforehand for the coldest lassi", "A pinch of cardamom transforms it from good to great"]');

-- ================================
-- Achievements Data
-- ================================

INSERT INTO achievements (id, name, description, icon, category, requirements, points) VALUES
-- Progress achievements
('first-recipe', 'First Steps', 'Complete your first recipe', '👶', 'progress', '{"recipes_completed": 1}', 10),
('five-recipes', 'Getting Started', 'Complete 5 recipes', '🌟', 'progress', '{"recipes_completed": 5}', 25),
('ten-recipes', 'Cooking Enthusiast', 'Complete 10 recipes', '🔥', 'progress', '{"recipes_completed": 10}', 50),
('all-recipes', 'Master Chef', 'Complete all recipes', '👨‍🍳', 'progress', '{"recipes_completed": 24}', 200),

-- Skill achievements
('basic-cooking-master', 'Basic Cooking Master', 'Master all basic cooking recipes', '🥚', 'skill', '{"skill_id": "basic-cooking", "completion": 100}', 75),
('heat-control-master', 'Heat Control Master', 'Master all heat control recipes', '🔥', 'skill', '{"skill_id": "heat-control", "completion": 100}', 100),
('flavor-building-master', 'Flavor Building Master', 'Master all flavor building recipes', '🌟', 'skill', '{"skill_id": "flavor-building", "completion": 100}', 125),
('air-fryer-master', 'Air Fryer Master', 'Master all air fryer recipes', '🍟', 'skill', '{"skill_id": "air-fryer", "completion": 100}', 100),
('indian-cuisine-master', 'Indian Cuisine Master', 'Master all Indian cuisine recipes', '🍛', 'skill', '{"skill_id": "indian-cuisine", "completion": 100}', 125),

-- Streak achievements
('week-streak', 'Weekly Warrior', 'Cook for 7 days in a row', '📅', 'streak', '{"daily_streak": 7}', 30),
('month-streak', 'Monthly Master', 'Cook for 30 days in a row', '🗓️', 'streak', '{"daily_streak": 30}', 100),

-- Special achievements
('perfectionist', 'Perfectionist', 'Get 5-star ratings on 10 recipes', '⭐', 'social', '{"five_star_recipes": 10}', 75),
('early-bird', 'Early Bird', 'Complete a recipe before 8 AM', '🌅', 'progress', '{"morning_cooking": 1}', 15),
('night-owl', 'Night Owl', 'Complete a recipe after 10 PM', '🦉', 'progress', '{"night_cooking": 1}', 15);

-- ================================
-- Sample Cooking Tips
-- ================================

INSERT INTO cooking_tips (title, content, category, difficulty, tags) VALUES
('Sharp Knives Are Safer', 'A sharp knife requires less pressure and is less likely to slip, making it actually safer than a dull knife. Keep your knives properly sharpened and honed.', 'safety', 'beginner', '["knife", "safety", "basics"]'),
('Salt Pasta Water Like the Sea', 'Your pasta water should taste like seawater - about 1 tablespoon of salt per quart of water. This is your only chance to season the pasta itself.', 'technique', 'beginner', '["pasta", "seasoning", "salt"]'),
('Rest Your Meat', 'Always let cooked meat rest for 5-10 minutes after cooking. This allows the juices to redistribute, resulting in more tender and juicy meat.', 'technique', 'intermediate', '["meat", "resting", "juices"]'),
('Mise en Place', 'French for "everything in its place" - prep all your ingredients before you start cooking. This prevents mistakes and ensures smooth cooking flow.', 'technique', 'beginner', '["preparation", "organization", "french"]'),
('Cast Iron Care', 'Never soak cast iron or put it in the dishwasher. Clean while warm with hot water and a stiff brush, dry immediately, and apply a thin layer of oil.', 'tool', 'intermediate', '["cast-iron", "maintenance", "care"]');

-- ================================
-- Sample Challenges
-- ================================

INSERT INTO challenges (title, description, challenge_type, recipe_ids, start_date, end_date, reward_points) VALUES
('Basic Skills Week', 'Master all basic cooking skills this week', 'weekly', '["boiled-egg", "make-rice", "chop-onion"]', DATE('now'), DATE('now', '+7 days'), 50),
('Heat Master Challenge', 'Complete all heat control recipes', 'skill-based', '["sear-steak", "simmer-soup", "deep-fry", "stir-fry", "grill-chicken"]', DATE('now'), DATE('now', '+30 days'), 100),
('Daily Cooking Habit', 'Cook something every day this month', 'daily', '[]', DATE('now', 'start of month'), DATE('now', 'start of month', '+1 month', '-1 day'), 200);