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
- **前端**：React + TypeScript + ReactFlow + Zustand + TanStack Query（Vite 构建）

---

## 分工

| 角色 | 负责 |
|------|------|
| Claude Code（我） | 后端全部 + 前端全部（百炼额度不足，Claude接管） |
| Trae | 后期前端优化（交 `frontend/` 文件夹给他） |

---

## 代码仓库

- **私有仓库**：`davidme6/Claude-code`（私有，防止项目泄露）
- **分支**：`claude/social-relationships-planning-dr7vE`
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
- **真实回复样本**：角色人设、情感表达完全自然，核心验证通过

**W5-6：多角色独立Agent系统 + Jarvis（✅ 2026-04-06 通过）**
- `src/agents/agent_factory.py` — AgentFactory，统一创建管理角色实例
- `src/agents/jarvis.py` — Jarvis 元Agent，只读所有关系状态，综合分析输出
- 小雨（恋人）、老爸（父母）独立运行，风格完全不同，角色隔离验证通过

**W7：推演引擎（✅ 2026-04-06 通过）**
- `src/simulation/engine.py` — 核心推演引擎
  - `take_snapshot()` — 状态快照
  - `create_branch()` — 从当前状态创建推演分支
  - `chat_in_branch()` — 分支内独立对话（不影响主线）
  - `compare_branches()` — Jarvis 对比多方案
  - `merge_branch()` / `abandon_branch()` — 合并/放弃
  - `rollback_to_snapshot()` — 回退到任意节点

**W8：三库迁移（✅ 2026-04-06 完成）**
- `src/database/pg.py` — PostgreSQL（结构化数据，需本地起服务）
- `src/database/graph.py` — Neo4j（关系图谱，需本地起服务）
- `src/database/vector.py` — ChromaDB（向量记忆）✅ 已验证
- ChromaDB 已接入 RoleAgentRuntime，每次对话自动写入向量

**W9：API 层（✅ 2026-04-06 完成）**
- `src/api/main.py` — FastAPI 主入口，CORS 已配置
- `src/api/routes/roles.py` — 角色 CRUD + 历史导入
- `src/api/routes/chat.py` — REST 对话 + WebSocket 流式
- `src/api/routes/simulation.py` — 推演分支全套接口
- `src/api/routes/jarvis.py` — Jarvis 分析接口
- 启动命令：`uvicorn src.api.main:app --reload --port 8000`
- **全部21条路由加载验证通过**

**W10：前端（✅ 2026-04-07 完成）**
- 技术栈：React 19 + TypeScript + ReactFlow + Zustand + TanStack Query + Vite
- **无 Tailwind**，全部使用自定义 CSS（`src/index.css`），深色主题
- `src/api/client.ts` — axios API 客户端（rolesApi, chatApi, simApi, jarvisApi, createChatWS）
- `src/types/index.ts` — TypeScript 类型定义（Role, Message, Branch + 枚举标签）
- `src/store/index.ts` — Zustand 全局状态（roles, selectedRoleId, messages, branches, activeBranchId, jarvisPanel）
- `src/components/RelationshipGraph.tsx` — Module 1：ReactFlow 上帝视角关系图谱
  - 圆形布局：用户居中，角色环绕
  - 自定义 RoleNode（状态颜色边框、首字母头像）
  - 动态边（active关系有动画、distant用虚线）
- `src/components/ChatPanel.tsx` — Module 2：对话界面
  - 消息气泡（用户右侧蓝色、Agent左侧深色）
  - 分支模式指示器（🌿 推演模式）
  - 打字动画、Enter发送
- `src/components/SimulationPanel.tsx` — Module 3：上帝面板/推演控制台
  - 创建/进入/退出分支
  - 合并（填写现实结果）/ 放弃分支
  - ≥2个活跃分支时显示 Jarvis 对比按钮
- `src/components/JarvisPanel.tsx` — Jarvis 侧边分析面板
  - 全局分析 / 特定角色分析双模式
  - 对话历史记录（问题+答案）
