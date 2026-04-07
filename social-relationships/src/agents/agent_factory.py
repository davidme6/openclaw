"""
AgentFactory - manages creation and lifecycle of all role agents.
Each role gets its own completely isolated RoleAgentRuntime instance.
"""

from typing import Optional
from ..data.schemas import RoleAgent, RelationshipType, RelationshipStatus, PersonalityModel
from ..data import storage
from .role_agent import RoleAgentRuntime


class AgentFactory:
    """
    创建和管理所有角色Agent实例。
    每个角色完全隔离，通过 role_id 索引。
    """

    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self._active: dict[str, RoleAgentRuntime] = {}  # role_id → runtime

    def create_role(self, name: str, relationship_type: RelationshipType, **kwargs) -> RoleAgent:
        """创建并保存一个新角色"""
        role = RoleAgent(
            name=name,
            relationship_type=relationship_type,
            personality=kwargs.pop("personality", PersonalityModel()),
            **kwargs
        )
        storage.save_role(role)
        return role

    def get_runtime(self, role_id: str, branch_id: Optional[str] = None) -> RoleAgentRuntime:
        """
        获取角色的运行时实例。
        同一 role_id 在主线上复用同一个 runtime（保持对话连续性）。
        推演分支用不同 branch_id 隔离。
        """
        cache_key = f"{role_id}:{branch_id or 'main'}"
        if cache_key not in self._active:
            role = storage.get_role(role_id)
            if not role:
                raise ValueError(f"Role {role_id} not found")
            self._active[cache_key] = RoleAgentRuntime(
                role=role,
                branch_id=branch_id,
                model=self.model,
                api_key=self.api_key,
                base_url=self.base_url,
            )
        return self._active[cache_key]

    def list_roles(self) -> list[RoleAgent]:
        """列出所有角色"""
        return storage.list_roles()

    def delete_role(self, role_id: str):
        """删除角色及其所有运行时实例"""
        storage.delete_role(role_id)
        keys_to_remove = [k for k in self._active if k.startswith(role_id)]
        for k in keys_to_remove:
            del self._active[k]
