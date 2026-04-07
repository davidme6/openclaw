import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from src.data.schemas import RoleAgent, PersonalityModel, RelationshipType, RelationshipStatus
from src.agents.role_agent import RoleAgentRuntime
from src.data import storage

# 创建测试角色
role = RoleAgent(
    name='小雨',
    relationship_type=RelationshipType.LOVER,
    relationship_status=RelationshipStatus.ACTIVE,
    age=26,
    occupation='设计师',
    bio='认识3年的女朋友，性格温柔但有时敏感',
    personality=PersonalityModel(
        mbti='INFJ',
        speaking_style='温柔，喜欢用语气词，偶尔撒娇',
        values=['忠诚', '家庭', '稳定'],
        triggers=['被忽视', '不被理解'],
        love_language='言语肯定'
    ),
    key_events=['2021年3月第一次见面', '2022年情人节表白']
)
storage.save_role(role)

agent = RoleAgentRuntime(role=role)
print('=== 单Agent真实性测试 ===\n')

print('用户: 今天工作好累，你在干嘛')
r1 = agent.reply('今天工作好累，你在干嘛')
print(f'小雨: {r1}\n')

print('用户: 想你了')
r2 = agent.reply('想你了')
print(f'小雨: {r2}\n')

print('用户: 你最近有没有觉得我有点冷落你')
r3 = agent.reply('你最近有没有觉得我有点冷落你')
print(f'小雨: {r3}\n')

print('=== 测试完成，评分：像不像真实的人？ ===')
