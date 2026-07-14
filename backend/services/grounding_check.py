"""Post-hoc numeric grounding check for live Gemini replies.

`ai_insights_service.BASE_SYSTEM_INSTRUCTIONS` already *tells* the model never to
invent a price, percentage, indicator reading, or statistic that isn't present in
the structured context or knowledge-base notes it was given - but that's just a
prompt instruction with no verification behind it. This module is the verification:
after a reply comes back, it extracts the numeric claims the reply actually makes
and checks each one against every number that was genuinely available to the model
(the full `AIAssetContext` payload, including numbers embedded in generated text
fields like `prediction.reasoning`, plus the retrieved knowledge-base articles for
that turn). Anything left over is a candidate hallucination.

This is deliberately a soft signal, not a hard gate: it never blocks or rewrites a
reply, only flags it (see `find_ungrounded_numbers`'s callers in
`ai_insights_service.py`, which log a warning and surface a non-blocking
"unverified figures" flag to the user). Tolerance-based matching and a materiality
filter (see `_is_material`) keep it from flagging ordinary prose numbers ("2-3
factors", markdown list numbering) as false positives - it only checks numbers that
look like an actual data claim: currency amounts, percentages, or multi-digit/
decimal figures.
"""

from __future__ import annotations

import re
from typing import Iterable

from models.schemas import AIAssetContext
from services.knowledge_base import KnowledgeArticle

# Matches a numeric token, optionally prefixed with "$", comma-grouped, with an
# optional decimal part, optionally suffixed with "%" (e.g. "$1,234.56", "62%", "72.3").
_NUMBER_TOKEN = re.compile(r"\$?-?\d[\d,]*(?:\.\d+)?%?")


def _is_material(token: str) -> bool:
    """Whether a matched numeric token looks like an actual data claim worth
    grounding-checking, as opposed to ordinary prose (list numbering, "2-3 factors",
    a bare small count) that just happens to contain digits."""
    core = token.strip("$%")
    has_decimal = "." in core
    has_currency_or_percent = token.startswith("$") or token.endswith("%")
    digits_only = core.replace(",", "").replace("-", "")
    return has_decimal or has_currency_or_percent or len(digits_only) >= 3


def _to_float(token: str) -> float | None:
    cleaned = token.strip("$%").replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _extract_material_numbers(text: str) -> set[float]:
    numbers: set[float] = set()
    for token in _NUMBER_TOKEN.findall(text):
        if not _is_material(token):
            continue
        value = _to_float(token)
        if value is not None:
            numbers.add(value)
    return numbers


def _collect_grounded_numbers(value: object) -> set[float]:
    """Recursively walks a JSON-shaped structure (as from `model.model_dump(mode="json")`)
    and collects every numeric value that was genuinely available to the model -
    both real numeric leaves (a price, a confidence score) and numbers embedded in
    generated text fields (e.g. `prediction.reasoning` strings like "RSI at 72.3
    signals overbought conditions", or `moving_average_trend`'s "above the 50-period
    average")."""
    numbers: set[float] = set()
    if isinstance(value, dict):
        for v in value.values():
            numbers |= _collect_grounded_numbers(v)
    elif isinstance(value, list):
        for v in value:
            numbers |= _collect_grounded_numbers(v)
    elif isinstance(value, bool):
        pass  # bool is an int subclass in Python - skip before the int/float branch below
    elif isinstance(value, (int, float)):
        numbers.add(float(value))
    elif isinstance(value, str):
        numbers |= _extract_material_numbers(value)
    return numbers


def _values_match(claimed: float, grounded: float) -> bool:
    """Tolerant comparison so reasonable rounding by the model (a price rounded to
    the nearest dollar, a confidence rounded to the nearest whole percent) isn't
    flagged as a hallucination - only a value with no plausibly-rounded source counts
    as ungrounded."""
    if claimed == grounded:
        return True
    tolerance = max(0.5, abs(grounded) * 0.01)
    return abs(claimed - grounded) <= tolerance


def find_ungrounded_numbers(
    context: AIAssetContext, kb_articles: Iterable[KnowledgeArticle], reply_text: str
) -> list[str]:
    """Returns the (deduplicated, order-preserving) list of numeric tokens in
    `reply_text` that don't match any number actually present in `context` or in the
    bodies of `kb_articles` (the knowledge-base notes retrieved for this specific
    turn - see `services/knowledge_base.py::retrieve`). An empty list means every
    material numeric claim in the reply could be traced back to real grounding data.
    """
    grounded = _collect_grounded_numbers(context.model_dump(mode="json"))
    for article in kb_articles:
        grounded |= _extract_material_numbers(article.body)

    offenders: list[str] = []
    seen: set[str] = set()
    for token in _NUMBER_TOKEN.findall(reply_text):
        if not _is_material(token) or token in seen:
            continue
        value = _to_float(token)
        if value is None:
            continue
        if any(_values_match(value, g) for g in grounded):
            continue
        seen.add(token)
        offenders.append(token)
    return offenders
