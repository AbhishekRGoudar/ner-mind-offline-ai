import { CognitiveDomain, SupportedLanguage } from '@ner-mind/core';
import { getLocalizedGreeting } from '../localization/translations.js';

export type SupportedAppLanguage = SupportedLanguage;

export interface LanguageMeta {
  code: SupportedAppLanguage;
  bcp47: string;
  englishName: string;
  nativeName: string;
  flag: string;
  greetingPrefix: string;
}

export const SUPPORTED_LANGUAGES_META: Record<SupportedAppLanguage, LanguageMeta> = {
  en: {
    code: 'en',
    bcp47: 'en-IN',
    englishName: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    greetingPrefix: 'Welcome',
  },
  hi: {
    code: 'hi',
    bcp47: 'hi-IN',
    englishName: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    greetingPrefix: 'नमस्ते',
  },
  kn: {
    code: 'kn',
    bcp47: 'kn-IN',
    englishName: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    greetingPrefix: 'ನಮಸ್ಕಾರ',
  },
  as: {
    code: 'as',
    bcp47: 'as-IN',
    englishName: 'Assamese',
    nativeName: 'অসমীয়া',
    flag: '🇮🇳',
    greetingPrefix: 'নমস্কাৰ',
  },
  bn: {
    code: 'bn',
    bcp47: 'bn-IN',
    englishName: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    greetingPrefix: 'নমস্কার',
  },
  mni: {
    code: 'mni',
    bcp47: 'mni-IN',
    englishName: 'Meitei / Manipuri',
    nativeName: 'মেইতেই',
    flag: '🇮🇳',
    greetingPrefix: 'খুরুমজরি',
  },
  brx: {
    code: 'brx',
    bcp47: 'brx-IN',
    englishName: 'Bodo',
    nativeName: 'बड़ो',
    flag: '🇮🇳',
    greetingPrefix: 'खुलुमबाय',
  },
  lus: {
    code: 'lus',
    bcp47: 'lus-IN',
    englishName: 'Mizo',
    nativeName: 'Mizo ṭawng',
    flag: '🇮🇳',
    greetingPrefix: 'Chibai',
  },
  kha: {
    code: 'kha',
    bcp47: 'kha-IN',
    englishName: 'Khasi',
    nativeName: 'Khasi',
    flag: '🇮🇳',
    greetingPrefix: 'Khublei',
  },
  grt: {
    code: 'grt',
    bcp47: 'grt-IN',
    englishName: 'Garo',
    nativeName: 'A·chik',
    flag: '🇮🇳',
    greetingPrefix: 'Salam',
  },
  trp: {
    code: 'trp',
    bcp47: 'trp-IN',
    englishName: 'Kokborok',
    nativeName: 'ককবরক',
    flag: '🇮🇳',
    greetingPrefix: 'Khulumkha',
  },
  ten: {
    code: 'ten',
    bcp47: 'ten-IN',
    englishName: 'Tenyidie',
    nativeName: 'Tenyidie',
    flag: '🇮🇳',
    greetingPrefix: 'Kekhrie',
  },
  ao: {
    code: 'ao',
    bcp47: 'ao-IN',
    englishName: 'Ao',
    nativeName: 'Ao Chungli',
    flag: '🇮🇳',
    greetingPrefix: 'Salang',
  },
  lot: {
    code: 'lot',
    bcp47: 'lot-IN',
    englishName: 'Lotha',
    nativeName: 'Kyon',
    flag: '🇮🇳',
    greetingPrefix: 'Alo',
  },
};

export class LocalizationService {
  /**
   * Greeting read aloud on the Home Dashboard
   */
  public static getGreeting(name: string, timeOfDay: string, lang: SupportedAppLanguage): string {
    return getLocalizedGreeting(name, timeOfDay, lang);
  }

