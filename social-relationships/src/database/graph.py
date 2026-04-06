"""
Neo4j layer - relationship graph.
Stores who-knows-who and relationship weights/dynamics.
"""

import os
from neo4j import GraphDatabase
from ..data.schemas import RoleAgent, RelationshipType, RelationshipStatus

NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")


def get_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def upsert_role_node(role: RoleAgent):
    """将角色写入关系图谱"""
    with get_driver() as driver:
        driver.execute_query(
            """
            MERGE (r:Role {id: $id})
            SET r.name = $name,
                r.relationship_type = $rtype,
                r.relationship_status = $rstatus,
                r.age = $age,
                r.occupation = $occupation
            """,
            id=role.id, name=role.name,
            rtype=role.relationship_type.value,
            rstatus=role.relationship_status.value,
            age=role.age, occupation=role.occupation or "",
        )


def upsert_relationship(user_id: str, role_id: str, rel_type: RelationshipType, strength: float = 1.0):
    """
    在用户和角色之间建立关系边。
    strength: 关系强度 0-1（越高越亲密）
    """
    with get_driver() as driver:
        driver.execute_query(
            """
            MERGE (u:User {id: $user_id})
            MERGE (r:Role {id: $role_id})
            MERGE (u)-[rel:KNOWS {type: $rel_type}]->(r)
            SET rel.strength = $strength
            """,
            user_id=user_id, role_id=role_id,
            rel_type=rel_type.value, strength=strength,
        )


def get_relationship_network(user_id: str) -> list[dict]:
    """获取用户的完整关系网络（用于前端可视化）"""
    with get_driver() as driver:
        result = driver.execute_query(
            """
            MATCH (u:User {id: $user_id})-[rel:KNOWS]->(r:Role)
            RETURN r.id AS id, r.name AS name, r.relationship_type AS type,
                   r.relationship_status AS status, rel.strength AS strength
            ORDER BY rel.strength DESC
            """,
            user_id=user_id,
        )
        return [dict(record) for record in result.records]


def update_relationship_strength(user_id: str, role_id: str, delta: float):
    """
    更新关系强度（推演结果反馈后调用）。
    delta: 正值增强，负值减弱
    """
    with get_driver() as driver:
        driver.execute_query(
            """
            MATCH (u:User {id: $user_id})-[rel:KNOWS]->(r:Role {id: $role_id})
            SET rel.strength = CASE
                WHEN rel.strength + $delta > 1.0 THEN 1.0
                WHEN rel.strength + $delta < 0.0 THEN 0.0
                ELSE rel.strength + $delta
            END
            """,
            user_id=user_id, role_id=role_id, delta=delta,
        )
