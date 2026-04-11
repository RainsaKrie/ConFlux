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
- 当前代码基线已经同时包含 `v0.9` 的段落级本地推荐主链和 `v1.0` 的长文切块主链。
- 因此当前最准确的说法仍是：`v1.0 稳定化阶段`。

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

### `v1.2`

负责：

- 本地图片承载与图文混排
- TOC、大纲导航与折叠编辑

当前进度：

- `Outliner & Fold` 已进入第一阶段实现：`/write` 已新增左侧低存在感大纲导航，会实时抽取 `H1 / H2 / H3` 并支持平滑滚动跳转
- 标题折叠已完成工程评估：在现有 TipTap 扩展体系内要做稳定的层级折叠，需要更重的自定义节点或 Decoration 管线；当前版本先交付 TOC 导航，不强行引入重型折叠方案

### `v1.3`

负责：

- `Infinite Canvas / Whiteboard`
- 表格视图与高级属性治理
- `stage / source` 的成熟治理层

### `v2.0-Alpha`

负责：

- `Tauri v2` 桌面包装
- `SQLite` 与本地向量能力
- WebDAV / iCloud 级加密同步
- 系统级全局快捷键与桌面 Quick Capture
- 跨设备 revision 与不再局限于本地线性历史的版本系统

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

## 5. 默认续开发协议

如果下次用户只说“继续”“看 docs 继续”“同步 docs 并推进”，默认按下面流程执行：

1. 先读取 [`06-HANDOFF.md`](./06-HANDOFF.md)、[`04-CHANGELOG.md`](./04-CHANGELOG.md)、[`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)。
2. 先确认当前工作仍应视为 `v1.0 稳定化阶段`。
3. 先确认本轮任务属于 `v1.1`、`v1.2`、`v1.3` 或 `v2.0-Alpha` 中的哪一个。
4. 若任务尚未归属版本，先更新 docs，再开始改代码。
5. 完成后默认运行与改动相关的校验，并把结果写回文档。

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

## 8. 交接结论

下次如果用户只说“读 docs 后继续”，默认理解为：

- 先同步 `docs`
- 先判断任务的版本归属
- 优先做有明确里程碑归属的收口工作
- 保持验证通过
- 再把最新状态回写文档