  /**
   * Spoken instruction for each of the 6 cognitive domains
   */
  public static getDomainInstruction(domain: CognitiveDomain, lang: SupportedAppLanguage): string {
    switch (domain) {
      case 'memory':
        switch (lang) {
          case 'hi':
            return 'वस्तुओं को ध्यान से देखें और याद रखें। कुछ ही देर में आपको इन्हें चुनना होगा।';
          case 'kn':
            return 'ಈ ವಸ್ತುಗಳನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ನೋಡಿ ಮತ್ತು ನೆನಪಿಟ್ಟುಕೊಳ್ಳಿ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ನೀವು ಇವುಗಳನ್ನು ಗುರುತಿಸಬೇಕು.';
          case 'as':
            return 'বস্তুবোৰ ভালদৰে চাওক আৰু মনত ৰাখক। অলপ সময়ৰ পাছত আপুনি এইবোৰ বাছনি কৰিব লাগিব।';
          case 'bn':
            return 'জিনিসগুলি মনোযোগ সহকারে দেখুন এবং মনে রাখুন। কিছুক্ষণের মধ্যে আপনাকে সেগুলি বেছে নিতে হবে।';
          case 'mni':
            return 'পোৎলমশিং অসি নীংথিনা য়েংবীয়ু অমসুং নীংশিংবীয়ু। মতম খরা লোইরমদা অদোম্না খনগদবনি।';
          case 'brx':
            return 'मुवाफोरखौ मोजाङै नाय आरो गोसोआव लाखि। खनसे सम उनाव नोंथाङा बेफोरखौ सायख\'नांगोन।';
          case 'lus':
            return 'Thil awmte hi uluk takin en la, hre reng rawh. Reilote hnuah i thlang chhuak dawn nia.';
          case 'kha':
            return 'Peit bha ia kine ki mar bad kynmaw. Hadien khyndiat por phin sa jied ia ki.';
          case 'grt':
            return 'Iarangko name niba aro gisiko rakkibo. Katta ja-mano na-a iarangko seokna nanga.';
          case 'trp':
            return 'Bwslai tongnai mwngsongno khapango twrwkdi. Rwgwi tei khoroksa chongnani nangkha.';
          case 'ten':
            return 'Kekietho hako kekro dienu ngulie. Terhu zokieu nu no kekuo u chie.';
          case 'ao':
            return 'Iba osettemji kanga junga reprangang aser bilemtetang. Anogo tatsütsü nung ne shitettsüla.';
          case 'lot':
            return 'Nchuu thungi enyitsü to omhomi ntsata. Tontona no tsükona nanga.';
          case 'en':
          default:
            return 'Look carefully and remember these items. You will recall them shortly.';
        }
      case 'attention':
        switch (lang) {
          case 'hi':
            return 'स्क्रीन पर सही मेल खाने वाली वस्तु को पहचानें और स्पर्श करें।';
          case 'kn':
            return 'ಪರದೆಯ ಮೇಲೆ ಸರಿಯಾದ ಹೊಂದಾಣಿಕೆಯ ವಸ್ತುವನ್ನು ಗುರುತಿಸಿ ಸ್ಪರ್ಶಿಸಿ.';
          case 'as':
            return 'পৰ্দাত সঠিক মিলি যোৱা বস্তুটো চিনি লওক আৰু স্পৰ্শ কৰক।';
          case 'bn':
            return 'পর্দায় সঠিক মিল থাকা বস্তুটি চিহ্নিত করুন এবং স্পর্শ করুন।';
          case 'mni':
            return 'স্ক্রিনদা চুম্বা চান্নবা পোৎলম অদু খঙদোক্তুনা থাবীয়ু।';
          case 'brx':
            return 'पर्दायाव थार गोरोबनाय मुवाखौ सिनाय आरो थु।';
          case 'lus':
            return 'Screen-a thil inmil ber chu hmu la, hmet rawh.';
          case 'kha':
            return 'Buh ka kti ha u mar uba iadei bha ha ka screen.';
          case 'grt':
            return 'Screen-o kakket ong-gipa bostuko chanchibo aro dokbo.';
          case 'trp':
            return 'Screen-o kahamgono naiwi chongdi.';
          case 'ten':
            return 'Screen noko kesu kemesie pu dienu puor.';
          case 'ao':
            return 'Screen nung meputepba osetji shitetang aser kongshiyang.';
          case 'lot':
            return 'Screen lo thungi mhomtsü tsükona choro.';
          case 'en':
          default:
            return 'Find and select the correct matching object on the screen.';
        }
      case 'sequencing':
        switch (lang) {
          case 'hi':
            return 'दैनिक कार्यों के चरणों को उनके सही क्रम में व्यवस्थित करें।';
          case 'kn':
            return 'ದೈನಂದಿನ ಕಾರ್ಯಗಳ ಹಂತಗಳನ್ನು ಸರಿಯಾದ ಅನುಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಿ.';
          case 'as':
            return 'দৈনন্দিন কামৰ পদক্ষেপবোৰ সঠিক ক্ৰমত সজাওক।';
          case 'bn':
            return 'দৈনন্দিন কাজের ধাপগুলি সঠিক ক্রমে সাজান।';
          case 'mni':
            return 'নুমিৎ খুদিংগী থবকশিং অদু মখোয়গী অচুম্বা পরিংদা শেমজিনবীয়ু।';
          case 'brx':
            return 'सानफ्रोमबोनि खामानि खोलोबफोरखौ थार फारियाव साजाय।';
          case 'lus':
            return 'Nit tin hna thawh dan indawtte chu an nihna tur angin rem rawh.';
          case 'kha':
            return 'Pynbha ia ki kam ha ka jingbuh ryntih kaba dei.';
          case 'grt':
            return 'Salantinni kamrangko kakket serie donbo.';
          case 'trp':
            return 'Salbrum salbrum samungno bororai swnamdi.';
          case 'ten':
            return 'Themu kephro zhakeu pu kemesa rüna lie.';
          case 'ao':
            return 'Anogoshia maparen pyilemtemji tapetba dak mendaktsüang.';
          case 'lot':
            return 'Santhu thung nchuuro tssam tsana tsukoro.';
          case 'en':
          default:
            return 'Arrange the daily steps in the correct natural sequence.';
        }
      case 'calculation':
        switch (lang) {
          case 'hi':
            return 'बाज़ार की वस्तुओं की कुल राशि की गणना करें।';
          case 'kn':
            return 'ಮಾರುಕಟ್ಟೆಯ ವಸ್ತುಗಳ ಒಟ್ಟು ಮೊತ್ತವನ್ನು ಲೆಕ್ಕಹಾಕಿ.';
          case 'as':
            return 'বজাৰৰ বস্তুবোৰৰ মুঠ মূল্য গণনা কৰক।';
          case 'bn':
            return 'বাজারের পণ্যগুলির মোট মূল্য গণনা করুন।';
          case 'mni':
            return 'কৈথেলগী পোৎলমশিংগী অপুনবা মমল হিসাব তৌবীয়ু।';
          case 'brx':
            return 'बाजानि मुवाफोरनि गासै अनजिमा हिसाब खालाम।';
          case 'lus':
            return 'Bazar thil man zawng zawng chhut chhuak rawh.';
          case 'kha':
            return 'Khein ia ka dor baroh jong ki jingbam/mar iew.';
          case 'grt':
            return 'Bajar bostuni gimik damko hisab ka-bo.';
          case 'trp':
            return 'Bajar bostuno bwsak bororai hisab khwlaidi.';
          case 'ten':
            return 'Bazar nu mhakeu pu kemesa ketsuo.';
          case 'ao':
            return 'Bajar osettemji ajak sendaktsür saru ka yangluang.';
          case 'lot':
            return 'Bazar nchuuro tssam tsana thung hisab to.';
          case 'en':
          default:
            return 'Calculate the total price of these market items.';
        }
      case 'planning':
        switch (lang) {
          case 'hi':
            return 'सोचें कि इस दिनचर्या में सबसे पहले क्या करना चाहिए।';
          case 'kn':
            return 'ಈ ದಿನಚರಿಯಲ್ಲಿ ಮೊದಲು ಏನು ಮಾಡಬೇಕೆಂದು ಯೋಚಿಸಿ ಆಯ್ಕೆಮಾಡಿ.';
          case 'as':
            return 'ভাবি চাওক যে এই কামটোত প্ৰথমে কি কৰা উচিত।';
          case 'bn':
            return 'ভাবুন এই রুটিনে সবার আগে কী করা উচিত।';
          case 'mni':
            return 'রুটিন অসিদা অহানবদা করি তৌগদগে হায়বা খনবীদুনা য়েংবীয়ু।';
          case 'brx':
            return 'बे नेमखान्थियाव सिगांथारै मा मावनांगौ गोसोखां।';
          case 'lus':
            return 'He thiltih turah hian eng nge ti hmasak ber tur tih ngaihtuah rawh.';
          case 'kha':
            return 'Pyrkhat shuwa kaba dei ban leh nyngkong eh.';
          case 'grt':
            return 'I kam-o skanggipa maiko dakchengana nang-a chanchibo.';
          case 'trp':
            return 'A samungo swkang tamo khwlainani khapango phanidi.';
          case 'ten':
            return 'Diengu tei dze mhakeu pu tuo chie.';
          case 'ao':
            return 'Iba mapa nung mezüngbo kechi inyiktsüla bilemtetang.';
          case 'lot':
            return 'Nyanchyo tssam lo kyon toka nanga tsüto.';
          case 'en':
          default:
            return 'Think carefully about what should be performed first in this schedule.';
        }
      case 'recognition':
        switch (lang) {
          case 'hi':
            return 'अपने परिचित व्यक्ति या वस्तु को पहचानें और सही विकल्प चुनें।';
          case 'kn':
            return 'ನಿಮ್ಮ ಪರಿಚಿತ ವ್ಯಕ್ತಿ ಅಥವಾ ವಸ್ತುವನ್ನು ಗುರುತಿಸಿ ಸರಿಯಾದ ಆಯ್ಕೆ ಮಾಡಿ.';
          case 'as':
            return 'আপোনাৰ চিনাকি ব্যক্তি বা বস্তুটো চিনি লওক আৰু সঠিক বিকল্পটো বাছক।';
          case 'bn':
            return 'আপনার পরিচিত ব্যক্তি বা বস্তুটি সনাক্ত করুন এবং সঠিক উত্তরটি বেছে নিন।';
          case 'mni':
            return 'অদোমগী শকখংলবা মীওই নত্রগা পোৎলম অদু শক্তাকপীদুনা অচুম্বা খনবীয়ু।';
          case 'brx':
            return 'नोंथांनि मिथिसिनाय सुबुं एबा मुवाखौ सिनाय आरो थारखौ सायख\'।';
          case 'lus':
            return 'I mi hriat chian leh thil hriat zawn la, a dik thlang rawh.';
          case 'kha':
            return 'Ithuh ia u briew lane ka mar kaba phi tip bha bad jied ka jubab kaba dei.';
          case 'grt':
            return 'U-gipa mandeko ba bostuko ma-sie kakketgipako seokbo.';
          case 'trp':
            return 'Chini sininai borok bwtwi bostuno sinidi.';
          case 'ten':
            return 'No kethi pu themia pu kevi pu kemesa.';
          case 'ao':
            return 'Ne metetba nisung meshia oset ka shitetang aser tapet telangzüba agüjang.';
          case 'lot':
            return 'Nchuu ntsathung mhomtsü tsükona tsukoro.';
          case 'en':
          default:
            return 'Identify the familiar person or item and choose the correct answer.';
        }
      default:
        return 'Please complete the assigned activity.';
    }
  }

