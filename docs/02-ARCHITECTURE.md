# Conflux 核心架构

文档基线：`v1.0 稳定化阶段 / Roadmap Solidified`

## 1. 架构定位

本文件描述的是“当前代码真实架构”与“已被版本路线图约束的未来演进方向”，不是理想化蓝图。

当前代码已经同时包含：

- `v0.9` 的段落级本地推荐主链
- `v1.0` 的长文切块与线程串联主链

因此当前工程称呼仍然是：`v1.0 稳定化阶段`。

## 2. 当前技术基线

Conflux 当前是一套纯前端 React MVP，技术栈为：

- `React 19`
- `Vite 8`
- `Tailwind CSS 4`
- `Zustand`
- `TipTap`
- `framer-motion`
- `react-force-graph-2d`

当前架构纪律有 5 条：

- 数据保持扁平，知识单元以 `fluxBlocks` 为核心，不引入文件夹树。
- 路由围绕 `/feed`、`/write`、`/graph` 三个视角组织。
- 状态流转优先走 Zustand，业务状态和 UI 状态保持边界清晰。
- AI 交互以 `BYOK` 为前提，默认由前端直连兼容 OpenAI Chat Completions 的接口。
- 智能能力优先走“本地预筛 -> 用户确认 -> 精确调用模型”的漏斗，不回退到侵入式正文交互。

## 3. 当前路由职责

### `/feed`

当前负责：

- 展示全部知识块
- 承载 `Omni Filter`、`Quick Capture`、Grid/List 视图切换
- 基于查询词和标签交集过滤 `fluxBlocks`
- 在当前结果集内推导引用关系和维度重叠关系
- 接收来自侧边栏 `stage / source` 概览的轻量全局过滤跳转

### `/write`

当前负责：

- 创建和编辑单个知识块
- 自动保存标题与正文
- 管理当前 block 的主维度标签与补充元数据
- 挂载 TipTap 编辑器与 `Adaptive Lens`
- 提供右侧 `Peek Drawer`
- 触发段落级 `Phantom Weaving` 与 `Crystal Assimilation`

### `/graph`

当前负责：

- 把扁平知识块投影成关系图
- 帮助用户从“网络”而不是“列表”理解知识密度
- 验证维度重叠和引用关系是否自然形成结构张力

## 4. 当前模块结构

当前代码的主要模块分布如下：

- `src/pages/FeedPage.jsx`：Feed 组合层与 Quick Capture 主流程
- `src/pages/EditorPage.jsx`：写作页组合层与状态编排
- `src/pages/GraphPage.jsx`：图谱组合层
- `src/components/editor/PeekDrawer.jsx`：右侧参考抽屉、推荐候选与版本历史
- `src/components/assimilation/AssimilationPreviewModal.jsx`：原文更新预览弹层
- `src/components/sidebar/`：侧边栏轻量管理组件
- `src/components/editor/`：TipTap 编辑器与 `Adaptive Lens` 扩展
- `src/features/recommendation/`：段落级本地推荐引擎
- `src/features/metadata/`：补充元数据概览与轻量统计
- `src/features/graph/`：图谱渲染、搜索、相机控制与常量
- `src/features/pools/`：Pool 上下文与筛选工具
- `src/store/useFluxStore.js`：全局状态、持久化、revision、Pool 事件与本地 AI 任务记录
- `src/utils/documentChunker.js`：长文切块与线程标签
- `src/utils/relations.js`：Feed / Graph 共用关系推导
- `scripts/verify-phantom.mjs`：长文切块与本地推荐的极限回归入口

## 5. 当前核心数据模型

### 5.1 `fluxBlocks`

系统主数据源是 `fluxBlocks: FluxBlock[]`。

```ts
type FluxBlock = {
  id: string
  title: string
  content: string
  dimensions: {
    domain: string[]
    format: string[]
    project: string[]
    stage: string[]
    source: string[]
  }
  createdAt?: string
  updatedAt?: string
  revisions?: {
    id: string
    kind: 'assimilation' | 'restore' | 'rollback'
    beforeContent: string
    afterContent: string
    contextParagraph?: string
    sourceBlockId?: string | null
    sourceBlockTitle?: string
    sourceRevisionId?: string
    createdAt: string
  }[]
}
```

