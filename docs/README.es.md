<div align="center">

# 🧊 Data Cube AI

### Tu resumen diario de noticias sobre IA, curado por IA.

**Agregador multilingue de noticias de IA (8 idiomas: DE/EN/ZH/FR/ES/PT/JA/KO)** que recopila avances tecnologicos, operaciones de inversion, consejos practicos y videos de YouTube, impulsado por un pipeline de LLM de 4,5 etapas.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](../README.md) | [简体中文](README.zh-CN.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | **Español** | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

</div>

---

## Que es Data Cube AI?

Data Cube AI recopila, clasifica y resume automaticamente noticias sobre IA de **22 fuentes RSS**, **Hacker News** y **YouTube**, y las presenta en una interfaz limpia de 8 idiomas con vistas diarias y semanales.

**Disponible en [datacubeai.space](https://www.datacubeai.space)** — sin necesidad de iniciar sesion.

<div align="center">

https://github.com/user-attachments/assets/9dddaaed-e473-4350-97de-0346cacb6660

</div>

## Caracteristicas

- **Feed de Tecnologia** — Avances en IA/ML con videos de YouTube integrados y clasificaciones de impacto
- **Rastreador de Inversiones** — Rondas de financiacion primarias, datos del mercado secundario (cotizaciones en tiempo real via Polygon.io) y operaciones de M&A
- **Consejos Practicos** — Seleccionados de 14 comunidades de Reddit y blogs de expertos
- **8 idiomas** — Contenido en DE, EN, ZH, FR, ES, PT, JA y KO
- **Diario + Semanal** — Recopilacion diaria automatizada con vistas de resumen semanal
- **Chat con IA** — Haz preguntas sobre las noticias de IA de la semana actual
- **Informes de IA** — Generacion de informes en streaming con un clic, exportables a Word, HTML, Markdown, texto plano o JSON
- **Optimizado para SEO/GEO** — Paginas SSR, datos estructurados JSON-LD, feed Atom, llms.txt, sitemap
- **Accesible** — Conforme con WCAG: objetivos tactiles de 44px, focus-visible, ARIA, prefers-reduced-motion, enlaces de salto
- **Disenado para moviles** — Viewport dinamico, margenes de area segura, navegacion optimizada para tacto, bloqueo de scroll en overlays

## Arquitectura

```
Frontend (Vercel)                    Backend (Railway)
┌─────────────────────┐             ┌──────────────────────────────┐
│  Next.js 16         │    REST     │  FastAPI + PostgreSQL        │
│  React 19           │◄───────────►│                              │
│  Tailwind CSS 4     │    API      │  4.5-Stage Pipeline:         │
│  Shadcn/ui          │             │  1. Fetch (RSS, HN, YouTube) │
│                     │             │  2. Classify (LLM)           │
│  Pages:             │             │  3. Process (LLM, parallel)  │
│  • Tech Feed        │             │  4. Save to PostgreSQL       │
│  • Investment Feed  │             │                              │
│  • Tips Feed        │             │  Data Sources:               │
│  • AI Chat          │             │  • 22 RSS Feeds              │
│  • AI Reports       │             │  • Hacker News (Algolia)     │
│  • SSR Week/Article │             │  • YouTube Data API v3       │
│  • Topic/Tool Pages │             │                              │
└─────────────────────┘             └──────────────────────────────┘
```

## Inicio Rapido

### Requisitos Previos

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Claves de API: [OpenRouter](https://openrouter.ai), [YouTube Data API v3](https://console.cloud.google.com), [Polygon.io](https://polygon.io) (opcional, para datos bursatiles en tiempo real)

### Frontend

```bash
cd ai-information-hub
cp .env.example .env.local    # Agrega tus claves de API
npm install
npm run dev                   # http://localhost:3000
```

### Backend

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Agrega tus claves de API

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### Ejecutar la Recopilacion de Datos

```bash
# Recopilacion diaria (hoy)
python -m scripts.daily_collect

# Recopilacion semanal (semana actual)
python -m scripts.weekly_collect

# Fecha/semana especifica
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **Backend** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **Clasificacion LLM** | GLM-4.5-Air (OpenRouter, nivel gratuito) |
| **Procesamiento LLM** | DeepSeek V4 Flash (OpenRouter, principal; V3.2 como fallback) |
| **Chat e Informes** | openrouter/free (OpenRouter) |
| **Datos Bursatiles** | Polygon.io API |
| **Alojamiento** | Vercel (frontend), Railway (backend + BD + cron) |
| **Diseno** | Fuente Newsreader, logo cubo isométrico, acentos de color por sección, animaciones escalonadas |

## Pipeline de Datos

El backend procesa las noticias a traves de un pipeline de 4,5 etapas:

| Etapa | Que ocurre | Resultado |
|-------|-----------|-----------|
| **1. Recopilacion** | Recopilar de RSS, Hacker News, YouTube; filtrar por limites del periodo | ~210 elementos sin procesar |
| **2. Clasificacion** | El LLM clasifica en tecnologia/inversion/consejos (las fuentes de consejos se saltan este paso) | Pool categorizado |
| **3. Procesamiento** | Procesamiento LLM en paralelo: generar resumenes base DE/EN, extraer entidades | 30 tecnologia + 21 inversion + 15 consejos + 5 videos |
| **3.5. Traduccion** | Traducir EN → ZH, FR, ES, PT, JA, KO mediante una cadena resiliente de modelos | 6 idiomas adicionales por elemento |
| **4. Guardado** | Almacenar en PostgreSQL, intercalar videos en el feed de tecnologia | Registros en base de datos |

Las recopilaciones diarias producen cantidades reducidas (10 tecnologia, 5 inversion, 5 consejos, 2 videos).

## Referencia de la API

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/weeks` | GET | Listar periodos (semanas con dias anidados) |
| `/api/tech/{periodId}` | GET | Feed de tecnologia con videos integrados |
| `/api/investment/{periodId}` | GET | Datos primarios/secundarios/M&A |
| `/api/tips/{periodId}` | GET | Consejos seleccionados |
| `/api/trends/{periodId}` | GET | Temas de tendencia del periodo |
| `/api/videos/{periodId}` | GET | Resumenes de videos de YouTube |
| `/api/stock/{ticker}` | GET | Datos bursatiles en tiempo real |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | Datos bursatiles por lotes |
| `/api/admin/collect` | POST | Activar recopilacion completa de datos |

IDs de periodo: diario `YYYY-MM-DD` o semanal `YYYY-kwWW`

La documentacion completa de la API esta disponible en `/docs` (Swagger UI) al ejecutar el backend.

## Variables de Entorno

### Frontend (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # Para funciones de chat e informes
YOUTUBE_API_KEY=AIza...              # Para metadatos de video
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # URL del backend
```

### Backend (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # Para clasificacion y procesamiento LLM
YOUTUBE_API_KEY=AIza...              # Para obtencion de videos
POLYGON_API_KEY=...                  # Opcional: datos bursatiles en tiempo real
ADMIN_API_KEY=your-secret-key       # Protege los endpoints de administracion
CORS_ORIGINS=["http://localhost:3000"]
```

## Despliegue

### Frontend → Vercel

```bash
cd ai-information-hub
vercel --prod
```

Configura las variables de entorno en el panel de Vercel. Se despliega automaticamente al hacer push a `main`.

### Backend → Railway

```bash
cd ai-hub-backend
railway up
```

Railway aplica automaticamente las migraciones de Alembic al iniciar. La recopilacion diaria esta automatizada via GitHub Actions (23:xx hora de Berlin).

## Estructura del Proyecto

```
DataCube-AI-Space/
├── ai-information-hub/          # Frontend (Next.js)
│   ├── app/                     # Paginas + rutas de API
│   │   ├── api/chat/            # Endpoint de chat con IA
│   │   ├── api/report/          # Generador de informes con IA
│   │   ├── [lang]/week/         # Paginas semanales SSR (SEO)
│   │   ├── [lang]/news/         # Paginas de articulo (SEO/GEO)
│   │   ├── [lang]/topic/        # Topic hubs
│   │   ├── [lang]/tools/        # Paginas de herramientas localizadas
│   │   └── feed.xml/            # Feed Atom 1.0
│   ├── components/              # Componentes React
│   │   ├── feeds/               # Feeds de Tecnologia, Inversion, Consejos
│   │   └── video-embed.tsx      # Reproductor de YouTube
│   ├── lib/                     # Utilidades, tipos, cliente API
│   └── middleware.ts            # Bypass de crawlers + puerta de bienvenida
│
├── ai-hub-backend/              # Backend (FastAPI)
│   ├── app/
│   │   ├── models/              # Modelos SQLAlchemy
│   │   ├── routers/             # Endpoints de la API
│   │   └── services/            # Logica de negocio
│   │       ├── collector.py     # Pipeline de 4,5 etapas
│   │       ├── llm_processor.py # Enfoque LLM de dos modelos
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # Migraciones de BD
│   ├── scripts/                 # Herramientas CLI (recopilacion diaria/semanal)
│   └── Dockerfile
│
├── docs/                        # READMEs traducidos
└── LICENSE
```

## Contribuir

Las contribuciones son bienvenidas! Asi puedes empezar:

1. Haz un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/funcionalidad-increible`)
3. Haz commit de tus cambios (`git commit -m 'Add amazing feature'`)
4. Sube la rama (`git push origin feature/funcionalidad-increible`)
5. Abre un Pull Request

Asegurate de que tu codigo pase las verificaciones de CI:
- **Frontend**: `tsc --noEmit` + `next build`
- **Backend**: `ruff check`

## Licencia

Este proyecto esta licenciado bajo la Licencia MIT. Consulta el archivo [LICENSE](../LICENSE) para mas detalles.

---

<div align="center">

**[Demo en Vivo](https://www.datacubeai.space)** · **[Reportar Error](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[Solicitar Funcionalidad](https://github.com/Rswcf/DataCube-AI-Space/issues)**

Si este proyecto te resulta util, considera darle una estrella!

</div>
