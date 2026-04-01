# Flux 核心架构

当前实现版本基线：`v0.6`

## 1. 架构总览

Flux 当前是一套纯前端 React MVP，技术基线为 `React 19 + Vite 8 + Tailwind CSS 4 + Zustand + TipTap + framer-motion + react-force-graph-2d`。

系统的长期架构纪律有 4 条：

- 数据保持扁平，知识单元以 `fluxBlocks` 为核心，不引入文件夹树。
- 路由围绕 `/feed`、`/write`、`/graph` 三个视角展开，而不是围绕“容器页面”组织。
- 状态流转优先走 Zustand，业务状态和 UI 状态要有清晰边界。
- AI 交互以 `BYOK` 为前提，默认由前端直连兼容 OpenAI Chat Completions 的接口。

## 2. 路由职责

### `/feed`

`/feed` 是知识流入口，负责：

- 展示所有知识块的主列表。
- 承载 `Omni Filter`、`Quick Capture`、`Grid/List` 视图切换。
- 依据查询词和标签交集过滤 `fluxBlocks`。
- 在当前结果集内推导引用关系和维度重叠关系。

当前已落地的交互重点：

- `Quick Capture` 是吸顶式折叠输入流，不要求先创建标题。
- `List` 模式是高密度单行结构，左侧正文摘要可收缩，右侧元数据绝不被挤出。
- 关联角标支持 Hover Card 透视关系网络。
- 列表摘要统一走 `contentToPlainText()`，因此正文降维策略会直接影响 Feed 可读性。

### `/write`

`/write` 是沉浸写作场，负责：

- 创建和编辑单个知识块。
- 自动保存标题与正文。
- 管理当前 block 的元数据标签。
- 挂载 TipTap 编辑器及自定义 `Adaptive Lens` 节点。
- 在当前写作界面中提供右侧 `Peek Drawer` 作为并列参考阅读面板。

当前已落地的交互重点：

- 通过 `?id=block_xxx` 定位目标 block。
- 首次输入时自动创建 block 并写入 store。
- 标题、正文和标签都通过 Zustand 回写。
- `Adaptive Lens` 来源徽章可打开右侧原文抽屉，不打断当前写作。
- `AI 重新审视` 已经基于增强版 `contentToPlainText()`，会把透镜摘要一并纳入分析上下文。
- 编辑器已接入 `Phantom Weaving` 本地静默嗅探，并支持从 Hover 卡触发 `提取摘要块` 与 `逆向同化`。

### `/graph`

`/graph` 是关系总览，负责：

- 把扁平知识块投影成关系图。
- 帮用户从“网络”而不是“列表”理解知识密度。
- 验证维度重叠和引用关系是否自然形成结构张力。

它当前仍是探索视图，不承担主要编辑职责，但交互已经进入可持续迭代阶段。

当前已落地的交互重点：

- Graph 与 Feed 共用 `relationMap / buildGraphData()`，不再维护第二套关系语义。
- 节点标签改为固定贴在节点右侧，避免不同象限下的位置漂移。
- 标签默认透明底，仅在满足语义缩放条件时才出现。
- 画布左上角加入 `Spotlight Search` 浮层，支持标题模糊检索和 5 条结果跳转。
- 搜索态下会触发 `spotlight dimming`：未命中节点与边退入背景，命中节点保持高亮。
- 命中结果或手动选中节点后，会自动把该节点的一阶关联群系平滑居中并缩放到合适视野。

## 3. 核心数据模型

