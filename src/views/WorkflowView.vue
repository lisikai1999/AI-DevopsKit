<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><Share /></el-icon>
        <h1>工作流编排器</h1>
      </div>
      <p class="page-subtitle">将多个 AI 功能串联成自动化工作流，支持自定义模板</p>
    </div>

    <div class="page-content">
      <el-tabs v-model="activeTab" class="workflow-tabs">
        <el-tab-pane label="工作流列表" name="list">
          <el-row :gutter="24">
            <el-col :span="24">
              <el-card class="content-card">
                <template #header>
                  <div class="card-header">
                    <span class="card-title">我的工作流</span>
                    <div class="header-actions">
                      <el-button type="primary" @click="showCreateDialog = true">
                        <el-icon><Plus /></el-icon>
                        创建工作流
                      </el-button>
                    </div>
                  </div>
                </template>

                <el-empty v-if="workflowStore.workflows.length === 0" description="暂无工作流">
                  <el-button type="primary" @click="showCreateDialog = true">
                    创建第一个工作流
                  </el-button>
                </el-empty>

                <el-table v-else :data="workflowStore.workflows" style="width: 100%" stripe>
                  <el-table-column prop="name" label="名称" min-width="200">
                    <template #default="scope">
                      <div class="workflow-name">
                        <span class="workflow-icon">{{ getWorkflowIcon(scope.row) }}</span>
                        <span>{{ scope.row.name }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
                  <el-table-column prop="steps.length" label="步骤数" width="100" align="center">
                    <template #default="scope">
                      <el-tag size="small">{{ scope.row.steps?.length || 0 }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createdAt" label="创建时间" width="180">
                    <template #default="scope">
                      {{ formatDate(scope.row.createdAt) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="280" fixed="right">
                    <template #default="scope">
                      <el-button size="small" type="primary" @click="editWorkflow(scope.row.id)">
                        <el-icon><Edit /></el-icon>
                        编辑
                      </el-button>
                      <el-button size="small" type="success" @click="runWorkflow(scope.row.id)">
                        <el-icon><VideoPlay /></el-icon>
                        执行
                      </el-button>
                      <el-button size="small" @click="duplicateWorkflow(scope.row.id)">
                        <el-icon><CopyDocument /></el-icon>
                      </el-button>
                      <el-button size="small" type="danger" @click="confirmDelete(scope.row.id, scope.row.name)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-card>
            </el-col>

            <el-col :span="24" style="margin-top: 24px;">
              <el-card class="content-card">
                <template #header>
                  <div class="card-header">
                    <span class="card-title">工作流模板</span>
                    <el-tag type="info" size="large">快速创建</el-tag>
                  </div>
                </template>

                <el-row :gutter="24">
                  <el-col :span="8" v-for="template in workflowStore.templates" :key="template.id">
                    <div class="template-card" @click="createFromTemplate(template.id)">
                      <div class="template-header">
                        <span class="template-icon">{{ template.icon }}</span>
                        <div>
                          <h4 class="template-name">{{ template.name }}</h4>
                          <p class="template-category">{{ template.category }}</p>
                        </div>
                      </div>
                      <p class="template-description">{{ template.description }}</p>
                      <div class="template-footer">
                        <el-tag v-for="tag in template.tags.slice(0, 3)" :key="tag" size="small" style="margin-right: 4px;">
                          {{ tag }}
                        </el-tag>
                        <span class="step-count">{{ template.steps?.length || 0 }} 个步骤</span>
                      </div>
                    </div>
                  </el-col>
                </el-row>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="工作流编辑" name="edit" :disabled="!editingWorkflow">
          <div v-if="editingWorkflow">
            <el-row :gutter="24">
              <el-col :span="8">
                <el-card class="content-card">
                  <template #header>
                    <div class="card-header">
                      <span class="card-title">工作流信息</span>
                      <el-button size="small" @click="saveWorkflow">
                        <el-icon><Check /></el-icon>
                        保存
                      </el-button>
                    </div>
                  </template>

                  <el-form label-width="100px">
                    <el-form-item label="名称">
                      <el-input v-model="editingWorkflow.name" placeholder="输入工作流名称" />
                    </el-form-item>
                    <el-form-item label="描述">
                      <el-input
                        v-model="editingWorkflow.description"
                        type="textarea"
                        :rows="2"
                        placeholder="输入工作流描述"
                      />
                    </el-form-item>
                    <el-form-item label="标签">
                      <el-select v-model="editingWorkflow.tags" multiple placeholder="选择标签">
                        <el-option label="CI/CD" value="CI/CD" />
                        <el-option label="安全" value="安全" />
                        <el-option label="运维" value="运维" />
                        <el-option label="部署" value="部署" />
                        <el-option label="自动化" value="自动化" />
                      </el-select>
                    </el-form-item>
                  </el-form>

                  <el-divider />

                  <el-card class="variables-card" shadow="never">
                    <template #header>
                      <div class="card-header">
                        <span>变量配置</span>
                        <el-button size="small" text @click="addVariable">
                          <el-icon><Plus /></el-icon>
                          添加变量
                        </el-button>
                      </div>
                    </template>
                    <el-table :data="variableList" size="small">
                      <el-table-column prop="key" label="变量名" width="150">
                        <template #default="scope">
                          <el-input v-model="scope.row.key" size="small" placeholder="key" />
                        </template>
                      </el-table-column>
                      <el-table-column prop="value" label="值">
                        <template #default="scope">
                          <el-input v-model="scope.row.value" size="small" placeholder="value" />
                        </template>
                      </el-table-column>
                      <el-table-column width="60" align="center">
                        <template #default="scope">
                          <el-button size="small" type="danger" link @click="removeVariable(scope.$index)">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </el-card>
                </el-card>

                <el-card class="content-card" style="margin-top: 24px;">
                  <template #header>
                    <div class="card-header">
                      <span class="card-title">添加步骤</span>
                    </div>
                  </template>

                  <div class="action-type-list">
                    <div
                      v-for="(info, type) in actionTypeInfo"
                      :key="type"
                      class="action-type-item"
                      @click="addNewStep(type)"
                    >
                      <span class="action-icon">{{ info.icon }}</span>
                      <div>
                        <div class="action-name">{{ info.name }}</div>
                        <div class="action-desc">{{ info.description }}</div>
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-col>

              <el-col :span="16">
                <el-card class="content-card steps-card">
                  <template #header>
                    <div class="card-header">
                      <span class="card-title">工作流步骤</span>
                      <div class="header-actions">
                        <el-tag v-if="editingWorkflow.steps?.length > 0" type="primary">
                          {{ editingWorkflow.steps.length }} 个步骤
                        </el-tag>
                        <el-button
                          v-if="editingWorkflow.steps?.length > 0"
                          size="small"
                          type="success"
                          @click="runWorkflow(editingWorkflow.id)"
                        >
                          <el-icon><VideoPlay /></el-icon>
                          执行工作流
                        </el-button>
                      </div>
                    </div>
                  </template>

                  <el-empty
                    v-if="!editingWorkflow.steps || editingWorkflow.steps.length === 0"
                    description="暂无步骤，从左侧选择一个动作类型添加"
                  />

                  <el-timeline v-else>
                    <el-timeline-item
                      v-for="(step, index) in editingWorkflow.steps"
                      :key="step.id"
                      :timestamp="`步骤 ${index + 1}`"
                      placement="top"
                    >
                      <el-card class="step-card" :class="{ 'step-selected': selectedStepId === step.id }">
                        <div class="step-header" @click="selectStep(step.id)">
                          <div class="step-info">
                            <span class="step-icon">{{ getStepIcon(step.actionType) }}</span>
                            <div>
                              <h4 class="step-name">{{ step.name }}</h4>
                              <el-tag size="small" type="info">{{ getStepTypeName(step.actionType) }}</el-tag>
                            </div>
                          </div>
                          <div class="step-actions">
                            <el-button size="small" text @click.stop="moveStepUp(index)" :disabled="index === 0">
                              <el-icon><ArrowUp /></el-icon>
                            </el-button>
                            <el-button
                              size="small"
                              text
                              @click.stop="moveStepDown(index)"
                              :disabled="index === editingWorkflow.steps.length - 1"
                            >
                              <el-icon><ArrowDown /></el-icon>
                            </el-button>
                            <el-button size="small" text type="danger" @click.stop="deleteStep(step.id)">
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>

                        <div v-if="selectedStepId === step.id" class="step-content">
                          <el-form label-width="100px" size="small">
                            <el-form-item label="步骤名称">
                              <el-input v-model="step.name" />
                            </el-form-item>
                            <el-form-item label="描述">
                              <el-input v-model="step.description" type="textarea" :rows="2" />
                            </el-form-item>

                            <el-divider content-position="left">步骤配置</el-divider>

                            <div v-if="step.actionType === 'generate_cicd_config'" class="step-config">
                              <el-form-item label="CI/CD 平台">
                                <el-select v-model="step.config.platform" style="width: 100%">
                                  <el-option label="Jenkins" value="jenkins" />
                                  <el-option label="GitLab CI/CD" value="gitlab" />
                                  <el-option label="GitHub Actions" value="github" />
                                  <el-option label="Azure DevOps" value="azure" />
                                </el-select>
                              </el-form-item>
                              <el-form-item label="模板类型">
                                <el-select v-model="step.config.template" style="width: 100%">
                                  <el-option label="简单构建" value="simple" />
                                  <el-option label="Docker 构建" value="docker" />
                                  <el-option label="高级流水线" value="advanced" />
                                </el-select>
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'analyze_dockerfile'" class="step-config">
                              <el-form-item label="安全扫描">
                                <el-switch v-model="step.config.securityScan" />
                              </el-form-item>
                              <el-form-item label="深度扫描">
                                <el-switch v-model="step.config.deepScan" />
                              </el-form-item>
                              <el-form-item label="性能优化">
                                <el-switch v-model="step.config.optimize" />
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'analyze_cicd_config'" class="step-config">
                              <el-form-item label="平台">
                                <el-select v-model="step.config.platform" style="width: 100%">
                                  <el-option label="Jenkins" value="jenkins" />
                                  <el-option label="GitLab CI/CD" value="gitlab" />
                                  <el-option label="GitHub Actions" value="github" />
                                  <el-option label="Azure DevOps" value="azure" />
                                </el-select>
                              </el-form-item>
                              <el-form-item label="安全检查">
                                <el-switch v-model="step.config.securityCheck" />
                              </el-form-item>
                              <el-form-item label="性能优化">
                                <el-switch v-model="step.config.performanceOptimize" />
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'webhook'" class="step-config">
                              <el-form-item label="URL">
                                <el-input v-model="step.config.url" placeholder="https://example.com/webhook" />
                              </el-form-item>
                              <el-form-item label="HTTP 方法">
                                <el-select v-model="step.config.method" style="width: 100%">
                                  <el-option label="GET" value="GET" />
                                  <el-option label="POST" value="POST" />
                                  <el-option label="PUT" value="PUT" />
                                  <el-option label="DELETE" value="DELETE" />
                                </el-select>
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'delay'" class="step-config">
                              <el-form-item label="延迟时间 (毫秒)">
                                <el-input-number v-model="step.config.delay" :min="0" :max="86400000" />
                              </el-form-item>
                              <el-form-item label="需要审批">
                                <el-switch v-model="step.config.requireApproval" />
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'condition'" class="step-config">
                              <el-form-item label="条件表达式">
                                <el-input
                                  v-model="step.config.condition"
                                  type="textarea"
                                  :rows="3"
                                  placeholder="例如: variables.status === 'success'"
                                />
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'jenkins_execute'" class="step-config">
                              <el-divider content-position="left">Jenkins 连接配置</el-divider>
                              <el-form-item label="Jenkins URL">
                                <el-input v-model="step.config.jenkinsUrl" placeholder="https://jenkins.example.com" />
                              </el-form-item>
                              <el-form-item label="Job 名称">
                                <el-input v-model="step.config.jobName" placeholder="my-job-name" />
                              </el-form-item>
                              <el-form-item label="用户名 (可选)">
                                <el-input v-model="step.config.username" placeholder="admin" />
                              </el-form-item>
                              <el-form-item label="API Token (可选)">
                                <el-input
                                  v-model="step.config.apiToken"
                                  type="password"
                                  placeholder="jenkins-api-token"
                                  show-password
                                />
                              </el-form-item>

                              <el-divider content-position="left">执行配置</el-divider>
                              <el-form-item label="等待构建完成">
                                <el-switch v-model="step.config.waitForBuild" />
                              </el-form-item>
                              <el-form-item v-if="step.config.waitForBuild" label="轮询间隔 (毫秒)">
                                <el-input-number
                                  v-model="step.config.pollInterval"
                                  :min="1000"
                                  :max="300000"
                                  :step="1000"
                                />
                              </el-form-item>
                              <el-form-item v-if="step.config.waitForBuild" label="超时时间 (毫秒)">
                                <el-input-number
                                  v-model="step.config.timeout"
                                  :min="60000"
                                  :max="86400000"
                                  :step="10000"
                                />
                              </el-form-item>

                              <el-divider content-position="left">构建参数 (JSON)</el-divider>
                              <el-form-item label="参数">
                                <el-input
                                  v-model="stepConfigParamsJson"
                                  type="textarea"
                                  :rows="3"
                                  placeholder='{"param1": "value1", "param2": "value2"}'
                                />
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'aws_ecs_check'" class="step-config">
                              <el-divider content-position="left">ECS 服务配置</el-divider>
                              <el-form-item label="AWS 区域">
                                <el-select v-model="step.config.region" style="width: 100%">
                                  <el-option label="US East (N. Virginia)" value="us-east-1" />
                                  <el-option label="US West (Oregon)" value="us-west-2" />
                                  <el-option label="EU (Ireland)" value="eu-west-1" />
                                  <el-option label="Asia Pacific (Tokyo)" value="ap-northeast-1" />
                                  <el-option label="Asia Pacific (Singapore)" value="ap-southeast-1" />
                                  <el-option label="China (Beijing)" value="cn-north-1" />
                                  <el-option label="China (Ningxia)" value="cn-northwest-1" />
                                </el-select>
                              </el-form-item>
                              <el-form-item label="集群名称">
                                <el-input v-model="step.config.cluster" placeholder="my-cluster" />
                              </el-form-item>
                              <el-form-item label="服务名称">
                                <el-input v-model="step.config.serviceName" placeholder="my-service" />
                              </el-form-item>
                              <el-form-item label="期望运行任务数 (可选)">
                                <el-input-number
                                  v-model="step.config.expectedCount"
                                  :min="0"
                                  :max="1000"
                                  placeholder="留空使用服务当前 desired count"
                                />
                              </el-form-item>

                              <el-divider content-position="left">检查配置</el-divider>
                              <el-form-item label="检查间隔 (毫秒)">
                                <el-input-number
                                  v-model="step.config.checkInterval"
                                  :min="5000"
                                  :max="300000"
                                  :step="5000"
                                />
                              </el-form-item>
                              <el-form-item label="最大重试次数">
                                <el-input-number
                                  v-model="step.config.maxRetries"
                                  :min="1"
                                  :max="100"
                                />
                              </el-form-item>

                              <el-divider content-position="left">AWS 凭证 (可选)</el-divider>
                              <el-form-item label="Access Key ID">
                                <el-input
                                  v-model="step.config.accessKeyId"
                                  placeholder="AKIAIOSFODNN7EXAMPLE"
                                />
                              </el-form-item>
                              <el-form-item label="Secret Access Key">
                                <el-input
                                  v-model="step.config.secretAccessKey"
                                  type="password"
                                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                  show-password
                                />
                              </el-form-item>
                            </div>

                            <div v-else-if="step.actionType === 'wework_notification'" class="step-config">
                              <el-divider content-position="left">机器人配置</el-divider>
                              <el-form-item label="Webhook URL">
                                <el-input
                                  v-model="step.config.webhookUrl"
                                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                                />
                              </el-form-item>
                              <el-form-item label="消息类型">
                                <el-select v-model="step.config.messageType" style="width: 100%">
                                  <el-option label="文本消息" value="text" />
                                  <el-option label="Markdown 消息" value="markdown" />
                                  <el-option label="图文消息" value="news" />
                                  <el-option label="模板卡片" value="template_card" />
                                </el-select>
                              </el-form-item>

                              <el-divider content-position="left">消息内容</el-divider>
                              <el-form-item label="消息内容">
                                <el-input
                                  v-model="step.config.content"
                                  type="textarea"
                                  :rows="4"
                                  placeholder="输入消息内容... (支持变量占位符: {{variableName}})"
                                />
                              </el-form-item>

                              <template v-if="step.config.messageType === 'news' || step.config.messageType === 'template_card'">
                                <el-form-item label="标题">
                                  <el-input v-model="step.config.title" placeholder="消息标题" />
                                </el-form-item>
                                <el-form-item label="描述">
                                  <el-input
                                    v-model="step.config.description"
                                    type="textarea"
                                    :rows="2"
                                    placeholder="消息描述"
                                  />
                                </el-form-item>
                              </template>

                              <template v-if="step.config.messageType === 'news'">
                                <el-form-item label="图片 URL">
                                  <el-input v-model="step.config.picUrl" placeholder="https://example.com/image.png" />
                                </el-form-item>
                              </template>

                              <el-form-item label="跳转链接 (可选)">
                                <el-input v-model="step.config.url" placeholder="https://example.com" />
                              </el-form-item>

                              <el-divider content-position="left">@提及配置</el-divider>
                              <el-form-item label="@所有人">
                                <el-switch v-model="step.config.mentionAll" />
                              </el-form-item>
                              <el-form-item v-if="!step.config.mentionAll" label="@提及用户 (逗号分隔)">
                                <el-input
                                  v-model="step.config.mentionsText"
                                  placeholder="user1,user2,user3"
                                />
                              </el-form-item>
                            </div>

                            <div v-else class="step-config">
                              <el-alert title="此步骤类型在可视化编辑器中完全配置" type="info" :closable="false" />
                            </div>

                            <el-divider content-position="left">高级设置</el-divider>

                            <el-form-item label="超时时间 (秒)">
                              <el-input-number
                                v-model="stepTimeoutSeconds"
                                :min="1"
                                :max="86400"
                              />
                            </el-form-item>

                            <el-form-item label="启用重试">
                              <el-switch v-model="step.retryPolicy.enabled" />
                            </el-form-item>

                            <template v-if="step.retryPolicy.enabled">
                              <el-form-item label="重试次数">
                                <el-input-number
                                  v-model="step.retryPolicy.maxRetries"
                                  :min="1"
                                  :max="10"
                                />
                              </el-form-item>
                              <el-form-item label="重试间隔 (毫秒)">
                                <el-input-number
                                  v-model="step.retryPolicy.delay"
                                  :min="100"
                                  :max="60000"
                                />
                              </el-form-item>
                            </template>

                            <el-form-item label="依赖步骤">
                              <el-select
                                v-model="step.dependsOn"
                                multiple
                                placeholder="选择依赖的步骤"
                                style="width: 100%"
                              >
                                <el-option
                                  v-for="s in editingWorkflow.steps.filter(s => s.id !== step.id)"
                                  :key="s.id"
                                  :label="s.name"
                                  :value="s.id"
                                />
                              </el-select>
                            </el-form-item>
                          </el-form>
                        </div>
                      </el-card>
                    </el-timeline-item>
                  </el-timeline>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <el-tab-pane label="执行历史" name="history">
          <div>
            <el-row :gutter="24">
              <el-col :span="24">
                <el-card class="content-card">
                  <template #header>
                    <div class="card-header">
                      <span class="card-title">所有执行历史</span>
                      <el-button
                        v-if="workflowStore.allExecutions.length > 0"
                        size="small"
                        type="danger"
                        @click="confirmClearAllHistory"
                      >
                        清空历史
                      </el-button>
                    </div>
                  </template>

                  <el-empty
                    v-if="workflowStore.allExecutions.length === 0"
                    description="暂无执行历史"
                  />

                  <el-table v-else :data="workflowStore.allExecutions" style="width: 100%" stripe>
                    <el-table-column prop="workflowSnapshot.name" label="工作流名称" min-width="200">
                      <template #default="scope">
                        <span>{{ scope.row.workflowSnapshot?.name || '未知工作流' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="status" label="状态" width="120" align="center">
                      <template #default="scope">
                        <el-tag :type="getStatusTagType(scope.row.status)" size="small">
                          {{ getStatusText(scope.row.status) }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="workflowSnapshot.steps.length" label="步骤数" width="100" align="center">
                      <template #default="scope">
                        <el-tag size="small">{{ scope.row.workflowSnapshot?.steps?.length || 0 }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="执行时间" width="120" align="center">
                      <template #default="scope">
                        <span>{{ getExecutionDuration(scope.row) }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="createdAt" label="执行时间" width="180">
                      <template #default="scope">
                        {{ formatDate(scope.row.createdAt) }}
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200" fixed="right">
                      <template #default="scope">
                        <el-button size="small" type="primary" @click="viewExecutionHistory(scope.row)">
                          <el-icon><View /></el-icon>
                          查看详情
                        </el-button>
                        <el-button size="small" type="danger" link @click="confirmDeleteHistory(scope.row)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <el-tab-pane label="执行结果" name="execute" :disabled="!workflowStore.currentExecution && !selectedHistoryExecution">
          <div v-if="workflowStore.currentExecution || selectedHistoryExecution">
            <div v-if="selectedHistoryExecution" class="history-banner">
              <el-alert
                title="查看历史执行记录"
                type="info"
                :closable="false"
                show-icon
              >
                <template #default>
                  <span>当前查看的是历史执行记录：{{ selectedHistoryExecution.workflowSnapshot?.name }}</span>
                  <el-button size="small" text type="primary" @click="clearSelectedHistory">
                    返回当前执行
                  </el-button>
                </template>
              </el-alert>
            </div>
            <el-row :gutter="24">
              <el-col :span="24">
                <el-card class="content-card">
                  <template #header>
                    <div class="card-header">
                      <span class="card-title">执行状态</span>
                      <el-tag :type="getStatusTagType(activeExecution?.status)">
                        {{ getStatusText(activeExecution?.status) }}
                      </el-tag>
                    </div>
                  </template>

                  <el-row :gutter="24">
                    <el-col :span="6">
                      <div class="stat-item">
                        <div class="stat-value">{{ activeExecutionProgress?.totalSteps || 0 }}</div>
                        <div class="stat-label">总步骤</div>
                      </div>
                    </el-col>
                    <el-col :span="6">
                      <div class="stat-item">
                        <div class="stat-value success">
                          {{ activeExecutionProgress?.completedSteps || 0 }}
                        </div>
                        <div class="stat-label">已完成</div>
                      </div>
                    </el-col>
                    <el-col :span="6">
                      <div class="stat-item">
                        <div class="stat-value running">
                          {{ activeExecutionProgress?.runningSteps || 0 }}
                        </div>
                        <div class="stat-label">执行中</div>
                      </div>
                    </el-col>
                    <el-col :span="6">
                      <div class="stat-item">
                        <div class="stat-value danger">
                          {{ activeExecutionProgress?.failedSteps || 0 }}
                        </div>
                        <div class="stat-label">失败</div>
                      </div>
                    </el-col>
                  </el-row>

                  <el-progress
                    v-if="activeExecutionProgress"
                    :percentage="Math.round(activeExecutionProgress.progress)"
                    :status="activeExecution?.status === 'completed' ? 'success' : undefined"
                    style="margin-top: 20px;"
                  />
                </el-card>
              </el-col>

              <el-col :span="12" style="margin-top: 24px;">
                <el-card class="content-card">
                  <template #header>
                    <span class="card-title">步骤执行状态</span>
                    <span style="font-size: 12px; color: #909399;">点击步骤查看输出</span>
                  </template>

                  <div class="step-status-list">
                    <div
                      v-for="step in activeExecution?.workflowSnapshot?.steps || []"
                      :key="step.id"
                      class="step-status-item"
                      :class="{ 'step-status-expanded': selectedStepForDetail === step.id }"
                      @click="toggleStepDetail(step.id)"
                    >
                      <div class="step-status-icon">
                        <el-icon :class="getStepStatusClass(getStepStatusForExecution(activeExecution, step.id))">
                          <component :is="getStepStatusIcon(getStepStatusForExecution(activeExecution, step.id))" />
                        </el-icon>
                      </div>
                      <div class="step-status-info">
                        <div class="step-status-name">{{ step.name }}</div>
                        <div class="step-status-time">
                          {{ getStepDurationForExecution(activeExecution, step.id) }}
                        </div>
                      </div>
                      <div class="step-status-expand">
                        <el-icon v-if="hasStepResult(activeExecution, step.id)">
                          <component :is="selectedStepForDetail === step.id ? 'CaretTop' : 'CaretBottom'" />
                        </el-icon>
                      </div>
                    </div>

                    <div
                      v-if="selectedStepForDetail && hasStepResult(activeExecution, selectedStepForDetail)"
                      class="step-detail-container"
                    >
                      <el-card class="step-detail-card" shadow="never">
                        <template #header>
                          <div class="step-detail-header">
                            <span class="step-detail-title">步骤输出</span>
                            <el-tag :type="getStepStatusTagType(getStepStatusForExecution(activeExecution, selectedStepForDetail))" size="small">
                              {{ getStatusText(getStepStatusForExecution(activeExecution, selectedStepForDetail)) }}
                            </el-tag>
                          </div>
                        </template>

                        <div class="step-detail-content">
                          <template v-if="getStepResult(activeExecution, selectedStepForDetail)">
                            <div v-if="getStepResult(activeExecution, selectedStepForDetail).content" class="step-output-section">
                              <div class="step-output-label">输出内容：</div>
                              <pre class="step-output-content">{{ getStepResult(activeExecution, selectedStepForDetail).content }}</pre>
                            </div>

                            <div v-if="getStepResult(activeExecution, selectedStepForDetail).data && Object.keys(getStepResult(activeExecution, selectedStepForDetail).data).length > 0" class="step-output-section">
                              <div class="step-output-label">详细数据：</div>
                              <pre class="step-output-content">{{ JSON.stringify(getStepResult(activeExecution, selectedStepForDetail).data, null, 2) }}</pre>
                            </div>

                            <div v-if="!getStepResult(activeExecution, selectedStepForDetail).content && !getStepResult(activeExecution, selectedStepForDetail).data" class="step-output-empty">
                              该步骤暂无输出内容
                            </div>
                          </template>
                        </div>
                      </el-card>
                    </div>
                  </div>
                </el-card>
              </el-col>

              <el-col :span="12" style="margin-top: 24px;">
                <el-card class="content-card">
                  <template #header>
                    <span class="card-title">执行日志</span>
                  </template>

                  <div class="log-container">
                    <div v-for="(log, index) in activeExecutionLogs" :key="index" class="log-item">
                      <el-tag v-if="log.type" size="small" :type="getLogTagType(log.type)">
                        {{ log.type }}
                      </el-tag>
                      <span class="log-time">{{ log.timestamp }}</span>
                      <span class="log-message">{{ log.stepName || log.message }}</span>
                    </div>
                    <div v-if="activeExecutionLogs.length === 0" class="log-empty">
                      等待执行...
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="showCreateDialog" title="创建工作流" width="600px">
      <el-form label-width="100px">
        <el-form-item label="创建方式">
          <el-radio-group v-model="createMode">
            <el-radio value="template">从模板创建</el-radio>
            <el-radio value="empty">创建空工作流</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="createMode === 'template'" label="选择模板">
          <el-select v-model="selectedTemplateForCreate" placeholder="选择一个模板" style="width: 100%">
            <el-option
              v-for="template in workflowStore.templates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            >
              <span style="margin-right: 8px;">{{ template.icon }}</span>
              {{ template.name }}
              <span style="color: #909399; font-size: 12px; margin-left: 8px;">
                {{ template.steps?.length || 0 }} 个步骤
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="工作流名称">
          <el-input v-model="newWorkflowName" placeholder="输入工作流名称" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="newWorkflowDescription" type="textarea" :rows="2" placeholder="输入描述（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateWorkflow" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Share, Plus, Edit, VideoPlay, CopyDocument, Delete, Check, ArrowUp, ArrowDown, View, CaretTop, CaretBottom } from '@element-plus/icons-vue'
import { useWorkflowStore } from '@/stores/workflow-store'
import { ActionType, ActionTypeInfo, WorkflowStatus, StepStatus } from '@/services/workflow-engine'

const workflowStore = useWorkflowStore()

const activeTab = ref('list')
const editingWorkflow = ref(null)
const selectedStepId = ref(null)
const selectedHistoryExecution = ref(null)
const selectedStepForDetail = ref(null)
const showCreateDialog = ref(false)
const createMode = ref('template')
const selectedTemplateForCreate = ref(null)
const newWorkflowName = ref('')
const newWorkflowDescription = ref('')
const creating = ref(false)

const actionTypeInfo = computed(() => ActionTypeInfo)

const stepTimeoutSeconds = computed({
  get() {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      return step?.timeout ? Math.floor(step.timeout / 1000) : 300
    }
    return 300
  },
  set(val) {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      if (step) {
        step.timeout = val * 1000
      }
    }
  }
})

const variableList = computed({
  get() {
    if (!editingWorkflow.value) return []
    return Object.entries(editingWorkflow.value.variables || {}).map(([key, value]) => ({ key, value }))
  },
  set(val) {
    if (editingWorkflow.value) {
      editingWorkflow.value.variables = {}
      val.forEach(item => {
        if (item.key) {
          editingWorkflow.value.variables[item.key] = item.value
        }
      })
    }
  }
})

const activeExecution = computed(() => {
  return selectedHistoryExecution.value || workflowStore.currentExecution
})

const activeExecutionProgress = computed(() => {
  if (!activeExecution.value) return null
  
  if (selectedHistoryExecution.value) {
    const stepStatusValues = Object.values(activeExecution.value.stepStatuses || {})
    const totalSteps = activeExecution.value.workflowSnapshot?.steps?.length || 0
    const completedSteps = stepStatusValues.filter(s => s.status === StepStatus.COMPLETED).length
    const failedSteps = stepStatusValues.filter(s => s.status === StepStatus.FAILED).length
    const runningSteps = stepStatusValues.filter(s => s.status === StepStatus.RUNNING).length
    
    return {
      totalSteps,
      completedSteps,
      failedSteps,
      runningSteps,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      status: activeExecution.value.status,
      startTime: activeExecution.value.startTime,
      endTime: activeExecution.value.endTime
    }
  }
  
  return workflowStore.executionProgress
})

const activeExecutionLogs = computed(() => {
  if (selectedHistoryExecution.value) {
    return selectedHistoryExecution.value.logs || []
  }
  return workflowStore.executionLogs
})

const stepConfigParamsJson = computed({
  get() {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      if (step?.config?.parameters) {
        return JSON.stringify(step.config.parameters, null, 2)
      }
    }
    return '{}'
  },
  set(val) {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      if (step) {
        try {
          step.config.parameters = JSON.parse(val)
        } catch {
          step.config.parameters = {}
        }
      }
    }
  }
})

const mentionsText = computed({
  get() {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      if (step?.config?.mentions && Array.isArray(step.config.mentions)) {
        return step.config.mentions.join(',')
      }
    }
    return ''
  },
  set(val) {
    if (selectedStepId.value && editingWorkflow.value) {
      const step = editingWorkflow.value.steps?.find(s => s.id === selectedStepId.value)
      if (step) {
        step.config.mentions = val ? val.split(',').map(s => s.trim()).filter(Boolean) : []
      }
    }
  }
})

onMounted(() => {
  workflowStore.loadTemplates()
  workflowStore.loadWorkflows()
})

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

function getWorkflowIcon(workflow) {
  if (workflow.templateId) {
    const template = workflowStore.templates.find(t => t.id === workflow.templateId)
    return template?.icon || '📋'
  }
  return '📋'
}

function getStepIcon(actionType) {
  return ActionTypeInfo[actionType]?.icon || '⚙️'
}

function getStepTypeName(actionType) {
  return ActionTypeInfo[actionType]?.name || actionType
}

function editWorkflow(id) {
  const workflow = workflowStore.getWorkflow(id)
  if (workflow) {
    editingWorkflow.value = JSON.parse(JSON.stringify(workflow))
    workflowStore.setCurrentWorkflow(id)
    selectedStepId.value = null
    activeTab.value = 'edit'
  }
}

function saveWorkflow() {
  if (!editingWorkflow.value) return
  
  workflowStore.updateWorkflow(editingWorkflow.value.id, {
    name: editingWorkflow.value.name,
    description: editingWorkflow.value.description,
    tags: editingWorkflow.value.tags,
    variables: editingWorkflow.value.variables,
    steps: editingWorkflow.value.steps,
    updatedAt: new Date().toISOString()
  })
  
  ElMessage.success('工作流已保存')
}

function addNewStep(actionType) {
  if (!editingWorkflow.value) return
  
  const step = {
    id: `step_${Date.now()}`,
    name: ActionTypeInfo[actionType]?.name || '新步骤',
    actionType: actionType,
    config: getDefaultConfig(actionType),
    description: '',
    dependsOn: [],
    retryPolicy: {
      enabled: false,
      maxRetries: 3,
      delay: 1000
    },
    timeout: 300000
  }
  
  if (!editingWorkflow.value.steps) {
    editingWorkflow.value.steps = []
  }
  editingWorkflow.value.steps.push(step)
  selectedStepId.value = step.id
  
  ElMessage.success('步骤已添加')
}

function getDefaultConfig(actionType) {
  const defaults = {
    [ActionType.GENERATE_CICD_CONFIG]: {
      platform: 'jenkins',
      template: 'simple',
      variables: {}
    },
    [ActionType.ANALYZE_DOCKERFILE]: {
      securityScan: true,
      deepScan: false,
      optimize: true
    },
    [ActionType.ANALYZE_CICD_CONFIG]: {
      platform: 'jenkins',
      securityCheck: true,
      performanceOptimize: true
    },
    [ActionType.WEBHOOK]: {
      url: '',
      method: 'POST',
      headers: {},
      payload: {}
    },
    [ActionType.DELAY]: {
      delay: 1000,
      requireApproval: false
    },
    [ActionType.CONDITION]: {
      condition: '',
      onTrue: [],
      onFalse: []
    },
    [ActionType.JENKINS_EXECUTE]: {
      jenkinsUrl: '',
      jobName: '',
      username: '',
      apiToken: '',
      parameters: {},
      waitForBuild: true,
      pollInterval: 5000,
      timeout: 300000
    },
    [ActionType.AWS_ECS_CHECK]: {
      region: 'cn-north-1',
      cluster: '',
      serviceName: '',
      expectedCount: null,
      checkInterval: 30000,
      maxRetries: 10,
      accessKeyId: '',
      secretAccessKey: ''
    },
    [ActionType.WEWORK_NOTIFICATION]: {
      webhookUrl: '',
      messageType: 'text',
      content: '',
      title: '',
      description: '',
      url: '',
      picUrl: '',
      mentions: [],
      mentionAll: false
    }
  }
  return defaults[actionType] || {}
}

function selectStep(stepId) {
  selectedStepId.value = selectedStepId.value === stepId ? null : stepId
}

function deleteStep(stepId) {
  ElMessageBox.confirm('确定要删除此步骤吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    if (editingWorkflow.value && editingWorkflow.value.steps) {
      const index = editingWorkflow.value.steps.findIndex(s => s.id === stepId)
      if (index !== -1) {
        editingWorkflow.value.steps.splice(index, 1)
        
        editingWorkflow.value.steps.forEach(step => {
          const depIndex = step.dependsOn.indexOf(stepId)
          if (depIndex !== -1) {
            step.dependsOn.splice(depIndex, 1)
          }
        })
        
        if (selectedStepId.value === stepId) {
          selectedStepId.value = null
        }
        
        ElMessage.success('步骤已删除')
      }
    }
  }).catch(() => {})
}

function moveStepUp(index) {
  if (index <= 0 || !editingWorkflow.value?.steps) return
  const steps = editingWorkflow.value.steps
  const temp = steps[index]
  steps[index] = steps[index - 1]
  steps[index - 1] = temp
}

function moveStepDown(index) {
  if (!editingWorkflow.value?.steps || index >= editingWorkflow.value.steps.length - 1) return
  const steps = editingWorkflow.value.steps
  const temp = steps[index]
  steps[index] = steps[index + 1]
  steps[index + 1] = temp
}

function addVariable() {
  if (!variableList.value) {
    variableList.value = []
  }
  variableList.value.push({ key: '', value: '' })
}

function removeVariable(index) {
  if (variableList.value) {
    variableList.value.splice(index, 1)
  }
}

async function handleCreateWorkflow() {
  if (!newWorkflowName.value.trim()) {
    ElMessage.warning('请输入工作流名称')
    return
  }
  
  creating.value = true
  
  try {
    let workflow
    if (createMode.value === 'template' && selectedTemplateForCreate.value) {
      workflow = workflowStore.createWorkflow(selectedTemplateForCreate.value, {
        name: newWorkflowName.value,
        description: newWorkflowDescription.value
      })
    } else {
      workflow = workflowStore.createEmptyWorkflow(
        newWorkflowName.value,
        newWorkflowDescription.value
      )
    }
    
    ElMessage.success('工作流创建成功')
    showCreateDialog.value = false
    
    editingWorkflow.value = workflow
    workflowStore.setCurrentWorkflow(workflow.id)
    activeTab.value = 'edit'
    selectedStepId.value = null
    
    newWorkflowName.value = ''
    newWorkflowDescription.value = ''
    selectedTemplateForCreate.value = null
    
  } catch (error) {
    ElMessage.error(`创建失败: ${error.message}`)
  } finally {
    creating.value = false
  }
}

function createFromTemplate(templateId) {
  createMode.value = 'template'
  selectedTemplateForCreate.value = templateId
  const template = workflowStore.templates.find(t => t.id === templateId)
  if (template) {
    newWorkflowName.value = template.name
    newWorkflowDescription.value = template.description
  }
  showCreateDialog.value = true
}

function duplicateWorkflow(id) {
  const workflow = workflowStore.duplicateWorkflow(id)
  if (workflow) {
    ElMessage.success('工作流已复制')
  }
}

function confirmDelete(id, name) {
  ElMessageBox.confirm(`确定要删除工作流 "${name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    workflowStore.deleteWorkflow(id)
    ElMessage.success('工作流已删除')
    if (editingWorkflow.value?.id === id) {
      editingWorkflow.value = null
      selectedStepId.value = null
      activeTab.value = 'list'
    }
  }).catch(() => {})
}

async function runWorkflow(id) {
  try {
    workflowStore.clearExecutionState()
    
    ElMessage.info('工作流开始执行，请稍候...')
    activeTab.value = 'execute'
    
    const result = await workflowStore.executeWorkflow(id)
    
    if (result.success) {
      ElMessage.success('工作流执行完成')
    } else {
      ElMessage.error(`工作流执行失败: ${result.error}`)
    }
    
  } catch (error) {
    ElMessage.error(`执行失败: ${error.message}`)
  }
}

function getStatusTagType(status) {
  const types = {
    [WorkflowStatus.IDLE]: 'info',
    [WorkflowStatus.RUNNING]: 'primary',
    [WorkflowStatus.PAUSED]: 'warning',
    [WorkflowStatus.COMPLETED]: 'success',
    [WorkflowStatus.FAILED]: 'danger',
    [WorkflowStatus.CANCELLED]: 'info'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    [WorkflowStatus.IDLE]: '空闲',
    [WorkflowStatus.RUNNING]: '执行中',
    [WorkflowStatus.PAUSED]: '已暂停',
    [WorkflowStatus.COMPLETED]: '已完成',
    [WorkflowStatus.FAILED]: '失败',
    [WorkflowStatus.CANCELLED]: '已取消'
  }
  return texts[status] || status
}

function getStepStatus(stepId) {
  if (!workflowStore.currentExecution) return StepStatus.PENDING
  const status = workflowStore.currentExecution.stepStatuses?.[stepId]
  return status?.status || StepStatus.PENDING
}

function getStepStatusClass(status) {
  const classes = {
    [StepStatus.PENDING]: 'step-status-pending',
    [StepStatus.RUNNING]: 'step-status-running',
    [StepStatus.COMPLETED]: 'step-status-completed',
    [StepStatus.FAILED]: 'step-status-failed',
    [StepStatus.SKIPPED]: 'step-status-skipped'
  }
  return classes[status] || 'step-status-pending'
}

function getStepStatusIcon(status) {
  const icons = {
    [StepStatus.PENDING]: 'Timer',
    [StepStatus.RUNNING]: 'Loading',
    [StepStatus.COMPLETED]: 'CircleCheck',
    [StepStatus.FAILED]: 'CircleClose',
    [StepStatus.SKIPPED]: 'Minus'
  }
  return icons[status] || 'Timer'
}

function getStepDuration(stepId) {
  if (!workflowStore.currentExecution) return ''
  const status = workflowStore.currentExecution.stepStatuses?.[stepId]
  if (!status) return ''
  
  if (status.startTime && status.endTime) {
    const duration = status.endTime - status.startTime
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${Math.floor(duration / 1000)}s`
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
  }
  if (status.startTime) return '执行中...'
  return '等待执行'
}

function getLogTagType(type) {
  const types = {
    'step_started': 'primary',
    'step_completed': 'success',
    'step_failed': 'danger',
    'step_retry': 'warning',
    'workflow_started': 'primary',
    'workflow_completed': 'success',
    'workflow_failed': 'danger',
    'workflow_paused': 'warning',
    'approval_required': 'warning'
  }
  return types[type] || 'info'
}

function getStepStatusForExecution(execution, stepId) {
  if (!execution) return StepStatus.PENDING
  const status = execution.stepStatuses?.[stepId]
  return status?.status || StepStatus.PENDING
}

function getStepDurationForExecution(execution, stepId) {
  if (!execution) return ''
  const status = execution.stepStatuses?.[stepId]
  if (!status) return ''
  
  if (status.startTime && status.endTime) {
    const duration = status.endTime - status.startTime
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${Math.floor(duration / 1000)}s`
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
  }
  if (status.startTime) return '执行中...'
  return '等待执行'
}

function hasStepResult(execution, stepId) {
  if (!execution || !execution.stepResults) return false
  return execution.stepResults[stepId] !== undefined
}

function getStepResult(execution, stepId) {
  if (!execution || !execution.stepResults) return null
  return execution.stepResults[stepId] || null
}

function getStepStatusTagType(status) {
  const types = {
    [StepStatus.PENDING]: 'info',
    [StepStatus.RUNNING]: 'primary',
    [StepStatus.COMPLETED]: 'success',
    [StepStatus.FAILED]: 'danger',
    [StepStatus.SKIPPED]: 'info'
  }
  return types[status] || 'info'
}

function getExecutionDuration(execution) {
  if (!execution || !execution.startTime) return '-'
  
  const endTime = execution.endTime || Date.now()
  const duration = endTime - execution.startTime
  
  if (duration < 1000) return `${duration}ms`
  if (duration < 60000) return `${Math.floor(duration / 1000)}s`
  return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
}

function viewExecutionHistory(execution) {
  selectedHistoryExecution.value = execution
  selectedStepForDetail.value = null
  activeTab.value = 'execute'
}

function clearSelectedHistory() {
  selectedHistoryExecution.value = null
  selectedStepForDetail.value = null
}

function toggleStepDetail(stepId) {
  if (selectedStepForDetail.value === stepId) {
    selectedStepForDetail.value = null
  } else {
    selectedStepForDetail.value = stepId
  }
}

function confirmClearAllHistory() {
  ElMessageBox.confirm('确定要清空所有执行历史吗？此操作不可恢复。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    workflowStore.clearExecutionHistory()
    ElMessage.success('已清空所有执行历史')
  }).catch(() => {})
}

function confirmDeleteHistory(execution) {
  ElMessageBox.confirm(`确定要删除执行记录 "${execution.workflowSnapshot?.name || '未知工作流'}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    workflowStore.executionHistory = workflowStore.executionHistory.filter(e => e.id !== execution.id)
    localStorage.setItem('ai-devops-execution-history', JSON.stringify(workflowStore.executionHistory))
    ElMessage.success('执行记录已删除')
  }).catch(() => {})
}

