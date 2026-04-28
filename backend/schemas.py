from pydantic import BaseModel
from typing import List, Optional


class SolutionOut(BaseModel):
    id: int
    step_number: int
    description: str

    class Config:
        from_attributes = True


class TagOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class IssueOut(BaseModel):
    id: int
    title: str
    category: str
    severity: str
    symptoms: str
    cause: str
    solutions: List[SolutionOut] = []
    tags: List[TagOut] = []

    class Config:
        from_attributes = True


class IssueCreate(BaseModel):
    title: str
    category: str
    severity: str = "medium"
    symptoms: str
    cause: str
    steps: List[str] = []
    tags: List[str] = []


class SearchResponse(BaseModel):
    total: int
    issues: List[IssueOut]
