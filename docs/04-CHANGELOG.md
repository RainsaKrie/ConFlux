# Conflux 迭代日志

本文件是当前项目的版本真相，也是 Roadmap 的唯一分发表。

当前发布印戳：`v1.0.0 Release Candidate`

## 1. 版本校正说明

- `v0.1 ~ v0.7` 可以继续视作相对线性的早期里程碑。
- `v0.8`、`v0.9`、`v1.0` 在历史上并不是三次严格切开的独立发布；它们是对已经合入主链的能力做回顾性命名。
- 当前代码已经同时包含 `v0.9` 的段落级本地推荐主链、`v1.0` 的长文语义切块主链，以及已完成收口的 `v1.1` 混合召回主链。
- 因此，当前最准确的称呼现在更新为：`v1.1 已结案，下一阶段待决`。
- `package.json` 的 `1.0.0` 现在表示开源发布包版本元数据；更细粒度的产品阶段与里程碑仍只以本文件为准。

## 2. 当前代码基线

当前主链已经稳定存在的能力包括：

- Feed / Write / Graph 三视角骨架
- 扁平 `fluxBlocks`、`savedPools` 与 Zustand persist
- `Adaptive Lens` 显式引用节点与右侧 `Peek Drawer`
- 段落级 `Phantom Weaving`：`2500ms debounce + Entity Lexicon + Fuse.js + Embedding Hybrid Search`
- 用户确认后才真正触发的 `Crystal Assimilation`
- 差异预览、线性 revision、恢复与来源追溯
- `activePoolContext`、`recentPoolEvents` 与 `recentAiTasks` 跨视图连续体验
- `Semantic Auto-Chunking & Threading`
- Graph 的 `Semantic Zoom + Spotlight Search + Cluster Framing`
- 首启 onboarding seed 与开源版 README 门面
- 前端双语界面基建：`zh / en` 本地持久化切换与 AI Prompt 联动

## 2.1 本轮稳定化收口

本轮已完成的收口包括：

