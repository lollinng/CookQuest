# CookQuest Deployment & Scaling Strategy

## Overview

The CookQuest platform follows a cloud-native deployment strategy designed for scalability, reliability, and cost-effectiveness across different stages of growth.

## Deployment Environments

### 1. Development Environment

**Infrastructure:**
- Local Docker Compose setup
- SQLite database for rapid development
- Redis for caching
- Local file storage

**Configuration:**
```yaml
# docker-compose.dev.yml
services:
  cookquest-api:
    build: 
      target: development
    volumes:
      - ./src:/app/src
    environment:
      - NODE_ENV=development
      - HOT_RELOAD=true
```

**Characteristics:**
- Hot reloading for rapid development
- Simplified database (SQLite)
- Extensive logging and debugging
- No external dependencies

### 2. Staging Environment

**Infrastructure:**
- Kubernetes cluster (single-node or small cluster)
- PostgreSQL database
- Redis cluster
- Object storage (MinIO or cloud)

**Purpose:**
- Integration testing
- Performance testing
- User acceptance testing
- Production-like environment

### 3. Production Environment

**Infrastructure:**
- Multi-zone Kubernetes cluster
- Managed PostgreSQL (RDS/Cloud SQL)
- Redis cluster with persistence
- CDN for static assets
- Load balancers with SSL termination

## Scaling Strategy

### Phase 1: MVP Launch (0-1K users)

**Architecture:**
```
Frontend (Vercel) → API Gateway → Node.js API (2 replicas) → PostgreSQL
                                → Python AI (1 replica)    → Redis
```

**Resources:**
- **Node.js API**: 2 pods, 512MB RAM, 0.5 CPU each
- **Python AI**: 1 pod, 1GB RAM, 1 CPU
- **PostgreSQL**: Single instance, 2GB RAM, 1 CPU
- **Redis**: Single instance, 512MB RAM

**Cost:** ~$100-200/month

### Phase 2: Growth (1K-10K users)

**Architecture:**
```
CDN → Load Balancer → API Gateway → Node.js API (3-5 replicas)
                                  → Python AI (2-3 replicas)
                                  → PostgreSQL (Read Replicas)
                                  → Redis Cluster
```

**Enhancements:**
- Horizontal Pod Autoscaling (HPA)
- Database read replicas
- Redis clustering
- CDN for static assets
- Enhanced monitoring

**Resources:**
- **Node.js API**: 3-5 pods, auto-scaling based on CPU/memory
- **Python AI**: 2-3 pods, GPU instances for ML workloads
- **PostgreSQL**: Primary + 1-2 read replicas
- **Redis**: 3-node cluster with persistence

**Cost:** ~$500-1000/month

### Phase 3: Scale (10K-100K users)

**Architecture:**
```
CDN → WAF → Load Balancer → API Gateway → Node.js API (5-20 replicas)
                                        → Python AI (3-10 replicas)
                                        → PostgreSQL Cluster
                                        → Redis Cluster
                                        → Message Queue
                                        → Background Workers
```

**Advanced Features:**
- Database sharding/partitioning
- Microservices decomposition
- Event-driven architecture
- Caching layers (Redis + CDN)
- Background job processing
- ML model serving infrastructure

**Resources:**
- **Node.js API**: 5-20 pods across multiple zones
- **Python AI**: 3-10 pods with GPU support
- **PostgreSQL**: Primary + multiple read replicas + connection pooling
- **Redis**: Multi-zone cluster
- **Message Queue**: Apache Kafka or cloud equivalent
- **Background Workers**: Separate deployment for async tasks

**Cost:** ~$2000-5000/month

### Phase 4: Enterprise (100K+ users)

**Architecture:**
- Multi-region deployment
- Database sharding
- Service mesh (Istio)
- Advanced ML pipeline
- Real-time analytics
- Global CDN

## Auto-Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

```yaml
# Node.js API Auto-scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cookquest-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cookquest-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Vertical Pod Autoscaler (VPA)

```yaml
# Python AI Service VPA (for resource optimization)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: cookquest-ai-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cookquest-ai
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: cookquest-ai
      maxAllowed:
        cpu: "2"
        memory: "4Gi"
      minAllowed:
        cpu: "500m"
        memory: "1Gi"
```

## Database Scaling Strategy

### PostgreSQL Scaling Phases

#### Phase 1: Single Instance
```sql
-- Basic configuration for small workloads
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 100
```

#### Phase 2: Master-Replica Setup
```yaml
# PostgreSQL with read replicas
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  instances: 3
  postgresql:
    parameters:
      shared_buffers: "512MB"
      effective_cache_size: "2GB"
      work_mem: "8MB"
      max_connections: "200"
  bootstrap:
    initdb:
      database: cookquest
      owner: cookquest
```

#### Phase 3: Sharding Strategy
```typescript
// Database sharding by user ID
const getDbConnection = (userId: number) => {
  const shardId = userId % SHARD_COUNT
  return dbConnections[shardId]
}

// Recipe data can be replicated across shards
// User-specific data (progress, preferences) is sharded
```

## Caching Strategy

### Multi-Layer Caching

```typescript
// 1. Application-level caching (Node.js)
const memoryCache = new Map()

// 2. Redis distributed cache
const redisCache = new Redis(process.env.REDIS_URL)

// 3. CDN caching for static content
const cdnCache = {
  recipes: '1 hour',
  images: '1 day', 
  assets: '1 week'
}