  /**
   * Spoken instruction for real-life shopping missions
   */
  public static getMissionInstruction(missionName: string, lang: SupportedAppLanguage): string {
    switch (lang) {
      case 'hi':
        return `वास्तविक जीवन मिशन: ${missionName}। वस्तुओं को याद करें और सूची पूर्ण करें।`;
      case 'kn':
        return `ನೈಜ ಜೀವನದ ಕಾರ್ಯ: ${missionName}. ವಸ್ತುಗಳನ್ನು ನೆನಪಿಸಿಕೊಂಡು ಪಟ್ಟಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.`;
      case 'as':
        return `বাস্তৱ জীৱন অভিযান: ${missionName}। বস্তুবোৰ মনত ৰাখক আৰু তালিকাখন সম্পূৰ্ণ কৰক।`;
      case 'bn':
        return `বাস্তব জীবনের লক্ষ্য: ${missionName}। জিনিসগুলি মনে রাখুন এবং তালিকাটি সম্পূর্ণ করুন।`;
      default:
        return `Real-life mission: ${missionName}. Remember and verify the items on your checklist.`;
    }
  }

  /**
   * Spoken encouragement and session feedback
   */
  public static getFeedback(
    type: 'correct' | 'incorrect' | 'summary',
    score: number = 0,
    total: number = 0,
    lang: SupportedAppLanguage = 'en'
  ): string {
    if (type === 'summary') {
      switch (lang) {
        case 'hi':
          return `सत्र पूर्ण हुआ! आपने ${total} में से ${score} सही किए। आप निरंतर सुधार कर रहे हैं।`;
        case 'kn':
          return `ಅಭ್ಯಾಸ ಪೂರ್ಣಗೊಂಡಿದೆ! ನೀವು ${total} ರಲ್ಲಿ ${score} ಸರಿಯಾಗಿ ಮಾಡಿದ್ದೀರಿ. ನಿಮ್ಮ ಪ್ರಗತಿ ಉತ್ತಮವಾಗಿದೆ.`;
        case 'as':
          return `সত্ৰ সমাপ্ত হ’ল! আপুনি ${total} ৰ ভিতৰত ${score} টা শুদ্ধ কৰিলে। আপুনি ধাৰাবাহিকভাৱে উন্নতি কৰিছে।`;
        case 'bn':
          return `অনুশীলন সমাপ্ত! আপনি ${total}-এর মধ্যে ${score}টি সঠিক করেছেন। আপনি ক্রমাগত উন্নতি করছেন।`;
        case 'en':
        default:
          return `Session complete! You got ${score} out of ${total} correct. You are improving consistently.`;
      }
    }

    if (type === 'correct') {
      switch (lang) {
        case 'hi':
          return 'बहुत बढ़िया! आपका उत्तर बिल्कुल सही है।';
        case 'kn':
          return 'ತುಂಬಾ ಒಳ್ಳೆಯ ಕೆಲಸ! ನಿಮ್ಮ ಉತ್ತರ ಸರಿಯಾಗಿದೆ.';
        case 'as':
          return 'বৰ ধুনীয়া! আপোনাৰ উত্তৰটো একেবাৰে সঠিক।';
        case 'bn':
          return 'চমৎকার! আপনার উত্তরটি একেবারে সঠিক।';
        case 'mni':
          return 'য়াম্না ফৈ! অদোমগী পাউখুম অসি অচুম্বনি।';
        case 'brx':
          return 'जोबोद मोजां! नोंथांनि फिननाया थार।';
        case 'lus':
          return 'A va tha tak em! I chhanna a dik e.';
        case 'kha':
          return 'Ka bha shibun! Ka jubab jong phi ka dei.';
        case 'grt':
          return 'Nang-ni aganchakania kakket ong-a! Namgipa kam.';
        case 'trp':
          return 'Bora kaham! Nini swngmung kaham wngkha.';
        case 'ten':
          return 'Kevi moruo! No kevi mhashe.';
        case 'ao':
          return 'Kanga junga! Ne telangzüba shitak lir.';
        case 'lot':
          return 'Mhomi moruo! Ntsang mhomtsü to.';
        case 'en':
        default:
          return 'Great job! Your answer is correct.';
      }
    }

    // incorrect
    switch (lang) {
      case 'hi':
        return 'अच्छा प्रयास। आइए अगला अभ्यास सावधानी से करें।';
      case 'kn':
        return 'ಉತ್ತಮ ಪ್ರಯತ್ನ. ಮುಂದಿನ ಪ್ರಶ್ನೆಯನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಮುಂದುವರಿಸೋಣ.';
      case 'as':
        return 'ভাল চেষ্টা। আহক পৰৱৰ্তী প্ৰশ্নটো সাৱধানে কৰোঁ।';
      case 'bn':
        return 'ভালো চেষ্টা। আসুন পরবর্তী অনুশীলনটি সতর্কতার সাথে করি।';
      case 'mni':
        return 'হোৎনবা ফৈ। লাকক মথংগী অসি চেৎনা তৌসি।';
      case 'brx':
        return 'मोजां नाजादों। फै जों उनावखौ मोजाङै नायनोसै।';
      case 'lus':
        return 'I ti tha tho e. A dawt leh chu uluk zawkin ti ang aw.';
      case 'kha':
        return 'Jingpyrshang kaba bha. To ngin iaid sha kaba bud da ka jingsngewthuh.';
      case 'grt':
        return 'Nama jotton ka-anina. Ja-maniko name chanchibo.';
      case 'trp':
        return 'Kaham khoroksa. Kwlangnai samungno kahamwi nai.';
      case 'ten':
        return 'Kevi ketsuo. Themu bu rülie.';
      case 'ao':
        return 'Tazüok kanga tajung. Anogoshia tapet junga inyakang.';
      case 'lot':
        return 'Mhomi jotton. Ntsang thung kyon to.';
      case 'en':
      default:
        return 'Good attempt. Let us continue with care.';
    }
  }