- 统一 `Sidebar`、`Command Deck`、`Peek Drawer`、`Graph` 面板中的中英混杂文案
- 将关系语义中的“永久关联”收束为“稳定关联”
- 清理 seed 数据中残留的旧“动态透镜 / 模型摘要”叙事
- 同步修正部分 `API Key`、`Block Search`、`Untitled Note` 一类旧命名
- 在 `/write` 中新增低存在感的 `stage / source` 手动管理入口：支持 `!阶段`、`^来源` 前缀录入，并在主标签区下方以灰度次级元数据条显示
- 将 `stage / source` 继续接入 `/feed`、`/graph` 与侧边栏：支持建议、筛选、概览与轻量全局移除
- 将前台 UI 文案继续去魅化：`发现相关节点`、`提取核心摘要`、`更新原文`
- 修复带标题的超长段落在切块时仍可能超过安全阈值的问题
- 新增 `npm run verify:phantom`，并补上中英混合命中边界、超长垃圾段落防溢出与线程标签断言
- 将 `EditorPage` 中的右侧 `Peek Drawer` 与原文更新预览弹层抽离为独立组件，压低页面层耦合
- 清理未使用的 `AssimilationDiffPanel.jsx` 与历史样例 `fluxBlocks.js`，减少仓库内僵尸文件
- 修正 `RevisionDiffPanel`、回归样本与脚本中的 UTF-8 乱码文案，收口维护噪音
- 为 AI 重打标签与原文更新补上本地 `recentAiTasks` 记录层，能够显示运行中、成功、失败三种状态
- 新增开源版 onboarding seed 数据，并在首次冷启动且本地缺失持久化工作区时自动注入
- 重写根目录 `README.md`，补齐 Manifesto、核心特性、运行指南与 BYOK 说明
- 扩充 `.gitignore`，补上本地环境变量与常见编辑器缓存的忽略规则
- 建立轻量级前端 i18n 层：基于 `src/i18n/` 词典、`localStorage.flux_language` 与浏览器语言推断，支持 `EN / 中` 无刷新切换
- 将 `Sidebar`、`Feed`、`Write`、`Graph`、`Command Deck`、`Peek Drawer`、`Revision Diff`、`Settings` 等核心界面接入双语文案
- 让 AI 打标与原文更新 Prompt 跟随当前界面语言切换，英文界面默认请求英文输出，中文界面请求简体中文输出
- 为 `未分类 / 碎片 / 速记 / AI 生成` 等系统默认标签补上语言感知的显示映射，避免英文界面继续暴露中文底层值
- 为 Graph 中的关系原因与元数据显示补上双语映射，减少 `稳定关联 / 引用节点` 一类内部标签直接外露
- 让首启 onboarding seed 与默认 `savedPools` 名称跟随当前语言生成，避免英文用户第一次进入时仍看到整套中文示例内容
- 将 Graph 右侧说明、主关系标题、定位按钮等剩余提示词正式收进 i18n 词典，减少页面内临时三元分支
- 让 `未命名笔记`、长文 thread 标签、`来源:` / `知识碎块:` 等自动生成元数据随当前语言输出，并在显示层继续支持中英互译
- 将 onboarding seed 收束为“仅在首次冷启动且本地缺失 `fluxBlocks` 持久化结构时按当前界面语言分发”的安全模型：英文环境挂载英文引导，中文环境挂载中文引导；一旦落盘即视为普通用户数据，后续切换语言不再触发任何批量重算
- 修正 Zustand 持久化中的冷启动判定：onboarding seed 与默认 `savedPools` 现在只会在本地缺失对应持久化结构时注入，不再把“用户主动删空数据”误判为需要自动补回样板
- 修复 `Phantom Weaving` 候选门槛过严导致的静默失效：将 `contextRecommendation` 中进入 Fuse 验证前的门槛从 `matchedTerms >= 2` 下调为 `>= 1`，恢复单实体高置信命中的右下角推荐提示
- 对外品牌名正式锁定为 `Conflux`，并已同步到 UI 文案、`docs/`、`README.md`、`index.html` 与 `package.json`
- 首启引导 seed 已按发布要求收敛为 3 篇正式探讨性节点，统一使用 `Conflux` 项目标签并服务开源首次体验
- 根目录 `README.md` 已重写为面向 GitHub 开源社区的工程化说明文档，当前基线可视为 `v1.0` 开源发布就绪
- 根目录已补齐 `.env.example`、`LICENSE(MIT)` 与更克制的开源 README，并让默认 AI 配置支持通过 `VITE_AI_BASE_URL / VITE_AI_API_KEY / VITE_AI_MODEL` 注入本地 BYOK 参数
- 默认 AI 配置已从“预填 DeepSeek 回退值”调整为“空默认 + 示例 placeholder / .env.example”，确保提供商选择权仍完全掌握在用户手里
- `v1.0.0 Release Candidate`：当前基线已完成品牌、文案、首启引导、数据主权边界与构建验收收口，可作为 GitHub 开源发布候选包
- 抽出 block 默认维度与系统来源标签 helper，收掉 `Editor` / `Feed` 内部重复的 `未分类 / 碎片 / 速记 / AI 生成` 字面量，降低后续维护噪音
- 修正文档中仍残留的旧 `package.json 0.0.0` 描述，并把仓库元数据地址同步到当前 `ConFlux.git`
- 移除 `Quick Capture` 中残留的 `Intent Fission` 调用与相关 Prompt/helper，确保普通输入继续遵守“极简入库 + 现有打标/切块”基线
- 将 `Hybrid Search` 的向量模块改为按需动态加载，避免 `@xenova/transformers` 继续提前压进 `/write` 首屏主 chunk
- 同步 `README`、`README_ZH`、存储文档与桌面配置元数据到当前代码真相：`Tauri Store + localStorage fallback`、`Tailwind CSS 3`、`Tauri v2` 桌面壳层与 `1.0.0` 版本元数据
- 为 `verify:phantom` 补充真实项目语境的推荐回归样本，并将多词高置信命中的 Fuse 二次校验阈值做轻度放宽，减少真实段落被边界门槛误杀
- 将 `vectorCache` 从“任意 block 波动后整库重建”收口为“优先复用未变化 entry、只重算变更项”的增量预热策略，降低 `v1.1` 阶段的大库重建压力
- 将推荐链路的核心参数收束到统一 policy：Fuse 严格/放宽阈值、语义阈值、召回上限、lexicon/semantic/both 打分权重不再散落在多个模块中
- 为推荐结果补上 `recommendationPath / fallbackReason` 元信息，并在 `Peek Drawer` 中低存在感展示“为何本次回退到词典链路”的说明，显式化 `v1.1` 的失败回退边界
- 统一 `/write` 右下角推荐 CTA 与 `Peek Drawer` 的状态表达：现在会区分 `entities / semantic / both / fallback` 四种推荐语义，并用更克制的文案与 `混合召回 / 词典候选` 路径徽标保持入口与抽屉一致
- 抽出共享的 `recommendationPresentation` 状态 helper，收掉 `EditorPage / PeekDrawer` 中重复的推荐语义判定；同时把“无向量快照时应回退到 `lexicon-only` 且标记 `cache-warming`”补进 `verify:phantom` 回归
- 将 `Hybrid Search` 的语义/词典合并排序抽成纯函数，并为 `verify:phantom` 新增两类真实边界：`both` 双命中应优先收敛到同一块，以及较弱语义候选不应压过高置信 `entities` 命中
- 在 `Peek Drawer` 中补上推荐解释层：现在会明确显示“词项命中数量 + strict/relaxed 校验”或“semantic score 已越过阈值”，让纯语义候选不再只靠颜色表达自身置信度
- 为 `Peek Drawer` 补上文内 TOC：当前会从 `H1 / H2 / H3` 自动提取标题索引，并支持在抽屉内平滑跳转到对应小节；同时将 heading 解析逻辑抽成共享 helper，避免编辑页与抽屉各自维护一套大纲提取实现
- 为主编辑器与 `Peek Drawer` 的 TOC 补上 `Scroll Spy`、空状态与超长标题截断：当前可根据阅读位置高亮当前标题，长标题不会挤坏索引宽度，无标题文档会显示低存在感提示；跳转后的 heading 闪烁反馈也已统一收口到更柔和的 `Zen Canvas` 风格
- 为主编辑器补上基于 `TipTap / ProseMirror DecorationSet` 的极简折叠原型：左侧 Outliner 现在可对标题区段执行轻量收起/展开，正文仅通过装饰器隐藏响应，不改动保存用 HTML / JSON 文档结构，用于评估 `v1.2` 是否值得引入正式折叠能力

