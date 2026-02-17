# Data Cube AI — 品牌指南

版本 1.0 | 2026 年 2 月

---

## 1. 品牌概述

### 品牌故事

每天有 500+ 篇 AI 相关文章发布，但大多数专业人士只读 3 篇。Data Cube AI 应运而生——一个开源 AI 新闻聚合器，扫描 40+ 信息源，通过四阶段 LLM 管道对内容进行分类和摘要，为用户提供 3 分钟即可读完的德英双语新闻。

### 使命

通过免费、开源的方式，为所有人提供 AI 领域最重要的技术突破、投资信号和实用技巧。

### 愿景

成为 AI 从业者每日信赖的信息伙伴——无需信息过载，即可保持行业前沿洞察。

### 核心价值

| 价值观 | 含义 |
|--------|------|
| **清晰** | 穿透噪声——传递信号，而非堆砌信息量 |
| **可及** | 免费、开源、双语、符合 WCAG 无障碍标准 |
| **可信** | 透明来源、不做主观评论、MIT 开源协议 |
| **高效** | 3 分钟日报——尊重读者的时间 |

### 品牌原型

**智者 (The Sage)** — 我们寻求真相、分享知识。我们的角色是帮助受众通过经过筛选的、可信的信息理解 AI 世界。

### 品牌定位

> 面向需要保持行业前沿的 AI 从业者和科技爱好者，
> **Data Cube AI** 是一个双语新闻聚合平台，
> 每日 3 分钟即可掌握最重要的 AI 新闻。
> 与 Feedly AI 或 Google News 不同，
> 我们免费、开源，同时提供德语和英语内容。

### 品牌标语

**主标语 (EN):** Your daily AI news, curated by AI.
**主标语 (DE):** Ihre täglichen KI-News, von KI kuratiert.

**辅助文案：**
- "40+ 信息源。3 分钟。每一天。"
- "AI news in 3 minutes — daily curated, bilingual."

---

## 2. Logo 标识

### 主 Logo

Data Cube AI 的 Logo 是一个**等距立方体 (Isometric Cube)**，三个可见面分别使用品牌的三大内容板块色：

1. **右侧面 — 科技 (Tech)**：蓝色渐变 `#60A5FA` → `#2563EB`
2. **左侧面 — 技巧 (Tips)**：青绿色渐变 `#2DD4BF` → `#0D9488`
3. **底部面 — 投资 (Investment)**：琥珀色渐变 `#FBBF24` → `#D97706`

```
       ╱╲
      ╱ T ╲        T = 青绿 (Tips)
     ╱    ╲       B = 蓝色 (Tech)
    ├──────┤       A = 琥珀 (Investment)
    │ B  ╱ │
    │  ╱ A │
    └──────┘
```

**设计理念 — "知识棱镜"**：原始信息进入立方体，被分解为三条结构化的知识流——科技、投资、技巧。

### Logo 变体

| 变体 | 使用场景 |
|------|---------|
| **立方体 + 文字标识** | 桌面端侧边栏（`LogoCube` 组件 + "Data Cube" 文字） |
| **仅立方体** | Favicon、移动端导航、社交媒体头像 |
| **仅文字标识** | 立方体已在附近单独出现时 |

### Logo 文件

| 文件 | 用途 |
|------|------|
| `components/logo-cube.tsx` | React 组件（`useId()` 确保渐变 ID 唯一） |
| `public/logo-cube.svg` | 独立 SVG（512×512，用于外部营销素材） |
| `public/icon.svg` | Favicon（180×180，深色圆角背景 `#111827`） |

### 安全空间

Logo 四周的最小安全空间等于立方体高度的 25%。

### 最小尺寸

- **数字媒介**：32px（仅立方体），160px（立方体 + 文字标识）
- **印刷**：12mm（仅立方体），50mm（立方体 + 文字标识）

### 错误用法

