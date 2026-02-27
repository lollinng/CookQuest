# CookQuest Migration Plan: Client-Side to Full-Stack

## Overview

This document outlines a phased migration strategy to transform CookQuest from a client-side only application to a comprehensive full-stack platform with backend services, real user accounts, and AI-powered features.

## Current State Analysis

### Existing Architecture
- **Frontend**: Next.js with TypeScript
- **State Management**: Zustand with localStorage persistence
- **Data**: Hardcoded recipes in `/data/recipes.ts` (24 recipes)
- **Progress Tracking**: Browser localStorage only
- **User Management**: None (anonymous usage)
- **Recommendations**: None (static recipe lists)

### Current Pain Points
- No persistent user accounts
- Data loss when clearing browser storage
- No personalization or recommendations
- Limited scalability for content updates
- No analytics or user insights
- No cross-device synchronization

## Migration Strategy

### Phase 1: Foundation Setup (Weeks 1-2)
**Goal**: Establish backend infrastructure without breaking existing frontend

#### 1.1 Infrastructure Setup
- [ ] Set up Docker development environment
- [ ] Deploy PostgreSQL database with schema
- [ ] Configure Redis for caching
- [ ] Set up basic monitoring (Prometheus/Grafana)

#### 1.2 Database Migration
- [ ] Create database tables from schema
- [ ] Migrate existing recipe data to database
- [ ] Seed database with initial data

```bash
# Migration commands
cd backend/infrastructure
docker-compose up -d postgres redis
cd ../shared
sqlite3 ../data/recipes.db < schema.sql
sqlite3 ../data/recipes.db < seed-data.sql
```

#### 1.3 Node.js API Development
- [ ] Set up Express.js server
- [ ] Implement basic recipe endpoints (GET /recipes, GET /recipes/:id)
- [ ] Add health check and monitoring endpoints
- [ ] Test API with existing recipe data

#### 1.4 Success Criteria
- Database accessible with all recipe data
- Recipe API endpoints returning correct data
- Development environment running smoothly

### Phase 2: API Integration (Weeks 3-4)
**Goal**: Connect frontend to backend APIs while maintaining backward compatibility

#### 2.1 Frontend API Layer
- [ ] Create API client service
- [ ] Update React Query hooks to use real API endpoints
- [ ] Add error handling and loading states
- [ ] Implement fallback to local data if API fails

```typescript
// New API service
class CookQuestAPI {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
  
  async getRecipes(filters?: RecipeFilters): Promise<Recipe[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recipes${this.buildQuery(filters)}`)
      if (!response.ok) throw new Error('API request failed')
      return response.json()
    } catch (error) {
      // Fallback to local data during migration
      console.warn('API request failed, using local data:', error)
      return RECIPES // Import from existing data/recipes.ts
    }
  }
}
```

#### 2.2 Gradual Migration
- [ ] Update one component at a time to use API
- [ ] Keep local data as fallback during transition
- [ ] Add feature flags for API vs local data

```typescript
// Feature flag approach
const useApiData = process.env.NEXT_PUBLIC_USE_API === 'true'

export function useRecipes() {
  if (useApiData) {
    return useApiRecipes() // New API-based hook
  } else {
    return useLocalRecipes() // Existing local hook
  }
}
```

#### 2.3 Success Criteria
- All recipe data served from API
- Frontend works with both local and API data
- No functionality regression
- Performance maintained or improved

### Phase 3: User Management (Weeks 5-6)
**Goal**: Add user authentication and account management

#### 3.1 Authentication System
- [ ] Implement user registration/login endpoints
- [ ] Add JWT token management
- [ ] Create secure session handling
- [ ] Add password reset functionality

#### 3.2 Frontend Authentication
- [ ] Create login/register UI components
- [ ] Add authentication context provider
- [ ] Implement protected routes
- [ ] Add user profile management

```typescript
// Authentication context
interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
}

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  // Implementation
}
```

#### 3.3 Data Migration Strategy
- [ ] Migrate existing localStorage progress to user accounts
- [ ] Provide guest account conversion option
- [ ] Preserve user progress during account creation

```typescript
// Migration helper
const migrateLocalProgress = async (userId: number) => {
  const localProgress = localStorage.getItem('completed-recipes')
  if (localProgress) {
    const completedRecipes = JSON.parse(localProgress)
    await api.migrateProgress(userId, completedRecipes)
    localStorage.removeItem('completed-recipes') // Clean up
  }
}
```

#### 3.4 Success Criteria
- Users can create accounts and log in
- Progress data migrates from localStorage to server
- Anonymous usage still works (guest mode)
- No existing users lose their progress

### Phase 4: Progress Tracking (Weeks 7-8)
**Goal**: Replace localStorage progress tracking with server-side system

#### 4.1 Progress API Development
- [ ] Implement progress tracking endpoints
- [ ] Add achievement system
- [ ] Create user statistics API
- [ ] Add cooking session tracking

#### 4.2 Enhanced Progress Features
- [ ] Add detailed progress analytics
- [ ] Implement achievement notifications
- [ ] Create progress visualization components
- [ ] Add skill mastery tracking

```typescript
// Enhanced progress tracking
interface CookingSession {
  id: string
  recipeId: string
  startedAt: Date
  completedAt?: Date
  success?: boolean
  difficultyRating?: number
  notes?: string
  photos?: string[]
}

