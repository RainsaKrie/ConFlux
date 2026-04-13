# Conflux 数据与存储设计

文档基线：`v1.0 稳定化阶段 / Roadmap Solidified`

## 1. 文档定位

本文件记录的是 Conflux 当前真实存储结构，以及已经被版本路线图锁定的存储演进方向。

当前最准确的描述仍然是：`v1.0 稳定化阶段的数据基线`。

版本事实以 [`04-CHANGELOG.md`](./04-CHANGELOG.md) 为准。

## 2. 当前持久化键与宿主

Conflux 当前使用的是一套混合持久化模型：

- 在 `Tauri` 桌面环境下，Zustand persist 会优先写入 `Tauri Store` 的 `conflux_universe.json`
- 在纯 Web 调试环境下，会自动回退到浏览器 `localStorage`
- 当桌面端首次检测到 legacy `localStorage` 中已有旧数据时，会自动迁移到 `Tauri Store`

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
  "version": 3
}
```

用途：

- 持久化知识块
- 持久化 Gravity Pools
- 持久化当前观察主题上下文、最近事件流与本地 AI 任务记录

说明：

- 在桌面端，该结构会以 JSON 对象形式保存在 `conflux_universe.json` 的 `flux_blocks_store` 键下。
- 在 Web 环境中，该结构仍会通过 `localStorage.flux_blocks_store` 保存为 JSON 字符串。
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

- Web 与桌面壳层共用同一套状态模型
- 本地响应快，开发迭代轻
- BYOK 不经过平台后端，更符合当前隐私边界
- 长文切块与段落级推荐都能在本地完成，避免高额模型成本与排队
- 桌面端已经脱离浏览器配额上限，开始具备更稳定的持久化边界

代价：

- 数据不能跨设备同步
- 不能做协作、权限和审计
- 当前桌面主存储仍是 JSON Store，而不是数据库
- 结构演进时需要考虑迁移脚本与兼容逻辑

## 6. 版本化存储路线图

从现在开始，存储层不再保留抽象的“未来建议”，只保留明确版本归属。

### `v1.1`

负责：

- 为混合召回预留前端缓存与索引扩展空间
- 继续沿用当前 local-first 结构，不提前引入数据库换代

### `v1.2`

负责：

- 收口长文编辑与结构化创作体验
- 不再继续推进纯 Web `IndexedDB` 媒体方案
- 保持当前 block 结构稳定，为桌面原生媒体承载让路

### `v1.3`

负责：

- 为 Canvas、Table View 与高级属性治理补充可序列化状态位
- 为批量属性整理与更复杂视图保存预留结构扩展空间

### `v2.0`

负责：

- 把桌面端持久化主轴切到 `Tauri Store`
- 保持 Web 环境自动回退到 `localStorage`
- 为未来数据库化迁移保留兼容空间
- 让 revision、threads、presets 不再被局限在浏览器存储容量与形态里

当前实现态：

- Zustand persist 已切到异步 `Tauri Store` 适配
- 首启会从 legacy `localStorage` 自动迁移到 `conflux_universe.json`
- 当前读写协议已经对齐 `createJSONStorage` 的字符串协议

### `v2.1`

负责：

- 将图片与附件从正文内联数据中剥离出来
- 通过原生文件系统把媒体写入本地 `media/` 目录
- 让正文只保存资源引用，而不是巨型 Base64 内容

## 7. 未来数据库化迁移预案

如果未来 `Tauri Store (JSON)` 已无法满足容量、查询或同步需求，再考虑把当前结构迁移为数据库表：

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

如果未来从当前 `Tauri Store + localStorage fallback` 迁移到本地数据库，必须保证：

- 旧用户的 `flux_blocks_store` 可被一次性导入
- `dimensions` 保持数组语义，不被压扁成字符串
- `content` 保持 HTML 兼容，避免破坏现有 TipTap 内容
- `revisions`、线程标签与 `activePoolContext` 不被丢失
- 关系仍以“推导优先”为主，除非性能成为明确瓶颈，再考虑缓存层

