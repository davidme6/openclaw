"""
Simulation Engine - the core differentiator of this product.
Like git branch: create branches from any point, run independently, compare, rollback.

Flow:
  现实主线 ──●────●────●────●
              │
              └── 分支A（方案一：直接道歉）──●──●
              └── 分支B（方案二：先冷静）───●──●
                        ↓
              对比结果 → 选择最优 → 合并回主线 or 放弃
"""

import uuid
from datetime import datetime
from typing import Optional

from ..data.schemas import (
    SimulationBranch, TimelineSnapshot, BranchStatus,
    RelationshipStatus, Message
)
from ..data import storage
from ..agents.agent_factory import AgentFactory
from ..agents.jarvis import Jarvis


class SimulationEngine:
    """
    推演引擎：管理分支的创建、运行、对比、回退、合并。
    """

    def __init__(self, factory: AgentFactory, jarvis: Jarvis):
        self.factory = factory
        self.jarvis = jarvis

    # ── 快照 ──────────────────────────────────────────────────────────────────

    def take_snapshot(self, role_id: str, description: str, branch_id: Optional[str] = None) -> TimelineSnapshot:
        """
        为某个角色的当前对话状态创建快照。
        这是所有分支的"存档点"，可随时回退到这里。
        """
        threads = storage.get_conversations_for_role(role_id, branch_id=branch_id)
        all_messages = []
        for t in threads:
            all_messages.extend(t.messages)

        role = storage.get_role(role_id)
        snapshot = TimelineSnapshot(
            id=str(uuid.uuid4()),
            branch_id=branch_id or "main",
            description=description,
            role_agent_id=role_id,
            conversation_snapshot=all_messages,
            relationship_status=role.relationship_status if role else RelationshipStatus.ACTIVE,
            created_at=datetime.utcnow().isoformat(),
        )
        return snapshot

    # ── 分支 ──────────────────────────────────────────────────────────────────

    def create_branch(
        self,
        role_id: str,
        name: str,
        description: str,
        snapshot_description: str = "分支起点快照",
    ) -> SimulationBranch:
        """
        从当前状态创建一个新的推演分支。
        分支内的 Agent 与主线完全隔离——在分支里怎么聊，主线不受影响。
        """
        # 先对当前状态存档
        snapshot = self.take_snapshot(role_id, snapshot_description)

        branch = SimulationBranch(
            id=str(uuid.uuid4()),
            role_agent_id=role_id,
            parent_snapshot_id=snapshot.id,
            name=name,
            description=description,
            status=BranchStatus.ACTIVE,
            snapshots=[snapshot],
            created_at=datetime.utcnow().isoformat(),
        )
        storage.save_branch(branch)

        # 把主线历史消息复制到分支对话线（让分支 agent 有上下文）
        self._clone_history_to_branch(role_id, branch.id, snapshot.conversation_snapshot)

        return branch

    def _clone_history_to_branch(self, role_id: str, branch_id: str, messages: list[Message]):
        """将历史消息克隆到分支对话线，让分支 Agent 有完整上下文"""
        from ..data.schemas import ConversationThread
        thread = ConversationThread(
            id=str(uuid.uuid4()),
            role_agent_id=role_id,
            branch_id=branch_id,
            messages=list(messages),
        )
        storage.save_conversation(thread)

    def chat_in_branch(self, branch_id: str, role_id: str, user_input: str) -> str:
        """在推演分支内与角色对话，不影响主线"""
        runtime = self.factory.get_runtime(role_id, branch_id=branch_id)
        return runtime.reply(user_input)

    # ── 对比 ──────────────────────────────────────────────────────────────────

    def compare_branches(self, branch_ids: list[str], role_id: str) -> str:
        """
        让 Jarvis 对多个分支的结果进行对比分析，推荐最优方案。
        """
        summaries = []
        for bid in branch_ids:
            branch = storage.get_branch(bid)
            if not branch:
                continue
            threads = storage.get_conversations_for_role(role_id, branch_id=bid)
            last_msgs = []
            for t in threads:
                last_msgs.extend(t.messages[-4:])  # 取每个线的最后4条
            history = "\n".join(
                f"{'用户' if m.role == 'user' else '角色'}: {m.content}"
                for m in last_msgs
            )
            summaries.append(f"### 方案「{branch.name}」\n描述：{branch.description}\n对话记录：\n{history}")

        prompt = f"""请对比以下{len(summaries)}个推演方案的效果，给出分析和推荐：

{'---'.join(summaries)}

请分析：
1. 每个方案的对话走向和关系变化
2. 各方案的优劣势
3. 推荐哪个方案，理由是什么
4. 实施推荐方案时需要注意什么"""

        return self.jarvis.analyze(prompt)

    # ── 合并 & 放弃 ───────────────────────────────────────────────────────────

    def merge_branch(self, branch_id: str, actual_outcome: str):
        """
        将推演分支合并回主线。
        actual_outcome：现实中按该方案执行后的真实结果，用于纠偏。
        """
        branch = storage.get_branch(branch_id)
        if not branch:
            raise ValueError(f"Branch {branch_id} not found")
        branch.status = BranchStatus.MERGED
        branch.actual_outcome = actual_outcome
        storage.save_branch(branch)

    def abandon_branch(self, branch_id: str):
        """放弃一个推演分支"""
        branch = storage.get_branch(branch_id)
        if not branch:
            raise ValueError(f"Branch {branch_id} not found")
        branch.status = BranchStatus.ABANDONED
        storage.save_branch(branch)

    # ── 回退 ──────────────────────────────────────────────────────────────────

    def rollback_to_snapshot(self, role_id: str, snapshot: TimelineSnapshot) -> str:
        """
        回退到某个快照状态。
        创建一个新分支，从快照的对话历史重新开始。
        返回新分支 ID。
        """
        new_branch = SimulationBranch(
            id=str(uuid.uuid4()),
            role_agent_id=role_id,
            parent_snapshot_id=snapshot.id,
            name=f"回退自「{snapshot.description}」",
            description=f"从快照 {snapshot.id[:8]} 回退重新推演",
            status=BranchStatus.ACTIVE,
            snapshots=[snapshot],
            created_at=datetime.utcnow().isoformat(),
        )
        storage.save_branch(new_branch)
        self._clone_history_to_branch(role_id, new_branch.id, snapshot.conversation_snapshot)
        return new_branch.id

    def list_branches(self, role_id: str) -> list[SimulationBranch]:
        """列出某个角色的所有推演分支"""
        return storage.list_branches_for_role(role_id)
