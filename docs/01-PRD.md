Flux: 下一代生成式知识库 MVP 研发白皮书 (PRD & System Architecture)
To 此文档的 AI 编码助手:
你现在的角色是 Flux 项目的“首席全栈架构师与开发工程师”。本系统旨在对传统笔记软件（如 Notion/Obsidian）的“文件夹树状结构”进行彻底的降维打击。请仔细通读本白皮书，在后续的编码中，严格遵循这里的底层逻辑与技术架构。

一、 产品哲学 (Product Philosophy)
产品名称： Flux (意为：流转、动态、涌现的认知通量)
传统痛点：
反直觉的物理隔离：知识不该被强塞进唯一的父文件夹（例如“AI”和“新闻”是平行的维度，不该有从属关系）。
颗粒度悖论与语境断裂：复制粘贴会导致知识冗余；单纯使用 [[双向链接]] 只提供原笔记入口，打断阅读心流。
AI 幻觉与信任危机：大模型生成的总结往往缺乏直接、精确到段落的溯源凭证。
Flux 核心口号：杀死文件夹，万物皆交叉（Kill Folders. Everything Intersects）。
二、 核心数据基建 (Flat Data Architecture)
Flux 放弃树状结构（Tree）和早期的图数据库（Graph DB），采用“关系型存储 + JSONB 高维属性 + 向量化”的混合架构。

在 MVP 纯前端阶段，请使用以下 JSON 结构作为 Mock 数据的基础骨架：

<JSON>
{
  "flux_blocks": [
    {
      "id": "block_001",
      "title": "Prompt Engineering 基础结构",
      "content": "核心包括：1. 角色设定；2. 明确上下文；3. 输出约束。在设计自动化测试用例时，应保证 Prompt 的边界清晰。",
      "dimensions": {
        "domain": ["AI", "工程实践"],
        "format": ["概念基建"]
      }
    },
    {
      "id": "block_002",
      "title": "Harness Eval 评估笔记",
      "content": "自动化测试集的高质量构造是难点。针对超长上下文产生的幻觉，我们引入了特定的技巧。参照 {@block_001_summary} 可以大幅约束发散。",
      "dimensions": {
        "domain": ["AI", "测试验证"],
        "format": ["个人笔记"]
      }
    }
  ]
}
注：每一个 Block 都是绝对扁平的，它们之间没有 parent_id。所有实体通过 dimensions（正交维度）在多维空间中定位。

三、 MVP 两大核心交互机制 (Core Capabilities)
机制 1: 全局正交交叉筛选 (The Orthogonal Filter)
UI 表现（左侧边栏）：彻底摒弃传统的文件树。主页左侧是一个“维度控制台（Dimensions Panel）”。
交互逻辑：采用 布尔逻辑 AND (交集)。当用户同时激活标签 [领域: AI] 和 [体裁: 测试验证] 时，右侧工作区毫秒级过滤并呈现完全匹配的 Blocks 列表。
技术要求：过滤算法必须是纯粹的数据流化（Data-driven），保证极速响应。
机制 2: AI 动态透镜与防幻觉溯源 (Adaptive Lens & Citation Badge)
这是 Flux 面向未来的杀手锏，用于彻底解决“双链打断心流”的问题。

底层编辑器：采用 TipTap (基于 Prosemirror 的 Headless 富文本框架)。
交互逻辑：
用户在正在书写的文档中输入 @关键词，唤起 Block 搜索菜单。
用户选中目标 Block（例如 block_001）。
AI 介入：前端立刻截取当前光标前后的“局部语境 A”，连同“目标 Block B 的全文”，发送给大模型。
动态渲染：系统将大模型返回的“一句高度融合当前语境的摘要”作为一个特殊的 Node View 渲染在正文中。
强制视觉规范：在这个 AI 生成的透镜块尾部，必须强制带有一个醒目且不可篡改的 [来源: 原标题 ↗] 溯源角标（Citation Badge），点击可侧边展开原笔记，彻底解决 AI 乱编的信任问题。
四、 技术栈约束与隐私策略 (Tech Stack & Privacy)
基础框架：React + Vite + Tailwind CSS。
UI 风格：强制采用极客暗黑主题 (Dark Mode)。背景色主基调为 neutral-900，边框为 neutral-800，字色搭配高对比度中性色，AI 相关的透镜或高光使用深蓝色或靛蓝色（如 blue-900/30 背景配合 blue-400 文字）。
核心编辑器组件：TipTap React 版（为了实现机制 2 的动态 Node View 插槽）。
图标库：lucide-react。
AI 交互策略 (BYOK)：绝不收集用户数据。要求在大模型请求处实现 BYOK（Bring Your Own Key）模式。MVP 阶段支持在设置页（LocalStorage 缓存）填入大模型 API Key（优先适配以 OpenAI 格式为标准的 API，如 DeepSeek API: https://api.deepseek.com/v1）。所有大模型请求均由前端直接以 Fetch 方式发起。
[AI 助手指令最终确认]
当你读取完本白皮书后，你的所有代码生成应当自动匹配这里的架构约束（扁平化数据、多维交集过滤、TipTap 透镜节点、暗黑极客 UI）。你可以随时询问 User 接下来要开发哪一个具体模块。