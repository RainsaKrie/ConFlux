# Flux 核心架构

文档基线：`v1.0 稳定化整理版`

## 1. 版本校正说明

本文件描述的是“当前代码真实架构”，不是理想化蓝图。

- `v0.8`、`v0.9`、`v1.0` 在历史上并不是三次严格切开的独立发布。
- 当前代码已经同时包含 `v0.9` 的段落级本地推荐主链和 `v1.0` 的长文切块主链。
- 与此同时，一部分本应在 `v0.8` 完成的文案统一、术语清理和体验收口仍未彻底结束。
- 因此当前最准确的工程称呼是：`v1.0 稳定化阶段`。

版本事实以 [`04-CHANGELOG.md`](./04-CHANGELOG.md) 为准。

## 2. 技术基线

Flux 当前是一套纯前端 React MVP，技术栈为：

- `React 19`
- `Vite 8`
- `Tailwind CSS 4`
- `Zustand`
- `TipTap`
- `framer-motion`
- `react-force-graph-2d`

长期架构纪律有 5 条：

- 数据保持扁平，知识单元以 `fluxBlocks` 为核心，不引入文件夹树。
- 路由围绕 `/feed`、`/write`、`/graph` 三个视角组织，而不是围绕容器页面组织。
- 状态流转优先走 Zustand，业务状态和 UI 状态保持边界清晰。
- AI 交互以 `BYOK` 为前提，默认由前端直连兼容 OpenAI Chat Completions 的接口。
- 首屏加载优先按视图做懒加载分片，避免编辑器、图谱和命令台一起打包。

## 3. 路由职责

### `/feed`

知识流入口，当前负责：

- 展示全部知识块
- 承载 `Omni Filter`、`Quick Capture`、Grid/List 视图切换
- 基于查询词和标签交集过滤 `fluxBlocks`
- 在当前结果集内推导引用关系和维度重叠关系

关键现状：

- `Quick Capture` 是吸顶式折叠输入流，不要求先创建标题。
- 当输入超过安全阈值时，会在提交瞬间进入本地 `Semantic Auto-Chunking` 流水线。
- List 模式是高密度单行结构，正文摘要可收缩，右侧元数据不被挤出。
- 摘要统一走 `contentToPlainText()`，因此正文降维策略会直接影响 Feed 可读性。

### `/write`

沉浸写作场，当前负责：

- 创建和编辑单个知识块
- 自动保存标题与正文
- 管理当前 block 的主维度标签与补充元数据
- 挂载 TipTap 编辑器与 `Adaptive Lens`
- 在写作界面中提供右侧 `Peek Drawer`

关键现状：

- 首次输入时自动创建 block，并统一复用 `buildBlockId()`。
- 顶部标签输入已收束为 prefix-based routing：`@领域`、`/体裁`、默认 `project`，并新增 `!阶段`、`^来源` 作为低存在感补充元数据入口。
- 当前主区优先暴露 `domain / format / project`，`stage / source` 通过次级灰度元数据条管理，并已接入 Feed 筛选建议与 Graph 低存在感展示。
- 编辑器主体已回归纯净输入；当前只对“光标所在自然段落”做本地延迟嗅探。

### `/graph`

关系总览，当前负责：

- 把扁平知识块投影成关系图
- 帮助用户从“网络”而不是“列表”理解知识密度
- 验证维度重叠和引用关系是否自然形成结构张力

关键现状：

- Graph 与 Feed 共用同一套关系推导语义。
- 搜索、聚光灯弱化、群系 framing 已经模块化。
- 页面本身更偏组合层，核心逻辑已经收进 `src/features/graph/`。

## 4. 模块结构

当前代码的主要模块分布如下：

- `src/pages/FeedPage.jsx`：Feed 组合层与 Quick Capture 主流程
- `src/pages/EditorPage.jsx`：写作页组合层、Drawer、原文更新预览与版本历史
- `src/pages/GraphPage.jsx`：图谱组合层
- `src/components/editor/`：TipTap 编辑器与 `Adaptive Lens` 扩展
- `src/features/recommendation/`：段落级本地推荐引擎
- `src/features/graph/`：图谱渲染、搜索、相机控制与常量
- `src/features/pools/`：Pool 上下文与筛选工具
- `src/store/useFluxStore.js`：全局状态、持久化、revision 与 Pool 事件
- `src/utils/documentChunker.js`：长文切块与线程标签
- `src/utils/relations.js`：Feed / Graph 共用关系推导
- `src/ai/prompts.js`：同化提示词边界
- `scripts/verify-phantom.mjs`：长文切块与本地推荐的极限回归入口

