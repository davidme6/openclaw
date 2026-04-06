# Social Relationships 平行世界项目 — Claude 记忆文件

> 每次新对话开始，把这个文件给 Claude 看，它会立刻恢复完整上下文。

---

## 项目定位

用户以"上帝视角"将现实社会关系网复制到虚拟平行世界。
每段关系由一个完全独立的 Agent 扮演，Jarvis（元Agent）负责分析、建议、推演。
用户可在平行世界试错、回退，并将现实反馈同步回来纠偏，实现对社会关系的精准推演和永久留存。

---

## 核心架构原则（不可违反）

1. **每个角色 = 完全独立的 Agent**，互相完全隔离（独立 system prompt + 独立记忆 + 独立会话上下文）
2. **Jarvis 永远不扮演任何角色**，只做分析、建议、调度
3. **不使用 agent-team-mode**，那是任务分配框架，不是角色扮演框架
4. **推演引擎是核心差异化**：类 git branch，支持分支创建、快照、回退

---

## 技术栈

- **后端语言**：Python
- **LLM**：阿里云百炼 Coding Plan，默认模型 `qwen3.5-plus`
- **Coding Plan Base URL**：`https://coding.dashscope.aliyuncs.com/v1`（不能改成普通URL）
- **API Key**：在 `.env` 文件中，变量名 `DASHSCOPE_API_KEY`（不推到 GitHub）
- **MVP 存储**：JSON 文件（Phase 4 迁移三库）
- **目标存储**：PostgreSQL + Neo4j + ChromaDB

---

## 分工

| 角色 | 负责 |
|------|------|
| Claude Code（我） | 后端全部：Agent系统、推演引擎、API层 |
| Qwen/Jarvis | 前端：React + TypeScript + React Flow |
| Trae | 后期前端优化 |

---

## 代码仓库

- **私有仓库**：`davidme6/Claude-code`（私有，防止项目泄露）
- **分支**：`main`
- **项目路径**：`projects/social-relationships/`（已重新整理）

---

## 当前进度

### ✅ 已完成

**W1-2：数据结构设计**
- `src/data/schemas.py` — 所有核心数据结构
  - `RoleAgent`：角色Agent，含 `to_system_prompt()` 自动生成注入提示
  - `PersonalityModel`：性格模型（MBTI、说话风格、价值观、触发点、爱的语言）
  - `ConversationThread`：对话线（完全隔离）
  - `Message`：单条消息（支持标记是否从现实导入）
  - `SimulationBranch`：推演分支（类 git branch）
  - `TimelineSnapshot`：时间线快照（支持回退）
  - `RelationshipAnalysis`：Jarvis 分析输出
- `src/data/storage.py` — JSON 存储层（Phase 4 迁移三库）

**W3-4：单Agent真实性验证（✅ 2026-04-06 通过）**
- `src/agents/llm_client.py` — LLM 接入层，默认百炼 qwen3.5-plus，模型可配置
- `src/agents/role_agent.py` — RoleAgentRuntime，完全隔离的角色对话运行时
- `test_agent.py` — 测试脚本，创建"小雨"角色，三轮对话验证通过
- **真实回复样本**：
  - 用户"今天工作好累" → 小雨"亲爱的，辛苦啦～（轻轻抱住）听到你说累，我好心疼哦..."
  - 用户"想你了" → 小雨"真的嘛～（嘴角不自觉上扬，心里甜甜的）..."
  - 用户"你最近有没有觉得我有点冷落你" → 小雨"（稍微愣了一下，眼神里闪过一丝被说中的慌乱...）"
- **结论：角色人设、情感表达完全自然，核心验证通过，可以进入下一阶段**

**W5-6：多角色独立Agent系统 + Jarvis（✅ 2026-04-06 通过）**
- `src/agents/agent_factory.py` — AgentFactory，统一创建管理角色实例
- `src/agents/jarvis.py` — Jarvis 元Agent，只读所有关系状态，综合分析输出
- `test_multi_agent.py` — 多角色测试脚本
- **验证结果**：
  - 小雨（恋人）、老爸（父母）独立运行，风格完全不同
  - 角色隔离验证：小雨不知道老爸存在
  - Jarvis 能综合分析所有关系，输出数据驱动的报告

**W7：推演引擎（✅ 2026-04-06 通过）**
- `src/simulation/engine.py` — 核心推演引擎
  - `take_snapshot()` — 状态快照
  - `create_branch()` — 从当前状态创建推演分支
  - `chat_in_branch()` — 分支内独立对话（不影响主线）
  - `compare_branches()` — Jarvis 对比多方案
  - `merge_branch()` / `abandon_branch()` — 合并/放弃
  - `rollback_to_snapshot()` — 回退到任意节点
- `test_simulation.py` — 推演引擎测试脚本
- **验证结果**：分支创建、独立对话、Jarvis对比分析、合并放弃、主线保持独立全部通过
- **注意**：llm_client.py 已加 timeout=60s + max_retries=3（解决代理超时问题）

### 🔜 下一步（W8）— 三库迁移

**PostgreSQL + Neo4j + ChromaDB**
- `src/database/pg.py` — PostgreSQL（结构化数据：用户、角色、配置）
- `src/database/graph.py` — Neo4j（关系图谱：人与人之间的网络）
- `src/database/vector.py` — ChromaDB（向量化聊天记忆，语义检索）
- 替换现有 JSON 存储层，接口保持不变（对上层透明）

---

## 开发路线图

```
✅ W1-2   数据结构设计
✅ W3-4   单Agent验证（qwen3.5-plus 跑通）
✅ W5-6   多角色独立Agent系统 + Jarvis元Agent
✅ W7     推演引擎（分支、快照、回退）
🔜 W8     三库迁移（PostgreSQL + Neo4j + ChromaDB）
   W8     三库迁移（PostgreSQL + Neo4j + ChromaDB）
   W9     API层（REST + WebSocket）
   W10+   前端（Qwen负责，React + TypeScript + React Flow）
```

---

## 目录结构

```
social-relationships/
├── SOCIAL-RELATIONSHIPS-MEMORY.md  ← 本文件（Claude 记忆）
├── .env                   ← API Key（不推到 GitHub）
├── .env.example           ← 配置模板
├── .gitignore
├── requirements.txt
├── test_agent.py          ← 单Agent测试脚本
├── src/
│   ├── agents/
│   │   ├── llm_client.py  ← LLM 接入（百炼 Coding Plan）
│   │   └── role_agent.py  ← RoleAgentRuntime
│   └── data/
│       ├── schemas.py     ← 所有数据结构
│       └── storage.py     ← JSON 存储层
└── data/
    ├── roles/             ← 角色数据
    ├── conversations/     ← 对话历史
    └── timelines/         ← 推演分支
```

---

## 重要约定

- `.env` 永远不推到 GitHub（已在 `.gitignore` 中排除）
- `BAILIAN_BASE_URL` 必须是 `https://coding.dashscope.aliyuncs.com/v1`（Coding Plan 专属）
- 每个新角色 = 新的 `RoleAgentRuntime` 实例，绝不共享上下文
- 推演分支用 `SimulationBranch`，快照用 `TimelineSnapshot`，类比 git branch/commit
