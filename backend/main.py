from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
import io

from database import engine, get_db, Base
from models import Issue, Solution, Tag
from schemas import IssueOut, SearchResponse
from pdf_export import generate_pdf

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Issue & Solution Tool", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Issue & Solution Tool API is running"}


@app.get("/issues/search", response_model=SearchResponse)
def search_issues(
    q: Optional[str] = Query(default=""),
    category: Optional[str] = Query(default=""),
    severity: Optional[str] = Query(default=""),
    db: Session = Depends(get_db)
):
    query = db.query(Issue).options(
        joinedload(Issue.solutions),
        joinedload(Issue.tags)
    )

    if q:
        query = query.filter(Issue.title.ilike(f"%{q}%") | Issue.symptoms.ilike(f"%{q}%"))
    if category:
        query = query.filter(Issue.category == category)
    if severity:
        query = query.filter(Issue.severity == severity)

    results = query.order_by(Issue.id).all()
    return {"total": len(results), "issues": results}


@app.get("/issues/{issue_id}", response_model=IssueOut)
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).options(
        joinedload(Issue.solutions),
        joinedload(Issue.tags)
    ).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Issue.category).distinct().all()
    return [c[0] for c in categories]


@app.get("/export/pdf")
def export_pdf(
    ids: Optional[str] = Query(default=""),
    q: Optional[str] = Query(default=""),
    category: Optional[str] = Query(default=""),
    db: Session = Depends(get_db)
):
    query = db.query(Issue).options(
        joinedload(Issue.solutions),
        joinedload(Issue.tags)
    )

    if ids:
        id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
        query = query.filter(Issue.id.in_(id_list))
    else:
        if q:
            query = query.filter(Issue.title.ilike(f"%{q}%"))
        if category:
            query = query.filter(Issue.category == category)

    issues = query.all()

    if not issues:
        raise HTTPException(status_code=404, detail="No issues found to export")

    pdf_bytes = generate_pdf(issues)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=issues_export.pdf"}
    )
