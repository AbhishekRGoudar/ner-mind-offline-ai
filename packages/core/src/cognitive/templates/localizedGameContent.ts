import { SupportedLanguage } from '../../types/language.js';

export interface LocalizedStringPair {
  en: string;
  hi?: string;
  kn?: string;
  as?: string;
  bn?: string;
  mni?: string;
  brx?: string;
  lus?: string;
  kha?: string;
  grt?: string;
  trp?: string;
  ten?: string;
  ao?: string;
  lot?: string;
}

/**
 * Verified offline localization for Regional Recognition Objects
 */
export const LOCALIZED_RECOGNITION_OBJECTS: Record<string, {
  name: LocalizedStringPair;
  description: LocalizedStringPair;
}> = {
  bamboo_jaapi: {
    name: {
      en: 'Bamboo Jaapi',
      hi: 'बांस की जापी',
      kn: 'ಬಿದಿರಿನ ಜಾಪಿ',
    },
    description: {
      en: 'Traditional conical hat woven from tight bamboo strips and dried palm leaves, decorated with red felt',
      hi: 'बांस की पट्टियों और सूखे ताड़ के पत्तों से बनी पारंपरिक शंक्वाकार टोपी, जो लाल कपड़े से सजी होती है',
      kn: 'ಬಿದಿರಿನ ಪಟ್ಟಿಗಳು ಮತ್ತು ಒಣಗಿದ ತಾಳೆ ಎಲೆಗಳಿಂದ ನೇಯ್ದ ಸಾಂಪ್ರದಾಯಿಕ ಶಂಕುವಿನಾಕಾರದ ಟೋಪಿ',
    },
  },
  gamusa_cloth: {
    name: {
      en: 'Assamese Gamusa',
      hi: 'असमिया गमोसा',
      kn: 'ಅಸ್ಸಾಮಿ ಗಮೋಸಾ',
    },
    description: {
      en: 'Handwoven white rectangular cotton/silk towel adorned with traditional red woven borders given as mark of honour',
      hi: 'सम्मान के प्रतीक के रूप में दिया जाने वाला लाल बॉर्डर वाला पारंपरिक सूती/रेशमी तौलिया',
      kn: 'ಗೌರವಾರ್ಥವಾಗಿ ನೀಡಲಾಗುವ ಸಾಂಪ್ರದಾಯಿಕ ಕೆಂಪು ಅಂಚುಗಳನ್ನು ಹೊಂದಿರುವ ಕೈಯಿಂದ ನೇಯ್ದ ಹತ್ತಿ/ರೇಷ್ಮೆ ಟವೆಲ್',
    },
  },
  muga_mekhela_sador: {
    name: {
      en: 'Muga Mekhela Sador',
      hi: 'मूगा मेखेला चादर',
      kn: 'ಮುಗಾ ಮೇಖೆಲಾ ಸಾದೋರ್',
    },
    description: {
      en: 'Two-piece indigenous golden silk traditional dress worn by women during ceremonies',
      hi: 'उत्सवों और समारोहों में महिलाओं द्वारा पहनी जाने वाली स्वदेशी सुनहरे रेशम की पारंपरिक पोशाक',
      kn: 'ಸಮಾರಂಭಗಳಲ್ಲಿ ಮಹಿಳೆಯರು ಧರಿಸುವ ಸಾಂಪ್ರದಾಯಿಕ ಚಿನ್ನದ ಬಣ್ಣದ ರೇಷ್ಮೆ ಉಡುಗೆ',
    },
  },
  eri_shawl: {
    name: {
      en: 'Eri Peace Silk Shawl',
      hi: 'एरी रेशमी शॉल',
      kn: 'ಏರಿ ರೇಷ್ಮೆ ಶಾಲು',
    },
    description: {
      en: 'Warm, textured cream-coloured handloom shawl spun from non-violent domesticated silkworms',
      hi: 'अहिंसक रेशम के कीड़ों से काता गया गर्म, हल्के क्रीम रंग का हथकरघा शॉल',
      kn: 'ಅಹಿಂಸಾ ರೇಷ್ಮೆ ಹುಳುಗಳಿಂದ ನೂಲಲಾದ ಬೆಚ್ಚಗಿನ, ಕೆನೆ ಬಣ್ಣದ ಕೈಮಗ್ಗದ ಶಾಲು',
    },
  },
  kahi_bell_metal_plate: {
    name: {
      en: 'Kahi Bell Metal Plate',
      hi: 'कांस्य भोजन थाली (काही)',
      kn: 'ಕಂಚಿನ ಊಟದ ತಟ್ಟೆ (ಕಾಹಿ)',
    },
    description: {
      en: 'Traditional hand-beaten bronze plate with a raised rim used for serving festive meals',
      hi: 'त्योहारों में भोजन परोसने के लिए उपयोग की जाने वाली पारंपरिक हाथ से गढ़ी गई कांसे की थाली',
      kn: 'ಹಬ್ಬದ ಊಟವನ್ನು ಬಡಿಸಲು ಬಳಸಲಾಗುವ ಸಾಂಪ್ರದಾಯಿಕ ಕಂಚಿನ ತಟ್ಟೆ',
    },
  },
  boti_cutting_blade: {
    name: {
      en: 'Boti Vegetable Cutter',
      hi: 'सब्जी काटने की दरांती (बोटी)',
      kn: 'ತರಕಾರಿ ಕತ್ತರಿಸುವ ಮಣೆ (ಬೋತಿ)',
    },
    description: {
      en: 'Mounted floor blade used with foot pressure for peeling and cutting vegetables and fish',
      hi: 'फर्श पर बैठकर पैर के सहारे सब्जियां और मछली काटने वाला पारंपरिक चाकू',
      kn: 'ನೆಲದ ಮೇಲೆ ಕುಳಿತು ತರಕಾರಿಗಳನ್ನು ಕತ್ತರಿಸಲು ಬಳಸುವ ಸಾಂಪ್ರದಾಯಿಕ ಮಣೆಕತ್ತಿ',
    },
  },
  dhol_drum: {
    name: {
      en: 'Folk Dhol Drum',
      hi: 'लोक ढोलक',
      kn: 'ಜಾನಪದ ಡೋಲು',
    },
    description: {
      en: 'Two-sided wooden barrel drum played with a stick and hand during spring festival dances',
      hi: 'वसंत उत्सव के नृत्यों के दौरान छड़ी और हाथ से बजाया जाने वाला दो तरफा लकड़ी का ढोल',
      kn: 'ವಸಂತೋತ್ಸವದ ನೃತ್ಯಗಳ ಸಮಯದಲ್ಲಿ ಕೋಲು ಮತ್ತು ಕೈಯಿಂದ ನುಡಿಸುವ ಮರದ ಡೋಲು',
    },
  },
  pepa_horn: {
    name: {
      en: 'Buffalo Horn Pepa',
      hi: 'भैंस के सींग की पेपा तुरही',
      kn: 'ಕೋಣದ ಕೊಂಬಿನ ಪೇಪಾ ಕೊಳಲು',
    },
    description: {
      en: 'High-pitched reed pipe crafted from a buffalo horn tip, producing signature festive melodies',
      hi: 'भैंस के सींग के सिरे से बनी मधुर आवाज वाली बांसुरी जो पारंपरिक धुनों के लिए बजाई जाती है',
      kn: 'ಕೋಣದ ಕೊಂಬಿನ ತುದಿಯಿಂದ ತಯಾರಿಸಿದ ತೀಕ್ಷ್ಣ ಧ್ವನಿಯ ಸಾಂಪ್ರದಾಯಿಕ ಕೊಳಲು',
    },
  },
  sarai_offering_tray: {
    name: {
      en: 'Xorai Offering Stand',
      hi: 'पारंपरिक सराई पूजा थाल',
      kn: 'ಸಾಂಪ್ರದಾಯಿಕ ಸರಾಯಿ ಪೂಜಾ ತಟ್ಟೆ',
    },
    description: {
      en: 'Elevated bell metal offering tray with pedestal base and conical lid, used to present betel leaves',
      hi: 'पान-सुपारी और प्रसाद अर्पित करने के लिए इस्तेमाल किया जाने वाला पीतल/कांसे का ऊंचा पूजा थाल',
      kn: 'ತಾಂಬೂಲ ಮತ್ತು ಪ್ರಸಾದವನ್ನು ಅರ್ಪಿಸಲು ಬಳಸಲಾಗುವ ಎತ್ತರದ ಕಂಚಿನ ಪೀಠದ ತಟ್ಟೆ',
    },
  },
};

