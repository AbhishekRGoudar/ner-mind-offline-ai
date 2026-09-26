import { z } from 'zod';
import { PatientProfileLanguage } from '../memory/profile.js';
import { assertNonDiagnosticCopy } from '../transfer/engine.js';

export interface ActivityNarrativeRequest {
  taskId: string;
  domain: string;
  difficulty: number;
  language: PatientProfileLanguage;
  patientName?: string;
  context: string;
  culturalHint?: string;
}

export const ActivityNarrativeResponseSchema = z.object({
  title: z.string().min(1).max(100),
  instructions: z.string().min(1).max(300),
  audioPromptText: z.string().min(1).max(250),
  encouragement: z.string().max(120),
});

export type ActivityNarrativeResponse = z.infer<typeof ActivityNarrativeResponseSchema>;

export interface LlmAdapter {
  generateStructuredContent<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt?: string
  ): Promise<T>;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionAdapter {
  isAvailable(): boolean;
  startListening(language: PatientProfileLanguage, onResult: (res: SpeechRecognitionResult) => void): Promise<void>;
  stopListening(): Promise<void>;
}

export interface SpeechSynthesisAdapter {
  isAvailable(): boolean;
  speak(text: string, language: PatientProfileLanguage, rate?: number): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Curated offline deterministic fallback templates for guaranteed offline capability
 * even if local llama.cpp / whisper.cpp models are not installed.
 */
export const DETERMINISTIC_FALLBACK_TEMPLATES: Record<
  PatientProfileLanguage,
  Record<string, ActivityNarrativeResponse>
> = {
  en: {
    market_shopping_recall: {
      title: "Market Shopping List",
      instructions: "Look at the items to buy at the market. When ready, touch the items you remember.",
      audioPromptText: "Please look at these items carefully. Touch the items you remember when asked.",
      encouragement: "Take all the time you need.",
    },
    morning_tea_sequence: {
      title: "Making Assam Tea",
      instructions: "Arrange the steps in the correct order to prepare morning tea.",
      audioPromptText: "Put the tea preparation steps in the right order.",
      encouragement: "Very good effort.",
    },
    craft_pattern_matching: {
      title: "Traditional Craft Pattern",
      instructions: "Find and touch the matching traditional bamboo weave patterns.",
      audioPromptText: "Touch the matching weaving pattern on the screen.",
      encouragement: "Wonderful focus.",
    },
  },
  as: {
    market_shopping_recall: {
      title: "বজাৰৰ সামগ্ৰীৰ তালিকা",
      instructions: "বজাৰৰ সামগ্ৰীসমূহ মনত ৰাখক। পাছত মনত থকা সামগ্ৰীসমূহত স্পৰ্শ কৰক।",
      audioPromptText: "বজাৰৰ সামগ্ৰীখিনি ভালকৈ চাওক আৰু মনত ৰাখক।",
      encouragement: "আপোনাৰ সময় লওক, কোনো খৰখেদা নাই।",
    },
    morning_tea_sequence: {
      title: "ৰাতিপুৱাৰ অসমীয়া চাহ তৈয়াৰ",
      instructions: "চাহ তৈয়াৰ কৰাৰ সঠিক নিয়ম অনুসৰি ক্ৰমত সজাওক।",
      audioPromptText: "চাহ বনোৱাৰ ক্ৰমবোৰ ঠিককৈ সজাওক।",
      encouragement: "বৰ সুন্দৰ প্ৰয়াস।",
    },
    craft_pattern_matching: {
      title: "বাঁহ-বেতৰ শিল্পৰ আৰ্হি",
      instructions: "মিল থকা বাঁহৰ সজ্জা বাছি উলিয়াওক।",
      audioPromptText: "মিল থকা আৰ্হিটোত স্পৰ্শ কৰক।",
      encouragement: "সুন্দৰ মনোযোগ।",
    },
  },
  bn: {
    market_shopping_recall: {
      title: "বাজারের ফর্দ",
      instructions: "বাজারের জিনিসগুলো মনে রাখুন। পরে মনে থাকা জিনিসে স্পর্শ করুন।",
      audioPromptText: "জিনিসগুলো মন দিয়ে দেখুন এবং মনে রাখুন।",
      encouragement: "ধীরে সুস্থে আপনার সময় নিন।",
    },
    morning_tea_sequence: {
      title: "সকালের চা তৈরি",
      instructions: "চা বানানোর সঠিক ধাপগুলো ক্রমানুসারে সাজান।",
      audioPromptText: "চা বানানোর ধাপগুলো পরপর সাজান।",
      encouragement: "খুব ভালো চেষ্টা।",
    },
    craft_pattern_matching: {
      title: "ঐতিহ্যবাহী তাঁত শিল্প",
      instructions: "একই রকম দেখতে নকশাটি খুঁজে স্পর্শ করুন।",
      audioPromptText: "সঠিক নকশাটিতে আঙুল দিয়ে স্পর্শ করুন।",
      encouragement: "চমৎকার একাগ্রতা।",
    },
  },
  mni: {
    market_shopping_recall: {
      title: "Keithel Pot-chei",
      instructions: "Keithelgi pot-cheising khangjinbiyu. Masigi matungda pot aduda thambiyu.",
      audioPromptText: "Pot-cheising adu kupna yengbiyu.",
      encouragement: "Nungcna matam loubiyu.",
    },
    morning_tea_sequence: {
      title: "Aroiba Cha Shemba",
      instructions: "Cha shembagi mathang-manao chumna thambiyu.",
      audioPromptText: "Cha shembagi lambising adu chumna thambiyu.",
      encouragement: "Yamna fajei.",
    },
    craft_pattern_matching: {
      title: "Yumgi Shak-tam",
      instructions: "Maanba fige shaktam aduda thambiyu.",
      audioPromptText: "Maanba shaktamda thambiyu.",
      encouragement: "Nungcna toubiyu.",
    },
  },
  kha: {
    market_shopping_recall: {
      title: "Ki Jingthied ha Iew",
      instructions: "Kynmaw ia kine ki mar iew. Shu pyndep hadien haba la bthah.",
      audioPromptText: "Peit bha ia kine ki jingthied.",
      encouragement: "Shim por ban leh.",
    },
    morning_tea_sequence: {
      title: "Sheh Sha Step",
      instructions: "Pynbeit katkum ka rukom sheh sha.",
      audioPromptText: "Pynbeit ia ki lynti sheh sha.",
      encouragement: "Bha shibun.",
    },
    craft_pattern_matching: {
      title: "Ki Dur Shna Tin/Thri",
      instructions: "Bishar ia ki dur ba iasyriem.",
      audioPromptText: "Kti ia ka dur ba iadei.",
      encouragement: "Bha palat.",
    },
  },
  brx: {
    market_shopping_recall: {
      title: "हाथाइनि बेसादफोर",
      instructions: "हाथाइनि बेसादफोरखौ गोसोआव लाखि। उनाव गोसो थानायखौ थु।",
      audioPromptText: "बेसादफोरखौ मोजाङै नाय आरो गोसोआव लाखि।",
      encouragement: "नेवसिना ला, खायदा खालाम।",
    },
    morning_tea_sequence: {
      title: "फुंनि साहा बानायनाय",
      instructions: "साहा बानायनायनि फारिलाइखौ थिकै साजाय।",
      audioPromptText: "साहा बानायनाय फारिफोरखौ साजाय।",
      encouragement: "जोबोर मोजां।",
    },
    craft_pattern_matching: {
      title: "दाबनाय बादि महर",
      instructions: "महर मोन्नाय बादि खालाम।",
      audioPromptText: "महरखौ थु।",
      encouragement: "मोजां गोसो होनाय।",
    },
  },
  hi: {
    market_shopping_recall: {
      title: "बाज़ार की ख़रीदारी सूची",
      instructions: "बाज़ार की इन चीज़ों को याद रखें। बाद में याद रहने वाली चीज़ों को छुएं।",
      audioPromptText: "कृपया इन चीज़ों को ध्यान से देखें और याद रखें।",
      encouragement: "अपना पूरा समय लें, कोई जल्दबाज़ी नहीं है।",
    },
    morning_tea_sequence: {
      title: "सुबह की चाय बनाना",
      instructions: "चाय बनाने के सही चरणों को सही क्रम में व्यवस्थित करें।",
      audioPromptText: "चाय बनाने के चरणों को क्रम से लगाएँ।",
      encouragement: "बहुत अच्छा प्रयास।",
    },
    craft_pattern_matching: {
      title: "पारंपरिक हस्तशिल्प नमूना",
      instructions: "मिलते-जुलते पारंपरिक बुनाई पैटर्न को खोजकर छुएं।",
      audioPromptText: "समान दिखने वाले पैटर्न को स्क्रीन पर छुएं।",
      encouragement: "शानदार एकाग्रता।",
    },
  },
  kn: {
    market_shopping_recall: {
      title: "ಮಾರುಕಟ್ಟೆ ಸಾಮಗ್ರಿಗಳ ಪಟ್ಟಿ",
      instructions: "ಮಾರುಕಟ್ಟೆಯ ವಸ್ತುಗಳನ್ನು ನೆನಪಿಟ್ಟುಕೊಳ್ಳಿ. ನಂತರ ನೆನಪಿರುವ ವಸ್ತುಗಳನ್ನು ಸ್ಪರ್ಶಿಸಿ.",
      audioPromptText: "ದಯವಿಟ್ಟು ಈ ವಸ್ತುಗಳನ್ನು ಗಮನವಿಟ್ಟು ನೋಡಿ ಮತ್ತು ನೆನಪಿಟ್ಟುಕೊಳ್ಳಿ.",
      encouragement: "ನಿಧಾನವಾಗಿ ನಿಮ್ಮ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಿ.",
    },
    morning_tea_sequence: {
      title: "ಬೆಳಗಿನ ಚಹಾ ತಯಾರಿಕೆ",
      instructions: "ಚಹಾ ತಯಾರಿಸುವ ಹಂತಗಳನ್ನು ಸರಿಯಾದ ಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಿ.",
      audioPromptText: "ಚಹಾ ತಯಾರಿಕೆಯ ಕ್ರಮಗಳನ್ನು ಸರಿಯಾಗಿ ಇರಿಸಿ.",
      encouragement: "ತುಂಬಾ ಉತ್ತಮ ಪ್ರಯತ್ನ.",
    },
    craft_pattern_matching: {
      title: "ಸಾಂಪ್ರದಾಯಿಕ ಕರಕುಶಲ ಮಾದರಿ",
      instructions: "ಹೊಂದಾಣಿಕೆಯಾಗುವ ಸಾಂಪ್ರದಾಯಿಕ ನೇಯ್ಗೆಯ ವಿನ್ಯಾಸವನ್ನು ಗುರುತಿಸಿ.",
      audioPromptText: "ಹೊಂದಾಣಿಕೆಯಾಗುವ ಮಾದರಿಯನ್ನು ಪರದೆಯ ಮೇಲೆ ಸ್ಪರ್ಶಿಸಿ.",
      encouragement: "ಅದ್ಭುತ ಏಕಾಗ್ರತೆ.",
    },
  },
  lus: {
    market_shopping_recall: {
      title: "Bazar Thil Lei Tur",
      instructions: "Bazar thil lei turte hi hrereng rawh. I inpeih hunah i hriatrengte chu tawk rawh.",
      audioPromptText: "Thil lei turte hi uluk takin en la, hrereng rawh.",
      encouragement: "Hmanhmawh lovin i hun duhzat hmang rawh.",
    },
    morning_tea_sequence: {
      title: "Zing Thingpui Siam Dan",
      instructions: "Thingpui siam dan indawt fel takin rem rawh.",
      audioPromptText: "Thingpui siam dan indawt te hi rem rawh.",
      encouragement: "Tihṭhat tumna ropui tak a ni.",
    },
    craft_pattern_matching: {
      title: "Mizo Puan Tah Zia",
      instructions: "Thil inang chiah zawn chhuah tur a ni.",
      audioPromptText: "Zia inang tawk rawh le.",
      encouragement: "I rilru i pe ṭha hle mai.",
    },
  },
  grt: {
    market_shopping_recall: {
      title: "Bajar Bastu List",
      instructions: "Bajar basturangko gisik ra·bo. Ja·mano gisik donggiparangko nang·tingbo.",
      audioPromptText: "Iarangko name nina gisik ra·bo.",
      encouragement: "Nang·ni somoirangko ra·e ka·bo.",
    },
    morning_tea_sequence: {
      title: "Cha Tarani Step",
      instructions: "Cha tarani niamko kakket dake sulsul donbo.",
      audioPromptText: "Cha tarani steprangko sulsul donbo.",
      encouragement: "Namgipa jotton ka·ani.",
    },
    craft_pattern_matching: {
      title: "Doka-Damani Noksa",
      instructions: "Apsan noksarangko sandina nang·tingbo.",
      audioPromptText: "Apsangipa noksako nang·tingbo.",
      encouragement: "Name gisik on·ani.",
    },
  },
  trp: {
    market_shopping_recall: {
      title: "Hatini Manwi Phwrwng",
      instructions: "Hatini manwirokno gosono lakhibi. Ulo goso tongnaiko tisabi.",
      audioPromptText: "Kahambano nawi gosono lakhibi.",
      encouragement: "Bosiya bo jora lana rwgwi khlaidi.",
    },
    morning_tea_sequence: {
      title: "Phungni Cha Songma",
      instructions: "Cha songmani laijamno thik khlaino khorok khorok tonidi.",
      audioPromptText: "Cha songmani steprokno sulsul tonidi.",
      encouragement: "Kahambano joton khlaikha.",
    },
    craft_pattern_matching: {
      title: "Rignai Noksa Khuk",
      instructions: "Kaphang noksa nawi tisadi.",
      audioPromptText: "Kaphang noksa nawi touch khlaidi.",
      encouragement: "Goso kahambano kotor tonikha.",
    },
  },
  ten: {
    market_shopping_recall: {
      title: "Kehou Geinu Kemehu",
      instructions: "Kehou nunu kemehu renu u se kemenu la di kemehuko thalie.",
      audioPromptText: "Kemehu renu kemenu la thalie.",
      encouragement: "N ki mvi kemenu ba.",
    },
    morning_tea_sequence: {
      title: "Dzükou Dzü Kechü",
      instructions: "Dzükou dzü kechü kemenu la pu thalie.",
      audioPromptText: "Dzü kechü kemenu la thalie.",
      encouragement: "Mvi kemenu keroie.",
    },
    craft_pattern_matching: {
      title: "Tenyimi Kinyi Thalie",
      instructions: "Themia kinyi thalieko pu thalie.",
      audioPromptText: "Kinyi thalieko n se touch thalie.",
      encouragement: "Ketho keroie.",
    },
  },
  ao: {
    market_shopping_recall: {
      title: "Yimtsüng Rongsen",
      instructions: "Yimtsüng rongsen nung bilitsü atema bilemtetang. Idangji touch asüang.",
      audioPromptText: "Item rongsen kanga junga reprangang.",
      encouragement: "Iba ya mepet mesüi inyakang.",
    },
    morning_tea_sequence: {
      title: "Chiyungtsü Yanglutsü",
      instructions: "Chiyungtsü yanglutsü dak sendakba nung sulsul lemtetang.",
      audioPromptText: "Step temji sulsul ayang.",
      encouragement: "Kanga junga inyaker.",
    },
    craft_pattern_matching: {
      title: "Ao Sobaliba Noksa",
      instructions: "Apsan noksa bushiteptetang.",
      audioPromptText: "Noksa kasaji touch asüang.",
      encouragement: "Shisatsü kanga nungdakba.",
    },
  },
  lot: {
    market_shopping_recall: {
      title: "Yantsü Okho List",
      instructions: "Yantsü okhung nung mmho tona khiato vani. Elani touch to.",
      audioPromptText: "Okho jia mmho tona khiato.",
      encouragement: "Etsa tssotssori tona vani.",
    },
    morning_tea_sequence: {
      title: "Chiyungtsü Chyu",
      instructions: "Chiyungtsü yanglu tona step tona li vani.",
      audioPromptText: "Chiyungtsü step ji mmho tona li vani.",
      encouragement: "Kyakya tona mmho vani.",
    },
    craft_pattern_matching: {
      title: "Lotha Yontso Pattern",
      instructions: "Opyung nung kyakya tona vani.",
      audioPromptText: "Pattern kasaji touch to.",
      encouragement: "Mmho tona li vani.",
    },
  },
};

/**
 * Safely generates activity narrative through local LLM with instant fallback to deterministic templates.
 * Enforces Zod schema parsing and the non-diagnostic safety invariant.
 */
export async function getActivityNarrative(
  request: ActivityNarrativeRequest,
  llmAdapter?: LlmAdapter
): Promise<ActivityNarrativeResponse> {
  const langFallback = DETERMINISTIC_FALLBACK_TEMPLATES[request.language] ?? DETERMINISTIC_FALLBACK_TEMPLATES.en;
  const template = langFallback[request.taskId] ?? DETERMINISTIC_FALLBACK_TEMPLATES.en[request.taskId] ?? {
    title: "Daily Cognitive Exercise",
    instructions: "Look closely and interact with the items on screen at your comfortable pace.",
    audioPromptText: "Please follow the activity instructions on the screen.",
    encouragement: "Take your time.",
  };

  if (!llmAdapter) {
    return template;
  }

  try {
    const prompt = `
Create a gentle, clear, non-clinical activity prompt in ${request.language} for an elderly individual in the North Eastern Region of India.
Activity: ${request.taskId} (${request.domain} domain, difficulty ${request.difficulty} of 5).
Context: ${request.context}.
Participant: ${request.patientName ?? 'friend'}.
Ensure strictly non-diagnostic, respectful, warm wording.
Return JSON with fields: title, instructions, audioPromptText, encouragement.`;

    const systemPrompt = `You are an elderly care activity assistant in Northeast India. NEVER use clinical, medical, or diagnostic words (e.g. dementia, cure, disease, cognitive decline). Keep sentences short and clear.`;

    const generated = await llmAdapter.generateStructuredContent(
      prompt,
      ActivityNarrativeResponseSchema,
      systemPrompt
    );

    // Enforce safety constraints
    assertNonDiagnosticCopy(generated.instructions);
    assertNonDiagnosticCopy(generated.audioPromptText);

    return generated;
  } catch {
    // If LLM fails, times out, throws safety exception, or produces malformed JSON:
    // Safely return curated deterministic template
    return template;
  }
}
