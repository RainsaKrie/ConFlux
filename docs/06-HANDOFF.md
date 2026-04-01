# Flux 继续开发交接说明

本文件的目的只有一个：让下一次会话中的 Agent 只要先读这份文档，就能立即恢复当前项目上下文并继续工作。

## 推荐阅读顺序

1. 本文件 `docs/06-HANDOFF.md`
2. `docs/04-CHANGELOG.md`
3. `docs/02-ARCHITECTURE.md`

如果时间非常有限，至少先读完本文件，再开始动代码。

## 当前版本判断

- 当前项目处于 `v0.5.1`，已经从“概念原型”进入“可持续迭代的前端 MVP”。
- 核心价值主线仍然是：`Zen Canvas`、`Phantom Weaving`、`Crystal Assimilation`、三视图统一关系语义。
- `/graph` 的工程化重构已经完成，当前不再需要继续做 Graph 拆文件类工作。
- `Gravity Pool -> Feed -> Write -> Phantom Weaving -> Assimilation -> Graph` 的主链路已经打通，这意味着 `v0.5` 已完成。

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
- store 中已有 `recentAssimilationRevisions`，支持最近 revision 的跨会话回看与单次回滚。
- `Phantom Weaving` 已完成 `Entity Lexicon Match` Phase 1：`title / project / domain` 已进入同一套正则词典。

### 当前还没有完全收口的点

- revision 已可本地保留，但还不是完整版本系统。
- 预览弹层、右侧抽屉、成功挂件和事件流之间的语言还没有完全统一。
- `Phantom Weaving` 已进入实体词典阶段，但还没有更细的质量评估、误报样本和语义级召回。

## 下一步最合理的工程动作

如果下一次会话继续推进产品收口，而不是平铺新功能，建议优先级如下：

1. 继续 `v0.6`，优先做 Diff Visualization，把同化改写的 Before / After 变成真正可核对的差异视图。
2. 把 `recentAssimilationRevisions` 从轻量持久列表升级为更可靠的版本历史。
3. 让同化预览、抽屉核对、成功挂件和 Pool 事件流共用更统一的引用语言。
4. 在 `/write` 里补齐更完整的手动元数据管理。

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
- `Phantom Weaving` 与 `Crystal Assimilation` 现在已经和 `Gravity Pool` 串起来了，后面重点是收口而不是重建主链。

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
- 当前最值得继续的是继续 `v0.6`：先做 Diff Visualization，再补版本历史和引用语言统一
- `/graph` 的视觉与交互边界已经明确，不需要重新讨论基础方向
