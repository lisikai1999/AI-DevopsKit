export const knowledgeCategories = [
  {
    id: 'cicd-best-practices',
    name: 'CI/CD 最佳实践',
    icon: '🔄',
    color: '#409eff',
    description: '持续集成与持续部署的最佳实践指南',
    articles: [
      {
        id: 'cicd-001',
        title: 'CI/CD 流水线设计原则',
        summary: '掌握构建高效 CI/CD 流水线的核心设计原则',
        tags: ['流水线', '设计模式', '效率'],
        difficulty: '中级',
        readTime: '8 分钟',
        content: `
## CI/CD 流水线设计原则

### 1. 快速反馈循环

快速反馈是 CI/CD 的核心价值。构建时间应该控制在 10 分钟以内，超过这个时间会降低开发效率。

**优化建议：**
- 使用缓存机制减少重复下载
- 并行执行独立的测试任务
- 只构建发生变化的模块

### 2. 一次构建，多次部署

遵循"构建一次，到处运行"的原则。避免在不同环境重复构建。

**最佳实践：**
- 使用 Docker 镜像打包应用
- 将构建产物上传到制品仓库
- 不同环境使用相同的构建产物

### 3. 流水线即代码

将流水线定义存储在版本控制系统中，与应用代码一起管理。

**优势：**
- 版本历史追踪
- 代码审查流程
- 回滚能力

### 4. 自动化测试

自动化测试是 CI/CD 的安全网。没有测试的流水线是危险的。

**测试分层策略：**
- 单元测试（快速、频繁）
- 集成测试（中等速度）
- 端到端测试（较慢、关键路径）
        `
      },
      {
        id: 'cicd-002',
        title: '多环境部署策略',
        summary: '学习如何安全地管理开发、测试、生产多环境部署',
        tags: ['部署', '多环境', '安全'],
        difficulty: '高级',
        readTime: '12 分钟',
        content: `
## 多环境部署策略

### 环境分类

典型的部署环境包括：

- **开发环境 (Dev)**: 开发者日常使用，不稳定
- **测试环境 (Test)**: 功能验证，相对稳定
- **预发布环境 (Staging)**: 生产环境的精确副本
- **生产环境 (Prod)**: 最终用户访问，高可用

### 部署策略选择

#### 蓝绿部署
同时运行两个版本的应用，流量在两个版本间切换。

**优点：**
- 零停机部署
- 快速回滚能力

**缺点：**
- 资源成本翻倍

#### 金丝雀发布
逐步将流量从旧版本切换到新版本。

**优点：**
- 风险可控
- 可以观察新版本表现

**缺点：**
- 部署周期较长

#### 滚动更新
逐个替换实例，确保应用始终可用。

**优点：**
- 资源利用率高
- 简单直观

**缺点：**
- 回滚较慢
        `
      },
      {
        id: 'cicd-003',
        title: '版本控制与标签策略',
        summary: '语义化版本控制和 Git 标签的最佳实践',
        tags: ['Git', '版本控制', '语义化'],
        difficulty: '初级',
        readTime: '6 分钟',
        content: `
## 版本控制与标签策略

### 语义化版本控制 (SemVer)

版本号格式：MAJOR.MINOR.PATCH

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向下兼容的功能新增
- **PATCH**: 向下兼容的问题修复

### Git 标签最佳实践

#### 标签命名规范
- 生产发布: v1.2.3
- 预发布: v1.2.3-alpha.1, v1.2.3-beta.2
- 构建元数据: v1.2.3+build.123

#### 标签类型

1. **轻量级标签**: 只是特定提交的引用
2. **注解标签**: 包含完整元信息（推荐）

**创建注解标签：**
\`\`\`bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
\`\`\`

### 分支策略建议

#### Git Flow
- main/master: 生产环境代码
- develop: 开发集成分支
- feature/*: 功能分支
- release/*: 发布分支
- hotfix/*: 紧急修复分支

#### GitHub Flow
更简单的工作流：
- main: 始终可部署
- feature branches: 从 main 切出，PR 合并回 main
        `
      }
    ]
  },
  {
    id: 'docker-optimization',
    name: 'Docker 优化指南',
    icon: '🐳',
    color: '#67c23a',
    description: 'Docker 镜像构建、性能优化和安全最佳实践',
    articles: [
      {
        id: 'docker-001',
        title: 'Docker 镜像多层构建优化',
        summary: '掌握多阶段构建技巧，大幅减小镜像体积',
        tags: ['多阶段构建', '镜像优化', 'Dockerfile'],
        difficulty: '中级',
        readTime: '10 分钟',
        content: `
## Docker 镜像多层构建优化

### 为什么需要多阶段构建

传统的 Dockerfile 构建会将构建工具和依赖都包含在最终镜像中，导致镜像体积过大。

**问题示例：**
\`\`\`dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
\`\`\`

这个镜像包含了完整的 Node.js 环境、npm 缓存、构建工具等，体积可能超过 1GB。

### 多阶段构建方案

\`\`\`dockerfile
# 构建阶段
FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
\`\`\`

### 优化效果

| 优化项 | 优化前 | 优化后 | 节省 |
|--------|--------|--------|------|
| 镜像大小 | ~1.2GB | ~200MB | 83% |
| 构建时间 | 较慢 | 更快 | - |
| 安全风险 | 高（含构建工具） | 低 | - |

### 更多优化技巧

1. **使用 .dockerignore**
   \`\`\`
   node_modules
   npm-debug.log
   .git
   .env
   dist
   \`\`\`

2. **合理安排层顺序**
   将变化频率低的层放在前面，利用构建缓存。

3. **合并 RUN 指令**
   \`\`\`dockerfile
   # 不好的做法
   RUN apt-get update
   RUN apt-get install -y curl

   # 好的做法
   RUN apt-get update && apt-get install -y curl \\
       && rm -rf /var/lib/apt/lists/*
   \`\`\`
        `
      },
      {
        id: 'docker-002',
        title: 'Docker 安全最佳实践',
        summary: '确保 Docker 容器和镜像安全的关键要点',
        tags: ['安全', '漏洞扫描', '最佳实践'],
        difficulty: '高级',
        readTime: '15 分钟',
        content: `
## Docker 安全最佳实践

### 镜像安全

#### 1. 使用官方基础镜像
优先使用 Docker Hub 上的官方镜像，这些镜像经过安全审计。

\`\`\`dockerfile
# 推荐
FROM node:16-alpine

# 不推荐（未知来源）
FROM my-custom-node:latest
\`\`\`

#### 2. 扫描镜像漏洞
使用工具扫描镜像中的已知漏洞：

- **Trivy**: 简单易用的漏洞扫描器
- **Clair**: 深度漏洞分析
- **Snyk**: 开发者友好的安全工具

\`\`\`bash
# 使用 Trivy 扫描
trivy image myapp:latest
\`\`\`

#### 3. 不要以 root 用户运行
创建非 root 用户运行应用：

\`\`\`dockerfile
FROM node:16-alpine

# 创建应用用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 切换到应用目录
WORKDIR /app

# 复制文件并设置权限
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup . .

# 切换到非 root 用户
USER appuser

EXPOSE 3000
CMD ["node", "index.js"]
\`\`\`

### 运行时安全

#### 1. 限制容器资源
防止容器耗尽宿主机资源：

\`\`\`bash
docker run -d \\
  --memory=512m \\
  --cpus=0.5 \\
  --pids-limit=100 \\
  myapp:latest
\`\`\`

#### 2. 只读文件系统
将容器文件系统设为只读：

\`\`\`bash
docker run -d \\
  --read-only \\
  --tmpfs /tmp \\
  --tmpfs /run \\
  myapp:latest
\`\`\`

#### 3. 禁用不需要的能力
\`\`\`bash
docker run -d \\
  --cap-drop=ALL \\
  --cap-add=NET_BIND_SERVICE \\
  myapp:latest
\`\`\`

### 敏感信息管理

#### 不要在 Dockerfile 中硬编码密钥
\`\`\`dockerfile
# ❌ 错误做法
ENV API_KEY=secret-key-123

# ✅ 正确做法：运行时注入
# docker run -e API_KEY=\${API_KEY} myapp:latest
\`\`\`

#### 使用 Docker Secrets（Swarm 模式）
或使用环境变量管理工具：
- dotenv
- HashiCorp Vault
- AWS Secrets Manager
        `
      },
      {
        id: 'docker-003',
        title: 'Docker 网络配置指南',
        summary: '理解 Docker 网络模式和最佳配置实践',
        tags: ['网络', '容器网络', 'DNS'],
        difficulty: '中级',
        readTime: '11 分钟',
        content: `
## Docker 网络配置指南

### Docker 网络驱动类型

#### 1. bridge（默认）
适用于同一主机上的容器间通信。

\`\`\`bash
# 创建自定义 bridge 网络
docker network create --driver bridge my-network

# 运行容器并连接到网络
docker run -d --name web --network my-network nginx
docker run -d --name app --network my-network myapp
\`\`\`

#### 2. host
容器使用宿主机网络，性能最好但隔离性差。

\`\`\`bash
docker run -d --network host nginx
\`\`\`

#### 3. none
禁用网络，适用于不需要网络的容器。

\`\`\`bash
docker run -d --network none myapp
\`\`\`

#### 4. overlay
适用于多主机 Docker Swarm 集群。

### 容器间通信

#### 使用容器名称
在同一网络中，容器可以通过名称相互访问：

\`\`\`bash
# 创建网络
docker network create app-network

# 运行数据库
docker run -d \\
  --name db \\
  --network app-network \\
  -e POSTGRES_PASSWORD=secret \\
  postgres:13

# 运行应用（通过名称访问 db）
docker run -d \\
  --name api \\
  --network app-network \\
  -e DB_HOST=db \\
  myapi:latest
\`\`\`

#### 使用 DNS 别名
\`\`\`bash
docker run -d \\
  --name api-v2 \\
  --network app-network \\
  --network-alias api \\
  myapi:v2
\`\`\`

### 端口映射最佳实践

#### 限制监听地址
\`\`\`bash
# 只监听 localhost（推荐用于开发）
docker run -d -p 127.0.0.1:8080:80 nginx

# 监听所有接口（默认）
docker run -d -p 8080:80 nginx
\`\`\`

#### 使用随机端口
\`\`\`bash
# Docker 自动分配随机端口
docker run -d -P nginx

# 查看端口映射
docker port <container-id>
\`\`\`
        `
      }
    ]
  },
  {
    id: 'kubernetes-ops',
    name: 'Kubernetes 运维手册',
    icon: '☸️',
    color: '#e6a23c',
    description: 'Kubernetes 集群管理、应用部署和故障排查',
    articles: [
      {
        id: 'k8s-001',
        title: 'Kubernetes Pod 生命周期管理',
        summary: '深入理解 Pod 的生命周期阶段和状态管理',
        tags: ['Pod', '生命周期', '状态管理'],
        difficulty: '中级',
        readTime: '12 分钟',
        content: `
## Kubernetes Pod 生命周期管理

### Pod 生命周期阶段

| 阶段 | 描述 |
|------|------|
| Pending | Pod 已被 Kubernetes 接受，但容器尚未创建 |
| Running | Pod 已绑定到节点，所有容器已创建 |
| Succeeded | Pod 中所有容器已成功终止且不会重启 |
| Failed | Pod 中至少一个容器以非零状态退出 |
| Unknown | 无法获取 Pod 状态（通常是节点通信问题） |

### 容器状态

#### Waiting
容器正在等待运行，可能是因为：
- 镜像拉取中
- 初始化容器未完成
- 资源不足

#### Running
容器正在正常运行。

#### Terminated
容器已终止，可能是：
- 正常退出（exit code 0）
- 异常退出（exit code != 0）
- 被 OOMKilled

### Pod 条件 (Conditions)

\`\`\`yaml
conditions:
  - type: PodScheduled
    status: "True"
  - type: ContainersReady
    status: "True"
  - type: Initialized
    status: "True"
  - type: Ready
    status: "True"
\`\`\`

### 探针 (Probes)

#### livenessProbe（存活探针）
检测容器是否需要重启。

\`\`\`yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
\`\`\`

#### readinessProbe（就绪探针）
检测容器是否准备好接收流量。

\`\`\`yaml
readinessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
\`\`\`

#### startupProbe（启动探针）
检测应用是否已启动完成，为慢启动应用设计。

\`\`\`yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
\`\`\`

### 重启策略

| 策略 | 描述 |
|------|------|
| Always | 容器退出时总是重启（默认） |
| OnFailure | 容器以非零状态退出时重启 |
| Never | 从不重启 |
        `
      },
      {
        id: 'k8s-002',
        title: 'Kubernetes 资源限制与 QoS',
        summary: '掌握资源请求、限制和服务质量等级配置',
        tags: ['资源管理', 'QoS', '限制'],
        difficulty: '高级',
        readTime: '14 分钟',
        content: `
## Kubernetes 资源限制与 QoS

### 资源类型

#### CPU
- 单位：millicores (m)
- 1 CPU = 1000m
- 示例：500m = 0.5 CPU 核心

#### 内存
- 单位：bytes
- 支持的后缀：E, P, T, G, M, k, Ei, Pi, Ti, Gi, Mi, Ki
- 示例：512Mi, 1Gi

### 资源请求 (Requests) vs 限制 (Limits)

\`\`\`yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
\`\`\`

#### requests（请求）
- 调度时使用：节点必须有足够的可用资源
- 节点资源总和不能超过所有 Pod 的 requests 之和
- 是 QoS 等级计算的依据

#### limits（限制）
- 运行时强制执行
- 超过 CPU limits 会被 throttled
- 超过内存 limits 会被 OOM killed

### QoS 服务质量等级

Kubernetes 根据资源配置为 Pod 分配 QoS 等级，影响调度和驱逐优先级。

#### Guaranteed（最高优先级）
**条件：**
- 所有容器都设置了 CPU 和内存的 requests 和 limits
- 每个容器的 request == limit

\`\`\`yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "100m"
    memory: "128Mi"
\`\`\`

**特性：**
- 最后被驱逐
- 最稳定的保证

#### Burstable（中等优先级）
**条件：**
- 不满足 Guaranteed 条件
- 至少一个容器设置了 CPU 或内存的 request

\`\`\`yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "200m"
    memory: "256Mi"
\`\`\`

**特性：**
- 中等优先级
- 资源有 burst 能力

#### BestEffort（最低优先级）
**条件：**
- 没有任何容器设置资源 requests 或 limits

\`\`\`yaml
# 没有 resources 配置
\`\`\`

**特性：**
- 最先被驱逐
- 资源使用无限制（但也最不稳定）

### 驱逐策略

节点资源不足时，Kubernetes 按以下顺序驱逐 Pod：

1. **BestEffort** → 最先被驱逐
2. **Burstable** → 使用量超过 request 时被驱逐
3. **Guaranteed** → 最后被驱逐

### 最佳实践

1. **生产环境必须设置资源限制**
   防止单个 Pod 耗尽节点资源

2. **合理设置 requests**
   反映应用的实际资源需求

3. **监控实际资源使用**
   使用 metrics-server 或 Prometheus 监控

4. **使用 LimitRange 命名空间默认值**
   \`\`\`yaml
   apiVersion: v1
   kind: LimitRange
   metadata:
     name: default-limits
   spec:
     limits:
     - default:
         cpu: 500m
         memory: 256Mi
       defaultRequest:
         cpu: 100m
         memory: 64Mi
       type: Container
   \`\`\`
        `
      },
      {
        id: 'k8s-003',
        title: 'Kubernetes 故障排查常用命令',
        summary: '日常运维必备的 kubectl 诊断命令速查',
        tags: ['故障排查', 'kubectl', '诊断'],
        difficulty: '初级',
        readTime: '8 分钟',
        content: `
## Kubernetes 故障排查常用命令

### 资源状态检查

#### 查看 Pod 状态
\`\`\`bash
# 查看所有 Pod
kubectl get pods

# 查看更多信息
kubectl get pods -o wide

# 查看特定命名空间
kubectl get pods -n namespace

# 查看所有命名空间
kubectl get pods -A

# 持续观察
kubectl get pods -w
\`\`\`

#### 查看详细信息
\`\`\`bash
# Pod 详细信息（包含事件）
kubectl describe pod <pod-name>

# Deployment 详细信息
kubectl describe deployment <deploy-name>

# Service 详细信息
kubectl describe service <svc-name>
\`\`\`

### 日志查看

#### 查看容器日志
\`\`\`bash
# 查看最新日志
kubectl logs <pod-name>

# 持续查看
kubectl logs -f <pod-name>

# 查看前 N 行
kubectl logs --tail=100 <pod-name>

# 查看时间戳
kubectl logs --timestamps <pod-name>

# 多容器 Pod 指定容器
kubectl logs <pod-name> -c <container-name>

# 查看已退出容器的日志
kubectl logs --previous <pod-name>
\`\`\`

### 进入容器调试

\`\`\`bash
# 进入默认容器
kubectl exec -it <pod-name> -- /bin/bash

# 指定容器
kubectl exec -it <pod-name> -c <container-name> -- /bin/sh

# 执行命令
kubectl exec <pod-name> -- ls -la
\`\`\`

### 事件排查

\`\`\`bash
# 查看命名空间事件
kubectl get events

# 按时间排序
kubectl get events --sort-by=.lastTimestamp

# 查看所有命名空间事件
kubectl get events -A

# 持续观察事件
kubectl get events -w
\`\`\`

### 网络诊断

\`\`\`bash
# 查看 Service 端点
kubectl get endpoints

# 查看 DNS 解析
kubectl run -it --rm dns-test --image=busybox:1.28 -- nslookup kubernetes.default

# 端口转发（本地调试）
kubectl port-forward <pod-name> 8080:80

# 临时调试 Pod
kubectl run -it --rm debug --image=nicolaka/netshoot -- bash
\`\`\`

### 常见问题排查流程

#### Pod 卡在 Pending
1. \`kubectl describe pod <pod-name>\` 查看 Events
2. 检查是否有节点资源不足
3. 检查 PersistentVolumeClaim 是否绑定

#### Pod 不断重启
1. \`kubectl logs --previous <pod-name>\` 查看上次退出日志
2. 检查探针配置
3. 检查资源限制是否足够

#### Service 无法访问
1. 检查 Pod 的 \`ready\` 状态
2. 检查 Service 选择器是否匹配 Pod 标签
3. 检查容器端口和 Service 端口
4. 检查网络策略

### 有用的调试技巧

#### 使用临时容器（Kubernetes 1.23+）
\`\`\`bash
# 向运行中的 Pod 添加调试容器
kubectl debug -it <pod-name> --image=nicolaka/netshoot --share-processes
\`\`\`

#### 复制 Pod 进行调试
\`\`\`bash
# 创建一个相同配置但带有调试工具的 Pod
kubectl run debug-pod --image=myapp:latest --command -- sleep 3600
kubectl exec -it debug-pod -- bash
\`\`\`
        `
      }
    ]
  },
  {
    id: 'cloud-architecture',
    name: '云服务架构模式',
    icon: '☁️',
    color: '#909399',
    description: '云原生应用架构设计模式和最佳实践',
    articles: [
      {
        id: 'cloud-001',
        title: '微服务架构设计模式',
        summary: '微服务架构的核心设计模式和应用场景',
        tags: ['微服务', '架构模式', '设计'],
        difficulty: '高级',
        readTime: '18 分钟',
        content: `
## 微服务架构设计模式

### 服务分解模式

#### 按业务能力分解
将应用按业务领域划分为服务，每个服务负责特定的业务能力。

**示例：**
- 订单服务
- 用户服务
- 支付服务
- 库存服务

#### 按子域分解（DDD）
使用领域驱动设计的限界上下文（Bounded Context）来定义服务边界。

### 服务通信模式

#### 同步通信
- **REST/HTTP**: 简单直观，易于调试
- **gRPC**: 高性能，强类型，适合内部服务通信

#### 异步通信
- **消息队列**: RabbitMQ, ActiveMQ
- **事件流**: Kafka, Pulsar

### 服务发现模式

#### 客户端服务发现
客户端查询服务注册中心，获取服务实例列表，然后负载均衡。

**组件：**
- 服务注册中心：Eureka, Consul, Nacos
- 客户端负载均衡：Ribbon, Spring Cloud LoadBalancer

#### 服务端服务发现
请求通过负载均衡器/API 网关，由网关负责服务发现。

**组件：**
- API 网关：Kong, APISIX, Spring Cloud Gateway
- 服务注册中心

### 断路器模式 (Circuit Breaker)

防止服务雪崩的关键模式。

#### 状态
- **Closed**: 正常状态，请求正常通过
- **Open**: 故障状态，快速失败
- **Half-Open**: 尝试恢复状态

#### 实现库
- Resilience4j (Java)
- Hystrix (Java, 已停止新特性)
- Polly (.NET)

**示例配置：**
\`\`\`java
@CircuitBreaker(name = "orderService", fallbackMethod = "fallback")
public Order getOrder(String orderId) {
    return orderClient.getOrder(orderId);
}

public Order fallback(String orderId, Exception e) {
    return new Order(); // 默认值或缓存
}
\`\`\`

### API 网关模式

统一入口，处理横切关注点。

#### 核心功能
- 路由转发
- 负载均衡
- 认证授权
- 限流熔断
- 日志监控
- 协议转换

### 事件驱动模式

#### 事件溯源 (Event Sourcing)
将所有状态变更保存为事件序列，通过重放事件重建状态。

#### CQRS (Command Query Responsibility Segregation)
命令和查询分离，使用不同的数据模型。

**架构：**
- 命令端：处理创建、更新、删除操作
- 查询端：处理查询操作，可优化读取性能

### 数据库模式

#### 数据库 per 服务
每个服务有自己的数据库，服务间通过 API 或事件共享数据。

#### Saga 模式
跨服务的分布式事务管理。

**两种实现方式：**
1. **编排式 (Orchestration)**: 中央协调器控制
2. **编舞式 (Choreography)**: 各服务通过事件协作

### 可观测性模式

#### 分布式追踪
- OpenTelemetry
- Jaeger
- Zipkin

#### 指标收集
- Prometheus + Grafana
- Micrometer

#### 日志聚合
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Loki + Grafana
        `
      },
      {
        id: 'cloud-002',
        title: '容器化应用部署策略',
        summary: '云原生应用的部署策略和最佳实践',
        tags: ['部署', '云原生', 'CI/CD'],
        difficulty: '中级',
        readTime: '12 分钟',
        content: `
## 容器化应用部署策略

### 部署策略对比

| 策略 | 复杂度 | 风险 | 回滚速度 | 资源需求 |
|------|--------|------|----------|----------|
| 重建部署 | 低 | 高（有停机） | 快 | 低 |
| 滚动更新 | 中 | 低 | 中 | 低 |
| 蓝绿部署 | 中 | 最低 | 最快 | 高（2x） |
| 金丝雀发布 | 高 | 低 | 中 | 中 |
| 影子部署 | 高 | 低 | 快 | 高 |

### 重建部署 (Recreate)

先停止旧版本，再部署新版本。

**适用场景：**
- 开发环境
- 非关键业务
- 数据库无法多版本共存

**Kubernetes 配置：**
\`\`\`yaml
strategy:
  type: Recreate
\`\`\`

### 滚动更新 (Rolling Update)

逐个替换 Pod，确保应用始终可用。

**Kubernetes 默认策略：**
\`\`\`yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%        # 最多超出 desired 的 Pod 数
    maxUnavailable: 25%  # 最多不可用的 Pod 数
\`\`\`

**优点：**
- 资源利用率高
- 用户无感知

**缺点：**
- 部署过程中同时运行两个版本
- 回滚较慢

### 蓝绿部署 (Blue/Green)

同时部署两个版本，流量在两者间切换。

**架构：**
- **Blue**: 当前运行的版本
- **Green**: 新版本

**工作流：**
1. 部署 Green 版本（与 Blue 并行）
2. 测试 Green 版本
3. 将流量切换到 Green
4. 保留 Blue 版本一段时间（用于回滚）

**Kubernetes 实现方式：**
- 使用两个独立的 Deployment
- 通过 Service selector 切换流量

**优点：**
- 零停机
- 瞬间回滚
- 完整测试新版本

**缺点：**
- 需要双倍资源
- 数据库需要兼容两个版本

### 金丝雀发布 (Canary Release)

逐步将流量从旧版本切换到新版本。

**工作流：**
1. 部署新版本，接收少量流量（如 5%）
2. 监控新版本表现
3. 如果正常，逐步增加流量
4. 完全切换后，移除旧版本

**Kubernetes 实现：**
- 使用两个 Deployment，控制副本数比例
- 使用 Service Mesh（如 Istio, Linkerd）精确控制流量

**流量比例示例：**
\`\`\`
v1: 10 个副本 → 90% 流量
v2: 2 个副本  → 10% 流量
\`\`\`

**优点：**
- 风险可控
- 可以观察真实用户反馈
- 问题影响范围小

**缺点：**
- 部署周期较长
- 需要监控和分析工具

### 影子部署 (Shadow Deployment)

新版本接收与旧版本相同的流量，但不影响用户。

**适用场景：**
- 性能测试
- 兼容性验证
- 新功能验证

**工作流：**
1. 部署影子版本
2. 复制流量到影子版本
3. 对比两个版本的表现
4. 验证通过后进行正式部署

### 选择建议

| 场景 | 推荐策略 |
|------|----------|
| 开发环境 | 重建部署 |
| 测试环境 | 滚动更新 |
| 生产环境（关键业务） | 蓝绿部署 |
| 生产环境（需要验证） | 金丝雀发布 |
| 重大重构/性能优化 | 影子部署 + 蓝绿 |
        `
      }
    ]
  },
  {
    id: 'security-compliance',
    name: '安全合规要求',
    icon: '🔒',
    color: '#f56c6c',
    description: 'DevOps 安全最佳实践和合规性要求',
    articles: [
      {
        id: 'sec-001',
        title: 'DevSecOps 最佳实践',
        summary: '将安全集成到 DevOps 全流程的最佳实践',
        tags: ['DevSecOps', '安全左移', '自动化'],
        difficulty: '高级',
        readTime: '15 分钟',
        content: `
## DevSecOps 最佳实践

### 安全左移 (Shift Left)

将安全检查尽可能早地集成到开发流程中。

#### 开发阶段
- **IDE 安全插件**: SonarLint, ESLint 安全规则
- **依赖扫描**: 检查第三方库漏洞
- **代码审查**: 安全相关的代码审查检查清单

#### 构建阶段
- **SAST (静态应用安全测试)**: SonarQube, Checkmarx
- **SCA (软件组成分析)**: Snyk, Dependency-Check
- **Secret 扫描**: git-secrets, Gitleaks

#### 测试阶段
- **DAST (动态应用安全测试)**: OWASP ZAP, Burp Suite
- **IAST (交互式应用安全测试)**: Contrast Security
- **渗透测试**: 自动化 + 人工

#### 部署阶段
- **容器扫描**: Trivy, Clair
- **基础设施即代码扫描**: Checkov, tfsec
- **运行时防护**: Falco, Tracee

### CI/CD 流水线中的安全检查

\`\`\`yaml
# .gitlab-ci.yml 示例
stages:
  - build
  - test
  - security
  - deploy

# 依赖扫描
dependency_scan:
  stage: security
  image: snyk/snyk
  script:
    - snyk test

# 静态代码分析
sonarqube:
  stage: security
  image: sonarsource/sonar-scanner-cli
  script:
    - sonar-scanner

# 容器镜像扫描
trivy:
  stage: security
  image: aquasec/trivy
  script:
    - trivy image myapp:latest --exit-code 1 --severity HIGH,CRITICAL
\`\`\`

### 密钥管理最佳实践

#### 不要做的事
❌ 不要在代码中硬编码密钥
❌ 不要在配置文件中明文存储密钥
❌ 不要将密钥提交到版本控制

#### 应该做的事
✅ 使用环境变量注入
✅ 使用密钥管理服务
✅ 定期轮换密钥
✅ 审计密钥使用

#### 密钥管理工具
- **云服务商**: AWS Secrets Manager, Azure Key Vault, GCP Secret Manager
- **开源**: HashiCorp Vault, CyberArk Conjur
- **Kubernetes**: Secrets (加密存储), External Secrets Operator

### 基础设施即代码安全

#### Terraform 安全检查
使用 Checkov 或 tfsec 扫描 IaC：

\`\`\`bash
# Checkov 扫描
checkov -d .

# tfsec 扫描
tfsec .
\`\`\`

#### 常见安全问题
- 安全组开放范围过大
- S3 存储桶公开访问
- IAM 权限过大
- 未加密的资源
- 硬编码的密钥

### 运行时安全

#### 容器运行时安全
- **Falco**: 检测容器异常行为
- **Tracee**: eBPF 为基础的运行时安全
- **AppArmor/SELinux**: 强制访问控制

#### Kubernetes 安全策略
- **Pod Security Standards**: 限制 Pod 权限
- **Network Policies**: 控制 Pod 网络通信
- **OPA/Gatekeeper**: 策略即代码

### 安全合规自动化

#### 合规即代码 (Compliance as Code)
使用代码定义合规要求，自动化检查。

**框架：**
- **CIS 基准**: 行业标准安全配置
- **SOC 2**: 服务组织控制报告
- **PCI DSS**: 支付卡行业安全标准
- **GDPR**: 通用数据保护条例

#### 自动化合规检查
- **Kube-bench**: 检查 Kubernetes CIS 基准
- **Docker-bench**: 检查 Docker CIS 基准
- **InSpec**: 基础设施合规检测

### 安全文化建设

#### 培训与意识
- 定期安全培训
- 安全代码审查实践
- 漏洞奖励计划

#### 安全度量
- 漏洞修复时间 (MTTR)
- 安全测试覆盖率
- 合规检查通过率
- 安全事件数量和严重程度

### 安全自动化工具链

| 阶段 | 工具类型 | 推荐工具 |
|------|----------|----------|
| 编码 | IDE 安全插件 | SonarLint, Snyk IDE |
| 提交 | 预提交钩子 | pre-commit, git-secrets |
| 构建 | SAST/SCA | SonarQube, Snyk |
| 测试 | DAST/IAST | OWASP ZAP, Burp |
| 制品 | 镜像扫描 | Trivy, Clair |
| 部署 | IaC 扫描 | Checkov, tfsec |
| 运行 | 运行时防护 | Falco, Tracee |
        `
      },
      {
        id: 'sec-002',
        title: 'API 安全设计指南',
        summary: 'RESTful API 安全设计的核心原则和实践',
        tags: ['API', '安全', '认证授权'],
        difficulty: '中级',
        readTime: '13 分钟',
        content: `
## API 安全设计指南

### 认证机制

#### API Key 认证
简单但安全性较低，适合内部服务或低风险场景。

\`\`\`http
GET /api/resource
X-API-Key: abc123def456
\`\`\`

**最佳实践：**
- 使用强随机生成的 Key
- 不要在 URL 中传递
- 定期轮换
- 存储时哈希处理

#### Bearer Token (JWT)
现代 Web 应用最常用的认证方式。

\`\`\`http
GET /api/resource
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
\`\`\`

**JWT 最佳实践：**
- 使用短生命周期的 access token
- 使用 refresh token 获取新的 access token
- 验证签名算法（防止 None 算法攻击）
- 验证 exp, nbf, iss, aud 声明
- 敏感信息不要放在 payload 中

#### OAuth 2.0
第三方应用授权的标准协议。

**常用授权类型：**
- **Authorization Code**: 服务端 Web 应用
- **Authorization Code + PKCE**: 移动端/单页应用
- **Client Credentials**: 服务间通信
- **Refresh Token**: 获取新的 access token

#### mTLS (双向 TLS)
最高安全性，适合金融、政府等高安全场景。

**优势：**
- 强身份认证
- 防止中间人攻击
- 不可伪造

### 授权机制

#### RBAC (基于角色的访问控制)

\`\`\`yaml
# 角色定义
roles:
  admin:
    permissions: [read, write, delete, manage]
  editor:
    permissions: [read, write]
  viewer:
    permissions: [read]

# 用户角色分配
users:
  john: [admin]
  jane: [editor]
  guest: [viewer]
\`\`\`

#### ABAC (基于属性的访问控制)

更细粒度的控制，基于多种属性组合决策。

\`\`\`
条件：user.department == "engineering" AND resource.type == "document" AND action == "write"
\`\`\`

### API 安全漏洞防护

#### 1. 注入攻击防护
- 使用参数化查询/预编译语句
- 验证和转义所有输入
- 使用 ORM 框架

#### 2. 认证失败防护
- 实现账户锁定机制
- 使用强密码策略
- 多因素认证 (MFA)
- 限制登录尝试次数

#### 3. 敏感数据泄露防护
- 传输层：强制使用 TLS 1.2+
- 存储层：使用强加密算法
- 日志中不要记录敏感信息
- API 响应中脱敏处理

#### 4. 资源耗尽防护 (DoS)
- 实现速率限制
- 设置请求超时
- 限制请求体大小
- 实施熔断机制

#### 5. 权限提升防护
- 最小权限原则
- 默认拒绝策略
- 审计所有敏感操作
- 定期权限审查

### API 安全 Header

#### 推荐的安全 Header

\`\`\`http
# 防止 XSS
X-XSS-Protection: 1; mode=block

# 防止 MIME 类型嗅探
X-Content-Type-Options: nosniff

# 点击劫持防护
X-Frame-Options: DENY

# 内容安全策略
Content-Security-Policy: default-src 'self'

# 严格传输安全
Strict-Transport-Security: max-age=31536000; includeSubDomains

# 引用策略
Referrer-Policy: strict-origin-when-cross-origin

# 权限策略
Permissions-Policy: geolocation=(), microphone=(), camera=()
\`\`\`

### 速率限制

#### 实现策略

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| 固定窗口 | 每个时间段固定请求数 | 简单场景 |
| 滑动窗口 | 平滑的请求计数 | 需要精确控制 |
| 令牌桶 | 允许突发流量 | API 网关 |
| 漏桶 | 平滑处理请求 | 保护后端服务 |

#### HTTP 响应头

\`\`\`http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 50
X-RateLimit-Reset: 1620000000
Retry-After: 60
\`\`\`

### API 版本管理

#### 安全考虑
- 旧版本 API 可能存在安全漏洞
- 需要明确的弃用和移除策略
- 通知用户版本升级

#### 版本管理方式
- **URL 路径**: /api/v1/users
- **Header**: X-API-Version: 1.0
- **Accept Header**: Accept: application/vnd.myapi.v1+json

### API 安全测试清单

#### 认证测试
- [ ] 未认证访问受保护资源
- [ ] 无效 token 处理
- [ ] token 过期处理
- [ ] token 篡改检测

#### 授权测试
- [ ] 越权访问其他用户数据
- [ ] 越权执行管理操作
- [ ] 权限边界测试

#### 输入验证测试
- [ ] SQL 注入
- [ ] NoSQL 注入
- [ ] XSS 攻击
- [ ] 命令注入

#### 配置测试
- [ ] 安全 Header 配置
- [ ] CORS 配置
- [ ] 错误信息泄露
- [ ] 调试接口关闭
        `
      }
    ]
  }
]

