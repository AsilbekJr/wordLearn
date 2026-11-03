export const uz = {
  appName: 'Linguist AI',
  appSubtitle: 'Oʻzbek tilida gapiruvchilar uchun ingliz tili oraliq takrorlash tizimi',

  // Navigation (qisqa, ixcham teglar)
  nav: {
    today: 'Bugun',
    study: 'Mashq',
    library: 'Kutubxona',
    tools: 'Boʻlimlar',
    productionLab: 'Laboratoriya',
    productionLabDesc: 'Yozma va ogʻzaki nutq mashqlari',
    grammar: 'Grammatika',
    grammarDesc: 'Morfologiya va chalkash juftliklar',
    errorLog: 'Xatolar daftari',
    errorLogDesc: 'Xatolarni tahlil qilish va qayta ishlash',
    stats: 'Statistika',
    statsDesc: 'FSRS va 5 bosqichli tahlil',
    settings: 'Sozlamalar',
    more: 'Yana',
    menu: 'Menyu'
  },

  // Mastery Levels (1-5)
  mastery: {
    level0: 'Boshlanmagan',
    level1: 'Tanish',
    level1Desc: 'Idrok qilish (recognition) oʻrganilgan',
    level2: 'Eslash',
    level2Desc: 'Eslash barqarorligi ≥ 7 kun',
    level3: 'Eshitish',
    level3Desc: 'Diktant barqarorligi ≥ 7 kun',
    level4: 'Ishlatish',
    level4Desc: '≥ 3 xil kontekstda toʻgʻri ishlatilgan',
    level5: 'Yodlandi (Erkin)',
    level5Desc: 'Toʻliq yodlangan, interval ≥ 21 kun',
    repsCount: (n: number) => n === 0 ? 'Takrorlanmagan' : `${n} marta takrorlangan`,
    dueToday: 'Bugun takrorlash kerak',
    masteredTag: 'Yodlandi',
    intervalDays: (n: number) => `Interval: ${n} kun`,
    nextReviewIn: (n: number) => n <= 0 ? 'Bugun' : `${n} kundan soʻng`,
    congratsMastered: 'Tabriklaymiz! Ushbu gap "Yodlandi" holatiga oʻtdi! (Interval 21+ kundan oshdi)'
  },

  // Card Modes
  modes: {
    recognition: 'Tanish (Recognition)',
    recall: 'Eslash (Recall)',
    cloze: 'Boʻsh joy (Cloze)',
    dictation: 'Diktant (Dictation)',
    speaking: 'Gapirish (Speaking)',
    transform: 'Oʻzgartirish (Transform)',
    production: 'Mustaqil gap (Production)'
  },

  // FSRS Ratings
  ratings: {
    again: 'Qayta',
    hard: 'Qiyin',
    good: 'Yaxshi',
    easy: 'Oson',
    keysHint: '1: Qayta | 2: Qiyin | 3: Yaxshi | 4: Oson | Boʻsh joy: Ochish'
  },

  // Library screen
  library: {
    title: 'Kutubxona',
    subtitle: 'Barcha 15 haftalik gaplar toʻplami va grammatika teglari',
    searchPlaceholder: 'Inglizcha gap yoki oʻzbekcha tarjima qidiring...',
    allWeeks: 'Barcha haftalar',
    weekNumber: (n: number) => `${n}-hafta`,
    allTags: 'Barcha teglari',
    allMastery: 'Barcha darajalar',
    totalFound: (n: number) => `Jami: ${n} ta gap`,
    tableCols: {
      week: 'Hafta',
      gap: 'Inglizcha gap',
      tarjima: 'Oʻzbekcha tarjima',
      grammar: 'Grammatika',
      mastery: 'Daraja',
      actions: 'Amallar'
    },
    filterByWeek: 'Hafta boʻyicha:',
    filterByTag: 'Mavzu boʻyicha:',
    filterByMastery: 'Oʻzlashtirish:',
    resetFilters: 'Filtrni tozalash',
    viewDetails: 'Batafsil',
    noResults: 'Hech qanday gap topilmadi'
  },

  // Today screen
  today: {
    title: 'Bugun',
    greeting: 'Xush kelibsiz! Bugungi mashqlarga tayyormisiz?',
    dueCards: 'Takrorlash uchun',
    newCards: 'Yangi kartalar',
    dailyMission: 'Kunlik missiya',
    missionDesc: 'Bugun 3 ta oʻrganilgan iborani haqiqiy vaziyatda qoʻllang',
    markUsed: 'Ishlatdim',
    usedSuccess: 'Qoyil! Erkin nutq darajangizga qoʻshildi',
    startSession: 'Mashgʻulotni boshlash',
    emptyQueue: 'Bugungi barcha kartalar takrorlandi! Barakalla.',
    streak: (days: number) => `${days} kunlik uzluksizlik`,
    dueReminderTitle: 'Bugun takrorlanishi kerak boʻlgan gaplar',
    dueReminderDesc: 'Intervali yetib kelgan gaplar eslab turiladi. Oʻz vaqtida takrorlash 90% eslab qolishni taʼminlaydi.',
    enableNotifications: 'Eslatmalarni yoqish (Bildirishnoma)',
    notificationsActive: 'Bildirishnomalar faol',
    reviewAllDue: 'Takrorlashni boshlash',
    noDueToday: 'Bugun takrorlanishi kerak boʻlgan eski gaplar yoʻq'
  },

  // Study session
  study: {
    reveal: 'Javobni koʻrish (Boʻsh joy)',
    submit: 'Tekshirish (Enter)',
    playAudio: 'Ovozni eshitish (R)',
    yourAnswerPlaceholder: 'Inglizcha gapni yozing...',
    micListening: 'Eshitilmoqda...',
    micStart: 'Ovoz bilan aytish',
    micStop: 'Tugatish',
    undo: 'Oxirgi javobni qaytarish',
    finish: 'Mashgʻulot yakunlandi',
    backToDashboard: 'Bosh sahifaga qaytish'
  },

  // Sentence / Deep Card Detail
  detail: {
    title: 'Gap tafsilotlari',
    deepCard: 'Chuqurlashtirilgan AI kartasi',
    wordFamily: 'Soʻz oilasi',
    collocations: 'Birikmalar',
    uzbekMistakes: 'Oʻzbek oʻrganuvchilarining xatolari',
    mnemonic: 'Eslab qolish usuli (Mnemonic)',
    morphemes: 'Morfologik tarkibi',
    examples: 'Turli kontekstdagi misollar',
    history: 'Takrorlash tarixi',
    notes: 'Shaxsiy eslatma'
  },

  // Production Lab
  productionLab: {
    title: 'Ishlatish laboratoriyasi',
    subtitle: 'Oʻz fikringizni erkin ifodalang, AI esa xatolarni tahlil qilib beradi',
    writeMode: 'Yozma mashq',
    roleplayMode: 'Rolli muloqot',
    speakingMode: 'IELTS Speaking trenajyori',
    situation: 'Vaziyat',
    targets: 'Ishlatilishi kerak boʻlgan soʻzlar',
    submitForFeedback: 'AI ga tekshirtirish',
    analyzing: 'Sunʼiy intellekt tahlil qilmoqda...',
    feedbackTitle: 'AI Tahlili va Natijasi',
    naturalness: 'Tabiiylik darajasi',
    betterVariant: 'Yaxshiroq variant',
    grammarCheck: 'Grammatika toʻgʻriligi'
  },

  // Error Log
  errorLog: {
    title: 'Xatolar daftari',
    subtitle: 'Oldingi mashqlarda yoʻl qoʻyilgan xatolar va ularning toʻgʻri shakli',
    groupByTag: 'Grammatika boʻyicha guruhlangan',
    wrong: 'Notoʻgʻri',
    correct: 'Toʻgʻri',
    explanation: 'Izoh',
    retestTag: 'Ushbu mavzuni qayta mashq qilish',
    empty: 'Hozircha xatolar yoʻq. Ajoyib natija!'
  },

  // Settings
  settings: {
    title: 'Sozlamalar',
    desiredRetention: 'Maqsadli eslab qolish darajasi (Retention)',
    newPerDay: 'Kuniga yangi gaplar soni',
    maxReviewsPerDay: 'Kunlik maksimal takrorlashlar',
    dayRolloverHour: 'Kun almashish vaqti (soat)',
    timezone: 'Vaqt mintaqasi',
    voice: 'Ovoz (TTS)',
    theme: 'Mavzu (Tashqi koʻrinish)',
    light: 'Yorugʻ (Warm Paper)',
    dark: 'Qorongʻi (Ink Night)',
    system: 'Tizim sozlamasi',
    exportImport: 'Maʼlumotlarni eksport / import qilish',
    exportData: 'Eksport (JSON)',
    importData: 'Import (JSON)',
    save: 'Saqlash',
    supabaseTitle: 'Supabase va Bulutli Saqlash',
    supabaseSubtitle: 'Barcha natijalarni bulutli PostgreSQL bazasiga sinxronlash va boshqa qurilmalarda ham davom ettirish',
    supabaseConnected: 'Supabase bilan aloqa oʻrnatilgan',
    supabaseNotConfigured: 'Lokal rejim (Brauzer xotirasi)',
    supabaseUrl: 'Supabase Project URL',
    supabaseAnonKey: 'Supabase Anon Public Key',
    testConnection: 'Ulanishni tekshirish',
    syncToCloud: 'Natijalarni bulutga yuklash (Push)',
    syncFromCloud: 'Bulutdan yuklab olish (Pull)',
    signIn: 'Kirish',
    signUp: 'Roʻyxatdan oʻtish',
    signOut: 'Chiqish',
    email: 'Elektron pochta (Email)',
    password: 'Parol',
    sqlMigrationHint: 'Supabase Dashboard -> SQL Editor boʻlimiga "supabase/migrations/20261103000000_init_schema.sql" faylini joylashtiring.'
  },

  // Common
  common: {
    loading: 'Yuklanmoqda...',
    save: 'Saqlash',
    close: 'Yopish',
    cancel: 'Bekor qilish',
    success: 'Muvaffaqiyatli bajarildi',
    error: 'Xatolik yuz berdi'
  }
};
