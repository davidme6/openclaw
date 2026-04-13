"""
Jarvis — global analyst and role-focused chat assistant.
Three modes:
  1. analyze(question)           — cross-role analysis (no history)
  2. chat(message, history)      — daily assistant with full world access
  3. chat_with_role(role_id, ...) — role-focused chat (per-role memory, separate)
"""

from typing import Optional
from ..data import storage
from . import llm_client as lc


class Jarvis:
    def __init__(self, model: str = "", api_key: str = "", base_url: str = ""):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url

    def _resolve(self):
        if not self.model or not self.api_key:
            s = storage.get_settings()
            self.model = self.model or s.get("jarvis_model", "") or s.get("role_model", "")
            self.api_key = self.api_key or s.get("api_key", "")
            self.base_url = self.base_url or s.get("base_url", "")

    def _client(self):
        self._resolve()
        return lc.get_client(self.api_key, self.base_url)

    def _build_world_context(self) -> str:
        """Build a compact summary of all roles for the system prompt."""
        roles = storage.list_roles()
        if not roles:
            return "（当前平行世界中暂无角色）"

        # Build full hierarchy context
        role_map = {r.id: r for r in roles}
        lines = []

        def get_ancestors(role) -> list:
            chain = []
            cur = role
            visited = set()
            while cur.parent_role_id and cur.parent_role_id not in visited:
                visited.add(cur.id)
                parent = role_map.get(cur.parent_role_id)
                if not parent:
                    break
                chain.append(parent.name)
                cur = parent
            return list(reversed(chain))

        for r in roles:
            ancestors = get_ancestors(r)
            path = " → ".join(ancestors + [r.name]) if ancestors else r.name
            depth_note = f"（第{len(ancestors)+1}层）" if ancestors else "（直接关系）"
            connected = "已直连用户" if r.connected_to_user else "间接关系"

            # Cross-role connections
            cross = []
            for rel in r.role_relationships:
                tid = rel.target_role_id
                if tid != "user":
                    target = role_map.get(tid)
                    if target:
                        line_type = "虚线" if rel.dashed else "实线"
                        cross.append(f"{target.name}({line_type})")

            line = (
                f"- {path} | {r.relationship_type.value} | {r.relationship_status.value}"
                f" | {depth_note} | {connected}"
            )
            if cross:
                line += f" | 横向关联: {', '.join(cross)}"
            if r.bio:
                line += f"\n  简介: {r.bio[:80]}"
            lines.append(line)

        return "\n".join(lines)

    # ── 全局分析 ───────────────────────────────────────────────────────────────

    def analyze(self, question: str) -> "RelationshipAnalysis":
        from ..data.schemas import RelationshipAnalysis
        self._resolve()
        world = self._build_world_context()
        system = f"""你是 Jarvis，用户的平行世界社会关系分析师。
你只分析，不扮演任何角色。用客观、专业的视角给出洞察和建议。

## 当前平行世界中的所有关系（支持无限层级）
{world}
"""
        reply = lc.chat(self._client(), self.model, [
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ], max_tokens=1500)
        return RelationshipAnalysis(content=reply, analysis_type="global")

    def analyze_role(self, role_id: str, question: str) -> "RelationshipAnalysis":
        from ..data.schemas import RelationshipAnalysis
        self._resolve()
        role = storage.get_role(role_id)
        if not role:
            raise ValueError(f"Role {role_id} not found")

        role_map = {r.id: r for r in storage.list_roles()}
        world = self._build_world_context()

        # Build this role's full chain context
        chain = [role.name]
        cur = role
        visited = set()
        while cur.parent_role_id and cur.parent_role_id not in visited:
            visited.add(cur.id)
            parent = role_map.get(cur.parent_role_id)
            if not parent:
                break
            chain.insert(0, parent.name)
            cur = parent

        system = f"""你是 Jarvis，专注分析用户与 {role.name} 的关系。

## {role.name} 的档案
{role.to_system_prompt()}

## 关系链路
{' → '.join(chain)} → 你

## 平行世界全局背景
{world}
"""
        reply = lc.chat(self._client(), self.model, [
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ], max_tokens=1500)
        return RelationshipAnalysis(content=reply, role_agent_id=role_id, analysis_type="role")

    # ── 日常对话 ───────────────────────────────────────────────────────────────

    def chat(
        self,
        message: str,
        history: list[dict],
        image_base64: Optional[str] = None,
        focus_role_id: Optional[str] = None,
    ) -> str:
        self._resolve()
        world = self._build_world_context()
        system = f"""你是 Jarvis，用户的平行世界私人助手，拥有对所有角色档案的完整访问权限。
你可以帮助分析关系、给出沟通建议、提醒重要事项。
你是助手，不扮演任何角色。

## 当前平行世界关系网络（无限层级）
{world}
"""
        messages = [{"role": "system", "content": system}]
        for h in history[-30:]:
            messages.append({"role": h["role"], "content": h["content"]})

        if image_base64:
            content = [
                {"type": "text", "text": message or "请分析这张图片"},
                {"type": "image_url", "image_url": {"url": image_base64}},
            ]
        else:
            content = message
        messages.append({"role": "user", "content": content})

        return lc.chat(self._client(), self.model, messages, max_tokens=2048)

    # ── 角色辅助对话 ───────────────────────────────────────────────────────────

    def chat_with_role(
        self,
        role_id: str,
        message: str,
        history: list[dict],
        image_base64: Optional[str] = None,
    ) -> str:
        self._resolve()
        role = storage.get_role(role_id)
        if not role:
            raise ValueError(f"Role {role_id} not found")

        role_map = {r.id: r for r in storage.list_roles()}

        # Build full ancestor chain
        chain = [role.name]
        cur = role
        visited = set()
        while cur.parent_role_id and cur.parent_role_id not in visited:
            visited.add(cur.id)
            parent = role_map.get(cur.parent_role_id)
            if not parent:
                break
            chain.insert(0, parent.name)
            cur = parent

        # Build cross-role connection context
        cross_lines = []
        for rel in role.role_relationships:
            tid = rel.target_role_id
            if tid == "user":
                cross_lines.append(f"  → 用户（{'间接' if rel.dashed else '直接'}关系）: {rel.label}")
            else:
                target = role_map.get(tid)
                if target:
                    cross_lines.append(f"  → {target.name}（{'间接' if rel.dashed else '直接'}关系）: {rel.label}")

        # Recent conversation history with this role
        thread = storage.get_conversation(role_id)
        recent_msgs = thread.messages[-20:] if thread else []
        history_text = "\n".join(
            f"[{'用户' if m.role == 'user' else role.name}]: {m.content[:200]}"
            for m in recent_msgs
        ) if recent_msgs else "（暂无历史记录）"

        system = f"""你是 Jarvis，正在帮助用户分析与 {role.name} 的关系。
你是客观的分析师，不扮演 {role.name}，而是帮助用户理解和处理这段关系。

## {role.name} 完整档案
{role.to_system_prompt()}

## 在关系网中的位置（层级路径）
{' → '.join(chain)} → 你（共{len(chain)}层）
{'直接与你相连' if role.connected_to_user else '通过他人间接相连'}

## {role.name} 的横向关联
{chr(10).join(cross_lines) if cross_lines else '（无额外横向关联）'}

## 与 {role.name} 的近期对话记录
{history_text}
"""
        messages = [{"role": "system", "content": system}]
        for h in history[-20:]:
            messages.append({"role": h["role"], "content": h["content"]})

        if image_base64:
            content = [
                {"type": "text", "text": message or "请分析这张图片"},
                {"type": "image_url", "image_url": {"url": image_base64}},
            ]
        else:
            content = message
        messages.append({"role": "user", "content": content})

        return lc.chat(self._client(), self.model, messages, max_tokens=2048)

    # ── Memory injection ───────────────────────────────────────────────────────

    def inject_memory(self, role_id: str, messages: list[dict]) -> int:
        from ..data.schemas import ConversationThread, Message
        thread = storage.get_conversation(role_id) or ConversationThread(role_agent_id=role_id)
        count = 0
        for m in messages:
            thread.messages.append(Message(
                role=m.get("role", "user"),
                content=m.get("content", ""),
                is_imported=True,
            ))
            count += 1
        storage.save_conversation(thread)
        return count
