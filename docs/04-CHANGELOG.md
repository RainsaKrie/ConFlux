# Conflux 迭代日志

本文件是当前项目的版本真相，也是 Roadmap 的唯一分发表。

当前发布印戳：`v1.0.0 Release Candidate`

## 1. 版本校正说明

- `v0.1 ~ v0.7` 可以继续视作相对线性的早期里程碑。
- `v0.8`、`v0.9`、`v1.0` 在历史上并不是三次严格切开的独立发布；它们是对已经合入主链的能力做回顾性命名。
- 当前代码已经同时包含 `v0.9` 的段落级本地推荐主链、`v1.0` 的长文语义切块主链，以及已完成收口的 `v1.1` 混合召回主链。
- 因此，当前最准确的阶段描述应更新为：`v1.1 / v1.2 已结案，当前默认主战役为 v2.0 Native Persistence & Media`。
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
- `Tauri v2` 桌面壳层、`Tauri Store + localStorage fallback` 混合持久化与 `Runtime Boundary` 诊断
- 桌面本地 `media/` 图片/附件写入、恢复、缺失退化、受限打开与 revision-safe 孤儿回收
- `verify:v2` 聚合验收主链：`verify:native-persistence`、`verify:native-media`、`verify:desktop-media-config`、`verify:quick-capture`、`lint`、`build`、`verify:bundle`

## 2.1 当前进度快照

- 当前工作应视为：`v1.1` 与 `v1.2` 已结案，最近一轮默认主战役已经进入 `v2.0 Native Persistence & Media`
- 自动验收现状：本地工作区已实际跑通一次 `npm run verify:v2`
- 当前自动覆盖范围：桌面持久化迁移/回退、原生媒体引用与清理、桌面媒体配置、速记补标状态机、`lint`、生产构建与 bundle budget
- 当前剩余风险主要不在自动脚本，而在桌面实机清单：首启迁移、重启恢复、附件系统打开、删文件后的缺失退化、真实 Tauri WebView 里的滚动条与低噪音交互

