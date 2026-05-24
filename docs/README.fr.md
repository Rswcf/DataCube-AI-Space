<div align="center">

# 🧊 Data Cube AI

### Votre actualité IA quotidienne, curée par l'IA.

**Agrégateur d'actualités IA multilingue (8 langues : DE/EN/ZH/FR/ES/PT/JA/KO)** qui sélectionne les avancées technologiques, les investissements, les conseils pratiques et les vidéos YouTube — alimenté par un pipeline LLM en 4,5 étapes.

[![Licence MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Démo en ligne](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](../README.md) | [简体中文](README.zh-CN.md) | [Deutsch](README.de.md) | **Français** | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

</div>

---

## Qu'est-ce que Data Cube AI ?

Data Cube AI collecte, classe et résume automatiquement les actualités IA provenant de **22 flux RSS**, **Hacker News** et **YouTube** — puis les présente dans une interface claire en 8 langues avec des vues quotidiennes et hebdomadaires.

**Accessible sur [datacubeai.space](https://www.datacubeai.space)** — aucune connexion requise.

<div align="center">

https://github.com/user-attachments/assets/9dddaaed-e473-4350-97de-0346cacb6660

</div>

## Fonctionnalités

- **Fil Tech** — Avancées IA/ML avec vidéos YouTube intégrées et évaluations d'impact
- **Suivi des investissements** — Levées de fonds primaires, données du marché secondaire (cours boursiers en temps réel via Polygon.io) et fusions-acquisitions
- **Conseils pratiques** — Sélection provenant de 14 communautés Reddit et de blogs d'experts
- **8 langues** — Contenu disponible en DE, EN, ZH, FR, ES, PT, JA et KO
- **Quotidien + Hebdomadaire** — Collecte quotidienne automatisée avec vues récapitulatives hebdomadaires
- **Chat IA** — Posez des questions sur les actualités IA de la semaine en cours
- **Rapports IA** — Génération de rapports en streaming en un clic, avec export en Word, HTML, Markdown, texte brut ou JSON
- **Optimisé SEO/GEO** — Pages SSR, données structurées JSON-LD, flux Atom, llms.txt, sitemap
- **Accessible** — Conforme WCAG : cibles tactiles de 44px, focus-visible, ARIA, prefers-reduced-motion, liens d'évitement
- **Mobile-First** — Viewport dynamique, zones de sécurité (safe area insets), navigation optimisée pour le tactile, verrouillage du défilement sur les overlays

## Architecture

```
Frontend (Vercel)                    Backend (Railway)
┌─────────────────────┐             ┌──────────────────────────────┐
│  Next.js 16         │    REST     │  FastAPI + PostgreSQL        │
│  React 19           │◄───────────►│                              │
│  Tailwind CSS 4     │    API      │  Pipeline en 4,5 étapes :    │
│  Shadcn/ui          │             │  1. Fetch (RSS, HN, YouTube) │
│                     │             │  2. Classify (LLM)           │
│  Pages :            │             │  3. Process (LLM, parallel)  │
│  • Fil Tech         │             │  4. Save to PostgreSQL       │
│  • Fil Investissement│            │                              │
│  • Fil Conseils     │             │  Sources de données :        │
│  • Chat IA          │             │  • 22 flux RSS               │
│  • Rapports IA      │             │  • Hacker News (Algolia)     │
│  • SSR Week/Article │             │  • YouTube Data API v3       │
│  • Topic/Tool Pages │             │                              │
└─────────────────────┘             └──────────────────────────────┘
```

## Démarrage rapide

### Prérequis

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Clés API : [OpenRouter](https://openrouter.ai), [YouTube Data API v3](https://console.cloud.google.com), [Polygon.io](https://polygon.io) (optionnel, pour les cours boursiers en temps réel)

### Frontend

```bash
cd ai-information-hub
cp .env.example .env.local    # Ajoutez vos clés API
npm install
npm run dev                   # http://localhost:3000
```

### Backend

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Ajoutez vos clés API

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### Lancer la collecte de données

```bash
# Collecte quotidienne (aujourd'hui)
python -m scripts.daily_collect

# Collecte hebdomadaire (semaine en cours)
python -m scripts.weekly_collect

# Date/semaine spécifique
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## Stack technique

| Couche | Technologie |
|--------|------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **Backend** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **Classification LLM** | GLM-4.5-Air (OpenRouter, niveau gratuit) |
| **Traitement LLM** | DeepSeek V4 Flash (OpenRouter, principal ; V3.2 en fallback) |
| **Chat et rapports** | openrouter/free (OpenRouter) |
| **Données boursières** | API Polygon.io |
| **Hébergement** | Vercel (frontend), Railway (backend + BDD + cron) |
| **Design** | Police Newsreader, logo cube isométrique, accents de couleur par section, animations échelonnées |

## Pipeline de données

Le backend traite les actualités via un pipeline en 4,5 étapes :

| Étape | Description | Résultat |
|-------|------------|----------|
| **1. Collecte** | Récupération depuis RSS, Hacker News, YouTube ; filtrage par limites de période | ~210 éléments bruts |
| **2. Classification** | Le LLM classe en tech/investissement/conseils (les sources de conseils sautent cette étape) | Pool catégorisé |
| **3. Traitement** | Traitement LLM en parallèle : génération de résumés de base DE/EN, extraction d'entités | 30 tech + 21 investissement + 15 conseils + 5 vidéos |
| **3.5. Traduction** | Traduction EN → ZH, FR, ES, PT, JA, KO via une chaîne de modèles résiliente | 6 langues supplémentaires par élément |
| **4. Sauvegarde** | Stockage dans PostgreSQL, intégration des vidéos dans le fil tech | Enregistrements en base |

Les collectes quotidiennes produisent des volumes réduits (10 tech, 5 investissement, 5 conseils, 2 vidéos).

## Référence API

| Point d'accès | Méthode | Description |
|---------------|---------|-------------|
| `/api/weeks` | GET | Lister les périodes (semaines avec jours imbriqués) |
| `/api/tech/{periodId}` | GET | Fil tech avec vidéos intégrées |
| `/api/investment/{periodId}` | GET | Données primaire/secondaire/fusions-acquisitions |
| `/api/tips/{periodId}` | GET | Conseils sélectionnés |
| `/api/trends/{periodId}` | GET | Tendances de la période |
| `/api/videos/{periodId}` | GET | Résumés de vidéos YouTube |
| `/api/stock/{ticker}` | GET | Données boursières en temps réel |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | Données boursières par lot |
| `/api/admin/collect` | POST | Déclencher une collecte complète |

Identifiants de période : quotidien `YYYY-MM-DD` ou hebdomadaire `YYYY-kwWW`

La documentation complète de l'API est disponible sur `/docs` (Swagger UI) lorsque le backend est en cours d'exécution.

## Variables d'environnement

### Frontend (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # Pour les fonctionnalités de chat et de rapports
YOUTUBE_API_KEY=AIza...              # Pour les métadonnées vidéo
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # URL du backend
```

### Backend (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # Pour la classification et le traitement LLM
YOUTUBE_API_KEY=AIza...              # Pour la récupération de vidéos
POLYGON_API_KEY=...                  # Optionnel : données boursières en temps réel
ADMIN_API_KEY=your-secret-key       # Protège les points d'accès d'administration
CORS_ORIGINS=["http://localhost:3000"]
```

## Déploiement

### Frontend → Vercel

```bash
cd ai-information-hub
vercel --prod
```

Configurez les variables d'environnement dans le tableau de bord Vercel. Déploiement automatique lors d'un push sur `main`.

### Backend → Railway

```bash
cd ai-hub-backend
railway up
```

Railway applique automatiquement les migrations Alembic au démarrage. La collecte quotidienne est automatisée via GitHub Actions (23h heure de Berlin).

## Structure du projet

```
DataCube-AI-Space/
├── ai-information-hub/          # Frontend (Next.js)
│   ├── app/                     # Pages + routes API
│   │   ├── api/chat/            # Point d'accès du chat IA
│   │   ├── api/report/          # Générateur de rapports IA
│   │   ├── [lang]/week/         # Pages SSR par semaine (SEO)
│   │   ├── [lang]/news/         # Pages article (SEO/GEO)
│   │   ├── [lang]/topic/        # Topic hubs
│   │   ├── [lang]/tools/        # Pages d'outils localisées
│   │   └── feed.xml/            # Flux Atom 1.0
│   ├── components/              # Composants React
│   │   ├── feeds/               # Fils Tech, Investissement, Conseils
│   │   └── video-embed.tsx      # Lecteur YouTube
│   ├── lib/                     # Utilitaires, types, client API
│   └── middleware.ts            # Contournement des crawlers + portail d'accueil
│
├── ai-hub-backend/              # Backend (FastAPI)
│   ├── app/
│   │   ├── models/              # Modèles SQLAlchemy
│   │   ├── routers/             # Points d'accès API
│   │   └── services/            # Logique métier
│   │       ├── collector.py     # Pipeline en 4,5 étapes
│   │       ├── llm_processor.py # Approche LLM à deux modèles
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # Migrations BDD
│   ├── scripts/                 # Outils CLI (collecte quotidienne/hebdomadaire)
│   └── Dockerfile
│
├── docs/                        # README traduits
└── LICENSE
```

## Contribuer

Les contributions sont les bienvenues ! Voici comment démarrer :

1. Forkez le dépôt
2. Créez une branche de fonctionnalité (`git checkout -b feature/fonctionnalite-geniale`)
3. Validez vos modifications (`git commit -m 'Add fonctionnalite-geniale'`)
4. Poussez la branche (`git push origin feature/fonctionnalite-geniale`)
5. Ouvrez une Pull Request

Assurez-vous que votre code passe les vérifications CI :
- **Frontend** : `tsc --noEmit` + `next build`
- **Backend** : `ruff check`

## Licence

Ce projet est sous licence MIT — voir le fichier [LICENSE](../LICENSE) pour plus de détails.

---

<div align="center">

**[Démo en ligne](https://www.datacubeai.space)** · **[Signaler un bug](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[Demander une fonctionnalité](https://github.com/Rswcf/DataCube-AI-Space/issues)**

Si vous trouvez ce projet utile, n'hésitez pas à lui attribuer une étoile !

</div>
