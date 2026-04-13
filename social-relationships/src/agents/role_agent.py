"""Role agent runtime — handles one role's conversation history and replies."""

from typing import Optional
from ..data import storage
from ..data.schemas import RoleAgent, Message
from . import llm_client as lc


class RoleAgentRuntime:
    def __init__(self, role: RoleAgent, model: str, api_key: str, base_url: str):
        self.role = role
        self.model = model
        self.client = lc.get_client(api_key, base_url)

    def chat(
        self,
        user_message: str,
        branch_id: Optional[str] = None,
        image_base64: Optional[str] = None,
    ) -> str:
        thread = storage.get_conversation(self.role.id, branch_id)
        history = thread.messages if thread else []

        messages = [{"role": "system", "content": self.role.to_system_prompt()}]
        for m in history[-40:]:  # last 40 messages for context
            messages.append({
                "role": "user" if m.role == "user" else "assistant",
                "content": m.content,
            })

        # Build current user turn (with optional image)
        if image_base64:
            content = [
                {"type": "text", "text": user_message or "请描述这张图片"},
                {"type": "image_url", "image_url": {"url": image_base64}},
            ]
        else:
            content = user_message

        messages.append({"role": "user", "content": content})

        reply = lc.chat(self.client, self.model, messages, max_tokens=1024)

        # Persist
        from ..data.schemas import ConversationThread
        if not thread:
            thread = ConversationThread(role_agent_id=self.role.id, branch_id=branch_id)
        thread.messages.append(Message(role="user", content=user_message))
        thread.messages.append(Message(role="agent", content=reply))
        storage.save_conversation(thread)

        return reply

    def get_history(self, branch_id: Optional[str] = None) -> list:
        thread = storage.get_conversation(self.role.id, branch_id)
        if not thread:
            return []
        return [{"role": m.role, "content": m.content, "timestamp": m.timestamp,
                 "is_imported": m.is_imported} for m in thread.messages]

    def import_history(self, messages: list[dict]) -> int:
        from ..data.schemas import ConversationThread, Message as Msg
        thread = storage.get_conversation(self.role.id) or ConversationThread(role_agent_id=self.role.id)
        count = 0
        for m in messages:
            thread.messages.append(Msg(
                role=m.get("role", "user"),
                content=m.get("content", ""),
                is_imported=True,
            ))
            count += 1
        storage.save_conversation(thread)
        return count
