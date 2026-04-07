"""
LLM client layer. Default: Alibaba Bailian qwen3.5-plus.
Users can override model via config or per-request parameter.
Bailian API is OpenAI-compatible, so we use the openai SDK.
"""

import os
from typing import Optional
from openai import OpenAI


# ─── Default Config ───────────────────────────────────────────────────────────

DEFAULT_MODEL = "qwen3.5-plus"
BAILIAN_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1"  # Coding Plan 专属 URL


def get_client(api_key: Optional[str] = None, base_url: Optional[str] = None) -> OpenAI:
    """
    返回 OpenAI-compatible 客户端。
    默认连接阿里云百炼，也可以传入其他 base_url 切换到 OpenAI / Claude 等。
    """
    return OpenAI(
        api_key=api_key or os.environ.get("DASHSCOPE_API_KEY", ""),
        base_url=base_url or BAILIAN_BASE_URL,
    )


def chat(
    messages: list[dict],
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: float = 0.8,
    max_tokens: int = 1024,
) -> str:
    """
    发送对话请求，返回 assistant 回复文本。

    messages 格式：
        [
            {"role": "system", "content": "..."},
            {"role": "user",   "content": "..."},
            {"role": "assistant", "content": "..."},
            ...
        ]
    """
    client = get_client(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model or DEFAULT_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content
