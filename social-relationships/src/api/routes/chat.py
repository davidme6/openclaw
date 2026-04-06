"""对话接口 - REST + WebSocket 流式"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel
from typing import Optional
from ...agents import AgentFactory
from ..deps import get_factory

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    branch_id: Optional[str] = None  # None = 主线


class ChatResponse(BaseModel):
    role_id: str
    reply: str
    branch_id: Optional[str] = None


@router.post("/{role_id}")
def chat(role_id: str, req: ChatRequest, factory: AgentFactory = Depends(get_factory)):
    """REST 对话接口（一问一答）"""
    try:
        runtime = factory.get_runtime(role_id, branch_id=req.branch_id)
        reply = runtime.reply(req.message)
        return ChatResponse(role_id=role_id, reply=reply, branch_id=req.branch_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{role_id}/history")
def get_history(role_id: str, branch_id: Optional[str] = None, factory: AgentFactory = Depends(get_factory)):
    """获取对话历史"""
    from ...data import storage
    threads = storage.get_conversations_for_role(role_id, branch_id=branch_id)
    messages = []
    for t in threads:
        for m in t.messages:
            messages.append({
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp,
                "is_imported": m.is_imported,
            })
    return {"role_id": role_id, "branch_id": branch_id, "messages": messages}


@router.websocket("/{role_id}/ws")
async def chat_ws(role_id: str, websocket: WebSocket, factory: AgentFactory = Depends(get_factory)):
    """
    WebSocket 流式对话。
    客户端发: {"message": "...", "branch_id": null}
    服务端回: {"type": "chunk", "content": "..."} x N
              {"type": "done", "content": "完整回复"}
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            branch_id = data.get("branch_id")

            if not message:
                continue

            runtime = factory.get_runtime(role_id, branch_id=branch_id)
            # 当前用同步调用，后续可改为流式
            reply = runtime.reply(message)

            await websocket.send_json({"type": "done", "content": reply})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "content": str(e)})