  /**
   * Spoken reminders announcement
   */
  public static getReminderSpeech(time: string, title: string, lang: SupportedAppLanguage): string {
    switch (lang) {
      case 'hi':
        return `${time} का स्मरणपत्र: ${title}`;
      case 'kn':
        return `${time} ಗಂಟೆಯ ನೆನಪೋಲೆ: ${title}`;
      case 'as':
        return `${time} ৰ সোঁৱৰণী: ${title}`;
      case 'bn':
        return `${time}-এর অনুস্মারক: ${title}`;
      default:
        return `Reminder for ${time}: ${title}`;
    }
  }

  /**
   * Test Voice phrase
   */
  public static getTestPhrase(lang: SupportedAppLanguage): string {
    switch (lang) {
      case 'hi':
        return 'नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।';
      case 'kn':
        return 'ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.';
      case 'as':
        return 'নমস্কাৰ, মই আপোনাৰ সহায়ৰ বাবে ইয়াত আছোঁ।';
      case 'bn':
        return 'নমস্কার, আমি আপনার সহায়তার জন্য এখানে উপস্থিত।';
      case 'mni':
        return 'খুরুমজরি, ঐহাক অদোমগী মতেং পাংনবা লৈজরি।';
      case 'brx':
        return 'खुलुमबाय, आं नोंथांनि हेफाजाबनि थाखाय बेयाव दं।';
      case 'lus':
        return 'Chibai, i tanpuitu turin ka lo awm e.';
      case 'kha':
        return 'Khublei, nga don hangne ban iarap ia phi.';
      case 'grt':
        return 'Salam, anga na-ano dakchakna dong-a.';
      case 'trp':
        return 'Khulumkha, ang nini tei yapri rina tong-o.';
      case 'ten':
        return 'Kekhrie, a no ketsuorie ba tuo.';
      case 'ao':
        return 'Salang, ni ne yaritsü atema iba nung lir.';
      case 'lot':
        return 'Alo, a nina khetsüto vana.';
      case 'en':
      default:
        return 'Hello, I am here to assist you with your cognitive exercises.';
    }
  }

