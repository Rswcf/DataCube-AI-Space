<div align="center">

# Data Cube AI

### 由 AI 策展的每日 AI 新闻。

**双语（德语/英语）AI 新闻聚合器**，自动策展科技突破、投资动态、实用技巧和 YouTube 视频 — 由四阶段 LLM 流水线驱动。

[![MIT 许可证](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![在线演示](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](../README.md) | **简体中文** | [Deutsch](README.de.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

</div>

---

## 什么是 Data Cube AI？

Data Cube AI 自动从 **22 个 RSS 订阅源**、**Hacker News** 和 **YouTube** 收集、分类和摘要 AI 新闻，然后以简洁的双语（德语/英语）界面呈现，支持每日和每周视图。

**已上线 [datacubeai.space](https://www.datacubeai.space)** — 无需登录。

<div align="center">
  <a href="https://github.com/Rswcf/DataCube-AI-Space/raw/main/docs/assets/demo.mp4">
    <img src="assets/demo-thumbnail.png" alt="Data Cube AI 演示视频" width="600">
    <br>
    <strong>▶ 观看演示视频 (84秒)</strong>
  </a>
</div>

## 功能特性

- **科技动态** — AI/ML 技术突破，附带嵌入式 YouTube 视频和影响力评级
- **投资追踪** — 一级市场融资轮次、二级市场数据（通过 Polygon.io 获取实时股价）以及并购交易
- **实用技巧** — 精选自 14 个 Reddit 社区和专家博客
- **双语支持** — 每篇文章同时提供德语和英语版本
- **每日 + 每周** — 自动化每日采集，配合每周汇总视图
- **AI 对话** — 针对本周 AI 新闻进行提问
- **AI 报告** — 一键生成流式报告，支持导出为 Word、HTML、Markdown、纯文本或 JSON
- **SEO/GEO 优化** — SSR 页面、JSON-LD 结构化数据、Atom 订阅、llms.txt、站点地图
- **无障碍访问** — 符合 WCAG 标准：44px 触摸目标、focus-visible、ARIA、prefers-reduced-motion、跳转链接
- **移动优先** — 动态视口、安全区域内边距、触摸优化导航、覆盖层滚动锁定

## 系统架构

```
前端 (Vercel)                        后端 (Railway)
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

## 快速开始

### 前置要求

- Node.js 18+
- Python 3.11+
- PostgreSQL
- API 密钥：[OpenRouter](https://openrouter.ai)、[YouTube Data API v3](https://console.cloud.google.com)、[Polygon.io](https://polygon.io)（可选，用于实时股票数据）

### 前端

```bash
cd ai-information-hub
cp .env.example .env.local    # 添加你的 API 密钥
npm install
npm run dev                   # http://localhost:3000
```

### 后端

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # 添加你的 API 密钥

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### 运行数据采集

```bash
# 每日采集（今天）
python -m scripts.daily_collect

# 每周采集（当前周）
python -m scripts.weekly_collect

# 指定日期/周
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **后端** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **LLM 分类** | GLM-4.5-Air (OpenRouter, 免费层) |
| **LLM 处理** | DeepSeek V3.2 (OpenRouter) |
| **对话与报告** | Aurora Alpha (OpenRouter) |
| **股票数据** | Polygon.io API |
| **托管** | Vercel（前端）、Railway（后端 + 数据库 + 定时任务） |
| **设计** | Instrument Serif 字体、分区配色方案、渐进式动画 |

## 数据流水线

后端通过四阶段流水线处理新闻：

| 阶段 | 处理内容 | 产出 |
|------|----------|------|
| **1. 抓取** | 从 RSS、Hacker News、YouTube 采集数据；按时间段边界过滤 | 约 210 条原始条目 |
| **2. 分类** | LLM 将内容分类为科技/投资/技巧（技巧来源跳过此步骤） | 已分类的内容池 |
| **3. 处理** | 并行 LLM 处理：生成双语摘要、提取实体 | 30 条科技 + 21 条投资 + 15 条技巧 + 5 个视频 |
| **4. 存储** | 保存至 PostgreSQL，将视频穿插入科技动态中 | 数据库记录 |

每日采集产出较少的数量（10 条科技、5 条投资、5 条技巧、2 个视频）。

## API 参考

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/weeks` | GET | 列出时间段（周及其嵌套的日） |
| `/api/tech/{periodId}` | GET | 科技动态，附带嵌入视频 |
| `/api/investment/{periodId}` | GET | 一级市场/二级市场/并购数据 |
| `/api/tips/{periodId}` | GET | 精选技巧 |
| `/api/videos/{periodId}` | GET | YouTube 视频摘要 |
| `/api/stock/{ticker}` | GET | 实时股票数据 |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | 批量股票数据 |
| `/api/admin/collect` | POST | 触发完整数据采集 |

时间段 ID 格式：每日 `YYYY-MM-DD`，每周 `YYYY-kwWW`

运行后端后，可在 `/docs`（Swagger UI）查看完整 API 文档。

## 环境变量

### 前端 (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # 用于对话和报告功能
YOUTUBE_API_KEY=AIza...              # 用于视频元数据
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # 后端地址
```

### 后端 (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # 用于 LLM 分类和处理
YOUTUBE_API_KEY=AIza...              # 用于视频抓取
POLYGON_API_KEY=...                  # 可选：实时股票数据
ADMIN_API_KEY=your-secret-key       # 保护管理端点
CORS_ORIGINS=["http://localhost:3000"]
```

## 部署

### 前端 → Vercel

```bash
cd ai-information-hub
vercel --prod
```

在 Vercel 控制面板中设置环境变量。推送到 `main` 分支时自动部署。

### 后端 → Railway

```bash
cd ai-hub-backend
railway up
```

Railway 在启动时自动执行 Alembic 迁移。配置定时任务以在每天 22:00 UTC 进行每日采集。

## 项目结构

```
DataCube-AI-Space/
├── ai-information-hub/          # 前端 (Next.js)
│   ├── app/                     # 页面 + API 路由
│   │   ├── api/chat/            # AI 对话端点
│   │   ├── api/report/          # AI 报告生成器
│   │   ├── [lang]/week/         # SSR 周页面 (SEO)
│   │   └── feed.xml/            # Atom 1.0 订阅
│   ├── components/              # React 组件
│   │   ├── feeds/               # 科技、投资、技巧动态
│   │   └── video-embed.tsx      # YouTube 播放器
│   ├── lib/                     # 工具函数、类型、API 客户端
│   └── middleware.ts            # 爬虫绕过 + 欢迎页面门控
│
├── ai-hub-backend/              # 后端 (FastAPI)
│   ├── app/
│   │   ├── models/              # SQLAlchemy 模型
│   │   ├── routers/             # API 端点
│   │   └── services/            # 业务逻辑
│   │       ├── collector.py     # 四阶段流水线
│   │       ├── llm_processor.py # 双模型 LLM 方案
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # 数据库迁移
│   ├── scripts/                 # CLI 工具（每日/每周采集）
│   └── Dockerfile
│
├── docs/                        # 多语言 README
└── LICENSE
```

## 参与贡献

欢迎贡献！以下是入门步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

请确保你的代码通过 CI 检查：
- **前端**：`tsc --noEmit` + `next build`
- **后端**：`ruff check`

## 许可证

本项目基于 MIT 许可证发布 — 详情请参阅 [LICENSE](../LICENSE) 文件。

---

<div align="center">

**[在线演示](https://www.datacubeai.space)** · **[报告 Bug](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[功能建议](https://github.com/Rswcf/DataCube-AI-Space/issues)**

如果你觉得这个项目有用，请考虑给它一颗星！

</div>
