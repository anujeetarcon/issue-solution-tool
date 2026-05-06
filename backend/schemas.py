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
    cause: Optional[str] = None
    image_path: Optional[str] = None
    status: str
    solution_summary: Optional[str] = None
    solutions: List[SolutionOut] = []
    tags: List[TagOut] = []
    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    total: int
    issues: List[IssueOut]


class SolutionAdd(BaseModel):
    solution_summary: str
    steps: List[str]
    tags: Optional[List[str]] = []