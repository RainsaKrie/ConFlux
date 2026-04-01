# Flux 数据与存储设计

当前数据基线：`v0.5.1`

## 1. 当前阶段说明

Flux 当前没有正式后端，核心数据仍保存在浏览器本地。本文件记录的是“当前真实存储结构”和“未来迁移建议”。

版本颗粒度与 [04-CHANGELOG.md](/d:/桌面/flux-workspace/docs/04-CHANGELOG.md) 保持一致：

- `v0.1` 到 `v0.5.1` 对应当前已落地实现
- `v0.6+` 对应下一阶段的质量控制与后续扩展

## 2. 本地存储键

### `flux_blocks_store`

由 Zustand persist 写入，当前保存：

```json
{
  "state": {
    "fluxBlocks": [],
    "savedPools": []
  },
  "version": 0
}
```

用途：

- 持久化知识块。
- 持久化 Gravity Pools。

说明：

- `peekBlockId` 这类跨页面 UI 状态不进入持久化层。
- 本地结构是当前产品真相，不应和 seed 数据混淆。
- 当前 `activePoolContext`、`recentPoolEvents` 与 `recentAssimilationRevisions` 都已经进入前端 store，并已随本地持久化一起保留。

### `flux_ai_config`

手动保存的大模型配置：

```json
{
  "baseURL": "https://api.deepseek.com/v1",
  "model": "deepseek-chat",
  "apiKey": "sk-..."
}
```

用途：

- Quick Capture 自动打标
- Editor AI 重新审视
- Adaptive Lens 流式摘要
- Crystal Assimilation 同化改写

### `flux_feed_view_mode`

保存 Feed 页面视图偏好：

- `grid`
- `list`

## 3. 当前实体模型

### 3.1 `FluxBlock`

```ts
type FluxBlock = {
  id: string
  title: string
  content: string
  dimensions: {
    domain: string[]
    format: string[]
    project: string[]
    stage: string[]
    source: string[]
  }
  createdAt?: string
  updatedAt?: string
}
```

字段说明：

- `id`: 当前使用 `block_${timestamp}` 生成。
- `title`: 页面标题，也可能在创建后被 AI 修正。
- `content`: 当前以 HTML 字符串形式保存 TipTap 内容。
- `dimensions`: 正交维度集合，不承担树状父子关系。
- `createdAt / updatedAt`: ISO 日期字符串，当前主要使用 `updatedAt`。

### 3.2 `SavedPool`

```ts
type SavedPool = {
  id: string
  name: string
  filters: {
    [dimension: string]: string[]
  }
}
```

字段说明：

- `name`: 用户给筛选视角起的名字。
- `filters`: 一组标签交集条件。

## 4. 当前运行时关系层

Flux 当前不会把 block 关系固化成单独表，而是按需推导：

- 文本引用关系：来自正文中的 block 引用或 Adaptive Lens 来源。
- 维度关系：来自 `domain / format / project` 的交集。
- 运行时提示关系：来自 `Phantom Weaving` 的本地命中结果。

这意味着当前 Feed 关系角标、Graph 图谱和 Hover Card 都属于“运行时关系层”，不是数据库实体表。

## 5. 当前存储策略的优点与代价

优点：

- 纯前端即可验证产品闭环。
- 本地响应快，开发迭代轻。
- BYOK 不经过平台后端，更符合当前隐私边界。

代价：

- 数据不能跨设备同步。
- 不能做协作、权限和审计。
- 本地存储容量有限。
- 结构演进时需要考虑迁移脚本。

## 6. 与当前版本能力的映射

截至 `v0.5.1`，存储层已经支撑以下能力：

- `v0.1` 支撑 Feed、Write、Graph 的基础骨架。
- `v0.2` 支撑 Editor 自动保存与显式 `@` 引用。
- `v0.3` 支撑 Phantom Weaving 的标题级静默嗅探。
- `v0.4` 支撑 Crystal Assimilation 对目标母体的静默写回。
- `v0.5` 支撑引述流式 Adaptive Lens、Peek Drawer 与成功挂件。
- `v0.5.1` 支撑 `/graph` 模块化工程收口，并新增可本地持久化的 `activePoolContext / recentPoolEvents / recentAssimilationRevisions` 轻量状态。

## 6.1 当前新增的一层运行时状态

为了完成 `v0.5` 的连续体验，当前 store 已经加入一层运行时上下文，例如：

```ts
type ActivePoolContext = {
  poolId: string | null
  name?: string
  filters: Record<string, string[]>
  sourceView?: 'sidebar' | 'feed' | 'graph'
}
```

这层状态的意义不是把 Pool 变成数据库实体扩张，而是让：

- Feed 的当前观察主题能被 `/write` 感知。
- `Phantom Weaving` 可用当前 Pool 的维度信息给候选块轻量加权。
- `Crystal Assimilation` 成功后，Feed / Graph 能知道“当前主题下刚刚哪张母体被更新了”。

当前代码中还额外存在两层轻量但已本地持久化的状态：

```ts
type RecentPoolEvent = {
  id: string
  poolId?: string | null
  poolName?: string | null
  poolContextKey?: string | null
  blockId: string
  blockTitle: string
  message: string
  type: 'assimilation' | 'rollback'
  createdAt: string
}

type AssimilationRevision = {
  id: string
  blockId: string
  blockTitle: string
  beforeContent: string
  afterContent: string
  contextParagraph: string
  createdAt: string
  rolledBackAt?: string
}
```

## 7. 未来后端化建议

如果进入 `v0.6+` 之后的后端化阶段，建议将当前本地结构映射为如下表：

### `flux_blocks`

- `id`
- `title`
- `content_html`
- `dimensions_jsonb`
- `created_at`
- `updated_at`

### `saved_pools`

- `id`
- `name`
- `filters_jsonb`
- `created_at`
- `updated_at`

### `block_revisions`（建议新增）

用于承接 `Crystal Assimilation` 的差异预览、历史追溯与回滚：

- `id`
- `block_id`
- `source_type`
- `source_block_id`
- `before_content_html`
- `after_content_html`
- `created_at`

### `recent_pool_events`（不一定落库，可先做运行时）

如果未来想把 `Gravity Pool -> Assimilation -> Graph` 的连续反馈做完整，可以考虑一层轻量事件流，哪怕一开始只在前端 store 中暂存：

- `id`
- `pool_id`
- `block_id`
- `event_type`
- `created_at`

这样 Feed 和 Graph 才能低压迫地提示“这个观察主题刚刚吸收了新的知识变化”。

### `ai_profiles` 或继续本地保留

BYOK 从隐私角度更适合继续保留在本地；若未来支持团队空间，可考虑“团队默认模型配置”和“个人私有密钥配置”分离。

## 8. 迁移注意事项

未来若从 localStorage 迁移到后端，必须保证：

- 旧用户的 `flux_blocks_store` 可被一次性导入。
- `dimensions` 保持数组语义，不被压扁成字符串。
- `content` 保持 HTML 兼容，避免破坏现有 TipTap 内容。
- 关系仍以“推导优先”为主，除非性能成为明确瓶颈，再考虑缓存层。
