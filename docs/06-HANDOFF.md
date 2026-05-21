# Conflux 继续开发交接说明

本文件的目标只有一个：让下一次会话中的开发者或 AI 助手只需先读这份文档，就能恢复当前项目状态，并沿着正确方向继续推进。

## 1. 推荐阅读顺序

1. [`06-HANDOFF.md`](./06-HANDOFF.md)
2. [`04-CHANGELOG.md`](./04-CHANGELOG.md)
3. [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)
4. 必要时再读 [`01-PRD.md`](./01-PRD.md) 和 [`03-DATABASE.md`](./03-DATABASE.md)

如果时间非常有限，至少先读完本文件，再开始改代码。

## 2. 当前版本结论

这次交接最重要的上下文不是某个功能点，而是版本理解方式已经被重新校正：

- `v0.1 ~ v0.7` 可以视作相对线性的早期里程碑。
- `v0.8`、`v0.9`、`v1.0` 不是三次严格切开的独立发布，而是对当前主链能力的回顾性命名。
- 当前代码基线已经同时包含 `v0.9` 的段落级本地推荐主链、`v1.0` 的长文切块主链，以及已经收尾完成的 `v1.1` 混合召回主链。
- 因此当前最准确的说法应更新为：`v1.1 / v1.2 已结案，默认主战役进入 v2.0 Native Persistence & Media`。

额外注意：

- `package.json` 的 `1.0.0` 现在表示开源发布包版本元数据。
- 产品版本真相只以 [`04-CHANGELOG.md`](./04-CHANGELOG.md) 为准。
- 当前自动验收基线已可跑通一次 `npm run verify:v2`；剩余待收口事项主要集中在桌面实机清单，而不是纯脚本回归。

## 3. 当前代码里已经成立的事实

- `/graph` 的工程化拆分已经完成，核心逻辑位于 `src/features/graph/`。
- `Quick Capture` 已具备长文 `Semantic Auto-Chunking & Threading` 能力。
- 长文切块会生成共享 `threadId`，并通过 `project / source` 线程标签把同批碎片串联起来。
- 当前 `Phantom Weaving` 只在当前段落上运行：`2500ms debounce + Entity Lexicon + Fuse.js + Embedding Hybrid Search` 的本地混合预筛。
- 命中后只在右下角浮出“发现相关节点”的微型提示；点击后打开右侧 `Peek Drawer`。
- `Phantom Weaving` 最近已完成一轮故障修复：进入 Fuse 验证前的候选门槛已从 `matchedTerms >= 2` 调整为 `>= 1`，单实体高置信命中不再被提前丢弃，浏览器实测右下角提示已恢复正常。
- Drawer 顶部可执行：`提取核心摘要`、`更新原文`。
- `/write` 的手动元数据分配已经进入可用态：主区完整暴露 `domain / format / project`，并以低存在感次级元数据条补充 `stage / source`。
- `/feed` 已可把 `stage / source` 纳入筛选建议与 Token 过滤；`/graph` 已可低存在感展示阶段与来源元数据。
- 侧边栏现在还能查看全局 `stage / source` 分布，快速切入对应 Feed 过滤视角，并跨 block 移除单个元数据值。
- `Crystal Assimilation` 已具备“原文更新预览”、确认应用、线性版本历史、任意版本恢复与来源追溯。
- store 已补上本地 `recentAiTasks`：会记录 AI 重打标签与原文更新的运行状态，便于回看最近一次动作是否成功。
- `verify:phantom` 现在已覆盖中英混合命中边界、超长垃圾段落防溢出、词典噪音过滤与线程标签校验。
- 开源版默认带有 onboarding seed 数据；但它只会在首次冷启动且本地尚无持久化 `fluxBlocks` 时注入。用户如果后来主动删空工作区，刷新后不会被自动补回样板数据。

## 4. 所有待决事项的版本归属

从现在开始，交接文档不再维护游离 TODO，而是只维护版本归属。

### `v1.1`

负责：

- `Hybrid Retrieval` 向量混合召回

当前进度：