- 不要旋转立方体
- 不要更改三面的颜色
- 不要添加特效（投影、描边、发光——组件自带 drop-shadow 除外）
- 不要拉伸或变形比例
- 不要放置在复杂背景上（除非使用遮罩层）

---

## 3. 色彩体系

所有颜色使用 OKLCH 色彩空间，确保感知均匀性。

### 主色板

| 颜色 | 浅色模式 | 深色模式 | 用途 | 60/30/10 比例 |
|------|---------|---------|------|--------------|
| **品牌蓝 (Primary)** | `oklch(0.55 0.2 250)` | `oklch(0.65 0.18 250)` | 品牌标识、CTA、链接、选中状态 | 60% |
| **品牌青 (Accent)** | `oklch(0.5 0.18 165)` | `oklch(0.55 0.2 165)` | Logo 渐变终点、次要 CTA | 10% |

### 板块色彩

每个内容板块拥有独特的强调色，形成即时视觉识别：

| 板块 | 浅色模式 | 深色模式 | 色相 | 用途 |
|------|---------|---------|-----|------|
| **科技 (Tech)** | `oklch(0.55 0.2 250)` | `oklch(0.65 0.18 250)` | 蓝 250 | 科技 Feed 卡片、头部、徽章 |
| **投资 (Investment)** | `oklch(0.7 0.15 85)` | `oklch(0.75 0.15 85)` | 琥珀 85 | 投资 Feed、股票数据、融资 |
| **技巧 (Tips)** | `oklch(0.6 0.18 155)` | `oklch(0.6 0.2 155)` | 翡翠 155 | 技巧 Feed、实用内容 |
| **视频 (Video)** | `oklch(0.65 0.2 25)` | `oklch(0.65 0.22 25)` | 珊瑚 25 | 视频嵌入、YouTube 内容 |

### 中性色板

| Token | 浅色模式 | 深色模式 | 用途 |
|-------|---------|---------|------|
| **Background** | `oklch(0.98 0.005 260)` | `oklch(0.12 0.01 260)` | 页面背景 |
| **Card** | `oklch(1 0 0)` | `oklch(0.16 0.01 260)` | 卡片表面 |
| **Foreground** | `oklch(0.15 0.01 260)` | `oklch(0.96 0.01 260)` | 主要文字 |
| **Muted** | `oklch(0.45 0.01 260)` | `oklch(0.65 0.01 260)` | 次要文字 |
| **Border** | `oklch(0.88 0.005 260)` | `oklch(0.28 0.01 260)` | 分割线、卡片边框 |
| **Sidebar** | `oklch(0.96 0.005 260)` | `oklch(0.14 0.01 260)` | 侧边栏背景 |

### 语义色

| Token | 值 | 用途 |
|-------|---|------|
| **Destructive** | `oklch(0.55 0.22 25)` | 错误状态、删除操作 |
| **Success** | Green 600 / Green 400（深色） | 订阅成功确认 |
| **Ring** | 与 Primary 相同 | 焦点状态 (`focus-visible:ring-2`) |

### 色彩使用规则

1. **板块强调色** 用于：卡片悬停 (`hover:bg-*-accent/5`)、Section Header 渐变 (`.section-header-*`)、左边框强调 (`border-l-4`)、影响力徽章
2. **绝不混用** 不同板块的强调色——每个 Feed 板块保持单色调
3. **深色模式** 所有强调色亮度 +0.1，确保在深色背景上的可见性
4. **渐变头部** 使用 135 度角：`linear-gradient(135deg, accent/0.08, secondary-accent/0.05)`

---

## 4. 字体排版

### 字体栈

| 角色 | 字体 | 字重 | CSS 变量 | Tailwind 类 |
|------|------|------|---------|-------------|
| **展示/标题** | Newsreader | 400, 500, 600, 700 + 斜体 | `--font-display` | `font-display` |
| **正文/UI** | Geist | 100–900 | `--font-sans` | `font-sans`（默认） |
| **代码** | Geist Mono | 400 | `--font-mono` | `font-mono` |