## 5. 核心数据模型

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

### 5.2 `savedPools`

`savedPools` 保存的是筛选视角，而不是容器。

```ts
type SavedPool = {
  id: string
  name: string
  filters: Record<string, string[]>
}
```

### 5.3 运行时状态

当前 Zustand 中除了持久化数据，也承载少量跨页面运行时状态，例如：

- `peekBlockId`
- `activePoolContext`
- `recentPoolEvents`

其中：

- `peekBlockId` 不进持久化层
- `activePoolContext` 与 `recentPoolEvents` 进入持久化层，用于跨视图连续体验

## 6. 状态流转

全局状态由 `useFluxStore` 统一管理。

当前 store 负责：

- `fluxBlocks`
- `savedPools`
- `peekBlockId`
- `activePoolContext`
- `recentPoolEvents`
- `addBlock`
- `addBlocks`
- `updateBlock`
- `replaceBlock`
- `deleteBlock`
- `applyAssimilationRevision`
- `restoreBlockRevision`
- `undoAssimilationRevision`
- `addPool`
- `removePool`
- `setPeekBlockId`

持久化策略：

- 本地存储键名为 `flux_blocks_store`
- 持久化 `fluxBlocks`、`savedPools`、`activePoolContext` 与 `recentPoolEvents`
- `fluxBlocks` 内部会一并持久化每个 block 的线性 `revisions[]`
- 已包含从旧结构迁移到 `fluxBlocks[].revisions[]` 的兼容逻辑

## 7. 文本降维与关系推导

### 7.1 `contentToPlainText()`

这是系统关键基础函数。它直接影响：

- Feed 列表摘要
- Grid 卡片预览
- 搜索
- TipTap `@` 提及搜索
- AI 自动命名与重打标签

当前版本已经能够：

- 提取常规 HTML 中的纯文本
- 识别 `adaptive-lens-node`
- 优先提取 `excerpt / summary / title`

### 7.2 关系推导

当前关系不是预存表，而是在界面层动态生成：

- 正文中的 block 引用
- `Adaptive Lens` 引用
- `dimensions.source` 中记录的稳定来源关系
- `domain / format / project` 的重叠

这保证了 Feed 和 Graph 可以共享同一份扁平数据语义。

## 8. Longform Capture Pipeline

当 `Quick Capture` 检测到超长输入时，会进入前端预处理流水线：

1. 优先按 Markdown 标题分段
2. 若无标题，则退化为双换行分段
3. 若单段仍过长，再按句末符做保守切分
4. 生成同批共享的 `threadId`
5. 为所有子块注入统一 `project` 和 `source` 线程标签
6. 批量调用 `addBlocks()` 落盘
7. 默认跳过逐块 AI 打标，避免 429 与冗余成本

当前原则：

- 数据完整性优先，不做危险的 chunk 去重
- 线程串联优先，不让长文碎片在 Feed / Graph 中失联

## 9. 编辑器主链

### 9.1 Adaptive Lens

当前链路：

1. 用户在正文输入 `@`
2. 从 `fluxBlocks` 中检索相关 block
3. 选中目标后插入 `adaptiveLens` 原子节点
4. 节点渲染为只读引用节点
5. 用户可点击入口，在右侧 `Peek Drawer` 查看原始笔记正文

### 9.2 Phantom Weaving

当前链路：

1. 用户在 `/write` 中持续写作
2. 当输入停止 `2500ms` 后，系统只提取光标所在自然段落
3. 本地 `Entity Lexicon + Fuse.js` 对该段落做高置信预筛
4. 仅当命中实体数量和得分满足阈值时，右下角浮出轻提示
5. 用户主动点击后，右侧 Drawer 打开候选笔记，并露出“智能推荐”核对区

### 9.3 Crystal Assimilation

当前链路：

1. 用户在 Drawer 中点击 `更新原文`
2. 系统读取“当前段落 + 目标原始笔记全文”
3. 调用模型生成融合后的更新正文
4. 结果先进入差异预览
5. 用户确认后才写回目标 block，并记录 revision

## 10. 当前技术债与优先级

当前最值得优先处理的不是继续叠大功能，而是以下事项：

1. 统一站内旧文案、旧术语与残留体验表达。
2. 为 `Phantom Weaving` 与长文切块补更多固定样本和回归验证。
3. 在不增加顶栏负担的前提下，继续收口残留命名、降低页面层耦合，并谨慎扩展 `stage / source` 的批量管理能力。
4. 继续整理开源版后的工程边界，避免 README、seed 和 docs 再次漂移。