- `v1.1 Phase 2` 已完成第一层 Wasm 向量化基建：项目已接入 `@xenova/transformers`，新增 `src/features/search/embedder.js` 单例 Embedder 与余弦相似度函数，并通过 `scripts/test-embedder.mjs` 成功跑通 `"你好世界"` 的本地 embedding 推理
- `v1.1 Phase 2.5` 已完成逻辑层离线实验：新增 `src/features/search/hybridSearch.js`，能够构建全量向量快照并执行“Lexicon Hits + Semantic Hits”双路融合；`scripts/test-hybrid-search.mjs` 已验证在词典失效时仍可通过语义相似度把 RAG 相关笔记排到 Top 1
- `v1.1 Phase 3` 已进入实现态：`Hybrid Search` 已并入 `/write` 的主推荐链路，段落推荐现在会优先执行极速实体字典命中，再在本地 `vectorCache` 可用时补做语义重排；纯语义高分命中会在右下角提示与 `Peek Drawer` 中以更轻的紫色通道标记，若 Wasm 模型未完成初始化或加载失败，则静默回退到原有词典推荐，不阻断写作
- `Intent Fission` 已被产品方向正式取消，不再作为后续版本推进重点；Quick Capture 保持现有的极简入库、长文切块与既有打标链路即可

`v1.1` 当前已正式结案，关键收口事实包括：

- 真实样本级推荐回归已进入 `verify:phantom`
- 推荐阈值、排序策略与命中解释已经统一收束
- `vectorCache` 生命周期已明确为 `idle / warming / ready / failed`
- `entities / semantic / both / fallback` 已具备统一 UI 表达
- 失败回退边界已完成文档化

后续若继续碰推荐链路，默认不再视为“补完 `v1.1`”，而是 `v1.1` 之后的增强或下一阶段前置准备。

### `v1.2`

负责：

- TOC、大纲导航与折叠编辑
- 长文写作的人体工学收口

当前进度：

- `Outliner & Fold` 已进入第一阶段实现：`/write` 已新增左侧低存在感大纲导航，`Peek Drawer` 也已补上文内索引；两者都会实时抽取 `H1 / H2 / H3` 并支持平滑滚动跳转
- `Scroll Spy`、超长标题截断、无标题空状态与跳转闪烁反馈已并入当前基线，主编辑器与 `Peek Drawer` 的 TOC 语义基本统一
- 标题折叠已从纯评估进入轻量原型态：当前主编辑器通过 `TipTap / ProseMirror DecorationSet` 提供极简区段收起/展开，用于验证是否值得在未来正式引入；保存用 HTML 不受影响，且仍未接入重型 TipTap 折叠管线
- 纯 Web `IndexedDB` 媒体路线已被放弃，图片与附件承载已转入桌面原生阶段处理

当前结论：

- `v1.2` 已正式结案。
- 本轮结案按代码主链、文档同步与 `npm run lint` / `npm run build` 通过判定。
- 人工体感验收暂不阻塞本次结案，留待下一阶段回归时补做。

### `v1.3`

负责：

- `Infinite Canvas / Whiteboard`
- 表格视图与高级属性治理
- `stage / source` 的成熟治理层

### `v2.0-Alpha`

负责：

- `Tauri v2` 桌面包装
- 极简 IPC 探针与无边框窗口壳层
- 开发环境与桌面 Dev 链路稳定性

当前进度：

- 桌面壳层初始化已进入实现态：项目已新增 `src-tauri/`，并在 `package.json` 中补上 `tauri:dev / tauri:build`
- 当前窗口壳层已配置为无边框 `Conflux` 桌面窗口，默认尺寸 `1280 x 800`
- 前端与 Rust 之间已预埋极简 IPC 探针：在 Tauri 环境中会静默 `invoke('hello_conflux_desktop')`
- Windows 下的 `tauri:dev` 已完成一次稳定性抢修：Tailwind 已切回 `PostCSS + tailwindcss v3`，Vite dev 改为 `--configLoader native --port 5173 --strictPort`，从而绕过 `spawn EPERM` 的配置加载死锁
- 自定义无边框标题栏已进入实现态，并补齐 `core:window` 能力授权；当前桌面窗口应支持拖拽、最小化、最大化和关闭

### `v2.0`

负责：

- `Native Persistence & Media`

当前进度：

