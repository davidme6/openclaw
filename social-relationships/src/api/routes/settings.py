"""模型配置接口"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ...data.storage import get_settings, save_settings

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsIn(BaseModel):
    role_model: str = ""
    jarvis_model: str = ""
    api_key: str = ""
    base_url: str = ""
    model_registry: list = []


@router.get("/")
def get():
    return get_settings()


@router.put("/")
def save(req: SettingsIn):
    save_settings(req.model_dump())
    return get_settings()


@router.get("/active")
def active():
    """Return the currently-active model names (used by frontend to display model tags)."""
    s = get_settings()
    return {
        "role_model": s.get("role_model", ""),
        "jarvis_model": s.get("jarvis_model", "") or s.get("role_model", ""),
    }
