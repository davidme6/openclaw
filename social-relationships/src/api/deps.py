"""Shared singletons — settings are read from disk on each request so hot-reload works."""

import os
from dotenv import load_dotenv
from ..agents import AgentFactory, Jarvis
from ..simulation import SimulationEngine
from ..data.storage import get_settings

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), override=False)

_factory = AgentFactory()
_jarvis = Jarvis()
_engine = SimulationEngine(factory=_factory, jarvis=_jarvis)


def get_factory() -> AgentFactory:
    # Push latest settings into the singleton each request
    s = get_settings()
    _factory.model = s.get("role_model", os.environ.get("ROLE_MODEL", ""))
    _factory.api_key = s.get("api_key", os.environ.get("OPENAI_API_KEY", ""))
    _factory.base_url = s.get("base_url", os.environ.get("BASE_URL", ""))
    return _factory


def get_jarvis() -> Jarvis:
    s = get_settings()
    _jarvis.model = s.get("jarvis_model", "") or s.get("role_model", os.environ.get("ROLE_MODEL", ""))
    _jarvis.api_key = s.get("api_key", os.environ.get("OPENAI_API_KEY", ""))
    _jarvis.base_url = s.get("base_url", os.environ.get("BASE_URL", ""))
    return _jarvis


def get_engine() -> SimulationEngine:
    get_factory()
    get_jarvis()
    return _engine