## 2.2 本轮稳定化收口

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
- 为 `v2.0` 的桌面存储边界补上第一轮安全收口：当前会在读取到损坏的 `localStorage / Tauri Store` 持久化载荷时自动备份并回退到安全默认值，避免坏数据持续卡住冷启动；同时在窗口隐藏/关闭前主动冲刷 `Tauri Store` 的延迟写入，减少最近编辑丢失风险
- 在设置弹层新增 `Runtime Boundary` 诊断卡：当前会明确显示会话正运行在 `Tauri` 桌面壳还是纯 Web 环境，并展示持久化与媒体分别走的是 `conflux_universe.json + media/` 还是 `localStorage + Data URL` 路径，降低 `v2.0` 实机验收时的边界歧义
- 将桌面持久化桥接逻辑抽离为独立 `hybridPersistStorage` 模块，并把 `verify:native-persistence` 从 helper 级断言扩展到真实适配路径：现在会直接回归 Web 读取、legacy -> Tauri 迁移、损坏 `Tauri Store` 载荷回退、原生写入镜像同步与删除失败 fallback
- 将原生媒体启动扫描中的“目录项 -> 孤儿文件删除候选”决策抽成独立 helper，并把 `verify:native-media` 扩展到目录扫描路径：现在会额外回归合法媒体文件识别与启动级 orphan cleanup 候选计算，降低历史遗留文件误删风险
- 收紧 TipTap 多媒体输入主链：粘贴/拖拽图片时由编辑器事件层主动拦截，Tauri 下优先写入 `$APPDATA/media/` 物理文件并通过 `convertFileSrc` 回填正文；写入失败或 Web 环境会自动降级为 Base64，避免巨型 Data URL 重新成为桌面主路径；该链路已完成一轮桌面实机验证
- 为本地附件补上系统级打开路径：附件卡片在 Tauri 下会通过受限 command 打开 `media/` 目录内的物理文件，不再只依赖浏览器式 `asset://` 链接打开；编辑器 NodeView 与静态渲染态附件都会被统一接入这条打开路径；Rust 侧已补上路径安全单测，覆盖 Windows 分隔符归一、路径穿越、绝对路径与非 `media/` 路径拒绝
- 将缺失媒体退化规则抽成 `nativeMediaRecovery` 纯 helper：图片缺失时会保留原 alt 并追加不可用提示、切换为低干扰占位图；附件缺失时会移除打开 href、标记不可用并保留结构元数据；`verify:native-media` 已覆盖可用/缺失两类状态描述
- 将本地媒体 GC 升级为 revision-safe：新增 `extractActiveMediaFiles(blocks)` 与 `cleanupOrphanMedia(blocks)`，会同时扫描 `block.content`、`revision.beforeContent` 与 `revision.afterContent` 中的图片/附件引用；启动后延迟后台 GC、编辑保存后的即时清理、Feed 删除笔记后的清理都已改为使用同一套有效引用列表，确保历史版本仍引用的媒体不会被误删
- 修复速记卡片的 AI 配置补录断档：当前若用户在 `Quick Capture` 生成 fallback 卡片后才完成 `AI 设置`，Feed 会自动补跑待处理的标题/标签生成，而不再要求用户手动重建卡片；失败项会保留状态并在配置变更后重试
- 修正 AI 设置中的 Base URL 兼容性：若用户直接填写完整 `/chat/completions` 地址，系统现在会直接使用该地址，不再重复拼接导致 `HTTP 404`；同时失败过的速记补标会在会话内自动重试一次，便于配置修正后恢复
- 为速记 AI 补标失败补上前台可见反馈：卡片会直接显示“AI 补标失败”及对应 API 提示，最近任务面板也会完整展示失败文案，避免用户只能从未变化的标签猜测后台状态
- 收紧 AI 标题生成纪律：Prompt 现在要求保留原文中的核心英文术语/专有名词；前端在替换 fallback 标题时也会保护首行明确英文概念，避免把 `Agent` 一类实体覆盖成“主体概念溯源”这类泛化标题
- 收口 Feed 卡片标题显示：网格卡片主标题已改为单行省略，避免长标题被硬切断后造成语义误读
- 补齐 Feed 列表视图删除能力：列表行现在拥有悬浮显示的低存在感删除按钮，并复用既有删除确认与本地媒体孤儿清理链路
- 收紧最近 AI 任务面板：`recentAiTasks` 持久化最多保留 5 条，侧边栏最多展示 3 条，并新增低存在感“清空”入口，避免失败任务长期堆叠破坏侧边栏极简体验
- 修正速记 AI 补标状态机的“假忙碌”问题：卡片状态现已区分 `等待 AI 补标` 与 `AI 正在补标`；同时为补标请求补上超时边界，并允许在页面刷新/切换后重新捞起卡住的 `processing` 卡片，避免新卡片长期停在“正在补标”的假状态
- 将速记补标状态边界抽离为独立 helper，并新增 `npm run verify:quick-capture`：当前会自动回归 legacy 速记识别、`pending / processing / completed` 状态判定，以及 `404 / 401 / 429 / timeout` 错误映射；`verify:v2` 也已并入这条检查，避免后续再把补标状态机改回“只能靠人工体感发现”的黑盒
- 为桌面媒体底座补上配置级回归：新增 `npm run verify:desktop-media-config`，会自动检查 `src-tauri/capabilities/default.json` 中的 `fs:allow-*` 权限、`fs:scope`，以及 `tauri.conf.json` 中的 `assetProtocol + scope` 是否仍然指向 `$APPDATA/media`；`verify:v2` 已接入这条检查，用于防止未来再次出现“文件能写入但 WebView 无权读取”的隐性回退
- 清理缺失媒体标签中的历史字符污染：图片原始 alt 与“本地媒体不可用”提示之间现统一使用稳定的 ASCII ` - ` 分隔，而不再出现异常中点字符；`verify:native-media` 也已补上这条回归，确保缺失图片的可访问文本不会继续带入脏字符
- 修正整篇笔记删除时的媒体清理遗漏：当前删除笔记时不再只扫描 `block.content`，而会把该笔记的 `revisions.beforeContent / afterContent` 一并纳入 removed media 集合；这样那些只存在于历史版本里的独占图片/附件也能进入同一条 orphan cleanup 链路，`verify:native-media` 已补上整篇删除场景的回归
- 继续补强共享媒体的 revision-safe 回归：`verify:native-media` 现会额外覆盖两类高风险场景，一是“被删除笔记中的媒体仍被另一条笔记的 revision 引用时不得误删”，二是“启动级 orphan scan 遇到 revision-only 引用时必须保留”；用自动化把“宁可漏删，不可误删”这条原则再钉实一层
- 为缺失媒体退化补上前台可见诊断：当前当桌面端图片/附件在重启重载或运行时被发现缺失时，会把最近一次事件写入稳定诊断结构，并在设置面板中显示媒体类型、发现时机与 `media/...` 相对路径；`verify:native-media` 也已覆盖这条诊断的读写协议，减少实机验收时只能靠占位图肉眼判断的噪音
- 新增全局 `zen-scrollbar` 工具类，并应用到 Sidebar、主内容滚动区、设置面板、Peek Drawer、Command Deck、筛选建议与 Graph 侧栏；当前已从“压低原生滚动条宽度”升级为“隐藏原生滚动条 + hover 时自绘极淡侧边细线”，避免 Windows/Tauri 下粗灰滚动条继续破坏 `Zen Canvas`
- 收口生产构建 chunk 体积：`/write` 已将 TipTap 编辑器面板拆为二级 lazy `EditorSurface`，并通过 Rollup / Rolldown 双路径 `manualChunks` 将 editor、Transformers 与 ONNX runtime 拆成独立 vendor chunk；`EditorPage` 从约 `506KB` 降到约 `55KB`，`embedder` 入口从约 `805KB` 降到约 `0.8KB`，`verify:v2` 的 native config loader 构建也不再触发大 chunk warning；第三方 `onnxruntime-web` direct eval 噪音已在构建检查中抑制，同时用 ESLint `no-eval` 继续禁止一方代码引入 direct eval
- 新增 `npm run verify:bundle` 并接入 `verify:v2`：当前会在生产构建后检查最大 JS chunk、`EditorPage`、`EditorSurface`、`embedder`、editor vendor、Transformers vendor 与 ONNX runtime vendor 的尺寸预算，防止后续改动把 TipTap 或 Transformers 重新打回页面主 chunk
- 为 `v2.0` 的异常恢复边界补上前台可见诊断：当前当 `localStorage / Tauri Store` 载荷损坏并触发备份 + 回退时，会把最近一次恢复事件写入稳定诊断结构，并在设置面板中显示来源、回退目标、备份 key 与原始错误；`verify:native-persistence` 也已覆盖这条诊断记录链，减少桌面验收时只能依赖控制台判断的黑盒感
- 为 `v2.0` 的人工桌面验收补上系统级路径入口：设置面板中的数据库文件与本地 `media/` 目录现在除了可复制路径，也支持在 Tauri 环境下一键用系统默认方式打开，便于直接检查 `conflux_universe.json`、附件落盘与孤儿媒体回收结果
- 修正 `v2.0` 本地媒体读取链路的桌面协议缺口：当前已在 `tauri.conf.json` 中显式开启 `app.security.assetProtocol`，并将访问范围收束到 `$APPDATA/media`；这一步是 `convertFileSrc()` 在 Tauri 2 中稳定加载本地图片/附件的必要前提，用于消除“文件已落盘但 WebView 仍将其视为未授权本地资源”的灰区

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

