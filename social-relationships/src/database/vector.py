"""
ChromaDB layer - vector memory for semantic retrieval.
Each role gets its own isolated collection.
"""

import os
import chromadb
from chromadb.config import Settings
from ..data.schemas import Message

CHROMA_PATH = os.environ.get("CHROMA_PATH", "./data/chroma")


def get_client() -> chromadb.Client:
    return chromadb.PersistentClient(path=CHROMA_PATH)


def _collection_name(role_id: str) -> str:
    """每个角色独立的向量集合"""
    return f"role_{role_id.replace('-', '_')}"


def store_message(role_id: str, message: Message):
    """将一条消息向量化存储"""
    client = get_client()
    col = client.get_or_create_collection(_collection_name(role_id))
    col.add(
        ids=[message.id],
        documents=[message.content],
        metadatas=[{
            "role": message.role,
            "timestamp": message.timestamp,
            "is_imported": str(message.is_imported),
        }]
    )


def store_messages_bulk(role_id: str, messages: list[Message]):
    """批量存储消息（导入历史记录时用）"""
    if not messages:
        return
    client = get_client()
    col = client.get_or_create_collection(_collection_name(role_id))
    col.add(
        ids=[m.id for m in messages],
        documents=[m.content for m in messages],
        metadatas=[{
            "role": m.role,
            "timestamp": m.timestamp,
            "is_imported": str(m.is_imported),
        } for m in messages]
    )


def search_memory(role_id: str, query: str, n_results: int = 5) -> list[dict]:
    """
    语义检索：找出与 query 最相关的历史消息。
    用于给 Agent 注入相关记忆而不是全量历史。
    """
    client = get_client()
    col = client.get_or_create_collection(_collection_name(role_id))
    if col.count() == 0:
        return []
    results = col.query(query_texts=[query], n_results=min(n_results, col.count()))
    memories = []
    for i, doc in enumerate(results["documents"][0]):
        memories.append({
            "content": doc,
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })
    return memories


def delete_role_memory(role_id: str):
    """删除角色的所有向量记忆"""
    client = get_client()
    try:
        client.delete_collection(_collection_name(role_id))
    except Exception:
        pass
