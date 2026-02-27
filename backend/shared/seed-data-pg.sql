-- CookQuest PostgreSQL Seed Data
-- Compatible with schema-pg.sql (the simplified working schema)

-- ================================
-- Skills Data
-- ================================
INSERT INTO skills (id, name, description, icon, color) VALUES
('basic-cooking', 'Basic Cooking', 'Essential cooking fundamentals', '👨‍🍳', 'blue'),
('heat-control', 'Heat Control', 'Master temperature and timing', '🔥', 'orange'),
('flavor-building', 'Flavor Building', 'Develop complex, balanced flavors', '🌟', 'purple'),
('air-fryer', 'Air Fryer Mastery', 'Master the art of crispy, healthy air fryer cooking', '🍟', 'emerald'),
('indian-cuisine', 'Indian Cuisine', 'Explore the rich flavors and techniques of Indian cooking', '🍛', 'amber')
ON CONFLICT (id) DO NOTHING;

-- ================================
-- Recipes Data
-- Columns: id, title, description, skill_id, difficulty, total_time, image_url, emoji,
--          ingredients (jsonb), instructions (jsonb), tips (jsonb)
-- ================================
INSERT INTO recipes (id, title, description, skill_id, difficulty, total_time, image_url, emoji, ingredients, instructions, tips) VALUES

-- Basic Cooking Recipes
('boiled-egg', 'Perfect Boiled Egg', 'Learn the basics of boiling eggs to perfection',
 'basic-cooking', 'beginner', '10 minutes',
 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&fit=crop&q=80', '🥚',
 '["2 large eggs", "Water (enough to cover eggs)", "Salt (pinch)", "Ice water for cooling"]',
 '["Bring a pot of water to a rolling boil", "Gently lower eggs into the boiling water using a spoon", "Cook for 6-7 minutes for soft-boiled, 8-10 for hard-boiled", "Immediately transfer to ice water to stop cooking", "Let cool for 2 minutes before peeling"]',
 '["Use eggs that are at least a week old for easier peeling", "Start timing once the water returns to a boil", "The ice bath prevents overcooking and gray rings"]'),

('make-rice', 'Perfect Rice', 'Master the art of cooking fluffy, perfect rice every time',
 'basic-cooking', 'beginner', '20 minutes',
 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=800&fit=crop&q=80', '🍚',
 '["1 cup long-grain white rice", "2 cups water", "1/2 teaspoon salt", "1 tablespoon butter (optional)"]',
 '["Rinse rice in cold water until water runs clear", "Combine rice, water, and salt in a medium saucepan", "Bring to a boil over medium-high heat", "Reduce heat to low, cover, and simmer for 18 minutes", "Remove from heat and let stand 5 minutes", "Fluff with a fork before serving"]',
 '["The ratio is key: 1:2 rice to water for most white rice", "Don''t lift the lid during cooking", "Let it rest - this step is crucial for fluffy rice"]'),

('chop-onion', 'Proper Onion Chopping', 'Learn knife skills and proper onion dicing technique',
 'basic-cooking', 'beginner', '5 minutes',
 'https://images.unsplash.com/photo-1587735243615-c7a6de57e832?w=800&fit=crop&q=80', '🧅',
 '["1 medium yellow onion", "Sharp chef''s knife", "Cutting board"]',
 '["Cut onion in half from root to tip", "Peel off outer layer, leaving root end intact", "Make horizontal cuts toward root (don''t cut through)", "Make vertical cuts from top to bottom", "Finally, slice across to create uniform dice", "Discard root end"]',
 '["Keep the root end intact until the final cuts", "Use a sharp knife to minimize tears", "Cut near a window or use a fan to reduce crying"]'),

-- Heat Control Recipes
('sear-steak', 'Perfect Steak Searing', 'Master the art of searing steaks with a perfect crust',
 'heat-control', 'intermediate', '15 minutes',
 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&fit=crop&q=80', '🥩',
 '["2 ribeye or NY strip steaks (1-inch thick)", "2 tablespoons vegetable oil", "Salt and freshly ground black pepper", "2 tablespoons butter", "2 garlic cloves", "Fresh thyme sprigs"]',
 '["Remove steaks from fridge 30 minutes before cooking", "Season generously with salt and pepper", "Heat cast iron skillet over high heat until smoking", "Add oil and carefully place steaks in pan", "Sear 3-4 minutes without moving", "Flip and sear other side 3-4 minutes", "Add butter, garlic, and thyme; baste steaks", "Check internal temperature and rest 5 minutes"]',
 '["Pat steaks dry before seasoning for better crust", "Let the pan get very hot before adding the steak", "Use a meat thermometer for perfect doneness"]'),