/**
 * Verified offline localization for Regional Memory Items
 */
export const LOCALIZED_MEMORY_ITEMS: Record<string, LocalizedStringPair> = {
  rice: { en: 'Aromatic Rice', hi: 'सुगंधित चावल', kn: 'ಸುವಾಸನೆಯ ಅಕ್ಕಿ' },
  mustard_oil: { en: 'Mustard Oil', hi: 'सरसों का तेल', kn: 'ಸಾಸಿವೆ ಎಣ್ಣೆ' },
  turmeric: { en: 'Organic Turmeric', hi: 'हल्दी पाउडर', kn: 'ಅರಿಶಿನ ಪುಡಿ' },
  ginger: { en: 'Fresh Ginger', hi: 'ताजा अदरक', kn: 'ಹಸಿ ಶುಂಠಿ' },
  tea_leaves: { en: 'Assam Tea Leaves', hi: 'असम चाय पत्ती', kn: 'ಅಸ್ಸಾಮ್ ಚಹಾ ಪುಡಿ' },
  milk: { en: 'Fresh Milk', hi: 'ताजा दूध', kn: 'ಹಸುವಿನ ಹಾಲು' },
  soap: { en: 'Herbal Soap', hi: 'हर्बल साबुन', kn: 'ಗಿಡಮೂಲಿಕೆ ಸಾಬೂನು' },
  bananas: { en: 'Ripe Bananas', hi: 'पके केले', kn: 'ಬಾಳೆಹಣ್ಣು' },
  jaggery: { en: 'Palm Jaggery', hi: 'गुड़', kn: 'ಬೆಲ್ಲ' },
  lentils: { en: 'Yellow Lentils', hi: 'पीली दाल', kn: 'ತೊಗರಿ ಬೇಳೆ' },
  cardamom: { en: 'Green Cardamom', hi: 'हरी इलायची', kn: 'ಏಲಕ್ಕಿ' },
  potatoes: { en: 'Fresh Potatoes', hi: 'आलू', kn: 'ಆಲೂಗಡ್ಡೆ' },
};