export const getCategoryById = (categoryId) => {
  return knowledgeCategories.find(cat => cat.id === categoryId)
}

export const getArticleById = (articleId) => {
  for (const category of knowledgeCategories) {
    const article = category.articles.find(art => art.id === articleId)
    if (article) {
      return { ...article, categoryId: category.id, categoryName: category.name }
    }
  }
  return null
}

export const getRelatedArticles = (categoryId, excludeArticleId, limit = 3) => {
  const category = getCategoryById(categoryId)
  if (!category) return []
  
  return category.articles
    .filter(art => art.id !== excludeArticleId)
    .slice(0, limit)
}

export const getRecommendationsForPage = (pageType) => {
  const recommendations = {
    cicd: [
      ...getCategoryById('cicd-best-practices')?.articles.slice(0, 2) || [],
      ...getCategoryById('security-compliance')?.articles.slice(0, 1) || []
    ],
    docker: [
      ...getCategoryById('docker-optimization')?.articles.slice(0, 2) || [],
      ...getCategoryById('kubernetes-ops')?.articles.slice(0, 1) || []
    ],
    kubernetes: [
      ...getCategoryById('kubernetes-ops')?.articles.slice(0, 3) || []
    ],
    cloud: [
      ...getCategoryById('cloud-architecture')?.articles.slice(0, 3) || []
    ]
  }
  
  return recommendations[pageType] || []
}