### 3.1 `fluxBlocks`

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
    createdAt: string
  }[]
}
```

关键约束：

- 没有 `parentId`。
- 没有目录路径。
- 所有关联都通过引用、维度重叠或未来的语义推断生成。

### 3.2 `savedPools`

`savedPools` 用来保存一组筛选条件，而不是保存一个文件夹容器。

```ts
type SavedPool = {
  id: string
  name: string
  filters: Record<string, string[]>
}
```

`Gravity Pool` 的本质是“可持久化的观察视角”，而不是“知识所有权”。

### 3.3 UI 状态

当前 Zustand 中除了持久化数据，也承载少量跨页面 UI 状态，例如：

- `peekBlockId`

这类状态可以进入 store 统一流转，但默认不持久化到本地存储。

当前仍然缺失的一层状态是：

- “当前激活的 Gravity Pool / 当前观察主题”

这层状态原本就是 `v0.5` 最后一个缺口的关键原因之一。现在它已经完成，Pool 不再只停留在 `/feed?filters=...`，而是成为可被 `/write`、`Phantom Weaving`、`Crystal Assimilation`、`/graph` 共用的运行时上下文。

## 4. 状态流转

全局状态由 `useFluxStore` 统一管理。

当前 store 负责：

- `fluxBlocks`
- `savedPools`
- `peekBlockId`
- `activePoolContext`
- `recentPoolEvents`
- `addBlock`
- `updateBlock`
- `replaceBlock`
- `deleteBlock`
- `getBlockById`
- `addPool`
- `removePool`
- `setPeekBlockId`

持久化策略：

- 本地存储键名为 `flux_blocks_store`
- 持久化 `fluxBlocks`、`savedPools`、`activePoolContext` 与 `recentPoolEvents`
- `fluxBlocks` 内部会一并持久化每个 block 的线性 `revisions[]`
- 已包含从旧 `recentAssimilationRevisions` 结构迁移到 `fluxBlocks[].revisions[]` 的兼容逻辑
- `peekBlockId` 这类纯 UI 状态不进持久化层

## 5. 文本降维与关系推导

### 5.1 `contentToPlainText()`

这是当前系统非常关键的基础函数。它影响：

- Feed 列表摘要
- Grid 卡片预览
- Command Deck 搜索
- TipTap `@` 提及搜索
- AI 自动命名与重打标签

当前版本已经升级为：

- 能正确提取常规 HTML 中的纯文本
- 能识别 `adaptive-lens-node`
- 会优先提取 `summary` 属性，让透镜摘要重新进入系统的可搜索、可分析语义层

### 5.2 关系推导

当前关系不是预存表，而是在界面层动态生成：

- 正文中的 block 引用
- `domain / format / project` 的重叠

这保证了 Feed 和 Graph 可以用同一份扁平数据推导出不同的网络视图。

## 6. 编辑器架构

TipTap 当前承载两类能力：

- 常规富文本编辑
- 自定义知识节点扩展

当前扩展包括：

- `StarterKit`
- `Highlight`
- `Underline`
- `TaskList`
- `TaskItem`
- `Placeholder`
- `Mention`
- `AdaptiveLensNode`
- `PhantomWeavingExtension`

`Adaptive Lens` 当前链路：

1. 用户在正文输入 `@`
2. 从 `fluxBlocks` 中检索相关 block
3. 选中目标后插入 `adaptiveLens` 原子节点
4. 节点读取当前写作语境与目标 block 内容
5. 前端直连模型生成流式透镜摘要
6. 用户可点击来源徽章，在右侧抽屉阅读母体原文

`Phantom Weaving` 当前链路：

1. 编辑器在用户停顿后触发本地静默检索
2. 使用 `Entity Lexicon V2` 对标题、实体、透镜摘要与正文短语做本地正则扫描
3. 通过 `PhantomWeavingExtension` 注入 `Decoration.inline`
4. 对候选词语绘制极淡的虚线，不主动打断输入
5. 词典优先级采用 `title > project/domain > lens summary > snippet`，并按字符串长度降序构建
6. Hover Card 通过 portal 浮层挂到 `document.body`，避免被编辑器卡片裁切
7. Hover Card 展示候选母体标题、标签、摘要和动作按钮，并会区分 `命中标题 / 命中实体 / 命中摘要/正文`
8. 用户可选择插入 `Adaptive Lens`，或触发 `Crystal Assimilation`

当前三视图关系统一方式：

- `/write` 中的 `Adaptive Lens` 已会把 `blockId` 写进节点属性。
- `/feed` 与 `/graph` 不再只识别旧式文本引用，也会把 `Adaptive Lens` 视作可计算关系。
- 维度重叠、显式引用、透镜引用现在统一进入共享的 `relationMap / graphData` 推导层。
- Graph 侧边信息面板已改用和 Feed 一致的关系语义与理由展示方式。

当前 Graph 渲染策略：

- `react-force-graph-2d` 继续承担 Canvas 与 D3 force simulation。
- 图谱物理仍以 `charge + collision + link + center` 为主，参数已经抽离到 `src/features/graph/constants.js`。
- 节点文案采用 `semantic zooming / LOD`：只有在放大、悬停或搜索命中时才绘制文字。
- 节点选中后会基于“一阶邻居群系”计算包围盒，自动执行一次保守的 camera framing。
- 当前搜索高亮和群系 framing 已从 `GraphPage.jsx` 抽离为 `useGraphSearch()` 与 `useGraphCamera()`。
- Canvas 节点绘制和命中区域绘制已抽离到 `src/features/graph/rendering.js`。
- `GraphPage.jsx` 当前只承担数据装配、`ForceGraph2D` 组合和绝对定位 UI 渲染。

`Phantom Weaving` 当前稳定性细节：

- 精确标题命中会立即触发，不再等待长防抖。
- 若当前光标不在命中段落，系统会回看整篇正文中的第一个精确标题命中。
- Hover 事件兼容 contenteditable 内的文本节点目标，并带点击 fallback。
- 浮层和成功挂件均通过 portal 提升到页面顶层，避免 `overflow-hidden` 裁切。
- 词典构建使用 `useMemo` 缓存，只在 `fluxBlocks` 变化时重算，不打断编辑器的输入防抖。
- `extractAdaptiveLensSummaries()` 与 `contentToPlainText()` 共同参与词典构建，因此透镜摘要和正文 snippet 现在都能成为嗅探信标。

`Adaptive Lens` 当前渲染形态：

- 草稿态仍允许输入精细提取指令。
- 完成态已从“蓝色大卡片”脱水为“正文引述流”。
- UI 使用左侧细引述线、正文融入式摘要、行内来源脚注和 hover 才出现的重调按钮。
- 来源脚注点击后仍然打开右侧 `Peek Drawer`，不中断主编辑流。

## 7. 下一阶段目标架构

在 `v0.5.1` 之后，下一阶段不再只是增强“手动引用”，而是要让 Flux 继续进入更稳定的“主动预期”阶段。这里的目标能力可以分成三层：

### 7.1 Phantom Weaving

目标：

- 不要求用户必须主动输入 `@`
- 系统在本地静默识别当前写作内容与既有知识块的潜在联系

当前实现约束：

- 已从标题级 `Fuse.js` 嗅探升级为 `Entity Lexicon Match`
- 当前词典来源覆盖 `block.title`、`dimensions.project`、`dimensions.domain`
- 使用长度降序词条 + 全局正则扫描当前段落
- 仍带有短词/停用词过滤与过度关联抑制
- Hover Card 已能展示命中原因
- 提示保持极轻，不打断写作心流

### 7.2 Crystal Assimilation

目标：

- 不只是把母体内容拉进当前文章
- 还允许把当前新洞察“反哺”回旧知识母体

当前实现状态：

- 已经可以从 Hover 卡触发最小闭环
- 会读取当前段落、当前文章宏观语境和目标母体全文
- 调用模型生成融合后的母体正文，并先进入预览确认流
- 确认后会把结果写入目标 block，并同时生成内嵌于 block 的线性 revision
- Drawer 已具备 `Version History`、共用 Diff 面板与任意版本恢复
- revision 已会记录来源笔记 `sourceBlockId / sourceBlockTitle`，允许用户从历史记录直接回到触发这次更新的源笔记
- 当前仍然只有前端本地线性历史，不支持分支、冲突合并与跨设备同步

### 7.3 Side-by-side Reference

目标：

- 让抽屉成为真正的并屏参考面板，而不是模态弹窗
- 用户可以一边阅读右侧原文，一边继续在左侧编辑器中思考和写作

这部分的交互基础已经完成，后续会继续增强引用、预览与回流动作的一体化体验。

## 8. 当前优先级建议

基于目前已经落地的能力，当前优先级应该分成两层：

1. `v0.6` 的核心收口已经完成：`Entity Lexicon V2`、Diff Visualization、Version History、Origin Traceability 和关键引用语言统一都已落地。
2. 下一步默认进入 `v0.7`：优先为 `Phantom Weaving` 增加固定测试样本、命中质量调优与误报回归。
3. `/write` 中完整的手动元数据管理依然是下一阶段最值得补齐的产品缺口。
4. 若继续做工程化收尾，优先考虑构建体积、分片与回归验证，而不是重新设计主交互。

## 9. 当前交接建议

如果下一次对话需要快速继续，不要只读 PRD。推荐的最小阅读顺序是：

1. `docs/06-HANDOFF.md`
2. `docs/04-CHANGELOG.md`
3. `docs/02-ARCHITECTURE.md`

这样可以最快恢复“当前已经做到哪里、Graph 的真实交互状态是什么、接下来最值得做什么”。
