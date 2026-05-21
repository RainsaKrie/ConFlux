# Conflux 逆向架构与底层实现白皮书

文档基线：`v1.1 / v1.2 已结案，默认主战役进入 v2.0 Native Persistence & Media`

## 1. 文档目标

这不是一份“理想架构蓝图”，而是一份面向产品经理 / 架构设计者的“代码逆向说明书”。

目标只有三个：

- 把你当初用自然语言设计的产品机制，映射回当前代码里的真实实现。
- 把“前端页面行为”、“本地存储结构”、“大模型调用细节”和“桌面壳层能力”讲成一条完整链路。
- 帮你在技术深面试中回答两个问题：`现在系统到底是怎么跑起来的？` 以及 `它未来会先崩在哪里？`

本白皮书默认基于当前仓库代码真相，而不是早期产品设想。

---

## 2. 模块一：全局技术栈与数据流转

### 2.1 系统不是传统三层 Web App

Conflux 当前更准确的定义不是“前端 + 后端 + 数据库”的 SaaS，而是一套 `React + Tauri` 的 local-first 单机知识系统。

它的真实分层是：

1. `React 前端应用层`
   - 负责 Feed、Write、Graph 三视图
   - 负责编辑器、过滤器、Diff 预览、推荐提示、AI 设置等交互
2. `前端状态与业务编排层`
   - 以 Zustand 为中心
   - 负责 `fluxBlocks`、`savedPools`、`recentAiTasks`、`recentPoolEvents` 等核心状态
3. `本地持久化层`
   - 桌面端优先写入 `Tauri Store / conflux_universe.json`
   - 浏览器环境自动回退到 `localStorage`
4. `桌面原生能力层`
   - 通过 Tauri 暴露文件系统、受限媒体打开、路径诊断、桌面窗口控制等能力
5. `外部大模型推理层`
   - 不存在 Conflux 自建业务后端
   - 前端直接请求兼容 OpenAI Chat Completions 的 API

### 2.2 当前技术栈

#### 前端

- `React 19`
- `Vite 8`
- `Tailwind CSS 3 + PostCSS`
- `Framer Motion`
- `React Router`
- `TipTap`
- `react-force-graph-2d`
- `cmdk`
- `Fuse.js`
- `@xenova/transformers`

#### 状态与本地数据

- `Zustand`
- `zustand/middleware persist`
- `@tauri-apps/plugin-store`
- 浏览器 `localStorage` fallback

#### 桌面端

- `Tauri v2`
- `Rust`
- `@tauri-apps/plugin-fs`
- `@tauri-apps/plugin-store`

#### “数据库”现状

当前没有传统意义上的远程数据库，也没有 ORM、没有 SQL 查询层。

系统实际依赖的是两套本地宿主：

- 桌面端：`conflux_universe.json`
- Web 端：`localStorage.flux_blocks_store`

这意味着今天的 Conflux 更像“带桌面原生能力的前端应用”，而不是“云端数据库驱动的业务系统”。

### 2.3 核心数据流转链路

#### 链路 A：Quick Capture -> 本地知识块

1. 用户在 Feed 的速记卡片输入内容。
2. 前端先判断内容长度是否超过 `LONGFORM_CAPTURE_THRESHOLD = 800`。
3. 若超长，则进入本地长文切块器：
   - 先按标题、段落、句号做保守切分
   - 强制控制每块不超过 `1000` 字符
   - 生成共享 `threadId`
   - 注入 `project/source` 线程标签
4. 切块结果通过 `addBlocks()` 进入 Zustand。
5. Zustand persist 中间件触发本地落盘：
   - 桌面端写 `Tauri Store`
   - Web 端写 `localStorage`

伪代码如下：

```text
if capture.length > 800:
  chunks = splitIntoSemanticChunks(capture)
  threadId = buildThreadId()
  blocks = chunks.map(chunk -> buildBlockWithThreadLabels(chunk, threadId))
  addBlocks(blocks)
else:
  add fallback block
  if AI config ready:
    async classify and patch title/domain/format/project
```

#### 链路 B：写作页自动保存

1. 用户在 `/write` 中编辑标题或正文。
2. 标题走 `500ms` 保存延迟，正文走 `1000ms` 保存延迟。
3. 若当前 block 已存在，则走 `updateBlock()`。
4. 若当前是新文档，则先生成 `blockId` 再 `addBlock()`。
5. Persist 中间件负责写入本地。

