"""
LLM client — OpenAI-compatible. Strips /chat/completions suffix from base_url
so users can paste the full URL from API docs without breaking the SDK.
"""

import os
from typing import Optional
from openai import OpenAI


def _strip_base_url(url: str) -> str:
    """Remove trailing path segments that the SDK appends automatically."""
    url = url.rstrip("/")
    for suffix in ("/chat/completions", "/responses", "/v1/chat/completions", "/v1/responses"):
        if url.endswith(suffix):
            url = url[: -len(suffix)]
    return url.rstrip("/")


def get_client(api_key: Optional[str] = None, base_url: Optional[str] = None) -> OpenAI:
    key = api_key or os.environ.get("OPENAI_API_KEY", "dummy")
    kwargs = {"api_key": key}
    if base_url:
        kwargs["base_url"] = _strip_base_url(base_url)
    return OpenAI(**kwargs)


def chat(
    client: OpenAI,
    model: str,
    messages: list[dict],
    max_tokens: int = 1024,
    temperature: float = 0.8,
) -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.choices[0].message.content or ""
