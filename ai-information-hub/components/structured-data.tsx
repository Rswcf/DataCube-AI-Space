import { TechPost } from '@/lib/types'

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'Data Cube AI',
    url: 'https://www.datacubeai.space',
    logo: 'https://www.datacubeai.space/icon.svg',
    description: 'Multilingual AI news aggregator providing daily tech, investment, and tips content in 8 languages.',
    foundingDate: '2026-01',
    publishingPrinciples: 'https://www.datacubeai.space',
    ethicsPolicy: 'https://www.datacubeai.space',
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Data Cube AI',
    url: 'https://www.datacubeai.space',
    inLanguage: ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'],
    description: 'Daily AI news aggregator with tech breakthroughs, investment news, and practical tips.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.datacubeai.space/?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function ArticleSchema({ post, inLanguage = 'de', url }: { post: TechPost; inLanguage?: string; url?: string }) {
  // Use the first line of content as the headline (it acts as the article title),
  // truncated to 110 chars for schema.org compliance. Falls back to sliced content.
  const firstLine = (post.content || '').split('\n')[0]?.trim()
  const headline = (firstLine && firstLine.length > 0 ? firstLine : post.content).slice(0, 110)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    description: post.content,
    datePublished: post.timestamp,
    dateModified: post.timestamp,
    image: 'https://www.datacubeai.space/og-image.jpg',
    inLanguage,
    isAccessibleForFree: true,
    url: url || post.sourceUrl || 'https://www.datacubeai.space',
    author: {
      '@type': 'Organization',
      name: 'Data Cube AI',
      url: 'https://www.datacubeai.space',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Data Cube AI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.datacubeai.space/icon.svg',
      },
    },
    mainEntityOfPage: post.sourceUrl || 'https://www.datacubeai.space',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function VideoSchema({ video }: { video: TechPost }) {
  if (!video.isVideo || !video.videoId) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.content.slice(0, 110),
    description: video.content,
    thumbnailUrl: video.videoThumbnailUrl || `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
    uploadDate: video.timestamp,
    duration: video.videoDuration,
    contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
    publisher: {
      '@type': 'Organization',
      name: 'Data Cube AI',
    },
    author: {
      '@type': 'Organization',
      name: 'Data Cube AI',
      url: 'https://www.datacubeai.space',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSchema({ lang = 'en' }: { lang?: string }) {
  const faqs: Record<string, Array<{ q: string; a: string }>> = {
    de: [
      { q: 'Was ist Data Cube AI?', a: 'Data Cube AI ist ein mehrsprachiger (8 Sprachen: DE, EN, ZH, FR, ES, PT, JA, KO) täglicher KI-News-Aggregator. Er kuratiert Technologie-Durchbrüche, Investment-News, praktische Tipps und YouTube-Videos aus über 40 Quellen.' },
      { q: 'Wie oft wird der Inhalt aktualisiert?', a: 'Der Inhalt wird täglich um 22:00 UTC aktualisiert, mit neuen Tech-Meldungen, Investment-News und praktischen Tipps.' },
      { q: 'Welche Sprachen unterstützt Data Cube AI?', a: 'Data Cube AI unterstützt 8 Sprachen: Deutsch, Englisch, Chinesisch, Französisch, Spanisch, Portugiesisch, Japanisch und Koreanisch.' },
      { q: 'Welche Arten von KI-News deckt Data Cube AI ab?', a: 'Data Cube AI deckt drei Hauptkategorien ab: Tech (KI-Durchbrüche, Forschung, Produkteinführungen), Investment (Finanzierungsrunden, M&A, Aktienbewegungen) und Tipps (praktische KI-Tools und Prompts).' },
    ],
    en: [
      { q: 'What is Data Cube AI?', a: 'Data Cube AI is a multilingual (8 languages: DE, EN, ZH, FR, ES, PT, JA, KO) daily AI news aggregator that curates tech breakthroughs, investment news, practical tips, and YouTube videos from 40+ sources.' },
      { q: 'How often is the content updated?', a: 'Content is updated daily at 22:00 UTC, with new tech posts, investment news, and practical tips curated every day.' },
      { q: 'What languages does Data Cube AI support?', a: 'Data Cube AI supports 8 languages: German, English, Chinese, French, Spanish, Portuguese, Japanese, and Korean.' },
      { q: 'What types of AI news does Data Cube AI cover?', a: 'Data Cube AI covers three main categories: Tech (AI breakthroughs, research, and product launches), Investment (funding rounds, M&A, stock movements), and Tips (practical AI tools and prompts).' },
    ],
    zh: [
      { q: '什么是Data Cube AI？', a: 'Data Cube AI是一个多语言（8种语言：DE、EN、ZH、FR、ES、PT、JA、KO）每日AI新闻聚合器，精选技术突破、投资新闻、实用技巧和YouTube视频，来源超过40个。' },
      { q: '内容多久更新一次？', a: '内容每天UTC 22:00更新，包含新的技术报道、投资新闻和实用技巧。' },
      { q: 'Data Cube AI支持哪些语言？', a: 'Data Cube AI支持8种语言：德语、英语、中文、法语、西班牙语、葡萄牙语、日语和韩语。' },
      { q: 'Data Cube AI涵盖哪些类型的AI新闻？', a: 'Data Cube AI涵盖三大类别：科技（AI突破、研究、产品发布）、投资（融资轮次、并购、股票动态）和技巧（实用AI工具和提示词）。' },
    ],
    fr: [
      { q: "Qu'est-ce que Data Cube AI ?", a: "Data Cube AI est un agrégateur d'actualités IA multilingue (8 langues) qui sélectionne quotidiennement des percées technologiques, des nouvelles d'investissement, des conseils pratiques et des vidéos YouTube à partir de plus de 40 sources." },
      { q: 'À quelle fréquence le contenu est-il mis à jour ?', a: 'Le contenu est mis à jour quotidiennement à 22h00 UTC, avec de nouveaux articles tech, des actualités investissement et des conseils pratiques.' },
      { q: 'Quelles langues sont prises en charge ?', a: 'Data Cube AI prend en charge 8 langues : allemand, anglais, chinois, français, espagnol, portugais, japonais et coréen.' },
      { q: "Quels types d'actualités IA couvre Data Cube AI ?", a: "Data Cube AI couvre trois catégories : Tech (percées IA, recherche, lancements de produits), Investissement (levées de fonds, M&A, mouvements boursiers) et Astuces (outils IA pratiques et prompts)." },
    ],
    es: [
      { q: '¿Qué es Data Cube AI?', a: 'Data Cube AI es un agregador de noticias de IA multilingüe (8 idiomas) que selecciona diariamente avances tecnológicos, noticias de inversión, consejos prácticos y videos de YouTube de más de 40 fuentes.' },
      { q: '¿Con qué frecuencia se actualiza el contenido?', a: 'El contenido se actualiza diariamente a las 22:00 UTC, con nuevas noticias de tecnología, inversión y consejos prácticos.' },
      { q: '¿Qué idiomas admite Data Cube AI?', a: 'Data Cube AI admite 8 idiomas: alemán, inglés, chino, francés, español, portugués, japonés y coreano.' },
      { q: '¿Qué tipos de noticias de IA cubre Data Cube AI?', a: 'Data Cube AI cubre tres categorías principales: Tecnología (avances en IA, investigación, lanzamientos), Inversión (rondas de financiación, M&A, movimientos bursátiles) y Consejos (herramientas de IA prácticas y prompts).' },
    ],
    pt: [
      { q: 'O que é o Data Cube AI?', a: 'Data Cube AI é um agregador de notícias de IA multilíngue (8 idiomas) que seleciona diariamente avanços tecnológicos, notícias de investimento, dicas práticas e vídeos do YouTube de mais de 40 fontes.' },
      { q: 'Com que frequência o conteúdo é atualizado?', a: 'O conteúdo é atualizado diariamente às 22:00 UTC, com novas notícias de tecnologia, investimento e dicas práticas.' },
      { q: 'Quais idiomas o Data Cube AI suporta?', a: 'Data Cube AI suporta 8 idiomas: alemão, inglês, chinês, francês, espanhol, português, japonês e coreano.' },
      { q: 'Que tipos de notícias de IA o Data Cube AI cobre?', a: 'Data Cube AI cobre três categorias: Tecnologia (avanços em IA, pesquisa, lançamentos), Investimento (rodadas de financiamento, M&A, movimentos de ações) e Dicas (ferramentas de IA práticas e prompts).' },
    ],
    ja: [
      { q: 'Data Cube AIとは？', a: 'Data Cube AIは多言語（8言語：DE、EN、ZH、FR、ES、PT、JA、KO）対応の毎日のAIニュースアグリゲーターです。40以上のソースから技術的ブレークスルー、投資ニュース、実践ヒント、YouTube動画を厳選しています。' },
      { q: 'コンテンツはどのくらいの頻度で更新されますか？', a: 'コンテンツはUTC 22:00に毎日更新され、新しいテクノロジー記事、投資ニュース、実践ヒントが追加されます。' },
      { q: 'Data Cube AIはどの言語をサポートしていますか？', a: 'Data Cube AIは8言語をサポートしています：ドイツ語、英語、中国語、フランス語、スペイン語、ポルトガル語、日本語、韓国語。' },
      { q: 'Data Cube AIはどのような種類のAIニュースをカバーしていますか？', a: 'Data Cube AIは3つの主要カテゴリをカバーしています：テック（AIブレークスルー、研究、製品発表）、投資（資金調達、M&A、株価動向）、ヒント（実用的なAIツールとプロンプト）。' },
    ],
    ko: [
      { q: 'Data Cube AI란 무엇인가요?', a: 'Data Cube AI는 다국어(8개 언어: DE, EN, ZH, FR, ES, PT, JA, KO) 일일 AI 뉴스 애그리게이터입니다. 40개 이상의 소스에서 기술 돌파구, 투자 뉴스, 실용 팁, YouTube 동영상을 엄선합니다.' },
      { q: '콘텐츠는 얼마나 자주 업데이트되나요?', a: '콘텐츠는 매일 UTC 22:00에 업데이트되며, 새로운 기술 기사, 투자 뉴스, 실용 팁이 추가됩니다.' },
      { q: 'Data Cube AI는 어떤 언어를 지원하나요?', a: 'Data Cube AI는 8개 언어를 지원합니다: 독일어, 영어, 중국어, 프랑스어, 스페인어, 포르투갈어, 일본어, 한국어.' },
      { q: 'Data Cube AI는 어떤 종류의 AI 뉴스를 다루나요?', a: 'Data Cube AI는 세 가지 주요 카테고리를 다룹니다: 기술(AI 돌파구, 연구, 제품 출시), 투자(펀딩 라운드, M&A, 주가 동향), 팁(실용적인 AI 도구 및 프롬프트).' },
    ],
  }

  const langFaqs = faqs[lang] || faqs.en

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: langFaqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbListSchema({ weekId, weekLabel, lang = 'en' }: { weekId: string; weekLabel: string; lang?: string }) {
  const homeLabel = ({ de: 'Startseite', en: 'Home', zh: '首页', fr: 'Accueil', es: 'Inicio', pt: 'Início', ja: 'ホーム', ko: '홈' } as Record<string, string>)[lang] || 'Home'
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel, item: `https://www.datacubeai.space/${lang}` },
      { '@type': 'ListItem', position: 2, name: weekLabel, item: `https://www.datacubeai.space/${lang}/week/${weekId}` },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function SoftwareApplicationSchema({
  name,
  description,
  url,
  lang = 'en'
}: {
  name: string
  description: string
  url: string
  lang?: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: 'NewsApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    author: {
      '@type': 'Organization',
      name: 'DataCube AI',
      url: 'https://www.datacubeai.space',
    },
    publisher: {
      '@type': 'Organization',
      name: 'DataCube AI',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.datacubeai.space/icon.svg',
      },
    },
    inLanguage: ['de', 'en', 'zh-Hans', 'fr', 'es', 'pt', 'ja', 'ko'],
    featureList: [
      '22+ curated news sources',
      '8 language support',
      'Daily and weekly updates',
      'AI investment tracking',
      'YouTube video curation',
      'REST API access',
      'Newsletter delivery',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/** Reusable ItemList schema with empty-guard: returns null when items array is empty */
export function ItemListSchema({ items, name, lang }: { items: Array<{ url: string; name: string }>; name: string; lang?: string }) {
  if (!items || items.length === 0) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