## 3. 回顾性里程碑

### `v0.1` Zen Canvas MVP 骨架

已纳入当前代码基线：

- 建立 `SidebarLayout + /feed + /write + /graph` 路由骨架
- 使用 Zustand persist 持久化 `fluxBlocks` 与 `savedPools`
- 视觉切到 `Zen Canvas` 浅色极简基线
- 接通 `Quick Capture`、基础标签系统、`Gravity Pools`、`Command Deck` 与 BYOK 设置入口

### `v0.2` 沉浸写作与显式引用

已纳入当前代码基线：

- Editor 自动创建文档、自动保存标题与正文
- TipTap `@` 提及搜索
- 自定义 `Adaptive Lens` 节点
- 右侧 `Peek Drawer` 并屏参考阅读
- `contentToPlainText()` 支撑引用节点降维

### `v0.3` Phantom Weaving 原型

已纳入当前代码基线，但旧交互形态已退役：

- 本地静默嗅探的原型起点
- 早期虚线 Decoration、Hover Card 等形态已经下线
- 保留下来的是“主动预期”能力，而不是早期侵入式交互

### `v0.4` Crystal Assimilation 闭环

已纳入当前代码基线：

- 从当前写作上下文回流更新目标原始笔记
- 模型生成融合结果，而不是简单 append
- 结果进入预览确认流后再写回

### `v0.5` 零压迫知识流

已纳入当前代码基线：

- 弱化显式操作负担
- `Adaptive Lens` 从重卡片收束为引用节点
- Feed、Write、Graph 共享更一致的关系语义

### `v0.5.1` Graph 工程化收口

已纳入当前代码基线：

- `/graph` 核心逻辑拆分到 `src/features/graph/`
- 搜索、相机、渲染与常量完成模块化
- 页面层回归组合职责

### `v0.6` 质量控制、版本历史与来源追溯

已纳入当前代码基线：

- `Entity Lexicon Match`
- Diff Visualization
- `fluxBlocks[].revisions[]` 线性版本历史
- 任意版本恢复
- revision 来源追溯

### `v0.7` 嗅探质量验证与维度管理补强

