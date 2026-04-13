"""
Core data schemas — unlimited nesting, any-to-any relationships.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class RelationshipType(str, Enum):
    LOVER = "lover"
    SPOUSE = "spouse"
    FIRST_LOVE = "first_love"
    PARENT = "parent"
    GRANDPARENT = "grandparent"
    SIBLING = "sibling"
    RELATIVE = "relative"
    FRIEND = "friend"
    COLLEAGUE = "colleague"
    CLASSMATE = "classmate"
    BOSS = "boss"
    OTHER = "other"


class RelationshipStatus(str, Enum):
    ACTIVE = "active"
    STRAINED = "strained"
    DISTANT = "distant"
    ENDED = "ended"
    DECEASED = "deceased"


class BranchStatus(str, Enum):
    ACTIVE = "active"
    MERGED = "merged"
    ABANDONED = "abandoned"


@dataclass
class PersonalityModel:
    mbti: Optional[str] = None
    speaking_style: str = ""
    values: list = field(default_factory=list)
    habits: list = field(default_factory=list)
    triggers: list = field(default_factory=list)
    love_language: Optional[str] = None
    background: str = ""


@dataclass
class RoleRelationship:
    """
    单条关系连线配置：this_role → target
    target_role_id = "user" 表示连向用户节点，其他为角色 ID
    """
    target_role_id: str = ""        # 目标ID，"user" 或 角色ID
    label: str = ""                 # 连线标签
    dashed: bool = False            # 虚线 = 间接关系；实线 = 直接关系
    curve: float = 0.0              # 曲线弯曲度 (-1 ~ 1)


@dataclass
class RoleAgent:
    """
    社会关系角色，支持无限嵌套层级。
    通过 parent_role_id 实现任意深度的树形结构，
    通过 role_relationships 实现任意节点间的关系连线。
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    relationship_type: RelationshipType = RelationshipType.OTHER
    relationship_status: RelationshipStatus = RelationshipStatus.ACTIVE

    # 基本信息
    age: Optional[int] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    bio: str = ""
    personality: PersonalityModel = field(default_factory=PersonalityModel)
    relationship_started: Optional[str] = None
    key_events: list = field(default_factory=list)

    # ── 层级关系 (无限深度) ──────────────────────────────────────────────────
    parent_role_id: Optional[str] = None   # 父角色 ID，None = 顶层角色
    connected_to_user: bool = True         # 是否与用户有直接关系

    # ── 关系连线 (任意节点间) ────────────────────────────────────────────────
    # 每条 RoleRelationship 描述「此角色 → 某节点」的连线样式
    # 可以是 → user，也可以是 → 任何其他角色（包括跨层级）
    role_relationships: list = field(default_factory=list)

    # 元数据
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def get_depth(self, all_roles: dict) -> int:
        """计算此角色在关系树中的深度（顶层=0）"""
        depth = 0
        current = self
        visited = set()
        while current.parent_role_id and current.parent_role_id not in visited:
            visited.add(current.id)
            parent = all_roles.get(current.parent_role_id)
            if not parent:
                break
            depth += 1
            current = parent
        return depth

    def to_system_prompt(self) -> str:
        prompt = f"""你正在扮演 {self.name}，请严格按照以下信息回应，不要跳出角色。

## 基本信息
- 姓名：{self.name}
- 年龄：{self.age or '未知'}
- 职业：{self.occupation or '未知'}
- 与用户的关系：{self.relationship_type.value}
- 关系状态：{self.relationship_status.value}

## 个人背景
{self.bio}

## 性格特征
- MBTI：{self.personality.mbti or '未知'}
- 说话风格：{self.personality.speaking_style}
- 核心价值观：{', '.join(self.personality.values) if self.personality.values else '未设置'}
- 敏感点：{', '.join(self.personality.triggers) if self.personality.triggers else '未设置'}
{f'- 爱的语言：{self.personality.love_language}' if self.personality.love_language else ''}

## 成长背景
{self.personality.background}

## 关系重要节点
{chr(10).join(f'- {e}' for e in self.key_events) if self.key_events else '暂无记录'}

## 行为准则
1. 始终以第一人称回应，用符合你性格的语气说话
2. 你不知道自己是 AI，你就是 {self.name}
3. 情绪反应要符合你的性格特征和当前关系状态
"""
        return prompt


@dataclass
class Message:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role: str = ""
    content: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    is_imported: bool = False


@dataclass
class ConversationThread:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role_agent_id: str = ""
    branch_id: Optional[str] = None
    messages: list = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class SimulationBranch:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role_agent_id: str = ""
    name: str = ""
    description: str = ""
    status: BranchStatus = BranchStatus.ACTIVE
    predicted_outcome: str = ""
    actual_outcome: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class RelationshipAnalysis:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role_agent_id: str = ""
    analysis_type: str = ""
    content: str = ""
    suggestions: list = field(default_factory=list)
    risk_factors: list = field(default_factory=list)
    confidence: float = 0.0
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class ModelSettings:
    """用户自定义的模型配置（对话模型 + Jarvis 模型）"""
    role_model: str = ""            # 角色对话用
    jarvis_model: str = ""          # Jarvis 分析用
    api_key: str = ""
    base_url: str = ""
    model_registry: list = field(default_factory=list)  # list of ModelEntry dicts
