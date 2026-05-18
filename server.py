"""
SpaceLink CRM — FastAPI backend
Tables: users, leads, sources, visits, activities

Requires:
  pip install fastapi uvicorn psycopg2-binary python-dotenv

Env vars (or .env file):
  DATABASE_URL=postgresql://crm_user:password@localhost/crm_sli_db
  PORT=8000  (optional, default 8000)
"""

import hashlib
import os
import re
import uuid
from contextlib import asynccontextmanager, contextmanager
from typing import Any, Optional

import psycopg2
import psycopg2.extras
import psycopg2.pool
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://crm_user:password@localhost/crm_sli_db"
)

_pool: psycopg2.pool.SimpleConnectionPool | None = None


def get_pool() -> psycopg2.pool.SimpleConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.SimpleConnectionPool(
            1, 20, DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor
        )
    return _pool


@contextmanager
def db():
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def rows(conn, query: str, params=()) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(query, params)
        return [dict(r) for r in cur.fetchall()]


def row(conn, query: str, params=()) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(query, params)
        r = cur.fetchone()
        return dict(r) if r else None


def execute(conn, query: str, params=()):
    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.rowcount


def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def new_id() -> str:
    return str(uuid.uuid4())


# ── App ────────────────────────────────────────────────────────────────────────

# Covers: production domain, localhost dev, Vercel/Cloudflare previews
CORS_ORIGIN_RE = re.compile(
    r"(https://.*\.avlokai\.com"
    r"|https://.*\.(vercel\.app|pages\.dev)"
    r"|http://localhost:\d+"
    r"|http://127\.0\.0\.1:\d+)"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    with db() as conn:
        execute(conn, "ALTER TABLE users ADD COLUMN IF NOT EXISTS pending BOOLEAN NOT NULL DEFAULT FALSE")
    yield


app = FastAPI(title="SpaceLink CRM API", lifespan=lifespan)

# Layer 1: middleware — normal responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def _cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin", "")
    return {
        "Access-Control-Allow-Origin": origin or "*",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
    }


# Layer 2: exception handler — error responses must carry CORS headers manually
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=_cors_headers(request),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=_cors_headers(request),
    )

LEAD_COLS = (
    "id, lead_name, phone, alternate_phone, email, source_id, "
    "assigned_to, attended_by, status, budget, preferred_location, "
    "property_type, bhk, notes, referrer_name, referrer_phone, "
    "created_by, created_at, updated_at"
)


# ── Auth ───────────────────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/login")
def login(req: LoginRequest) -> dict:
    with db() as conn:
        user = row(
            conn,
            "SELECT id, name, email, role, active FROM users "
            "WHERE email = %s AND password_hash = %s",
            (req.email, hash_pw(req.password)),
        )
    if not user or not user["active"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "userId": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
    }


class SignupRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    role: str = "sales"
    password_hash: str  # plain password from form


@app.post("/api/auth/signup")
def signup(req: SignupRequest) -> dict:
    with db() as conn:
        existing = row(conn, "SELECT id FROM users WHERE email = %s", (req.email,))
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        row(
            conn,
            f"INSERT INTO users (id, name, email, phone, role, password_hash, active, pending) "
            f"VALUES (%s,%s,%s,%s,%s,%s,FALSE,TRUE) RETURNING {USER_COLS}",
            (new_id(), req.name, req.email, req.phone or "", req.role, hash_pw(req.password_hash)),
        )
    return {"message": "Signup request submitted. Awaiting admin approval."}


# ── Users ──────────────────────────────────────────────────────────────────────

USER_COLS = "id, name, email, phone, role, active, pending"


class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    role: str = "sales"
    password_hash: str  # plain password sent from the form


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    password_hash: Optional[str] = None  # plain password, optional on edit


@app.get("/api/users/pending")
def get_pending_users() -> list:
    with db() as conn:
        return rows(conn, f"SELECT {USER_COLS} FROM users WHERE pending = TRUE ORDER BY name")


@app.get("/api/users/active")
def get_active_users() -> list:
    with db() as conn:
        return rows(conn, f"SELECT {USER_COLS} FROM users WHERE active = TRUE ORDER BY name")


@app.get("/api/users")
def get_all_users() -> list:
    with db() as conn:
        return rows(conn, f"SELECT {USER_COLS} FROM users ORDER BY name")


@app.post("/api/users")
def create_user(data: UserCreate) -> dict:
    with db() as conn:
        user = row(
            conn,
            f"INSERT INTO users (id, name, email, phone, role, password_hash, active) "
            f"VALUES (%s,%s,%s,%s,%s,%s,TRUE) RETURNING {USER_COLS}",
            (new_id(), data.name, data.email, data.phone or "",
             data.role, hash_pw(data.password_hash)),
        )
    return user