#### `v2.0` 当前进度

- `Native Persistence`
  - `Tauri Store` 已接入主链，Zustand persist 已切换为异步桌面存储适配。
  - 首启已支持从 legacy `localStorage` 无损迁移并落盘到 `conflux_universe.json`。
  - 当前桌面端已完成真实文件落盘验证，说明 `v2.0` 的原生存储主轴已经成形。
  - 当前已补上损坏载荷安全回退与退出前刷盘：坏掉的桌面 / Web 持久化内容会先备份再回退，窗口隐藏或关闭前也会主动冲刷待写入的 `Tauri Store`。
  - 当前已补上 `npm run verify:native-persistence`：可回归验证持久化序列化、坏数据备份 key/payload 格式与非法载荷判定逻辑，降低 `v2.0` 存储恢复回归成本。
  - 当前设置弹层已可直接显示最近一次存储恢复记录：若 `localStorage / Tauri Store` 载荷损坏并触发恢复，用户现在可以直接看到来源、回退目标、备份 key 与原始错误，不再只能从控制台日志反推恢复是否发生。
  - 当前设置弹层已可直接显示会话运行边界：桌面端会展示 `conflux_universe.json` 主路径与 `flux_blocks_store` 回退镜像键名，Web 端则会明确显示 `localStorage` 回退路径。
  - 当前设置弹层已可在桌面环境下一键打开数据库文件与本地 `media/` 目录，降低迁移、恢复、附件与孤儿文件验收时的路径摩擦。
  - 当前已补齐本地媒体回读所需的 Tauri `assetProtocol` 配置：`convertFileSrc()` 生成的桌面本地 URL 不再依赖隐式默认值，而是显式限定在 `$APPDATA/media` scope 内，避免出现“文件写入成功但图片/附件仍被 WebView 拦截”的假性缺失。
