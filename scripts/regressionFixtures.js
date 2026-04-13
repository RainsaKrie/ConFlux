const markdownTable = [
  '| Segment | Revenue | Margin | Notes |',
  '| --- | ---: | ---: | --- |',
  '| North | 1820 | 41% | markdown table noise |',
  '| South | 1640 | 39% | markdown table noise |',
  '| APAC | 970 | 36% | markdown table noise |',
].join('\n')

const longUnpunctuatedLine = 'RevenueBridge平台在季度压测期需要持续验证现金流预测模型风险敞口映射表和内部控制触发器在跨区域供应链波动场景下的稳定性'.repeat(42)
const overflowGarbageParagraph = 'RevenueBridgeAlphaBeta123构建链路回放线程标签防丢失缓存噪音数据清洗回归基线'.repeat(55)

export const macroChunkStressInput = [
  '# FY2026 Q1 财报草稿',
  '',
  '',
  '',
  '## 管理层摘要',
  '本季度经营重点包括收入结构收敛、费用纪律强化、风险控制看板改版，以及对多区域供应链异常的追踪。',
  '',
  '',
  '',
  markdownTable,
  '',
  '',
  '',
  '## 经营异常',
  '这里故意插入连续空行、Markdown 表格残片、极长的无标点单句和混杂式项目符号，确保长文切块在非常差的输入质量下仍能稳定落盘。',
  '',
  '',
  '',
  '| Broken | Row |',
  '| still | noisy |',
  '',
  '',
  '',
  longUnpunctuatedLine,
  '',
  '',
  '',
  '## 风险跟进',
  '1. 汇率波动持续放大海外收入预测误差',
  '2. 应收账款周转天数上升，需要结合区域分布重新评估现金流节奏',
  '3. 对照历史复盘，任何自动切块都不应丢失 thread 级串联信息',
].join('\n')

export const oversizedRunOnInput = ['# 垃圾段落压测', '', overflowGarbageParagraph].join('\n')
export const mixedLanguageParagraph = '我使用了React19的新特性进行构建验证，并继续检查并发渲染链路是否稳定。'
export const realWorldHitParagraph = [
  '今晚先复核 Conflux 在 Tauri Store 迁移后的 conflux_universe.json 结构，',
  '确认桌面持久化回退没有把旧字段写坏，再决定是否继续做发布验收。',
].join('')
export const realWorldMissParagraph = [
  '今天只整理 README、贡献指南和许可证说明，',
  '重点是文案措辞统一，没有碰应用功能、交互行为或底层实现。',
].join('')
export const entityPriorityParagraph = [
  '今天只复核本地媒体落盘排查这条链路，重点检查 plugin-fs、media目录 和媒体落盘稳定性，',
  '不去碰图谱权重或关系搜索参数。',
].join('')

export function buildRecommendationFixtureBlocks() {
  const decoys = Array.from({ length: 36 }, (_, index) => ({
    id: `noise_${index + 1}`,
    title: `噪音块 ${index + 1}`,
    content: '用于验证推荐引擎在高噪音输入下不会误触发。',
    dimensions: {
      domain: ['测试样本'],
      format: ['噪音块'],
      project: [`Noise-${index + 1}`],
      stage: [],
      source: [],
    },
  }))

  const anchor = {
    id: 'report_anchor',
    title: 'RevenueBridge 财务风控复盘',
    content: '聚焦季度财报、异常波动、收入质量与现金流预警。',
    dimensions: {
      domain: ['财务风控', '季度复盘', '系统', '一', 'AI'],
      format: ['分析纪要'],
      project: ['RevenueBridge', 'AI', '2026', 'RB'],
      stage: [],
      source: [],
    },
  }

  return [anchor, ...decoys]
}

export function buildMixedLanguageFixtureBlocks() {
  return [
    {
      id: 'react_anchor',
      title: 'React19 并发渲染记录',
      content: '记录 React19 在并发渲染和构建验证中的表现。',
      dimensions: {
        domain: ['前端架构'],
        format: ['验证记录'],
        project: ['React19', '构建验证'],
        stage: [],
        source: [],
      },
    },
    {
      id: 'react_decoy',
      title: '构建流水线排查',
      content: '只讨论 CI 缓存和依赖安装，不涉及 React19。',
      dimensions: {
        domain: ['工程实践'],
        format: ['排查记录'],
        project: ['CI'],
        stage: [],
        source: [],
      },
    },
  ]
}

export function buildRealWorldRecommendationFixtureBlocks() {
  return [
    {
      id: 'desktop_migration_anchor',
      title: 'Tauri Store 迁移复核',
      content: '复核 conflux_universe.json 的结构、字段迁移、桌面持久化回退与版本兼容。',
      dimensions: {
        domain: ['桌面持久化', '迁移校验'],
        format: ['排查记录'],
        project: ['Conflux', 'Tauri Store', 'conflux_universe'],
        stage: [],
        source: [],
      },
    },
    {
      id: 'media_pipeline_anchor',
      title: '本地媒体落盘排查',
      content: '检查图片拖拽、粘贴落盘、plugin-fs scope 与 media 目录生成是否稳定。',
      dimensions: {
        domain: ['媒体落盘', '拖拽粘贴'],
        format: ['排查记录'],
        project: ['plugin-fs', 'media目录'],
        stage: [],
        source: [],
      },
    },
    {
      id: 'graph_decoy',
      title: 'Graph 权重调参记录',
      content: '只讨论图谱关系权重、节点间距和搜索体验，不涉及桌面存储。',
      dimensions: {
        domain: ['图谱调参'],
        format: ['实验记录'],
        project: ['Graph'],
        stage: [],
        source: [],
      },
    },
    {
      id: 'docs_decoy',
      title: '文档语气统一整理',
      content: '只处理 README、贡献指南和开源说明中的措辞统一。',
      dimensions: {
        domain: ['文档维护'],
        format: ['维护记录'],
        project: ['README'],
        stage: [],
        source: [],
      },
    },
  ]
}

export const noisyLexiconParagraph = [
  '的 的 的 了 了 了 和 和 和 AI AI AI 系统 系统 系统 这 那 这 那 一个 一个 一个 一 一 一',
  'RevenueBridge 财务风控 季度复盘 需要重新核对异常波动和现金流预警的映射关系',
  '同时保留 RevenueBridge 财务风控 季度复盘 这组三元命中，避免被海量停用词淹没。',
  longUnpunctuatedLine,
].join(' ')
