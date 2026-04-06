"""
Social Relationships API - FastAPI main entry point.
Run: uvicorn src.api.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import roles, chat, simulation, jarvis

app = FastAPI(
    title="Social Relationships API",
    description="平行世界社会关系系统后端 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境改为前端域名
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roles.router)
app.include_router(chat.router)
app.include_router(simulation.router)
app.include_router(jarvis.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
