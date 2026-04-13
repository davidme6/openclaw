"""AgentFactory — creates, retrieves and manages RoleAgentRuntimes."""

from typing import Optional
from ..data import storage
from ..data.schemas import RoleAgent, PersonalityModel, RelationshipType, RelationshipStatus
from .role_agent import RoleAgentRuntime


class AgentFactory:
    def __init__(self, model: str = "", api_key: str = "", base_url: str = ""):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self._runtimes: dict[str, RoleAgentRuntime] = {}

    def _resolve(self):
        """Read settings from disk if not provided at construction."""
        from ..data.storage import get_settings
        if not self.model or not self.api_key:
            s = get_settings()
            self.model = self.model or s.get("role_model", "")
            self.api_key = self.api_key or s.get("api_key", "")
            self.base_url = self.base_url or s.get("base_url", "")

    def create_role(
        self,
        name: str,
        relationship_type: RelationshipType,
        relationship_status: RelationshipStatus = RelationshipStatus.ACTIVE,
        parent_role_id: Optional[str] = None,
        connected_to_user: bool = True,
        role_relationships: Optional[list] = None,
        **kwargs,
    ) -> RoleAgent:
        role = RoleAgent(
            name=name,
            relationship_type=relationship_type,
            relationship_status=relationship_status,
            parent_role_id=parent_role_id,
            connected_to_user=connected_to_user,
            role_relationships=role_relationships or [],
            **kwargs,
        )
        storage.save_role(role)
        return role

    def update_role(self, role_id: str, updates: dict) -> RoleAgent:
        role = storage.get_role(role_id)
        if not role:
            raise ValueError(f"Role {role_id} not found")
        for k, v in updates.items():
            if k == "personality" and isinstance(v, dict):
                for pk, pv in v.items():
                    setattr(role.personality, pk, pv)
            elif k == "role_relationships":
                from ..data.schemas import RoleRelationship
                role.role_relationships = [
                    RoleRelationship(**r) if isinstance(r, dict) else r for r in v
                ]
            elif hasattr(role, k):
                setattr(role, k, v)
        storage.save_role(role)
        return role

    def get_runtime(self, role_id: str) -> RoleAgentRuntime:
        self._resolve()
        if role_id not in self._runtimes:
            role = storage.get_role(role_id)
            if not role:
                raise ValueError(f"Role {role_id} not found")
            self._runtimes[role_id] = RoleAgentRuntime(
                role=role, model=self.model,
                api_key=self.api_key, base_url=self.base_url,
            )
        else:
            # Refresh role data in case it was updated
            role = storage.get_role(role_id)
            if role:
                self._runtimes[role_id].role = role
        return self._runtimes[role_id]

    def list_roles(self) -> list:
        return storage.list_roles()

    def delete_role(self, role_id: str):
        self._runtimes.pop(role_id, None)
        storage.delete_role(role_id)
        storage.delete_conversations_for_role(role_id)
