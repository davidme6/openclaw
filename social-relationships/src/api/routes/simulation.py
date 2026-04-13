"""推演分支接口"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ...simulation import SimulationEngine
from ..deps import get_engine

router = APIRouter(prefix="/simulation", tags=["simulation"])


class CreateBranchRequest(BaseModel):
    name: str
    description: str


class BranchChatRequest(BaseModel):
    message: str


class MergeRequest(BaseModel):
    actual_outcome: str


class CompareRequest(BaseModel):
    branch_ids: list[str]


def _branch_dict(b) -> dict:
    return {
        "id": b.id,
        "role_agent_id": b.role_agent_id,
        "name": b.name,
        "description": b.description,
        "status": b.status.value,
        "predicted_outcome": b.predicted_outcome,
        "actual_outcome": b.actual_outcome,
        "created_at": b.created_at,
    }


@router.post("/{role_id}/branches")
def create_branch(role_id: str, req: CreateBranchRequest, engine: SimulationEngine = Depends(get_engine)):
    branch = engine.create_branch(role_id, req.name, req.description)
    return _branch_dict(branch)


@router.get("/{role_id}/branches")
def list_branches(role_id: str, engine: SimulationEngine = Depends(get_engine)):
    branches = engine.list_branches(role_id)
    return [_branch_dict(b) for b in branches]


@router.post("/branches/{branch_id}/chat/{role_id}")
def chat_in_branch(branch_id: str, role_id: str, req: BranchChatRequest,
                   engine: SimulationEngine = Depends(get_engine)):
    reply = engine.chat_in_branch(branch_id, role_id, req.message)
    return {"reply": reply, "branch_id": branch_id}


@router.post("/branches/{branch_id}/merge")
def merge_branch(branch_id: str, req: MergeRequest, engine: SimulationEngine = Depends(get_engine)):
    branch = engine.merge_branch(branch_id, req.actual_outcome)
    return _branch_dict(branch)


@router.post("/branches/{branch_id}/abandon")
def abandon_branch(branch_id: str, engine: SimulationEngine = Depends(get_engine)):
    branch = engine.abandon_branch(branch_id)
    return _branch_dict(branch)


@router.post("/{role_id}/compare")
def compare_branches(role_id: str, req: CompareRequest, engine: SimulationEngine = Depends(get_engine)):
    result = engine.compare_branches(role_id, req.branch_ids)
    return {"comparison": result}
