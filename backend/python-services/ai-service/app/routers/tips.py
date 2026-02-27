from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import structlog
from datetime import datetime

from ..services.tip_generator import TipGenerator
from ..services.content_curator import ContentCurator
from ..models.schemas import CookingTip, TipRequest, TipCategory

logger = structlog.get_logger()
router = APIRouter()

class TipResponse(BaseModel):
    tip: CookingTip
    context: Optional[Dict[str, Any]] = None
    generated_at: str
    source: str

class TipsCollectionResponse(BaseModel):
    tips: List[CookingTip]
    total_count: int
    category: Optional[str] = None
    personalized: bool
    generated_at: str

@router.post("/generate", response_model=TipResponse)
async def generate_cooking_tip(request: TipRequest):
    """
    Generate a personalized cooking tip using AI
    
    This endpoint uses language models to create contextual cooking tips
    based on user skill level, current recipe, and learning preferences.
    """
    try:
        logger.info(
            "Generating cooking tip",
            user_id=request.user_id,
            category=request.category,
            skill_level=request.skill_level
        )
        
        tip_generator = TipGenerator()
        tip = await tip_generator.generate_personalized_tip(
            user_id=request.user_id,
            category=request.category,
            skill_level=request.skill_level,
            context=request.context,
            recipe_id=request.current_recipe_id
        )
        
        return TipResponse(
            tip=tip,
            context=request.context,
            generated_at=datetime.utcnow().isoformat(),
            source="ai_generated"
        )
        
    except Exception as e:
        logger.error(f"Failed to generate cooking tip: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate cooking tip"
        )

@router.get("/random", response_model=TipResponse)
async def get_random_tip(
    user_id: Optional[int] = Query(None, description="User ID for personalization"),
    category: Optional[str] = Query(None, description="Tip category filter"),
    skill_level: Optional[str] = Query(None, regex="^(beginner|intermediate|advanced)$")
):
    """Get a random cooking tip, optionally personalized"""
    try:
        content_curator = ContentCurator()
        tip = await content_curator.get_random_tip(
            user_id=user_id,
            category=category,
            skill_level=skill_level
        )
        
        return TipResponse(
            tip=tip,
            generated_at=datetime.utcnow().isoformat(),
            source="curated_content"
        )
        
    except Exception as e:
        logger.error(f"Failed to get random tip: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get random tip"
        )

@router.get("/daily/{user_id}", response_model=TipResponse)
async def get_daily_tip(user_id: int):
    """Get the daily tip for a specific user"""
    try:
        content_curator = ContentCurator()
        daily_tip = await content_curator.get_daily_tip(user_id)
        
        return TipResponse(
            tip=daily_tip,
            generated_at=datetime.utcnow().isoformat(),
            source="daily_curated"
        )
        
    except Exception as e:
        logger.error(f"Failed to get daily tip: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get daily tip"
        )

@router.get("/collection", response_model=TipsCollectionResponse)
async def get_tips_collection(
    user_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    skill_level: Optional[str] = Query(None, regex="^(beginner|intermediate|advanced)$"),
    limit: int = Query(10, ge=1, le=50),
    personalized: bool = Query(True, description="Apply personalization if user_id provided")
):
    """Get a collection of cooking tips with optional filters"""
    try:
        content_curator = ContentCurator()
        tips = await content_curator.get_tips_collection(
            user_id=user_id if personalized else None,
            category=category,
            skill_level=skill_level,
            limit=limit
        )
        
        return TipsCollectionResponse(
            tips=tips,
            total_count=len(tips),
            category=category,
            personalized=personalized and user_id is not None,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get tips collection: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get tips collection"
        )

@router.get("/contextual/{recipe_id}")
async def get_contextual_tips(
    recipe_id: str,
    user_id: Optional[int] = Query(None),
    limit: int = Query(5, ge=1, le=20)
):
    """Get tips relevant to a specific recipe"""
    try:
        tip_generator = TipGenerator()
        contextual_tips = await tip_generator.get_recipe_specific_tips(
            recipe_id=recipe_id,
            user_id=user_id,
            limit=limit
        )
        
        return {
            "recipe_id": recipe_id,
            "tips": contextual_tips,
            "count": len(contextual_tips),
            "personalized": user_id is not None
        }
        
    except Exception as e:
        logger.error(f"Failed to get contextual tips: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get contextual tips"
        )

@router.post("/generate/batch")
async def generate_batch_tips(
    requests: List[TipRequest],
    parallel: bool = Query(True, description="Generate tips in parallel")
):
    """Generate multiple tips in batch for efficiency"""
    try:
        if len(requests) > 50:
            raise HTTPException(
                status_code=400,
                detail="Maximum 50 tip requests per batch"
            )
        
        tip_generator = TipGenerator()
        batch_tips = await tip_generator.generate_batch_tips(
            requests=requests,
            parallel=parallel
        )
        
        return {
            "batch_tips": batch_tips,
            "count": len(batch_tips),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to generate batch tips: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate batch tips"
        )

@router.get("/categories")
async def get_tip_categories():
    """Get available tip categories and their descriptions"""
    try:
        categories = await TipCategory.get_all_categories()
        
        return {
            "categories": categories,
            "total_count": len(categories),
            "default_category": "technique"
        }
        
    except Exception as e:
        logger.error(f"Failed to get tip categories: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get tip categories"
        )

@router.get("/trending")
async def get_trending_tips(
    time_window: str = Query("week", regex="^(day|week|month)$"),
    limit: int = Query(10, ge=1, le=50)
):
    """Get trending cooking tips based on user engagement"""
    try:
        content_curator = ContentCurator()
        trending_tips = await content_curator.get_trending_tips(
            time_window=time_window,
            limit=limit
        )
        
        return {
            "trending_tips": trending_tips,
            "time_window": time_window,
            "count": len(trending_tips),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get trending tips: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get trending tips"
        )

@router.post("/feedback/{tip_id}")
async def submit_tip_feedback(
    tip_id: str,
    user_id: int,
    helpful: bool,
    difficulty_accurate: Optional[bool] = None,
    comment: Optional[str] = None
):
    """Submit feedback on tip quality and helpfulness"""
    try:
        content_curator = ContentCurator()
        await content_curator.process_tip_feedback(
            tip_id=tip_id,
            user_id=user_id,
            helpful=helpful,
            difficulty_accurate=difficulty_accurate,
            comment=comment
        )
        
        return {
            "message": "Tip feedback processed successfully",
            "tip_id": tip_id,
            "will_improve_future_tips": True
        }
        
    except Exception as e:
        logger.error(f"Failed to process tip feedback: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process tip feedback"
        )