### 选择理由

- **Newsreader**：由 Production Type 为 Google 设计，专为屏幕新闻阅读优化。多字重支持真正的排版层级。中等笔画对比度在所有尺寸下清晰渲染。
- **Geist**：Vercel 的系统字体，灵感来自瑞士新无衬线体。高 x-height、9 种字重，为 UI 和 Web 应用优化。
- **Geist Mono**：配套等宽字体。与 Geist 共享设计基因，在代码块中保持视觉一致性。

### 字体层级

| 元素 | 字体 | 字重 | 大小 | 行高 | 用途 |
|------|------|------|------|------|------|
| **展示 H1** | Newsreader | Bold (700) | 2xl (1.5rem) | 1.3 | 报告标题、Hero 文字 |
| **板块 H2** | Newsreader | Bold (700) | lg (1.125rem) | 1.4 | 周概览、板块标题 |
| **板块 H3** | Newsreader | Semibold (600) | lg (1.125rem) | 1.4 | Feed 板块标题、聊天标题 |
| **卡片标题** | Geist | Semibold (600) | base (1rem) | 1.5 | 文章标题、卡片头部 |
| **正文** | Geist | Regular (400) | base (1rem) | 1.5 | 文章内容、描述 |
| **注释** | Geist | Regular (400) | xs (0.75rem) | 1.5 | 元数据、日期、分类 |
| **标签** | Geist | Semibold (600) | xs (0.75rem) | 1.5 | 徽章、标签、分类标签 |
| **按钮** | Geist | Semibold (600) | sm (0.875rem) | 1.25 | 所有按钮和 CTA |
| **代码** | Geist Mono | Regular (400) | 0.9em | 1.6 | 行内代码、代码块 |
| **金融数字** | Geist + `tabular-nums` | Semibold (600) | 可变 | — | 股价、百分比、市值 |

### 排版规则

1. **Newsreader 仅用于标题** — 绝不在正文、标签或按钮中使用 `font-display`
2. **所有金融数字** 使用 `tabular-nums` 确保数字对齐
3. **响应式尺寸**：板块标题使用 `text-base sm:text-lg`（手机 16px，桌面 18px）
4. **行宽**：正文不超过 75 字符/行（由卡片 max-width 控制）
5. **禁止伪粗体**：Newsreader 有真实的 Bold (700) 和 Semibold (600) 字重——始终使用正确的字重类

---

## 5. 品牌语调

### 语调特征

| 特征 | 我们是 | 我们不是 |
|------|--------|---------|
| **信息丰富** | 基于事实、数据驱动、精准 | 学术化、枯燥、说教式 |
| **高效** | 简洁、可扫描、直击要点 | 简短到冷漠、生硬、机器人式 |
| **值得信赖** | 标注来源、透明、中立 | 主观臆断、耸动、标题党 |
| **双语** | 德英双语自然流畅 | 生硬翻译、语言混杂 |

### 语境中的语气光谱

```
严肃/信息化 ◄──────────────────────► 轻松/对话式

Newsletter      ●──────────────────────────
文章摘要        ──●────────────────────────
错误提示        ────────●──────────────────
聊天助手        ──────────────●────────────
社交媒体        ─────────────────●─────────
登录页面        ──────────────────────●────
```

### 写作规范

**应该：**
- 文章摘要以关键事实开头
- 始终标注来源
- 使用主动语态（"阿里巴巴发布..."而非"一个新模型被发布了..."）
- 摘要保持 2-3 句话
- 德英双语使用平行结构（传达相同信息）

**不应该：**
- 加入主观评论（"这太令人惊叹了！"）
- 使用标题党手法
- 在同一段文字中混用德语和英语
- 使用 AI 炒作用语（"革命性的"、"颠覆性的"、"开创性的"）
- 对目标受众过度解释显而易见的技术概念

