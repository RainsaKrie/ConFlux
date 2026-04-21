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
- 因此当前最准确的说法现在更新为：`v1.1 已结案，下一阶段待决`。

额外注意：

- `package.json` 的 `1.0.0` 现在表示开源发布包版本元数据。
- 产品版本真相只以 [`04-CHANGELOG.md`](./04-CHANGELOG.md) 为准。

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

下一步默认任务：

- 补齐 `v2.0` 的结案清单，而不是提前跳去 `v1.3` 或 `v2.1`
- 优先验证桌面存储主路径的恢复边界、迁移边界与异常文件边界
- 把本地图片/附件链路从“已接通”推进到“重启后仍稳定可用”的完整闭环
- 明确 Tauri 桌面主路径与 Web fallback 的文档口径，避免再次混淆 `v2.0-Alpha` 与 `v2.0`

默认实机验收顺序：

1. 先跑 legacy `localStorage -> Tauri Store` 迁移与最近编辑恢复。
2. 再跑损坏载荷回退，确认坏数据备份与安全默认值生效。
3. 再跑图片/附件插入、重启恢复、缺失退化。
4. 再跑删整篇笔记、正文删除媒体、启动后孤儿扫描三类回收。
5. 最后跑纯 Web fallback，确认 `localStorage + Data URL` 降级链路仍正常。

### `v2.1`

负责：

- `Local Media Engine`

当前进度：

- Tauri 侧已接入 `plugin-fs`，并为 `$APPDATA/media/` 目录补上受限 scope
- 应用启动时会确保 `C:\Users\ROG\AppData\Roaming\com.conflux.desktop\media\` 存在
- `FluxEditor` 已接入图片粘贴/拖拽拦截：Tauri 下会把图片写入本地 `media/` 目录并通过安全本地 URL 插入编辑器
- 新写入的图片节点已开始保存可重建的本地引用元信息；应用重开时会尝试重建安全 URL，若文件缺失则回退到低干扰占位图
- 旧桌面图片若尚未保存完整元信息，也会尽量从既有 `src / fileName` 推断相对路径并重新接回恢复链路
- 现在普通附件也会在 Tauri 下落入本地 `media/` 目录，并以轻量附件卡片写入正文；应用重开后会恢复本地打开入口，若文件缺失则降级为不可用状态
- 从 Feed 删除整篇笔记时，系统会保守清理其独占的本地图片/附件：若对应文件不再被其他笔记引用，则会一并从桌面 `media/` 目录移除
- 编辑器正文保存后，系统也会保守清理这次被移除且已无其他引用的本地图片/附件，避免长期积累孤儿文件
- 在桌面持久化 hydration 完成后，应用还会对 `media/` 目录执行一次启动级孤儿扫描，清理历史遗留且已无任何笔记引用的媒体文件
- Web 环境保持降级策略：若非 Tauri，则回退为 Data URL 插入，保证浏览器版不崩溃

## 5. 默认续开发协议

如果下次用户只说“继续”“看 docs 继续”“同步 docs 并推进”，默认按下面流程执行：

1. 先读取 [`06-HANDOFF.md`](./06-HANDOFF.md)、[`04-CHANGELOG.md`](./04-CHANGELOG.md)、[`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)。
2. 先确认当前工作应视为“`v1.1` 已结案，下一阶段待决”。
3. 先确认当前工作应视为“`v1.1` 与 `v1.2` 已结案，默认主战役进入 `v2.0`”。
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

如果本次在推进 `v2.0` 的结案准备，优先直接跑：

```bash
npm run verify:v2
```

它会串行执行 `verify:native-persistence`、`verify:native-media`、`lint` 与 `build`，并提醒剩余必须人工完成的桌面验收项。

## 8. 交接结论

下次如果用户只说“读 docs 后继续”，默认理解为：

- 先同步 `docs`
- 先判断任务的版本归属
- 优先做有明确里程碑归属的收口工作
- 保持验证通过
- 再把最新状态回写文档

