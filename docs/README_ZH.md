English README [<sup>1</sup>](../README.md) | 中文（当前）

# 🌱 Conflux：一个实验性的 Agentic Knowledge Flow 项目

## 项目简介

Conflux 是一个纯前端的实验项目，想认真讨论一件事：如果不再用文件夹树组织知识，而改用多维标签、局部引用关系和保守的自动切块，个人知识是否会变得更易流动、也更容易回看。

它目前不是一款“已经定型”的笔记产品，更像是一个学生开发者持续推进的研究型原型。项目尝试用多维正交标签替代目录树，并结合大模型的局部上下文融合能力，让知识块之间形成可追踪、可回滚的双向关联。

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
- Vite
- Tailwind CSS
- Zustand
- TipTap
- react-force-graph-2d

## 快速开始

1. 克隆仓库：

```bash
git clone https://github.com/RainsaKrie/Flux.git
cd Flux
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

Conflux 采用本地优先的 BYOK（Bring Your Own Key）方式。所有笔记数据默认都保存在浏览器的 `localStorage` 中，不经过项目方的任何第三方服务器。

API Key 只会用于前端直连你自己配置的大模型接口，不会被转发到额外的中转后端。这种方式更适合个人设备；如果你在公共电脑或共享设备上使用，建议结束后清除浏览器数据。

## 演进路线

- `v1.1`：混合语义召回与输入意图拆分
- `v1.2`：本地图片支持与编辑器大纲导航
- `v1.3`：白板视图与批量属性管理
- `v2.0`：桌面端（Tauri）与本地数据库迁移

欢迎社区对这些方向提出建议，也欢迎直接指出当前实现中的问题和边界。

---

## 许可证

MIT [<sup>2</sup>](../LICENSE)

## 安全声明

[<sup>3</sup>](../SECURITY.md)

## 贡献指南

[<sup>4</sup>](../CONTRIBUTING.md)