  /**
   * Sample test phrases for interactive speech & mic testing in configured language
   */
  public static getMicTestPhrases(lang: SupportedAppLanguage): Array<{ text: string; label: string; meaning: string }> {
    switch (lang) {
      case 'kn':
        return [
          { text: 'ನಮಸ್ಕಾರ, ನನಗೆ ಸಹಾಯ ಬೇಕು', label: 'ನಮಸ್ಕಾರ (Hello / Help)', meaning: 'Hello, I need help' },
          { text: 'ಇಂದಿನ ಆಟಗಳನ್ನು ಪ್ರಾರಂಭಿಸಿ', label: 'ಆಟ ಪ್ರಾರಂಭಿಸಿ (Start Games)', meaning: 'Start today’s games' },
          { text: 'ನನ್ನ ನೆನಪೋಲೆಗಳನ್ನು ಓದಿ', label: 'ನೆನಪೋಲೆಗಳು (Reminders)', meaning: 'Read reminders' },
          { text: 'ಹೌದು, ಸರಿ', label: 'ಹೌದು, ಸರಿ (Yes, confirm)', meaning: 'Yes, confirm' },
        ];
      case 'hi':
        return [
          { text: 'नमस्ते, मुझे सहायता चाहिए', label: 'नमस्ते (Hello / Help)', meaning: 'Hello, I need help' },
          { text: 'आज का अभ्यास शुरू करो', label: 'अभ्यास शुरू करो (Start Games)', meaning: 'Start today’s games' },
          { text: 'मेरे स्मरणपत्र पढ़कर सुनाओ', label: 'स्मरणपत्र (Reminders)', meaning: 'Read reminders' },
          { text: 'हाँ, बिल्कुल', label: 'हाँ, बिल्कुल (Yes, confirm)', meaning: 'Yes, confirm' },
        ];
      case 'as':
        return [
          { text: 'নমস্কাৰ, মোক সহায় লাগে', label: 'নমস্কাৰ (Hello / Help)', meaning: 'Hello, I need help' },
          { text: 'আজিৰ খেল আৰম্ভ কৰক', label: 'খেল আৰম্ভ (Start Games)', meaning: 'Start today’s games' },
          { text: 'মোৰ সোঁৱৰণীবোৰ পঢ়ক', label: 'সোঁৱৰণী (Reminders)', meaning: 'Read reminders' },
          { text: 'হয়, ঠিক আছে', label: 'হয় (Yes, confirm)', meaning: 'Yes, confirm' },
        ];
      case 'bn':
        return [
          { text: 'নমস্কার, আমার সাহায্য প্রয়োজন', label: 'নমস্কার (Hello / Help)', meaning: 'Hello, I need help' },
          { text: 'আজকের খেলা শুরু করুন', label: 'খেলা শুরু (Start Games)', meaning: 'Start today’s games' },
          { text: 'আমার অনুস্মারকগুলো পড়ুন', label: 'অনুস্মারক (Reminders)', meaning: 'Read reminders' },
          { text: 'হ্যাঁ, ঠিক আছে', label: 'হ্যাঁ (Yes, confirm)', meaning: 'Yes, confirm' },
        ];
      case 'en':
      default:
        return [
          { text: 'Hello, I need assistance', label: 'Hello / Assistance', meaning: 'Hello, I need assistance' },
          { text: 'Start my cognitive games', label: 'Start Games', meaning: 'Start my cognitive games' },
          { text: 'Read my daily reminders', label: 'Read Reminders', meaning: 'Read my daily reminders' },
          { text: 'Yes, confirm that', label: 'Yes, confirm', meaning: 'Yes, confirm that' },
        ];
    }
  }