已纳入当前代码基线：

- Phantom 词典进一步收缩到结构化来源：`title / project / domain`
- 更严格的短词、停用词与中文误报抑制
- `/write` 标签输入收束为前缀路由
- 顶部标签输入框响应式伸缩

### `v0.8` 引用语言与体验收口

这是“部分进入代码、但并未作为单次发布收干净”的阶段。

已落地：

- 核心链路文案已大幅去魅化
- `Adaptive Lens`、Drawer、同化预览、版本历史表达已经统一到当前语言体系

### `v0.9` 段落级本地推荐与人工确认漏斗

这部分已经进入当前主链：

- 下线整篇扫描与页面底部重型决策面板
- 只监听当前自然段落
- 使用 `2500ms debounce + Entity Lexicon + Fuse.js` 做本地高置信预筛
- 命中后只浮出右下角轻提示
- 点击后打开 Drawer，并在用户确认后才调模型

### `v1.0` 语义切块与线程串联

这部分已经进入当前主链：

- `Quick Capture` 超过阈值时进入本地切块
- 优先按 Markdown 标题、双换行、句末符切分
- 切块后共享 `threadId`
- 通过 `project / source` 线程标签串联上下文
- 批量调用 `addBlocks()` 渐进式落盘
- 默认跳过逐块 AI 打标，避免并发洪峰

## 4. 从未完成事项到版本规划

自本次文档改造开始，Conflux 不再保留散装“未完成事项”列表。

所有待决问题必须被精确发配到以下版本里程碑：

### `v1.1` 智能攻坚期

定位：`Semantic Retrieval`

负责事项：

- `混合召回引擎 (Hybrid Search)`
  - 引入本地或极轻量级 Embedding 检索，辅助 `Entity Lexicon`
  - 让 `Phantom Weaving` 具备同义词、近义词理解能力
  - `Phase 2` 基建已进入实现态：已引入 `@xenova/transformers`，完成纯前端 `Xenova/all-MiniLM-L6-v2` 单例 Embedder、余弦相似度工具与本地验证脚本，`"你好世界"` 向量推理已成功输出 `384` 维 embedding，当前未遇到 Vite 构建层面的 Transformers.js 配置报错
  - `Phase 2.5` 离线实验已进入实现态：已新增 `buildVectorSnapshot()` 与 `performHybridSearch()`，完成“实体字典 + 向量相似度”双路融合逻辑；离线靶场中，在查询不包含 `RAG` 词面的情况下，纯语义通道仍能将 `block_rag` 稳定召回为 Top 1
  - `Phase 3` 已进入实现态：`Hybrid Search` 已静默并入 `/write` 主推荐链路；系统会在后台维护内存级 `vectorCache` 快照，优先走 `Entity Lexicon`，若本地向量缓存可用则再执行语义重排，并以 `entities / semantic / both` 归因结果驱动右下角提示与 `Peek Drawer` 的轻量视觉差异；Wasm 模型初始化失败时会无感回退到原有单路词典匹配
- `意图裂变器 (Intent Fission)`
  - 该方向已被产品决策正式取消，不再作为 `v1.1` 的继续推进项
  - 当前 Quick Capture 保持“极简入库 + 现有打标/切块”策略，不再继续增加主题分离链路的复杂度与延迟

#### `v1.1` 结案确认

`v1.1` 现在正式视为已收尾完成。此前列出的 6 组收口项，当前判断如下：

1. `推荐质量基线`
   - 已补上真实项目语境 fixture，不再只依赖离线靶场。
   - 已覆盖中英混写、真实命中、误命中抑制、`both` 双命中与 `entities` 优先等边界。
2. `阈值与排序策略`
   - `semanticThreshold`、Fuse 严格/放宽阈值、lexicon/both bonus 已统一收束到 recommendation policy。
   - 推荐结果已补上 `reasonDetails / semanticScore / fallbackReason` 等解释信息。
3. `vectorCache 生命周期`
   - 已明确预热、就绪、失败、空缓存回退的状态边界。
   - 已从整库重建收口为“优先复用未变化 entry、只重算变更项”的增量预热。
4. `UI 收口`
   - `/write` 入口 CTA 与 `Peek Drawer` 已统一到 `entities / semantic / both / fallback` 四种语义。
   - 纯语义命中已补上低压迫解释层，不再只靠颜色表达置信度。
