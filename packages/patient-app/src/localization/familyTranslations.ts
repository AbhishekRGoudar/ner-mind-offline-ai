import { SupportedLanguage } from '@ner-mind/core';

export interface LocalizedFamilyRelationship {
  en: string;
  hi: string;
  kn: string;
  [key: string]: string;
}

export const FAMILY_RELATIONSHIPS: Record<string, LocalizedFamilyRelationship> = {
  Grandmother: {
    en: 'Grandmother',
    hi: 'दादी (Grandmother)',
    kn: 'ಅಜ್ಜಿ (Grandmother)',
    as: 'আইতা (Grandmother)',
    bn: 'ঠাকুমা (Grandmother)',
    mni: 'ইবোম্বী (Grandmother)',
    brx: 'आबो (Grandmother)',
    lus: 'Pi (Grandmother)',
    kha: 'Meirad (Grandmother)',
    grt: 'Ambi (Grandmother)',
    trp: 'Aji (Grandmother)',
    ten: 'Atsa (Grandmother)',
    ao: 'Tetsü (Grandmother)',
    lot: 'Otsü (Grandmother)',
  },
  Grandfather: {
    en: 'Grandfather',
    hi: 'दादा (Grandfather)',
    kn: 'ತಾತ (Grandfather)',
    as: 'ককা (Grandfather)',
    bn: 'দাদু (Grandfather)',
    mni: 'ইবুংহো (Grandfather)',
    brx: 'आबौ (Grandfather)',
    lus: 'Pu (Grandfather)',
    kha: 'Kpa-rad (Grandfather)',
    grt: 'Achu (Grandfather)',
    trp: 'Achu (Grandfather)',
    ten: 'Apu (Grandfather)',
    ao: 'Tepa (Grandfather)',
    lot: 'Opa (Grandfather)',
  },
  Cousin: {
    en: 'Cousin',
    hi: 'चचेरा/ममेरा भाई/बहन (Cousin)',
    kn: 'ಸೋದರ ಸಂಬಂಧಿ (Cousin)',
    as: 'সম্পৰ্কীয় ভাই/ভনী (Cousin)',
    bn: 'তুতো ভাই/বোন (Cousin)',
    mni: 'মবুং/মচানুপা (Cousin)',
    brx: 'आयै-आदा (Cousin)',
    lus: 'Puh/Ni fa (Cousin)',
    kha: 'Para-ar-kmie (Cousin)',
    grt: 'Bikro (Cousin)',
    trp: 'Twi-bwtwi (Cousin)',
    ten: 'Keneipfhe (Cousin)',
    ao: 'Tenemjemer (Cousin)',
    lot: 'Mhetsa (Cousin)',
  },
  Aunt: {
    en: 'Aunt',
    hi: 'चाची/मौसी (Aunt)',
    kn: 'ಅತ್ತೆ/ಚಿಕ್ಕಮ್ಮ (Aunt)',
    as: 'পেহী/মাহী (Aunt)',
    bn: 'কাকিমা/মাসি (Aunt)',
    mni: 'ইনে (Aunt)',
    brx: 'मादै (Aunt)',
    lus: 'Ni/Pute nupui (Aunt)',
    kha: 'Knia (Aunt)',
    grt: 'Mani (Aunt)',
    trp: 'Sanwi (Aunt)',
    ten: 'Pfu (Aunt)',
    ao: 'Otsür (Aunt)',
    lot: 'Eni (Aunt)',
  },
  Uncle: {
    en: 'Uncle',
    hi: 'चाचा/मामा (Uncle)',
    kn: 'ಮಾವ/ಚಿಕ್ಕಪ್ಪ (Uncle)',
    as: 'খুড়া/মহা (Uncle)',
    bn: 'কাকু/মামা (Uncle)',
    mni: 'ইকুপা (Uncle)',
    brx: 'मामा (Uncle)',
    lus: 'Pute (Uncle)',
    kha: 'Kñi (Uncle)',
    grt: 'Mama (Uncle)',
    trp: 'Kakutui (Uncle)',
    ten: 'Nuopu (Uncle)',
    ao: 'Tepatsü (Uncle)',
    lot: 'Omo (Uncle)',
  },
  Daughter: {
    en: 'Daughter',
    hi: 'बेटी (Daughter)',
    kn: 'ಮಗಳು (Daughter)',
    as: 'জীয়াৰী (Daughter)',
    bn: 'মেয়ে (Daughter)',
    mni: 'মচানুপী (Daughter)',
    brx: 'फिसौजो (Daughter)',
    lus: 'Fanu (Daughter)',
    kha: 'Khun-kynthei (Daughter)',
    grt: 'Demechik (Daughter)',
    trp: 'Bwsala-bwrwi (Daughter)',
    ten: 'Li-nuo (Daughter)',
    ao: 'Jabaso (Daughter)',
    lot: 'Olaro (Daughter)',
  },
  Son: {
    en: 'Son',
    hi: 'बेटा (Son)',
    kn: 'ಮಗ (Son)',
    as: 'পুত্ৰ (Son)',
    bn: 'ছেলে (Son)',
    mni: 'মচানুপা (Son)',
    brx: 'फिसौह्ला (Son)',
    lus: 'Fapa (Son)',
    kha: 'Khun-shynrang (Son)',
    grt: 'Depante (Son)',
    trp: 'Bwsala (Son)',
    ten: 'U-nuo (Son)',
    ao: 'Chir (Son)',
    lot: 'Ondro (Son)',
  },
  Mother: {
    en: 'Mother',
    hi: 'माता (Mother)',
    kn: 'ತಾಯಿ (Mother)',
    as: 'মা (Mother)',
    bn: 'মা (Mother)',
    mni: 'ইমা (Mother)',
    brx: 'आयै (Mother)',
    lus: 'Nu (Mother)',
    kha: 'Kmie (Mother)',
    grt: 'Ama (Mother)',
    trp: 'Ama (Mother)',
    ten: 'Aza (Mother)',
    ao: 'Ozü (Mother)',
    lot: 'Oyo (Mother)',
  },
  Father: {
    en: 'Father',
    hi: 'पिता (Father)',
    kn: 'ತಂದೆ (Father)',
    as: 'দেউতা (Father)',
    bn: 'বাবা (Father)',
    mni: 'ইপা (Father)',
    brx: 'आफा (Father)',
    lus: 'Pa (Father)',
    kha: 'Kpa (Father)',
    grt: 'Apa (Father)',
    trp: 'Apha (Father)',
    ten: 'Apuo (Father)',
    ao: 'Oba (Father)',
    lot: 'Opa (Father)',
  },
  Brother: {
    en: 'Brother',
    hi: 'भाई (Brother)',
    kn: 'ಸೋದರ (Brother)',
    as: 'ভাই (Brother)',
    bn: 'ভাই (Brother)',
    mni: 'ইনাওনুপা (Brother)',
    brx: 'आदा (Brother)',
    lus: 'Unaupa (Brother)',
    kha: 'Hynmen/Para-shynrang (Brother)',
    grt: 'Ada (Brother)',
    trp: 'Twi-bwsala (Brother)',
    ten: 'Dze (Brother)',
    ao: 'Tanuba (Brother)',
    lot: 'Ta-o (Brother)',
  },
  Sister: {
    en: 'Sister',
    hi: 'बहन (Sister)',
    kn: 'ಸಹೋದರಿ (Sister)',
    as: 'ভনী (Sister)',
    bn: 'বোন (Sister)',
    mni: 'ইচেল (Sister)',
    brx: 'आगै (Sister)',
    lus: 'Unaunu (Sister)',
    kha: 'Hynmen/Para-kynthei (Sister)',
    grt: 'Abi (Sister)',
    trp: 'Twi-bwrwi (Sister)',
    ten: 'Pfe (Sister)',
    ao: 'Tanutsür (Sister)',
    lot: 'Elo (Sister)',
  },
};

