import { TaskContext } from '../../types/observation.js';
import { PRNG } from '../prng.js';

export interface RoutineStep {
  order: number;
  text: string;
  icon: string;
}

export interface SequencingRoutineTemplate {
  id: string;
  title: string;
  context: TaskContext;
  minDifficulty: 1 | 2 | 3 | 4 | 5;
  maxDifficulty: 1 | 2 | 3 | 4 | 5;
  steps: RoutineStep[];
}

export const SEQUENCING_ROUTINE_TEMPLATES: SequencingRoutineTemplate[] = [
  // LEVEL 1: 3-Step Simple Routines
  {
    id: 'hand_washing_hygiene',
    title: 'Clean Handwashing Before Meals',
    context: 'routine',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Rinse hands with clean flowing water', icon: '🚰' },
      { order: 2, text: 'Lather hands thoroughly with soap', icon: '🧼' },
      { order: 3, text: 'Dry hands completely using a clean towel', icon: '🧖' },
    ],
  },
  {
    id: 'morning_water_intake',
    title: 'Morning Pure Water Routine',
    context: 'routine',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Take clean brass glass from the kitchen shelf', icon: '🥛' },
      { order: 2, text: 'Pour boiled, filtered water into the glass', icon: '🫗' },
      { order: 3, text: 'Drink slowly while seated comfortably', icon: '🪑' },
    ],
  },
  {
    id: 'tulsi_watering',
    title: 'Watering the Sacred Courtyard Tulsi',
    context: 'gardening',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Fill the copper lota with fresh well water', icon: '🏺' },
      { order: 2, text: 'Walk gently to the earthen Tulsi altar', icon: '🪴' },
      { order: 3, text: 'Pour the water carefully around the plant roots', icon: '💧' },
    ],
  },
  {
    id: 'eyewear_cleaning',
    title: 'Cleaning Reading Spectacles',
    context: 'routine',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Take reading glasses out of their protective case', icon: '👓' },
      { order: 2, text: 'Wipe both lenses gently with a soft microfibre cloth', icon: '🧖' },
      { order: 3, text: 'Put on clean glasses to read the morning news', icon: '📖' },
    ],
  },
  {
    id: 'sweeping_verandah',
    title: 'Sweeping the Front Verandah',
    context: 'routine',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Pick up handwoven cane broom from the corner', icon: '🧹' },
      { order: 2, text: 'Sweep fallen dry leaves gently outward', icon: '🍂' },
      { order: 3, text: 'Collect leaves into the courtyard compost basket', icon: '🧺' },
    ],
  },
  {
    id: 'fruit_plate_prep',
    title: 'Preparing Fresh Mandarin Orange Plate',
    context: 'kitchen',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Rinse fresh Khasi mandarin oranges in a bowl', icon: '🍊' },
      { order: 2, text: 'Peel the fragrant citrus skin gently with fingers', icon: '🤲' },
      { order: 3, text: 'Arrange juicy fruit segments on a bell-metal plate', icon: '🍽️' },
    ],
  },
  {
    id: 'bedding_neat_fold',
    title: 'Folding Morning Cotton Bedding',
    context: 'routine',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Smooth out the handwoven cotton bedsheet', icon: '🛏️' },
      { order: 2, text: 'Fold the lightweight quilt in halves and quarters', icon: '🧣' },
      { order: 3, text: 'Place folded bedding neatly at the head of the bed', icon: '✨' },
    ],
  },
  {
    id: 'morning_herbal_steep',
    title: 'Steeping Warm Herbal Ginger Infusion',
    context: 'kitchen',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Crush a small piece of fresh ginger in the mortar', icon: '🫚' },
      { order: 2, text: 'Steep crushed ginger in boiling spring water', icon: '🫖' },
      { order: 3, text: 'Sip comforting warm herbal drink from clay tumbler', icon: '🍵' },
    ],
  },
  {
    id: 'dairy_milk_storage',
    title: 'Cooling and Storing Fresh Milk',
    context: 'kitchen',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Pour fresh morning cow milk into a clean brass pot', icon: '🥛' },
      { order: 2, text: 'Simmer gently on the hearth until steam rises', icon: '🔥' },
      { order: 3, text: 'Cover pot with clean wire mesh net to cool safely', icon: '🫕' },
    ],
  },
  {
    id: 'gamusa_towel_fold',
    title: 'Drying and Folding Handwoven Gamusa',
    context: 'household',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Hang washed white cotton Gamusa on the courtyard line', icon: '☀️' },
      { order: 2, text: 'Check that red woven floral borders are dry and crisp', icon: '🧣' },
      { order: 3, text: 'Fold towel into thirds to place inside wooden almirah', icon: '🚪' },
    ],
  },
  {
    id: 'feeding_backyard_birds',
    title: 'Feeding Morning Rice Grains to Doves',
    context: 'gardening',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Scoop a handful of golden paddy grains into a clay bowl', icon: '🌾' },
      { order: 2, text: 'Scatter grains evenly across the courtyard flagstones', icon: '🤲' },
      { order: 3, text: 'Sit back peacefully as morning sparrows arrive to feed', icon: '🕊️' },
    ],
  },
  {
    id: 'reading_newspaper_setup',
    title: 'Settling in to Read the Morning Newspaper',
    context: 'routine',
    minDifficulty: 1,
    maxDifficulty: 1,
    steps: [
      { order: 1, text: 'Unfold the printed regional morning newspaper on table', icon: '📰' },
      { order: 2, text: 'Wipe and put on reading spectacles comfortably', icon: '👓' },
      { order: 3, text: 'Enjoy reading village news under shaded verandah light', icon: '🪑' },
    ],
  },

  // LEVEL 2: 4-Step Everyday Routines
  {
    id: 'assam_tea_routine',
    title: 'Brewing Traditional Assam Tea',
    context: 'routine',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Boil fresh spring water in the kettle', icon: '🫖' },
      { order: 2, text: 'Add aromatic Assam Orthodox tea leaves', icon: '🌿' },
      { order: 3, text: 'Add a warm splash of fresh milk and ginger', icon: '🥛' },
      { order: 4, text: 'Strain fragrant tea into clay cups for family', icon: '🍵' },
    ],
  },
  {
    id: 'morning_market_preparation',
    title: 'Preparing for Morning Vegetable Market',
    context: 'market',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Check kitchen pantry to write grocery list', icon: '📝' },
      { order: 2, text: 'Pick up woven cloth market basket and cash wallet', icon: '🧺' },
      { order: 3, text: 'Put on walking sandals and umbrella', icon: '🩴' },
      { order: 4, text: 'Walk down village path toward local bazaar', icon: '🚶' },
    ],
  },
  {
    id: 'evening_courtyard_prayer',
    title: 'Lighting the Evening Brass Lamp',
    context: 'household',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Clean and wipe brass diya lamp', icon: '🪔' },
      { order: 2, text: 'Insert fresh cotton wick into the lamp', icon: '🧶' },
      { order: 3, text: 'Pour pure mustard oil into the receptacle', icon: '🫗' },
      { order: 4, text: 'Light wick with matchstick and ring bell', icon: '🔔' },
    ],
  },
  {
    id: 'morning_porridge_breakfast',
    title: 'Preparing Bora Rice Morning Porridge',
    context: 'kitchen',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Soak Bora sticky rice in clean water', icon: '🥣' },
      { order: 2, text: 'Warm fresh cow milk in iron pot', icon: '🥛' },
      { order: 3, text: 'Stir steamed rice with warm milk and jaggery', icon: '🥄' },
      { order: 4, text: 'Serve wholesome breakfast in brass bowls', icon: '🍲' },
    ],
  },
  {
    id: 'evening_indoor_chores',
    title: 'Evening Sunset Verandah Settling',
    context: 'routine',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Close front wooden verandah window shutters', icon: '🪟' },
      { order: 2, text: 'Light fragrant dhoop incense coil in brass stand', icon: '🪔' },
      { order: 3, text: 'Draw light cotton mosquito curtains across doorways', icon: '🚪' },
      { order: 4, text: 'Switch on gentle ceiling fan for cool evening air', icon: '💨' },
    ],
  },
  {
    id: 'preparing_betel_nut_tray',
    title: 'Arranging the Traditional Tamul Pan Tray',
    context: 'household',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Select tender green betel leaves from the garden vine', icon: '🍃' },
      { order: 2, text: 'Slice crisp areca nut using brass Sarota cutter', icon: '🔪' },
      { order: 3, text: 'Dab a touch of natural slaked lime on the leaf', icon: '⚪' },
      { order: 4, text: 'Fold leaf into neat triangle and place on Bata tray', icon: '🍽️' },
    ],
  },
  {
    id: 'potting_marigold_flower',
    title: 'Potting Golden Marigold Courtyard Flowers',
    context: 'gardening',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Fill earthen flower pot halfway with loosened garden soil', icon: '🪴' },
      { order: 2, text: 'Position young marigold seedling upright in the center', icon: '🌼' },
      { order: 3, text: 'Press rich organic compost firmly around roots', icon: '🌱' },
      { order: 4, text: 'Pour gentle cup of well water to settle the soil', icon: '💧' },
    ],
  },
  {
    id: 'drying_paddy_grains',
    title: 'Drying Golden Harvest Paddy in the Sun',
    context: 'gardening',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Spread large woven bamboo mat across sunny courtyard', icon: '🎋' },
      { order: 2, text: 'Scatter fresh golden paddy grains evenly across the mat', icon: '🌾' },
      { order: 3, text: 'Turn grains periodically with wooden rake for even drying', icon: '🧹' },
      { order: 4, text: 'Collect crisp dry grains into storage jute sacks at dusk', icon: '🧺' },
    ],
  },
  {
    id: 'washing_cotton_kurta',
    title: 'Washing and Sunning Cotton Kurta Garment',
    context: 'routine',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Soak cotton kurta in a bucket of warm soapy water', icon: '🪣' },
      { order: 2, text: 'Gently scrub collar and wrist cuffs with fingertips', icon: '🧼' },
      { order: 3, text: 'Rinse garment in clean flowing well water twice', icon: '💧' },
      { order: 4, text: 'Smooth wrinkles and hang on sunny bamboo clothesline', icon: '👕' },
    ],
  },
  {
    id: 'making_ginger_jaggery_water',
    title: 'Brewing Warm Ginger Jaggery Water',
    context: 'kitchen',
    minDifficulty: 2,
    maxDifficulty: 2,
    steps: [
      { order: 1, text: 'Crush fresh river ginger in heavy brass mortar', icon: '🫚' },
      { order: 2, text: 'Dissolve pure organic sugarcane jaggery in boiling water', icon: '🍯' },
      { order: 3, text: 'Strain hot spiced liquid through fine brass sieve', icon: '🕸️' },
      { order: 4, text: 'Serve comforting sweet beverage in earthen cups', icon: '☕' },
    ],
  },

  // LEVEL 3: 5-Step Procedural Routines
  {
    id: 'cooking_steamed_rice',
    title: 'Cooking Joha Fragrant Rice',
    context: 'kitchen',
    minDifficulty: 3,
    maxDifficulty: 3,
    steps: [
      { order: 1, text: 'Measure Joha rice grains in brass bowl', icon: '🥣' },
      { order: 2, text: 'Wash and rinse rice grains until water runs clear', icon: '💧' },
      { order: 3, text: 'Add measured fresh water into the cooking pot', icon: '🫗' },
      { order: 4, text: 'Place pot on stove and bring to steady boil', icon: '🔥' },
      { order: 5, text: 'Reduce flame and cover with lid until water is absorbed', icon: '🍲' },
    ],
  },
  {
    id: 'garden_vegetable_planting',
    title: 'Planting Monsoon Mustard Greens in Garden',
    context: 'gardening',
    minDifficulty: 3,
    maxDifficulty: 3,
    steps: [
      { order: 1, text: 'Clear weeds and dry leaves from soil bed', icon: '🧹' },
      { order: 2, text: 'Till rich river soil with garden hoe', icon: '⛏️' },
      { order: 3, text: 'Mix well-rotted cowdung manure into topsoil', icon: '🌱' },
      { order: 4, text: 'Scatter mustard seeds evenly along shallow furrows', icon: '🌾' },
      { order: 5, text: 'Sprinkle water gently using cane watering vessel', icon: '🚿' },
    ],
  },
  {
    id: 'market_fresh_fish_purchase',
    title: 'Selecting and Purchasing Fresh River Fish',
    context: 'market',
    minDifficulty: 3,
    maxDifficulty: 3,
    steps: [
      { order: 1, text: 'Inspect fish stall for clear eyes and bright red gills', icon: '🐟' },
      { order: 2, text: 'Ask fishmonger to weigh selected river carp', icon: '⚖️' },
      { order: 3, text: 'Request proper scaling and clean steak cuts', icon: '🔪' },
      { order: 4, text: 'Pay exact currency notes to vendor and receive change', icon: '💵' },
      { order: 5, text: 'Wrap fish in fresh banana leaves into basket', icon: '🥬' },
    ],
  },
  {
    id: 'herbal_lentil_soup',
    title: 'Preparing Matimah Dal with Raw Papaya',
    context: 'kitchen',
    minDifficulty: 3,
    maxDifficulty: 3,
    steps: [
      { order: 1, text: 'Wash black lentils and chop fresh green papaya', icon: '🍈' },
      { order: 2, text: 'Boil lentils in earthen pot with salt and turmeric', icon: '🍲' },
      { order: 3, text: 'Add papaya cubes when lentils become tender', icon: '🔪' },
      { order: 4, text: 'Temper hot mustard oil with ginger and panch phoron spices', icon: '🍳' },
      { order: 5, text: 'Pour fragrant tempering over dal and simmer five minutes', icon: '🫗' },
    ],
  },

  // LEVEL 4: 6-Step Multi-Stage Routines with Strict Constraints
  {
    id: 'traditional_handloom_warp',
    title: 'Setting Up Traditional Handloom Weft',
    context: 'craft',
    minDifficulty: 4,
    maxDifficulty: 4,
    steps: [
      { order: 1, text: 'Inspect and unwind dyed Eri silk yarn skeins', icon: '🧶' },
      { order: 2, text: 'Mount spool onto spinning charkha wheel', icon: '☸️' },
      { order: 3, text: 'Wind silk yarn evenly onto wooden shuttle bobbins', icon: '🧵' },
      { order: 4, text: 'Thread warp ends precisely through the reed teeth', icon: '🪡' },
      { order: 5, text: 'Tighten warp beam tension lever securely', icon: '🪵' },
      { order: 6, text: 'Press wooden foot treadle to begin shuttle pass', icon: '🦶' },
    ],
  },
  {
    id: 'herbal_mustard_fish_preparation',
    title: 'Preparing Traditional Fish with Mustard Gravy',
    context: 'kitchen',
    minDifficulty: 4,
    maxDifficulty: 4,
    steps: [
      { order: 1, text: 'Grind yellow mustard seeds and green chillies on stone slab', icon: '🪨' },
      { order: 2, text: 'Rub fish steaks with sea salt and golden turmeric powder', icon: '🟡' },
      { order: 3, text: 'Heat pungent mustard oil in iron kadai until smoking', icon: '🍳' },
      { order: 4, text: 'Lightly pan-fry fish steaks on both sides and set aside', icon: '🐟' },
      { order: 5, text: 'Simmer mustard paste with warm water and green chillies', icon: '🍲' },
      { order: 6, text: 'Gently return fried fish into gravy and garnish with coriander', icon: '🌿' },
    ],
  },
  {
    id: 'weekly_medication_management',
    title: 'Organizing Weekly Morning & Evening Pill Box',
    context: 'routine',
    minDifficulty: 4,
    maxDifficulty: 4,
    steps: [
      { order: 1, text: 'Wash hands and wipe pill organizer tray completely dry', icon: '🧼' },
      { order: 2, text: 'Review printed doctor prescription slip carefully', icon: '📋' },
      { order: 3, text: 'Sort morning blood pressure tablets into blue compartment', icon: '💊' },
      { order: 4, text: 'Sort evening calcium and vitamin capsules into yellow slots', icon: '🟡' },
      { order: 5, text: 'Double check each day label from Monday to Sunday', icon: '🔍' },
      { order: 6, text: 'Close all compartment lids securely and store on shelf', icon: '🔒' },
    ],
  },
  {
    id: 'bamboo_basket_weaving_setup',
    title: 'Splitting and Weaving Bamboo Khorahi Basket',
    context: 'craft',
    minDifficulty: 4,
    maxDifficulty: 4,
    steps: [
      { order: 1, text: 'Select mature green Bhaluka bamboo culm from grove', icon: '🎍' },
      { order: 2, text: 'Split bamboo into uniform thin flexible slats using dao knife', icon: '🔪' },
      { order: 3, text: 'Scrape inner pith to make slats smooth and pliable', icon: '🪵' },
      { order: 4, text: 'Interlace base slats in square criss-cross pattern', icon: '🕸️' },
      { order: 5, text: 'Bend side slats upward and weave circumferential binding', icon: '🧺' },
      { order: 6, text: 'Fasten cane rim firmly with split cane binding stitches', icon: '🪡' },
    ],
  },

  // LEVEL 5: 7-Step Complex Sequences with Branching Logic
  {
    id: 'bihu_festival_community_feast',
    title: 'Organizing Magh Bihu Community Feast Setup',
    context: 'community',
    minDifficulty: 5,
    maxDifficulty: 5,
    steps: [
      { order: 1, text: 'Gather dried bamboo and hay to construct Meji tower', icon: '🎋' },
      { order: 2, text: 'Erect central bamboo post firmly into cleared ground', icon: '🪵' },
      { order: 3, text: 'Layer dry straw bundles tightly around the frame', icon: '🌾' },
      { order: 4, text: 'Prepare community cooking pits and large iron cauldrons', icon: '🔥' },
      { order: 5, text: 'Cook black sesame pitha cakes and sticky bora rice', icon: '🥠' },
      { order: 6, text: 'Invite village elders to take honoured seats by the pavilion', icon: '🧓' },
      { order: 7, text: 'Offer ceremonial betel nut tray before lighting twilight bonfire', icon: '🪔' },
    ],
  },
  {
    id: 'forest_wild_honey_extraction',
    title: 'Traditional Sustainable Forest Honey Harvesting',
    context: 'gardening',
    minDifficulty: 5,
    maxDifficulty: 5,
    steps: [
      { order: 1, text: 'Prepare fragrant herbal smoke torch from dry wild leaves', icon: '💨' },
      { order: 2, text: 'Locate mature wild beehive in high tree branch hollow', icon: '🌳' },
      { order: 3, text: 'Gently direct cool smoke toward hive to calm bees', icon: '🐝' },
      { order: 4, text: 'Cut only outer honey section, leaving brood comb intact', icon: '🍯' },
      { order: 5, text: 'Lower honey honeycomb in clean clay pot using jute rope', icon: '🪢' },
      { order: 6, text: 'Filter pure liquid honey through fine double muslin cloth', icon: '🕸️' },
      { order: 7, text: 'Seal filtered wild honey in airtight sterile glass jars', icon: '🫙' },
    ],
  },
  {
    id: 'traditional_muga_silk_processing',
    title: 'Rearing and Spinning Authentic Golden Muga Silk',
    context: 'craft',
    minDifficulty: 5,
    maxDifficulty: 5,
    steps: [
      { order: 1, text: 'Feed silkworms fresh Som tree leaves in outdoor orchard', icon: '🍃' },
      { order: 2, text: 'Collect mature spun golden silk cocoons from bamboo Jali', icon: '🥥' },
      { order: 3, text: 'Boil golden cocoons in mild wood ash alkaline water', icon: '🫕' },
      { order: 4, text: 'Locate fine single filament silk thread end with brush', icon: '🪡' },
      { order: 5, text: 'Reel multiple silk filaments together onto wooden Bhir spindle', icon: '☸️' },
      { order: 6, text: 'Twist reeled raw silk yarn into strong weaving skeins', icon: '🧶' },
      { order: 7, text: 'Wash golden yarn in clean river water and dry under gentle shade', icon: '☀️' },
    ],
  },
  {
    id: 'brass_casting_sarthebari_artisan',
    title: 'Sarthebari Bell Metal Handcrafting Process',
    context: 'craft',
    minDifficulty: 5,
    maxDifficulty: 5,
    steps: [
      { order: 1, text: 'Weigh copper and tin ingots in precise 4-to-1 ratio', icon: '⚖️' },
      { order: 2, text: 'Melt metals inside charcoal-fired clay pit furnace', icon: '🔥' },
      { order: 3, text: 'Pour molten bell metal alloy into round stone molds', icon: '🫗' },
      { order: 4, text: 'Beat red-hot metal disc rhythmically with heavy hammers', icon: '🔨' },
      { order: 5, text: 'Quench shaped platter in cold water trough for tempering', icon: '💧' },
      { order: 6, text: 'Chisel fine traditional floral border patterns onto rim', icon: '🪡' },
      { order: 7, text: 'Polish shiny surface with rice husk and tamarind wash', icon: '✨' },
    ],
  },
  {
    id: 'monsoon_deep_water_paddy_planting',
    title: 'Monsoon Lowland Sali Paddy Cultivation',
    context: 'gardening',
    minDifficulty: 5,
    maxDifficulty: 5,
    steps: [
      { order: 1, text: 'Till rain-soaked clay soil with wooden ox plow', icon: '🐂' },
      { order: 2, text: 'Level muddy terrace beds with flat bamboo beam', icon: '🪵' },
      { order: 3, text: 'Uproot tender green Joha rice saplings from nursery', icon: '🌱' },
      { order: 4, text: 'Tie saplings into neat bundles with palm fibers', icon: '🌾' },
      { order: 5, text: 'Transplant four seedlings together at uniform hand-span intervals', icon: '👐' },
      { order: 6, text: 'Regulate bamboo canal gates to maintain shallow water depth', icon: '🌊' },
      { order: 7, text: 'Erect scarecrow in field corner to protect tender ears', icon: '🎎' },
    ],
  },
  {
    id: 'bamboo_bridge_community_construction',
    title: 'Building Seasonal Bamboo Sako Footbridge',
    context: 'community',
    minDifficulty: 5,
    maxDifficulty: 5,
    steps: [
      { order: 1, text: 'Survey riverbed crossing width and current speed', icon: '🌊' },
      { order: 2, text: 'Drive thick bamboo pillars deep into sandy riverbed', icon: '🪵' },
      { order: 3, text: 'Fasten diagonal cross-braces tightly with split cane ropes', icon: '🪢' },
      { order: 4, text: 'Lay sturdy horizontal whole bamboo poles across pillars', icon: '🎋' },
      { order: 5, text: 'Spread woven split-bamboo mats over walking deck', icon: '🧺' },
      { order: 6, text: 'Secure waist-high guide handrail alongside crossing path', icon: '🦯' },
      { order: 7, text: 'Test bridge stability with village elders before opening', icon: '🚶' },
    ],
  },
  {
    id: 'fermented_bamboo_khorisa_preservation',
    title: 'Preparing Seasonal Khorisa Fermented Bamboo',
    context: 'kitchen',
    minDifficulty: 5,
    maxDifficulty: 5,
    steps: [
      { order: 1, text: 'Harvest fresh tender bamboo shoots from monsoon grove', icon: '🎍' },
      { order: 2, text: 'Peel fibrous outer purple sheaths down to pale inner core', icon: '🔪' },
      { order: 3, text: 'Grate tender shoot finely into thin moist strands', icon: '🥣' },
      { order: 4, text: 'Pack grated bamboo firmly into sterile glass fermentation jar', icon: '🫙' },
      { order: 5, text: 'Pour cooled boiled spring water and rock salt to submerge', icon: '🫗' },
      { order: 6, text: 'Cover mouth tightly with porous white cotton cloth', icon: '🧣' },
      { order: 7, text: 'Place jar in warm sunny verandah corner for two weeks fermentation', icon: '☀️' },
    ],
  },
];