@app.put("/api/users/{user_id}")
def update_user(user_id: str, data: UserUpdate) -> dict:
    fields, values = [], []
    if data.name is not None:
        fields.append("name = %s"); values.append(data.name)
    if data.email is not None:
        fields.append("email = %s"); values.append(data.email)
    if data.phone is not None:
        fields.append("phone = %s"); values.append(data.phone)
    if data.role is not None:
        fields.append("role = %s"); values.append(data.role)
    if data.password_hash:
        fields.append("password_hash = %s"); values.append(hash_pw(data.password_hash))
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    values.append(user_id)
    with db() as conn:
        user = row(
            conn,
            f"UPDATE users SET {', '.join(fields)} WHERE id = %s RETURNING {USER_COLS}",
            values,
        )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.delete("/api/users/{user_id}")
def delete_user(user_id: str) -> dict:
    with db() as conn:
        count = execute(conn, "DELETE FROM users WHERE id = %s", (user_id,))
    if count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True}


@app.post("/api/users/{user_id}/approve")
def approve_user(user_id: str) -> dict:
    with db() as conn:
        user = row(
            conn,
            f"UPDATE users SET active = TRUE, pending = FALSE WHERE id = %s RETURNING {USER_COLS}",
            (user_id,),
        )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.patch("/api/users/{user_id}/toggle")
def toggle_user(user_id: str) -> dict:
    with db() as conn:
        user = row(
            conn,
            f"UPDATE users SET active = NOT active WHERE id = %s RETURNING {USER_COLS}",
            (user_id,),
        )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Sources ────────────────────────────────────────────────────────────────────


class SourceCreate(BaseModel):
    source_name: str


@app.get("/api/sources")
def get_sources() -> list:
    with db() as conn:
        return rows(conn, "SELECT id, source_name FROM sources ORDER BY source_name")


@app.post("/api/sources")
def create_source(data: SourceCreate) -> dict:
    with db() as conn:
        source = row(
            conn,
            "INSERT INTO sources (id, source_name) VALUES (%s,%s) RETURNING id, source_name",
            (new_id(), data.source_name),
        )
    return source


# ── Leads ──────────────────────────────────────────────────────────────────────


class LeadCreate(BaseModel):
    lead_name: str
    phone: str
    alternate_phone: Optional[str] = ""
    email: Optional[str] = ""
    source_id: str
    assigned_to: str
    attended_by: Optional[str] = ""
    status: Optional[str] = "new"
    budget: Optional[str] = ""
    preferred_location: Optional[str] = ""
    property_type: Optional[str] = ""
    bhk: Optional[str] = ""
    notes: Optional[str] = ""
    referrer_name: Optional[str] = ""
    referrer_phone: Optional[str] = ""
    created_by: Optional[str] = ""
    custom_source: Optional[str] = ""  # ignored server-side; caller resolves before posting


class LeadUpdate(BaseModel):
    lead_name: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    source_id: Optional[str] = None
    assigned_to: Optional[str] = None
    attended_by: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[str] = None
    preferred_location: Optional[str] = None
    property_type: Optional[str] = None
    bhk: Optional[str] = None
    notes: Optional[str] = None
    referrer_name: Optional[str] = None
    referrer_phone: Optional[str] = None
    # audit fields — not written to leads table
    userId: Optional[str] = None
    status_note: Optional[str] = None


# Order matters: specific paths before /{lead_id}

@app.get("/api/leads/check-duplicate")
def check_duplicate(
    phone: Optional[str] = None,
    alternate_phone: Optional[str] = None,
    exclude_id: Optional[str] = None,
) -> list:
    phone_conds, values = [], []
    for p in [phone, alternate_phone]:
        if p:
            phone_conds.append("phone = %s"); values.append(p)
            phone_conds.append("alternate_phone = %s"); values.append(p)
    if not phone_conds:
        return []
    query = f"SELECT {LEAD_COLS} FROM leads WHERE ({' OR '.join(phone_conds)})"
    if exclude_id:
        query += " AND id != %s"
        values.append(exclude_id)
    with db() as conn:
        return rows(conn, query, values)


@app.get("/api/leads/today")
def get_today_leads() -> list:
    with db() as conn:
        return rows(
            conn,
            f"SELECT {LEAD_COLS} FROM leads WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC",
        )


@app.get("/api/leads/counts-by-assignee")
def get_counts_by_assignee() -> dict:
    with db() as conn:
        result = rows(conn, "SELECT assigned_to, COUNT(*) AS count FROM leads GROUP BY assigned_to")
    return {r["assigned_to"]: r["count"] for r in result}


