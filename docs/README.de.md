<div align="center">

# 🧊 Data Cube AI

### Deine täglichen KI-Nachrichten, kuratiert von KI.

**Zweisprachiger (DE/EN) KI-Nachrichtenaggregator**, der technologische Durchbrüche, Investmentdeals, praktische Tipps und YouTube-Videos kuratiert — angetrieben durch eine 4-stufige LLM-Pipeline.

[![MIT-Lizenz](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live-Demo](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](../README.md) | [简体中文](README.zh-CN.md) | **Deutsch** | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

</div>

---

## Was ist Data Cube AI?

Data Cube AI sammelt, klassifiziert und fasst automatisch KI-Nachrichten aus **22 RSS-Feeds**, **Hacker News** und **YouTube** zusammen — und präsentiert diese in einer übersichtlichen zweisprachigen (Deutsch/Englisch) Oberfläche mit Tages- und Wochenansichten.

**Live unter [datacubeai.space](https://www.datacubeai.space)** — keine Anmeldung erforderlich.

<div align="center">

https://github.com/user-attachments/assets/9dddaaed-e473-4350-97de-0346cacb6660

</div>

## Funktionen

- **Tech-Feed** — KI/ML-Durchbrüche mit eingebetteten YouTube-Videos und Bewertungen der Tragweite
- **Investment-Tracker** — Primärmarkt-Finanzierungsrunden, Sekundärmarktdaten (Echtzeit-Aktienkurse über Polygon.io) und M&A-Deals
- **Praktische Tipps** — Kuratiert aus 14 Reddit-Communities und Experten-Blogs
- **Zweisprachig** — Jeder Artikel in Deutsch und Englisch
- **Täglich + Wöchentlich** — Automatisierte tägliche Erfassung mit wöchentlichen Zusammenfassungen
- **KI-Chat** — Stelle Fragen zu den KI-Nachrichten der aktuellen Woche
- **KI-Berichte** — Streaming-Bericht per Knopfdruck mit Export in Word, HTML, Markdown, Text oder JSON
- **SEO/GEO-optimiert** — SSR-Seiten, JSON-LD-strukturierte Daten, Atom-Feed, llms.txt, Sitemap
- **Barrierefrei** — WCAG-konform: 44px-Touch-Ziele, focus-visible, ARIA, prefers-reduced-motion, Skip-Links
- **Mobile-First** — Dynamischer Viewport, Safe-Area-Insets, Touch-optimierte Navigation, Body-Scroll-Sperre bei Overlays

## Architektur

```
Frontend (Vercel)                    Backend (Railway)
┌─────────────────────┐             ┌──────────────────────────────┐
│  Next.js 16         │    REST     │  FastAPI + PostgreSQL        │
│  React 19           │◄───────────►│                              │
│  Tailwind CSS 4     │    API      │  4-Stage Pipeline:           │
│  Shadcn/ui          │             │  1. Fetch (RSS, HN, YouTube) │
│                     │             │  2. Classify (LLM)           │
│  Pages:             │             │  3. Process (LLM, parallel)  │
│  • Tech Feed        │             │  4. Save to PostgreSQL       │
│  • Investment Feed  │             │                              │
│  • Tips Feed        │             │  Data Sources:               │
│  • AI Chat          │             │  • 22 RSS Feeds              │
│  • AI Reports       │             │  • Hacker News (Algolia)     │
│  • SSR Week Pages   │             │  • YouTube Data API v3       │
└─────────────────────┘             └──────────────────────────────┘
```

## Schnellstart

### Voraussetzungen

- Node.js 18+
- Python 3.11+
- PostgreSQL
- API-Schlüssel: [OpenRouter](https://openrouter.ai), [YouTube Data API v3](https://console.cloud.google.com), [Polygon.io](https://polygon.io) (optional, für Echtzeit-Aktiendaten)

### Frontend

```bash
cd ai-information-hub
cp .env.example .env.local    # API-Schlüssel eintragen
npm install
npm run dev                   # http://localhost:3000
```

### Backend

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # API-Schlüssel eintragen

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### Datenerfassung starten

```bash
# Tägliche Erfassung (heute)
python -m scripts.daily_collect

# Wöchentliche Erfassung (aktuelle Woche)
python -m scripts.weekly_collect

# Bestimmtes Datum / bestimmte Woche
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## Technologie-Stack

| Schicht | Technologie |
|---------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **Backend** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **LLM-Klassifikation** | GLM-4.5-Air (OpenRouter, kostenlose Stufe) |
| **LLM-Verarbeitung** | DeepSeek V4 Flash (OpenRouter, primär; V3.2 als Fallback) |
| **Chat & Berichte** | Aurora Alpha (OpenRouter) |
| **Aktiendaten** | Polygon.io API |
| **Hosting** | Vercel (Frontend), Railway (Backend + DB + Cron) |
| **Design** | Newsreader-Schrift, isometrisches Würfel-Logo, sektionsspezifische Farbakzente, gestaffelte Animationen |

## Datenpipeline

Das Backend verarbeitet Nachrichten durch eine 4-stufige Pipeline:

| Stufe | Was passiert | Ergebnis |
|-------|-------------|--------|
| **1. Abruf** | Daten aus RSS, Hacker News, YouTube sammeln; nach Zeitraumgrenzen filtern | ~210 Rohdatensätze |
| **2. Klassifikation** | LLM klassifiziert in Tech/Investment/Tipps (Tipps-Quellen überspringen diesen Schritt) | Kategorisierter Pool |
| **3. Verarbeitung** | Parallele LLM-Verarbeitung: zweisprachige Zusammenfassungen generieren, Entitäten extrahieren | 30 Tech + 21 Investment + 15 Tipps + 5 Videos |
| **4. Speicherung** | In PostgreSQL speichern, Videos in den Tech-Feed einstreuen | Datenbankeinträge |

Tägliche Erfassungen erzeugen reduzierte Mengen (10 Tech, 5 Investment, 5 Tipps, 2 Videos).

## API-Referenz

| Endpunkt | Methode | Beschreibung |
|----------|--------|-------------|
| `/api/weeks` | GET | Zeiträume auflisten (Wochen mit verschachtelten Tagen) |
| `/api/tech/{periodId}` | GET | Tech-Feed mit eingebetteten Videos |
| `/api/investment/{periodId}` | GET | Primär-/Sekundärmarkt-/M&A-Daten |
| `/api/tips/{periodId}` | GET | Kuratierte Tipps |
| `/api/videos/{periodId}` | GET | YouTube-Video-Zusammenfassungen |
| `/api/stock/{ticker}` | GET | Echtzeit-Aktiendaten |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | Batch-Aktiendaten |
| `/api/admin/collect` | POST | Vollständige Datenerfassung auslösen |

Zeitraum-IDs: täglich `YYYY-MM-DD` oder wöchentlich `YYYY-kwWW`

Vollständige API-Dokumentation unter `/docs` (Swagger UI) verfügbar, wenn das Backend läuft.

## Umgebungsvariablen

### Frontend (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # Für Chat- & Berichtsfunktionen
YOUTUBE_API_KEY=AIza...              # Für Video-Metadaten
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # Backend-URL
```

### Backend (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # Für LLM-Klassifikation & -Verarbeitung
YOUTUBE_API_KEY=AIza...              # Für Video-Abruf
POLYGON_API_KEY=...                  # Optional: Echtzeit-Aktiendaten
ADMIN_API_KEY=your-secret-key       # Schützt Admin-Endpunkte
CORS_ORIGINS=["http://localhost:3000"]
```

## Deployment

### Frontend → Vercel

```bash
cd ai-information-hub
vercel --prod
```

Umgebungsvariablen im Vercel-Dashboard setzen. Automatisches Deployment bei Push auf `main`.

### Backend → Railway

```bash
cd ai-hub-backend
railway up
```

Railway wendet Alembic-Migrationen beim Start automatisch an. Die tägliche Erfassung wird via GitHub Actions automatisiert (23:xx Berliner Zeit).

## Projektstruktur

```
DataCube-AI-Space/
├── ai-information-hub/          # Frontend (Next.js)
│   ├── app/                     # Seiten + API-Routen
│   │   ├── api/chat/            # KI-Chat-Endpunkt
│   │   ├── api/report/          # KI-Berichtsgenerator
│   │   ├── [lang]/week/         # SSR-Wochenseiten (SEO)
│   │   └── feed.xml/            # Atom 1.0 Feed
│   ├── components/              # React-Komponenten
│   │   ├── feeds/               # Tech-, Investment-, Tipps-Feeds
│   │   └── video-embed.tsx      # YouTube-Player
│   ├── lib/                     # Hilfsfunktionen, Typen, API-Client
│   └── middleware.ts            # Crawler-Bypass + Willkommensseite
│
├── ai-hub-backend/              # Backend (FastAPI)
│   ├── app/
│   │   ├── models/              # SQLAlchemy-Modelle
│   │   ├── routers/             # API-Endpunkte
│   │   └── services/            # Geschäftslogik
│   │       ├── collector.py     # 4-stufige Pipeline
│   │       ├── llm_processor.py # Zwei-Modell-LLM-Ansatz
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # DB-Migrationen
│   ├── scripts/                 # CLI-Tools (tägliche/wöchentliche Erfassung)
│   └── Dockerfile
│
├── docs/                        # Übersetzte READMEs
└── LICENSE
```

## Mitwirken

Beiträge sind willkommen! So kannst du loslegen:

1. Forke das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/tolles-feature`)
3. Committe deine Änderungen (`git commit -m 'Tolles Feature hinzufügen'`)
4. Pushe den Branch (`git push origin feature/tolles-feature`)
5. Erstelle einen Pull Request

Bitte stelle sicher, dass dein Code die CI-Checks besteht:
- **Frontend**: `tsc --noEmit` + `next build`
- **Backend**: `ruff check`

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert — siehe die Datei [LICENSE](../LICENSE) für Details.

---

<div align="center">

**[Live-Demo](https://www.datacubeai.space)** · **[Fehler melden](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[Feature anfragen](https://github.com/Rswcf/DataCube-AI-Space/issues)**

Wenn du dieses Projekt nützlich findest, hinterlasse gerne einen Stern!

</div>
