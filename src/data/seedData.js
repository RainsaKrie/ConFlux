export const seedFluxBlocks = [
  {
    id: 'seed_flux_welcome',
    title: '欢迎来到 Flux：杀死文件夹',
    content:
      'Flux 不把知识塞进层层文件夹，也不要求你先决定它应该归档到哪里。每一条笔记都只是一个可被引用、可被重组、可被串联的知识块。你用领域、体裁、项目这些维度描述它，系统再通过本地推荐、长文切块和关系视图帮你看到结构，而不是先把思考锁进目录。',
    dimensions: {
      domain: ['产品哲学'],
      format: ['欢迎引导'],
      project: ['Flux'],
      stage: ['onboarding'],
      source: ['seed'],
    },
    createdAt: '2026-04-02',
    updatedAt: '2026-04-02',
  },
  {
    id: 'seed_flux_guide',
    title: '如何使用引用节点与更新原文',
    content:
      '在写作页输入 @ 可以搜索并插入引用节点，用它把已有笔记拉进当前上下文。右侧抽屉会展示推荐候选，你可以先点“提取核心摘要”快速理解内容，再按“更新原文”把当前段落里的新信息合并回目标笔记。整个过程保持先预览、后确认，避免模型在后台偷偷改写你的知识。',
    dimensions: {
      domain: ['操作指南'],
      format: ['使用说明'],
      project: ['Flux'],
      stage: ['onboarding'],
      source: ['seed'],
    },
    createdAt: '2026-04-02',
    updatedAt: '2026-04-02',
  },
  {
    id: 'seed_flux_local_first',
    title: 'Local-First 与 BYOK 安全声明',
    content:
      'Flux 默认把知识数据存放在你的浏览器 localStorage 中，不会自动上传到平台后端。API Key 也只保存在本地，并由前端直接请求你配置的标准 Chat Completions 接口。你可以使用 OpenAI、DeepSeek、SiliconFlow 或任何兼容端点，但前提始终是你自己掌握密钥与调用目标。',
    dimensions: {
      domain: ['系统边界'],
      format: ['隐私声明'],
      project: ['Flux'],
      stage: ['安全说明'],
      source: ['seed'],
    },
    createdAt: '2026-04-02',
    updatedAt: '2026-04-02',
  },
  {
    id: 'seed_flux_longform',
    title: '为什么长文会被自动切块',
    content:
      '当你一次性贴入很长的会议纪要、财报或研究草稿时，Flux 会先在本地做保守切块，再把这些碎片用统一的 thread 标签串起来。这样知识既不会因为单篇过长而难以检索，也不会在后续的 Feed、Write、Graph 视图里失联。切块优先保证完整性和可回溯性，而不是炫技式的自动总结。',
    dimensions: {
      domain: ['操作指南'],
      format: ['机制说明'],
      project: ['Flux'],
      stage: ['onboarding'],
      source: ['seed'],
    },
    createdAt: '2026-04-02',
    updatedAt: '2026-04-02',
  },
]
