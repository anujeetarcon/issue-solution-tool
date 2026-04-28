from database import SessionLocal, engine, Base
from models import Issue, Solution, Tag, Category

Base.metadata.create_all(bind=engine)

SEED_DATA = [
    {
        "title": "Database connection timeout",
        "category": "Database",
        "severity": "high",
        "symptoms": "Queries hang or fail with 'connection timeout' after 30s under load.",
        "cause": "Connection pool exhausted — too many concurrent requests.",
        "tags": ["PostgreSQL", "connection pool"],
        "steps": [
            "Check active connections: SELECT count(*) FROM pg_stat_activity;",
            "Increase pool size in database.py: pool_size=20, max_overflow=10",
            "Add connection timeout: connect_args={'connect_timeout': 10}",
            "Restart the FastAPI server with uvicorn --reload"
        ]
    },
    {
        "title": "JWT token expiry — 401 Unauthorized",
        "category": "Auth",
        "severity": "medium",
        "symptoms": "Users get logged out randomly or API returns 401 on valid sessions.",
        "cause": "Short token expiry or missing refresh token logic.",
        "tags": ["JWT", "FastAPI"],
        "steps": [
            "Check ACCESS_TOKEN_EXPIRE_MINUTES in .env (default: 30)",
            "Implement refresh token endpoint: POST /auth/refresh",
            "Store refresh token in httpOnly cookie (not localStorage)",
            "Update frontend to catch 401 and call refresh before retrying"
        ]
    },
    {
        "title": "Next.js API route CORS error",
        "category": "Network",
        "severity": "medium",
        "symptoms": "Browser console shows: Access-Control-Allow-Origin header missing.",
        "cause": "FastAPI backend not configured with CORS middleware.",
        "tags": ["CORS", "Next.js", "FastAPI"],
        "steps": [
            "Install: pip install fastapi[all]",
            "Add CORSMiddleware to main.py with allow_origins=['http://localhost:3000']",
            "Set allow_credentials=True, allow_methods=['*'], allow_headers=['*']",
            "Redeploy backend — no frontend changes needed"
        ]
    },
    {
        "title": "Slow search query on large dataset",
        "category": "Performance",
        "severity": "high",
        "symptoms": "Search takes 3-10 seconds with 10k+ records. Query uses ILIKE %term%.",
        "cause": "Missing full-text search index. ILIKE performs sequential scan.",
        "tags": ["PostgreSQL", "indexing", "full-text"],
        "steps": [
            "Add GIN index: CREATE INDEX issues_fts ON issues USING gin(to_tsvector('english', title));",
            "Update query to use: WHERE to_tsvector(...) @@ plainto_tsquery(:q)",
            "Add in Alembic migration file",
            "Run: alembic upgrade head and verify with EXPLAIN ANALYZE"
        ]
    },
    {
        "title": "shadcn/ui component not rendering",
        "category": "UI",
        "severity": "low",
        "symptoms": "Component imports fine but renders as unstyled HTML or throws hydration error.",
        "cause": "Missing Tailwind config paths or incorrect CSS variable setup.",
        "tags": ["shadcn", "Tailwind", "Next.js"],
        "steps": [
            "Verify tailwind.config.ts includes: content: ['./components/ui/**/*.{ts,tsx}']",
            "Check globals.css has :root CSS variables defined",
            "Run: npx shadcn-ui@latest init to re-scaffold config",
            "Restart dev server and clear .next cache: rm -rf .next"
        ]
    },
    {
        "title": "PDF export missing styles",
        "category": "Performance",
        "severity": "low",
        "symptoms": "Exported PDF shows plain unstyled text — no fonts, no colors.",
        "cause": "ReportLab cannot resolve relative CSS paths or external font URLs.",
        "tags": ["ReportLab", "PDF", "Python"],
        "steps": [
            "Use absolute paths for assets: base_url=os.path.dirname(__file__)",
            "Embed fonts as base64 in the PDF generation code",
            "Test with a minimal PDF first to isolate the issue",
            "Check reportlab version: python -m pip show reportlab"
        ]
    },
    {
        "title": "SQLAlchemy DetachedInstanceError",
        "category": "Database",
        "severity": "high",
        "symptoms": "Error: Instance is not bound to a Session when accessing related objects.",
        "cause": "Accessing lazy-loaded relationships after the DB session has closed.",
        "tags": ["SQLAlchemy", "ORM", "session"],
        "steps": [
            "Use joinedload() or selectinload() to eagerly load relationships",
            "Example: db.query(Issue).options(joinedload(Issue.solutions)).all()",
            "Or keep the session open longer using context managers",
            "Set expire_on_commit=False in SessionLocal if needed"
        ]
    },
    {
        "title": "Alembic migration conflict",
        "category": "Database",
        "severity": "medium",
        "symptoms": "alembic upgrade head fails with 'Multiple heads found' error.",
        "cause": "Two migration files with the same parent revision (merge conflict).",
        "tags": ["Alembic", "migrations", "PostgreSQL"],
        "steps": [
            "Run: alembic heads to see all conflicting heads",
            "Create a merge migration: alembic merge heads -m 'merge'",
            "Run: alembic upgrade head again",
            "Verify with: alembic current"
        ]
    },
    {
        "title": "Next.js 404 on page refresh",
        "category": "Network",
        "severity": "medium",
        "symptoms": "Direct URL access or page refresh returns 404 on deployed Next.js app.",
        "cause": "Server not configured to serve index.html for all routes (SPA fallback missing).",
        "tags": ["Next.js", "deployment", "routing"],
        "steps": [
            "Ensure you are using Next.js App Router — it handles this automatically",
            "For Nginx: add try_files $uri $uri/ /index.html in location block",
            "For static export: set output: 'export' in next.config.js",
            "Redeploy after config changes"
        ]
    },
    {
        "title": "Pydantic validation error on API request",
        "category": "Auth",
        "severity": "low",
        "symptoms": "API returns 422 Unprocessable Entity with validation error details.",
        "cause": "Request body does not match the expected Pydantic schema.",
        "tags": ["Pydantic", "FastAPI", "validation"],
        "steps": [
            "Check the error response body — it lists the exact field and issue",
            "Ensure frontend sends correct Content-Type: application/json header",
            "Match field names exactly — Pydantic is case-sensitive",
            "Use Optional[str] = None for fields that may be absent"
        ]
    },
    {
        "title": "React hydration mismatch error",
        "category": "UI",
        "severity": "medium",
        "symptoms": "Console error: Hydration failed because the initial UI does not match server-rendered HTML.",
        "cause": "Component renders differently on server vs client (e.g., using window or Date).",
        "tags": ["Next.js", "React", "SSR"],
        "steps": [
            "Wrap client-only code in useEffect to run only on the client",
            "Use dynamic import with ssr: false for components that use browser APIs",
            "Avoid rendering Math.random() or Date.now() directly in JSX",
            "Add suppressHydrationWarning to the element as a last resort"
        ]
    },
    {
        "title": "FastAPI background task not running",
        "category": "Performance",
        "severity": "medium",
        "symptoms": "Background task is added but never executes or silently fails.",
        "cause": "Exception inside background task is swallowed — no error is surfaced.",
        "tags": ["FastAPI", "background tasks", "async"],
        "steps": [
            "Wrap background task body in try/except and log errors explicitly",
            "Ensure the task function is async if using await inside it",
            "Check that the BackgroundTasks parameter is declared correctly in the route",
            "For heavy tasks, use Celery + Redis instead of FastAPI BackgroundTasks"
        ]
    },
    {
        "title": "Environment variable not loading",
        "category": "Auth",
        "severity": "low",
        "symptoms": "os.getenv() returns None even though .env file exists.",
        "cause": "python-dotenv load_dotenv() not called before accessing env vars.",
        "tags": ["python-dotenv", "env", "config"],
        "steps": [
            "Add from dotenv import load_dotenv and load_dotenv() at top of main.py",
            "Ensure .env file is in the same directory as where you run uvicorn",
            "Check for typos in variable names — they are case-sensitive",
            "Never commit .env to git — add it to .gitignore"
        ]
    },
    {
        "title": "Tailwind CSS classes not applying",
        "category": "UI",
        "severity": "low",
        "symptoms": "Tailwind classes are in the HTML but styles have no effect in the browser.",
        "cause": "Tailwind is purging the classes because file paths are not in content config.",
        "tags": ["Tailwind", "CSS", "Next.js"],
        "steps": [
            "Check tailwind.config.ts content array includes all file types",
            "Add './app/**/*.{js,ts,jsx,tsx}' and './components/**/*.{js,ts,jsx,tsx}'",
            "Restart the dev server after config changes",
            "Avoid dynamically constructing class names like 'text-' + color"
        ]
    },
    {
        "title": "SQLite database locked error",
        "category": "Database",
        "severity": "high",
        "symptoms": "OperationalError: database is locked when running concurrent requests.",
        "cause": "SQLite does not support multiple concurrent writers.",
        "tags": ["SQLite", "concurrency", "database"],
        "steps": [
            "Add check_same_thread=False to SQLite connect_args",
            "Set WAL mode: PRAGMA journal_mode=WAL via SQLAlchemy event listener",
            "For production with concurrency, migrate to PostgreSQL",
            "Use connection pooling with StaticPool for single-thread testing"
        ]
    },
    {
        "title": "API response too slow — no caching",
        "category": "Performance",
        "severity": "medium",
        "symptoms": "Same API endpoint called repeatedly returns slow responses every time.",
        "cause": "No caching layer — every request hits the database.",
        "tags": ["caching", "FastAPI", "performance"],
        "steps": [
            "Install fastapi-cache2: pip install fastapi-cache2[redis]",
            "Add @cache() decorator to slow endpoints",
            "For simple cases, use an in-memory dict with TTL",
            "Cache search results for common queries for 60 seconds"
        ]
    },
    {
        "title": "Next.js Image component not loading",
        "category": "UI",
        "severity": "low",
        "symptoms": "next/image shows broken image or throws hostname not configured error.",
        "cause": "External image hostname not whitelisted in next.config.js.",
        "tags": ["Next.js", "images", "config"],
        "steps": [
            "Add images.remotePatterns in next.config.js for each external domain",
            "Example: { protocol: 'https', hostname: 'example.com' }",
            "For local images, use public/ folder and reference as /image.png",
            "Restart dev server after next.config.js changes"
        ]
    },
    {
        "title": "CORS preflight request blocked",
        "category": "Network",
        "severity": "medium",
        "symptoms": "OPTIONS request returns 405 Method Not Allowed before the actual request.",
        "cause": "Server does not handle OPTIONS preflight requests from CORS.",
        "tags": ["CORS", "HTTP", "FastAPI"],
        "steps": [
            "Ensure CORSMiddleware is added before any other middleware in main.py",
            "Set allow_methods to include OPTIONS explicitly or use ['*']",
            "Check that allow_headers includes the custom headers your frontend sends",
            "Test with: curl -X OPTIONS http://localhost:8000/issues/search -v"
        ]
    },
    {
        "title": "Uvicorn port already in use",
        "category": "Network",
        "severity": "low",
        "symptoms": "ERROR: [Errno 10048] error while attempting to bind on address: port is already in use.",
        "cause": "A previous uvicorn process is still running on the same port.",
        "tags": ["uvicorn", "port", "Windows"],
        "steps": [
            "Find the process: netstat -ano | findstr :8000",
            "Kill it: taskkill /PID <pid> /F",
            "Or run on a different port: uvicorn main:app --port 8001",
            "Use --reload flag during development to auto-restart"
        ]
    },
    {
        "title": "Alembic cannot find models for autogenerate",
        "category": "Database",
        "severity": "medium",
        "symptoms": "alembic revision --autogenerate produces empty migration with no changes detected.",
        "cause": "Models are not imported in env.py so Alembic cannot detect them.",
        "tags": ["Alembic", "SQLAlchemy", "migrations"],
        "steps": [
            "Open alembic/env.py and import your models: from models import Base",
            "Set target_metadata = Base.metadata",
            "Ensure models.py imports all model classes so they register on Base",
            "Re-run: alembic revision --autogenerate -m 'description'"
        ]
    },
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Issue).count()
        if existing > 0:
            print(f"Database already has {existing} issues. Skipping seed.")
            return

        for data in SEED_DATA:
            issue = Issue(
                title=data["title"],
                category=data["category"],
                severity=data["severity"],
                symptoms=data["symptoms"],
                cause=data["cause"],
            )
            db.add(issue)
            db.flush()

            for i, step_text in enumerate(data["steps"], start=1):
                solution = Solution(
                    issue_id=issue.id,
                    step_number=i,
                    description=step_text
                )
                db.add(solution)

            for tag_name in data["tags"]:
                tag = Tag(issue_id=issue.id, name=tag_name)
                db.add(tag)

        db.commit()
        print(f"Successfully seeded {len(SEED_DATA)} issues into the database.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