这是一条完全 local-first 的链路，不需要服务器参与。

#### 链路 C：AI 同化回写

1. 用户先在写作页停顿，触发本地推荐。
2. 点击右下角 CTA，打开 `Peek Drawer`。
3. 用户主动点击“更新原文”后，前端才请求大模型。
4. 大模型返回“合并后的正文”。
5. 前端先把结果放到 `assimilationPreview` 临时态。
6. 用户确认后，才通过 `applyAssimilationRevision()` 真正写入目标 block，并把旧内容与新内容一起记录为 revision。

关键点：`AI 输出 -> 预览 -> 用户确认 -> 落盘`，而不是 `AI 输出 -> 直接覆盖原文`。

---

## 3. 模块二：三大核心产品机制的底层解剖

### 3.1 漏斗拦截与 2.5s 静默期

#### 产品语义

你设计的是一种“低打扰预感知系统”：

- 平时不打断用户
- 只在用户停笔后观察当前段落
- 先用本地词典缩小范围
- 再决定是否展示推荐
- 只有用户主动点开后，后续 AI 行为才可能发生

#### 代码实现方式

这不是第三方 debounce 工具，而是原生的：

- `useEffect`
- `window.setTimeout(2500)`
- 依赖变化时清理 timeout

也就是说，本质上是“手写防抖”。

实现位置：

- `src/pages/EditorPage.jsx`
- `src/features/recommendation/contextRecommendation.js`
- `src/features/search/recommendationPolicy.js`

#### 运行逻辑拆解

1. 每次正文 `content` 变化，重置一个 `2500ms` timer。
2. 到时后，不扫描整篇文档，只读取“当前光标所在父段落”文本。
3. 如果段落为空，则直接退出。
4. 否则进入 `findHybridContextRecommendation()`：
   - 先做 lexicon 候选
   - 若本地向量缓存已准备好，再做语义重排
   - 若向量缓存未就绪，则静默回退到纯词典链路

伪代码如下：

```text
on editor content change:
  clear previous timer
  set timer(2500ms):
    paragraph = readCurrentParagraphText(editor)
    if empty(paragraph): return
    result = findHybridContextRecommendation(paragraph)
    setContextRecommendation(result)
```

#### Fuse.js 具体规则

Fuse 索引并不是对整篇 block 正文建模，而是主要围绕高信号字段：

- `block.title`
- `dimensions.project`
- `dimensions.domain`

先做一轮轻量词项清洗：

- 去标点
- 转小写
- 去停用词
- 英文词长度至少 3
- 中文词长度至少 2

然后构建 Fuse：

- `searchText` 权重 `0.85`
- `title` 权重 `0.15`
- `threshold = 0.24`
- `minMatchCharLength = 2`
- `ignoreLocation = true`

#### 真正拦截阈值

推荐策略是集中定义的：

- 最短段落长度：`8`
- 最少命中词数：`1`
- 严格 Fuse 分数：`<= 0.18`
- 放宽 Fuse 分数：`<= 0.20`
- 放宽触发条件：命中词数 `>= 3`
- 语义阈值：`0.38`
- 语义召回上限：`2`

这意味着：

- 只要当前段落至少有 1 个有效词命中，就可以进入第一轮候选
- 但 Fuse 分数不够好，会被过滤掉
- 只有词典或语义足够强时，才会出现推荐提示

#### 什么时候才会真正唤醒大模型 API？

不会因为 2.5 秒静默而直接请求大模型。

静默期只负责做本地推荐，不负责联网。

真正触发 LLM 的只有三种用户主动行为：

1. `Quick Capture` 的 AI 打标
2. 写作页点击 `AI 重新打标`
3. 推荐抽屉里点击 `更新原文`

也就是：

```text
本地预筛 -> 显示 CTA -> 用户点击 -> 才允许调用 LLM
```

这就是 Conflux 的“漏斗”。

### 3.2 五维正交知识块

#### 产品语义

你设计的是“不要文件夹树，而要正交维度”的知识模型。

当前代码中，这五维是：

- `domain`
- `format`
- `project`
- `stage`
- `source`

它们全部是数组，而不是单值字段。

#### Schema 真实形态

当前并不是 SQL 表设计，而是一个前端对象结构：