/**
 * Verified offline localization for Sequencing Steps
 */
export const LOCALIZED_SEQUENCING_STEPS: Record<string, LocalizedStringPair> = {
  'Boil fresh water in kettle': {
    en: 'Boil fresh water in kettle',
    hi: 'केतली में ताजा पानी उबालें',
    kn: 'ಪಾತ್ರೆಯಲ್ಲಿ ನೀರನ್ನು ಕುದಿಸಿ',
  },
  'Add crushed ginger and spices': {
    en: 'Add crushed ginger and spices',
    hi: 'कुटा हुआ अदरक और इलायची डालें',
    kn: 'ಜಜ್ಜಿದ ಶುಂಠಿ ಮತ್ತು ಏಲಕ್ಕಿ ಸೇರಿಸಿ',
  },
  'Add rich tea leaves to boiling water': {
    en: 'Add rich tea leaves to boiling water',
    hi: 'उबलते पानी में चाय पत्ती डालें',
    kn: 'ಕುದಿಯುವ ನೀರಿಗೆ ಚಹಾ ಪುಡಿ ಹಾಕಿ',
  },
  'Pour fresh milk and bring to simmer': {
    en: 'Pour fresh milk and bring to simmer',
    hi: 'ताजा दूध डालें और उबाल आने दें',
    kn: 'ಹಾಲು ಸೇರಿಸಿ ಚೆನ್ನಾಗಿ ಕುದಿಸಿ',
  },
  'Strain tea through sieve into cup': {
    en: 'Strain tea through sieve into cup',
    hi: 'चाय को छलनी से कप में छानें',
    kn: 'ಚಹಾವನ್ನು ಸೋಸಿ ಕಪ್‌ಗೆ ಸುರಿಯಿರಿ',
  },
  'Serve warm tea with biscuits': {
    en: 'Serve warm tea with biscuits',
    hi: 'बिस्कुट के साथ गरमागरम चाय परोसें',
    kn: 'ಬಿಸ್ಕತ್ ಜೊತೆ ಬಿಸಿ ಚಹಾ ಸವಿಯಿರಿ',
  },
};

