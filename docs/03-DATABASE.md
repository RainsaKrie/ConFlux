# Conflux 数据与存储设计

文档基线：`v1.0 稳定化阶段 / Roadmap Solidified`

## 1. 文档定位

本文件记录的是 Conflux 当前真实存储结构，以及已经被版本路线图锁定的存储演进方向。

当前最准确的描述仍然是：`v1.0 稳定化阶段的数据基线`。

版本事实以 [`04-CHANGELOG.md`](./04-CHANGELOG.md) 为准。

## 2. 当前本地存储键

### `flux_blocks_store`

由 Zustand persist 写入，当前保存：

```json
{
  "state": {
    "fluxBlocks": [],
    "savedPools": [],
    "activePoolContext": null,
    "recentAiTasks": [],
    "recentPoolEvents": []
  },
  "version": 2
}
```

用途：

- 持久化知识块
- 持久化 Gravity Pools
- 持久化当前观察主题上下文、最近事件流与本地 AI 任务记录

说明：

- `peekBlockId` 这类纯 UI 状态不进入持久化层。
- `fluxBlocks[].revisions[]` 已成为正式的版本历史承载结构。
- `recentAiTasks` 只承担本地任务回看职责，不等于真正的后台任务队列。
- 本地结构是当前产品真相，不应和 seed 数据混淆。
- onboarding seed 与默认 `savedPools` 只在首次冷启动、且本地缺失对应持久化字段时作为门面数据注入；若用户后续主动删空笔记或视图，刷新后仍保持为空。

### `flux_ai_config`

手动保存的大模型配置：

```json
{
  "baseURL": "https://api.deepseek.com/v1",
  "model": "deepseek-chat",
  "apiKey": ""
}
```

用途：

- Quick Capture 自动打标
- Editor AI 重新审视
- Crystal Assimilation 同化改写

说明：

- `Phantom Weaving` 第一阶推荐与长文切块都已完全本地化，不依赖此配置。

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
  revisions?: {
    id: string
    kind: 'assimilation' | 'restore' | 'rollback'
    beforeContent: string
    afterContent: string
    contextParagraph?: string
    sourceBlockId?: string | null
    sourceBlockTitle?: string
    sourceRevisionId?: string
    createdAt: string
  }[]
}
```

字段说明：

- `id`：统一通过 `buildBlockId()` 生成，避免批量建块时撞 ID。
- `title`：页面标题，也可能在创建后被 AI 修正。
- `content`：当前以 HTML 字符串形式保存 TipTap 内容。
- `dimensions`：正交维度集合，不承担树状父子关系。
- `revisions`：与同化、恢复、回滚相关的线性历史。
- `createdAt / updatedAt`：ISO 日期字符串。

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

### 3.3 `ActivePoolContext`

```ts
type ActivePoolContext = {
  poolId: string | null
  name?: string
  key?: string
  filters: Record<string, string[]>
  sourceView?: 'sidebar' | 'feed' | 'graph'
}
```

### 3.4 `RecentPoolEvent`

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
```

## 4. 当前线程与关系约定

超长文本切块后，不会引入新的数据库实体，而是通过共享维度绑定同一线程：

- `dimensions.project` 会注入类似 `来源:公司财报摘要_ab12cd` 的父级线程标签
- `dimensions.source` 会注入类似 `知识碎块:thread_xxx` 的系统来源标签

Conflux 当前不会把 block 关系固化成单独表，而是按需推导：

- 文本引用关系：来自正文中的 block 引用或 `Adaptive Lens` 来源
- 维度关系：来自 `domain / format / project / stage` 的交集
- 稳定来源关系：来自 `dimensions.source` 中的线程与来源标签
- 运行时提示关系：来自 `Phantom Weaving` 的本地命中结果

## 5. 当前存储策略的优点与代价

优点：

- 纯前端即可验证产品闭环
- 本地响应快，开发迭代轻
- BYOK 不经过平台后端，更符合当前隐私边界
- 长文切块与段落级推荐都能在本地完成，避免高额模型成本与排队

代价：

- 数据不能跨设备同步
- 不能做协作、权限和审计
- 本地存储容量有限
- 结构演进时需要考虑迁移脚本与兼容逻辑

## 6. 版本化存储路线图

从现在开始，存储层不再保留抽象的“未来建议”，只保留明确版本归属。

### `v1.1`

负责：

- 为混合召回与 Intent Fission 预留前端缓存与索引扩展空间
- 继续沿用当前 local-first 结构，不提前引入数据库换代

### `v1.2`

负责：

- 用 `IndexedDB` 承载本地图片与媒体资源
- 让图文混排不再受 `localStorage` 容量硬顶制约
- 在不破坏现有 block 结构的前提下补齐媒体引用语义

### `v1.3`

负责：

- 为 Canvas、Table View 与高级属性治理补充可序列化状态位
- 为批量属性整理与更复杂视图保存预留结构扩展空间

### `v2.0-Alpha`

负责：

- 把浏览器存储主轴迁移到 `SQLite`
- 为本地向量检索引入数据库能力
- 为文件落盘与加密同步提供可迁移的数据模型
- 让 revision、threads、presets 不再被局限在浏览器存储容量与形态里

## 7. `v2.0-Alpha` 存储迁移预案

如果进入 `v2.0-Alpha`，建议将当前本地结构映射为如下表：

### `flux_blocks`

- `id`
- `title`
- `content_html`
- `dimensions_jsonb`
- `created_at`
- `updated_at`

### `block_revisions`

- `id`
- `block_id`
- `kind`
- `source_block_id`
- `source_block_title`
- `source_revision_id`
- `context_paragraph`
- `before_content_html`
- `after_content_html`
- `created_at`

### `saved_pools`

- `id`
- `name`
- `filters_jsonb`
- `created_at`
- `updated_at`

### `recent_pool_events`

- `id`
- `pool_id`
- `block_id`
- `event_type`
- `created_at`

### `document_threads`

- `thread_id`
- `display_name`
- `source_block_ids`
- `created_at`

## 8. 迁移硬约束

如果未来从浏览器存储迁移到 `v2.0-Alpha` 本地数据库，必须保证：

- 旧用户的 `flux_blocks_store` 可被一次性导入
- `dimensions` 保持数组语义，不被压扁成字符串
- `content` 保持 HTML 兼容，避免破坏现有 TipTap 内容
- `revisions`、线程标签与 `activePoolContext` 不被丢失
- 关系仍以“推导优先”为主，除非性能成为明确瓶颈，再考虑缓存层

