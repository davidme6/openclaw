"""角色管理 — 支持无限层级嵌套 + 任意节点间关系连线"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ...data.schemas import RelationshipType, RelationshipStatus, PersonalityModel, RoleRelationship
from ...agents import AgentFactory
from ..deps import get_factory
from ...data import storage

router = APIRouter(prefix="/roles", tags=["roles"])

# ── 安全上限（防止滥用）──────────────────────────────────────────────────────
MAX_ROLES = 500   # 单用户最多角色数
MAX_DEPTH = 10    # 层级最大深度（开源版够用；商业版可按订阅级别调整）


class PersonalityIn(BaseModel):
    mbti: Optional[str] = None
    speaking_style: str = ""
    values: list[str] = []
    habits: list[str] = []
    triggers: list[str] = []
    love_language: Optional[str] = None
    background: str = ""


class RoleRelationshipIn(BaseModel):
    target_role_id: str
    label: str = ""
    dashed: bool = False
    curve: float = 0.0


class CreateRoleRequest(BaseModel):
    name: str
    relationship_type: RelationshipType
    relationship_status: RelationshipStatus = RelationshipStatus.ACTIVE
    age: Optional[int] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    bio: str = ""
    personality: PersonalityIn = PersonalityIn()
    key_events: list[str] = []
    relationship_started: Optional[str] = None
    # Hierarchy
    parent_role_id: Optional[str] = None
    connected_to_user: bool = True
    role_relationships: list[RoleRelationshipIn] = []


class UpdateRoleRequest(BaseModel):
    name: Optional[str] = None
    relationship_type: Optional[RelationshipType] = None
    relationship_status: Optional[RelationshipStatus] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    personality: Optional[PersonalityIn] = None
    key_events: Optional[list[str]] = None
    relationship_started: Optional[str] = None
    parent_role_id: Optional[str] = None
    connected_to_user: Optional[bool] = None
    role_relationships: Optional[list[RoleRelationshipIn]] = None


class ImportHistoryRequest(BaseModel):
    messages: list[dict]


def _role_to_dict(role) -> dict:
    rels = [
        {"target_role_id": r.target_role_id, "label": r.label, "dashed": r.dashed, "curve": r.curve}
        for r in (role.role_relationships or [])
    ]
    return {
        "id": role.id,
        "name": role.name,
        "relationship_type": role.relationship_type.value,
        "relationship_status": role.relationship_status.value,
        "age": role.age,
        "occupation": role.occupation,
        "location": role.location,
        "bio": role.bio,
        "personality": {
            "mbti": role.personality.mbti,
            "speaking_style": role.personality.speaking_style,
            "values": role.personality.values,
            "habits": role.personality.habits,
            "triggers": role.personality.triggers,
            "love_language": role.personality.love_language,
            "background": role.personality.background,
        },
        "key_events": role.key_events,
        "relationship_started": role.relationship_started,
        "parent_role_id": role.parent_role_id,
        "connected_to_user": role.connected_to_user,
        "role_relationships": rels,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


@router.post("/")
def create_role(req: CreateRoleRequest, factory: AgentFactory = Depends(get_factory)):
    # ── 安全检查 ────────────────────────────────────────────────────────────
    existing = storage.list_roles()
    if len(existing) >= MAX_ROLES:
        raise HTTPException(
            status_code=429,
            detail=f"角色数量已达上限（{MAX_ROLES} 个），请先删除不需要的角色",
        )

    if req.parent_role_id:
        all_roles_dict = {r.id: r for r in existing}
        parent = all_roles_dict.get(req.parent_role_id)
        if not parent:
            raise HTTPException(status_code=404, detail="指定的父角色不存在")
        current_depth = parent.get_depth(all_roles_dict) + 1
        if current_depth >= MAX_DEPTH:
            raise HTTPException(
                status_code=400,
                detail=f"层级深度已达上限（{MAX_DEPTH} 层），无法继续嵌套",
            )

    role = factory.create_role(
        name=req.name,
        relationship_type=req.relationship_type,
        relationship_status=req.relationship_status,
        age=req.age,
        occupation=req.occupation,
        location=req.location,
        bio=req.bio,
        personality=PersonalityModel(**req.personality.model_dump()),
        key_events=req.key_events,
        relationship_started=req.relationship_started,
        parent_role_id=req.parent_role_id,
        connected_to_user=req.connected_to_user,
        role_relationships=[
            RoleRelationship(**r.model_dump()) for r in req.role_relationships
        ],
    )
    return _role_to_dict(role)


@router.get("/")
def list_roles(factory: AgentFactory = Depends(get_factory)):
    roles = factory.list_roles()
    return [_role_to_dict(r) for r in roles]


@router.get("/{role_id}")
def get_role(role_id: str):
    role = storage.get_role(role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    return _role_to_dict(role)


@router.put("/{role_id}")
def update_role(role_id: str, req: UpdateRoleRequest, factory: AgentFactory = Depends(get_factory)):
    role = storage.get_role(role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    updates = req.model_dump(exclude_none=True)
    if "personality" in updates:
        updates["personality"] = updates["personality"]
    if "role_relationships" in updates:
        updates["role_relationships"] = [
            RoleRelationship(**r) if isinstance(r, dict) else r
            for r in updates["role_relationships"]
        ]
    updated = factory.update_role(role_id, updates)
    return _role_to_dict(updated)


@router.delete("/{role_id}")
def delete_role(role_id: str, factory: AgentFactory = Depends(get_factory)):
    factory.delete_role(role_id)
    return {"status": "deleted"}


@router.post("/{role_id}/import-history")
def import_history(role_id: str, req: ImportHistoryRequest, factory: AgentFactory = Depends(get_factory)):
    runtime = factory.get_runtime(role_id)
    count = runtime.import_history(req.messages)
    return {"imported": count}


@router.get("/{role_id}/special-dates")
def special_dates(role_id: str):
    """Return key events / dates for the role (frontend uses this for reminders)."""
    role = storage.get_role(role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    return {"key_events": role.key_events, "relationship_started": role.relationship_started}
