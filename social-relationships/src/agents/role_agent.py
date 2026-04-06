"""
RoleAgent runtime - handles a single role's conversation.
Each instance is completely isolated: own system prompt, own memory, own context.
"""

from typing import Optional
from ..data.schemas import RoleAgent as RoleAgentSchema, Message, ConversationThread
from ..data import storage
from ..database import store_message, search_memory
from .llm_client import chat
import uuid
from datetime import datetime


class RoleAgentRuntime:
    """
    运行时角色Agent。
    一个实例 = 一个角色的完整对话能力。
    完全隔离：不知道其他角色的存在。
    """

    def __init__(
        self,
        role: RoleAgentSchema,
        thread_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.role = role
        self.model = model          # None = 使用默认 qwen3.5-plus
        self.api_key = api_key
        self.base_url = base_url

        # 加载或创建对话线
        if thread_id:
            self.thread = storage.get_conversation(thread_id)
            if not self.thread:
                raise ValueError(f"Conversation thread {thread_id} not found")
        else:
            self.thread = ConversationThread(
                id=str(uuid.uuid4()),
                role_agent_id=role.id,
                branch_id=branch_id,
            )
            storage.save_conversation(self.thread)

    def _build_messages(self) -> list[dict]:
        """构建发送给 LLM 的完整消息列表（system prompt + 历史对话）"""
        msgs = [{"role": "system", "content": self.role.to_system_prompt()}]
        for msg in self.thread.messages:
            msgs.append({
                "role": "user" if msg.role == "user" else "assistant",
                "content": msg.content,
            })
        return msgs

    def reply(self, user_input: str) -> str:
        """
        用户发一条消息，角色回复。
        自动保存到对话线。
        """
        # 保存用户消息
        user_msg = Message(
            role="user",
            content=user_input,
            timestamp=datetime.utcnow().isoformat(),
        )
        self.thread.messages.append(user_msg)

        # 构建上下文并调用 LLM
        messages = self._build_messages()
        response_text = chat(
            messages=messages,
            model=self.model,
            api_key=self.api_key,
            base_url=self.base_url,
        )

        # 保存角色回复
        agent_msg = Message(
            role="agent",
            content=response_text,
            timestamp=datetime.utcnow().isoformat(),
        )
        self.thread.messages.append(agent_msg)
        storage.save_conversation(self.thread)

        # 同步到向量记忆
        try:
            store_message(self.role.id, user_msg)
            store_message(self.role.id, agent_msg)
        except Exception:
            pass  # 向量存储失败不影响主流程

        return response_text

    def get_history(self) -> list[Message]:
        """返回完整对话历史"""
        return self.thread.messages

    def import_history(self, messages: list[dict]):
        """
        批量导入现实聊天记录。
        messages 格式: [{"role": "user"/"agent", "content": "..."}]
        """
        for m in messages:
            msg = Message(
                role=m["role"],
                content=m["content"],
                is_imported=True,
                timestamp=m.get("timestamp", datetime.utcnow().isoformat()),
            )
            self.thread.messages.append(msg)
        storage.save_conversation(self.thread)
        return len(messages)
