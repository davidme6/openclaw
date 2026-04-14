"""
JSON storage layer — handles unlimited-depth roles and any-to-any relationships.
"""

import json
import os
from dataclasses import asdict
from typing import Optional
from datetime import datetime

from .schemas import (
    RoleAgent, PersonalityModel, RoleRelationship,
    RelationshipType, RelationshipStatus,
    ConversationThread, SimulationBranch, Message, BranchStatus,
    ModelSettings, UserMemory, MemoryType, MemorySource, JarvisSkill,
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
ROLES_FILE = os.path.join(DATA_DIR, "roles", "roles.json")
CONVERSATIONS_FILE = os.path.join(DATA_DIR, "conversations", "conversations.json")
BRANCHES_FILE = os.path.join(DATA_DIR, "timelines", "branches.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
USER_FILE = os.path.join(DATA_DIR, "user", "profile.json")
JARVIS_FILE = os.path.join(DATA_DIR, "jarvis", "jarvis.json")


def _ensure_dirs():
    os.makedirs(os.path.join(DATA_DIR, "roles"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "conversations"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "timelines"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "user"), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "jarvis"), exist_ok=True)


def _read_json(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: str, data):
    _ensure_dirs()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ─── RoleAgent ────────────────────────────────────────────────────────────────

def save_role(role: RoleAgent):
    data = _read_json(ROLES_FILE)
    role.updated_at = datetime.utcnow().isoformat()
    d = asdict(role)
    # Serialize enums to values
    d["relationship_type"] = role.relationship_type.value
    d["relationship_status"] = role.relationship_status.value
    data[role.id] = d
    _write_json(ROLES_FILE, data)


def get_role(role_id: str) -> Optional[RoleAgent]:
    data = _read_json(ROLES_FILE)
    if role_id not in data:
        return None
    return _dict_to_role(data[role_id])


def list_roles() -> list:
    data = _read_json(ROLES_FILE)
    return [_dict_to_role(v) for v in data.values()]


def delete_role(role_id: str):
    data = _read_json(ROLES_FILE)
    data.pop(role_id, None)
    _write_json(ROLES_FILE, data)

    # Also clean up role_relationships pointing to deleted role across all roles
    for rid, rd in data.items():
        rels = rd.get("role_relationships", [])
        rd["role_relationships"] = [r for r in rels if r.get("target_role_id") != role_id]
    _write_json(ROLES_FILE, data)

    # Orphan children: clear their parent_role_id
    for rid, rd in data.items():
        if rd.get("parent_role_id") == role_id:
            rd["parent_role_id"] = None
    _write_json(ROLES_FILE, data)


def _dict_to_role(d: dict) -> RoleAgent:
    d = dict(d)
    personality_dict = d.pop("personality", {})
    if isinstance(personality_dict, dict):
        personality = PersonalityModel(**{
            k: v for k, v in personality_dict.items()
            if k in PersonalityModel.__dataclass_fields__
        })
    else:
        personality = PersonalityModel()

    # Deserialize role_relationships
    raw_rels = d.pop("role_relationships", [])
    role_relationships = []
    for r in raw_rels:
        if isinstance(r, dict):
            role_relationships.append(RoleRelationship(
                target_role_id=r.get("target_role_id", ""),
                label=r.get("label", ""),
                dashed=r.get("dashed", False),
                curve=r.get("curve", 0.0),
            ))

    # Enum conversion
    try:
        d["relationship_type"] = RelationshipType(d["relationship_type"])
    except (ValueError, KeyError):
        d["relationship_type"] = RelationshipType.OTHER
    try:
        d["relationship_status"] = RelationshipStatus(d["relationship_status"])
    except (ValueError, KeyError):
        d["relationship_status"] = RelationshipStatus.ACTIVE

    # Only pass known fields (handles new fields like core_memories / parallel_memories gracefully)
    known = set(RoleAgent.__dataclass_fields__.keys()) - {"personality", "role_relationships"}
    filtered = {k: v for k, v in d.items() if k in known}
    return RoleAgent(**filtered, personality=personality, role_relationships=role_relationships)


# ─── Role Memory ──────────────────────────────────────────────────────────────

def _make_memory_entry(content: str, source: str = "self") -> dict:
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "content": content,
        "source": source,   # "self" | "jarvis"
        "created_at": datetime.utcnow().isoformat(),
    }


