from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
import os
from dotenv import load_dotenv
import structlog

from app.middleware.auth import verify_service_token
from app.middleware.logging import setup_logging
from app.routers import recommendations, tips, analysis, chat
from app.services.database import DatabaseService
from app.services.redis_service import RedisService
from app.services.ml_models import MLModelService

# Load environment variables
load_dotenv()

# Setup structured logging
setup_logging()
logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title="CookQuest AI Service",
    description="AI/ML microservice for recipe recommendations, cooking tips, and culinary analysis",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("NODE_API_URL", "http://localhost:3001"),
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        logger.info("Starting CookQuest AI Service...")
        
        # Initialize database connection
        await DatabaseService.initialize()
        logger.info("Database service initialized")
        
        # Initialize Redis connection
        await RedisService.initialize()
        logger.info("Redis service initialized")
        
        # Initialize ML models
        await MLModelService.initialize()
        logger.info("ML models initialized")
        
        logger.info("CookQuest AI Service started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start AI service: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        logger.info("Shutting down CookQuest AI Service...")
        
        await DatabaseService.close()
        await RedisService.close()
        await MLModelService.cleanup()
        
        logger.info("CookQuest AI Service shut down complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for service monitoring"""
    try:
        # Check database connectivity
        db_status = await DatabaseService.health_check()
        redis_status = await RedisService.health_check()
        ml_status = await MLModelService.health_check()
        
        return {
            "status": "healthy",
            "service": "cookquest-ai",
            "version": "1.0.0",
            "checks": {
                "database": "ok" if db_status else "error",
                "redis": "ok" if redis_status else "error", 
                "ml_models": "ok" if ml_status else "error"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

# API Routes with service authentication
app.include_router(
    recommendations.router,
    prefix="/api/v1/recommendations",
    tags=["recommendations"],
    dependencies=[Depends(verify_service_token)]
)

app.include_router(
    tips.router,
    prefix="/api/v1/tips",
    tags=["tips"],
    dependencies=[Depends(verify_service_token)]
)

app.include_router(
    analysis.router,
    prefix="/api/v1/analysis",
    tags=["analysis"],
    dependencies=[Depends(verify_service_token)]
)

app.include_router(
    chat.router,
    prefix="/api/v1/chat",
    tags=["chat"],
    dependencies=[Depends(verify_service_token)]
)

# Root endpoint with service information
@app.get("/")
async def root():
    return {
        "service": "CookQuest AI Service",
        "version": "1.0.0",
        "description": "AI/ML microservice for culinary intelligence",
        "endpoints": {
            "health": "/health",
            "recommendations": "/api/v1/recommendations",
            "tips": "/api/v1/tips", 
            "analysis": "/api/v1/analysis",
            "chat": "/api/v1/chat",
            "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else "disabled"
        }
    }

if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )