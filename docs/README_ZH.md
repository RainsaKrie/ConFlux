[English README](../README.md) | 中文（当前）

# 🌱 Conflux：一个实验性的 Agentic Knowledge Flow 项目

Conflux 是一个纯前端的实验项目，想认真讨论一件事：如果不再用文件夹树组织知识，而改用多维标签、局部引用关系和保守的自动切块，个人知识是否会变得更易流动，也更容易回看。

它目前不是一款已经定型的笔记产品，更像是一个学生开发者持续推进的研究型原型。项目尝试用多维正交标签替代目录树，并结合大模型的局部上下文融合能力，让知识块之间形成可追踪、可回滚的双向关联。

当前 `v1.0.0 Release Candidate` 的边界依然很克制：

- 用扁平 `fluxBlocks` 替代文件夹与层级归属
- 用 Zustand 和浏览器存储维持本地优先的数据基线
- 只有在本地预筛和用户确认之后才调用模型
- 所有原文回写都按版本修订处理，而不是静默覆盖

## 30 秒了解核心流程

1. **将一篇长文粘贴到速记框**  
   系统会在本地自动将其拆分为多个可检索的知识块，并通过共享的线程标签保持同源可追溯。
2. **开始撰写一篇新笔记**  
   当你停止输入约 2.5 秒后，系统会使用本地实体词典静默扫描当前段落。如果发现与已有笔记高度相关，右下角会出现一个低干扰的提示。不会弹窗，不会打断写作。
3. **将新的想法融合回一篇旧笔记**  
   点击提示后，右侧会滑出参考面板。你可以选择让 AI 将当前段落与旧笔记进行内容融合。融合结果会以字符级差异对比的方式展示，由你确认后才会写入，并且支持随时回滚到任意历史版本。

## 架构快照

当前实现遵循 [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md) 中描述的基线：

- `React 19 + Vite 8` 负责应用壳层
- `Zustand (persist)` 负责本地优先状态
- `TipTap` 和自定义节点视图负责编辑与引用插入
- `react-force-graph-2d` 负责图谱投影与语义缩放
- 整条智能链路都遵守“本地预筛 -> 用户确认 -> 精确调用模型”的约束

当前的 Conflux 同时支持浏览器运行和 `Tauri v2` 桌面壳层。`v1.0` 依然没有后端、没有托管中继，也没有内建同步层；桌面端使用 `Tauri Store` 落盘，Web 端则自动回退到浏览器存储。

## 核心特性

### 零压迫输入与自动切块

当输入内容过长时，Conflux 会先在本地做保守切块，避免一整段会议纪要或草稿直接变成难以阅读和检索的巨型笔记。切出来的小块会共享同一组线程标记，方便后续在 Feed、Write 和 Graph 里追踪来源。

### 段落级本地嗅探（Phantom Weaving）

`Phantom Weaving` 可以理解为一种低打扰的本地关联预筛。系统只会在你停止输入约 `2500ms` 后检查当前自然段，再用 `Entity Lexicon + Fuse.js` 静默寻找可能相关的旧笔记，而不会持续打断写作。

### 双向同化与版本回滚（Crystal Assimilation）

`Crystal Assimilation` 是一条谨慎的原文回写链路。新写下的段落可以在确认后融合回旧笔记，同时保留差异预览、线性版本历史、来源追溯与回滚能力，尽量避免“AI 直接改写原文”的失控感。

### 力导向关系图谱（Graph View）

Graph View 基于 `react-force-graph-2d` 构建，不只是展示节点连线，也承担结构观察的职责。它支持聚光灯搜索、关系聚类和语义缩放，帮助用户从网络视角理解知识块之间的联系。

### 多维标签与筛选视图

Conflux 的数据核心是扁平的 `fluxBlocks`，通过 `domain / format / project / stage / source` 这类维度组织，而不是目录树。配合 Feed 中的筛选和侧边栏概览，知识的组织方式更接近“组合”和“观察”，而不是“归档”。

## 技术栈

- React 19
- Vite 8
- Tailwind CSS 3
- Zustand
- TipTap
- react-force-graph-2d

## 快速开始

1. 克隆仓库：

```bash
git clone https://github.com/RainsaKrie/ConFlux.git
cd ConFlux
```

2. 安装依赖：

```bash
npm install
```

3. 复制 `.env.example` 为 `.env`，并填写你的 API 配置：

```bash
copy .env.example .env
```

```env
VITE_AI_BASE_URL="https://api.deepseek.com/v1"
VITE_AI_API_KEY=""
VITE_AI_MODEL="deepseek-chat"
```

4. 启动开发环境：

```bash
npm run dev
```

5. 如果你不想配置 `.env`，也可以在页面左下角的设置面板中手动填写 BYOK 参数。

## BYOK 与数据安全说明

Conflux 采用本地优先的 BYOK（Bring Your Own Key）方式。所有笔记数据都默认保存在本地：桌面端写入 `Tauri Store` 的 `conflux_universe.json`，浏览器环境则回退到 `localStorage`。数据不会经过项目方的任何第三方服务器。

API Key 只会用于前端直连你自己配置的大模型接口，不会被转发到额外的中转后端。这种方式更适合个人设备；如果你在公共电脑或共享设备上使用，建议结束后清除浏览器数据。

## 演进路线

- `v1.1`：混合语义召回
- `v1.2`：本地图片支持与编辑器大纲导航
- `v1.3`：白板视图与批量属性管理
- `v2.0`：更完整的桌面端持久化、多媒体落盘与本地优先存储边界

欢迎社区对这些方向提出建议，也欢迎直接指出当前实现中的问题和边界。

## 项目文档

`docs/` 目录包含了 Conflux 完整的产品与工程上下文：

| 文档 | 内容 |
|---|---|
| [01-PRD.md](./01-PRD.md) | 产品定义、核心对象、使用场景与完整版本路线图（v1.1 -> v2.0） |
| [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) | 技术基线、模块结构、数据模型与核心处理链路 |
| [03-DATABASE.md](./03-DATABASE.md) | 当前混合持久化结构（`Tauri Store` + Web 回退）、实体模型、线程约定与未来迁移预案 |
| [04-CHANGELOG.md](./04-CHANGELOG.md) | 版本历史与里程碑追踪的唯一真相源 |
| [05-MASTER-DIRECTIVE.md](./05-MASTER-DIRECTIVE.md) | 产品纪律：本地优先漏斗、零压迫 UI、双向知识生长 |
| [06-HANDOFF.md](./06-HANDOFF.md) | 开发交接指南，用于在任何新会话中快速恢复项目状态 |

---

## 许可证

[MIT License](../LICENSE)

## 安全声明

[查看安全策略](../SECURITY.md)

## 贡献指南

[查看贡献指南](../CONTRIBUTING.md)
