from __future__ import annotations

from fastapi import APIRouter

from models.schemas import KnowledgeArticle
from services.knowledge_base import ARTICLES

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/articles", response_model=list[KnowledgeArticle])
def list_articles():
    return [KnowledgeArticle(id=a.id, title=a.title, body=a.body) for a in ARTICLES]
