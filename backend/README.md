# CookQuest Backend Services

## Architecture Overview

This backend implements a microservices architecture with:

- **Node.js Services**: User management, recipe CRUD, progress tracking
- **Python Services**: AI recommendations, image analysis, chatbot
- **Shared Resources**: Types, schemas, infrastructure

## Services

### Node.js Services
- `user-service`: Authentication, user profiles, preferences
- `recipe-service`: Recipe CRUD, search, categorization  
- `progress-service`: Skill tracking, completion status

### Python Services
- `ai-service`: Recipe recommendations, meal planning
- `image-analysis`: Cooking technique assessment

## Development

```bash
# Start all services with Docker Compose
docker-compose up

# Individual service development
cd node-services/user-service && npm run dev
cd python-services/ai-service && uvicorn main:app --reload
```

## Technology Stack

**Node.js**: Express, TypeScript, PostgreSQL, Redis
**Python**: FastAPI, Pydantic, LangChain, OpenAI
**Infrastructure**: Docker, Kong Gateway, PostgreSQL, Redis