- `Native Media`
  - `plugin-fs` 与 `$APPDATA/media/` 基础 scope 已进入实现态。
  - `FluxEditor` 已能在 Tauri 环境下拦截粘贴/拖拽图片并写入本地 `media/` 目录；Web 环境保持降级回退。
  - 当前图片节点已开始保存可重建的本地引用元信息；桌面端重开应用时会尝试重建本地 URL，并在文件缺失时回退到低干扰占位图。
  - 当前已补上旧桌面图片的兼容恢复：即使早期图片节点尚未保存完整元信息，也会尽量从既有 `src / fileName` 推断本地相对路径，再并入同一套重建链路。
  - 当前已补上非图片附件的桌面闭环雏形：Tauri 下粘贴/拖拽普通文件会落入本地 `media/` 目录，并以轻量附件卡片写入正文；重开应用后会恢复本地打开入口，文件缺失时则回退到低干扰不可用状态。
  - 当前已补上第一层孤儿媒体回收：从 Feed 删除整篇笔记时，系统会检查该笔记引用的本地图片/附件是否仍被其他笔记使用；若已无引用，则会一并从桌面 `media/` 目录移除，避免目录只增不减。
  - 当前已补上正文保存后的第二层孤儿媒体回收：当用户在编辑器中删除图片或附件并触发持久化保存后，系统也会检查被移除的本地媒体是否仍被其他笔记引用；若已无引用，则会同步清理桌面 `media/` 目录中的孤儿文件。
  - 当前已补齐整篇笔记删除时的 revision 覆盖：删除卡片时会把该笔记当前正文与 `revision.beforeContent / afterContent` 中的媒体引用一起视为 removed set，不再遗漏那些只存在于历史版本中的独占媒体文件。
  - 当前已补上启动后的历史孤儿扫描：待桌面持久化状态完成 hydration 后，应用会延迟执行一次保守自检，将那些已经没有任何笔记与历史版本引用的遗留媒体文件清理掉。
  - 当前本地媒体 GC 已纳入 revision 保护：`block.content`、`revision.beforeContent` 与 `revision.afterContent` 中出现过的媒体文件名都会被视为有效引用，避免版本回滚需要的图片/附件被后台误删。
  - 当前已补上 `npm run verify:native-media`：可回归验证图片/附件引用提取、legacy 文件名推断、缺失媒体退化、revision-only 媒体保护与孤儿媒体判断逻辑，降低 `v2.0` 媒体治理回归成本。
  - 当前设置弹层已补上“最近一次本地媒体缺失”诊断：若图片或附件在重启重载或运行时被发现已不在桌面 `media/` 目录中，界面会直接显示媒体类型、发现时机与相对路径，方便实机定位是“文件真的没了”还是“渲染链路坏了”。
  - 当前设置弹层已可直接显示媒体运行路径：桌面端会展示 `$APPDATA/media/` 实际目录，Web 端则会明确提示图片继续以内联 `Data URL` 方式降级写入正文。
  - 但这条链目前仍更像“已形成主链雏形”，还没有完全收成 `v2.0` 的正式结案状态。