/**
 * Verified offline localization for Sequencing Routines
 */
export const LOCALIZED_SEQUENCING_ROUTINES: Record<string, {
  title: LocalizedStringPair;
  steps: Record<number, LocalizedStringPair>;
}> = {
  hand_washing_hygiene: {
    title: { en: 'Clean Handwashing Before Meals', hi: 'भोजन से पहले हाथ धोना', kn: 'ಊಟಕ್ಕೆ ಮುಂಚೆ ಕೈ ತೊಳೆಯುವುದು' },
    steps: {
      1: { en: 'Rinse hands with clean flowing water', hi: 'साफ बहते पानी से हाथ धोएं', kn: 'ಹರಿಯುವ ನೀರಿನಿಂದ ಕೈಗಳನ್ನು ತೊಳೆಯಿರಿ' },
      2: { en: 'Lather hands thoroughly with soap', hi: 'साबुन से अच्छी तरह झाग बनाएं', kn: 'ಸಾಬೂನಿನಿಂದ ಚೆನ್ನಾಗಿ ನೊರೆ ಬರಿಸಿ' },
      3: { en: 'Dry hands completely using a clean towel', hi: 'साफ तौलिए से हाथों को अच्छी तरह सुखाएं', kn: 'ಸ್ವಚ್ಛವಾದ ಟವೆಲ್‌ನಿಂದ ಕೈಗಳನ್ನು ಒರೆಸಿ' },
    },
  },
  morning_water_intake: {
    title: { en: 'Morning Pure Water Routine', hi: 'सुबह पानी पीने का नियम', kn: 'ಬೆಳಗಿನ ಶುದ್ಧ ನೀರಿನ ದಿನಚರಿ' },
    steps: {
      1: { en: 'Take clean brass glass from the kitchen shelf', hi: 'रसोई से साफ पीतल का गिलास लें', kn: 'ಸ್ವಚ್ಛವಾದ ಲೋಟವನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ' },
      2: { en: 'Pour boiled, filtered water into the glass', hi: 'गिलास में उबला व छाना हुआ पानी डालें', kn: 'ಲೋಟಕ್ಕೆ ಸೋಸಿದ ಶುದ್ಧ ನೀರನ್ನು ಹಾಕಿ' },
      3: { en: 'Drink slowly while seated comfortably', hi: 'आराम से बैठकर धीरे-धीरे पिएं', kn: 'ಆರಾಮವಾಗಿ ಕುಳಿತು ನಿಧಾನವಾಗಿ ಕುಡಿಯಿರಿ' },
    },
  },
  tulsi_watering: {
    title: { en: 'Watering the Sacred Courtyard Tulsi', hi: 'आंगन की तुलसी में जल अर्पित करना', kn: 'ತುಳಸಿ ಗಿಡಕ್ಕೆ ನೀರು ಹಾಕುವುದು' },
    steps: {
      1: { en: 'Fill the copper lota with fresh well water', hi: 'तांबे के लोटे में ताजा जल भरें', kn: 'ತಾಮ್ರದ ಪಾತ್ರೆಯಲ್ಲಿ ನೀರನ್ನು ತುಂಬಿ' },
      2: { en: 'Walk gently to the earthen Tulsi altar', hi: 'तुलसी के चौबारे के पास जाएं', kn: 'ತುಳಸಿ ಕಟ್ಟೆಯ ಹತ್ತಿರ ಹೋಗಿ' },
      3: { en: 'Pour the water carefully around the plant roots', hi: 'पौधे की जड़ों में सावधानी से जल डालें', kn: 'ಗಿಡದ ಬುಡಕ್ಕೆ ಜಾಗರೂಕತೆಯಿಂದ ನೀರು ಹಾಕಿ' },
    },
  },
  eyewear_cleaning: {
    title: { en: 'Cleaning Reading Spectacles', hi: 'पढ़ने के चश्मे की सफाई', kn: 'ಓದುವ ಕನ್ನಡಕವನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸುವುದು' },
    steps: {
      1: { en: 'Take reading glasses out of their protective case', hi: 'चश्मे को उसके केस से निकालें', kn: 'ಕನ್ನಡಕವನ್ನು ಕವಚದಿಂದ ಹೊರತೆಗೆಯಿರಿ' },
      2: { en: 'Wipe both lenses gently with a soft microfibre cloth', hi: 'मुलायम कपड़े से दोनों लेंस साफ करें', kn: 'ಮೃದುವಾದ ಬಟ್ಟೆಯಿಂದ ಕನ್ನಡಕವನ್ನು ಒರೆಸಿ' },
      3: { en: 'Put on clean glasses to read the morning news', hi: 'अखबार पढ़ने के लिए साफ चश्मा पहनें', kn: 'ಖುಷಿಯಿಂದ ಪತ್ರಿಕೆ ಓದಲು ಕನ್ನಡಕ ಧರಿಸಿ' },
    },
  },
  assam_tea_routine: {
    title: { en: 'Brewing Traditional Assam Tea', hi: 'पारंपरिक असम चाय बनाना', kn: 'ಸಾಂಪ್ರದಾಯಿಕ ಅಸ್ಸಾಂ ಚಹಾ ತಯಾರಿಕೆ' },
    steps: {
      1: { en: 'Boil fresh spring water in the kettle', hi: 'केतली में ताजा पानी उबालें', kn: 'ಪಾತ್ರೆಯಲ್ಲಿ ನೀರನ್ನು ಕುದಿಸಿ' },
      2: { en: 'Add aromatic Assam Orthodox tea leaves', hi: 'खुशबूदार असम चाय पत्ती डालें', kn: 'ಸುವಾಸನೆಯ ಚಹಾ ಪುಡಿಯನ್ನು ಹಾಕಿ' },
      3: { en: 'Add a warm splash of fresh milk and ginger', hi: 'ताजा दूध और कुटा हुआ अदरक डालें', kn: 'ಹಾಲು ಮತ್ತು ಜಜ್ಜಿದ ಶುಂಠಿ ಸೇರಿಸಿ' },
      4: { en: 'Strain fragrant tea into clay cups for family', hi: 'परिवार के लिए प्यालों में चाय छानें', kn: 'ಕಪ್‌ಗೆ ಚಹಾವನ್ನು ಸೋಸಿ ಬಡಿಸಿ' },
    },
  },
};