### 内容格式

| 内容类型 | 格式 |
|---------|------|
| **科技摘要** | 来源 + 日期 + 标签 + 2-3 句摘要 + 话题标签 + 原文链接 |
| **投资条目** | 公司 + 交易类型 + 金额 + 上下文一句话 |
| **实用技巧** | 标题 + 难度徽章 + 可操作的段落 |
| **Newsletter 主题行** | "KI-News: [核心新闻] | [日期]"（DE）/ "AI News: [核心新闻] | [日期]"（EN）|

---

## 6. 图标系统

### 图标库

- **来源**：Lucide React（与 Shadcn/ui 一致）
- **尺寸**：16px（sm）、20px（md/默认）、24px（lg）
- **描边**：2px（Lucide 默认值）
- **颜色**：继承父元素文字颜色，除非有板块特定颜色

### 板块图标

| 板块 | 图标 | 颜色 |
|------|------|------|
| **科技** | `Cpu` | `text-primary`（蓝） |
| **投资** | `TrendingUp` | `text-invest-accent`（琥珀） |
| **技巧** | `Lightbulb` | `text-tips-accent`（翡翠） |
| **视频** | `Play` | `text-video-accent`（珊瑚） |
| **搜索** | `Search` | `text-muted-foreground` |
| **设置** | `Settings` | `text-muted-foreground` |
| **Newsletter** | `Mail` | `text-primary` |
| **支持** | `Heart` | `text-pink-500` |

### 无障碍

- 所有装饰性图标必须使用 `aria-hidden="true"`
- 所有仅图标按钮必须有 `aria-label`
- 图标不应作为唯一的含义传达方式——始终搭配文字或 Tooltip

---

## 7. 布局与间距

### 栅格系统

```
桌面端 (最大宽度 1280px):
┌──────────┬────────────────────────┬──────────────┐
│ 侧边栏   │       主内容区          │   右侧边栏   │
│  240px   │       弹性宽度          │    320px     │
│ (xl:block)│                       │  (lg:block)  │
└──────────┴────────────────────────┴──────────────┘

平板端 (768-1023px):
┌────┬──────────────────────────────────────┐
│ 64 │              主内容区                │
│ px │                                      │
└────┴──────────────────────────────────────┘

移动端 (<768px):
┌──────────────────────────────────────────┐
│              主内容区                     │
│                                          │
├──────────────────────────────────────────┤
│           底部导航栏                      │
└──────────────────────────────────────────┘
```

### 间距尺度

基于 Tailwind 的 4px 基准单位：

| Token | 值 | 用途 |
|-------|---|------|
| `1` | 4px | 紧凑间隙（徽章内边距） |
| `2` | 8px | 紧凑间距（关联元素之间） |
| `3` | 12px | 标准间距（卡片内部填充） |
| `4` | 16px | 板块填充、卡片间距 |
| `5` | 20px | 主要板块分隔 |
| `6` | 24px | 大型板块分隔 |
| `8` | 32px | 页面级间距 |

### 圆角

| Token | 值 | 用途 |
|-------|---|------|
| `rounded-lg` | 8px | 卡片、输入框 |
| `rounded-xl` | 12px | 大卡片、面板 |
| `rounded-full` | 9999px | 按钮、徽章、药丸形 |

---

## 8. 组件规范

### 卡片

```
┌──────────────────────────────────────┐
│ ┃ 来源  ✓  @账号  ·  日期           │  ← 头部 (Geist, muted)
│ ┃                                    │
│ ┃ [标签] [影响力: 高]                │  ← 徽章
│ ┃                                    │
│ ┃ 摘要文字使用 Geist Regular         │  ← 正文 (Geist Regular)
│ ┃ 字重，base 大小...                 │
│ ┃                                    │
│ ┃ #标签1  #标签2  #标签3             │  ← 话题标签 (primary 色)
│ ┃ ↗ 来源: 名称                       │  ← 来源链接
│ ┃ ⤴ 分享                             │  ← 操作
└──────────────────────────────────────┘
  ↑ 左边框按影响力/板块着色
```

