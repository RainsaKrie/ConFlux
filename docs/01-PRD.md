# Conflux 产品文档

文档基线：`v1.0 稳定化阶段 / Roadmap Solidified`

## 1. 产品定位

Conflux 是一个面向高频思考者的 Agentic Knowledge Flow 工具。

它不以文件夹树组织知识，而是把每一条内容都视作可被重组、可被引用、可被回流更新的扁平知识块。当前产品的核心命题不是“做另一款笔记软件”，而是验证以下三件事是否能同时成立：

- 扁平知识块可以通过多维标签、引用关系与运行时推导形成可持续组织。
- AI 应只承担克制、局部、可确认的任务，而不是吞掉整篇上下文做重型分析。
- `/feed`、`/write`、`/graph` 三个视角可以构成一个低压迫、可扩展、可演进的知识流闭环。

## 2. 版本校正结论

- `v0.1 ~ v0.7` 可以视为相对线性的早期里程碑。
- `v0.8`、`v0.9`、`v1.0` 不是历史上严格切开的独立发布包，而是对已经合入代码主链能力的回顾性命名。
- 当前代码基线已经同时包含 `v0.9` 的段落级本地推荐漏斗，以及 `v1.0` 的长文语义切块与线程串联。
- 因此当前项目的真实称呼仍然是：`v1.0 稳定化阶段`。
- `package.json` 中的 `1.0.0` 现在表示开源发布包版本元数据；更细粒度的产品里程碑与阶段真相仍以 [`04-CHANGELOG.md`](./04-CHANGELOG.md) 为准。

## 3. 当前产品基线

截至当前代码状态，Conflux 的现实基线如下：

- 视觉基线是 `Zen Canvas`：浅灰背景、白色卡片、大留白、低压迫交互。
- 数据基线是扁平 `fluxBlocks`，不引入文件夹树，不引入 `parentId`。
- AI 基线遵循“本地预筛 -> 隐蔽提示 -> 用户确认 -> 精确调用模型”的漏斗。
- 超长输入默认不允许直接落成单一巨型 block，而要先经过本地切块与线程串联。
- `stage / source` 已进入五维模型，并已在 `/write`、`/feed`、`/graph` 与侧边栏完成第一轮低存在感接入。
- 当前已经具备 onboarding seed、本地任务记录、版本历史、回滚与来源追溯；其中 seed 仅在首次冷启动且本地尚无持久化工作区时注入，后续不再干预用户数据。

## 4. 核心对象

### 4.1 Conflux Block

`block` 是 Conflux 的最小知识单元。它是独立对象，不承担树状父子关系。

当前核心字段包括：

- `id`
- `title`
- `content`
- `dimensions`
- `createdAt`
- `updatedAt`
- `revisions`

其中 `dimensions` 当前规范为：

- `domain`
- `format`
- `project`
- `stage`
- `source`

### 4.2 Gravity Pool

`Gravity Pool` 是一组筛选条件的持久化快照，不是文件夹，也不是静态集合。

它保存的是“观察视角”，不是“知识所有权”：

- 用户可以一键回到某组关注主题。
- 系统保存的是过滤器，而不是 block 的归属关系。
- 当前 Pool 语境会贯穿 Feed、Write、Graph 与局部同化事件。

## 5. 当前三大场景

### 5.1 Feed

`/feed` 是知识流入口，当前负责：

- `Omni Filter` 全文搜索与标签交集筛选
- `Quick Capture` 吸顶式输入流
- Grid / List 双视图切换
- 基于引用与维度重叠推导关系
- 超长文本的前端切块入库与线程串联

### 5.2 Write

`/write` 是沉浸写作场，当前负责：

- 自动创建 block
- 自动保存标题与正文
- 管理主维度标签，并以低存在感方式补充 `stage / source`
- 挂载 TipTap 与 `Adaptive Lens`
- 提供右侧 `Peek Drawer`
- 提供段落级 `Phantom Weaving` 与 `Crystal Assimilation` 的最小闭环

### 5.3 Graph

`/graph` 是关系总览，当前负责：

- 以网络视角投影扁平知识块
- 展示引用关系与维度重叠
- 帮助判断知识密度、线程聚集与结构张力

## 6. 当前已落地能力

截至当前代码基线，以下能力已经进入实现态：

- Zustand + persist 本地持久化
- Feed 的 `Omni Filter`、`Quick Capture`、Grid/List 视图切换
- Quick Capture 的 AI 自动命名与主维度打标
- `Semantic Auto-Chunking & Threading`
- Editor 自动保存、标签管理、AI 重新审视
- `@` 提及搜索与 `Adaptive Lens` 只读引用节点
- 右侧 `Peek Drawer` 并屏参考阅读
- 段落级 `Phantom Weaving`：`2500ms debounce + 当前段落 + Entity Lexicon + Fuse.js`
- `Crystal Assimilation` 的预览确认流、版本历史、恢复与来源追溯
- Graph 视图的 `Semantic Zoom + Spotlight Search + Cluster Framing`
- `activePoolContext`、`recentPoolEvents` 与 `recentAiTasks` 形成第一轮跨视图连续体验
- 首次冷启动且本地尚无持久化 `fluxBlocks` 时自动注入 onboarding seed 数据

## 7. Roadmap 总原则

从本文件开始，Conflux 不再保留游离的“未完成事项”列表。

所有待解决问题都必须被明确发配到以下四个版本里程碑之一：

