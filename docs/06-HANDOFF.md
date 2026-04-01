# Flux 继续开发交接说明

本文件的目的只有一个：让下一次会话中的 Agent 只要先读这份文档，就能立即恢复当前项目上下文并继续工作。

## 推荐阅读顺序

1. 本文件 `docs/06-HANDOFF.md`
2. `docs/04-CHANGELOG.md`
3. `docs/02-ARCHITECTURE.md`

如果时间非常有限，至少先读完本文件，再开始动代码。

## 当前版本判断

- 当前项目已经完成 `v0.6` 的阶段性收口，不再只是 `v0.5.1` 的延伸版本。
- 核心价值主线仍然是：`Zen Canvas`、`Phantom Weaving`、`Crystal Assimilation`、三视图统一关系语义。
- `/graph` 的工程化重构已经完成，当前不再需要继续做 Graph 拆文件类工作。
- `Gravity Pool -> Feed -> Write -> Phantom Weaving -> Assimilation -> Graph` 的主链路已经打通，而且 `v0.6` 的版本历史、差异视图与来源追溯也已进入稳定实现态。

## `/graph` 当前已落地状态

- 数据源：`src/utils/relations.js`
  - `buildRelationMap()`
  - `buildGraphData()`
  - `getRelationSnapshot()`
- 视图文件：`src/pages/GraphPage.jsx`
- Graph 特性目录：`src/features/graph/`
  - `constants.js`
  - `utils.js`
  - `rendering.js`
  - `useGraphSearch.js`
  - `useGraphCamera.js`
- Graph 与 Feed 已共用关系推导层，不要再额外造一套图谱数据结构。

### 当前交互事实

- 节点标签固定贴在节点右侧。
- 标签默认透明底。
- 标签只有在以下任一条件成立时绘制：
  - 当前 zoom 足够大
  - 当前节点被 hover
  - 当前节点被搜索命中
- 左上角已有 `Spotlight Search` 浮层。
- 搜索使用 `Fuse.js` 对 block 标题做模糊匹配，结果最多展示 5 条。
- 搜索态下未命中的节点与边会 dim 掉，命中节点保持高亮。
- 点击搜索结果会进入选中态。
- 选中节点后，会把“该节点 + 一阶邻居”作为群系做自动 framing。
- 这个自动 framing 刚刚被调保守，目标是“完整显示优先，不要过度放大”。

### 当前代码状态

- `GraphPage.jsx` 已经收口为组合层，God Object 问题已通过 `src/features/graph/` 拆分缓解。
- force 参数、search / spotlight、cluster framing、canvas 节点绘制都已经抽离。
- 当前 `/graph` 更值得继续的不是“再拆文件”，而是和其他视图建立连续体验。

## 当前连续体验状态

下面这些能力已经进入实现态：

- store 中已有 `activePoolContext`，Feed / Write / Graph 会共享当前 Pool 观察语境。
- store 中已有 `recentPoolEvents`，同化和回滚会回流到当前 Pool 视角。
- `Phantom Weaving` 已会使用当前 Pool 语境为候选母体做轻量加权。
- `Crystal Assimilation` 已从“静默写回”升级为“先预览、再确认、可回滚”。
- 版本历史已不再依赖 `recentAssimilationRevisions` 全局列表，而是内嵌到每个 `block.revisions[]` 中，支持跨会话保留与任意版本恢复。
- `Phantom Weaving` 已完成 `Entity Lexicon V2`：`title / project / domain / lens summary / snippet` 已进入同一套正则词典。
- `Crystal Assimilation` 的 revision 已会记录来源笔记 `sourceBlockId / sourceBlockTitle`，Drawer 可直接跳回来源笔记比对。
- 引用链路的关键文案已完成第一轮统一，Hover Card、来源脚注、成功挂件与 Version History 已不再使用早期概念化命名。

### 当前还没有完全收口的点

- revision 虽然已经变成可靠的线性本地历史，但仍不是分支化版本系统，也不具备同步与冲突处理能力。
- 引用语言在关键链路里已经统一，但全站仍可能有零星旧文案未完全清理。
- `Phantom Weaving` 已完成词典扩容，但还没有固定测试样本、误报回归与更系统的质量评估。
- `/write` 中完整的手动元数据管理仍未收口。

## 下一步最合理的工程动作

如果下一次会话继续推进产品收口，而不是平铺新功能，建议优先级如下：

1. 进入 `v0.7`，先为 `Phantom Weaving` 建立固定测试样本与命中质量调优基线。
2. 在 `/write` 中补齐更完整的 `domain / format / project` 手动元数据管理。
3. 视需要处理构建体积、代码分片与长期回归验证脚手架。
4. 如果之后再回到引用体验层，重点应是全站零星旧文案与视觉细节的收尾，而不是重做主链。

## 当前不要优先做的事

- 不要把 Graph 做成重型分析面板。
- 不要引入第二套关系缓存或第二套图模型。
- 不要因为有了 revision，就立刻膨胀成复杂版本控制系统。
- 不要把刚刚拆好的 `src/features/graph/` 又重新耦回 `GraphPage.jsx`。
- 不要在还没统一引用语言前，就继续把交互入口铺得更多。
- 不要过早把 `Phantom Weaving` 从标题级匹配升级成重语义召回。

## 与其他模块的真实关系

- `/write` 中的 `Adaptive Lens` 会影响 Feed 和 Graph 的关系推导。
- `contentToPlainText()` 的任何改动都会同时影响：
  - Feed 摘要
  - 搜索
  - 标签 AI 重审
  - 图谱语义输入
- `extractAdaptiveLensSummaries()` 与 `contentToPlainText()` 现在同时参与 `Phantom Weaving` 的词典扩容，修改它们会直接影响摘要级嗅探。
- `Phantom Weaving` 与 `Crystal Assimilation` 现在已经和 `Gravity Pool` 串起来了，后面重点是质量控制与回归，而不是重建主链。

## 推荐验证命令

在继续改动前后，至少执行：

```bash
npm run build
```

如果本次涉及较大重构或编辑器状态流变更，再执行：

```bash
npm run lint
```

## 交接结论

下一次如果用户只说“读取 docs 后继续”，默认就按下面理解：

- 先读 `docs/06-HANDOFF.md`
- 当前这一阶段已经完成 `v0.6` 的核心收口：Diff、Version History、Origin Traceability、Lexicon V2 与关键引用语言统一都已落地
- 下一步默认进入 `v0.7`：优先做 `Phantom Weaving` 的质量样本、误报压制与元数据管理收口
- `/graph` 的视觉与交互边界已经明确，不需要重新讨论基础方向
