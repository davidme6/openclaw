"""用户自身档案与记忆管理（最高权限层）"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from ...data import storage

router = APIRouter(prefix="/user", tags=["user"])


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    birthday: Optional[str] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    personality: Optional[dict] = None
    agent_model: Optional[str] = None
    agent_system_prompt: Optional[str] = None
    virtual_me_role_id: Optional[str] = None


class AddMemoryRequest(BaseModel):
    content: str
    memory_type: str = "core"   # "core" | "parallel"
    source: str = "self"        # "self" | "jarvis"
    tags: List[str] = []


@router.get("/profile")
def get_profile():
    """获取用户自身档案"""
    return storage.get_user_profile()


@router.put("/profile")
def update_profile(req: UpdateProfileRequest):
    """更新用户自身档案（部分更新）"""
    profile = storage.get_user_profile()
    if req.name is not None:
        profile["name"] = req.name
    if req.bio is not None:
        profile["bio"] = req.bio
    if req.birthday is not None:
        profile["birthday"] = req.birthday
    if req.occupation is not None:
        profile["occupation"] = req.occupation
    if req.location is not None:
        profile["location"] = req.location
    if req.personality is not None:
        profile["personality"] = req.personality
    if req.agent_model is not None:
        profile["agent_model"] = req.agent_model
    if req.agent_system_prompt is not None:
        profile["agent_system_prompt"] = req.agent_system_prompt
    if req.virtual_me_role_id is not None:
        profile["virtual_me_role_id"] = req.virtual_me_role_id
    storage.save_user_profile(profile)
    return profile


@router.get("/memories")
def list_memories(type: Optional[str] = None):
    """获取记忆列表，可按 type=core/parallel 过滤"""
    return {"memories": storage.list_user_memories(type)}


@router.post("/memories")
def add_memory(req: AddMemoryRequest):
    """添加用户记忆（核心或平行）"""
    if req.memory_type not in ("core", "parallel"):
        raise HTTPException(400, "memory_type 必须为 'core' 或 'parallel'")
    if req.source not in ("self", "jarvis"):
        raise HTTPException(400, "source 必须为 'self' 或 'jarvis'")
    if not req.content.strip():
        raise HTTPException(400, "记忆内容不能为空")
    memory = storage.add_user_memory(req.content.strip(), req.memory_type, req.source)
    return memory


@router.delete("/memories/{memory_id}")
def delete_memory(memory_id: str):
    """删除用户记忆（用户拥有最高权限）"""
    deleted = storage.delete_user_memory(memory_id)
    if not deleted:
        raise HTTPException(404, "记忆条目不存在")
    return {"status": "deleted", "id": memory_id}