const useCookingSession = (recipeId: string) => {
  const [session, setSession] = useState<CookingSession | null>(null)
  
  const startSession = async () => {
    const newSession = await api.startCookingSession(recipeId)
    setSession(newSession)
  }
  
  const completeSession = async (data: SessionCompletionData) => {
    if (session) {
      const completed = await api.completeSession(session.id, data)
      setSession(completed)
      // Trigger achievement checks, progress updates, etc.
    }
  }
  
  return { session, startSession, completeSession }
}
```

#### 4.3 Success Criteria
- Server-side progress tracking fully functional
- All progress data synced across devices
- Achievement system working
- Rich analytics available

### Phase 5: AI Integration (Weeks 9-10)
**Goal**: Add AI-powered recommendations and tips

#### 5.1 Python AI Service
- [ ] Deploy Python FastAPI service
- [ ] Implement basic recommendation engine
- [ ] Add cooking tips generation
- [ ] Create user profiling system

#### 5.2 AI Features Integration
- [ ] Add personalized recipe recommendations
- [ ] Implement contextual cooking tips
- [ ] Create adaptive difficulty suggestions
- [ ] Add cooking session analysis

```typescript
// AI-powered recommendations
const usePersonalizedRecommendations = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      const recommendations = await api.getRecommendations({
        userId: user?.id,
        preferences: user?.preferences,
        currentSkills: await api.getUserSkills(user?.id),
        context: {
          timeOfDay: new Date().getHours(),
          recentActivity: await api.getRecentActivity(user?.id)
        }
      })
      return recommendations
    },
    enabled: !!user,
    staleTime: 15 * 60 * 1000 // 15 minutes
  })
}
```

#### 5.3 Success Criteria
- Personalized recommendations working
- Contextual tips displayed appropriately
- AI service integrated with main API
- Recommendation quality metrics in place

### Phase 6: Advanced Features (Weeks 11-12)
**Goal**: Add advanced features and optimize performance

#### 6.1 Content Management
- [ ] Add recipe upload/editing functionality
- [ ] Implement user-generated content moderation
- [ ] Create recipe sharing features
- [ ] Add recipe collections/favorites

#### 6.2 Social Features
- [ ] Add user profiles and following
- [ ] Implement recipe reviews and ratings
- [ ] Create cooking challenges
- [ ] Add community features

#### 6.3 Performance Optimization
- [ ] Implement caching strategies
- [ ] Add image optimization
- [ ] Optimize database queries
- [ ] Add CDN for static assets

#### 6.4 Success Criteria
- Rich user-generated content system
- Social features engaging users
- Performance metrics improved
- Scalability tested

## Technical Migration Details

### Database Migration Scripts

```sql
-- Migration script to move from hardcoded data
INSERT INTO recipes (id, title, description, skill_id, difficulty, prep_time, cook_time, total_time, servings, image_url, emoji, instructions, ingredients, tips)
SELECT 
  id,
  title,
  description,
  skill,
  difficulty,
  CAST(SUBSTRING(time, '(\d+)') AS INTEGER) / 2 as prep_time, -- Estimate prep time
  CAST(SUBSTRING(time, '(\d+)') AS INTEGER) / 2 as cook_time,  -- Estimate cook time
  time as total_time,
  2 as servings, -- Default servings
  imageUrl as image_url,
  emoji,
  CAST(instructions AS TEXT) as instructions,
  CAST(ingredients AS TEXT) as ingredients,
  CAST(tips AS TEXT) as tips
