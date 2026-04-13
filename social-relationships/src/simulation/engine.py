"""Simulation engine — branched timeline management."""

from typing import Optional
from ..data import storage
from ..data.schemas import SimulationBranch, BranchStatus
from .agent_factory import AgentFactory
from .jarvis import Jarvis


class SimulationEngine:
    def __init__(self, factory: AgentFactory, jarvis: Jarvis):
        self.factory = factory
        self.jarvis = jarvis

    def create_branch(self, role_id: str, name: str, description: str) -> SimulationBranch:
        branch = SimulationBranch(
            role_agent_id=role_id,
            name=name,
            description=description,
        )
        storage.save_branch(branch)
        return branch

    def list_branches(self, role_id: str) -> list:
        return storage.list_branches(role_id)

    def chat_in_branch(self, branch_id: str, role_id: str, message: str) -> str:
        runtime = self.factory.get_runtime(role_id)
        return runtime.chat(message, branch_id=branch_id)

    def merge_branch(self, branch_id: str, actual_outcome: str) -> SimulationBranch:
        branch = storage.get_branch(branch_id)
        if not branch:
            raise ValueError(f"Branch {branch_id} not found")
        branch.status = BranchStatus.MERGED
        branch.actual_outcome = actual_outcome
        storage.save_branch(branch)
        return branch

    def abandon_branch(self, branch_id: str) -> SimulationBranch:
        branch = storage.get_branch(branch_id)
        if not branch:
            raise ValueError(f"Branch {branch_id} not found")
        branch.status = BranchStatus.ABANDONED
        storage.save_branch(branch)
        return branch

    def compare_branches(self, role_id: str, branch_ids: list[str]) -> str:
        branches = [storage.get_branch(bid) for bid in branch_ids]
        branches = [b for b in branches if b]
        if not branches:
            return "没有找到指定的推演分支"
        summary = "\n".join(
            f"分支「{b.name}」: {b.description}" for b in branches
        )
        return self.jarvis.chat(
            f"请比较以下推演分支，分析哪个方案更好：\n{summary}",
            history=[],
        )