@app.get("/api/leads")
def get_leads(
    search: Optional[str] = None,
    source_id: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> list:
    conds, values = [], []
    if search:
        conds.append("(lead_name ILIKE %s OR phone ILIKE %s OR email ILIKE %s)")
        values.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    if source_id:
        conds.append("source_id = %s"); values.append(source_id)
    if status:
        conds.append("status = %s"); values.append(status)
    if assigned_to:
        conds.append("assigned_to = %s"); values.append(assigned_to)
    if date_from:
        conds.append("DATE(created_at) >= %s"); values.append(date_from)
    if date_to:
        conds.append("DATE(created_at) <= %s"); values.append(date_to)
    where = f"WHERE {' AND '.join(conds)}" if conds else ""
    with db() as conn:
        return rows(conn, f"SELECT {LEAD_COLS} FROM leads {where} ORDER BY created_at DESC", values)


@app.get("/api/leads/{lead_id}")
def get_lead(lead_id: str) -> dict:
    with db() as conn:
        lead = row(conn, f"SELECT {LEAD_COLS} FROM leads WHERE id = %s", (lead_id,))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@app.post("/api/leads")
def create_lead(data: LeadCreate) -> dict:
    lead_id = new_id()
    with db() as conn:
        lead = row(
            conn,
            f"""INSERT INTO leads (
                id, lead_name, phone, alternate_phone, email, source_id,
                assigned_to, attended_by, status, budget, preferred_location,
                property_type, bhk, notes, referrer_name, referrer_phone, created_by
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING {LEAD_COLS}""",
            (
                lead_id, data.lead_name, data.phone, data.alternate_phone or "",
                data.email or "", data.source_id, data.assigned_to,
                data.attended_by or "", data.status or "new",
                data.budget or "", data.preferred_location or "",
                data.property_type or "", data.bhk or "", data.notes or "",
                data.referrer_name or "", data.referrer_phone or "", data.created_by or "",
            ),
        )
        _log_activity(conn, lead_id, "lead_created", f"Lead created: {data.lead_name}", data.created_by)
    return lead


@app.put("/api/leads/{lead_id}")
def update_lead(lead_id: str, data: LeadUpdate) -> dict:
    # Fields allowed to update in leads table
    allowed = {
        "lead_name", "phone", "alternate_phone", "email", "source_id",
        "assigned_to", "attended_by", "status", "budget", "preferred_location",
        "property_type", "bhk", "notes", "referrer_name", "referrer_phone",
    }
    with db() as conn:
        existing = row(conn, "SELECT status FROM leads WHERE id = %s", (lead_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Lead not found")

        update_dict = {k: v for k, v in data.dict(exclude_none=True).items() if k in allowed}
        if not update_dict:
            # No lead fields to update — still may need to log activity (e.g. note added)
            lead = row(conn, f"SELECT {LEAD_COLS} FROM leads WHERE id = %s", (lead_id,))
        else:
            fields = [f"{k} = %s" for k in update_dict]
            fields.append("updated_at = NOW()")
            values = list(update_dict.values()) + [lead_id]
            lead = row(
                conn,
                f"UPDATE leads SET {', '.join(fields)} WHERE id = %s RETURNING {LEAD_COLS}",
                values,
            )

        old_status = existing["status"]
        new_status = data.status

        if new_status and new_status != old_status:
            desc = f"Status changed from {old_status} to {new_status}"
            if data.status_note:
                desc += f": {data.status_note}"
            _log_activity(conn, lead_id, "status_changed", desc, data.userId)
        elif update_dict:
            _log_activity(conn, lead_id, "lead_updated", "Lead details updated", data.userId)

    return lead


@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: str, userId: Optional[str] = None) -> dict:
    with db() as conn:
        count = execute(conn, "DELETE FROM leads WHERE id = %s", (lead_id,))
    if count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}


# ── Visits ─────────────────────────────────────────────────────────────────────

VISIT_COLS = "id, lead_id, visit_date, visit_time, site_location, notes, created_by, created_at"


class VisitCreate(BaseModel):
    lead_id: str
    visit_date: str
    visit_time: str
    site_location: Optional[str] = "Level Up Tower - Main Site"
    notes: Optional[str] = ""
    created_by: Optional[str] = ""


@app.get("/api/visits/today")
def get_today_visits() -> list:
    with db() as conn:
        return rows(
            conn,
            f"SELECT {VISIT_COLS} FROM visits WHERE visit_date = CURRENT_DATE ORDER BY visit_time",
        )


@app.get("/api/visits")
def get_visits(lead_id: Optional[str] = None) -> list:
    with db() as conn:
        if lead_id:
            return rows(
                conn,
                f"SELECT {VISIT_COLS} FROM visits WHERE lead_id = %s ORDER BY visit_date DESC, visit_time DESC",
                (lead_id,),
            )
        return rows(
            conn,
            f"SELECT {VISIT_COLS} FROM visits ORDER BY visit_date DESC, visit_time DESC",
        )


@app.post("/api/visits")
def create_visit(data: VisitCreate) -> dict:
    visit_id = new_id()
    with db() as conn:
        visit = row(
            conn,
            f"""INSERT INTO visits (id, lead_id, visit_date, visit_time, site_location, notes, created_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING {VISIT_COLS}""",
            (
                visit_id, data.lead_id, data.visit_date, data.visit_time,
                data.site_location or "Level Up Tower - Main Site",
                data.notes or "", data.created_by or "",
            ),
        )
        _log_activity(
            conn, data.lead_id, "visit_logged",
            f"Site visit logged at {data.site_location} on {data.visit_date}",
            data.created_by,
        )
        execute(conn, "UPDATE leads SET updated_at = NOW() WHERE id = %s", (data.lead_id,))
    return visit


# ── Activities ─────────────────────────────────────────────────────────────────

ACT_COLS = "id, lead_id, activity_type, description, performed_by, created_at"


class ActivityCreate(BaseModel):
    lead_id: str
    activity_type: str
    description: str
    performed_by: Optional[str] = ""


def _log_activity(conn, lead_id: str, activity_type: str, description: str, performed_by: str | None):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO activities (id, lead_id, activity_type, description, performed_by) "
            "VALUES (%s,%s,%s,%s,%s)",
            (new_id(), lead_id, activity_type, description, performed_by or ""),
        )