export interface DefaultMemberLocalization {
  displayName: string;
  transliteration?: Partial<Record<SupportedLanguage, string>>;
  description: Partial<Record<SupportedLanguage, string>> & { en: string };
}

export const DEFAULT_MEMBER_LOCALIZATIONS: Record<string, DefaultMemberLocalization> = {
  fam_1: {
    displayName: 'Ananya Sharma',
    transliteration: {
      en: 'Ananya Sharma',
      hi: 'अनन्या शर्मा',
      kn: 'ಅನನ್ಯಾ ಶರ್ಮಾ',
      as: 'অনন্যা শৰ্মা',
      bn: 'অনন্যা শর্মা',
      mni: 'অনন্যা শর্মা',
      brx: 'अनन्या शर्मा',
      lus: 'Ananya Sharma',
      kha: 'Ananya Sharma',
      grt: 'Ananya Sharma',
      trp: 'Ananya Sharma',
      ten: 'Ananya Sharma',
      ao: 'Ananya Sharma',
      lot: 'Ananya Sharma',
    },
    description: {
      en: 'Grandmother Ananya lives in Jorhat and loves making traditional pitha during Bihu celebrations.',
      hi: 'दादी अनन्या जोरहाट में रहती हैं और पारंपरिक बिहू उत्सव के दौरान पीठा बनाना पसंद करती हैं।',
      kn: 'ಅಜ್ಜಿ ಅನನ್ಯಾ ಜೋರ್ಹಾಟ್ನಲ್ಲಿ ವಾಸಿಸುತ್ತಾರೆ ಮತ್ತು ಬಿಹು ಹಬ್ಬದ ಸಂದರ್ಭದಲ್ಲಿ ಸಾಂಪ್ರದಾಯಿಕ ಪಿಠಾ ತಯಾರಿಸಲು ಇಷ್ಟಪಡುತ್ತಾರೆ.',
      as: 'আইতা অনন্যা যোৰহাটত থাকে আৰু বিহুৰ সময়ত পৰম্পৰাগত পিঠা বনাবলৈ ভাল পায়।',
      bn: 'ঠাকুমা অনন্যা জোরহাটে থাকেন এবং বিহু উৎসবে ঐতিহ্যবাহী পিঠে তৈরি করতে পছন্দ করেন।',
      mni: 'ইবোম্বী অনন্যা জোরহাত্তা লৈ অমসুং বিহুদা থৌরমদা পিথা শাবা নুংঙাইজেই।',
      brx: 'आबो अनन्याया जोरहाटाव थायो आरो बिहु समाव पिथा संनो मोजां मोनो।',
      lus: 'Pi Ananya chu Jorhat-ah a awm a, Bihu kut laia pitha siam nuam a ti.',
      kha: 'Meirad Ananya ka shong ha Jorhat bad ka sngewbha ban thaw pitha ha ka Bihu.',
      grt: 'Ambi Ananya Jorhat-o donga aro Bihu-o pitha dakanako namnika.',
      trp: 'Aji Ananya Jorhat-o tong-o tei Bihu-o pitha tangwi tong-o.',
      ten: 'Atsa Ananya Jorhat nu ba mu Bihu keba pitha dienu kevi moruo.',
      ao: 'Tetsü Ananya Jorhat nung alir aser Bihu mapang pitha yanglutsü sapur.',
      lot: 'Otsü Ananya Jorhat lo vantso to Bihu elhyo pitha tona mhomi.',
    },
  },
  fam_2: {
    displayName: 'Deepak Borah',
    transliteration: {
      en: 'Deepak Borah',
      hi: 'दीपक बोरा',
      kn: 'ದೀಪಕ್ ಬೋರಾ',
      as: 'দীপক বৰা',
      bn: 'দীপক বোরা',
      mni: 'দীপক বোরা',
      brx: 'दीपक बोरा',
      lus: 'Deepak Borah',
      kha: 'Deepak Borah',
      grt: 'Deepak Borah',
      trp: 'Deepak Borah',
      ten: 'Deepak Borah',
      ao: 'Deepak Borah',
      lot: 'Deepak Borah',
    },
    description: {
      en: 'Deepak is your nephew who visits every Sunday to help with garden plants and tea.',
      hi: 'दीपक आपका भतीजा/भाई है जो हर रविवार को बगीचे के पौधों और चाय में मदद करने आता है।',
      kn: 'ದೀಪಕ್ ನಿಮ್ಮ ಸೋದರಳಿಯ/ಸಂಬಂಧಿ, ಅವರು ಪ್ರತಿ ಭಾನುವಾರ ತೋಟದ ಸಸಿಗಳು ಮತ್ತು ಚಹಾ ತಯಾರಿಕೆಗೆ ಸಹಾಯ ಮಾಡಲು ಬರುತ್ತಾರೆ.',
      as: 'দীপক আপোনাৰ সম্পৰ্কীয় ভাই যি প্ৰতি দেওবাৰে বাগিচাৰ কাম আৰু চাহৰ বাবে সহায় কৰিবলৈ আহে।',
      bn: 'দীপক আপনার ভাইপো যে প্রতি রবিবার বাগানের গাছপালা ও চায়ে সাহায্য করতে আসে।',
      mni: 'দীপক অদোমগী মচানুপানি অমসুং শগোলসেন খুদিং বাগিচাগী থবক্তা মতেং পাংবা লাকই।',
      brx: 'दीपक नोंथांनि आदा/फिसालानि रोखोम, जाय सानफ्रोमबो रबिबाराव बागाननि हाबिलायाव हेफाजाब होनो फैयो।',
      lus: 'Deepak chu i vahpa a ni a, Chawlhni tin huan leh thingpui lum pui turin a rawn kal ziah.',
      kha: 'Deepak u dei u pyrsa uba wan man ka Sngi U Blei ban iarap ha ka kper bad ka sha.',
      grt: 'Deepak ba-ani nephew ong-a aro Robibar kanti bageecha-o cha rona re-ba-a.',
      trp: 'Deepak nini bwsala khoroksa, Robibar khorok khorok bagan-o yaphang rina faio.',
      ten: 'Deepak aza bu kemesa voruo mezhiezhi ketsa keu bu bu voruo.',
      ao: 'Deepak ne chir ka, Hodbarnü shia aluyim aser cha nung yaritsü arur.',
      lot: 'Deepak nina ondro to Dimbar tona tsukro oyi to elhyo cho.',
    },
  },
  fam_3: {
    displayName: 'Minoti Devi',
    transliteration: {
      en: 'Minoti Devi',
      hi: 'मिनोती देवी',
      kn: 'ಮಿನೋತಿ ದೇವಿ',
      as: 'মিনোতী দেৱী',
      bn: 'মিনতি দেবী',
      mni: 'মিনোতী দেবী',
      brx: 'मिनोती देबी',
      lus: 'Minoti Devi',
      kha: 'Minoti Devi',
      grt: 'Minoti Devi',
      trp: 'Minoti Devi',
      ten: 'Minoti Devi',
      ao: 'Minoti Devi',
      lot: 'Minoti Devi',
    },
    description: {
      en: 'Aunt Minoti enjoys listening to devotional songs and weaving traditional patterns on her handloom.',
      hi: 'चाची मिनोती भक्ति गीत सुनना और अपने हथकरघे पर पारंपरिक पैटर्न बुनना पसंद करती हैं।',
      kn: 'ಅತ್ತೆ ಮಿನೋತಿ ಭಕ್ತಿಗೀತೆಗಳನ್ನು ಕೇಳಲು ಮತ್ತು ತಮ್ಮ ಕೈಮಗ್ಗದಲ್ಲಿ ಸಾಂಪ್ರದಾಯಿಕ ವಿನ್ಯಾಸಗಳನ್ನು ನೇಯಲು ಇಷ್ಟಪಡುತ್ತಾರೆ.',
      as: 'মাহী মিনোতীয়ে ভক্তিগীত শুনিবলৈ আৰু তাঁতশালত পৰম্পৰাগত ফুল বাছিবলৈ ভাল পায়।',
      bn: 'কাকিমা মিনতি ভক্তিগীতি শুনতে ও তাঁতে ঐতিহ্যবাহী নকশা বুনতে ভালোবাসেন।',
      mni: 'ইনে মিনোতীনা ঈশ্বরগী ঈশৈ তাবা অমসুং খোংখামদা ফি শাবা নুংঙাইজেই।',
      brx: 'मादै मिनोतीया इसोरनि रोजाबनाय खोनसंनो आरो थाखोयाव गावनि आरनाइ दानायनो मोजां मोनो।',
      lus: 'Ni Minoti chuan hla sak ngaihthlak leh puan tah a ngaina hle.',
      kha: 'Knia Minoti ka sngewbha ban sngap jingrwai niam bad ban thain jain.',
      grt: 'Mani Minoti bi-sarangni git knana aro kilding dokanako namnika.',
      trp: 'Sanwi Minoti rwchapmung khnana tei rignai thana bwrwi boro tangwi tong-o.',
      ten: 'Pfu Minoti nuyi kenyu kenie ro tha keneinu zhü moruo.',
      ao: 'Otsür Minoti Tsüngrem ken angatsü aser sü ayimtsü kanga sapur.',
      lot: 'Eni Minoti Potso ken nangtsü to riga tona mhomi.',
    },
  },
  fam_4: {
    displayName: 'Priya Sharma',
    transliteration: {
      en: 'Priya Sharma',
      hi: 'प्रिया शर्मा',
      kn: 'ಪ್ರಿಯಾ ಶರ್ಮಾ',
      as: 'প্ৰিয়া শৰ্মা',
      bn: 'প্রিয়া শর্মা',
      mni: 'প্রিয়া শর্মা',
      brx: 'प्रिया शर्मा',
      lus: 'Priya Sharma',
      kha: 'Priya Sharma',
      grt: 'Priya Sharma',
      trp: 'Priya Sharma',
      ten: 'Priya Sharma',
      ao: 'Priya Sharma',
      lot: 'Priya Sharma',
    },
    description: {
      en: 'Priya is your daughter who calls every evening at 7:00 PM and brings fresh garden tea.',
      hi: 'प्रिया आपकी बेटी है जो हर शाम 7:00 बजे फोन करती है और ताज़ी बगीचे की चाय लाती है।',
      kn: 'ಪ್ರಿಯಾ ನಿಮ್ಮ ಮಗಳು, ಅವರು ಪ್ರತಿದಿನ ಸಂಜೆ 7:00 ಗಂಟೆಗೆ ಕರೆ ಮಾಡುತ್ತಾರೆ ಮತ್ತು ತಾಜಾ ಚಹಾವನ್ನು ತರುತ್ತಾರೆ.',
      as: 'প্ৰিয়া আপোনাৰ জীয়াৰী যি প্ৰতি সন্ধিয়া ৭:০০ বজাত ফোন কৰে আৰু বাগিচাৰ সতেজ চাহ আনে।',
      bn: 'প্রিয়া আপনার মেয়ে যে রোজ সন্ধ্যা ৭:০০টায় ফোন করে এবং বাগানের টাটকা চা নিয়ে আসে।',
      mni: 'প্রিয়া অদোমগী মচানুপীনি, মহাক্না নুমিদাং ৭:০০ তাদা ফোন তৌই অমসুং চা পুরকই।',
      brx: 'प्रिया नोंथांनि फिसौजोल, जाय सानफ्रोमबो बेलासे ७:०० बाजिआव कल खालामो आरो बागाननि गोदान सा लाबोयो।',
      lus: 'Priya chu i fanu a ni a, tla tin dar 7:00-ah a rawn bia che a, thingpui thar a rawn keng ziah.',
      kha: 'Priya ka dei ka khun jong phi kaba phone man ka janmiet ha ka 7:00 PM bad kaba wanrah sha kper.',
      grt: 'Priya na-ani demechik ong-a aro attam 7:00 baji-o phone ka-e cha rona re-ba-a.',
      trp: 'Priya nini bwsala-bwrwi, sanrom sanmar 7:00 baji-o phone khwlaio tei cha twlangna faio.',
      ten: 'Li-nuo Priya themu 7:00 PM nu phone voruo mu cha vor mevi.',
      ao: 'Jabaso Priya nikongtsütsü 7:00 ako nung phone arutsür aser cha anir arur.',
      lot: 'Olaro Priya mozang 7:00 PM phone to cha tsukro tsukcho.',
    },
  },
};

