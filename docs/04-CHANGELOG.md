# Flux 迭代日志

本文件就是当前项目的版本日志，不再额外维护第二份独立的 release log。

## 当前版本：v0.6 收口版

当前版本已经不再只是“可连续使用的前端 MVP”，而是完成了 `v0.6` 的核心收口：`Phantom Weaving` 已进入 `Entity Lexicon V2`，`Crystal Assimilation` 已具备差异预览、线性版本历史、任意版本恢复与来源追溯链，关键引用链路的文案与交互语言也已完成第一轮统一。

## 已完成

- ✅ 建立 `SidebarLayout + /feed + /write + /graph` 三路由骨架。
- ✅ 使用 Zustand persist 持久化 `fluxBlocks` 与 `savedPools`。
- ✅ 将产品视觉从旧版暗黑面板切换到 `Zen Canvas` 浅色极简风格。
- ✅ 在侧边栏加入 `Gravity Pools`，支持把筛选视角持久化。
- ✅ 在侧边栏加入 `Command Deck` 入口和模型设置入口。
- ✅ 完成 `flux_ai_config` 本地配置，支持兼容 OpenAI Chat Completions 的 BYOK 接口。
- ✅ Feed 页接入 `Omni Filter`、`Quick Capture`、`Grid/List` 视图切换。
- ✅ Quick Capture 提交后支持 AI 自动生成短标题与三维标签。
- ✅ Feed List 视图升级为单行高密度布局，并修复长文本撑爆、标签裁切、Hover Card 遮挡等关键问题。
- ✅ Editor 页支持自动创建文档、自动保存标题与正文。
- ✅ Editor 标题区已拆出正文，支持标签删除、手动补充 `project` 标签、AI 重新审视标签。
- ✅ TipTap 已接入 `@` 提及搜索，并插入自定义 `Adaptive Lens` 节点。
- ✅ Adaptive Lens 已支持前端直连模型并流式生成透镜摘要。
- ✅ Adaptive Lens 来源徽章已接通右侧 `Peek Drawer`，支持并列参考阅读和“全屏编辑此笔记”。
- ✅ Peek Drawer 已恢复只读富文本渲染，并取消全屏遮罩，允许左右并屏写作。
- ✅ `contentToPlainText()` 已增强，能够提取 `adaptive-lens-node` 的 `summary`，使透镜摘要重新参与 Feed 摘要、搜索与 AI 重打标签。
- ✅ Editor 已接入 `Phantom Weaving` 原型：`Fuse.js + title-only` 本地嗅探、幽灵虚线 Decoration、Hover 轻卡与“提取摘要块”动作。
- ✅ `Phantom Weaving` Hover 卡已接通 `逆向同化` 的最小闭环：读取当前段落与目标母体，调用模型融合内容，静默写回 block，并可立刻在右侧抽屉核对结果。
- ✅ `Crystal Assimilation` 成功后会在当前正文附近浮出低压迫挂件，提示“已收录至相关母体”，并允许一键打开抽屉核对。
- ✅ `Phantom Weaving` 已补齐 Anti-Overlinking 细节：短词过滤、停用词过滤、单母体单次命中、精确标题优先。
- ✅ `Phantom Weaving` 已补齐稳定性修复：全文精确标题回看、点击虚线词兜底打开、Hover Card 改为 portal 浮层。
- ✅ 幽灵 Hover Card 已完成高级抛光：玻璃感底板、命中徽章、两行 snippet、1:1 等分动作按钮、侧边抽屉入口。
- ✅ `Adaptive Lens` 已完成“深度脱水”：废除厚重蓝色卡片，改为左引述线 + 正文内联脚注 + hover 才出现的重调按钮。
- ✅ Feed 与 Graph 已切到共享关系语义层：`Adaptive Lens` 引用、显式引用和维度重叠现在走同一套关系推导。
- ✅ Graph 已补齐右侧关系透视面板，能用和 Feed 一致的语言展示正文摘要、主关系与主要关联理由。
- ✅ Graph 页已接入基于引用与维度重叠的关系图谱。
- ✅ Graph 页已完成第一轮交互抛光：节点标签统一贴右侧、透明底、搜索浮层、语义缩放、搜索态聚光灯弱化、结果飞行与选中群系自动 framing。
- ✅ `v0.5.1` 已将 `/graph` 的核心逻辑模块化拆分到 `src/features/graph/`，完成 `constants / utils / rendering / useGraphSearch / useGraphCamera` 的工程收口，且 `npm run build` 与 `npm run lint` 通过。
- ✅ `Gravity Pool` 已升级为跨视图运行时上下文：`activePoolContext` 现已贯通 Feed、Write、Graph。
- ✅ `Phantom Weaving` 已能读取当前 Pool 语境，并对候选母体做轻量加权。
- ✅ `Crystal Assimilation` 已升级为“先预览、再确认、可回滚”的交互闭环，并记录最近 revision。
- ✅ 同化与回滚事件已能以低压迫方式回流到当前 Feed / Graph 视角中的 Pool 事件流。
- ✅ `v0.6 Phase 1` 已将 `Phantom Weaving` 从标题级 `Fuse.js` 匹配升级为 `Entity Lexicon Match`：`title / project / domain` 共同进入正则词典，Hover Card 也会显示 `命中标题 / 命中实体 / 命中领域`。
- ✅ `Crystal Assimilation` 已补齐真正可核对的 Diff Visualization：预览弹层与 Drawer 现共用差异视图面板，而不再只是并排文本。
- ✅ `recentAssimilationRevisions` 已收口为 `fluxBlocks[].revisions[]` 的线性版本历史，并带持久化迁移、长度上限与任意版本恢复。
- ✅ `Crystal Assimilation` 的 revision 已补齐来源追溯：会记录 `sourceBlockId / sourceBlockTitle`，Drawer 可直接跳转回触发这次更新的来源笔记。
- ✅ `Phantom Weaving` 已升级为 `Entity Lexicon V2`：词典来源不再只有 `title / project / domain`，还会吸收 `Adaptive Lens` 摘要与正文前 100 字短语。
- ✅ Hover Card 的命中理由现已统一为 `命中标题 / 命中实体 / 命中摘要/正文`。
- ✅ 关键引用链路已完成第一轮去魅化：`引用并生成摘要 / 更新至原始笔记 / 已同步更新 / 恢复此版本` 已替换早期偏概念化文案。

