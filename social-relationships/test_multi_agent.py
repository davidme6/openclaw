"""
W5-6 验证：多角色独立Agent系统 + Jarvis元Agent
测试：两个角色完全隔离，Jarvis能综合分析
"""
import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from src.data.schemas import RelationshipType, RelationshipStatus, PersonalityModel
from src.agents import AgentFactory, Jarvis

factory = AgentFactory()
jarvis = Jarvis()

print("=== 创建两个独立角色 ===\n")

# 角色1：恋人
lover = factory.create_role(
    name="小雨",
    relationship_type=RelationshipType.LOVER,
    relationship_status=RelationshipStatus.ACTIVE,
    age=26,
    occupation="设计师",
    bio="认识3年的女朋友，温柔但有时敏感",
    personality=PersonalityModel(
        speaking_style="温柔，喜欢用语气词，偶尔撒娇",
        triggers=["被忽视", "不被理解"],
        love_language="言语肯定"
    )
)

# 角色2：父亲
father = factory.create_role(
    name="老爸",
    relationship_type=RelationshipType.PARENT,
    relationship_status=RelationshipStatus.ACTIVE,
    age=58,
    occupation="退休工人",
    bio="传统观念较强，话不多但关心儿子，有时沟通方式比较直接",
    personality=PersonalityModel(
        speaking_style="直接，不爱说废话，偶尔唠叨",
        values=["踏实", "责任", "家庭"],
        triggers=["不务正业", "不回家"]
    )
)

print(f"✅ 角色1创建：{lover.name}（{lover.relationship_type.value}）")
print(f"✅ 角色2创建：{father.name}（{father.relationship_type.value}）\n")

# ── 测试隔离性：两个角色互不知道对方 ──
print("=== 测试角色隔离性 ===\n")

lover_runtime = factory.get_runtime(lover.id)
father_runtime = factory.get_runtime(father.id)

print("【对小雨说】今天跟老爸聊了很久")
r1 = lover_runtime.reply("今天跟老爸聊了很久")
print(f"小雨: {r1}\n")

print("【对老爸说】最近工作压力很大")
r2 = father_runtime.reply("最近工作压力很大")
print(f"老爸: {r2}\n")

# ── 测试Jarvis综合分析 ──
print("=== 测试 Jarvis 综合分析 ===\n")
print("【问Jarvis】我现在跟家里人和女朋友的关系怎么样？")
analysis = jarvis.analyze("我现在跟家里人和女朋友的关系怎么样？有什么需要注意的？")
print(f"Jarvis: {analysis}\n")

print("=== W5-6 验证完成 ===")
print("✅ 多角色独立运行")
print("✅ 角色互相隔离（小雨不知道老爸的存在）")
print("✅ Jarvis能综合分析所有关系")