5. `失败回退体验`
   - 语义链路不可用时，系统会无感回退到 `lexicon-only`。
   - `cache-idle / cache-warming / cache-failed / semantic-no-hit / semantic-unavailable / semantic-exception` 已具备明确说明。
6. `验证与文档`
   - `verify:phantom` 已覆盖真实推荐边界、fallback、双命中和排序优先级。
   - 文档、代码与验证命令当前已完成一轮对齐，可正式宣布 `v1.1` 结案。

#### `v1.1` 结案标准

以下条件现已满足，因此 `v1.1` 正式成立并结案：

- `Hybrid Search` 已成为 `/write` 中稳定、默认、可回退的推荐主链。
- `entities / semantic / both` 三类归因结果都具备可解释性与稳定 UI 表达，`fallback` 也已进入统一语义体系。
- Wasm 模型不可用时，系统会无感回退到纯词典推荐，不破坏当前写作体验。
- 推荐链路已经具备一组可信的真实样本回归验证，而不只依赖离线演示靶场。
- 文档、代码、验证命令三者口径一致，不再出现“文档已宣布完成、代码仍在实验态”的漂移。

### `v1.2` 创作体验期

定位：`Rich Media & Block Ergonomics`

负责事项：

- `动态大纲与折叠 (Outliner & Fold)`
  - 在主编辑器与 `Peek Drawer` 中补齐 TOC、大纲跳转与折叠能力
  - 当前进度：`/write` 已完成左侧 Outliner、平滑跳转、`Scroll Spy`、超长标题截断、无标题空状态与跳转闪烁反馈；`Peek Drawer` 也已补上文内索引并保持同一套导航语义
  - 折叠能力已从纯评估进入原型态：当前主编辑器支持基于 `DecorationSet` 的轻量标题区段折叠，用于验证交互价值；仍不引入重型自定义节点或新的文档模型
- `纯 Web 媒体方案`
  - 纯 Web `IndexedDB` 媒体路线已明确废弃，并正式移交 `v2.0 Native Persistence & Media`

#### `v1.2` 结案确认

- `大纲体验收口`
  - 支持当前阅读位置的标题高亮追踪（Scroll Spy）。
  - 点击跳转后，正文有清晰的瞬时视觉反馈。
  - 超长标题会被优雅截断，无标题文档会显示低存在感空状态提示。
- `长文信息降噪`
  - 主编辑器与 `Peek Drawer` 的大纲 UI 层级已经统一收口。
  - 大纲不会破坏 `Zen Canvas` 的低压迫阅读体验。
- `折叠能力极简原型`
  - 已完成一种基于 `TipTap / ProseMirror DecorationSet` 的轻量标题块折叠原型。
  - 没有改动 TipTap 的底层数据模型，仅作为后续是否值得正式引入的评估依据。
- `稳定性`
  - 现有自动保存、引用节点、推荐链路与 Drawer 阅读体验不被新交互破坏。
  - 文档与代码口径一致，不再把“已有 TOC 骨架”误写成“`v1.2` 已完成”。
- `本轮结案方式`
  - 本轮以代码主链、文档同步与 `npm run lint` / `npm run build` 通过作为结案依据。
  - 人工体感验收暂不作为当前结案阻塞项，延后到下一阶段回归时处理。

### `v1.3` 信息流管网期

定位：`Advanced Filtering & Canvas`

负责事项：

- `白板视图 (Infinite Canvas / Whiteboard)`
  - 在 Feed / List / Graph 之外补齐自由拖拽二维看板
- `高级属性看板 (Advanced Properties)`
  - 提供表格视图与批量属性整理入口
  - 放开维度的高级手动治理能力
- `v1.3` 当前从“最近排期”降级为“视图扩张储备”：白板与高级属性治理保留目标，但优先级后撤，让位于桌面原生底座置换

### `v2.0-Alpha` 桌面壳层初始化期

定位：`Desktop Shell Bootstrap`

负责事项：

