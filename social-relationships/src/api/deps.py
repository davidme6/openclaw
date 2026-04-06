"""
Shared dependencies for API routes.
AgentFactory and Jarvis are singletons per server process.
"""

import os
from dotenv import load_dotenv
from ..agents import AgentFactory, Jarvis
from ..simulation import SimulationEngine

load_dotenv()

_factory = AgentFactory(
    api_key=os.environ.get("DASHSCOPE_API_KEY"),
    base_url=os.environ.get("BAILIAN_BASE_URL", "https://coding.dashscope.aliyuncs.com/v1"),
)
_jarvis = Jarvis(
    api_key=os.environ.get("DASHSCOPE_API_KEY"),
    base_url=os.environ.get("BAILIAN_BASE_URL", "https://coding.dashscope.aliyuncs.com/v1"),
)
_engine = SimulationEngine(factory=_factory, jarvis=_jarvis)


def get_factory() -> AgentFactory:
    return _factory

def get_jarvis() -> Jarvis:
    return _jarvis

def get_engine() -> SimulationEngine:
    return _engine