('simmer-soup', 'Gentle Simmering', 'Learn the art of gentle simmering for soups and stews',
 'heat-control', 'beginner', '45 minutes',
 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800&fit=crop&q=80', '🍲',
 '["4 cups chicken or vegetable broth", "1 cup diced vegetables", "1/2 cup grains or pasta", "Herbs and seasonings"]',
 '["Bring liquid to a rolling boil", "Reduce heat to low-medium", "Adjust until you see gentle bubbles breaking surface", "Maintain this temperature throughout cooking", "Add ingredients based on cooking time needed"]',
 '["A simmer has small bubbles; a boil has large rolling bubbles", "Simmering develops deeper flavors than boiling", "Keep the lid slightly ajar to prevent boiling over"]'),

('deep-fry', 'Safe Deep Frying', 'Learn safe deep frying techniques for crispy results',
 'heat-control', 'advanced', '30 minutes',
 'https://images.unsplash.com/photo-1619881590738-a111d176d906?w=800&fit=crop&q=80', '🍟',
 '["Neutral oil for frying", "Food thermometer", "Food to fry", "Paper towels", "Wire rack"]',
 '["Fill pot with oil 2-3 inches deep", "Heat to 350°F (175°C)", "Test temperature with thermometer", "Carefully add food in small batches", "Don''t overcrowd the oil", "Remove when golden brown", "Drain on wire rack"]',
 '["Never leave hot oil unattended", "Keep a lid nearby to smother any flare-ups", "Dry food thoroughly before frying to prevent splattering"]'),

('stir-fry', 'High-Heat Stir Frying', 'Master the wok for quick, high-heat cooking',
 'heat-control', 'intermediate', '10 minutes',
 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&fit=crop&q=80', '🥘',
 '["2 cups mixed vegetables", "2 tablespoons oil", "Sauce ingredients", "Protein (optional)"]',
 '["Heat wok or large skillet until smoking", "Add oil in a circle around pan", "Add ingredients in order of cooking time", "Keep food moving constantly", "Cook quickly over highest heat"]',
 '["Have all ingredients prepped before you start", "Cut everything into similar-sized pieces for even cooking", "The wok should be screaming hot before adding food"]'),

('grill-chicken', 'Grilling Technique', 'Learn proper grilling technique for juicy chicken',
 'heat-control', 'intermediate', '25 minutes',
 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&fit=crop&q=80', '🔥',
 '["Chicken pieces", "Marinade or seasoning", "Oil for grates"]',
 '["Preheat grill to medium-high", "Oil the grates", "Start chicken skin-side down", "Don''t move until ready to flip", "Use thermometer to check doneness"]',
 '["Chicken is done at 165°F internal temperature", "Let chicken rest 5 minutes after grilling", "Clean and oil grates to prevent sticking"]'),

-- Flavor Building Recipes
('make-sauce', 'Basic Pan Sauce', 'Create restaurant-quality pan sauces from drippings',
 'flavor-building', 'intermediate', '10 minutes',
 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=800&fit=crop&q=80', '🥄',
 '["Pan drippings", "1/4 cup wine or stock", "2 tablespoons butter", "Herbs and seasonings"]',
 '["Remove protein from pan, keep warm", "Pour out excess fat, leaving brown bits", "Add liquid to deglaze pan", "Scrape up browned bits with wooden spoon", "Reduce liquid by half", "Whisk in cold butter for richness", "Season and strain if desired"]',
 '["The fond (browned bits) is where all the flavor lives", "Use cold butter for a silky, emulsified sauce", "Add a splash of acid at the end to brighten the sauce"]'),