/**
 * Verified offline localization for Daily Planning Activities
 */
export const LOCALIZED_PLANNING_ACTIVITIES: Record<string, LocalizedStringPair> = {
  act_morning_walk: {
    en: 'Morning Garden Walk',
    hi: 'सुबह की सैर',
    kn: 'ಮುಂಜಾನೆಯ ನಡಿಗೆ',
  },
  act_breakfast: {
    en: 'Nutritious Breakfast',
    hi: 'पौष्टिक नाश्ता',
    kn: 'ಪೌಷ್ಟಿಕ ಉಪಹಾರ',
  },
  act_morning_meds: {
    en: 'Take Morning Medicine',
    hi: 'सुबह की दवा लें',
    kn: 'ಬೆಳಗಿನ ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಿ',
  },
  act_market_visit: {
    en: 'Visit Local Market',
    hi: 'स्थानीय बाज़ार जाएं',
    kn: 'ಸ್ಥಳೀಯ ಮಾರುಕಟ್ಟೆಗೆ ಭೇಟಿ',
  },
  act_lunch: {
    en: 'Wholesome Lunch',
    hi: 'दोपहर का भोजन',
    kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ',
  },
  act_afternoon_rest: {
    en: 'Afternoon Rest & Reading',
    hi: 'दोपहर का विश्राम',
    kn: 'ಮಧ್ಯಾಹ್ನದ ವಿಶ್ರಾಂತಿ',
  },
  act_evening_tea: {
    en: 'Evening Tea with Family',
    hi: 'परिवार के साथ शाम की चाय',
    kn: 'ಕುಟುಂಬದೊಂದಿಗೆ ಸಂಜೆಯ ಚಹಾ',
  },
  act_evening_meds: {
    en: 'Take Evening Medicine',
    hi: 'शाम की दवा लें',
    kn: 'ಸಂಜೆಯ ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಿ',
  },
  act_dinner: {
    en: 'Light Dinner',
    hi: 'हल्का रात्रिभोज',
    kn: 'ಲಘು ರಾತ್ರಿಯ ಊಟ',
  },
};