  /**
   * Spoken response when the assistant hears or receives speech input
   */
  public static getHeardConfirmation(transcript: string, lang: SupportedAppLanguage): string {
    switch (lang) {
      case 'kn':
        return `ನಾನು ಕೇಳಿಸಿಕೊಂಡೆ: "${transcript}". ನಿಮ್ಮ ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸುತ್ತಿದೆ.`;
      case 'hi':
        return `मैंने सुना: "${transcript}". आपकी आवाज़ बिल्कुल स्पष्ट सुनाई दे रही है।`;
      case 'as':
        return `মই শুনিলোঁ: "${transcript}"। আপোনাৰ মাতটো স্পষ্টকৈ শুনা গৈছে।`;
      case 'bn':
        return `আমি শুনেছি: "${transcript}"। আপনার কণ্ঠস্বর স্পষ্ট শোনা যাচ্ছে।`;
      case 'en':
      default:
        return `I heard: "${transcript}". Your voice is coming through clearly.`;
    }
  }

  /**
   * Family recognition member speech prompt
   */
  public static getFamilySpeech(name: string, relationship: string, story: string, lang: SupportedAppLanguage): string {
    switch (lang) {
      case 'hi':
        return `${name}। यह आपकी ${relationship} हैं। ${story}`;
      case 'kn':
        return `${name}. ಇವರು ನಿಮ್ಮ ${relationship}. ${story}`;
      case 'as':
        return `${name}। এখেত আপোনাৰ ${relationship}। ${story}`;
      case 'bn':
        return `${name}। ইনি আপনার ${relationship}। ${story}`;
      case 'en':
      default:
        return `${name}. Your ${relationship}. ${story}`;
    }
  }
}