/**
 * Resolves localized family relationship label
 */
export function getLocalizedRelationship(relationshipKey: string, lang: SupportedLanguage): string {
  // Normalize key (case-insensitive lookup)
  const foundKey = Object.keys(FAMILY_RELATIONSHIPS).find(
    (k) => k.toLowerCase() === relationshipKey.trim().toLowerCase()
  );

  if (foundKey && FAMILY_RELATIONSHIPS[foundKey]) {
    const entry = FAMILY_RELATIONSHIPS[foundKey];
    return entry[lang] || entry.en;
  }

  // Fallback: If not in pre-defined dictionary
  return relationshipKey;
}

/**
 * Resolves localized description for a member
 */
export function getLocalizedMemberDescription(
  memberId: string,
  fallbackText: string,
  lang: SupportedLanguage
): string {
  const memberLoc = DEFAULT_MEMBER_LOCALIZATIONS[memberId];
  if (memberLoc && memberLoc.description) {
    const localizedDesc = (memberLoc.description as Record<string, string>)[lang];
    if (localizedDesc) return localizedDesc;
    if (memberLoc.description.en) return memberLoc.description.en;
  }
  return fallbackText;
}

/**
 * Resolves member display name representation
 */
export function getLocalizedMemberName(
  memberId: string,
  actualName: string,
  lang: SupportedLanguage
): { primary: string; secondary?: string } {
  const memberLoc = DEFAULT_MEMBER_LOCALIZATIONS[memberId];
  if (memberLoc && memberLoc.transliteration) {
    const translit = memberLoc.transliteration[lang];
    if (translit && lang !== 'en') {
      return {
        primary: translit,
        secondary: actualName,
      };
    }
  }

  return { primary: actualName };
}

export const getFamilyRelationshipLabel = getLocalizedRelationship;
export const getRelationshipLabel = getLocalizedRelationship;

export function formatMemberBio(memberId: string, lang: SupportedLanguage): string {
  return getLocalizedMemberDescription(memberId, '', lang);
}

export function getFamilyMemberTransliteration(
  actualName: string,
  lang: SupportedLanguage
): string | undefined {
  if (lang === 'en') return undefined;
  for (const loc of Object.values(DEFAULT_MEMBER_LOCALIZATIONS)) {
    if (loc.displayName.toLowerCase().includes(actualName.toLowerCase()) || actualName.toLowerCase().includes(loc.displayName.toLowerCase())) {
      if (loc.transliteration && loc.transliteration[lang]) {
        return loc.transliteration[lang];
      }
    }
  }
  return undefined;
}