```ts
FluxBlock = {
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
  revisions: Revision[]
  createdAt?: string
  updatedAt?: string
}
```

其中：

- `domain` 和 `format` 有系统 fallback
- `project/stage/source` 可以为空数组
- `source` 既承载“速记 / AI 生成”一类来源标签，也承载长文 thread 标签

#### 为什么它能长成“网”，而不是“树”？

因为系统没有 `parentId`，没有目录路径，也没有 folder 层级。

关系是运行时推导出来的，而不是预先写死在数据库里。

#### 关系推导逻辑

当前关系主要来自三层：

1. `source` 稳定关联
   - 例如同一 thread 的切块
2. 正文显式引用
   - `{@block_xxx}` 或 `adaptive-lens-node`
3. 维度重叠
   - `domain / format / project / stage`

实现上，`buildRelationMap(blocks)` 会：

1. 先把全部 block 建成 `byId`
2. 先扫 `source` 和正文引用
3. 再做两两 block 比较，查维度交集
4. 把命中的关系放进内存 map

伪代码如下：

```text
for each block:
  connect stable source links
  connect explicit content references

for each pair(blockA, blockB):
  for each dimension in [domain, format, project, stage]:
    overlaps = intersection(blockA[dimension], blockB[dimension])
    if overlaps:
      add bidirectional relation
```

#### 这不是 SQL / ORM 查询

当前没有：

- SQL join
- ORM relation
- graph database

现在的真实做法就是：

- 先把全量 blocks 拉进内存
- 再用 JavaScript 推导“谁和谁相关”

这带来的优点是：

- 原型阶段很快
- 所见即所得
- schema 极简

代价是：

- 大规模时容易变成 `O(n²)`
- 不适合 10 万篇知识块

### 3.3 版本化回写与强制 Diff 预览

#### 产品语义

你设计的是“AI 不是直接改原文，而是生成一个待审版本”。

这件事在代码里被严格拆成两段：

1. `预览态`
2. `确认落盘态`

#### Diff 是怎么渲染的？

Conflux 没有使用第三方 Diff 库。

当前实现是：

- 先把 HTML 正文降维成纯文本
- 再做句段级 + 字符级 LCS 对比
- 最后渲染成自定义 Diff 表格

涉及文件：

- `src/features/assimilation/diff.js`
- `src/components/assimilation/RevisionDiffPanel.jsx`
- `src/components/assimilation/AssimilationInlinePreviewModal.jsx`

#### 暂存版本和原始版本如何分开？

这里没有“后端临时表”。

系统用的是两层状态：

1. React 临时态 `assimilationPreview`
   - 只在前端内存中存在
   - 用户还没确认时不进持久化
2. Zustand 中的 `block.revisions`
   - 只有确认后才真正写入

也就是说：

```text
模型返回 merged content
-> 放入 assimilationPreview
-> 用户确认
-> applyAssimilationRevision()
-> block.content = afterContent
-> block.revisions prepend(new revision)
```

#### Revision 的真实存储结构

每个 revision 至少保留：

- `beforeContent`
- `afterContent`
- `contextParagraph`
- `sourceBlockId`
- `sourceBlockTitle`
- `sourceRevisionId`
- `createdAt`
- `kind`

这使得系统具备：

- 查看历史版本
- 从旧版本恢复
- 记录这次改动是从哪个上下文来的

#### 用户点击“确认”时发生什么？

1. 读取 `assimilationPreview`
2. 调用 `applyAssimilationRevision()`
3. 把目标 block 的当前正文替换为 `afterContent`
4. 把 `beforeContent/afterContent/context/sourceBlockId` 包成 revision
5. 把 revision 插入该 block 的历史列表
6. 如当前在某个 pool 上下文里，再记录一条 `recentPoolEvent`

#### 用户点击“拒绝”时发生什么？

什么都不写盘。

只执行：

- 关闭 modal
- 清空 `assimilationPreview`

这正是“强制 Diff 预览”的关键：拒绝不会污染任何正式数据。

---

## 4. 模块三：大模型交互细节

### 4.1 代码里实际调用的是谁？

代码里没有写死某个厂商。

真实设计是：

- 由用户在 `.env` 或 `AI Settings` 中填写
  - `baseURL`
  - `model`
  - `apiKey`
- 前端统一拼接到 `/chat/completions`
- 以 OpenAI Chat Completions 兼容格式发起请求

