function isEnglish(language = 'zh') {
  return language === 'en'
}

export function buildClassificationSystemPrompt(language = 'zh') {
  if (isEnglish(language)) {
    return 'You are a careful knowledge tagging assistant. Do two things for the note: 1. Create a minimal title in under 10 words with no trailing punctuation. 2. Extract three fields: domain (max 2), format, and project (leave empty if none). Output valid JSON only: {"title":"Short title","domain":[],"format":[],"project":[]}. Respond in English only.'
  }

  return '我传给你一段笔记。请帮我完成两件事：1. 为这段笔记起一个极简的标题（10个字以内，不要任何标点符号）。2. 提取3个维度：domain(领域,最多2个)、format(体裁)、project(项目实体名,没有则留空)。所有输出必须使用【简体中文】。强制输出合法JSON：{"title":"概括性短标题", "domain":[],"format":[],"project":[]}。除 JSON 外不要输出任何多余字符。'
}

export function buildClassificationUserPrompt(content, language = 'zh') {
  return isEnglish(language)
    ? `Tag this note:\n${content}`
    : `请为这段知识闪念打标：\n${content}`
}

export function buildRetagUserPrompt(content, language = 'zh') {
  return isEnglish(language)
    ? `Re-evaluate and tag this knowledge note:\n${content}`
    : `请为这篇知识笔记重新审视并打标：\n${content}`
}

export function buildAssimilationSystemPrompt(language = 'zh') {
  if (isEnglish(language)) {
    return 'You are a careful knowledge editor. Read the source note and the new insight from the current note. Your task is not to append blindly. Instead, merge the new insight into the source note in the most natural place, adding a minimal heading only when needed. Preserve the original note structure and its core information. Do not explain your reasoning. Return only the merged note body itself. 【绝对红线】：你必须直接输出合并后的笔记正文主体。严禁输出任何类似 \'【更新后的正文】\'、\'以下是更新内容\'、\'总结完毕\' 的前缀、开头语或自我解释。你的输出将直接作为前端 DOM 被渲染，包含任何多余字符将导致系统崩溃！只输出 Markdown 原文！ If the source note is HTML, return only the merged body content with no wrapper labels or commentary. If it is plain text or markdown, return only the merged markdown body. Please output your response in English.'
  }

  return '你是一位严谨的知识库架构师。请阅读【原始笔记正文】，再分析【用户新笔记】里的新增洞察。你的任务不是简单追加，而是把这些新增知识自然整合进原始笔记正文的合适位置，必要时可补一个极简小标题。必须保留原有内容的核心信息和整体结构，不要写解释说明，不要输出分析过程。最终只返回更新后的正文内容本身。【绝对红线】：你必须直接输出合并后的笔记正文主体。严禁输出任何类似 \'【更新后的正文】\'、\'以下是更新内容\'、\'总结完毕\' 的前缀、开头语或自我解释。你的输出将直接作为前端 DOM 被渲染，包含任何多余字符将导致系统崩溃！只输出 Markdown 原文！如果原文是 HTML 片段，就只返回合并后的正文片段本身，不要包裹任何说明性文字；如果原文是普通文本或 Markdown，也只返回合并后的 Markdown 正文。请使用简体中文输出。'
}

export function buildAssimilationUserPrompt(
  { noteTitle, paragraph, targetTitle, targetContent },
  language = 'zh',
) {
  if (isEnglish(language)) {
    return `Current paragraph:\nTitle: ${noteTitle}\nParagraph: ${paragraph}\n\nSource note title:\n${targetTitle}\n\nSource note body:\n${targetContent || 'No content yet'}`
  }

  return `【当前写作段落】：\n标题：${noteTitle}\n段落：${paragraph}\n\n【需要被更新的原始笔记标题】：\n${targetTitle}\n\n【原始笔记正文】：\n${targetContent || '暂无内容'}`
}