- `Feed / AI UX Stabilization`
  - 速记 fallback 卡片已具备“配置补齐后自动补标”的恢复路径，避免用户因为一开始忘记填 API 而得到永久不会更新的卡片。
  - API 配置失败已具备前台可见反馈，常见 `404 / 401 / 403 / 429` 会转成可操作提示，减少用户只能靠标签不变来猜测失败原因。
  - 当前已补齐速记 AI 补标的状态恢复边界：`pending` 会明确显示为等待补标，真正发起请求后才进入 `processing`；若请求超时、页面切换或刷新打断，下次回到 Feed 也会重新捞起卡住的卡片，而不再永久停在“AI 正在补标”。
  - AI 生成标题已加入英文术语保护，`Agent`、`RAG` 等核心概念不应再被替换成过度抽象的中文泛化标题。
  - Feed 卡片标题、列表删除按钮、最近任务面板与滚动条都已完成一轮细节打磨，当前 UI 收口重点从“能用”推进到“低噪音、可解释、可恢复”。

#### `v2.0` 当前未完成开发清单

1. `桌面持久化收口`
   - 继续验证 `Tauri Store` 作为桌面主存储路径的稳定性，而不只停留在“能落盘”。
   - 明确版本升级、迁移失败、空文件或损坏文件时的恢复边界。
   - 补齐“桌面主路径 / Web fallback”之间的口径与行为说明。
2. `原生媒体链路收口`
   - 把图片从“能写入本地”推进到“引用、显示、重开应用后继续可用”的完整主链。
   - 继续扩展媒体文件删除、丢失、迁移时的回退表现，不只覆盖图片。
   - 保证正文中的媒体引用不会重新退回到浏览器临时补丁逻辑。
3. `桌面边界澄清`
   - 继续厘清 `v2.0-Alpha` 与 `v2.0` 的分界：壳层初始化已基本到位，后续重点应转向真实数据与媒体落地。
   - 确保文档不会再把“壳层已接入”误写成“桌面版已完成”。
4. `验证与结案口径`
   - 为真实桌面数据落盘、媒体插入、重启后恢复与 Web fallback 补齐验收步骤。
   - 让文档、代码、桌面实机行为三者保持一致。
   - 当前已补上 `npm run verify:v2` 聚合命令：会串行执行 `verify:native-persistence`、`verify:native-media`、`verify:desktop-media-config`、`verify:quick-capture`、`lint`、`build` 与 `verify:bundle`，并输出仍需人工走完的桌面实机清单。
5. `前端细节回归`
   - 在真实 Tauri WebView 中复核 `zen-scrollbar` 是否已经彻底移除原生粗灰条，并在滚动区域 hover 时只显示极淡侧边细线。
   - 在 Feed 网格 / 列表双视图中回归删除、标题省略、AI 补标失败提示与最近任务清空，确保这些低噪音交互不会破坏现有媒体清理和筛选行为。

#### `v2.0` 实机验收清单

以下清单默认作为 `v2.0` 结案前必须至少走完一轮的桌面验证步骤：

1. `持久化迁移`
   - 准备一份仅存在于 legacy `localStorage` 的旧数据，在桌面端首启后确认其被迁移到 `conflux_universe.json`。
   - 确认迁移后 `fluxBlocks / savedPools / recentAiTasks / recentPoolEvents` 都能正常恢复。
   - 自动覆盖：`npm run verify:native-persistence`
2. `持久化恢复`
   - 在桌面端编辑标题、正文与标签后关闭或隐藏窗口，再次启动应用，确认最近修改仍存在。
   - 观察 `Tauri Store` 的延迟写入是否已在退出前被冲刷，不出现“最近几秒编辑丢失”。
3. `异常载荷恢复`
   - 人为制造损坏的 `localStorage` 或 `conflux_universe.json` 载荷，确认应用不会卡死冷启动。
   - 确认坏数据会被备份，再回退到安全默认状态，而不是持续污染主链。
   - 自动覆盖：`npm run verify:native-persistence`
4. `图片恢复`
   - 在桌面端粘贴或拖拽图片，确认文件写入本地 `media/` 目录。
   - 重启应用后确认正文中的图片仍能正常显示，而不是退回浏览器临时 URL。
5. `附件恢复`
   - 在桌面端粘贴或拖拽非图片文件，确认正文中会生成本地附件卡片。
   - 重启应用后确认附件卡片仍可打开本地文件，而不是失去引用。
   - 当前人工实机验证已按本轮决策跳过；自动覆盖已包含受限打开路径的 Rust 单元测试，但仍需后续补一轮真实桌面点击确认。
