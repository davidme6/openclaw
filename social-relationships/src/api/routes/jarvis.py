"""Jarvis 分析接口"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ...agents import Jarvis
from ..deps import get_jarvis

router = APIRouter(prefix="/jarvis", tags=["jarvis"])


class AnalyzeRequest(BaseModel):
    question: str


class AnalyzeRoleRequest(BaseModel):
    question: str


@router.post("/analyze")
def analyze(req: AnalyzeRequest, jarvis: Jarvis = Depends(get_jarvis)):
    """Jarvis 综合分析所有关系"""
    result = jarvis.analyze(req.question)
    return {"analysis": result}


@router.post("/analyze/{role_id}")
def analyze_role(role_id: str, req: AnalyzeRoleRequest, jarvis: Jarvis = Depends(get_jarvis)):
    """Jarvis 针对某段关系的深度分析"""
    analysis = jarvis.analyze_role(role_id, req.question)
    return {
        "role_id": role_id,
        "analysis": analysis.content,
        "created_at": analysis.created_at,
    }


@router.post("/clear")
def clear_history(jarvis: Jarvis = Depends(get_jarvis)):
    """清空 Jarvis 对话历史"""
    jarvis.clear_history()
    return {"status": "cleared"}