def add_role_memory(role_id: str, content: str, memory_type: str, source: str = "self") -> Optional[dict]:
    """Add a core or parallel memory entry to a role. Returns the new entry or None if role not found."""
    data = _read_json(ROLES_FILE)
    if role_id not in data:
        return None
    entry = _make_memory_entry(content, source)
    field = "core_memories" if memory_type == "core" else "parallel_memories"
    data[role_id].setdefault(field, []).append(entry)
    data[role_id]["updated_at"] = datetime.utcnow().isoformat()
    _write_json(ROLES_FILE, data)
    return entry


def delete_role_memory(role_id: str, memory_id: str) -> bool:
    """Delete a memory entry (core or parallel) from a role. Returns True if deleted."""
    data = _read_json(ROLES_FILE)
    if role_id not in data:
        return False
    changed = False
    for field in ("core_memories", "parallel_memories"):
        mems = data[role_id].get(field, [])
        new_mems = [m for m in mems if m.get("id") != memory_id]
        if len(new_mems) != len(mems):
            data[role_id][field] = new_mems
            data[role_id]["updated_at"] = datetime.utcnow().isoformat()
            changed = True
    if changed:
        _write_json(ROLES_FILE, data)
    return changed


# ─── ConversationThread ───────────────────────────────────────────────────────

def save_conversation(thread: ConversationThread):
    data = _read_json(CONVERSATIONS_FILE)
    thread.updated_at = datetime.utcnow().isoformat()
    key = f"{thread.role_agent_id}:{thread.branch_id or 'main'}"
    data[key] = {
        "id": thread.id,
        "role_agent_id": thread.role_agent_id,
        "branch_id": thread.branch_id,
        "messages": [asdict(m) for m in thread.messages],
        "created_at": thread.created_at,
        "updated_at": thread.updated_at,
    }
    _write_json(CONVERSATIONS_FILE, data)


def get_conversation(role_agent_id: str, branch_id: Optional[str] = None) -> Optional[ConversationThread]:
    data = _read_json(CONVERSATIONS_FILE)
    key = f"{role_agent_id}:{branch_id or 'main'}"
    if key not in data:
        return None
    d = data[key]
    msgs = [Message(**m) for m in d.get("messages", [])]
    return ConversationThread(
        id=d["id"], role_agent_id=d["role_agent_id"],
        branch_id=d.get("branch_id"),
        messages=msgs,
        created_at=d["created_at"], updated_at=d["updated_at"],
    )


def delete_conversations_for_role(role_id: str):
    data = _read_json(CONVERSATIONS_FILE)
    keys_to_del = [k for k in data if k.startswith(f"{role_id}:")]
    for k in keys_to_del:
        del data[k]
    _write_json(CONVERSATIONS_FILE, data)


# ─── SimulationBranch ─────────────────────────────────────────────────────────

def save_branch(branch: SimulationBranch):
    data = _read_json(BRANCHES_FILE)
    d = asdict(branch)
    d["status"] = branch.status.value
    data[branch.id] = d
    _write_json(BRANCHES_FILE, data)


def get_branch(branch_id: str) -> Optional[SimulationBranch]:
    data = _read_json(BRANCHES_FILE)
    if branch_id not in data:
        return None
    d = dict(data[branch_id])
    d["status"] = BranchStatus(d["status"])
    return SimulationBranch(**d)


