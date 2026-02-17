"""
YouTube video endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, Video
from app.schemas.video import VideoResponse, VideoFeedResponse
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/videos", tags=["videos"])


def _langs_with_data(videos: list[Video]) -> list[str]:
    """Return language codes that have content."""
    langs = {"de", "en"}
    for v in videos:
        if v.translations and isinstance(v.translations, dict):
            langs.update(v.translations.keys())
    return [lang for lang in SUPPORTED_LANGUAGES if lang in langs]


def video_to_response(video: Video, language: str) -> VideoResponse:
    """Convert video to API response."""
    return VideoResponse(
        id=video.id,
        videoId=video.video_id,
        title=get_field(video, "title", language) or "",
        summary=get_field(video, "summary", language) or "",
        channelName=video.channel_name,
        thumbnailUrl=video.thumbnail_url,
        publishedAt=video.published_at,
        durationSeconds=video.duration_seconds,
        durationFormatted=video.duration_formatted,
        viewCount=video.view_count,
        likeCount=video.like_count,
        tags=video.tags,
        category=video.category,
    )


@router.get("/{week_id}", response_model=VideoFeedResponse)
def get_videos(week_id: str, db: Session = Depends(get_db)):
    """Get YouTube videos for a specific week."""
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    # Get videos for this week
    videos = db.query(Video).filter(Video.week_id == week_id).all()

    available_langs = _langs_with_data(videos)
    result = {lang: [video_to_response(v, lang) for v in videos] for lang in available_langs}
    return result


@router.get("/{week_id}/{video_id}", response_model=VideoResponse)
def get_video(week_id: str, video_id: str, language: str = "en", db: Session = Depends(get_db)):
    """Get a specific video by YouTube video ID."""
    video = (
        db.query(Video)
        .filter(Video.week_id == week_id, Video.video_id == video_id)
        .first()
    )

    if not video:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found")

    return video_to_response(video, language)
