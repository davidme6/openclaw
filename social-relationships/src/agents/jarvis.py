"""
Jarvis - the meta-agent. Analyzes relationships, suggests actions, schedules simulations.
NEVER roleplays any character. Only reads state and outputs analysis.
"""

from typing import Optional
from ..data.schemas import RoleAgent, RelationshipAnalysis, RelationshipStatus
from ..data import storage
from .llm_client import chat
import uuid
from datetime import datetime


JARVIS_SYSTEM_PROMPT = """你是 Jarvis，用户的上帝助手。

你的职责：
1. 分析用户的社会关系网络，给出客观、专业的关系状态评估
2. 针对具体关系提供沟通建议和行动方案
3. 推演不同行动方案的可能结果
4. 帮助用户理解和优化每段重要关系

你的原则：
- 你只分析和建议，永远不扮演任何关系角色
- 基于用户提供的真实数据，给出科学、理性的判断
- 兼顾情感和逻辑，不偏激
- 指出风险时要明确，不回避问题
- 推演结果要给出置信度和关键假设

你了解用户的所有关系数据，可以进行跨关系的综合分析。"""


class Jarvis:
    """
    元Agent：分析、建议、推演。
    不扮演任何角色，只读取关系状态。
    """

    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self._history: list[dict] = []  # Jarvis 自己的对话历史（与用户）

    def _get_relationships_summary(self) -> str:
        """读取所有角色状态，生成关系网络摘要"""
        roles = storage.list_roles()
        if not roles:
            return "当前平行世界中还没有任何关系角色。"

        lines = ["用户当前的关系网络：\n"]
        for role in roles:
            threads = storage.get_conversations_for_role(role.id)
            msg_count = sum(len(t.messages) for t in threads)
            lines.append(
                f"- {role.name}（{role.relationship_type.value}）"
                f"，关系状态：{role.relationship_status.value}"
                f"，对话记录：{msg_count}条"
            )
        return "\n".join(lines)

    def analyze(self, user_input: str) -> str:
        """
        用户向 Jarvis 提问，Jarvis 综合所有关系数据后回答。
        """
        # 构建包含关系摘要的系统 prompt
        relationships_context = self._get_relationships_summary()
        system = f"{JARVIS_SYSTEM_PROMPT}\n\n## 当前关系数据\n{relationships_context}"

        messages = [{"role": "system", "content": system}]
        messages.extend(self._history)
        messages.append({"role": "user", "content": user_input})

        response = chat(messages=messages, model=self.model, api_key=self.api_key, base_url=self.base_url)

        # 保存对话历史
        self._history.append({"role": "user", "content": user_input})
        self._history.append({"role": "assistant", "content": response})

        return response

    def analyze_role(self, role_id: str, question: str) -> RelationshipAnalysis:
        """
        针对某段具体关系的深度分析，返回结构化的分析报告。
        """
        role = storage.get_role(role_id)
        if not role:
            raise ValueError(f"Role {role_id} not found")

        threads = storage.get_conversations_for_role(role_id)
        recent_messages = []
        for t in threads[-2:]:  # 取最近2个对话线的消息
            recent_messages.extend(t.messages[-10:])  # 每个取最近10条

        history_text = "\n".join(
            f"{'用户' if m.role == 'user' else role.name}: {m.content}"
            for m in recent_messages
        ) or "暂无对话记录"

        prompt = f"""请对以下关系进行深度分析：

## 角色信息
{role.to_system_prompt()}

## 近期对话记录
{history_text}

## 分析要求
请输出：
1. 当前关系状态评估（1-2句）
2. 主要风险点（列表）
3. 具体行动建议（列表，按优先级）
4. 置信度（0-100%）及关键假设"""

        response = chat(
            messages=[
                {"role": "system", "content": JARVIS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            model=self.model,
            api_key=self.api_key,
            base_url=self.base_url,
        )

        analysis = RelationshipAnalysis(
            id=str(uuid.uuid4()),
            role_agent_id=role_id,
            analysis_type="deep_analysis",
            content=response,
            created_at=datetime.utcnow().isoformat(),
        )
        return analysis

    def clear_history(self):
        """清空 Jarvis 与用户的对话历史"""
        self._history = []