- `架构逃逸 (Tauri Encapsulation)`
  - 使用 `Tauri v2` 为现有 React/Vite 工程套入桌面壳层
  - 当前已进入实现态：项目根目录已接入 `src-tauri/`，并配置 `tauri:dev / tauri:build`、`beforeBuildCommand: npm run build`、`devUrl: http://localhost:5173`
  - 桌面窗口当前已切到 `Conflux` 无边框壳层：默认 `1280 x 800`
  - 前端与 Rust 之间已补上第一条 IPC 探针：前端启动时会在 Tauri 环境中静默 `invoke('hello_conflux_desktop')`
  - Windows 开发链路已完成一次应急突围：Tailwind 编译已从 `@tailwindcss/vite` 回退到 `PostCSS + tailwindcss v3`，`npm run tauri:dev` 现通过 `vite --configLoader native --port 5173 --strictPort` 稳定启动，绕过了 `externalize-deps -> net use -> spawn EPERM` 的 dev 阻断
  - 无边框桌面窗口已补上自定义标题栏与 `core:window` 权限注册，支持显式窗口拖拽、最小化、最大化与关闭

### `v2.0` 存储纪元

定位：`Native Persistence & Media`

负责事项：

- `引擎置换`
  - 以 Tauri Plugin Store（JSON，当前实现态）替换浏览器 `localStorage`，并为后续 SQLite 迁移保留空间
  - 为 `fluxBlocks` 的异步落盘与迁移建立桌面原生主轴
  - `v2.0.x` 已进入实现态：Zustand persist 已切换为 Tauri Store 异步适配，首启会从 legacy `localStorage` 进行无损迁移并落盘到 `conflux_universe.json`
  - 当前桌面端已完成真实落盘验证：`npm run tauri:dev` 下可在 `C:\Users\ROG\AppData\Roaming\com.conflux.desktop\conflux_universe.json` 看到 `flux_blocks_store` 与迁移后的笔记数据
- `原生多媒体`
  - 直接接管剪贴板、拖拽与文件系统 API
  - 将图片与附件保存到本地隔离目录，如 `~/.conflux/media/`
  - TipTap 正文仅渲染本地资源标识符或路径引用

### `v2.1` 桌面心流期

定位：`OS-Level Ergonomics`

负责事项：

- `Global Shortcuts`
  - 注册系统级快捷键，例如 `Cmd/Ctrl + Shift + Space`
  - 在任意第三方软件之上呼出极简 `Quick Capture`
- `系统托盘与静默守护`
  - 引入 Tray 常驻入口
  - 让后台轻量任务与词典预热脱离主窗口生命周期
- `原生多媒体引擎 (Local Media Engine)`
  - 已进入实现态：Tauri 侧已接入 `plugin-fs`，并为 `$APPDATA/media/` 开放受限读写 scope
  - `FluxEditor` 现会在 Tauri 环境下拦截粘贴/拖拽图片，阻断 Base64 内联膨胀，转而将图片物理写入本地 `media/` 目录后再回填安全 URL
  - Web 环境保持降级策略：若非 Tauri，则回退为 Data URL 插入，确保浏览器版不崩溃

### `v2.2` 视图扩张期

定位：`Advanced Views`

负责事项：

- `无限白板 (承接原 v1.3)`
  - 在桌面性能边界下重启 `Infinite Canvas`
  - 引入 `tldraw` 等二维引擎承载自由布局
- `数据库视图`
  - 提供 `Table / Properties View`
  - 对 `domain / format / project / stage / source` 做批量治理与筛选

### `v2.3` 算力下沉期

定位：`Rust Backend & Local LLM`

负责事项：

- `Rust 多线程调度`
  - 将长文 `Semantic Auto-Chunking`、全库嗅探与重型检索任务下沉到 Rust 后端
- `离线大模型直连`
  - 在 BYOK 之外原生适配 Ollama 等本地大模型
  - 支持断网 AI 打标、同化与生成链路

## 5. 当前阶段结论

`v1.1` 与 `v1.2` 现在都已正式结案。

这意味着当前阶段不再是继续补 `v1.1` / `v1.2` 的收口，而是要决定下一轮工作究竟进入 `v1.3`、`v2.0-Alpha`、`v2.0`、`v2.1`、`v2.2` 还是 `v2.3`。

如果答不出来，就不进入排期。

## 6. 继续开发前的推荐阅读顺序

1. [`06-HANDOFF.md`](./06-HANDOFF.md)
2. [`04-CHANGELOG.md`](./04-CHANGELOG.md)
3. [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)