('season-taste', 'Seasoning to Taste', 'Develop your palate and learn to season food properly',
 'flavor-building', 'beginner', '15 minutes',
 'https://images.unsplash.com/photo-1599909533731-d135ee75d79b?w=800&fit=crop&q=80', '🧂',
 '["Salt", "Acid (lemon juice, vinegar)", "Fat (butter, oil)", "Heat (pepper, spice)"]',
 '["Taste your dish before seasoning", "Add salt gradually - you can always add more", "Balance with acid to brighten flavors", "Consider fat for richness and mouthfeel", "Adjust heat level to preference", "Taste after each addition"]',
 '["Season in layers throughout cooking, not just at the end", "Acid can fix a dish that tastes flat", "A pinch of sugar can balance excess acidity"]'),

('herb-pairing', 'Herb and Spice Pairing', 'Learn which herbs and spices work together',
 'flavor-building', 'beginner', '20 minutes',
 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&fit=crop&q=80', '🌿',
 '["Fresh herbs (basil, thyme, rosemary)", "Dried spices (cumin, paprika, oregano)", "Base ingredients to season"]',
 '["Learn classic pairings: tomato + basil", "Understand herb families and strengths", "Add hardy herbs early, delicate ones late", "Toast whole spices to release oils", "Build layers of flavor"]',
 '["Fresh herbs are best added at the end of cooking", "Dried herbs are more concentrated - use less", "Store fresh herbs like flowers in a glass of water"]'),

('spice-blend', 'Creating Spice Blends', 'Create your own custom spice blends from scratch',
 'flavor-building', 'intermediate', '15 minutes',
 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=800&fit=crop&q=80', '🌶️',
 '["Whole spices", "Ground spices", "Salt", "Sugar (optional)"]',
 '["Toast whole spices in dry pan", "Cool completely before grinding", "Combine with pre-ground spices", "Balance heat, sweet, savory elements", "Store in airtight container"]',
 '["Toasting spices transforms their flavor", "Grind spices fresh for maximum potency", "Label your blends with ingredients and date"]'),

('marinate', 'Marinating Techniques', 'Learn how to marinate for maximum flavor infusion',
 'flavor-building', 'beginner', '2-24 hours',
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&fit=crop&q=80', '🥩',
 '["Acid (citrus, vinegar, wine)", "Oil", "Aromatics (herbs, garlic)", "Salt", "Protein or vegetables"]',
 '["Combine acid, oil, and aromatics", "Don''t over-marinate delicate proteins", "Use non-reactive containers", "Reserve some marinade before adding raw meat", "Pat dry before cooking for better browning"]',
 '["Fish only needs 15-30 minutes of marinating", "Chicken can marinate 2-24 hours", "Too much acid can make meat mushy"]'),

('balance-flavors', 'Flavor Balance', 'Master the art of balancing sweet, salty, sour, and bitter',
 'flavor-building', 'advanced', '30 minutes',
 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&fit=crop&q=80', '⚖️',
 '["Various dishes to taste and adjust", "Salt", "Sugar or honey", "Acid (lemon, vinegar)", "Bitter elements (herbs, greens)"]',
 '["Identify dominant flavors in your dish", "Add opposing elements to create balance", "Too salty? Add acid or sweet", "Too sweet? Add salt or acid", "Too rich? Add acid or bitter greens", "Taste and adjust incrementally"]',
 '["Every great dish has a balance of flavors", "Umami acts as a flavor amplifier", "Temperature affects how we perceive flavor"]'),

('umami-boost', 'Understanding Umami', 'Harness the fifth taste for deeper, more satisfying dishes',
 'flavor-building', 'intermediate', '20 minutes',
 'https://images.unsplash.com/photo-1518453522772-520949f98c7e?w=800&fit=crop&q=80', '🍄',
 '["Mushrooms", "Tomato paste", "Parmesan cheese", "Soy sauce or fish sauce", "Miso paste"]',
 '["Identify umami-rich ingredients", "Layer multiple umami sources", "Brown mushrooms to concentrate flavor", "Use aged cheeses and cured meats", "Add small amounts of fermented ingredients", "Build umami through cooking techniques"]',
 '["A little soy sauce can boost any savory dish", "Parmesan rinds add umami to soups and stews", "Browning and caramelizing create umami through the Maillard reaction"]'),

