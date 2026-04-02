# Flux 迭代日志

本文件是当前项目的版本真相与阶段真相。

## 1. 版本校正说明

本次修正的目标，不是补几段说明，而是把版本体系重新拉直。

- `v0.1 ~ v0.7` 可以继续视作相对线性的早期里程碑。
- `v0.8`、`v0.9`、`v1.0` 在历史上并不是三次严格切开的独立发布；它们是对已经合入主链的能力做回顾性命名。
- 当前代码已经同时包含 `v0.9` 的段落级本地推荐主链和 `v1.0` 的长文语义切块主链。
- 与此同时，一部分原本应在 `v0.8` 完成的文案统一、术语收口和体验清理仍未彻底结束。
- `package.json` 的 `0.0.0` 不是产品版本编号；产品版本只以本文件为准。

因此，当前最准确的称呼是：`v1.0 稳定化阶段`。

## 2. 当前代码基线

当前主链已经稳定存在的能力包括：

- Feed / Write / Graph 三视角骨架
- 扁平 `fluxBlocks`、`savedPools` 与 Zustand persist
- `Adaptive Lens` 显式引用节点与右侧 `Peek Drawer`
- 段落级 `Phantom Weaving`：`2500ms debounce + Entity Lexicon + Fuse.js`
- 用户确认后才真正触发的 `Crystal Assimilation`
- 差异预览、线性 revision、恢复与来源追溯
- `activePoolContext` 与 `recentPoolEvents` 跨视图连续体验
- `Semantic Auto-Chunking & Threading`
- Graph 的 `Semantic Zoom + Spotlight Search + Cluster Framing`

## 2.1 本轮稳定化收口

本轮已完成的收口包括：

- 统一 `Sidebar`、`Command Deck`、`Peek Drawer`、`Graph` 面板中的中英混杂文案
- 将关系语义中的“永久关联”收束为“稳定关联”
- 清理 seed 数据中残留的旧“动态透镜 / 模型摘要”叙事
- 同步修正部分 `API Key`、`Block Search`、`Untitled Note` 一类旧命名
- 在 `/write` 中新增低存在感的 `stage / source` 手动管理入口：支持 `!阶段`、`^来源` 前缀录入，并在主标签区下方以灰度次级元数据条显示
- 将 `stage / source` 继续接入 `/feed` 与 `/graph`：Feed 已可建议与筛选这两类维度，Graph 已可低存在感展示阶段与来源
- 将前台 UI 文案继续去魅化：`发现相关节点`、`提取核心摘要`、`更新原文`
- 修复带标题的超长段落在切块时仍可能超过安全阈值的问题
- 新增 `npm run verify:phantom`，为长文切块与本地推荐补上极限噪音回归沙盒
- 新增开源版 onboarding seed 数据，并在空仓首次启动时自动注入
- 重写根目录 `README.md`，补齐 Manifesto、核心特性、运行指南与 BYOK 说明
- 扩充 `.gitignore`，补上本地环境变量与常见编辑器缓存的忽略规则

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
- 关系语义进一步收口

### `v0.7` 嗅探质量验证与维度管理补强

已纳入当前代码基线：

- Phantom 词典进一步收缩到结构化来源：`title / project / domain`
- 更严格的短词、停用词与中文误报抑制
- `/write` 标签输入收束为前缀路由
- 顶部标签输入框响应式伸缩

### `v0.8` 引用语言与体验收口

这是“部分进入代码、但尚未彻底收口”的阶段，不应再把它写成已经干净完成的发布。

当前已落地的部分：

- 核心链路的部分文案已经去魅化
- `Adaptive Lens`、Drawer、同化预览、版本历史的表达比早期更统一

当前仍未彻底完成的部分：

- 站内仍有零星旧文案、旧术语与动作命名残留
- 文档与代码在一段时间内发生过明显漂移
- 体验语气还没有彻底统一到同一套产品语言

### `v0.9` 段落级本地推荐与人工确认漏斗

这部分已经进入当前主链：

- 下线整篇扫描与页面底部重型决策面板
- 只监听当前自然段落
- 使用 `2500ms debounce + Entity Lexicon + Fuse.js` 做本地高置信预筛
- 命中后只浮出右下角轻提示
- 点击后打开 Drawer，并在用户确认后才调模型
- `dimensions.source` 承担稳定关联写入职责

### `v1.0` 语义切块与线程串联

这部分已经进入当前主链：

- `Quick Capture` 超过阈值时进入本地切块
- 优先按 Markdown 标题、双换行、句末符切分
- 切块后共享 `threadId`
- 通过 `project / source` 线程标签串联上下文
- 批量调用 `addBlocks()` 渐进式落盘
- 默认跳过逐块 AI 打标，避免并发洪峰
- 已修复 UTF-8 编码损坏与危险的 chunk 去重逻辑

## 4. 当前未完成事项

以下问题依然成立：

- 没有后端、同步、权限和协作能力
- `stage / source` 已进入数据模型，并已在 `/write`、`/feed`、`/graph` 完成第一轮低存在感接入；但还没有独立批量管理、统计或自动化规则层
- 同化动作仍是前端直连模型，没有缓存、队列和任务层
- 当前版本历史仍然是本地线性数组，不支持分支与跨设备同步
- docs 与代码虽然已经大体对齐，但后续每轮改动后仍要继续同步，避免再次漂移

## 5. 当前阶段结论

当前最合理的判断不是“继续往后跳版本”，而是先把 `v1.0` 收稳。

当前阶段应优先做：

1. 修正 docs 与代码现状的漂移，让所有文档重新指向同一个真实基线。
2. 清理站内残留旧文案、乱码与历史交互术语。
3. 为 `Phantom Weaving` 与长文切块补更多固定样本与回归验证。
4. 处理小型技术债，降低后续继续演进的修改成本。

## 6. 下一阶段建议

如果没有更高优先级指令，下一阶段默认优先做这些事：

1. 继续收口 `v0.8` 未完成的文案与交互统一工作。
2. 补 `Phantom Weaving` 与 `Semantic Auto-Chunking` 的验证样本。
3. 继续压低页面层耦合与遗留样例文件带来的维护成本。
4. 继续减轻页面层和 store 层的小型技术债，降低后续演进成本。

## 7. 继续开发前的推荐阅读顺序

1. [`06-HANDOFF.md`](./06-HANDOFF.md)
2. [`04-CHANGELOG.md`](./04-CHANGELOG.md)
3. [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)
