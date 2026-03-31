# 核心架构原则
1. Flat Data: 数据流核心是一个扁平的 Array/Table。关联通过 `dimensions` 数组实现。
2. The Orthogonal Filter: UI 左侧是多维检索器。过滤算法必须是：各个维度之间取交集 (AND)。
3. The Lens Editor: 当在 TipTap 编辑器中触发 `@` 时，必须要有插槽能渲染大模型返回的摘要，并在尾部追加一个 `<CitationBadge id="...">` 组件。
4. BYOK: 所有的大模型调用都在浏览器端直接 Fetch API（比如 Deepseek API），Key 存在 LocalStorage 中。