- 已完成 `Tauri Store` 插件注册与权限开启，桌面端可读写本地 `conflux_universe.json`
- Zustand persist 已切换为异步 `Tauri Store` 适配，首启会从 legacy `localStorage` 自动迁移并落盘
- 当前适配已与 `createJSONStorage` 对齐：读写阶段以 JSON 字符串与 Zustand 通信，避免对象/字符串协议错位
- 写入已加入轻量防抖，避免高频持久化阻塞
- 非 Tauri 环境下自动回退至 `localStorage`，保持 Web 调试不中断
- 当前桌面端已验证真实文件落盘：`C:\Users\ROG\AppData\Roaming\com.conflux.desktop\conflux_universe.json` 已存在且包含 `flux_blocks_store`
- 当前已补上损坏存储的安全回退与坏数据备份；窗口隐藏/关闭前也会主动冲刷待写入的 `Tauri Store`
- 当前设置弹层已补上“最近一次存储恢复”诊断：若 `localStorage / Tauri Store` 载荷损坏并触发备份 + 回退，界面会直接显示来源、回退目标、备份 key 与原始错误，便于执行 `v2.0` 的异常载荷验收，而不再只能依赖控制台
- 当前设置弹层中的数据库文件与本地 `media/` 目录现在都支持桌面下一键打开：做迁移、恢复、附件与孤儿媒体验收时，不需要再手动去系统路径里定位
- 当前已补齐 Tauri 2 本地媒体回读所需的 `assetProtocol` 配置：`tauri.conf.json` 现已显式开启 `app.security.assetProtocol`，并把 scope 收束到 `$APPDATA/media`；若后续再出现“图片节点已插入但立即退化成占位图”的现象，优先先检查这条协议配置是否被回退
- 当前已将桌面持久化桥接逻辑抽离为独立 `hybridPersistStorage` 模块；`verify:native-persistence` 现在会直接回归 Web 读取、legacy -> Tauri 迁移、损坏原生载荷回退、原生写入镜像同步与删除失败 fallback，不再只停留在 helper 级断言
- 当前已将原生媒体启动扫描中的孤儿候选计算抽离为独立 helper；`verify:native-media` 现在会额外覆盖目录扫描识别与 orphan cleanup 候选计算，不再只验证 HTML 中的媒体引用提取
- 当前 TipTap 图片粘贴/拖拽已由编辑器事件层主动接管：Tauri 下优先写入 `$APPDATA/media/` 物理文件并用 `convertFileSrc` 生成安全 URL，Web 或写入失败时自动降级为 Base64 插入，确保不会白屏或丢图；该链路已完成一轮桌面实机验证
- 当前本地附件打开已补上 Tauri command：前端附件卡片会传入 `media/` 相对路径，Rust 侧校验路径必须位于 AppData 的媒体目录内，再交给系统打开物理文件；编辑器 NodeView 与静态渲染态附件都会统一走这条路径；路径安全已由 Rust 单元测试覆盖，但附件点击打开的实机验证本轮已跳过
- 当前缺失媒体退化规则已抽为 `nativeMediaRecovery` 纯 helper：缺失图片会保留原 alt 并追加不可用提示、切到占位图；缺失附件会移除打开 href、标记不可用并保留结构元数据；`verify:native-media` 已覆盖这些状态描述
- 当前本地媒体 GC 已升级为 revision-safe：`extractActiveMediaFiles(blocks)` 会同时扫描 `block.content`、`revision.beforeContent` 与 `revision.afterContent`；启动后台 GC、编辑保存清理、Feed 删除清理都已改用这套有效引用集合，避免误删历史版本仍需要的图片/附件
- 当前 `Quick Capture` 的 fallback 卡片已补上延迟 AI enrich 机制：若创建当下尚未完成 `AI 设置`，卡片会先离线入库并标记待处理；配置补齐后 Feed 会自动补跑标题/标签生成，失败项会在下一次配置变更后自动重试
- 当前已修正速记 AI 补标的状态恢复边界：卡片 `pending` 状态会明确表现为“等待 AI 补标”，真正请求中才进入 `processing`；若页面刷新、切换或慢接口导致旧请求失联，下次回到 Feed 仍会重新捞起这些 `processing` 卡片，避免它们永久停在“AI 正在补标”
- 当前已将速记补标状态判断抽离为独立 helper，并新增 `npm run verify:quick-capture`：会自动回归 legacy 速记识别、`pending / processing / completed` 状态判定，以及常见 `404 / 401 / 429 / timeout` 错误映射；这条检查现已接入 `verify:v2`
- 当前已新增 `npm run verify:desktop-media-config`：会自动检查 `src-tauri/capabilities/default.json` 中的 `fs` 权限与 `$APPDATA/media` scope，以及 `tauri.conf.json` 中 `assetProtocol` 的开启状态和读取范围；这条检查现已接入 `verify:v2`，用于防止桌面媒体“能写不能读”的配置回退再次潜入主链
- 当前已清理缺失媒体标签中的历史字符污染：图片 alt 与缺失提示之间统一使用 ASCII ` - ` 分隔，`verify:native-media` 已覆盖这条边界；如果后续再看到奇怪的中点/乱码分隔符，优先检查 `nativeMediaRecovery` 是否被回退
- 当前已修正整篇笔记删除时的媒体清理遗漏：Feed 删除卡片时会把该笔记当前正文和 `revision.beforeContent / afterContent` 里的媒体引用一起送进 removed set，不再只盯 `block.content`；`verify:native-media` 已覆盖“整篇删除也要清理 revision-only 独占媒体”的场景
- 当前已进一步补强共享媒体的 revision-safe 回归：`verify:native-media` 现在还会覆盖“另一条笔记的 revision 仍在引用时不得误删”和“启动级 orphan scan 遇到 revision-only 引用必须保留”两类场景；后续如果 GC 再出问题，先看这两条断言是否被新改动打破
- 当前已补上“最近一次本地媒体缺失”诊断：图片/附件若在重启重载或运行时被发现已不在桌面 `media/` 目录中，设置面板会直接显示媒体类型、发现时机和 `media/...` 相对路径；`verify:native-media` 也已覆盖这条诊断结构的读写协议
- 当前 AI Base URL 已兼容两种填写方式：provider base URL 与完整 `/chat/completions` endpoint 都可用，避免重复拼接 endpoint 后触发 `HTTP 404`
- 当前速记 AI 补标失败会在 Feed 卡片和最近任务面板中直接暴露，`HTTP 404 / 401 / 403 / 429` 会被翻译成更可操作的 API 设置提示
- 当前 AI 标题生成已补上“核心英文术语保护”：Prompt 会要求保留英文术语/专有名词，Feed / Write 的标题替换逻辑也会阻止首行英文概念被泛化标题覆盖
- 当前 Feed 网格卡片主标题已改为单行省略，避免长标题被硬切断后误导用户
- 当前 Feed 列表视图已补齐悬浮删除按钮，点击时会阻止行点击冒泡，并复用既有删除确认与媒体孤儿清理链路
- 当前最近 AI 任务已收紧：store 最多保留 5 条，侧边栏最多展示 3 条，并支持一键清空
- 当前主要滚动容器已统一接入 `zen-scrollbar`，用于在 Windows/Tauri 下隐藏粗重系统滚动条；样式已放在全局 fallback 之后，并升级为隐藏原生滚动条、hover 时自绘极淡侧边细线，避免 WebView 原生 gutter 继续露出粗灰条
- 当前生产构建 chunk 已完成一轮收口：`/write` 的 TipTap 编辑器被拆成二级 lazy `EditorSurface`，Vite 在 Rollup / Rolldown 两条配置路径都设置了 `manualChunks`，将 editor、Transformers、ONNX runtime 拆成独立 vendor chunk；`EditorPage` 与 `embedder` 入口不再超过 500KB，`verify:v2` 的 native config loader 构建中大 chunk warning 已消失；第三方 `onnxruntime-web` direct eval 噪音已在构建检查中抑制，一方代码仍由 ESLint `no-eval` 阻断
- 当前已新增 `verify:bundle` 并接入 `verify:v2`：构建后会自动检查最大 JS chunk、`EditorPage`、`EditorSurface`、`embedder`、editor vendor、Transformers vendor 与 ONNX runtime vendor 的尺寸预算，后续如果分包回退会直接让 `verify:v2` 失败
- 当前设置弹层已补上运行边界诊断卡：会明确显示当前是桌面 `Tauri` 还是纯 Web，会话持久化走 `conflux_universe.json` 还是 `localStorage`，媒体走 `$APPDATA/media/` 还是 `Data URL`，便于 `v2.0` 实机验收时快速确认真实主链

