function buildBaseSeedBlock(id, title, content, dimensions) {
  return {
    id,
    title,
    content,
    dimensions,
    createdAt: '2026-04-02',
    updatedAt: '2026-04-02',
  }
}

export function buildSeedFluxBlocks(language = 'zh') {
  if (language === 'en') {
    return [
      buildBaseSeedBlock(
        'seed_conflux_welcome',
        'Welcome to Conflux: Kill the Folders',
        'Welcome to Conflux. This project explores a different model for organizing knowledge. Instead of forcing everything into a rigid tree of folders, Conflux leans on dimensions such as domain, format, project, and entity, then lets note-level links form a living network. Add a few related notes in the composer above and watch how they begin to connect in the graph.',
        {
          domain: ['Philosophy'],
          format: [],
          project: ['Conflux'],
          stage: ['onboarding'],
          source: ['seed'],
        },
      ),
      buildBaseSeedBlock(
        'seed_conflux_adaptive_lens',
        'Adaptive Lens: Contextual Writing',
        'In a conventional editor, a reference is usually just a static link. Conflux adds a contextual layer on top: when you type @ in the editor and select another note, the model reads the current paragraph together with the full target note, then drafts a short summary that better fits the paragraph you are writing now.',
        {
          domain: [],
          format: ['Operational Guide'],
          project: [],
          stage: ['onboarding'],
          source: ['seed'],
        },
      ),
      buildBaseSeedBlock(
        'seed_conflux_assimilation',
        'Bidirectional Updates: Local Detection and Safe Write-back',
        'When you pause typing, the local entity lexicon quietly scans the current paragraph for high-signal terms. If it detects a confident relation to an earlier note, Conflux surfaces a prompt in the lower-right corner. From there, you can inspect the earlier note and optionally merge the new paragraph back as a revision, with diff review and rollback preserved in the drawer.',
        {
          domain: [],
          format: [],
          project: ['Conflux'],
          stage: ['onboarding'],
          source: ['seed'],
        },
      ),
    ]
  }

  return [
    buildBaseSeedBlock(
      'seed_conflux_welcome',
      'Welcome to Conflux：探索网状知识流',
      '欢迎来到 Conflux。本项目尝试探讨一种不同的知识组织方式：如果放弃严格的树状目录，转而依赖“领域、体裁、实体”等多维度标签，辅以文本级别的引用关系，知识块是否能更自然地形成网络？你可以尝试在顶部的输入框记录几条相互关联的笔记，观察它们在图谱中的连接状态。',
      {
        domain: ['理念介绍'],
        format: [],
        project: ['Conflux'],
        stage: ['onboarding'],
        source: ['seed'],
      },
    ),
    buildBaseSeedBlock(
      'seed_conflux_adaptive_lens',
      '动态上下文生成：Adaptive Lens 的机制',
      '在传统编辑器中，引用往往只是插入一个静态链接。Conflux 尝试在此基础上引入上下文感知：当你在正文中输入 @ 并选择另一篇笔记时，底层大模型会读取你当前的写作段落与目标笔记的全文，尝试生成一段符合当前语境的补充摘要，以降低写作时的上下文跳跃感。',
      {
        domain: [],
        format: ['操作指引'],
        project: [],
        stage: ['onboarding'],
        source: ['seed'],
      },
    ),
    buildBaseSeedBlock(
      'seed_conflux_assimilation',
      '双向更新：本地嗅探与同化回写',
      '当你停下打字时，系统的本地正则引擎（Entity Lexicon）会静默扫描当前段落中的高频实体词。若发现历史笔记的高置信度关联，右下角会给出提示。通过该提示，你不仅可以查阅旧笔记，还可以选择将当前的新段落经过 AI 融合后，作为修订版本（Revision）安全地写回旧笔记中，并随时可以在抽屉面板中查看差异或回滚。',
      {
        domain: [],
        format: [],
        project: ['Conflux'],
        stage: ['onboarding'],
        source: ['seed'],
      },
    ),
  ]
}