FROM temp_recipe_import;
```

### Frontend Migration Strategy

```typescript
// Gradual component migration
const RecipeList: React.FC = () => {
  const useNewAPI = useFeatureFlag('use-recipe-api')
  
  // Progressive enhancement
  const { data: recipes, isLoading, error } = useNewAPI 
    ? useApiRecipes()
    : useLocalRecipes()
  
  // Fallback handling
  if (error && useNewAPI) {
    console.warn('API failed, falling back to local data')
    return <RecipeList /> // Re-render with local data
  }
  
  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {recipes?.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  )
}
```

### State Management Migration

```typescript
// Migrate from localStorage to server sync
const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      completedRecipes: new Set<string>(),
      
      toggleRecipeCompletion: async (recipeId: string) => {
        const { user } = useAuth.getState()
        
        if (user) {
          // Server-side update
          await api.updateRecipeProgress(recipeId, {
            status: get().completedRecipes.has(recipeId) ? 'not_started' : 'completed'
          })
          
          // Update local state
          set(state => ({
            completedRecipes: state.completedRecipes.has(recipeId)
              ? new Set([...state.completedRecipes].filter(id => id !== recipeId))
              : new Set([...state.completedRecipes, recipeId])
          }))
        } else {
          // Fallback to localStorage for guests
          set(state => ({
            completedRecipes: state.completedRecipes.has(recipeId)
              ? new Set([...state.completedRecipes].filter(id => id !== recipeId))
              : new Set([...state.completedRecipes, recipeId])
          }))
        }
      },
      
      syncWithServer: async () => {
        const { user } = useAuth.getState()
        if (user) {
          const serverProgress = await api.getUserProgress()
          set({ completedRecipes: new Set(serverProgress.completedRecipes) })
        }
      }
    }),
    {
      name: 'recipe-progress',
      // Custom storage that syncs with server for authenticated users
      storage: createServerSyncStorage()
    }
  )
)
```

## Risk Mitigation

### Rollback Strategy
- Keep local data functionality as fallback
- Implement feature flags for easy rollback
- Database migration scripts with rollback procedures
- Staged deployment with canary releases

### Data Loss Prevention
- Export user data before migration
- Dual-write strategy during transition
- Comprehensive backup procedures
- User data migration assistance

### Performance Monitoring
- Track API response times
- Monitor frontend bundle size
- Database query performance
- User experience metrics

### User Communication
- Migration announcement and timeline
- Clear instructions for account creation
- Support for users experiencing issues
- Feedback collection and response

## Success Metrics

### Technical Metrics
- API response time < 200ms (95th percentile)
- Frontend bundle size increase < 20%
- Database query performance within targets
- Zero data loss during migration
- 99.9% uptime during migration

### User Experience Metrics
- User retention rate maintained or improved
- Account creation rate > 70% of active users
- User satisfaction score maintained
- Feature adoption rate > 50% for new features
- Support tickets related to migration < 5% of users

### Business Metrics
- User engagement increased by recommendations
- Recipe completion rates improved
- User session duration increased
- Premium feature conversion (if applicable)
- Reduced churn rate

## Timeline Summary

| Phase | Duration | Key Deliverables | Success Criteria |
|-------|----------|------------------|------------------|
| 1 | Weeks 1-2 | Infrastructure, Database, Basic API | API serving recipe data |
| 2 | Weeks 3-4 | Frontend API integration | No functionality regression |
| 3 | Weeks 5-6 | User authentication | Account creation working |
| 4 | Weeks 7-8 | Progress tracking | Server-side progress sync |
| 5 | Weeks 9-10 | AI integration | Personalized recommendations |
| 6 | Weeks 11-12 | Advanced features | Full-stack platform |

**Total Timeline**: 12 weeks (3 months) for complete migration

This migration plan ensures a smooth transition from the current client-side application to a comprehensive full-stack platform while minimizing user disruption and maximizing feature adoption.