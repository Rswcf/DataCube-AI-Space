<div align="center">

# 🧊 Data Cube AI

### AI가 큐레이션하는 일간 AI 뉴스.

**8개 언어 AI 뉴스 애그리게이터(DE/EN/ZH/FR/ES/PT/JA/KO)** — 기술 혁신, 투자 동향, 실용 팁, YouTube 동영상을 4.5단계 LLM 파이프라인으로 큐레이션합니다.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](../README.md) | [简体中文](README.zh-CN.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | **한국어**

</div>

---

## Data Cube AI란?

Data Cube AI는 **22개 RSS 피드**, **Hacker News**, **YouTube**에서 AI 뉴스를 자동으로 수집, 분류, 요약하여 깔끔한 8개 언어 인터페이스에 일간 및 주간 뷰로 제공합니다.

**[datacubeai.space](https://www.datacubeai.space)에서 바로 확인** — 로그인이 필요 없습니다.

<div align="center">

https://github.com/user-attachments/assets/9dddaaed-e473-4350-97de-0346cacb6660

</div>

## 주요 기능

- **기술 피드** — YouTube 동영상 임베딩 및 영향력 등급이 포함된 AI/ML 혁신 뉴스
- **투자 트래커** — 1차 시장 펀딩 라운드, 2차 시장 데이터(Polygon.io를 통한 실시간 주가), M&A 거래
- **실용 팁** — 14개 Reddit 커뮤니티 및 전문 블로그에서 큐레이션
- **8개 언어** — DE, EN, ZH, FR, ES, PT, JA, KO 지원
- **일간 + 주간** — 자동 일간 수집 및 주간 종합 뷰
- **AI 채팅** — 이번 주의 AI 뉴스에 대해 질문하기
- **AI 보고서** — 원클릭 스트리밍 보고서, Word, HTML, Markdown, Text, JSON으로 내보내기 가능
- **SEO/GEO 최적화** — SSR 페이지, JSON-LD 구조화 데이터, Atom 피드, llms.txt, 사이트맵
- **접근성** — WCAG 준수: 44px 터치 타겟, focus-visible, ARIA, prefers-reduced-motion, 건너뛰기 링크
- **모바일 우선** — 동적 뷰포트, safe area insets, 터치 최적화 내비게이션, 오버레이 시 바디 스크롤 잠금

## 아키텍처

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

## 빠른 시작

### 사전 요구사항

- Node.js 18+
- Python 3.11+
- PostgreSQL
- API 키: [OpenRouter](https://openrouter.ai), [YouTube Data API v3](https://console.cloud.google.com), [Polygon.io](https://polygon.io) (선택 사항, 실시간 주가 데이터용)

### 프론트엔드

```bash
cd ai-information-hub
cp .env.example .env.local    # API 키를 입력하세요
npm install
npm run dev                   # http://localhost:3000
```

### 백엔드

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # API 키를 입력하세요

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### 데이터 수집 실행

```bash
# 일간 수집 (오늘)
python -m scripts.daily_collect

# 주간 수집 (이번 주)
python -m scripts.weekly_collect

# 특정 날짜/주 지정
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## 기술 스택

| 레이어 | 기술 |
|-------|-----------|
| **프론트엔드** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **백엔드** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **LLM 분류** | GLM-4.5-Air (OpenRouter, 무료 티어) |
| **LLM 처리** | DeepSeek V4 Flash (OpenRouter, 주 모델; V3.2는 폴백) |
| **채팅 및 보고서** | openrouter/free (OpenRouter) |
| **주가 데이터** | Polygon.io API |
| **호스팅** | Vercel (프론트엔드), Railway (백엔드 + DB + 크론) |
| **디자인** | Newsreader 글꼴, 아이소메트릭 큐브 로고, 섹션별 색상 강조, 시차 애니메이션 |

## 데이터 파이프라인

백엔드는 4.5단계 파이프라인을 통해 뉴스를 처리합니다:

| 단계 | 처리 내용 | 출력 |
|-------|-------------|--------|
| **1. 수집** | RSS, Hacker News, YouTube에서 수집; 기간 경계 필터링 | ~210개 원시 항목 |
| **2. 분류** | LLM이 기술/투자/팁으로 분류 (팁 소스는 이 단계를 건너뜀) | 카테고리별 풀 |
| **3. 처리** | 병렬 LLM 처리: DE/EN 기본 요약 생성, 엔티티 추출 | 30 기술 + 21 투자 + 15 팁 + 5 동영상 |
| **3.5. 번역** | EN → ZH, FR, ES, PT, JA, KO를 모델 체인으로 번역 | 항목당 6개 언어 추가 |
| **4. 저장** | PostgreSQL에 저장, 동영상을 기술 피드에 배치 | 데이터베이스 레코드 |

일간 수집은 축소된 수량으로 생성됩니다 (10 기술, 5 투자, 5 팁, 2 동영상).

## API 레퍼런스

| 엔드포인트 | 메서드 | 설명 |
|----------|--------|-------------|
| `/api/weeks` | GET | 기간 목록 조회 (일간이 포함된 주간) |
| `/api/tech/{periodId}` | GET | 동영상이 포함된 기술 피드 |
| `/api/investment/{periodId}` | GET | 1차 시장/2차 시장/M&A 데이터 |
| `/api/tips/{periodId}` | GET | 큐레이션된 팁 |
| `/api/trends/{periodId}` | GET | 기간별 트렌드 주제 |
| `/api/videos/{periodId}` | GET | YouTube 동영상 요약 |
| `/api/stock/{ticker}` | GET | 실시간 주가 데이터 |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | 배치 주가 데이터 |
| `/api/admin/collect` | POST | 전체 데이터 수집 트리거 |

기간 ID: 일간 `YYYY-MM-DD` 또는 주간 `YYYY-kwWW`

백엔드 실행 시 `/docs` (Swagger UI)에서 전체 API 문서를 확인할 수 있습니다.

## 환경 변수

### 프론트엔드 (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # 채팅 및 보고서 기능용
YOUTUBE_API_KEY=AIza...              # 동영상 메타데이터용
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # 백엔드 URL
```

### 백엔드 (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # LLM 분류 및 처리용
YOUTUBE_API_KEY=AIza...              # 동영상 가져오기용
POLYGON_API_KEY=...                  # 선택 사항: 실시간 주가 데이터
ADMIN_API_KEY=your-secret-key       # 관리자 엔드포인트 보호
CORS_ORIGINS=["http://localhost:3000"]
```

## 배포

### 프론트엔드 → Vercel

```bash
cd ai-information-hub
vercel --prod
```

Vercel 대시보드에서 환경 변수를 설정하세요. `main` 브랜치에 푸시하면 자동으로 배포됩니다.

### 백엔드 → Railway

```bash
cd ai-hub-backend
railway up
```

Railway는 시작 시 Alembic 마이그레이션을 자동으로 적용합니다. 일간 수집은 GitHub Actions를 통해 자동화됩니다 (베를린 시간 23:xx).

## 프로젝트 구조

```
DataCube-AI-Space/
├── ai-information-hub/          # 프론트엔드 (Next.js)
│   ├── app/                     # 페이지 + API 라우트
│   │   ├── api/chat/            # AI 채팅 엔드포인트
│   │   ├── api/report/          # AI 보고서 생성기
│   │   ├── [lang]/week/         # SSR 주간 페이지 (SEO)
│   │   ├── [lang]/news/         # 기사 페이지 (SEO/GEO)
│   │   ├── [lang]/topic/        # 토픽 허브
│   │   ├── [lang]/tools/        # 현지화된 도구 페이지
│   │   └── feed.xml/            # Atom 1.0 피드
│   ├── components/              # React 컴포넌트
│   │   ├── feeds/               # 기술, 투자, 팁 피드
│   │   └── video-embed.tsx      # YouTube 플레이어
│   ├── lib/                     # 유틸리티, 타입, API 클라이언트
│   └── middleware.ts            # 크롤러 바이패스 + 환영 게이트
│
├── ai-hub-backend/              # 백엔드 (FastAPI)
│   ├── app/
│   │   ├── models/              # SQLAlchemy 모델
│   │   ├── routers/             # API 엔드포인트
│   │   └── services/            # 비즈니스 로직
│   │       ├── collector.py     # 4.5단계 파이프라인
│   │       ├── llm_processor.py # 이중 모델 LLM 접근법
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # DB 마이그레이션
│   ├── scripts/                 # CLI 도구 (일간/주간 수집)
│   └── Dockerfile
│
├── docs/                        # 번역된 README
└── LICENSE
```

## 기여하기

기여를 환영합니다! 시작하는 방법은 다음과 같습니다:

1. 저장소를 포크하세요
2. 기능 브랜치를 생성하세요 (`git checkout -b feature/amazing-feature`)
3. 변경 사항을 커밋하세요 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. 풀 리퀘스트를 여세요

코드가 CI 검사를 통과하는지 확인해 주세요:
- **프론트엔드**: `tsc --noEmit` + `next build`
- **백엔드**: `ruff check`

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다 — 자세한 내용은 [LICENSE](../LICENSE) 파일을 참조하세요.

---

<div align="center">

**[라이브 데모](https://www.datacubeai.space)** · **[버그 신고](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[기능 요청](https://github.com/Rswcf/DataCube-AI-Space/issues)**

이 프로젝트가 유용하셨다면 별을 눌러주세요!

</div>
