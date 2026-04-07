"""推演引擎接口"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ...simulation import SimulationEngine
from ..deps import get_engine

router = APIRouter(prefix="/simulation", tags=["simulation"])


class CreateBranchRequest(BaseModel):
    name: str
    description: str


class ChatInBranchRequest(BaseModel):
    message: str


class MergeBranchRequest(BaseModel):
    actual_outcome: str


class CompareRequest(BaseModel):
    branch_ids: list[str]


@router.post("/{role_id}/branches")
def create_branch(role_id: str, req: CreateBranchRequest, engine: SimulationEngine = Depends(get_engine)):
    branch = engine.create_branch(role_id=role_id, name=req.name, description=req.description)
    return {"id": branch.id, "name": branch.name, "status": branch.status.value}


@router.get("/{role_id}/branches")
def list_branches(role_id: str, engine: SimulationEngine = Depends(get_engine)):
    branches = engine.list_branches(role_id)
    return [{"id": b.id, "name": b.name, "status": b.status.value,
             "description": b.description, "created_at": b.created_at} for b in branches]


@router.post("/branches/{branch_id}/chat/{role_id}")
def chat_in_branch(branch_id: str, role_id: str, req: ChatInBranchRequest,
                   engine: SimulationEngine = Depends(get_engine)):
    reply = engine.chat_in_branch(branch_id, role_id, req.message)
    return {"branch_id": branch_id, "reply": reply}


@router.post("/{role_id}/compare")
def compare_branches(role_id: str, req: CompareRequest, engine: SimulationEngine = Depends(get_engine)):
    analysis = engine.compare_branches(req.branch_ids, role_id)
    return {"analysis": analysis}


@router.post("/branches/{branch_id}/merge")
def merge_branch(branch_id: str, req: MergeBranchRequest, engine: SimulationEngine = Depends(get_engine)):
    engine.merge_branch(branch_id, req.actual_outcome)
    return {"status": "merged"}


@router.post("/branches/{branch_id}/abandon")
def abandon_branch(branch_id: str, engine: SimulationEngine = Depends(get_engine)):
    engine.abandon_branch(branch_id)
    return {"status": "abandoned"}
