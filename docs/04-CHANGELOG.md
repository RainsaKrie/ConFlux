# Conflux 迭代日志

本文件是当前项目的版本真相，也是 Roadmap 的唯一分发表。

当前发布印戳：`v1.0.0 Release Candidate`

## 1. 版本校正说明

- `v0.1 ~ v0.7` 可以继续视作相对线性的早期里程碑。
- `v0.8`、`v0.9`、`v1.0` 在历史上并不是三次严格切开的独立发布；它们是对已经合入主链的能力做回顾性命名。
- 当前代码已经同时包含 `v0.9` 的段落级本地推荐主链和 `v1.0` 的长文语义切块主链。
- 因此，当前最准确的称呼仍然是：`v1.0 稳定化阶段`。
- `package.json` 的 `0.0.0` 不是产品版本编号；产品版本只以本文件为准。

## 2. 当前代码基线

当前主链已经稳定存在的能力包括：

- Feed / Write / Graph 三视角骨架
- 扁平 `fluxBlocks`、`savedPools` 与 Zustand persist
- `Adaptive Lens` 显式引用节点与右侧 `Peek Drawer`
- 段落级 `Phantom Weaving`：`2500ms debounce + Entity Lexicon + Fuse.js`
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
- 对外品牌名正式锁定为 `Conflux`，并已同步到 UI 文案、`docs/`、`README.md`、`index.html` 与 `package.json`
- 首启引导 seed 已按发布要求收敛为 3 篇正式探讨性节点，统一使用 `Conflux` 项目标签并服务开源首次体验
- 根目录 `README.md` 已重写为面向 GitHub 开源社区的工程化说明文档，当前基线可视为 `v1.0` 开源发布就绪
- 根目录已补齐 `.env.example`、`LICENSE(MIT)` 与更克制的开源 README，并让默认 AI 配置支持通过 `VITE_AI_BASE_URL / VITE_AI_API_KEY / VITE_AI_MODEL` 注入本地 BYOK 参数
- 默认 AI 配置已从“预填 DeepSeek 回退值”调整为“空默认 + 示例 placeholder / .env.example”，确保提供商选择权仍完全掌握在用户手里
- `v1.0.0 Release Candidate`：当前基线已完成品牌、文案、首启引导、数据主权边界与构建验收收口，可作为 GitHub 开源发布候选包

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

定位：`Semantic & Fission`

负责事项：

- `混合召回引擎 (Hybrid Search)`
  - 引入本地或极轻量级 Embedding 检索，辅助 `Entity Lexicon`
  - 让 `Phantom Weaving` 具备同义词、近义词理解能力
- `意图裂变器 (Intent Fission)`
  - 在 Quick Capture 阶段拦截混杂长文本
  - 通过大模型把输入拆成多个具备独立标签的原子知识块

### `v1.2` 创作体验期

定位：`Rich Media & Block Ergonomics`

负责事项：

- `多媒体承载 (Local Media Support)`
  - 支持图片本地粘贴与拖拽上传
  - 通过 `IndexedDB` 承载媒体资源，突破 `localStorage` 容量硬顶
- `动态大纲与折叠 (Outliner & Fold)`
  - 在主编辑器与 `Peek Drawer` 中补齐 TOC、大纲跳转与折叠能力

### `v1.3` 信息流管网期

定位：`Advanced Filtering & Canvas`

负责事项：

- `白板视图 (Infinite Canvas / Whiteboard)`
  - 在 Feed / List / Graph 之外补齐自由拖拽二维看板
- `高级属性看板 (Advanced Properties)`
  - 提供表格视图与批量属性整理入口
  - 放开维度的高级手动治理能力

### `v2.0-Alpha` 平台跨越期

定位：`Desktop Native & Interop`

负责事项：

- `架构逃逸 (Tauri Encapsulation)`
  - 使用 `Tauri v2` 打包 React 产物
  - 使用本地 `SQLite` 代替浏览器 `IndexedDB`
- `系统级集成 (OS Integration)`
  - 监听全局快捷键，在任何软件上层悬浮唤出 `Quick Capture`
- `本地优先同步 (P2P / Git-backed Sync)`
  - 介入文件系统，让笔记以 `Markdown / JSON` 形式落盘
  - 为 WebDAV 或 Git 增量备份提供基础

## 5. 当前阶段结论

当前阶段依然不是继续往后跳版本，而是把 `v1.0` 稳定化基线收好，为连续的 `v1.x` 演进铺路。

现在所有工作都必须回答一个问题：它究竟属于 `v1.1`、`v1.2`、`v1.3` 还是 `v2.0-Alpha`。

如果答不出来，就不进入排期。

## 6. 继续开发前的推荐阅读顺序

1. [`06-HANDOFF.md`](./06-HANDOFF.md)
2. [`04-CHANGELOG.md`](./04-CHANGELOG.md)
3. [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)