-- Air Fryer Recipes
('air-fryer-fries', 'Crispy Air Fryer Fries', 'Golden, crispy fries with minimal oil using the air fryer',
 'air-fryer', 'beginner', '20 minutes',
 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&fit=crop&q=80', '🍟',
 '["2 large russet potatoes", "1 tablespoon olive oil", "1/2 teaspoon salt", "1/4 teaspoon paprika", "1/4 teaspoon garlic powder"]',
 '["Cut potatoes into even 1/4-inch sticks and soak in cold water for 30 minutes", "Drain and pat completely dry with paper towels", "Toss with olive oil, salt, paprika, and garlic powder", "Preheat air fryer to 380°F (190°C)", "Cook in a single layer for 15-18 minutes, shaking basket halfway"]',
 '["Soaking removes starch for crispier results", "Don''t overcrowd the basket — cook in batches if needed", "Pat potatoes very dry before tossing with oil"]'),

('air-fryer-chicken-wings', 'Air Fryer Chicken Wings', 'Perfectly crispy wings without deep frying',
 'air-fryer', 'beginner', '25 minutes',
 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&fit=crop&q=80', '🍗',
 '["2 lbs chicken wings", "1 tablespoon baking powder", "1 teaspoon salt", "1/2 teaspoon black pepper", "1/2 teaspoon garlic powder", "Your favorite wing sauce"]',
 '["Pat wings dry and toss with baking powder, salt, pepper, and garlic powder", "Preheat air fryer to 380°F (190°C)", "Arrange wings in a single layer in the basket", "Cook for 12 minutes, flip, then cook 10-12 more minutes", "Toss with your favorite sauce and serve immediately"]',
 '["Baking powder is the secret to extra crispy skin", "Flip wings halfway for even browning", "Let wings rest 2 minutes before saucing"]'),

('air-fryer-salmon', 'Air Fryer Glazed Salmon', 'Flaky, perfectly cooked salmon with a caramelized glaze',
 'air-fryer', 'intermediate', '15 minutes',
 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&fit=crop&q=80', '🐟',
 '["2 salmon fillets (6 oz each)", "2 tablespoons soy sauce", "1 tablespoon honey", "1 teaspoon sesame oil", "1/2 teaspoon ginger (grated)", "1 clove garlic (minced)"]',
 '["Mix soy sauce, honey, sesame oil, ginger, and garlic for the glaze", "Brush salmon fillets generously with the glaze", "Preheat air fryer to 400°F (200°C)", "Place salmon skin-side down in the basket", "Cook for 8-10 minutes until internal temp reaches 145°F"]',
 '["Don''t overcook — salmon continues cooking after removal", "Line the basket with parchment for easy cleanup"]'),

('air-fryer-vegetables', 'Roasted Air Fryer Vegetables', 'Caramelized, tender vegetables in minutes',
 'air-fryer', 'beginner', '15 minutes',
 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=800&fit=crop&q=80', '🥦',
 '["2 cups broccoli florets", "1 cup bell pepper strips", "1 cup zucchini slices", "1 tablespoon olive oil", "1/2 teaspoon salt", "1/4 teaspoon black pepper"]',
 '["Cut vegetables into similar-sized pieces for even cooking", "Toss with olive oil, salt, and pepper", "Preheat air fryer to 375°F (190°C)", "Spread vegetables in a single layer", "Cook for 8-12 minutes, shaking basket halfway through"]',
 '["Cut denser vegetables smaller so everything cooks evenly", "A light spray of oil gives the best browning", "Don''t overcrowd — leave space for air circulation"]'),

('air-fryer-tofu', 'Crispy Air Fryer Tofu', 'Perfectly crispy tofu cubes with a golden crust',
 'air-fryer', 'intermediate', '20 minutes',
 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&fit=crop&q=80', '🧈',
 '["1 block extra-firm tofu (14 oz)", "1 tablespoon soy sauce", "1 tablespoon cornstarch", "1 teaspoon sesame oil", "1/2 teaspoon garlic powder"]',
 '["Press tofu for 15 minutes to remove excess moisture", "Cut into 1-inch cubes and toss with soy sauce and sesame oil", "Sprinkle with cornstarch and garlic powder, toss to coat", "Preheat air fryer to 400°F (200°C)", "Cook for 12-15 minutes, shaking basket every 5 minutes"]',
 '["Pressing tofu is essential for crispiness", "Cornstarch creates the crispy coating", "Serve immediately for maximum crunch"]'),