所以 Conflux 绑定的是“协议”，不是“品牌”。

这意味着它可以接：

- OpenAI
- DeepSeek
- Moonshot
- 任何兼容该接口格式的网关

### 4.2 核心 System Prompt 原文

#### 用于知识打标的 System Prompt

中文原文如下：

```text
我传给你一段笔记。请帮我完成两件事：1. 为这段笔记起一个极简的标题（10个字以内，不要任何标点符号）。如果原文围绕一个明确的英文术语、产品名、人名、项目名或专有概念，请在标题中原样保留该核心词，不要把它翻译或替换成“主体、概念、机制、方法”等泛化抽象词。2. 提取3个维度：domain(领域,最多2个)、format(体裁)、project(项目实体名,没有则留空)。所有输出必须使用【简体中文】，但专有名词和英文术语必须保留原文。强制输出合法JSON：{"title":"概括性短标题", "domain":[],"format":[],"project":[]}。除 JSON 外不要输出任何多余字符。
```

#### 用于版本化回写的 System Prompt

中文原文如下：

```text
你是一位严谨的知识库架构师。请阅读【原始笔记正文】，再分析【用户新笔记】里的新增洞察。你的任务不是简单追加，而是把这些新增知识自然整合进原始笔记正文的合适位置，必要时可补一个极简小标题。必须保留原有内容的核心信息和整体结构，不要写解释说明，不要输出分析过程。最终只返回更新后的正文内容本身。【绝对红线】：你必须直接输出合并后的笔记正文主体。严禁输出任何类似 '【更新后的正文】'、'以下是更新内容'、'总结完毕' 的前缀、开头语或自我解释。你的输出将直接作为前端 DOM 被渲染，包含任何多余字符将导致系统崩溃！只输出 Markdown 原文！如果原文是 HTML 片段，就只返回合并后的正文片段本身，不要包裹任何说明性文字；如果原文是普通文本或 Markdown，也只返回合并后的 Markdown 正文。请使用简体中文输出。
```

### 4.3 系统如何尽量保证 JSON 稳定输出？

当前代码没有接 OpenAI 官方 `response_format: json_schema` 这种强约束能力。

真实策略是“Prompt 强约束 + 宽松解析 + 失败回退”。

#### 第一层：Prompt 约束

Prompt 明确要求：

- `Output valid JSON only`
- `除 JSON 外不要输出任何多余字符`

#### 第二层：宽松解析器

解析器先做三步修复：

1. 如果模型包了 ```json fenced block`，先把代码块内容提出来
2. 如果前后有废话，就截取最外层 `{ ... }`
3. 再执行 `JSON.parse()`

伪代码如下：

```text
if ```json fenced exists:
  use fenced content
else if text contains first { and last }:
  slice as json candidate
else:
  use raw text

