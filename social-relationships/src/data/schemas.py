"""
Core data schemas for Social Relationships Parallel World.
All data structures are defined here - both backend and API depend on these.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


# ─── Enums ───────────────────────────────────────────────────────────────────

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
    ACTIVE = "active"          # 关系正常进行中
    STRAINED = "strained"      # 关系紧张
    DISTANT = "distant"        # 关系疏远
    ENDED = "ended"            # 关系已结束
    DECEASED = "deceased"      # 对方已故（永久留存模式）


class BranchStatus(str, Enum):
    ACTIVE = "active"          # 推演中
    MERGED = "merged"          # 已合并回主线（现实验证后）
    ABANDONED = "abandoned"    # 已放弃


# ─── Agent / Role ─────────────────────────────────────────────────────────────

@dataclass
class PersonalityModel:
    """角色性格模型，注入进 Agent system prompt"""
    mbti: Optional[str] = None             # e.g. "INFJ"
    speaking_style: str = ""               # 说话风格描述
    values: list[str] = field(default_factory=list)       # 核心价值观
    habits: list[str] = field(default_factory=list)       # 习惯
    triggers: list[str] = field(default_factory=list)     # 敏感点/雷区
    love_language: Optional[str] = None    # 爱的语言（适用于亲密关系）
    background: str = ""                   # 成长背景、经历


@dataclass
class RoleAgent:
    """
    一个关系角色 = 一个完全独立的 Agent
    核心原则：每个 RoleAgent 互相完全隔离，Jarvis 不扮演任何角色
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""                                          # 角色真实姓名或昵称
    relationship_type: RelationshipType = RelationshipType.OTHER
    relationship_status: RelationshipStatus = RelationshipStatus.ACTIVE

    # 基本信息
    age: Optional[int] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    bio: str = ""                                           # 自由描述

    # 性格模型
    personality: PersonalityModel = field(default_factory=PersonalityModel)

    # 关系起始时间
    relationship_started: Optional[str] = None             # ISO date string
    key_events: list[str] = field(default_factory=list)   # 重要节点事件列表

    # 元数据
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_system_prompt(self) -> str:
        """将角色信息转化为 Agent system prompt"""
        prompt = f"""你正在扮演 {self.name}，以下是关于你的全部信息，请严格按照这些信息来回应，不要跳出角色。

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
- 习惯：{', '.join(self.personality.habits) if self.personality.habits else '未设置'}
- 敏感点：{', '.join(self.personality.triggers) if self.personality.triggers else '未设置'}
{f'- 爱的语言：{self.personality.love_language}' if self.personality.love_language else ''}

## 成长背景
{self.personality.background}

## 关系重要节点
{chr(10).join(f'- {e}' for e in self.key_events) if self.key_events else '暂无记录'}

## 行为准则
1. 始终以第一人称回应，用符合你性格的语气说话
2. 你不知道自己是 AI，你就是 {self.name}
3. 你只记得你与用户之间的历史，不了解其他人
4. 情绪反应要符合你的性格特征和当前关系状态
"""
        return prompt


# ─── Memory / Conversation ────────────────────────────────────────────────────

@dataclass
class Message:
    """单条消息"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role: str = ""             # "user" | "agent"
    content: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    is_imported: bool = False  # True = 从现实聊天记录导入，False = 平行世界中产生


@dataclass
class ConversationThread:
    """
    用户与某个角色的完整对话线
    完全独立，不与其他角色共享
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role_agent_id: str = ""    # 对应的 RoleAgent.id
    branch_id: Optional[str] = None   # None = 主线（现实），有值 = 推演分支
    messages: list[Message] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Simulation Engine / Timeline ─────────────────────────────────────────────

@dataclass
class TimelineSnapshot:
    """
    某一时刻的完整状态快照
    推演引擎回退的基本单位，类似 git commit
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    branch_id: str = ""
    description: str = ""                    # 快照描述，如"表白前的状态"
    role_agent_id: str = ""                  # 该快照对应哪个角色
    conversation_snapshot: list[Message] = field(default_factory=list)
    relationship_status: RelationshipStatus = RelationshipStatus.ACTIVE
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class SimulationBranch:
    """
    推演分支，类似 git branch
    用户可在分支中试错，回退，或合并回主线
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role_agent_id: str = ""
    parent_snapshot_id: Optional[str] = None   # 从哪个快照分叉出来
    name: str = ""                              # 分支名，如"方案A：直接道歉"
    description: str = ""                       # 分支假设描述
    status: BranchStatus = BranchStatus.ACTIVE
    predicted_outcome: str = ""                 # Jarvis 预测结果
    actual_outcome: Optional[str] = None        # 现实验证后的真实结果
    snapshots: list[TimelineSnapshot] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Jarvis ────────────────────────────────────────────────────────────────────

@dataclass
class RelationshipAnalysis:
    """
    Jarvis 对某段关系的分析输出
    Jarvis 只分析，不扮演任何角色
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    role_agent_id: str = ""
    analysis_type: str = ""        # "status" | "suggestion" | "prediction"
    content: str = ""              # 分析内容
    suggestions: list[str] = field(default_factory=list)  # 行动建议
    risk_factors: list[str] = field(default_factory=list) # 风险点
    confidence: float = 0.0        # 置信度 0-1
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