const CUSTOM_KNOWLEDGE_STORAGE_KEY = 'ai-devops-custom-knowledge'

export const customCategory = {
  id: 'custom',
  name: '我的知识',
  icon: '📝',
  color: '#7c3aed',
  description: '用户自定义的知识库条目',
  articles: []
}

export const saveCustomKnowledge = (articles) => {
  try {
    localStorage.setItem(CUSTOM_KNOWLEDGE_STORAGE_KEY, JSON.stringify(articles))
    return true
  } catch (error) {
    console.error('[KnowledgeBase] 保存自定义知识失败:', error)
    return false
  }
}

export const loadCustomKnowledge = () => {
  try {
    const saved = localStorage.getItem(CUSTOM_KNOWLEDGE_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('[KnowledgeBase] 加载自定义知识失败:', error)
  }
  return []
}

export const addCustomArticle = (article) => {
  const articles = loadCustomKnowledge()
  const newArticle = {
    ...article,
    id: article.id || `custom-${Date.now()}`,
    createdAt: article.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  articles.unshift(newArticle)
  saveCustomKnowledge(articles)
  return newArticle
}

export const updateCustomArticle = (articleId, updates) => {
  const articles = loadCustomKnowledge()
  const index = articles.findIndex(art => art.id === articleId)
  if (index !== -1) {
    articles[index] = {
      ...articles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    saveCustomKnowledge(articles)
    return articles[index]
  }
  return null
}

export const deleteCustomArticle = (articleId) => {
  const articles = loadCustomKnowledge()
  const filtered = articles.filter(art => art.id !== articleId)
  saveCustomKnowledge(filtered)
  return filtered.length !== articles.length
}

export const getCustomArticleById = (articleId) => {
  const articles = loadCustomKnowledge()
  const article = articles.find(art => art.id === articleId)
  if (article) {
    return { ...article, categoryId: 'custom', categoryName: '我的知识' }
  }
  return null
}

export const getAllCategoriesWithCustom = () => {
  const customArticles = loadCustomKnowledge()
  const categories = [...knowledgeCategories]
  
  if (customArticles.length > 0) {
    categories.push({
      ...customCategory,
      articles: customArticles
    })
  }
  
  return categories
}

export const getArticleByIdWithCustom = (articleId) => {
  const staticArticle = getArticleById(articleId)
  if (staticArticle) {
    return staticArticle
  }
  return getCustomArticleById(articleId)
}

export const getCategoryByIdWithCustom = (categoryId) => {
  if (categoryId === 'custom') {
    const customArticles = loadCustomKnowledge()
    return {
      ...customCategory,
      articles: customArticles
    }
  }
  return getCategoryById(categoryId)
}