try JSON.parse(candidate)
catch -> fallback
```

#### 第三层：失败兜底

Quick Capture 的兜底最保守：

- 请求失败
- JSON 解析失败
- 模型输出乱码

最终都会回退成：

- `title: ''`
- `domain: ['未分类']`
- `format: ['碎片']`
- `project: []`

也就是说，系统宁可给你一个“弱标签但可存活”的知识块，也不会因为模型坏输出而阻断主链。

#### Timeout / Try-Catch / Fallback

当前策略包括：

- `AbortController`
- `45s timeout`
- `response.ok` 检查
- `try/catch`
- UI 级 `recentAiTasks` 状态回写

这意味着系统不仅有“异常捕获”，还有“面向用户的失败反馈”。

---

## 5. 模块四：架构脆弱点与极限压测

### 5.1 如果到 1 万并发用户，会先崩在哪里？

先说最关键的一句：

当前 Conflux 根本不是面向“1 万并发用户”的 SaaS 架构。

原因很直接：

- 没有业务后端
- 没有统一身份认证
- 没有共享数据库
- 没有多租户隔离
- 没有任务队列
- 没有缓存层

所以如果硬要进入多用户并发场景，最先崩的不是某个函数，而是“系统边界定义本身”。

也就是说：今天这套架构只适合 `single-user local-first`。

### 5.2 如果单人知识库到 10 万篇，会先崩在哪里？

#### 瓶颈 1：关系推导 O(n²)

`buildRelationMap(blocks)` 对维度重叠做两两比较。

这在 1000 篇还能接受，在 10 万篇会直接不可用。

它是当前最明确的第一性能雷点。

#### 瓶颈 2：全量本地 JSON 持久化

`fluxBlocks` 是一整个大数组。

每次正文编辑、标签更新、revision 写入，最终都会推动 persist 重新序列化一份大型 JSON 结构。

问题会体现在：

- 落盘变慢
- 内存膨胀
- 启动 hydration 变慢
- Web fallback 更容易卡死

#### 瓶颈 3：Fuse.js 纯前端检索

当前推荐与 Spotlight Search 都在浏览器内存里做。

随着 block 数量增长：

- Fuse 索引构建会变慢
- 搜索会变卡
- 首次进入写作页时的推荐预热会更重

#### 瓶颈 4：本地 embedding 与 vector cache

语义检索现在仍然是：

- 取 block 标题 + 正文片段
- 在浏览器里做 embedding
- 缓存在内存 snapshot 中

10 万篇时，这条链会遇到：

- 向量生成时间太长
- 浏览器内存占用过高
- snapshot 重建成本过高
- ONNX / Wasm 推理拖慢前端线程

#### 瓶颈 5：媒体与 revision 叠加扫描

原生媒体 GC 是 revision-safe 的。

优点是安全，缺点是每次清理都可能要扫：

- 当前正文
- 历史 revisions
- 启动后的 orphan media 目录

当用户知识库极大、附件极多时，这条链也会逐步变重。

### 5.3 作为架构师，对 V2 的建议

#### 路线 A：如果继续坚持 local-first desktop

建议优先做这四件事：

1. `JSON Store -> SQLite`
   - 把 `conflux_universe.json` 升级成 SQLite
   - 让 block、revision、pool、task 拆表
2. `内存过滤 -> FTS`
   - 用 SQLite FTS5 替换大部分 `includes/Fuse` 的全文过滤职责
3. `向量快照 -> 本地向量索引`
   - 可选 `sqlite-vec`、`LanceDB`、`Qdrant local`
4. `前端重活 -> Rust worker`
   - 把 chunking、embedding、GC 扫描、批量关系推导下沉到 Rust 后台线程

#### 路线 B：如果未来要转 SaaS / 多用户

建议架构改造成：

- `API Gateway`
- `Auth`
- `PostgreSQL`
- `Redis`
- `Object Storage`
- `Vector DB`
- `Worker Queue`

推荐分层如下：

```text
Web/Desktop Client
  -> API Layer
  -> Auth / Session
  -> App Service
  -> Postgres
  -> Redis
  -> Object Storage
  -> Vector Index
  -> Async Worker for LLM / chunking / reindex
```

#### 具体建议表

| 当前瓶颈 | 当前实现 | V2 建议 |
|---|---|---|
| 知识块持久化 | JSON Store / localStorage | SQLite |
| 全文过滤 | 内存扫描 + Fuse | FTS5 / Meilisearch / Tantivy |
| 向量检索 | 浏览器内存 snapshot | sqlite-vec / Qdrant / pgvector |
| 关系图推导 | 前端全量 `O(n²)` | 增量索引 / materialized edges |
| AI 调用 | 页面直接 fetch | 队列化任务服务 |
| 多媒体存储 | AppData + 手动扫描 | 媒体元数据表 + 引用索引 |

### 5.4 面试里最值得主动说出的判断

如果你在面试中只能讲一句“架构师判断”，最值得说的是：

> Conflux 当前的架构优势在于：它把产品实验速度和 local-first 体验推到了极致；但它的代价也很明确，就是把检索、向量、关系推导和持久化几乎全部压在客户端侧，所以它天然适合单机原型，不适合直接横向扩展成 SaaS。

这句话基本就是当前代码库最真实的架构评价。

---

## 6. 最后的系统定义

如果要给当前 Conflux 下一个最准确的技术定义，可以这样说：

> Conflux 是一套运行在 `React + Tauri` 双运行时上的 local-first 知识系统。它使用扁平 `fluxBlocks` 和五维正交标签组织知识，通过本地词典与本地 embedding 做静默上下文推荐，通过强制 Diff 预览实现 AI 版本化回写，并以 `Tauri Store + AppData media` 作为当前桌面持久化主轴。

这句话，既能描述产品，也能描述当前代码。