- **悬停**：`hover:bg-{section}-accent/5` 配合 `cursor-pointer`
- **动画**：`animate-fade-up` 交错延迟 50ms（最多 10 张卡片）
- **加载**：`animate-shimmer` 骨架屏（禁止使用 `animate-pulse`）

### 按钮

| 变体 | 样式 | 用途 |
|------|------|------|
| **主要** | 实心渐变 `from-primary to-accent`，白色文字 | 订阅、主要 CTA |
| **次要** | `bg-secondary text-secondary-foreground` | 主题/语言切换 |
| **幽灵** | 透明，悬停 `bg-secondary` | 导航项 |
| **危险** | 红色背景 | 删除、取消操作 |

所有按钮：
- 最小触控目标：44x44px
- `focus-visible:ring-2 focus-visible:ring-ring`
- `transition-colors`（禁止 `transition-all`）
- 移动端 `active:scale-95` 按压反馈

### 板块头部

```css
/* 渐变背景 + 左侧强调边框 + Newsreader 标题 */
.section-header-tech {
  background: linear-gradient(135deg, tech-accent/0.08, teal/0.05);
  border-left: 4px solid tech-accent;
}
```

模式：`.section-header-{tech|invest|tips}` 内部使用 `font-display font-semibold` 标题。

---

## 9. 动画与动效

### 原则

1. **有目的**：动画用于传达状态变化，而非装饰
2. **简短**：微交互 150-300ms
3. **尊重用户**：所有动画遵循 `prefers-reduced-motion: reduce`

### 动画清单

| 动画 | 时长 | 缓动 | 用途 |
|------|------|------|------|
| `animate-fade-up` | 400ms | ease-out | 卡片入场（交错） |
| `animate-shimmer` | 1.5s | linear, 循环 | 加载骨架屏 |
| `animate-slide-left` | 300ms | ease-out | Tab 切换（向前） |
| `animate-slide-right` | 300ms | ease-out | Tab 切换（向后） |
| `transition-colors` | 200ms | ease | 悬停状态 |
| `transition-opacity` | 200ms | ease | 淡入/淡出 |

### 减弱动效

当 `prefers-reduced-motion: reduce` 激活时，所有自定义动画将被禁用。这在 `globals.css` 中全局执行：

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-shimmer,
  .animate-slide-left,
  .animate-slide-right { animation: none; }
}
```

---

## 10. 无障碍

### 标准

- **目标**：WCAG 2.1 AA 合规
- **对比度**：普通文字最低 4.5:1，大文字最低 3:1
- **触控目标**：所有交互元素最小 44x44px

### 实施清单

- [x] 所有交互元素使用 `focus-visible:ring-2`
- [x] 所有装饰性图标使用 `aria-hidden="true"`
- [x] 弹窗使用 `role="dialog" aria-modal="true" aria-labelledby`
- [x] 布局中包含跳转链接 (`#main-content`)
- [x] 全局尊重 `prefers-reduced-motion`
- [x] 金融数据使用 `tabular-nums`
- [x] 所有弹窗锁定页面滚动
- [x] iPhone 刘海屏安全区域适配 (`viewport-fit: cover`)
- [x] Mobile Safari 动态视口高度 (`min-h-dvh`)
- [x] `overflow-x-hidden` 防止移动端横向滚动

---

## 11. 数字触点

### 网站

- **URL**：https://www.datacubeai.space
- **托管**：Vercel（前端）、Railway（后端）
- **主题**：浅色（默认）+ 深色模式切换
- **语言**：德语（默认）+ 英语切换

### Newsletter

