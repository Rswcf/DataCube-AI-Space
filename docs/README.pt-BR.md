<div align="center">

# 🧊 Data Cube AI

### Suas noticias diarias sobre IA, curadas por IA.

**Agregador bilingue (DE/EN) de noticias sobre IA** que seleciona avancos tecnologicos, acordos de investimento, dicas praticas e videos do YouTube — alimentado por um pipeline de LLM em 4 estagios.

[![Licenca MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Demo ao Vivo](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](../README.md) | [简体中文](README.zh-CN.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | **Português** | [日本語](README.ja.md) | [한국어](README.ko.md)

</div>

---

## O que e o Data Cube AI?

O Data Cube AI coleta, classifica e resume automaticamente noticias sobre IA de **22 feeds RSS**, **Hacker News** e **YouTube** — e apresenta tudo em uma interface bilingue (alemao/ingles) limpa, com visualizacoes diarias e semanais.

**Disponivel em [datacubeai.space](https://www.datacubeai.space)** — sem necessidade de login.

<div align="center">

https://github.com/user-attachments/assets/9dddaaed-e473-4350-97de-0346cacb6660

</div>

## Funcionalidades

- **Feed de Tecnologia** — Avancos em IA/ML com videos do YouTube incorporados e classificacoes de impacto
- **Rastreador de Investimentos** — Rodadas de financiamento primario, dados do mercado secundario (cotacoes em tempo real via Polygon.io) e operacoes de M&A
- **Dicas Praticas** — Selecionadas de 14 comunidades do Reddit e blogs especializados
- **Bilingue** — Cada artigo em alemao e ingles
- **Diario + Semanal** — Coleta diaria automatizada com visualizacoes consolidadas semanais
- **Chat com IA** — Faca perguntas sobre as noticias de IA da semana atual
- **Relatorios de IA** — Relatorio em streaming com um clique, com exportacao para Word, HTML, Markdown, Texto ou JSON
- **Otimizado para SEO/GEO** — Paginas SSR, dados estruturados JSON-LD, feed Atom, llms.txt, sitemap
- **Acessivel** — Conformidade WCAG: alvos de toque de 44px, focus-visible, ARIA, prefers-reduced-motion, skip links
- **Mobile-First** — Viewport dinamico, safe area insets, navegacao otimizada para toque, bloqueio de scroll em overlays

## Arquitetura

```
Frontend (Vercel)                    Backend (Railway)
┌─────────────────────┐             ┌──────────────────────────────┐
│  Next.js 16         │    REST     │  FastAPI + PostgreSQL        │
│  React 19           │◄───────────►│                              │
│  Tailwind CSS 4     │    API      │  Pipeline em 4 Estagios:     │
│  Shadcn/ui          │             │  1. Fetch (RSS, HN, YouTube) │
│                     │             │  2. Classify (LLM)           │
│  Paginas:           │             │  3. Process (LLM, parallel)  │
│  • Feed de Tech     │             │  4. Save to PostgreSQL       │
│  • Feed de Invest.  │             │                              │
│  • Feed de Dicas    │             │  Fontes de Dados:            │
│  • Chat com IA      │             │  • 22 RSS Feeds              │
│  • Relatorios IA    │             │  • Hacker News (Algolia)     │
│  • Paginas SSR      │             │  • YouTube Data API v3       │
└─────────────────────┘             └──────────────────────────────┘
```

## Inicio Rapido

### Pre-requisitos

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Chaves de API: [OpenRouter](https://openrouter.ai), [YouTube Data API v3](https://console.cloud.google.com), [Polygon.io](https://polygon.io) (opcional, para cotacoes em tempo real)

### Frontend

```bash
cd ai-information-hub
cp .env.example .env.local    # Adicione suas chaves de API
npm install
npm run dev                   # http://localhost:3000
```

### Backend

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Adicione suas chaves de API

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### Executar Coleta de Dados

```bash
# Coleta diaria (hoje)
python -m scripts.daily_collect

# Coleta semanal (semana atual)
python -m scripts.weekly_collect

# Data/semana especifica
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **Backend** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **Classificacao LLM** | GLM-4.5-Air (OpenRouter, plano gratuito) |
| **Processamento LLM** | DeepSeek V3.2 (OpenRouter) |
| **Chat e Relatorios** | Aurora Alpha (OpenRouter) |
| **Dados de Acoes** | Polygon.io API |
| **Hospedagem** | Vercel (frontend), Railway (backend + BD + cron) |
| **Design** | Fonte Newsreader, logo cubo isometrico, cores de destaque por secao, animacoes escalonadas |

## Pipeline de Dados

O backend processa noticias por meio de um pipeline em 4 estagios:

| Estagio | O que acontece | Resultado |
|---------|---------------|-----------|
| **1. Coleta** | Coleta de RSS, Hacker News, YouTube; filtragem por limites do periodo | ~210 itens brutos |
| **2. Classificacao** | LLM classifica em tech/investimento/dicas (fontes de dicas pulam esta etapa) | Pool categorizado |
| **3. Processamento** | Processamento LLM paralelo: gera resumos bilingues, extrai entidades | 30 tech + 21 investimento + 15 dicas + 5 videos |
| **4. Armazenamento** | Salva no PostgreSQL, intercala videos no feed de tech | Registros no banco de dados |

Coletas diarias produzem contagens reduzidas (10 tech, 5 investimento, 5 dicas, 2 videos).

## Referencia da API

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/weeks` | GET | Listar periodos (semanas com dias aninhados) |
| `/api/tech/{periodId}` | GET | Feed de tecnologia com videos incorporados |
| `/api/investment/{periodId}` | GET | Dados de Primario/Secundario/M&A |
| `/api/tips/{periodId}` | GET | Dicas selecionadas |
| `/api/videos/{periodId}` | GET | Resumos de videos do YouTube |
| `/api/stock/{ticker}` | GET | Dados de acoes em tempo real |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | Dados de acoes em lote |
| `/api/admin/collect` | POST | Disparar coleta completa de dados |

IDs de periodo: diario `YYYY-MM-DD` ou semanal `YYYY-kwWW`

Documentacao completa da API disponivel em `/docs` (Swagger UI) ao executar o backend.

## Variaveis de Ambiente

### Frontend (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # Para funcionalidades de chat e relatorios
YOUTUBE_API_KEY=AIza...              # Para metadados de videos
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # URL do backend
```

### Backend (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # Para classificacao e processamento LLM
YOUTUBE_API_KEY=AIza...              # Para busca de videos
POLYGON_API_KEY=...                  # Opcional: dados de acoes em tempo real
ADMIN_API_KEY=your-secret-key       # Protege endpoints administrativos
CORS_ORIGINS=["http://localhost:3000"]
```

## Deploy

### Frontend → Vercel

```bash
cd ai-information-hub
vercel --prod
```

Configure as variaveis de ambiente no painel do Vercel. Deploy automatico ao fazer push para `main`.

### Backend → Railway

```bash
cd ai-hub-backend
railway up
```

O Railway aplica automaticamente as migracoes do Alembic na inicializacao. Configure um cron job para coleta diaria as 22:00 UTC.

## Estrutura do Projeto

```
DataCube-AI-Space/
├── ai-information-hub/          # Frontend (Next.js)
│   ├── app/                     # Paginas + rotas de API
│   │   ├── api/chat/            # Endpoint do chat com IA
│   │   ├── api/report/          # Gerador de relatorios IA
│   │   ├── [lang]/week/         # Paginas SSR semanais (SEO)
│   │   └── feed.xml/            # Feed Atom 1.0
│   ├── components/              # Componentes React
│   │   ├── feeds/               # Feeds de Tech, Investimento, Dicas
│   │   └── video-embed.tsx      # Player do YouTube
│   ├── lib/                     # Utilitarios, tipos, cliente API
│   └── middleware.ts            # Bypass de crawlers + tela de boas-vindas
│
├── ai-hub-backend/              # Backend (FastAPI)
│   ├── app/
│   │   ├── models/              # Modelos SQLAlchemy
│   │   ├── routers/             # Endpoints da API
│   │   └── services/            # Logica de negocios
│   │       ├── collector.py     # Pipeline em 4 estagios
│   │       ├── llm_processor.py # Abordagem LLM com dois modelos
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # Migracoes do BD
│   ├── scripts/                 # Ferramentas CLI (coleta diaria/semanal)
│   └── Dockerfile
│
├── docs/                        # READMEs traduzidos
└── LICENSE
```

## Contribuindo

Contribuicoes sao bem-vindas! Veja como comecar:

1. Faca um fork do repositorio
2. Crie um branch de funcionalidade (`git checkout -b feature/funcionalidade-incrivel`)
3. Faca commit das suas alteracoes (`git commit -m 'Adiciona funcionalidade incrivel'`)
4. Faca push para o branch (`git push origin feature/funcionalidade-incrivel`)
5. Abra um Pull Request

Certifique-se de que seu codigo passa nas verificacoes de CI:
- **Frontend**: `tsc --noEmit` + `next build`
- **Backend**: `ruff check`

## Licenca

Este projeto esta licenciado sob a Licenca MIT — consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**[Demo ao Vivo](https://www.datacubeai.space)** · **[Reportar Bug](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[Solicitar Funcionalidade](https://github.com/Rswcf/DataCube-AI-Space/issues)**

Se voce achou este projeto util, considere dar uma estrela!

</div>
