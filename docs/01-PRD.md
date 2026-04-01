# Flux 产品文档

当前产品基线：`v0.5.1`

## 1. 产品定位

Flux 是一个面向高频思考者的 Agentic Knowledge Flow 工具。它不把知识塞进层层文件夹，而是把每一条知识都视为可被重组、可被引用、可被 AI 重新解释的扁平知识块。

当前产品目标不是做一个“更像文件夹的笔记软件”，而是验证三件事：

- 扁平知识块是否可以通过多维标签与关系推导形成高效组织。
- AI 是否可以在 BYOK 前提下，为知识块完成自动命名、自动打标、透镜摘要与局部回流。
- `/feed`、`/write`、`/graph` 三个视角是否能形成完整闭环。

## 2. 当前版本共识

截至 `v0.5.1`，Flux 的产品共识如下：

- 视觉基线是 `Zen Canvas`：浅灰背景、白色卡片、大留白、低压迫交互。
- 数据基线是扁平 `fluxBlocks`，不引入文件夹树和 `parentId`。
- 状态基线优先走 Zustand，跨页面 UI 状态只在必要时进入 store。
- AI 基线是 `BYOK`：前端直连兼容 OpenAI Chat Completions 的接口，不依赖中转后端。

## 3. 核心对象

### 3.1 Flux Block

Flux 的最小知识单元是 `block`。每个 block 都是独立对象，不承担树状父子关系。

当前 block 核心字段：

- `id`
- `title`
- `content`
- `dimensions`
- `createdAt`
- `updatedAt`

其中 `dimensions` 当前已规范化为：

- `domain`
- `format`
- `project`
- `stage`
- `source`

界面主流程当前主要暴露 `domain / format / project`，但底层模型已允许更宽的正交维度继续扩展。

### 3.2 Gravity Pool

`Gravity Pool` 是一组筛选条件的持久化快照，不是文件夹，也不是静态集合。

它保存的是“观察视角”，而不是知识所有权：

- 用户可以一键回到某组关注主题。
- 系统保存的是过滤器，而不是 block 的归属关系。

## 4. 当前三大场景

### 4.1 Feed：知识流入口

`/feed` 当前负责：

- Omni Filter 全文搜索与标签交集筛选。
- Quick Capture 吸顶式输入流。
- Grid / List 双视图切换。
- 基于引用与维度重叠推导关系。

当前体验标准：

- List 模式必须保持高密度、可读、可收缩。
- 长文本只能截断，不能把右侧元数据挤出屏幕。
- 关系 Hover Card 不得被相邻行或父容器裁切。

### 4.2 Write：沉浸写作场

`/write` 当前负责：

- 自动创建 block。
- 自动保存标题与正文。
- 管理当前笔记标签。
- 挂载 TipTap 与自定义 `Adaptive Lens`。
- 提供右侧 `Peek Drawer` 并屏参考。
- 提供 `Phantom Weaving` 与 `Crystal Assimilation` 的主要交互入口。

### 4.3 Graph：关系总览

`/graph` 当前负责：

- 以网络视角投影扁平知识块。
- 展示引用关系与维度重叠。
- 帮助判断知识密度与结构张力。

它目前仍是探索视图，不承担主要编辑职责。

## 5. 当前已落地能力

截至 `v0.5.1`，以下能力已经进入实现态：

- Zustand + persist 本地持久化。
- Feed 的 Omni Filter、Quick Capture、Grid/List 视图切换。
- Editor 自动保存、标签管理、AI 重新审视。
- `@` 提及搜索与 `Adaptive Lens` 流式摘要。
- Peek Drawer 右侧原文参考面板。
- `contentToPlainText()` 对透镜摘要的降维提取。
- `Phantom Weaving` 基于 `Entity Lexicon` 的静默嗅探、虚线 Decoration、Hover Card。
- `Crystal Assimilation` 预览确认流、成功挂件、最近 revision 与一键回滚。
- Adaptive Lens 从厚重卡片脱水为引述流。
- Graph 视图的 `Semantic Zoom + Spotlight Search + Cluster Framing`。
- `/graph` 的模块化工程收口，核心逻辑已拆到 `src/features/graph/`。

## 6. 当前边界与限制

- 仍然是纯前端 MVP，没有后端、同步、权限和协作能力。
- 维度模型已扩展，但 UI 还没有完整暴露 `stage / source`。
- `Phantom Weaving` 当前只覆盖标题级嗅探，不覆盖更深层语义召回。
- `Crystal Assimilation` 已具备预览、回滚与跨会话 revision 回看，但还不是完整版本系统。
- Graph 目前可用，但信息面板、聚类与筛选联动仍偏初级。

## 7. 版本推进原则

版本轴以 [04-CHANGELOG.md](/d:/桌面/flux-workspace/docs/04-CHANGELOG.md) 为唯一准绳，当前顺序为：

- `v0.1` Zen Canvas MVP 骨架
- `v0.2` 沉浸写作与显式引用
- `v0.3` Phantom Weaving 原型
- `v0.4` Crystal Assimilation 闭环
- `v0.5` 零压迫知识流
- `v0.5.1` Graph 工程化收口
- `v0.6+` 质量控制与统一引用语言

## 8. 下一步产品建议

按照当前状态，下一步优先级应分成两层：

1. `v0.5` 已完成，下一步正式进入 `v0.6`。
2. `v0.6` 的第一优先级已经完成：`Phantom Weaving` 已升级为 `Entity Lexicon Match`。
3. `v0.6` 的第二优先级是 `Crystal Assimilation` 的 Diff Visualization、持久历史、抽屉核对整合与质量控制。
4. `v0.7` 再补 `Phantom Weaving` 的测试样本与命中质量调优。
5. `v0.8` 再统一 `Adaptive Lens`、Hover Card、Peek Drawer、成功挂件的脚注式引用语言。

## 9. `v0.5` 完成确认与 `v0.6` 入口

当前 `v0.5` 已完成。它的验收事实是：

- 用户可以从某个 Pool 进入 Feed。
- 用户可以在这个观察主题下进入 Write 并继续思考。
- `Phantom Weaving` 会优先浮出与该主题相关的母体。
- 同化成功后，Feed / Graph 能低压迫地显示“这个主题里的知识网络刚刚被更新了”。

因此，`v0.6` 的真正入口变成：

- 用 Diff Visualization 和更可靠的 revision 历史增强 `Crystal Assimilation`。
- 用统一引用语言降低交互碎裂感。
- 在下一轮继续评估 `Entity Lexicon` 的误报与漏报表现。