下一步默认任务：

- 补齐 `v2.0` 的结案清单，而不是提前跳去 `v1.3` 或 `v2.1`
- 优先验证桌面存储主路径的恢复边界、迁移边界与异常文件边界
- 执行异常载荷验收时，优先利用设置面板中的“最近一次存储恢复”诊断确认恢复是否真的发生，再回看备份 key 与原始错误，减少只能靠控制台日志判断的盲区
- 执行迁移、附件恢复与孤儿媒体清理验收时，优先使用设置面板里的“打开”按钮直达数据库文件或 `media/` 目录，减少手动找路径造成的额外噪音
- 把本地图片/附件链路从“已接通”推进到“重启后仍稳定可用”的完整闭环
- 媒体 GC 的安全原则必须继续保持：宁可漏删，不可误删；所有清理路径都必须把 revisions 纳入有效引用集合
- 回归 Feed 的低噪音交互：AI 补标失败提示、标题省略、列表悬浮删除、最近任务清空与 `zen-scrollbar` 都应在真实 Tauri 窗口中确认一次
- 明确 Tauri 桌面主路径与 Web fallback 的文档口径，避免再次混淆 `v2.0-Alpha` 与 `v2.0`

默认实机验收顺序：

1. 先跑 legacy `localStorage -> Tauri Store` 迁移与最近编辑恢复。
2. 再跑损坏载荷回退，确认坏数据备份与安全默认值生效。
3. 再跑附件插入、重启恢复与系统打开入口，确认附件不是只恢复卡片，而是真的能打开本地物理文件；本轮已跳过该实机项，后续仍需补测。
4. 再跑缺失媒体退化体感：手动删除图片/附件原文件后重启，确认图片显示占位图、附件显示不可用状态；自动脚本只覆盖状态描述，不替代桌面体感。
5. 再跑删整篇笔记、正文删除媒体、启动后孤儿扫描三类回收。
6. 再跑 Feed 网格/列表视图交互，确认标题省略、列表删除、AI 补标失败展示与最近任务清空均正常。
7. 再跑 Windows/Tauri 滚动条体感，确认 `zen-scrollbar` 已彻底移除原生粗灰条，并只在滚动区域悬停时露出极淡侧边细线。
8. 最后跑纯 Web fallback，确认 `localStorage + Data URL` 降级链路仍正常。

