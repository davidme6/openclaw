"""Jarvis 分析与对话接口"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from ...agents import Jarvis
from ..deps import get_jarvis
from ...data import storage

router = APIRouter(prefix="/jarvis", tags=["jarvis"])


class AnalyzeRequest(BaseModel):
    question: str


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    image_base64: Optional[str] = None
    focus_role_id: Optional[str] = None   # kept for forward compat, daily chat ignores it


class InjectMemoryRequest(BaseModel):
    messages: list[dict]


class PatchRoleRequest(BaseModel):
    updates: dict


@router.post("/analyze")
def analyze(req: AnalyzeRequest, jarvis: Jarvis = Depends(get_jarvis)):
    result = jarvis.analyze(req.question)
    return {"analysis": result.content}


@router.post("/analyze/{role_id}")
def analyze_role(role_id: str, req: AnalyzeRequest, jarvis: Jarvis = Depends(get_jarvis)):
    try:
        result = jarvis.analyze_role(role_id, req.question)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {"role_id": role_id, "analysis": result.content}


@router.post("/chat")
def chat(req: ChatRequest, jarvis: Jarvis = Depends(get_jarvis)):
    """日常对话 — Jarvis 作为全局助手，不绑定角色"""
    reply = jarvis.chat(
        req.message,
        req.history,
        image_base64=req.image_base64,
    )
    return {"reply": reply}


@router.post("/chat/{role_id}")
def chat_with_role(role_id: str, req: ChatRequest, jarvis: Jarvis = Depends(get_jarvis)):
    """角色辅助对话 — Jarvis 聚焦分析指定角色"""
    try:
        reply = jarvis.chat_with_role(
            role_id, req.message, req.history,
            image_base64=req.image_base64,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {"reply": reply, "role_id": role_id}


@router.post("/roles/{role_id}/memory")
def inject_memory(role_id: str, req: InjectMemoryRequest, jarvis: Jarvis = Depends(get_jarvis)):
    count = jarvis.inject_memory(role_id, req.messages)
    return {"injected": count}


@router.patch("/roles/{role_id}")
def patch_role(role_id: str, req: PatchRoleRequest):
    """Partial update of role fields (used by Jarvis to update role profile)."""
    role = storage.get_role(role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    from ...data.schemas import RoleRelationship
    for k, v in req.updates.items():
        if k == "personality" and isinstance(v, dict):
            for pk, pv in v.items():
                if hasattr(role.personality, pk):
                    setattr(role.personality, pk, pv)
        elif k == "role_relationships" and isinstance(v, list):
            role.role_relationships = [
                RoleRelationship(**r) if isinstance(r, dict) else r for r in v
            ]
        elif hasattr(role, k):
            setattr(role, k, v)
    storage.save_role(role)
    return {"status": "updated"}