- `src/components/AddRoleModal.tsx` — 添加角色弹窗
  - 基本信息（姓名、关系类型、状态、年龄、职业、简介）
  - 性格模型（MBTI、说话风格、价值观、触发点、爱的语言）
- `src/App.tsx` — 主布局（三栏 + Jarvis侧边栏）
  - 顶栏：app名称 + Jarvis切换按钮
  - 左栏：角色列表（220px）
  - 中栏：关系图谱（flex:1）
  - 右栏：对话/推演切换（360px）
  - Jarvis 侧边栏：绝对定位覆盖右侧（420px）
- `src/index.css` — 全局样式（深色主题，CSS变量）
- `src/main.tsx` — 入口，包含 QueryClientProvider

---

## 启动方式

### 后端
```bash
cd social-relationships
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 8000
```

### 前端
```bash
cd social-relationships/frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 环境变量
- 后端：`social-relationships/.env` 中 `DASHSCOPE_API_KEY=你的key`
- 前端：`social-relationships/frontend/.env` 中 `VITE_API_URL=http://localhost:8000`

---

## 目录结构

```
social-relationships/
├── SOCIAL-RELATIONSHIPS-MEMORY.md  ← 本文件（Claude 记忆）
├── .env                   ← API Key（不推到 GitHub）
├── .env.example           ← 配置模板
├── .gitignore
├── requirements.txt
├── src/
│   ├── agents/
│   │   ├── llm_client.py  ← LLM 接入（百炼 Coding Plan）
│   │   ├── role_agent.py  ← RoleAgentRuntime
│   │   ├── agent_factory.py
│   │   └── jarvis.py      ← Jarvis 元Agent
│   ├── data/
│   │   ├── schemas.py     ← 所有数据结构
│   │   └── storage.py     ← JSON 存储层
│   ├── database/
│   │   ├── pg.py          ← PostgreSQL
│   │   ├── graph.py       ← Neo4j
│   │   └── vector.py      ← ChromaDB
│   ├── simulation/
│   │   └── engine.py      ← 推演引擎
│   └── api/
│       ├── main.py        ← FastAPI 主入口
│       ├── deps.py        ← 依赖注入
│       └── routes/        ← roles, chat, simulation, jarvis
├── frontend/
│   ├── src/
│   │   ├── api/client.ts
│   │   ├── types/index.ts
│   │   ├── store/index.ts
│   │   ├── components/
│   │   │   ├── RelationshipGraph.tsx ✅
│   │   │   ├── ChatPanel.tsx         ✅
│   │   │   ├── SimulationPanel.tsx   ✅
│   │   │   ├── JarvisPanel.tsx       ✅
│   │   │   └── AddRoleModal.tsx      ✅
│   │   ├── App.tsx                   ✅
│   │   ├── main.tsx                  ✅
│   │   └── index.css                 ✅
│   └── .env               ← VITE_API_URL（不推到 GitHub）
└── data/
    ├── roles/
    ├── conversations/
    └── timelines/
```

---

## 重要约定

- `.env` 永远不推到 GitHub（已在 `.gitignore` 中排除）
- `BAILIAN_BASE_URL` 必须是 `https://coding.dashscope.aliyuncs.com/v1`（Coding Plan 专属）
- 每个新角色 = 新的 `RoleAgentRuntime` 实例，绝不共享上下文
- 推演分支用 `SimulationBranch`，快照用 `TimelineSnapshot`，类比 git branch/commit
- 前端无 Tailwind，全部自定义 CSS，深色主题（CSS 变量在 `:root`）

---

## 下一步（可选优化）

- [ ] 交给 Trae 做前端 UI 精细优化（直接给他 `frontend/` 文件夹）
- [ ] 本地部署测试（需要运行后端 + 前端）
- [ ] PostgreSQL + Neo4j 本地部署（目前 MVP 用 JSON）
- [ ] WebSocket 流式回复（目前用 REST，后端已有 WS 路由）
- [ ] 导入真实聊天记录（WhatsApp/微信导出格式解析）