watch(activeTab, (newVal) => {
  if (newVal !== 'edit') {
    selectedStepId.value = null
  }
  if (newVal !== 'execute') {
    selectedHistoryExecution.value = null
    selectedStepForDetail.value = null
  }
})
</script>

<style scoped>
@import '@/assets/page-styles.css';

.workflow-tabs {
  margin-bottom: 24px;
}

.template-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.template-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.template-icon {
  font-size: 32px;
}

.template-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.template-category {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #909399;
}

.template-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.template-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-count {
  font-size: 12px;
  color: #909399;
}

.workflow-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workflow-icon {
  font-size: 18px;
}

.action-type-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.action-type-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-type-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.action-icon {
  font-size: 24px;
}

.action-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.action-desc {
  font-size: 12px;
  color: #909399;
}

.variables-card {
  margin-top: 16px;
}

.steps-card {
  min-height: 500px;
}

.step-card {
  margin-bottom: 12px;
  transition: all 0.3s;
}

.step-card.step-selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.step-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-icon {
  font-size: 24px;
}

.step-name {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.step-actions {
  display: flex;
  gap: 4px;
}

.step-content {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.step-config {
  padding: 0 12px;
}

.stat-item {
  text-align: center;
  padding: 16px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.running {
  color: #409eff;
}

.stat-value.danger {
  color: #f56c6c;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.step-status-list {
  max-height: 400px;
  overflow-y: auto;
}

.step-status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.step-status-item:last-child {
  border-bottom: none;
}

.step-status-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-status-pending {
  color: #909399;
}

.step-status-running {
  color: #409eff;
  animation: pulse 1.5s ease-in-out infinite;
}

.step-status-completed {
  color: #67c23a;
}

.step-status-failed {
  color: #f56c6c;
}

.step-status-skipped {
  color: #909399;
}

.step-status-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.step-status-time {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.step-status-expand {
  margin-left: auto;
  color: #909399;
  cursor: pointer;
  transition: color 0.3s;
}

.step-status-expand:hover {
  color: #409eff;
}

.step-status-item {
  cursor: pointer;
  transition: background-color 0.3s;
  padding: 12px 8px;
  margin: 0 -8px;
}

.step-status-item:hover {
  background-color: #f5f7fa;
}

.step-status-expanded {
  background-color: #ecf5ff !important;
}

.history-banner {
  margin-bottom: 16px;
}

.step-detail-container {
  background-color: #f5f7fa;
  border-radius: 8px;
  margin: 8px 0 16px 0;
}

.step-detail-card {
  background-color: transparent;
  border: none;
}

.step-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-detail-title {
  font-weight: 600;
  color: #303133;
}

.step-detail-content {
  padding: 8px 0;
}

.step-output-section {
  margin-bottom: 16px;
}

.step-output-section:last-child {
  margin-bottom: 0;
}

.step-output-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.step-output-content {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}

.step-output-empty {
  text-align: center;
  padding: 24px;
  color: #909399;
  font-size: 14px;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
}

.log-time {
  color: #909399;
  flex-shrink: 0;
}

.log-message {
  color: #303133;
  word-break: break-all;
}

.log-empty {
  text-align: center;
  padding: 40px;
  color: #909399;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

:global(html.dark) {
  & .template-card,
  & .action-type-item,
  & .step-card {
    border-color: var(--el-border-color);
    background-color: var(--el-bg-color);
  }

  & .template-card:hover,
  & .action-type-item:hover {
    border-color: var(--el-color-primary);
    background-color: var(--el-fill-color-light);
  }

  & .step-card.step-selected {
    border-color: var(--el-color-primary);
    background-color: var(--el-fill-color-light);
  }

  & .template-name,
  & .action-name,
  & .step-name,
  & .step-status-name,
  & .stat-value,
  & .log-message {
    color: var(--el-text-color-primary);
  }

  & .template-category,
  & .template-description,
  & .action-desc,
  & .stat-label,
  & .step-status-time,
  & .step-count,
  & .log-time {
    color: var(--el-text-color-secondary);
  }

  & .log-item {
    border-bottom-color: var(--el-fill-color-light);
  }
}
</style>