## 当前限制

- ☐ 仍然没有后端、同步、权限和协作能力。
- ☐ `domain / format / project` 之外的维度已经进入数据模型，但 UI 仍未完整暴露。
- ☐ Editor 手动新增标签目前仍以 `project` 维度为主，完整维度管理还未完成。
- ☐ `Adaptive Lens` 仍然是最稳定的显式引用入口；`Phantom Weaving` 虽已扩展到摘要与正文短语，但还没有固定测试样本与误报回归机制。
- ☐ 当前版本历史仍然是前端本地的线性数组，不支持分支、冲突合并或跨设备同步。
- ☐ 引用语言在核心链路中已经统一，但站内仍可能存在零星旧文案未完全收口。

## 已完成里程碑回顾

### v0.1 目标：Zen Canvas MVP 骨架

- ✅ 建立 `SidebarLayout + /feed + /write + /graph` 三路由骨架。
- ✅ 使用 Zustand persist 持久化 `fluxBlocks` 与 `savedPools`。
- ✅ 将产品视觉统一到 `Zen Canvas` 浅色极简基线。
- ✅ 接通 `Quick Capture`、基础标签系统、`Gravity Pools`、`Command Deck` 与 BYOK 设置入口。

### v0.2 目标：沉浸写作与显式引用

- ✅ Editor 支持自动创建文档、自动保存标题与正文。
- ✅ TipTap 已接入 `@` 提及搜索，并插入自定义 `Adaptive Lens` 节点。
- ✅ Adaptive Lens 已支持前端直连模型并流式生成透镜摘要。
- ✅ 来源徽章已接通右侧 `Peek Drawer`，支持并列参考阅读与全屏切换。
- ✅ `contentToPlainText()` 已增强，透镜摘要重新进入 Feed、搜索与 AI 重打标签链路。

### v0.3 目标：Phantom Weaving 原型

- ✅ 在 TipTap 中加入深度停顿后触发的本地静默嗅探。
- ✅ 使用 `Fuse.js` 对 `fluxBlocks.title` 做轻量本地匹配。
- ✅ 用极轻量的虚线 Decoration 标记潜在关联，避免打断写作流。
- ✅ 加入 Anti-Overlinking 约束：短词过滤、停用词过滤、单母体单次命中、`1500ms + requestIdleCallback`、更淡的默认视觉。
- ✅ Hover 轻卡已提供 `提取摘要块`、母体预览与 `逆向同化` 入口。

### v0.4 目标：Crystal Assimilation 闭环

- ✅ 拦截当前新段落与目标母体全文，构造结构化“同化”提示词。
- ✅ 调用模型生成融合后的母体正文，而不是简单追加在尾部。
- ✅ 将融合结果用于改写目标母体，并在编辑器中形成低压迫反馈闭环。
- ✅ 当前实现已进一步升级为差异预览、确认应用、版本历史、任意版本恢复与来源追溯。

### v0.5 目标：零压迫知识流