@app.get("/api/activities")
def get_activities(
    lead_id: Optional[str] = None,
    limit: Optional[int] = None,
) -> list:
    with db() as conn:
        if lead_id:
            return rows(
                conn,
                f"SELECT {ACT_COLS} FROM activities WHERE lead_id = %s ORDER BY created_at DESC",
                (lead_id,),
            )
        if limit:
            return rows(
                conn,
                f"SELECT {ACT_COLS} FROM activities ORDER BY created_at DESC LIMIT %s",
                (limit,),
            )
        return rows(conn, f"SELECT {ACT_COLS} FROM activities ORDER BY created_at DESC")


@app.post("/api/activities")
def create_activity(data: ActivityCreate) -> dict:
    act_id = new_id()
    with db() as conn:
        activity = row(
            conn,
            f"INSERT INTO activities (id, lead_id, activity_type, description, performed_by) "
            f"VALUES (%s,%s,%s,%s,%s) RETURNING {ACT_COLS}",
            (act_id, data.lead_id, data.activity_type, data.description, data.performed_by or ""),
        )
        execute(conn, "UPDATE leads SET updated_at = NOW() WHERE id = %s", (data.lead_id,))
    return activity


# ── Dashboard ──────────────────────────────────────────────────────────────────


@app.get("/api/dashboard/stats")
def get_dashboard_stats() -> dict:
    with db() as conn:
        total = row(conn, "SELECT COUNT(*) AS n FROM leads")["n"]
        today_walkins = row(
            conn,
            "SELECT COUNT(*) AS n FROM leads WHERE source_id = 'src_walkin' AND DATE(created_at) = CURRENT_DATE",
        )["n"]
        followups_due = row(
            conn,
            "SELECT COUNT(*) AS n FROM leads WHERE status = 'followup'",
        )["n"]
        new_today = row(
            conn,
            "SELECT COUNT(*) AS n FROM leads WHERE DATE(created_at) = CURRENT_DATE",
        )["n"]
        by_status = {
            r["status"]: r["count"]
            for r in rows(conn, "SELECT status, COUNT(*) AS count FROM leads GROUP BY status")
        }
        by_source = {
            r["source_id"]: r["count"]
            for r in rows(conn, "SELECT source_id, COUNT(*) AS count FROM leads GROUP BY source_id")
        }
        by_assignee = {
            r["assigned_to"]: r["count"]
            for r in rows(conn, "SELECT assigned_to, COUNT(*) AS count FROM leads GROUP BY assigned_to")
        }
    return {
        "total": total,
        "todayWalkIns": today_walkins,
        "followUpsDue": followups_due,
        "newToday": new_today,
        "byStatus": by_status,
        "bySource": by_source,
        "byAssignee": by_assignee,
    }


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)