### `v2.1`

负责：

- `Global Shortcuts`
- `系统托盘与静默守护`
- 后台宿主与轻量任务脱离主窗口生命周期

当前进度：

- 当前尚未进入正式实现态。
- 本地媒体引擎、附件恢复、缺失退化与孤儿回收已经统一并入 `v2.0 Native Persistence & Media`，不再作为 `v2.1` 的独立推进项。

## 5. 默认续开发协议

如果下次用户只说“继续”“看 docs 继续”“同步 docs 并推进”，默认按下面流程执行：

1. 先读取 [`06-HANDOFF.md`](./06-HANDOFF.md)、[`04-CHANGELOG.md`](./04-CHANGELOG.md)、[`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)。
2. 先确认当前工作应视为“`v1.1` 与 `v1.2` 已结案，默认主战役进入 `v2.0`”。
3. 先确认 `npm run verify:v2` 代表的自动验收基线是否仍然成立；若不成立，优先修复回归再谈扩张。
4. 先确认本轮任务属于 `v1.3`、`v2.0-Alpha`、`v2.0`、`v2.1`、`v2.2` 或 `v2.3` 中的哪一个；若仍想继续深挖推荐链路，也要明确说明这是 `v1.1` 之后的增强，而不是未完成项。
5. 若任务尚未归属版本，先更新 docs，再开始改代码。
6. 完成后默认运行与改动相关的校验，并把结果写回文档。

## 6. 当前不应优先做的事

- 不要把 `/graph` 重新做成重型分析面板。
- 不要引入第二套关系模型或第二套图谱缓存。
- 不要在没有版本归属的情况下随手追加“顺手做了”的能力。
- 不要重新把编辑器变回“边写边骚扰”的字级提示工具。
- 不要继续把 `v0.8`、`v0.9`、`v1.0` 写成三次干净独立发布。

## 7. 推荐验证命令

继续开发前后，至少执行：

```bash
npm run build
```

如果本次涉及页面交互、状态流或组件重构，再执行：

```bash
npm run lint
```

如果本次涉及段落推荐、长文切块或推荐词典调整，再补跑：

```bash
npm run verify:phantom
```

如果本次涉及桌面媒体引用、附件恢复或孤儿文件清理，再补跑：

```bash
npm run verify:native-media
```

如果本次涉及桌面持久化迁移、损坏载荷回退或存储恢复边界，再补跑：

```bash
npm run verify:native-persistence
```

如果本次涉及分包、懒加载边界、编辑器主 chunk 或语义检索 vendor 体积，再补跑：

```bash
npm run verify:bundle
```

如果本次在推进 `v2.0` 的结案准备，优先直接跑：

```bash
npm run verify:v2
```

它会串行执行 `verify:native-persistence`、`verify:native-media`、`verify:desktop-media-config`、`verify:quick-capture`、`lint`、`build` 与 `verify:bundle`，并提醒剩余必须人工完成的桌面验收项。

## 8. 交接结论

下次如果用户只说“读 docs 后继续”，默认理解为：

- 先同步 `docs`
- 先判断任务的版本归属
- 优先做有明确里程碑归属的收口工作
- 保持验证通过
- 再把最新状态回写文档