- ✅ 继续弱化“显式操作”心智负担，让主动预期覆盖标题级命中、Hover Card 与抽屉预览场景。
- ✅ 将 `Adaptive Lens` 从笨重卡片改造成更接近正文的引述流，明显降低视觉噪音。
- ✅ 打通 Feed、Editor、Graph 三视图对潜在关联的统一表达。
- ✅ Graph 视图完成 `Semantic Zoom + Spotlight Search + Cluster Framing` 收官批次，具备大图检索与局部聚焦能力。
- ✅ `Gravity Pool`、`Phantom Weaving`、`Crystal Assimilation` 已形成可用的连续体验主链。
- ✅ `v0.5` 已正式完成。

### v0.5.1 目标：Graph 工程化收口

- ✅ 把 `/graph` 从 God Object 形式的 `GraphPage.jsx` 拆分为独立特性目录。
- ✅ 将 force / camera / node styling / pointer area / cluster framing 等 magic number 常量化。
- ✅ 将 Spotlight Search 与 cluster camera 逻辑从页面中抽离成自定义 hooks。
- ✅ 保持 Graph 现有视觉和交互不变，仅做 refactor without behavior change。

### v0.6 Phase 1 目标：Entity Lexicon Match

- ✅ 将 `Phantom Weaving` 的召回底层从标题级 `Fuse.js` 替换为实体词典 + 全局正则扫描。
- ✅ 词典来源已覆盖 `block.title`、`dimensions.project`、`dimensions.domain`。
- ✅ 词条已加入长度过滤、停用词过滤、长度降序匹配与基础英文边界校验。
- ✅ Hover Card 已能体现命中原因，不再默认把所有命中都解释成标题命中。

### v0.6 Phase 2 目标：Diff / Version History / Origin Traceability

- ✅ `AssimilationDiffPanel` 已成为预览弹层与 Drawer 共用的差异视图基座。
- ✅ 版本历史已从全局脆弱列表迁移为每个 Block 内嵌的 `revisions[]` 线性结构，默认保留最近 5 次。
- ✅ Drawer 顶部已升级为 `Version History`，可选择任意历史版本并恢复到该版本。
- ✅ revision 已记录来源笔记 ID 与标题，允许从历史记录直接跳回触发这次更新的源笔记。

### v0.6 Phase 3 目标：Entity Lexicon V2 与引用语言统一

- ✅ `Phantom Weaving` 已将 `Adaptive Lens` 摘要和正文 snippet 纳入词典来源。
- ✅ 词条现按“长度降序 + 权重优先”统一排序，优先级为 `title > entity > summary > snippet`。
- ✅ Hover Card、来源脚注、成功挂件与 Version History 的核心文案已收敛到同一套更克制的引用语言。

## Graph 当前状态备忘

为了确保下一次会话只读 docs 就能直接继续，这里单独记录 `/graph` 当前可依赖的事实：

- 节点标签固定绘制在节点右侧，不再根据象限切换位置。
- 标签默认透明底，且只有在 `zoomed-in / hovered / search-matched` 时才显示。
- 图谱左上角已有 `Spotlight Search` 浮层，使用 `Fuse.js` 对 block 标题做模糊匹配。
- 搜索结果点击后不再只跳单点，而是进入选中态，再由群系 framing 统一处理镜头。
- 选中节点后，会把“该节点 + 一阶关联节点”视作当前群系，并执行保守的居中缩放。
- 当前 Graph 页面已经收口为组合层，核心逻辑已拆到 `src/features/graph/`。
- 如果继续扩展 Graph，高优先级不再是“先拆文件”，而是考虑和 Gravity Pool 的筛选联动、群系表达与跨视图连续体验。

## 当前阶段结论

这一阶段可以视为已经完成：

- ✅ `v0.6` 的核心产品闭环已打通：`Entity Lexicon V2 + Diff Visualization + Version History + Origin Traceability` 已全部进入实现态。
- ✅ 引用链路的主要交互语言也已经完成第一轮统一，不再阻碍下一阶段继续扩展能力。

下一阶段更合理的重点应转向：

- ☐ 为 `Phantom Weaving` 建立固定测试样本与误报/漏报评估机制。
- ☐ 在 `/write` 中补齐更完整的 `domain / format / project` 手动元数据管理。
- ☐ 视需要开始处理构建体积、回归验证与更长期的后端化边界。

### v0.7 建议：更聪明但依旧克制的嗅探

- ☐ 在标题命中稳定后，再谨慎扩展到标签、透镜摘要与局部正文短语。
- ☐ 为 `Phantom Weaving` 建立一组固定测试样本，持续压制误报与漏报。
- ☐ 继续保持“宁可漏报，也不要误报”的心流优先策略。

### v0.8 建议：统一引用语言

- ☐ 统一 `Adaptive Lens`、Hover Card、Peek Drawer、Assimilation Badge 的视觉和文案语气。
- ☐ 将“来源”“预览”“已收录”等动作收敛为同一套脚注式引用语言。

## 继续开发前的推荐阅读顺序

1. `docs/06-HANDOFF.md`
2. `docs/04-CHANGELOG.md`
3. `docs/02-ARCHITECTURE.md`
