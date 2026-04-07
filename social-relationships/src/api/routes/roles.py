"""角色管理接口"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ...data.schemas import RelationshipType, RelationshipStatus, PersonalityModel
from ...agents import AgentFactory
from ..deps import get_factory

router = APIRouter(prefix="/roles", tags=["roles"])


class PersonalityIn(BaseModel):
    mbti: Optional[str] = None
    speaking_style: str = ""
    values: list[str] = []
    habits: list[str] = []
    triggers: list[str] = []
    love_language: Optional[str] = None
    background: str = ""


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


class ImportHistoryRequest(BaseModel):
    messages: list[dict]  # [{"role": "user"/"agent", "content": "..."}]


@router.post("/")
def create_role(req: CreateRoleRequest, factory: AgentFactory = Depends(get_factory)):
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
    )
    return {"id": role.id, "name": role.name, "relationship_type": role.relationship_type.value}


@router.get("/")
def list_roles(factory: AgentFactory = Depends(get_factory)):
    roles = factory.list_roles()
    return [{"id": r.id, "name": r.name, "relationship_type": r.relationship_type.value,
             "relationship_status": r.relationship_status.value} for r in roles]


@router.get("/{role_id}")
def get_role(role_id: str, factory: AgentFactory = Depends(get_factory)):
    from ...data import storage
    role = storage.get_role(role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    return {"id": role.id, "name": role.name, "relationship_type": role.relationship_type.value,
            "bio": role.bio, "personality": role.personality.__dict__}


@router.delete("/{role_id}")
def delete_role(role_id: str, factory: AgentFactory = Depends(get_factory)):
    factory.delete_role(role_id)
    return {"status": "deleted"}


@router.post("/{role_id}/import-history")
def import_history(role_id: str, req: ImportHistoryRequest, factory: AgentFactory = Depends(get_factory)):
    runtime = factory.get_runtime(role_id)
    count = runtime.import_history(req.messages)
    return {"imported": count}
