export type Language = "de" | "en";

export const translations = {
  de: {
    // Navigation
    home: "Startseite",
    discover: "Entdecken",
    dataCube: "Data Cube",
    settings: "Einstellungen",
    categories: "Kategorien",
    
    // Tabs
    aiTechnology: "KI-Technologie",
    techProgress: "Technische Fortschritte",
    investments: "Investitionen",
    marketFunding: "Markt & Finanzierung",
    practicalTips: "Praxis-Tipps",
    handsOnAI: "Hands-on KI",
    technology: "Technologie",
    tips: "Tipps",
    
    // Week Navigation
    weekOverview: "Wochenübersicht",
    week: "KW",
    current: "Aktuell",
    
    // Tech Feed
    aiTechProgress: "KI-Technologie Fortschritte",
    importantDevThisWeek: "Die wichtigsten technischen Entwicklungen",
    impact: "Auswirkung",
    source: "Quelle",
    
    // Impact levels
    critical: "Kritisch",
    high: "Hoch",
    medium: "Mittel",
    low: "Niedrig",
    
    // Investment Feed
    aiInvestments: "KI-Investitionen",
    fundingNewsMA: "Finanzierungsrunden, Börsennews und M&A-Aktivitäten",
    primaryMarket: "Primärmarkt",
    secondaryMarket: "Sekundärmarkt",
    volume: "Volumen",
    valuation: "Bewertung",
    marketCap: "Marktkapitalisierung",
    acquisition: "Akquisition",
    acquirer: "Käufer",
    target: "Ziel",
    dealValue: "Dealwert",

    // Investment Filters (Primary Market round filters)
    filterAll: "Alle",
    filterEarly: "Früh",
    filterSeriesA: "Serie A",
    filterSeriesB: "Serie B",
    filterSeriesCPlus: "Serie C+",
    filterLatePE: "Spät/PE",
    filterByRound: "Nach Runde filtern",
    
    // Tips Feed
    practicalTipsTitle: "Praxis-Tipps",
    handsOnTipsFrom: "Hands-on KI-Tipps von X und Reddit",
    beginner: "Anfänger",
    intermediate: "Mittel",
    advanced: "Fortgeschritten",
    
    // Right Sidebar
    search: "Suchen",
    whatsNew: "Was gibt's Neues?",
    posts: "Beiträge",
    team: "Data Cube Team",
    follow: "Folgen",
    showMore: "Mehr anzeigen",
    
    // Footer
    termsOfService: "Nutzungsbedingungen",
    privacy: "Datenschutz",
    cookiePolicy: "Cookie-Richtlinie",
    imprint: "Impressum",
    accessibility: "Barrierefreiheit",
    
    // Settings
    darkMode: "Dunkelmodus",
    lightMode: "Hellmodus",
    switchToDark: "Zum Dunkelmodus wechseln",
    switchToLight: "Zum Hellmodus wechseln",
    language: "Sprache",
    german: "Deutsch",
    english: "English",
    switchToGerman: "Zu Deutsch wechseln",
    switchToEnglish: "Zu Englisch wechseln",
    
    // Share
    share: "Teilen",
    copiedToClipboard: "In Zwischenablage kopiert",

    // Timestamps
    hoursAgo: "vor {n} Std.",
    dayAgo: "vor 1 Tag",
    daysAgo: "vor {n} Tagen",

    // Chat Widget
    chatTitle: "KI-Assistent",
    chatWelcome: "Hallo! Ich kann dir helfen, die KI-News dieser Woche zu verstehen. Stell mir eine Frage!",
    chatPlaceholder: "Frage stellen...",
    chatThinking: "Denke nach...",
    chatError: "Fehler beim Laden. Bitte versuche es erneut.",
    chatTimeout: "Zeitüberschreitung. Bitte versuche es erneut.",
    chatClear: "Neues Gespräch",
    chatSuggest1: "Fasse diese Woche zusammen",
    chatSuggest2: "Was sind die Top-Investitionen?",
    chatSuggest3: "Welche Trends sind wichtig?",

    // Period/Daily
    noDataForThisPeriod: "Keine Daten für diesen Zeitraum verfügbar.",

    // Video
    video: "Video",
    playVideo: "Video abspielen",
    views: "Aufrufe",
    duration: "Dauer",

    // Newsletter
    newsletter: "Newsletter",
    emailPlaceholder: "E-Mail-Adresse",
    subscribe: "Abonnieren",
    subscribed: "Abonniert!",
    newsletterDescription: "W\u00f6chentliche KI-News direkt in Ihr Postfach",

    // Support
    support: "Unterst\u00fctzen",

    // Share enhanced
    copyLink: "Link kopieren",
    shareOnX: "Auf X teilen",
    shareOnLinkedIn: "Auf LinkedIn teilen",

    // FAB Labels
    fabReport: "KI-Bericht",
    fabChat: "KI-Chat",

    // Report Generator
    reportGenerate: "KI-Bericht erstellen",
    reportTitle: "KI-Wochenbericht",
    reportGenerating: "Bericht wird erstellt...",
    reportComplete: "Bericht fertig!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "Text",
    reportExportJson: "JSON",
    reportExport: "Exportieren",
    reportClose: "Schließen",
    reportError: "Fehler beim Erstellen des Berichts. Bitte versuche es erneut.",
    reportRegenerate: "Neu generieren",
  },
  en: {
    // Navigation
    home: "Home",
    discover: "Discover",
    dataCube: "Data Cube",
    settings: "Settings",
    categories: "Categories",
    
    // Tabs
    aiTechnology: "AI Technology",
    techProgress: "Technical Progress",
    investments: "Investments",
    marketFunding: "Market & Funding",
    practicalTips: "Practical Tips",
    handsOnAI: "Hands-on AI",
    technology: "Technology",
    tips: "Tips",
    
    // Week Navigation
    weekOverview: "Week Overview",
    week: "W",
    current: "Current",
    
    // Tech Feed
    aiTechProgress: "AI Technology Progress",
    importantDevThisWeek: "The most important technical developments",
    impact: "Impact",
    source: "Source",
    
    // Impact levels
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
    
    // Investment Feed
    aiInvestments: "AI Investments",
    fundingNewsMA: "Funding rounds, stock news and M&A activities",
    primaryMarket: "Primary Market",
    secondaryMarket: "Secondary Market",
    volume: "Volume",
    valuation: "Valuation",
    marketCap: "Market Cap",
    acquisition: "Acquisition",
    acquirer: "Acquirer",
    target: "Target",
    dealValue: "Deal Value",

    // Investment Filters (Primary Market round filters)
    filterAll: "All",
    filterEarly: "Early",
    filterSeriesA: "Series A",
    filterSeriesB: "Series B",
    filterSeriesCPlus: "Series C+",
    filterLatePE: "Late/PE",
    filterByRound: "Filter by round",
    
    // Tips Feed
    practicalTipsTitle: "Practical Tips",
    handsOnTipsFrom: "Hands-on AI tips from X and Reddit",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    
    // Right Sidebar
    search: "Search",
    whatsNew: "What's happening?",
    posts: "posts",
    team: "Data Cube Team",
    follow: "Follow",
    showMore: "Show more",
    
    // Footer
    termsOfService: "Terms of Service",
    privacy: "Privacy",
    cookiePolicy: "Cookie Policy",
    imprint: "Imprint",
    accessibility: "Accessibility",
    
    // Settings
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    language: "Language",
    german: "Deutsch",
    english: "English",
    switchToGerman: "Switch to German",
    switchToEnglish: "Switch to English",
    
    // Share
    share: "Share",
    copiedToClipboard: "Copied to clipboard",

    // Timestamps
    hoursAgo: "{n}h ago",
    dayAgo: "1 day ago",
    daysAgo: "{n} days ago",

    // Chat Widget
    chatTitle: "AI Assistant",
    chatWelcome: "Hi! I can help you understand this week's AI news. Ask me a question!",
    chatPlaceholder: "Ask a question...",
    chatThinking: "Thinking...",
    chatError: "Failed to load. Please try again.",
    chatTimeout: "Request timed out. Please try again.",
    chatClear: "New chat",
    chatSuggest1: "Summarize this week",
    chatSuggest2: "What are the top investments?",
    chatSuggest3: "Which trends are important?",

    // Period/Daily
    noDataForThisPeriod: "No data available for this period.",

    // Video
    video: "Video",
    playVideo: "Play video",
    views: "views",
    duration: "Duration",

    // Newsletter
    newsletter: "Newsletter",
    emailPlaceholder: "Email address",
    subscribe: "Subscribe",
    subscribed: "Subscribed!",
    newsletterDescription: "Weekly AI news straight to your inbox",

    // Support
    support: "Support",

    // Share enhanced
    copyLink: "Copy link",
    shareOnX: "Share on X",
    shareOnLinkedIn: "Share on LinkedIn",

    // FAB Labels
    fabReport: "AI Report",
    fabChat: "AI Chat",

    // Report Generator
    reportGenerate: "Generate AI Report",
    reportTitle: "AI Weekly Report",
    reportGenerating: "Generating report...",
    reportComplete: "Report complete!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "Text",
    reportExportJson: "JSON",
    reportExport: "Export",
    reportClose: "Close",
    reportError: "Failed to generate report. Please try again.",
    reportRegenerate: "Regenerate",
  },
} as const;

export type TranslationKey = keyof typeof translations.de;