def list_branches(role_agent_id: str) -> list:
    data = _read_json(BRANCHES_FILE)
    result = []
    for b in data.values():
        if b.get("role_agent_id") == role_agent_id:
            d = dict(b)
            d["status"] = BranchStatus(d["status"])
            result.append(SimulationBranch(**d))
    return result


# ─── UserProfile ──────────────────────────────────────────────────────────────

def get_user_profile() -> dict:
    if not os.path.exists(USER_FILE):
        return {
            "name": "我", "bio": "", "birthday": None,
            "occupation": None, "location": None,
            "personality": {}, "memories": [],
            "agent_model": None, "agent_system_prompt": "",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
    return json.loads(open(USER_FILE, "r", encoding="utf-8").read())


def save_user_profile(data: dict):
    _ensure_dirs()
    data["updated_at"] = datetime.utcnow().isoformat()
    data.setdefault("created_at", datetime.utcnow().isoformat())
    data.setdefault("memories", [])
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def add_user_memory(content: str, memory_type: str, source: str = "self") -> dict:
    entry = _make_memory_entry(content, source)
    entry["memory_type"] = memory_type
    profile = get_user_profile()
    profile.setdefault("memories", []).append(entry)
    save_user_profile(profile)
    return entry


def delete_user_memory(memory_id: str) -> bool:
    profile = get_user_profile()
    mems = profile.get("memories", [])
    new_mems = [m for m in mems if m.get("id") != memory_id]
    if len(new_mems) == len(mems):
        return False
    profile["memories"] = new_mems
    save_user_profile(profile)
    return True


def list_user_memories(memory_type: Optional[str] = None) -> list:
    mems = get_user_profile().get("memories", [])
    if memory_type:
        mems = [m for m in mems if m.get("memory_type") == memory_type]
    return mems


# ─── Jarvis (memories + skills) ───────────────────────────────────────────────

def get_jarvis_data() -> dict:
    if not os.path.exists(JARVIS_FILE):
        return {"memories": [], "skills": []}
    return json.loads(open(JARVIS_FILE, "r", encoding="utf-8").read())


def save_jarvis_data(data: dict):
    _ensure_dirs()
    with open(JARVIS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def add_jarvis_memory(content: str, source: str = "self") -> dict:
    entry = _make_memory_entry(content, source)
    d = get_jarvis_data()
    d.setdefault("memories", []).append(entry)
    save_jarvis_data(d)
    return entry


def delete_jarvis_memory(memory_id: str) -> bool:
    d = get_jarvis_data()
    mems = d.get("memories", [])
    new_mems = [m for m in mems if m.get("id") != memory_id]
    if len(new_mems) == len(mems):
        return False
    d["memories"] = new_mems
    save_jarvis_data(d)
    return True


def add_jarvis_skill(name: str, description: str, instructions: str) -> dict:
    skill = JarvisSkill(name=name, description=description, instructions=instructions)
    entry = {
        "id": skill.id, "name": skill.name,
        "description": skill.description, "instructions": skill.instructions,
        "active": skill.active, "created_at": skill.created_at,
    }
    d = get_jarvis_data()
    d.setdefault("skills", []).append(entry)
    save_jarvis_data(d)
    return entry


def toggle_jarvis_skill(skill_id: str) -> Optional[dict]:
    d = get_jarvis_data()
    for skill in d.get("skills", []):
        if skill.get("id") == skill_id:
            skill["active"] = not skill.get("active", True)
            save_jarvis_data(d)
            return skill
    return None


def delete_jarvis_skill(skill_id: str) -> bool:
    d = get_jarvis_data()
    skills = d.get("skills", [])
    new_skills = [s for s in skills if s.get("id") != skill_id]
    if len(new_skills) == len(skills):
        return False
    d["skills"] = new_skills
    save_jarvis_data(d)
    return True


# ─── Settings ─────────────────────────────────────────────────────────────────

def get_settings() -> dict:
    if not os.path.exists(SETTINGS_FILE):
        return {}
    with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_settings(data: dict):
    _ensure_dirs()
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
