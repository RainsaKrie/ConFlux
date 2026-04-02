const markdownTable = [
  '| Segment | Revenue | Margin | Notes |',
  '| --- | ---: | ---: | --- |',
  '| North | 1820 | 41% | markdown table noise |',
  '| South | 1640 | 39% | markdown table noise |',
  '| APAC | 970 | 36% | markdown table noise |',
].join('\n')

const longUnpunctuatedLine = 'RevenueBridge平台在季度压测期间需要持续验证现金流预测模型风险敞口映射表和内部控制触发器'.repeat(42)

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
  '这里故意插入连续空行、Markdown 表格残片、极长的无标点单句和夹杂式项目符号，确保长文切块在非常差的输入质量下仍能稳定落盘。',
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
  '1. 汇率波动持续放大海外收入预测误差。',
  '2. 应收账款周转天数上升，需要结合区域分布重新评估现金流节奏。',
  '3. 对照历史复盘，任何自动切块都不应丢失 thread 级串联信息。',
].join('\n')

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

export const noisyLexiconParagraph = [
  '的 的 的 了 了 了 和 和 和 AI AI AI 系统 系统 系统 这 那 这 那 一个 一个 一 一 一',
  'RevenueBridge 财务风控 季度复盘 需要重新核对异常波动和现金流预警的映射关系，',
  '同时保留 RevenueBridge 财务风控 季度复盘 这组三元命中，避免被海量停用词淹没。',
  longUnpunctuatedLine,
].join(' ')
