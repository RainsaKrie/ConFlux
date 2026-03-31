export const fluxBlocks = [
  {
    id: 'block_001',
    title: 'Prompt Engineering 基础概念',
    content:
      '核心包括：1. 角色设定；2. 明确上下文；3. 输出约束。在设计自动化测试用例时，应保证 Prompt 的边界清晰。',
    dimensions: {
      domain: ['AI', '工程实践'],
      format: ['概念基建'],
      project: ['Flux'],
      stage: ['可执行框架'],
      source: ['方法论沉淀'],
    },
    updatedAt: '2026-03-27',
  },
  {
    id: 'block_002',
    title: 'Harness Eval 评估笔记',
    content:
      '自动化测试集的高质量构造是难点。针对超长上下文产生的幻觉，我们引入了特定的技巧。参照 {@block_001_summary} 可以大幅约束发散。',
    dimensions: {
      domain: ['AI', '测试验证'],
      format: ['个人笔记'],
      stage: ['问题排查'],
      source: ['实验记录'],
    },
    updatedAt: '2026-03-28',
  },
  {
    id: 'block_003',
    title: 'RAG 检索召回缺陷清单',
    content:
      '召回质量下滑往往不是单点故障，而是切片策略、Embedding 选择和过滤表达式共同作用的结果。',
    dimensions: {
      domain: ['AI', '知识系统'],
      format: ['问题清单'],
      stage: ['诊断分析'],
      source: ['故障复盘'],
    },
    updatedAt: '2026-03-24',
  },
  {
    id: 'block_004',
    title: '前端 BYOK 设置页约束',
    content:
      'API Key 仅保存在 LocalStorage，所有请求由浏览器直接发起。需要通过显式提示让用户理解数据不会经过平台服务端。',
    dimensions: {
      domain: ['前端', 'AI'],
      format: ['产品约束'],
      stage: ['规范定义'],
      source: ['PRD 约束'],
    },
    updatedAt: '2026-03-29',
  },
  {
    id: 'block_005',
    title: '动态透镜节点的交互拆解',
    content:
      '用户输入 @ 触发检索，选中目标 Block 后，把局部语境与原文一并送给模型，返回结果需要带不可篡改的 Citation Badge。',
    dimensions: {
      domain: ['编辑器', 'AI'],
      format: ['交互方案'],
      project: ['Flux'],
      stage: ['原型设计'],
      source: ['架构草案'],
    },
    updatedAt: '2026-03-30',
  },
  {
    id: 'block_006',
    title: '知识库首页信息架构草图',
    content:
      '左侧不再出现文件树，而是维度控制台。右侧使用卡片列表展示命中的知识块，并且要在筛选反馈上做到毫秒级。',
    dimensions: {
      domain: ['产品设计', '知识系统'],
      format: ['页面草图'],
      stage: ['信息架构'],
      source: ['MVP 设计'],
    },
    updatedAt: '2026-03-26',
  },
  {
    id: 'block_007',
    title: '模型幻觉的溯源策略',
    content:
      '仅展示 AI 摘要是不够的，必须在视觉上绑定原始标题与跳转入口，让用户可以在不跳出写作流的情况下展开原文。',
    dimensions: {
      domain: ['AI', '信任机制'],
      format: ['设计原则'],
      stage: ['机制定义'],
      source: ['体验原则'],
    },
    updatedAt: '2026-03-25',
  },
  {
    id: 'block_008',
    title: '测试验证知识块样例',
    content:
      '当筛选条件同时选中领域 AI 与体裁 个人笔记 时，列表应即时收束到与评估、验证直接相关的 Blocks。',
    dimensions: {
      domain: ['测试验证', 'AI'],
      format: ['示例数据'],
      stage: ['验证样本'],
      source: ['Mock 数据'],
    },
    updatedAt: '2026-03-30',
  },
]
