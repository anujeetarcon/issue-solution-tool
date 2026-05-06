from fastapi import FastAPI, Depends, Query, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import io, os, shutil, uuid

from database import engine, get_db, Base
from models import Issue, Solution, Tag
from schemas import IssueOut, SearchResponse, SolutionAdd
from pdf_export import generate_pdf

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Issue & Solution Tool", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "Issue & Solution Tool API is running"}


# ── Search ─────────────────────────────────────────────────────────────────

@app.get("/issues/search", response_model=SearchResponse)
def search_issues(
    q: Optional[str] = Query(default=""),
    category: Optional[str] = Query(default=""),
    severity: Optional[str] = Query(default=""),
    db: Session = Depends(get_db)
):
    query = db.query(Issue).options(joinedload(Issue.solutions), joinedload(Issue.tags))
    if q:
        query = query.filter(Issue.title.ilike(f"%{q}%") | Issue.symptoms.ilike(f"%{q}%"))
    if category:
        query = query.filter(Issue.category == category)
    if severity:
        query = query.filter(Issue.severity == severity)
    results = query.order_by(Issue.id.desc()).all()
    return {"total": len(results), "issues": results}


@app.get("/issues/{issue_id}", response_model=IssueOut)
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).options(
        joinedload(Issue.solutions), joinedload(Issue.tags)
    ).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return [c[0] for c in db.query(Issue.category).distinct().all()]


# ── Register Problem ────────────────────────────────────────────────────────

@app.post("/issues/register", response_model=IssueOut)
async def register_issue(
    title: str = Form(...),
    category: str = Form(...),
    severity: str = Form(...),
    symptoms: str = Form(...),
    cause: Optional[str] = Form(default=None),
    tags: Optional[str] = Form(default=""),
    image: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db)
):
    image_path = None
    if image and image.filename:
        allowed = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(status_code=400, detail="Invalid image type")
        filename = f"{uuid.uuid4()}{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_path = f"/uploads/{filename}"

    issue = Issue(
        title=title, category=category, severity=severity.lower(),
        symptoms=symptoms, cause=cause, image_path=image_path,
        status="problem_complete",
    )
    db.add(issue)
    db.flush()

    if tags:
        for tag_name in [t.strip() for t in tags.split(",") if t.strip()]:
            db.add(Tag(issue_id=issue.id, name=tag_name))

    db.commit()
    db.refresh(issue)
    return issue


# ── Edit Problem ────────────────────────────────────────────────────────────

@app.put("/issues/{issue_id}/edit", response_model=IssueOut)
async def edit_issue(
    issue_id: int,
    title: str = Form(...),
    category: str = Form(...),
    severity: str = Form(...),
    symptoms: str = Form(...),
    cause: Optional[str] = Form(default=None),
    tags: Optional[str] = Form(default=""),
    image: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.title = title
    issue.category = category
    issue.severity = severity.lower()
    issue.symptoms = symptoms
    issue.cause = cause

    if image and image.filename:
        allowed = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(status_code=400, detail="Invalid image type")
        # Delete old image if exists
        if issue.image_path:
            old_path = issue.image_path.lstrip("/")
            if os.path.exists(old_path):
                os.remove(old_path)
        filename = f"{uuid.uuid4()}{ext}"
        with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
            shutil.copyfileobj(image.file, f)
        issue.image_path = f"/uploads/{filename}"

    # Replace tags
    db.query(Tag).filter(Tag.issue_id == issue_id).delete()
    if tags:
        for tag_name in [t.strip() for t in tags.split(",") if t.strip()]:
            db.add(Tag(issue_id=issue.id, name=tag_name))

    db.commit()
    db.refresh(issue)
    return issue


# ── Delete Issue ────────────────────────────────────────────────────────────

@app.delete("/issues/{issue_id}")
def delete_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Delete uploaded image file if present
    if issue.image_path:
        path = issue.image_path.lstrip("/")
        if os.path.exists(path):
            os.remove(path)

    db.delete(issue)
    db.commit()
    return {"deleted": True, "id": issue_id}


# ── Add Solution ────────────────────────────────────────────────────────────

@app.put("/issues/{issue_id}/solution", response_model=IssueOut)
def add_solution(issue_id: int, payload: SolutionAdd, db: Session = Depends(get_db)):
    issue = db.query(Issue).options(
        joinedload(Issue.solutions), joinedload(Issue.tags)
    ).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.solution_summary = payload.solution_summary
    issue.status = "solution_added"

    db.query(Solution).filter(Solution.issue_id == issue_id).delete()
    for i, step_text in enumerate(payload.steps, start=1):
        if step_text.strip():
            db.add(Solution(issue_id=issue.id, step_number=i, description=step_text.strip()))

    if payload.tags:
        db.query(Tag).filter(Tag.issue_id == issue_id).delete()
        for tag_name in payload.tags:
            if tag_name.strip():
                db.add(Tag(issue_id=issue.id, name=tag_name.strip()))

    db.commit()
    db.refresh(issue)
    return issue


# ── PDF Export ──────────────────────────────────────────────────────────────

@app.get("/export/pdf")
def export_pdf(
    ids: Optional[str] = Query(default=""),
    q: Optional[str] = Query(default=""),
    category: Optional[str] = Query(default=""),
    db: Session = Depends(get_db)
):
    query = db.query(Issue).options(joinedload(Issue.solutions), joinedload(Issue.tags))
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