/**
 * Procedurally generates a parameterized variation of a sequencing routine.
 * Allows combinatorially distinct routines by varying ingredients, tools, crops, and names.
 */
export function generateParameterizedRoutine(
  difficulty: 1 | 2 | 3 | 4 | 5,
  prng: PRNG,
  preferredContext?: TaskContext,
  recentFingerprints: string[] = []
): SequencingRoutineTemplate {
  // Extract recent routine IDs from fingerprint history
  const recentIds = new Set<string>();
  recentFingerprints.forEach(fp => {
    SEQUENCING_ROUTINE_TEMPLATES.forEach(t => {
      if (fp.includes(t.id)) recentIds.add(t.id);
    });
  });

  const matching = SEQUENCING_ROUTINE_TEMPLATES.filter(
    t => t.minDifficulty <= difficulty && t.maxDifficulty >= difficulty
  );

  // Strictly prioritize routines that haven't been presented recently
  const unpicked = matching.filter(t => !recentIds.has(t.id));
  const poolToUse = unpicked.length > 0 ? unpicked : matching;
  const base = poolToUse.length > 0 ? prng.choice(poolToUse) : SEQUENCING_ROUTINE_TEMPLATES[0]!;

  // Combinatorial parameter sets
  const variations: Record<string, string[]> = {
    tea: ['Assam Orthodox Golden Tips', 'Spiced Ginger Chai', 'Smoked Singpho Bamboo Tea', 'Organic Tulsi Green Tea', 'Brahmaputra Valley CTC Tea', 'Cardamom Lemon Tea'],
    rice: ['Joha Fragrant Rice', 'Bora Sticky Purple Rice', 'Chokuwa Soft Rice', 'Red Hill Scented Rice', 'Flattened Bora Chira'],
    vegetable: ['Monsoon Mustard Greens', 'Fiddlehead Dhekia Ferns', 'Ou Tenga Elephant Apple', 'Green Papaya Slices', 'Bottle Gourd Strips', 'Taro Root Stems'],
    vessel: ['Brass Lota', 'Clay Charu Pot', 'Sarthebari Bell Metal Pot', 'Cast Iron Kadai', 'Bamboo Steamer Tube'],
    fish: ['River Rohu Carp', 'Chital Featherback', 'Catla Fresh Catch', 'Borali Catfish', 'Mawphlang River Trout'],
  };

  const chosenTea = prng.choice(variations.tea!);
  const chosenRice = prng.choice(variations.rice!);
  const chosenVeg = prng.choice(variations.vegetable!);
  const chosenVessel = prng.choice(variations.vessel!);
  const chosenFish = prng.choice(variations.fish!);

  const steps: RoutineStep[] = base.steps.map(s => {
    let text = s.text
      .replace(/Assam Orthodox tea leaves/g, `${chosenTea} leaves`)
      .replace(/Joha rice grains/g, `${chosenRice} grains`)
      .replace(/mustard greens/gi, chosenVeg)
      .replace(/brass bowl/g, chosenVessel)
      .replace(/fish steaks/g, `${chosenFish} steaks`)
      .replace(/river carp/g, chosenFish);
    return { ...s, text };
  });

  return {
    id: base.id, // Deterministic ID ensures anti-repetition fingerprint functions properly!
    title: base.title.replace(/Assam Tea/g, chosenTea).replace(/Joha Fragrant Rice/g, chosenRice),
    context: preferredContext || base.context,
    minDifficulty: difficulty,
    maxDifficulty: difficulty,
    steps,
  };
}
