<div align="center">

# 🧊 Data Cube AI

### AI がキュレーションする、毎日の AI ニュース。

**バイリンガル（独/英）AI ニュースアグリゲーター** — テクノロジーの進展、投資案件、実践的なヒント、YouTube 動画を 4 段階の LLM パイプラインで自動キュレーション。

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](../README.md) | [简体中文](README.zh-CN.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | **日本語** | [한국어](README.ko.md)

</div>

---

## Data Cube AI とは？

Data Cube AI は **22 の RSS フィード**、**Hacker News**、**YouTube** から AI 関連ニュースを自動で収集・分類・要約し、クリーンなバイリンガル（ドイツ語/英語）インターフェースでデイリービューとウィークリービューを提供します。

**[datacubeai.space](https://www.datacubeai.space) で公開中** — ログイン不要。

<div align="center">

https://github.com/user-attachments/assets/a2a94ed6-a55c-4e76-9ecc-9eef2625188f

</div>

## 機能

- **テックフィード** — YouTube 動画の埋め込みとインパクト評価付きの AI/ML ブレイクスルー
- **投資トラッカー** — プライマリー資金調達ラウンド、セカンダリーマーケットデータ（Polygon.io 経由のリアルタイム株価）、M&A 案件
- **実践ヒント** — 14 の Reddit コミュニティとエキスパートブログから厳選
- **バイリンガル** — すべての記事をドイツ語と英語で提供
- **デイリー + ウィークリー** — 自動デイリー収集とウィークリーロールアップビュー
- **AI チャット** — 今週の AI ニュースについて質問可能
- **AI レポート** — ワンクリックでストリーミングレポートを生成、Word・HTML・Markdown・テキスト・JSON にエクスポート
- **SEO/GEO 最適化** — SSR ページ、JSON-LD 構造化データ、Atom フィード、llms.txt、サイトマップ
- **アクセシビリティ対応** — WCAG 準拠：44px タッチターゲット、focus-visible、ARIA、prefers-reduced-motion、スキップリンク
- **モバイルファースト** — ダイナミックビューポート、セーフエリアインセット、タッチ最適化ナビゲーション、オーバーレイ時のボディスクロールロック

## アーキテクチャ

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

## クイックスタート

### 前提条件

- Node.js 18+
- Python 3.11+
- PostgreSQL
- API キー: [OpenRouter](https://openrouter.ai)、[YouTube Data API v3](https://console.cloud.google.com)、[Polygon.io](https://polygon.io)（任意、リアルタイム株価データ用）

### フロントエンド

```bash
cd ai-information-hub
cp .env.example .env.local    # API キーを追加
npm install
npm run dev                   # http://localhost:3000
```

### バックエンド

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # API キーを追加

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### データ収集の実行

```bash
# デイリー収集（当日）
python -m scripts.daily_collect

# ウィークリー収集（今週）
python -m scripts.weekly_collect

# 特定の日付/週を指定
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## 技術スタック

| レイヤー | 使用技術 |
|---------|----------|
| **フロントエンド** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **バックエンド** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **LLM 分類** | GLM-4.5-Air (OpenRouter, 無料枠) |
| **LLM 処理** | DeepSeek V3.2 (OpenRouter) |
| **チャット & レポート** | Aurora Alpha (OpenRouter) |
| **株価データ** | Polygon.io API |
| **ホスティング** | Vercel（フロントエンド）、Railway（バックエンド + DB + cron） |
| **デザイン** | Instrument Serif、セクション別カラーアクセント、スタガードアニメーション |

## データパイプライン

バックエンドは 4 段階のパイプラインでニュースを処理します:

| ステージ | 処理内容 | 出力 |
|---------|---------|------|
| **1. 取得** | RSS、Hacker News、YouTube から収集; 期間境界でフィルタリング | 約 210 件の生データ |
| **2. 分類** | LLM が tech/investment/tips に分類（tips ソースはスキップ） | カテゴリ分けされたプール |
| **3. 処理** | 並列 LLM 処理: バイリンガル要約の生成、エンティティの抽出 | tech 30 件 + investment 21 件 + tips 15 件 + videos 5 件 |
| **4. 保存** | PostgreSQL に保存、動画をテックフィードに挿入 | データベースレコード |

デイリー収集では件数が少なくなります（tech 10 件、investment 5 件、tips 5 件、videos 2 件）。

## API リファレンス

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/weeks` | GET | 期間一覧（ネストされたデイリーを含むウィークリー） |
| `/api/tech/{periodId}` | GET | 埋め込み動画付きテックフィード |
| `/api/investment/{periodId}` | GET | プライマリー/セカンダリー/M&A データ |
| `/api/tips/{periodId}` | GET | キュレーションされたヒント |
| `/api/videos/{periodId}` | GET | YouTube 動画の要約 |
| `/api/stock/{ticker}` | GET | リアルタイム株価データ |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | バッチ株価データ |
| `/api/admin/collect` | POST | フルデータ収集をトリガー |

期間 ID: デイリー `YYYY-MM-DD` またはウィークリー `YYYY-kwWW`

完全な API ドキュメントはバックエンド起動時に `/docs`（Swagger UI）で利用できます。

## 環境変数

### フロントエンド (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # チャット & レポート機能用
YOUTUBE_API_KEY=AIza...              # 動画メタデータ用
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # バックエンド URL
```

### バックエンド (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # LLM 分類 & 処理用
YOUTUBE_API_KEY=AIza...              # 動画取得用
POLYGON_API_KEY=...                  # 任意: リアルタイム株価データ
ADMIN_API_KEY=your-secret-key       # 管理エンドポイントの保護
CORS_ORIGINS=["http://localhost:3000"]
```

## デプロイ

### フロントエンド → Vercel

```bash
cd ai-information-hub
vercel --prod
```

Vercel ダッシュボードで環境変数を設定してください。`main` ブランチへのプッシュで自動デプロイされます。

### バックエンド → Railway

```bash
cd ai-hub-backend
railway up
```

Railway は起動時に Alembic マイグレーションを自動適用します。毎日 22:00 UTC にデイリー収集を行う cron ジョブを設定してください。

## プロジェクト構成

```
DataCube-AI-Space/
├── ai-information-hub/          # フロントエンド (Next.js)
│   ├── app/                     # ページ + API ルート
│   │   ├── api/chat/            # AI チャットエンドポイント
│   │   ├── api/report/          # AI レポートジェネレーター
│   │   ├── [lang]/week/         # SSR ウィークページ (SEO)
│   │   └── feed.xml/            # Atom 1.0 フィード
│   ├── components/              # React コンポーネント
│   │   ├── feeds/               # テック、投資、ヒントフィード
│   │   └── video-embed.tsx      # YouTube プレイヤー
│   ├── lib/                     # ユーティリティ、型定義、API クライアント
│   └── middleware.ts            # クローラーバイパス + ウェルカムゲート
│
├── ai-hub-backend/              # バックエンド (FastAPI)
│   ├── app/
│   │   ├── models/              # SQLAlchemy モデル
│   │   ├── routers/             # API エンドポイント
│   │   └── services/            # ビジネスロジック
│   │       ├── collector.py     # 4 段階パイプライン
│   │       ├── llm_processor.py # 2 モデル LLM アプローチ
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # DB マイグレーション
│   ├── scripts/                 # CLI ツール (デイリー/ウィークリー収集)
│   └── Dockerfile
│
├── docs/                        # 翻訳版 README
└── LICENSE
```

## コントリビューション

コントリビューションを歓迎します！始め方は以下の通りです:

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

CI チェックをパスすることを確認してください:
- **フロントエンド**: `tsc --noEmit` + `next build`
- **バックエンド**: `ruff check`

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

---

<div align="center">

**[ライブデモ](https://www.datacubeai.space)** · **[バグ報告](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[機能リクエスト](https://github.com/Rswcf/DataCube-AI-Space/issues)**

このプロジェクトが役に立ったら、ぜひスターをお願いします！

</div>
