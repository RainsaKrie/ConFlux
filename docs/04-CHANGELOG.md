# Flux 迭代日志 (Changelog)
## 当前版本：v1.1 (进行中)
### 已完成的重大重构
- [x] **数据持久化**: 引入 Zustand persist 存入 localStorage。
- [x] **通用 BYOK**: 支持任意兼容 OpenAI 的接口 (如 SiliconFlow)，解决了转圈假死 Bug，加入了严格的 try-catch。
- [x] **UI 范式跃迁 (Zen Canvas)**: 彻底抛弃暗黑面板，转为极致留白。将 Quick Capture 改为吸顶呼吸式，将配置面板改为模态弹窗。
- [x] **AI Agentic 打标**: Quick Capture 回车后，AI 会自动提炼 15 字以内的漂亮短标题，并静默打上 3 个维度的标签。
- [x] **List 模式的高级化**: 引入了单行高密度渲染，并在右侧增加了紫色的 `[? 关联数]` 角标（利用 title 属性做原生悬停解析）。
### 下一步待办 (TODO)
- 优化 EditorPage 标题区域（字号需为 4xl 加粗，与正文彻底剥离）。
- 梳理 Editor 工具栏（使用 lucide 图标，修复 onClick 导致的选区丢失，改用 onMouseDown）。
- [未来规划] 实现卡片标签的手动可视化增删，以及 "? 让 AI 重新审视标签" 的魔法编辑功能。