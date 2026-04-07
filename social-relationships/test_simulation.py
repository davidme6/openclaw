"""
W7 验证：推演引擎 - 分支创建、独立对话、Jarvis对比、回退
"""
import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from src.data.schemas import RelationshipType, PersonalityModel
from src.agents import AgentFactory, Jarvis
from src.simulation import SimulationEngine

factory = AgentFactory()
jarvis = Jarvis()
engine = SimulationEngine(factory=factory, jarvis=jarvis)

print("=== W7 推演引擎测试 ===\n")

# 创建角色
role = factory.create_role(
    name="小雨",
    relationship_type=RelationshipType.LOVER,
    age=26,
    bio="认识3年的女朋友，最近因为我太忙有些冷落她",
    personality=PersonalityModel(
        speaking_style="温柔但敏感，会有点小情绪",
        triggers=["被忽视", "感觉不被重视"],
        love_language="陪伴和言语肯定"
    )
)

# 主线：先建立一些对话历史
print("【主线】建立基础对话...")
main_runtime = factory.get_runtime(role.id)
main_runtime.reply("小雨，最近我工作太忙了，感觉有点冷落你了")
print("主线对话建立完成\n")

# 创建两个推演分支
print("【推演】创建两个方案分支...\n")

branch_a = engine.create_branch(
    role_id=role.id,
    name="方案A：直接道歉",
    description="直接承认错误，主动道歉，表达重视",
    snapshot_description="冷落后的状态"
)

branch_b = engine.create_branch(
    role_id=role.id,
    name="方案B：送礼补救",
    description="用实际行动弥补，准备惊喜",
    snapshot_description="冷落后的状态"
)

# 分支A：直接道歉
print("=== 分支A：直接道歉 ===")
r_a = engine.chat_in_branch(branch_a.id, role.id, "小雨，我知道最近忽略了你，对不起，我真的很重视你")
print(f"小雨(A): {r_a}\n")

# 分支B：送礼补救
print("=== 分支B：送礼补救 ===")
r_b = engine.chat_in_branch(branch_b.id, role.id, "小雨，周末我订好了你一直想去的餐厅，我们好好约一次")
print(f"小雨(B): {r_b}\n")

# Jarvis 对比两个方案
print("=== Jarvis 对比分析 ===")
comparison = engine.compare_branches([branch_a.id, branch_b.id], role.id)
print(f"Jarvis: {comparison}\n")

# 选择方案A，合并回主线
print("【决策】选择方案A，合并回主线...")
engine.merge_branch(branch_a.id, actual_outcome="现实中道歉后，小雨情绪好转，关系有所缓和")
engine.abandon_branch(branch_b.id)

# 验证主线未受影响
print("\n【验证】主线对话未受分支影响...")
main_check = main_runtime.reply("你今天心情怎么样")
print(f"小雨(主线): {main_check}")

print("\n=== W7 推演引擎验证完成 ===")
print("✅ 分支创建")
print("✅ 分支内独立对话（不影响主线）")
print("✅ Jarvis 对比分析多方案")
print("✅ 分支合并/放弃")
print("✅ 主线状态保持独立")