// Cache hierarchy
async function getCachedData(key: string) {
  // L1: Memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }
  
  // L2: Redis cache
  const redisValue = await redisCache.get(key)
  if (redisValue) {
    memoryCache.set(key, redisValue)
    return redisValue
  }
  
  // L3: Database
  const dbValue = await database.get(key)
  await redisCache.setex(key, 3600, dbValue)
  memoryCache.set(key, dbValue)
  return dbValue
}
```

## Monitoring & Observability

### Metrics Collection

```yaml
# Prometheus configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'cookquest-api'
    static_configs:
      - targets: ['cookquest-api:3001']
    metrics_path: '/metrics'
    
  - job_name: 'cookquest-ai'
    static_configs:
      - targets: ['cookquest-ai:8000']
    metrics_path: '/metrics'
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Key Performance Indicators (KPIs)

```typescript
// Application metrics to track
const kpis = {
  // Performance metrics
  responseTime: 'avg response time < 200ms',
  throughput: 'requests per second',
  errorRate: '< 1% error rate',
  
  // Infrastructure metrics
  cpuUsage: '< 70% average CPU',
  memoryUsage: '< 80% memory utilization',
  diskUsage: '< 85% disk space',
  
  // Business metrics
  activeUsers: 'daily/monthly active users',
  recipeCompletions: 'recipe completion rate',
  userRetention: '7-day and 30-day retention',
  
  // AI/ML metrics
  recommendationCTR: 'recommendation click-through rate',
  modelLatency: 'ML model inference time',
  modelAccuracy: 'recommendation relevance score'
}
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
- name: cookquest-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      
  - alert: DatabaseDown
    expr: up{job="postgres"} == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "PostgreSQL database is down"
      
  - alert: HighCPUUsage
    expr: cpu_usage_percent > 90
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage detected"
```

## Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# Automated backup script

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d cookquest > backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to cloud storage
aws s3 cp backup_*.sql s3://cookquest-backups/database/

# Redis backup
redis-cli --rdb dump_$(date +%Y%m%d_%H%M%S).rdb

# Upload Redis backup
aws s3 cp dump_*.rdb s3://cookquest-backups/redis/

# Clean old backups (keep 30 days)
find . -name "backup_*" -mtime +30 -delete
find . -name "dump_*" -mtime +30 -delete
```

### Recovery Procedures

```yaml
# Database recovery
apiVersion: batch/v1
kind: Job
metadata:
  name: database-recovery
spec:
  template:
    spec:
      containers:
      - name: recovery
        image: postgres:16-alpine
        command: ["/bin/bash"]
        args:
          - -c
          - |
            # Download latest backup
            aws s3 cp s3://cookquest-backups/database/latest.sql /tmp/backup.sql
            
            # Restore database
            psql -h $DB_HOST -U $DB_USER -d cookquest < /tmp/backup.sql
        env:
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_USER
          value: "cookquest"
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: cookquest-secrets
              key: POSTGRES_PASSWORD
      restartPolicy: Never
```

## Cost Optimization

### Resource Optimization Strategies

```typescript
// 1. Right-sizing based on usage patterns
const optimizeResources = {
  // Scale down during low-traffic hours
  nightTimeSchedule: {
    replicas: 1,
    resources: {
      requests: { cpu: '100m', memory: '256Mi' },
      limits: { cpu: '500m', memory: '512Mi' }
    }
  },
  
  // Scale up during peak hours
  peakTimeSchedule: {
    replicas: 5,
    resources: {
      requests: { cpu: '500m', memory: '512Mi' },
      limits: { cpu: '1000m', memory: '1Gi' }
    }
  }
}

// 2. Spot instances for non-critical workloads
const spotInstanceConfig = {
  nodeSelector: {
    'node-type': 'spot'
  },
  tolerations: [
    {
      key: 'spot-instance',
      operator: 'Equal',
      value: 'true',
      effect: 'NoSchedule'
    }
  ]
}
```

### Cost Monitoring

```typescript
// Track and optimize costs
const costMetrics = {
  computeCosts: 'CPU/Memory usage vs allocation',
  storageCosts: 'Database and file storage usage',
  networkCosts: 'Bandwidth and data transfer',
  thirdPartyCosts: 'OpenAI API, cloud services',
  
  // Cost per user metric
  costPerUser: 'Total infrastructure cost / active users',
  costPerRequest: 'Total cost / API requests'
}
```

## Deployment Pipeline

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy CookQuest
on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run tests
      run: |
        npm test
        python -m pytest
        
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Build images
      run: |
        docker build -t cookquest/api:$GITHUB_SHA ./node-services/api-server
        docker build -t cookquest/ai:$GITHUB_SHA ./python-services/ai-service
        
    - name: Push to registry
      run: |
        docker push cookquest/api:$GITHUB_SHA
        docker push cookquest/ai:$GITHUB_SHA
        
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/cookquest-api cookquest-api=cookquest/api:$GITHUB_SHA
        kubectl set image deployment/cookquest-ai cookquest-ai=cookquest/ai:$GITHUB_SHA
        kubectl rollout status deployment/cookquest-api
        kubectl rollout status deployment/cookquest-ai
```

### Rollback Strategy

```bash
# Automated rollback on deployment failure
#!/bin/bash

# Check deployment health
if ! kubectl rollout status deployment/cookquest-api --timeout=300s; then
  echo "Deployment failed, rolling back..."
  kubectl rollout undo deployment/cookquest-api
  kubectl rollout status deployment/cookquest-api
  exit 1
fi

# Health check endpoint
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://cookquest-api-service:3001/health)
if [ $HEALTH_CHECK != "200" ]; then
  echo "Health check failed, rolling back..."
  kubectl rollout undo deployment/cookquest-api
  exit 1
fi
```

This deployment and scaling strategy provides:
- **Flexible scaling**: From MVP to enterprise-scale
- **Cost optimization**: Resource right-sizing and smart scheduling
- **High availability**: Multi-zone deployment with failover
- **Disaster recovery**: Automated backups and recovery procedures
- **Observability**: Comprehensive monitoring and alerting
- **Security**: Network policies and secret management