export const LOCALIZED_MARKET_GOODS: Record<string, LocalizedStringPair> = {
  tea_leaves: {
    en: 'Fresh Assam Tea Leaves (250g)',
    hi: 'ताज़ी असम चाय पत्तियां',
    kn: 'ತಾಜಾ ಅಸ್ಸಾಂ ಚಹಾ ಎಲೆಗಳು',
  },
  bamboo_shoot_jar: {
    en: 'Preserved Bamboo Shoot Jar',
    hi: 'बांस के अंकुर का जार',
    kn: 'ಬಿದಿರಿನ ಚಿಗುರಿನ ಜಾರ್',
  },
  khasi_oranges: {
    en: 'Khasi Sweet Mandarin Oranges',
    hi: 'मीठे संतरे',
    kn: 'ಸಿಹಿ ಕಿತ್ತಳೆ ಹಣ್ಣುಗಳು',
  },
  mustard_oil: {
    en: 'Cold-Pressed Mustard Oil Bottle',
    hi: 'सरसों का तेल',
    kn: 'ಸಾಸಿವೆ ಎಣ್ಣೆ ಬಾಟಲ್',
  },
  ginger_roots: {
    en: 'Fresh River Ginger Roots (500g)',
    hi: 'ताज़ा अदरक',
    kn: 'ತಾಜಾ ಶುಂಠಿ',
  },
  bhim_bananas: {
    en: 'Bhim Banana Bunch',
    hi: 'केलों का गुच्छा',
    kn: 'ಬಾಳೆಹಣ್ಣುಗಳ ಗೊಂಚಲು',
  },
  wild_forest_honey: {
    en: 'Wild Forest Honey Jar (250g)',
    hi: 'जंगली शहद',
    kn: 'ಕಾಡಿನ ಜೇನುತುಪ್ಪ',
  },
  king_chillies: {
    en: 'Bhut Jolokia Chillies (Fresh)',
    hi: 'ताज़ी मिर्च',
    kn: 'ತಾಜಾ ಮೆಣಸಿನಕಾಯಿ',
  },
  rice_powder: {
    en: 'Bora Saul Pitha Rice Flour',
    hi: 'चावल का आटा',
    kn: 'ಅಕ್ಕಿ ಹಿಟ್ಟು',
  },
  joha_scented_rice: {
    en: 'Joha Scented Rice (1kg)',
    hi: 'सुगंधित चावल',
    kn: 'ಸುವಾಸನೆಯ ಅಕ್ಕಿ',
  },
  handmade_bamboo_fan: {
    en: 'Woven Cane Hand Fan',
    hi: 'हाथ का पंखा',
    kn: 'ಕೈ ಬೀಸಣಿಗೆ',
  },
  traditional_gamusa: {
    en: 'Red Patterned Cotton Gamusa',
    hi: 'पारंपरिक गमोसा',
    kn: 'ಸಾಂಪ್ರದಾಯಿಕ ಗಮೋಸಾ',
  },
  pure_turmeric: {
    en: 'Organic Turmeric Powder (200g)',
    hi: 'शुद्ध हल्दी पाउडर',
    kn: 'ಶುದ್ಧ ಅರಿಶಿನ ಪುಡಿ',
  },
  earthen_curd_pot: {
    en: 'Cream Buffalo Milk Curd Pot',
    hi: 'दही की मटकी',
    kn: 'ಮೊಸರಿನ ಮಡಕೆ',
  },
  roasted_sesame: {
    en: 'Black Sesame Seeds for Pitha',
    hi: 'काले तिल',
    kn: 'ಕಪ್ಪು ಎಳ್ಳು',
  },
};

/**
 * Format string according to language preference
 * en: "English"
 * hi: "हिन्दी (English)"
 * kn: "ಕನ್ನಡ (English)"
 */
export function formatLocalizedPair(pair: LocalizedStringPair, lang: SupportedLanguage): string {
  if (lang === 'en') {
    return pair.en;
  }
  const regional = (pair as any)[lang];
  if (regional && regional !== pair.en) {
    return `${regional} (${pair.en})`;
  }
  return pair.en;
}

