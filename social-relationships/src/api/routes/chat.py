"""角色对话接口"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ...agents import AgentFactory
from ..deps import get_factory
from ...data import storage

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    branch_id: Optional[str] = None
    image_base64: Optional[str] = None


@router.post("/{role_id}")
def chat(role_id: str, req: ChatRequest, factory: AgentFactory = Depends(get_factory)):
    role = storage.get_role(role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    runtime = factory.get_runtime(role_id)
    reply = runtime.chat(req.message, branch_id=req.branch_id, image_base64=req.image_base64)
    return {"reply": reply, "role_id": role_id}


@router.get("/{role_id}/history")
def history(role_id: str, branch_id: Optional[str] = None):
    thread = storage.get_conversation(role_id, branch_id)
    if not thread:
        return {"messages": []}
    return {
        "messages": [
            {"role": m.role, "content": m.content,
             "timestamp": m.timestamp, "is_imported": m.is_imported}
            for m in thread.messages
        ]
    }
