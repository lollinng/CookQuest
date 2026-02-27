from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import structlog

from ..services.recommendation_engine import RecommendationEngine
from ..services.user_profiler import UserProfiler
from ..models.schemas import (
    RecipeRecommendationRequest,
    RecipeRecommendation,
    UserContext,
    RecommendationFeedback
)

logger = structlog.get_logger()
router = APIRouter()

class RecipeRecommendationsResponse(BaseModel):
    recommendations: List[RecipeRecommendation]
    context: UserContext
    total_count: int
    algorithm_version: str
    generated_at: str

@router.post("/recipes", response_model=RecipeRecommendationsResponse)
async def get_recipe_recommendations(
    request: RecipeRecommendationRequest,
    limit: int = Query(10, ge=1, le=50, description="Maximum number of recommendations"),
    include_context: bool = Query(True, description="Include recommendation context")
):
    """
    Get personalized recipe recommendations for a user
    
    This endpoint uses machine learning to analyze user preferences, cooking history,
    skill level, and dietary restrictions to provide tailored recipe suggestions.
    """
    try:
        logger.info(
            "Generating recipe recommendations",
            user_id=request.user_id,
            limit=limit,
            preferences=request.preferences
        )
        
        # Get user profile and context
        user_profiler = UserProfiler()
        user_context = await user_profiler.build_user_context(
            user_id=request.user_id,
            preferences=request.preferences,
            current_skills=request.current_skills,
            dietary_restrictions=request.dietary_restrictions
        )
        
        # Generate recommendations
        recommendation_engine = RecommendationEngine()
        recommendations = await recommendation_engine.generate_recommendations(
            user_context=user_context,
            limit=limit,
            algorithm="hybrid_collaborative_content",
            include_explanations=include_context
        )
        
        return RecipeRecommendationsResponse(
            recommendations=recommendations,
            context=user_context if include_context else None,
            total_count=len(recommendations),
            algorithm_version="v2.1.0",
            generated_at=user_context.timestamp
        )
        
    except Exception as e:
        logger.error(f"Failed to generate recipe recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate recommendations"
        )

@router.get("/recipes/similar/{recipe_id}")
async def get_similar_recipes(
    recipe_id: str,
    user_id: int,
    limit: int = Query(5, ge=1, le=20),
    similarity_type: str = Query("content", regex="^(content|collaborative|hybrid)$")
):
    """Get recipes similar to a specific recipe"""
    try:
        recommendation_engine = RecommendationEngine()
        similar_recipes = await recommendation_engine.find_similar_recipes(
            recipe_id=recipe_id,
            user_id=user_id,
            limit=limit,
            similarity_type=similarity_type
        )
        
        return {
            "base_recipe_id": recipe_id,
            "similar_recipes": similar_recipes,
            "similarity_type": similarity_type,
            "count": len(similar_recipes)
        }
        
    except Exception as e:
        logger.error(f"Failed to find similar recipes: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to find similar recipes"
        )

@router.get("/recipes/trending")
async def get_trending_recipes(
    user_id: Optional[int] = Query(None),
    time_window: str = Query("week", regex="^(day|week|month)$"),
    limit: int = Query(10, ge=1, le=50)
):
    """Get trending recipes based on recent user activity"""
    try:
        recommendation_engine = RecommendationEngine()
        trending_recipes = await recommendation_engine.get_trending_recipes(
            user_id=user_id,
            time_window=time_window,
            limit=limit
        )
        
        return {
            "trending_recipes": trending_recipes,
            "time_window": time_window,
            "personalized": user_id is not None,
            "count": len(trending_recipes)
        }
        
    except Exception as e:
        logger.error(f"Failed to get trending recipes: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get trending recipes"
        )

@router.post("/recipes/batch")
async def get_batch_recommendations(
    user_ids: List[int],
    preferences: Optional[Dict[str, Any]] = None,
    limit_per_user: int = Query(5, ge=1, le=20)
):
    """Get recommendations for multiple users (batch processing)"""
    try:
        if len(user_ids) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 users per batch request"
            )
        
        recommendation_engine = RecommendationEngine()
        batch_results = await recommendation_engine.generate_batch_recommendations(
            user_ids=user_ids,
            global_preferences=preferences,
            limit_per_user=limit_per_user
        )
        
        return {
            "batch_recommendations": batch_results,
            "user_count": len(user_ids),
            "total_recommendations": sum(len(recs) for recs in batch_results.values())
        }
        
    except Exception as e:
        logger.error(f"Failed to generate batch recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate batch recommendations"
        )

@router.post("/feedback")
async def submit_recommendation_feedback(
    feedback: RecommendationFeedback
):
    """Submit feedback on recommendation quality to improve future suggestions"""
    try:
        recommendation_engine = RecommendationEngine()
        await recommendation_engine.process_feedback(feedback)
        
        # Update user profile based on feedback
        user_profiler = UserProfiler()
        await user_profiler.update_from_feedback(
            user_id=feedback.user_id,
            feedback=feedback
        )
        
        return {
            "message": "Feedback processed successfully",
            "feedback_id": feedback.recommendation_id,
            "will_improve_future_recommendations": True
        }
        
    except Exception as e:
        logger.error(f"Failed to process recommendation feedback: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process feedback"
        )

@router.get("/stats/{user_id}")
async def get_recommendation_stats(user_id: int):
    """Get recommendation performance stats for a user"""
    try:
        recommendation_engine = RecommendationEngine()
        stats = await recommendation_engine.get_user_recommendation_stats(user_id)
        
        return {
            "user_id": user_id,
            "stats": stats,
            "recommendation_accuracy": stats.get("accuracy", 0.0),
            "total_recommendations": stats.get("total_shown", 0),
            "conversion_rate": stats.get("conversion_rate", 0.0)
        }
        
    except Exception as e:
        logger.error(f"Failed to get recommendation stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get recommendation stats"
        )

@router.post("/recipes/{recipe_id}/explain")
async def explain_recommendation(
    recipe_id: str,
    user_id: int,
    detailed: bool = Query(False, description="Include detailed algorithm explanation")
):
    """Explain why a specific recipe was recommended to a user"""
    try:
        recommendation_engine = RecommendationEngine()
        explanation = await recommendation_engine.explain_recommendation(
            user_id=user_id,
            recipe_id=recipe_id,
            detailed=detailed
        )
        
        return {
            "recipe_id": recipe_id,
            "user_id": user_id,
            "explanation": explanation,
            "confidence_score": explanation.get("confidence", 0.0),
            "key_factors": explanation.get("factors", [])
        }
        
    except Exception as e:
        logger.error(f"Failed to explain recommendation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to explain recommendation"
        )