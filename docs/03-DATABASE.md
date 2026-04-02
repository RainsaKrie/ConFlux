# Flux 数据与存储设计

文档基线：`v1.0 稳定化整理版`

## 1. 版本校正说明

本文件记录的是“当前真实存储结构”和“未来迁移建议”。

- 当前代码同时包含 `v0.9` 的段落级推荐主链与 `v1.0` 的长文切块主链。
- `v0.8` 的文案与体验收口并未作为一次完整发布真正结束，因此不要把当前存储设计理解成某个干净的 `v0.8`、`v0.9` 或 `v1.0` 独立快照。
- 当前最准确的描述是：`v1.0 稳定化阶段的数据基线`，且 `stage / source` 已进入低存在感跨视图 UI。

版本事实以 [`04-CHANGELOG.md`](./04-CHANGELOG.md) 为准。

## 2. 本地存储键

### `flux_blocks_store`

由 Zustand persist 写入，当前保存：

```json
{
  "state": {
    "fluxBlocks": [],
    "savedPools": [],
    "activePoolContext": null,
    "recentPoolEvents": []
  },
  "version": 2
}
```

用途：

- 持久化知识块
- 持久化 Gravity Pools
- 持久化当前观察主题上下文与最近事件流

说明：

- `peekBlockId` 这类纯 UI 状态不进入持久化层。
- `fluxBlocks[].revisions[]` 已成为正式的版本历史承载结构。
- 本地结构是当前产品真相，不应和 seed 数据混淆。

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

字段说明：

- `name`：用户给筛选视角起的名字
- `filters`：一组标签交集条件

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

这层状态的意义不是把 Pool 扩成数据库实体，而是让：

- Feed 的当前观察主题能被 `/write` 感知
- `Phantom Weaving` 用当前 Pool 语境给候选块轻量加权
- `Crystal Assimilation` 事件能回流到当前主题视角

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

## 4. 长文线程标签

超长文本切块后，不会引入新的数据库实体，而是通过共享维度绑定同一线程：

- `dimensions.project` 会注入类似 `来源:公司财报摘要_ab12cd` 的父级线程标签
- `dimensions.source` 会注入类似 `知识碎块:thread_xxx` 的系统来源标签

这保证同一篇长文碎片在 Feed、Graph 和本地推荐中仍能被重新串联。

## 5. 当前运行时关系层

Flux 当前不会把 block 关系固化成单独表，而是按需推导：

- 文本引用关系：来自正文中的 block 引用或 `Adaptive Lens` 来源
- 维度关系：来自 `domain / format / project / stage` 的交集
- 稳定来源关系：来自 `dimensions.source` 中的线程与来源标签
- 运行时提示关系：来自 `Phantom Weaving` 的本地命中结果

这意味着当前 Feed 关系角标、Graph 图谱与写作中推荐结果，大多属于“运行时关系层”，不是数据库实体表。

## 6. 与当前能力的映射

截至当前代码基线，存储层已经支撑以下能力：

- 早期基础能力：Feed、Write、Graph 的骨架与本地持久化
- 显式引用能力：Editor 自动保存与 `@` 引用节点
- 局部推荐能力：段落级本地推荐、Pool 上下文加权与 Drawer 核对
- 原文更新能力：预览确认、线性 revision、恢复与来源追溯
- 长文能力：语义切块、线程标签、批量渐进式落盘

如果必须按回顾性里程碑理解，则可以简化为：

- `v0.1 ~ v0.7`：本地 block、Pool、引用、版本历史与质量控制基础
- `v0.9`：段落级推荐与精确同化
- `v1.0`：长文切块与线程串联

## 7. 当前存储策略的优点与代价

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

## 8. 未来后端化建议

如果进入后端化阶段，建议将当前本地结构映射为如下表：

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

### `document_threads`（可选）

如果未来想把长文线程从“维度约定”升级为正式实体，可以补一张轻量线程表：

- `thread_id`
- `display_name`
- `source_block_ids`
- `created_at`

当前阶段并不必需，因为 `project / source` 维度已经够用。

## 9. 迁移注意事项

未来若从 localStorage 迁移到后端，必须保证：

- 旧用户的 `flux_blocks_store` 可被一次性导入
- `dimensions` 保持数组语义，不被压扁成字符串
- `content` 保持 HTML 兼容，避免破坏现有 TipTap 内容
- `revisions`、线程标签与 `activePoolContext` 不被丢失
- 关系仍以“推导优先”为主，除非性能成为明确瓶颈，再考虑缓存层
