"""
Social Relationships API
Run: uvicorn src.api.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import roles, chat, simulation, jarvis, settings, user

app = FastAPI(
    title="Social Relationships API",
    description="平行世界社会关系系统 — 支持无限层级关系网络",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roles.router)
app.include_router(chat.router)
app.include_router(simulation.router)
app.include_router(jarvis.router)
app.include_router(settings.router)
app.include_router(user.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
