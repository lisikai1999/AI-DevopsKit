#!/usr/bin/env python
"""
Database initialization script for AI-DevopsKit
Run this script to create initial database tables and seed data
"""

import sys
from datetime import datetime

sys.path.insert(0, '.')

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models.user import User, UserRole
from app.models.knowledge import KnowledgeCategory, KnowledgeArticle
from app.core.security import get_password_hash


def init_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")


def seed_data(db: Session):
    print("\nSeeding initial data...")
    
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin@example.com",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
        )
        db.add(admin_user)
        print("  - Created admin user (username: admin, password: admin123)")
    
    demo_user = db.query(User).filter(User.username == "demo").first()
    if not demo_user:
        demo_user = User(
            username="demo",
            email="demo@example.com",
            full_name="Demo User",
            hashed_password=get_password_hash("demo123"),
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
        )
        db.add(demo_user)
        print("  - Created demo user (username: demo, password: demo123)")
    
    readonly_user = db.query(User).filter(User.username == "readonly").first()
    if not readonly_user:
        readonly_user = User(
            username="readonly",
            email="readonly@example.com",
            full_name="Read Only User",
            hashed_password=get_password_hash("readonly123"),
            role=UserRole.READONLY,
            is_active=True,
            is_verified=True,
        )
        db.add(readonly_user)
        print("  - Created readonly user (username: readonly, password: readonly123)")
    
    categories = [
        {"name": "Docker", "icon": "📦", "color": "#2496ED", "description": "Docker 容器化最佳实践", "sort_order": 1},
        {"name": "Jenkins", "icon": "🔧", "color": "#D24939", "description": "Jenkins CI/CD 管道配置", "sort_order": 2},
        {"name": "Kubernetes", "icon": "☸️", "color": "#326CE5", "description": "Kubernetes 编排与部署", "sort_order": 3},
        {"name": "监控告警", "icon": "📊", "color": "#E44D26", "description": "Prometheus、Grafana 监控配置", "sort_order": 4},
        {"name": "日志分析", "icon": "📋", "color": "#005571", "description": "ELK Stack 日志解决方案", "sort_order": 5},
        {"name": "安全合规", "icon": "🔒", "color": "#47A248", "description": "DevSecOps 安全实践", "sort_order": 6},
    ]
    
    cat_map = {}
    for cat_data in categories:
        cat = db.query(KnowledgeCategory).filter(KnowledgeCategory.name == cat_data["name"]).first()
        if not cat:
            cat = KnowledgeCategory(**cat_data, is_active=True, is_custom=False)
            db.add(cat)
            db.flush()
            print(f"  - Created category: {cat_data['name']}")
        cat_map[cat_data["name"]] = cat.id
    
    db.commit()
    
    print("\nSeeding knowledge articles...")
    
    articles = [
        {
            "title": "Dockerfile 最佳实践指南",
            "summary": "本文档介绍编写高效 Dockerfile 的最佳实践，包括多阶段构建、镜像优化、安全考虑等核心要点。",
            "content": """# Dockerfile 最佳实践指南

## 1. 选择合适的基础镜像

```dockerfile
FROM python:3.11-slim
```

**建议：**
- 使用官方镜像而非自定义镜像
- 选择 Alpine 或 slim 版本以减小镜像体积
- 指定具体版本标签而非 latest

## 2. 多阶段构建

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o myapp .

FROM alpine:3.18
COPY --from=builder /app/myapp /usr/local/bin/
CMD ["myapp"]
```

## 3. 合理排序层

将变化频率低的指令放在前面：

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 4. 减少镜像层数

合并相关命令：

```dockerfile
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*
```

## 5. 使用 .dockerignore

```
node_modules
npm-debug.log
.git
.env
*.md
```

## 6. 安全考虑

- 不要以 root 用户运行应用
- 避免在镜像中存储敏感信息
- 定期更新基础镜像

```dockerfile
FROM node:20-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
```

## 7. 健康检查

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```
""",
            "tags": ["docker", "dockerfile", "最佳实践"],
            "difficulty": "intermediate",
            "read_time": 10,
            "category_name": "Docker",
        },
        {
            "title": "Jenkins Pipeline 入门教程",
            "summary": "从零开始学习 Jenkins Pipeline，包括声明式管道语法、阶段定义、并行执行等核心概念。",
            "content": """# Jenkins Pipeline 入门教程

## 1. 什么是 Jenkins Pipeline

Jenkins Pipeline 是一套插件，支持将持续交付管道实现为代码。

## 2. 声明式管道基础语法

```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
        stage('Test') {
            steps {
                echo 'Testing...'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying...'
            }
        }
    }
}
```

## 3. 环境变量定义

```groovy
pipeline {
    agent any
    environment {
        APP_NAME = 'my-app'
        BUILD_VERSION = "v${BUILD_NUMBER}"
        DOCKER_REGISTRY = 'registry.example.com'
    }
    stages {
        stage('Build') {
            steps {
                sh "docker build -t ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_VERSION} ."
            }
        }
    }
}
```

## 4. 参数化构建

```groovy
pipeline {
    agent any
    parameters {
        string(name: 'DEPLOY_ENV', defaultValue: 'staging', description: 'Deployment environment')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run unit tests')
    }
    stages {
        stage('Test') {
            when {
                expression { params.RUN_TESTS == true }
            }
            steps {
                echo 'Running tests...'
            }
        }
    }
}
```

## 5. 并行执行

```groovy
pipeline {
    agent any
    stages {
        stage('Parallel Tests') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        echo 'Running unit tests...'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        echo 'Running integration tests...'
                    }
                }
            }
        }
    }
}
```

## 6. 后置处理

```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
    }
    post {
        always {
            junit '**/target/*.xml'
            cleanWs()
        }
        success {
            slackSend channel: '#ci', message: "Build SUCCESS: ${BUILD_URL}"
        }
        failure {
            slackSend channel: '#ci', message: "Build FAILED: ${BUILD_URL}"
        }
    }
}
```
""",
            "tags": ["jenkins", "pipeline", "ci/cd"],
            "difficulty": "beginner",
            "read_time": 8,
            "category_name": "Jenkins",
        },
        {
            "title": "Kubernetes Deployment 配置详解",
            "summary": "深入理解 Kubernetes Deployment 资源，包括滚动更新策略、回滚配置、探针设置等高级特性。",
            "content": """# Kubernetes Deployment 配置详解

## 1. Deployment 基础

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

## 2. 滚动更新策略

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
```

## 3. 健康检查探针

```yaml
containers:
- name: nginx
  image: nginx:1.21
  ports:
  - containerPort: 80
  livenessProbe:
    httpGet:
      path: /healthz
      port: 80
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 80
    initialDelaySeconds: 3
    periodSeconds: 5
  startupProbe:
    httpGet:
      path: /
      port: 80
    failureThreshold: 30
    periodSeconds: 10
```

## 4. 资源限制

```yaml
containers:
- name: nginx
  image: nginx:1.21
  resources:
    requests:
      memory: "64Mi"
      cpu: "250m"
    limits:
      memory: "128Mi"
      cpu: "500m"
```

## 5. 环境变量

```yaml
containers:
- name: app
  image: myapp:v1
  env:
  - name: DATABASE_HOST
    value: "db-service"
  - name: DATABASE_PORT
    value: "5432"
  - name: SECRET_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-secret
        key: password
```

## 6. 回滚操作

```bash
kubectl rollout history deployment/nginx-deployment
kubectl rollout undo deployment/nginx-deployment
kubectl rollout undo deployment/nginx-deployment --to-revision=2
```
""",
            "tags": ["kubernetes", "deployment", "k8s"],
            "difficulty": "intermediate",
            "read_time": 12,
            "category_name": "Kubernetes",
        },
    ]
    
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        for article_data in articles:
            existing = db.query(KnowledgeArticle).filter(
                KnowledgeArticle.title == article_data["title"]
            ).first()
            
            if not existing:
                category_id = cat_map.get(article_data.pop("category_name"))
                if category_id:
                    article = KnowledgeArticle(
                        **article_data,
                        category_id=category_id,
                        author_id=admin.id,
                        is_active=True,
                        is_custom=False,
                        view_count=0,
                    )
                    db.add(article)
                    print(f"  - Created article: {article_data['title']}")
    
    db.commit()
    print("\nInitial data seeded successfully!")


if __name__ == "__main__":
    print("=" * 50)
    print("AI-DevopsKit Database Initialization")
    print("=" * 50)
    
    init_database()
    
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
    
    print("\n" + "=" * 50)
    print("Initialization complete!")
    print("=" * 50)
    print("\nDefault users:")
    print("  - admin/admin123 (Admin role)")
    print("  - demo/demo123 (User role)")
    print("  - readonly/readonly123 (Readonly role)")