- **平台**：Resend（发送）+ Beehiiv（订阅者管理）
- **格式**：品牌色彩的 HTML 邮件，含板块标题
- **主题行格式**："KI-News: [标题] | [日期]"（DE）/ "AI News: [标题] | [日期]"（EN）
- **频率**：每日摘要
- **个性化**：每位订阅者按其偏好语言收到一封邮件

### 社交媒体

| 平台 | 账号 | 头像 | 内容类型 |
|------|------|------|---------|
| **GitHub** | @Rswcf/DataCube-AI-Space | DC 字母标识 | 版本发布、开源更新 |
| **Ko-fi** | @datacubeai | DC 字母标识 | 支持页面 |

### Atom Feed

- **URL**：`/feed.xml?lang=de` 或 `?lang=en`
- **格式**：Atom 1.0
- **内容**：最近 2 周的科技文章

### AI 爬虫

- **llms.txt**：位于 `/llms.txt`，包含权威信息和引用格式
- **robots.txt**：允许所有主要 AI 爬虫（GPTBot、ClaudeBot、PerplexityBot 等）

---

## 12. 品牌应用示例

### 社交媒体头像

```
256x256px
┌────────────────┐
│                │
│     ┌────┐     │
│     │ DC │     │
│     └────┘     │
│                │
└────────────────┘
背景：品牌渐变 (primary → accent)
文字：白色，Geist Bold
圆角：各平台默认值
```

### 邮件签名

```
—
[姓名]
Data Cube AI
datacubeai.space
Your daily AI news, curated by AI.
```

### Open Graph / 社交分享预览

```
1200x630px
┌──────────────────────────────────────┐
│                                      │
│     DC  Data Cube AI                 │
│                                      │
│     Your daily AI news,              │
│     curated by AI.                   │
│                                      │
│     datacubeai.space                 │
└──────────────────────────────────────┘
背景：深色 (oklch 0.12)，渐变叠加
Logo：等距立方体标识 + 文字标识
文字：标语用 Newsreader，URL 用 Geist
```

---

## 13. 品牌禁忌

| 规则 | 原因 |
|------|------|
| 禁止使用 Emoji 作为 UI 图标 | 使用 Lucide SVG 图标保持一致性 |
| 禁止使用 `transition-all` | 仅使用明确的 transition 属性以保证性能 |
| 禁止使用 `animate-pulse` | 所有加载状态统一使用 `animate-shimmer` |
| 禁止在 Feed 中放置 Newsletter CTA | Newsletter 仅保留在右侧边栏 |
| 禁止混用不同板块的强调色 | 每个 Feed 板块保持单色调 |
| 禁止在 Newsreader 上使用伪粗体 | 始终使用真实字重 (400/500/600/700) |
| 禁止在 18px 以下使用 Newsreader | 展示字体设计用于较大尺寸 |
| 禁止省略来源标注 | 每篇文章必须标注原始来源 |

---

## 附录：CSS Token 速查

### Token 快速查找

```css
/* 主色 */
--primary:         oklch(0.55 0.2 250);   /* 蓝 */
--accent:          oklch(0.5 0.18 165);   /* 青 */

/* 板块强调色 */
--tech-accent:     oklch(0.55 0.2 250);   /* 蓝 (= primary) */
--invest-accent:   oklch(0.7 0.15 85);    /* 琥珀 */
--tips-accent:     oklch(0.6 0.18 155);   /* 翡翠 */
--video-accent:    oklch(0.65 0.2 25);    /* 珊瑚 */

/* 字体 */
--font-display:    'Newsreader', serif;
--font-sans:       'Geist', 'Geist Fallback';
--font-mono:       'Geist Mono', 'Geist Mono Fallback';

/* 圆角 */
--radius:          0.5rem;                 /* 基准 8px */
```

### 字体加载 (Next.js)

```typescript
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-display" });
```

---

*本文档是 Data Cube AI 品牌标识的唯一真实来源。所有设计决策应参考本指南。2026 年 2 月更新。*