- `v1.1`：智能攻坚期，只解决“主动感知与碎片吸收是否足够聪明”的问题。
- `v1.2`：创作体验期，只解决“编辑器是否足够成熟、可承载长文与多媒体”的问题。
- `v1.3`：信息流管网期，只解决“用户是否能驾驭规模化知识流”的问题。
- `v2.0-Alpha`：平台跨越期，只解决“是否跨越浏览器单机边界”的问题。

没有版本归属的事项，视为不允许进入开发排期。

## 8. 演进路线图

### 8.1 `v1.1` 智能攻坚期

副标题：`Semantic & Fission`

目标：

- 让系统的主动感知能力突破当前 `Fuse.js + 词典` 的查准率上限。
- 让混杂输入在进入知识库之前就完成结构化拆解。

核心交付：

1. `混合召回引擎 (Hybrid Search)`
   - 在本地或极轻量级前端环境中引入 Embedding 检索。
   - 推荐链路从单纯模糊匹配升级为“Entity Lexicon + Embedding 相似度”的混合召回。
   - 新引擎必须能理解同义词、近义词与轻度语义变体。
2. `意图裂变器 (Intent Fission)`
   - 在 Quick Capture 提交阶段拦截混杂长文本。
   - 通过大模型把一段无逻辑输入拆成多个具备独立标题与标签的原子知识块。
   - 目标不是简单物理切块，而是“混杂输入，解耦归档”。

版本结案标准：

- `Phantom Weaving` 对近义表达具备更稳定命中能力。
- Quick Capture 对混杂输入具备可感知的结构化拆分效果。
- 推荐与拆分结果仍遵守“先本地预筛，再有限调用模型”的漏斗纪律。

### 8.2 `v1.2` 创作体验期

副标题：`Rich Media & Block Ergonomics`

目标：

- 让 Conflux 不再局限于纯文字工作流。
- 让编辑器在长文与结构化创作场景下具备成熟门槛。

核心交付：

1. `多媒体承载 (Local Media Support)`
   - 支持图片的本地粘贴与拖拽上传。
   - 通过 `IndexedDB` 承载媒体资源，突破 `localStorage` 5MB 的硬限制。
   - 允许图文混排，而不破坏现有 block 与引用语义。
2. `动态大纲与折叠 (Outliner & Fold)`
   - 在主编辑器中支持 Heading 大纲导航与内容折叠。
   - 在右侧 `Peek Drawer` 中同步提供结构化 TOC 浏览能力。
   - 让长文创作、复查与局部跳转具备更低摩擦。

版本结案标准：

- Conflux 可以稳定承载本地图片与图文混排。
- 长文创作具备可感知的大纲导航与折叠体验。
- 编辑器复杂度提升后仍不破坏当前自动保存与引用链路。

### 8.3 `v1.3` 信息流管网期

副标题：`Advanced Filtering & Canvas`

目标：

- 让用户开始驾驭规模化知识堆积，而不只是继续堆笔记。
- 为 Feed / List / Graph 之外补一层更强的人为编排与批量整理能力。

核心交付：

1. `白板视图 (Infinite Canvas / Whiteboard)`
   - 引入 `tldraw` 或同类框架提供自由拖拽二维看板。
   - 用户可将知识块手动钉在看板上，建立临时或长期的空间化布局。
2. `高级属性看板 (Advanced Properties)`
   - 放开维度的高级手动管理入口。
   - 提供表格视图，用于批量整理知识块属性与元数据。
   - 让 `stage / source / domain / format / project` 进入可批量操作的治理层。

版本结案标准：

- 用户可以通过 Canvas 进行空间化整理，而不是只依赖 Feed 与 Graph。
- 用户可以通过表格视图进行批量属性治理。
- 高级整理能力不会破坏现有轻量输入体验。

### 8.4 `v2.0-Alpha` 平台跨越期

副标题：`Desktop Native & Interop`

目标：

- 当 Web 版体验被榨干后，正式向操作系统底层跃迁。
- 解决浏览器存储、系统级入口与本地优先同步的上限问题。

核心交付：

1. `架构逃逸 (Tauri Encapsulation)`
   - 使用 `Tauri v2` 打包 React 产物。
   - 使用本地 `SQLite` 替代浏览器 `IndexedDB` 作为主存储。
2. `系统级集成 (OS Integration)`
   - 监听全局快捷键，如 `Cmd + Shift + K`。
   - 实现在任意软件上层悬浮唤出 `Quick Capture`。
3. `本地优先同步 (P2P / Git-backed Sync)`
   - 介入底层文件系统，让笔记以 `Markdown / JSON` 形式落盘。
   - 为 WebDAV、Git 增量备份或其他端到端加密同步方案提供基础。

版本结案标准：

- Conflux 不再被浏览器存储上限与标签页驻留方式限制。
- 数据开始具备桌面级落盘与同步基础。
- 系统级捕获入口开始成为产品矩阵的一部分。

## 9. 待决问题到版本归属

当前所有仍未收口的问题，统一归属如下：

- `Phantom Weaving` 的语义化升级与 Quick Capture 的混杂输入拆分：归 `v1.1`
- 本地媒体承载、图文混排、大纲导航、折叠编辑：归 `v1.2`
- Canvas、表格视图、批量属性治理与高级整理入口：归 `v1.3`
- `stage / source` 的完整治理层：从 `v1.3` 开始进入成熟形态
- 桌面打包、本地数据库、文件落盘、同步与系统级捕获：归 `v2.0-Alpha`
- 版本历史的跨设备化与更强互操作能力：归 `v2.0-Alpha`

自此不再保留游离的“以后再看”条目。