6. `缺失媒体退化`
   - 手动移动或删除图片/附件原文件后重启应用，确认图片会退化到低干扰占位图，附件会退化到不可用状态。
   - 该过程不应导致正文结构损坏或编辑器崩溃。
   - 自动覆盖：`npm run verify:native-media` 已覆盖缺失图片与缺失附件的状态描述；真实删文件后重启的桌面体感仍需后续补测。
7. `孤儿媒体回收`
   - 删除整篇含独占媒体的笔记后，确认对应文件会从本地 `media/` 目录移除。
   - 在正文中删除图片/附件并完成保存后，确认已失去全部引用的文件会被回收。
   - 启动应用后确认历史遗留孤儿文件会在保守扫描中被清理。
   - 自动覆盖：`npm run verify:native-media`
   - 安全边界：如果媒体仍存在于任意 block 的 revision `beforeContent / afterContent` 中，GC 必须保留该文件，宁可漏删也不能破坏版本回滚。
8. `Web fallback`
   - 在纯 Web 环境下确认 `localStorage` 仍是主持久化路径，图片仍走 Data URL 降级插入。
   - 确认桌面专属媒体逻辑不会让浏览器版报错或崩溃。
9. `文档一致性`
   - 确认 docs 中关于 `Tauri Store + localStorage fallback`、图片/附件本地落盘、缺失退化与孤儿回收的表述，与当前代码行为一致。
10. `自动验收基线`
   - 自动覆盖：`npm run verify:v2`
   - 预期一次性跑通 `verify:native-persistence`、`verify:native-media`、`verify:desktop-media-config`、`verify:quick-capture`、`lint`、`build` 与 `verify:bundle`。

推荐执行顺序：

1. 先跑 `npm run verify:v2`，确认自动回归部分没有退化。
2. 再按上述仍需人工确认的桌面步骤逐项验证。

#### `v2.0` 结案标准

满足以下条件后，`v2.0` 才适合宣布结案：

- `原生持久化`
  - 桌面端持久化已成为稳定主路径，而不是实验接线。
  - legacy 数据可平稳迁移，异常状态具备明确恢复边界。
  - `fluxBlocks` 与相关核心状态在桌面端可持续落盘并重启恢复。
- `原生媒体`
  - 图片/附件链路已在桌面端形成完整闭环：写入、引用、重启后重载都稳定。
  - TipTap 正文只持有本地资源引用，不再依赖 `IndexedDB` 充当富媒体主方案。
  - 媒体缺失或路径失效时有清晰、可控的退化行为。
- `桌面与 Web 边界`
  - Tauri 桌面主路径与 Web fallback 的行为边界清楚且文档一致。
  - `v2.0-Alpha` 的壳层初始化不再与 `v2.0` 的数据/媒体正式落地混为一谈。
- `稳定性`
  - 现有编辑器、自动保存、推荐链路与多语言体验不会因存储/媒体置换而被破坏。
  - 至少完成一轮 `npm run build` 与上述 `v2.0 实机验收清单` 相关的验证闭环。

### `v2.1` 桌面心流期

定位：`OS-Level Ergonomics`

负责事项：

- `Global Shortcuts`
  - 注册系统级快捷键，例如 `Cmd/Ctrl + Shift + Space`
  - 在任意第三方软件之上呼出极简 `Quick Capture`
- `系统托盘与静默守护`
  - 引入 Tray 常驻入口
  - 让后台轻量任务与词典预热脱离主窗口生命周期
- `桌面心流能力`
  - `v2.1` 只保留操作系统层的人体工学事项，例如全局快捷键、托盘常驻与后台宿主
  - 本地媒体引擎已不再作为 `v2.1` 独立战役维护，其实现与验收统一并入 `v2.0 Native Persistence & Media`

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

按当前文档与代码状态，最近一轮默认主战役应视为 `v2.0 Native Persistence & Media`，而不是 `v1.3` 的视图扩张。

如果答不出来，就不进入排期。

## 6. 继续开发前的推荐阅读顺序

1. [`06-HANDOFF.md`](./06-HANDOFF.md)
2. [`04-CHANGELOG.md`](./04-CHANGELOG.md)
3. [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md)