('air-fryer-donuts', 'Air Fryer Cinnamon Donuts', 'Light, fluffy donuts with a cinnamon sugar coating',
 'air-fryer', 'intermediate', '25 minutes',
 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&fit=crop&q=80', '🍩',
 '["1 can refrigerated biscuit dough", "2 tablespoons melted butter", "1/4 cup granulated sugar", "1 teaspoon cinnamon", "1/4 teaspoon nutmeg"]',
 '["Separate biscuit dough and cut a hole in the center of each", "Preheat air fryer to 350°F (175°C)", "Place donuts in a single layer, leaving space between each", "Cook for 5-6 minutes until golden brown", "Brush with melted butter and toss in cinnamon-sugar mixture"]',
 '["Use a small round cutter or bottle cap for the donut hole", "Cook the donut holes too — they only need 3-4 minutes", "Coat in cinnamon sugar while still warm for best adhesion"]'),

-- Indian Cuisine Recipes
('dal-tadka', 'Dal Tadka', 'Classic Indian lentil dish with a fragrant tempering of spices',
 'indian-cuisine', 'beginner', '30 minutes',
 'https://images.unsplash.com/photo-1626500154744-e4b394ffea16?w=800&fit=crop&q=80', '🍛',
 '["1 cup toor dal", "1/2 tsp turmeric", "2 tbsp ghee", "1 tsp cumin seeds", "1/2 tsp mustard seeds", "2 dried red chilies", "1 onion (chopped)", "3 garlic cloves", "2 green chilies", "Fresh cilantro", "Salt"]',
 '["Wash and boil toor dal with turmeric until soft", "Mash lightly with a ladle", "Heat ghee and add cumin seeds, mustard seeds, dried red chilies", "Add onions, garlic, green chilies — sauté until golden", "Pour the tadka over the dal", "Garnish with fresh cilantro"]',
 '["The tadka is what gives this dish its soul", "Dal should be slightly runny — it thickens as it cools", "Use ghee for authentic flavor"]'),

('butter-chicken', 'Butter Chicken', 'Rich and creamy tomato-based chicken curry with aromatic spices',
 'indian-cuisine', 'intermediate', '45 minutes',
 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&fit=crop&q=80', '🍗',
 '["500g chicken thighs", "1/2 cup yogurt", "2 tsp garam masala", "1 tsp turmeric", "1 tsp kashmiri chili powder", "2 tbsp butter", "1 cup tomato puree", "1/2 cup cream", "1 tsp kasuri methi", "1 tsp honey", "Salt"]',
 '["Marinate chicken in yogurt and spices for 30 min", "Grill or pan-sear until charred", "Sauté onions, ginger, garlic until soft", "Add tomato puree and cook until oil separates", "Add cream, butter, honey, kasuri methi", "Add chicken and simmer 10 minutes"]',
 '["Kasuri methi is the secret ingredient", "Marinate overnight for deeper flavor", "Finish with a cream swirl for restaurant-style"]'),

('jeera-rice', 'Jeera Rice', 'Fragrant cumin-tempered basmati rice — the perfect Indian side dish',
 'indian-cuisine', 'beginner', '20 minutes',
 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&fit=crop&q=80', '🍚',
 '["1 cup basmati rice", "1.5 cups water", "1 tbsp ghee", "1 tsp cumin seeds", "2 cardamom pods", "1 bay leaf", "Salt"]',
 '["Wash and soak basmati rice 20 min, drain", "Heat ghee, add cumin seeds until they splutter", "Add rice and sauté 2 minutes", "Add water and salt, bring to boil", "Cover and cook on low 15 minutes", "Fluff with fork"]',
 '["Soaking ensures long separate grains", "Don''t stir while cooking", "Cumin should sizzle before adding rice"]'),