关键约束：

- 没有 `parentId`
- 没有目录路径
- 所有关联都通过引用、维度重叠或运行时推导生成

### 5.2 运行时状态

当前 Zustand 中除了持久化数据，也承载少量跨页面运行时状态：

- `peekBlockId`
- `activePoolContext`
- `recentPoolEvents`
- `recentAiTasks`

其中：

- `peekBlockId` 不进持久化层
- `activePoolContext`、`recentPoolEvents` 与 `recentAiTasks` 进入持久化层，用于跨视图连续体验与本地任务回看
- onboarding seed 与默认 `savedPools` 只在首次冷启动且本地缺失对应持久化结构时注入；用户后续主动删空数据后，不会在刷新时被自动补回

## 6. 当前主链架构

### 6.1 Longform Capture Pipeline

当前链路：

1. 用户在 `Quick Capture` 输入内容
2. 若内容超过安全阈值，则进入本地 `Semantic Auto-Chunking`
3. 系统按标题、双换行与句末符做保守切分
4. 切块共享 `threadId`
5. 通过 `project / source` 注入线程标签
6. 批量调用 `addBlocks()` 落盘
7. 默认跳过逐块 AI 打标，避免并发洪峰

### 6.2 Phantom Weaving

当前链路：

1. 用户在 `/write` 中持续写作
2. 当输入停止 `2500ms` 后，只提取光标所在自然段落
3. 本地 `Entity Lexicon + Fuse.js` 做高置信预筛
4. 命中后只浮出右下角轻提示
5. 用户主动点击后，右侧 Drawer 打开候选笔记

### 6.3 Crystal Assimilation

当前链路：

1. 用户在 Drawer 中点击 `更新原文`
2. 系统读取当前段落与目标原始笔记全文
3. 调用模型生成融合后的更新正文
4. 结果先进入差异预览
5. 用户确认后才写回目标 block，并记录 revision
6. 本地 `recentAiTasks` 记录动作状态，但暂不承担真正队列职责

## 7. Roadmap 约束下的架构分期

从本文件开始，所有架构问题都必须进入明确版本，不再保留自由漂浮的技术债描述。

### 7.1 `v1.1` 架构任务

只处理主动感知与输入拆解：

- `Hybrid Search`：把段落推荐从单纯 `Fuse.js` 升级为“词典 + Embedding”混合召回
- `Intent Fission`：把 Quick Capture 从物理切块升级为带主题分离的智能拆解

### 7.2 `v1.2` 架构任务

只处理编辑器成熟度：

- `Local Media Support`：引入 `IndexedDB` 承载本地图片与媒体资源
- `Outliner & Fold`：为主编辑器与 `Peek Drawer` 提供 TOC、大纲导航与折叠能力

### 7.3 `v1.3` 架构任务

只处理知识流治理与编排视图：

- `Infinite Canvas / Whiteboard`：提供自由拖拽二维看板
- `Advanced Properties`：提供表格视图、批量属性整理与更成熟的维度治理层

### 7.4 `v2.0-Alpha` 架构任务

只处理桌面化与互操作：

- `Tauri v2 + SQLite` 替换浏览器存储主轴
- 基于文件系统实现本地优先落盘与同步基础
- 引入系统级全局快捷键与桌面 Quick Capture 胶囊
- 让版本历史逐步跨越单机线性数组的限制

## 8. 架构问题归属表

当前所有待决架构问题，统一归属如下：

- `Phantom Weaving` 仍停留在高置信词典预筛：归 `v1.1`
- Quick Capture 仍主要依赖物理切块：归 `v1.1`
- 图片与多媒体尚未进入稳定存储链路：归 `v1.2`
- 长文创作缺少 TOC 与折叠：归 `v1.2`
- Canvas、批量属性治理与表格视图缺位：归 `v1.3`
- `stage / source` 缺少成熟治理层：归 `v1.3`
- 后端化、同步、桌面化、本地数据库、跨设备 revision：归 `v2.0-Alpha`

没有归属到版本的架构事项，不进入开发排期。

