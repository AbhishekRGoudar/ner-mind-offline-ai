import { TaskContext } from '../../types/observation.js';

export interface RegionalMemoryItem {
  id: string;
  name: string;
  localName: string;
  icon: string;
  category: 'produce' | 'spice' | 'craft' | 'tea' | 'utensil' | 'flora' | 'bakery';
  context: TaskContext;
}

export const REGIONAL_MEMORY_ITEMS: RegionalMemoryItem[] = [
  // Produce / Vegetables / Fruits
  { id: 'bamboo_shoot', name: 'Bamboo Shoot', localName: 'বাঁহ গাজ', icon: '🎍', category: 'produce', context: 'market' },
  { id: 'khasi_orange', name: 'Khasi Mandarin Orange', localName: 'কমলা', icon: '🍊', category: 'produce', context: 'market' },
  { id: 'bhim_banana', name: 'Bhim Banana', localName: 'ভীম কল', icon: '🍌', category: 'produce', context: 'market' },
  { id: 'king_chilli', name: 'Bhut Jolokia (King Chilli)', localName: 'ভূত জলকীয়া', icon: '🌶️', category: 'produce', context: 'market' },
  { id: 'elephant_apple', name: 'Ou Tenga (Elephant Apple)', localName: 'ঔ টেঙা', icon: '🍏', category: 'produce', context: 'kitchen' },
  { id: 'pointed_gourd', name: 'Potal (Pointed Gourd)', localName: 'পটল', icon: '🥒', category: 'produce', context: 'kitchen' },
  { id: 'colocasia', name: 'Kachu (Taro Stem)', localName: 'কচু', icon: '🥬', category: 'produce', context: 'gardening' },
  { id: 'dhekia_xak', name: 'Dhekia (Fiddlehead Fern)', localName: 'ঢেকীয়া শাক', icon: '🌿', category: 'produce', context: 'gardening' },
  { id: 'pomegranate', name: 'Dalim (Pomegranate)', localName: 'ডালিম', icon: '🍎', category: 'produce', context: 'market' },
  { id: 'kachai_lemon', name: 'Kaji Nemu (Assam Lemon)', localName: 'কাজী নেমু', icon: '🍋', category: 'produce', context: 'kitchen' },
  { id: 'papaya', name: 'Amita (Green Papaya)', localName: 'অমিতা', icon: '🍈', category: 'produce', context: 'gardening' },
  { id: 'jackfruit', name: 'Kothal (Ripe Jackfruit)', localName: 'কঁঠাল', icon: '🥭', category: 'produce', context: 'market' },

  // Spices & Condiments
  { id: 'assam_ginger', name: 'Fresh Ginger', localName: 'আদা', icon: '🫚', category: 'spice', context: 'kitchen' },
  { id: 'mustard_seeds', name: 'Mustard Seeds', localName: 'সৰিয়হ', icon: '🌾', category: 'spice', context: 'kitchen' },
  { id: 'black_cardamom', name: 'Black Cardamom', localName: 'ইলাচি', icon: '🌱', category: 'spice', context: 'market' },
  { id: 'turmeric_root', name: 'Fresh Turmeric', localName: 'কেঁচা হালধি', icon: '🟡', category: 'spice', context: 'kitchen' },
  { id: 'wild_honey', name: 'Wild Forest Honey', localName: 'মৌ', icon: '🍯', category: 'spice', context: 'market' },
  { id: 'garlic_cloves', name: 'Local Garlic', localName: 'নহৰু', icon: '🧄', category: 'spice', context: 'kitchen' },
  { id: 'cinnamon_bark', name: 'Dalchini Bark', localName: 'দালচেনি', icon: '🪵', category: 'spice', context: 'market' },
  { id: 'bay_leaf', name: 'Tejpat (Bay Leaves)', localName: 'তেজপাত', icon: '🍃', category: 'spice', context: 'kitchen' },

  // Teas & Infusions
  { id: 'assam_tea_orthodox', name: 'Assam Orthodox Golden Tea', localName: 'অসমীয়া চাহ', icon: '🍵', category: 'tea', context: 'routine' },
  { id: 'green_tea_leaves', name: 'Organic Green Tea Leaves', localName: 'সেউজীয়া চাহ', icon: '🫖', category: 'tea', context: 'routine' },
  { id: 'smoked_tea', name: 'Singpho Phalap (Smoked Bamboo Tea)', localName: 'ফালাপ চাহ', icon: '☕', category: 'tea', context: 'routine' },
  { id: 'masala_chai_blend', name: 'Ginger Spiced Chai Blend', localName: 'মচলা চাহ', icon: '🥛', category: 'tea', context: 'kitchen' },

  // Utensils & Kitchen Items
  { id: 'brass_lota', name: 'Brass Lota Vessel', localName: 'লোটা', icon: '🏺', category: 'utensil', context: 'household' },
  { id: 'bell_metal_kahi', name: 'Kahi (Bell Metal Plate)', localName: 'কাঁহী', icon: '🍽️', category: 'utensil', context: 'household' },
  { id: 'bamboo_chalani', name: 'Chalani (Bamboo Sieve)', localName: 'চালনী', icon: '🕸️', category: 'utensil', context: 'household' },
  { id: 'clay_cooking_pot', name: 'Charu (Clay Pot)', localName: 'চৰু', icon: '🥣', category: 'utensil', context: 'kitchen' },
  { id: 'bamboo_khorahi', name: 'Khorahi (Vegetable Basket)', localName: 'খোৰাহী', icon: '🧺', category: 'utensil', context: 'household' },

  // Crafts & Fabrics
  { id: 'gamusa_cloth', name: 'Gamusa Handwoven Towel', localName: 'গামোচা', icon: '🧣', category: 'craft', context: 'craft' },
  { id: 'muga_silk_scarf', name: 'Muga Golden Silk Scarf', localName: 'মুগা ৰেচম', icon: '👘', category: 'craft', context: 'craft' },
  { id: 'eri_shawl', name: 'Eri Peace Silk Shawl', localName: 'এৰী চাদৰ', icon: '🧶', category: 'craft', context: 'craft' },
  { id: 'bamboo_jaapi', name: 'Jaapi Sun Hat', localName: 'জাপী', icon: '👒', category: 'craft', context: 'craft' },
  { id: 'cane_handfan', name: 'Bisoni (Handwoven Cane Fan)', localName: 'বিচনী', icon: '🪭', category: 'craft', context: 'household' },

  // Regional Flora & Gardening
  { id: 'kopou_orchid', name: 'Kopou Phool (Foxtail Orchid)', localName: 'কপৌ ফুল', icon: '🌸', category: 'flora', context: 'gardening' },
  { id: 'tulsi_plant', name: 'Sacred Krishna Tulsi', localName: 'তুলসী গছ', icon: '🪴', category: 'flora', context: 'gardening' },
  { id: 'marigold', name: 'Gendha Phool (Golden Marigold)', localName: 'গেণ্ডা ফুল', icon: '🌼', category: 'flora', context: 'gardening' },
  { id: 'betel_vine', name: 'Pan Paat (Betel Vine Leaf)', localName: 'পাণ পাত', icon: '🌱', category: 'flora', context: 'gardening' },
  { id: 'areca_nut', name: 'Tamul (Areca Nut Cluster)', localName: 'তামোল', icon: '🥥', category: 'flora', context: 'gardening' },

  // Traditional Bakery & Sweets
  { id: 'til_pitha', name: 'Til Pitha (Sesame Rice Roll)', localName: 'তিল পিঠা', icon: '🥠', category: 'bakery', context: 'kitchen' },
  { id: 'ghila_pitha', name: 'Ghila Pitha (Sweet Fried Rice Cake)', localName: 'ঘিলা পিঠা', icon: '🍘', category: 'bakery', context: 'kitchen' },
  { id: 'narikol_laru', name: 'Narikol Laru (Coconut Sweet Ball)', localName: 'নাৰিকলৰ লাড়ু', icon: '⚪', category: 'bakery', context: 'kitchen' },
  { id: 'chira_curd', name: 'Bora Saul Chira (Flattened Sticky Rice)', localName: 'চিৰা', icon: '🍚', category: 'bakery', context: 'kitchen' },
];