('aloo-gobi', 'Aloo Gobi', 'Classic dry curry of potatoes and cauliflower with warm spices',
 'indian-cuisine', 'beginner', '25 minutes',
 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&fit=crop&q=80', '🥔',
 '["2 potatoes (cubed)", "1 cauliflower (florets)", "1 onion", "1 tsp cumin seeds", "1/2 tsp turmeric", "1 tsp coriander powder", "1/2 tsp cumin powder", "1/2 tsp red chili powder", "2 tbsp oil", "Cilantro", "Salt"]',
 '["Cut potatoes and cauliflower into similar sizes", "Heat oil, add cumin seeds until they splutter", "Sauté onions, ginger, green chilies until soft", "Add turmeric, coriander, cumin, chili powder", "Add potatoes first, cook 5 min, then cauliflower", "Cover and cook until tender, garnish with cilantro"]',
 '["Don''t add water — vegetables cook in own moisture", "Add potatoes before cauliflower", "Squeeze of lemon at end brightens the dish"]'),

('naan-bread', 'Naan Bread', 'Soft, pillowy Indian flatbread baked to perfection',
 'indian-cuisine', 'intermediate', '40 minutes',
 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&fit=crop&q=80', '🫓',
 '["2 cups flour", "1/4 cup yogurt", "1 tsp yeast", "1 tsp sugar", "1/2 tsp salt", "1/2 cup warm water", "2 tbsp melted butter", "1 garlic clove (optional)"]',
 '["Mix flour, yogurt, yeast, sugar, salt, water into soft dough", "Knead 8-10 minutes until smooth", "Rise for 1 hour until doubled", "Divide into 6 balls, roll into ovals", "Cook on very hot skillet until bubbles form, flip", "Brush with melted garlic butter"]',
 '["Yogurt makes naan extra soft", "The hotter the pan, the better the char", "Brush with butter immediately after cooking"]'),

('chana-masala', 'Chana Masala', 'Hearty spiced chickpea curry with tangy tomato gravy',
 'indian-cuisine', 'beginner', '30 minutes',
 'https://images.unsplash.com/photo-1582724790987-313797eb6119?w=800&fit=crop&q=80', '🫘',
 '["2 cans chickpeas", "2 onions", "1 cup tomato puree", "1 tbsp ginger-garlic paste", "1 tsp cumin seeds", "1 tsp coriander powder", "1 tsp garam masala", "1/2 tsp amchur powder", "1 bay leaf", "1 cinnamon stick", "Cilantro", "Lemon", "Salt"]',
 '["Heat oil, add cumin seeds, bay leaf, cinnamon", "Cook onions until deeply golden", "Add ginger-garlic paste, sauté 2 min", "Add tomato puree and all spices", "Add chickpeas and 1 cup water, simmer 20 min", "Garnish with cilantro, ginger, lemon"]',
 '["Brown onions deeply for rich flavor", "Amchur adds authentic tanginess", "Tastes even better the next day"]'),

('mango-lassi', 'Mango Lassi', 'Creamy, refreshing yogurt-based mango smoothie',
 'indian-cuisine', 'beginner', '5 minutes',
 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&fit=crop&q=80', '🥭',
 '["1 cup mango pulp", "1 cup thick yogurt", "1/2 cup cold milk", "2 tbsp sugar", "1/4 tsp cardamom powder", "Saffron strands (optional)", "Ice cubes"]',
 '["Add mango pulp, yogurt, milk, sugar to blender", "Blend until smooth and frothy", "Taste and adjust sweetness", "Pour over ice", "Garnish with cardamom and saffron"]',
 '["Use Alphonso mango pulp for best flavor", "Chill everything beforehand", "A pinch of cardamom transforms it"]')

ON CONFLICT (id) DO NOTHING;

-- ================================
-- Cooking Tips Data
-- ================================
INSERT INTO cooking_tips (title, content, category) VALUES
('Pasta Joke', 'What do you call a fake noodle? An impasta! 🍝', 'general'),
('Egg Joke', 'Why don''t eggs tell jokes? They''d crack each other up! 🥚', 'general'),
('Taste As You Go', 'Always taste as you go - your palate is your best tool!', 'technique'),
('Sharp Knives', 'Keep your knives sharp for safer and more efficient cooking.', 'tool'),
('Flavor Trinity', 'Salt enhances flavor, acid brightens it, fat carries it.', 'technique'),
('Rest Your Meat', 'Always rest your meat for 5-10 minutes after cooking to let juices redistribute.', 'technique'),
('Mise en Place', 'Mise en place: prep all ingredients before cooking for a smooth experience.', 'technique')
ON CONFLICT DO NOTHING;
