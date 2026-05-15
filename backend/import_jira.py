"""
JIRA CSV Importer — with RCA + Resolution Details
---------------------------------------------------
- Imports all bugs as issues
- Maps RCA Details → cause
- Maps Resolution Details → solution_summary + marks as solution_added
- Safe reader handles 447 columns with duplicates
Run: python import_jira.py Issues_To_Dump_From_JIRA.csv
"""
import csv, re, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models import Issue, Solution, Tag, Category

Base.metadata.create_all(bind=engine)

PRIORITY_MAP = {
    "showstopper": "high", "high": "high",
    "medium": "medium", "low": "low", "": "medium",
}

def infer_category(summary: str) -> str:
    s = summary.lower()
    if any(x in s for x in ["sso","mfa","auth","login","password","saml","ldap","kerberos","token","oauth"]): return "Auth"
    if any(x in s for x in ["connector","onboard","integration","plugin","provisioning"]): return "Connector"
    if any(x in s for x in ["db","database","sql","oracle","mongo","mysql","mssql","query"]): return "Database"
    if any(x in s for x in ["ui","interface","screen","page","display","dashboard","render","button","form"]): return "UI"
    if any(x in s for x in ["api","endpoint","timeout","latency","slow","performance","caching"]): return "Performance"
    if any(x in s for x in ["network","cors","firewall","proxy","ssl","tls","certificate","rdp","rdps"]): return "Network"
    if any(x in s for x in ["install","deploy","upgrade","migration","config","setup","acm","folder"]): return "Deployment"
    if any(x in s for x in ["report","export","pdf","log","audit"]): return "Reporting"
    return "General"

def clean_text(text: str) -> str:
    if not text or not text.strip(): return ""
    text = re.sub(r'h[1-6]\.\s*', '', text)
    text = re.sub(r'\{code[^}]*\}.*?\{code\}', '[code block]', text, flags=re.DOTALL)
    text = re.sub(r'\{noformat[^}]*\}.*?\{noformat\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\[~accountid:[^\]]+\]', '', text)
    text = re.sub(r'\[([^\|]+)\|[^\]]+\]', r'\1', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def extract_symptoms(desc: str) -> str:
    if not desc: return ""
    m = re.search(r'(?:Actual behaviour|Actual Behavior)[:\s]*\n+(.*?)(?:\n\n|\Z)', desc, re.DOTALL|re.IGNORECASE)
    if m: return m.group(1).strip()[:600]
    m = re.search(r'Impact[:\s]*\n+(.*?)(?:\n\n|\Z)', desc, re.DOTALL|re.IGNORECASE)
    if m: return m.group(1).strip()[:600]
    paras = [p.strip() for p in desc.split('\n\n') if p.strip()]
    return paras[0][:600] if paras else desc[:400]

def read_csv_safe(path: str):
    with open(path, encoding='utf-8', errors='replace') as f:
        raw = f.read()
    lines = list(csv.reader(raw.splitlines()))
    if not lines: return [], []
    raw_headers = lines[0]
    seen = {}
    col_map = {}
    for i, h in enumerate(raw_headers):
        if h not in seen:
            seen[h] = i
            col_map[h] = i
    fix_ver_indices = [i for i, h in enumerate(raw_headers) if h == 'Fix versions']
    rows = []
    for line in lines[1:]:
        if not line: continue
        while len(line) < len(raw_headers): line.append('')
        row = {key: line[idx] if idx < len(line) else '' for key, idx in col_map.items()}
        row['_fix_versions'] = [line[i] for i in fix_ver_indices if i < len(line) and line[i].strip()]
        rows.append(row)
    return rows, raw_headers

def run_import(csv_path: str):
    db = SessionLocal()
    try:
        print("Clearing existing database data...")
        db.query(Solution).delete()
        db.query(Tag).delete()
        db.query(Issue).delete()
        db.query(Category).delete()
        db.commit()
        print("Database cleared.")

        rows, _ = read_csv_safe(csv_path)
        print(f"Found {len(rows)} rows in CSV. Importing...")

        imported = skipped = with_solution = 0

        for row in rows:
            summary   = (row.get('Summary') or '').strip()
            issue_key = (row.get('Issue key') or '').strip()
            priority  = (row.get('Priority') or '').strip().lower()
            status    = (row.get('Status') or '').strip()
            raw_desc  = (row.get('Description') or '').strip()

            rca_details  = clean_text(row.get('Custom field (RCA Details (Impact Analysis))') or '')
            resolution   = clean_text(row.get('Custom field (Resolution Details)') or '')
            root_cause_1 = clean_text(row.get('Custom field (Root Cause)') or '')
            root_cause_2 = clean_text(row.get('Custom field (Root cause)') or '')
            rca_category = clean_text(row.get('Custom field (RCA)') or '')
            ticket_dev   = clean_text(row.get('Custom field (Ticket Analysis by Developer)') or '')

            if not summary:
                skipped += 1
                continue

            title    = f"{issue_key} | {summary}" if issue_key else summary
            clean    = clean_text(raw_desc)
            symptoms = extract_symptoms(clean) or f"Issue reported: {summary}"

            cause = (rca_details or root_cause_1 or root_cause_2 or ticket_dev or "Under investigation — imported from JIRA.")
            if rca_category and rca_category.lower() not in ('', 'others', 'others - working as expected'):
                cause = f"[{rca_category}] {cause}"

            severity       = PRIORITY_MAP.get(priority, "medium")
            category       = infer_category(summary)
            has_resolution = bool(resolution)
            issue_status   = "solution_added" if has_resolution else "problem_complete"

            tags = []
            for fv in row.get('_fix_versions', [])[:2]:
                fv = fv.strip()
                if fv: tags.append(fv)
            if issue_key: tags.append(issue_key)
            if status and status.lower() not in ('closed','done','rejected','resolved'):
                tags.append(status)

            issue = Issue(
                title=title[:255],
                category=category,
                severity=severity,
                symptoms=symptoms[:2000],
                cause=cause[:1000],
                status=issue_status,
                solution_summary=resolution[:1000] if resolution else None,
                image_path=None,
            )
            db.add(issue)
            db.flush()

            if resolution:
                db.add(Solution(issue_id=issue.id, step_number=1, description=resolution[:500]))
                with_solution += 1

            seen_tags = set()
            for tn in tags:
                tn = tn.strip()[:48]
                if tn and tn not in seen_tags:
                    db.add(Tag(issue_id=issue.id, name=tn))
                    seen_tags.add(tn)

            imported += 1

        db.commit()
        print(f"\nImport complete!")
        print(f"  Imported          : {imported}")
        print(f"  With solution     : {with_solution}")
        print(f"  Needs solution    : {imported - with_solution}")
        print(f"  Skipped (no title): {skipped}")
        print(f"  Total             : {len(rows)}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_jira.py yourfile.csv")
        sys.exit(1)
    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"File not found: {path}")
        sys.exit(1)
    run_import(path)
