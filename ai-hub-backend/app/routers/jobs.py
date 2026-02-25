"""
Job board endpoints for AI job listings.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.job import JobListing

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class JobListingResponse(BaseModel):
    """Public job listing response."""

    id: int
    title: str
    company: str
    location: str
    job_type: str
    level: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "EUR"
    description: str
    requirements: Optional[str] = None
    tags: Optional[list[str]] = None
    apply_url: str
    company_url: Optional[str] = None
    listing_type: str = "standard"
    posted_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobListingCreate(BaseModel):
    """Schema for creating a job listing."""

    title: str
    company: str
    location: str
    job_type: str
    level: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "EUR"
    description: str
    requirements: Optional[str] = None
    tags: Optional[list[str]] = None
    apply_url: str
    company_url: Optional[str] = None
    listing_type: str = "standard"
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    contact_email: str


class JobListingUpdate(BaseModel):
    """Schema for updating a job listing (all fields optional)."""

    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    tags: Optional[list[str]] = None
    apply_url: Optional[str] = None
    company_url: Optional[str] = None
    listing_type: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    contact_email: Optional[str] = None


class JobListingsPage(BaseModel):
    """Paginated list of job listings."""

    items: list[JobListingResponse]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Auth dependency (reuses the same pattern as admin.py)
# ---------------------------------------------------------------------------


def verify_api_key(x_api_key: str = Header(...)):
    """Verify admin API key."""
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(status_code=500, detail="Admin API key not configured")
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=JobListingsPage)
def list_jobs(
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    location: Optional[str] = Query(None, description="Filter by location (substring match)"),
    level: Optional[str] = Query(None, description="Filter by seniority level"),
    search: Optional[str] = Query(None, description="Search in title, company, description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    List active job listings with optional filters.

    Results are ordered by listing_type (premium first, then featured, then standard)
    and by posted_at descending.
    """
    query = db.query(JobListing).filter(JobListing.is_active == True)  # noqa: E712

    if job_type:
        query = query.filter(JobListing.job_type == job_type)
    if location:
        query = query.filter(JobListing.location.ilike(f"%{location}%"))
    if level:
        query = query.filter(JobListing.level == level)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            JobListing.title.ilike(pattern)
            | JobListing.company.ilike(pattern)
            | JobListing.description.ilike(pattern)
        )

    total = query.count()

    # Order: premium > featured > standard, then newest first
    from sqlalchemy import case

    listing_order = case(
        (JobListing.listing_type == "premium", 0),
        (JobListing.listing_type == "featured", 1),
        else_=2,
    )
    items = (
        query.order_by(listing_order, JobListing.posted_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return JobListingsPage(
        items=[JobListingResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=JobListingResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get a single job listing by ID."""
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job listing {job_id} not found")
    return JobListingResponse.model_validate(job)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.post("", response_model=JobListingResponse, status_code=201)
def create_job(
    data: JobListingCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """Create a new job listing. Requires X-API-Key header."""
    job = JobListing(
        title=data.title,
        company=data.company,
        location=data.location,
        job_type=data.job_type,
        level=data.level,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        salary_currency=data.salary_currency,
        description=data.description,
        requirements=data.requirements,
        tags=data.tags,
        apply_url=data.apply_url,
        company_url=data.company_url,
        listing_type=data.listing_type,
        posted_at=data.posted_at or datetime.utcnow(),
        expires_at=data.expires_at,
        contact_email=data.contact_email,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobListingResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobListingResponse)
def update_job(
    job_id: int,
    data: JobListingUpdate,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """Update a job listing. Requires X-API-Key header."""
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job listing {job_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return JobListingResponse.model_validate(job)


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """Soft-delete a job listing (set is_active=False). Requires X-API-Key header."""
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job listing {job_id} not found")

    job.is_active = False
    db.commit()
    return {"status": "deactivated", "id": job_id}
