import { ActionType } from './workflow-engine'

export const WorkflowTemplate = {
  NEW_PROJECT_INIT: 'new_project_init',
  DISASTER_RECOVERY_SWITCH: 'disaster_recovery_switch',
  DAILY_OPERATIONS: 'daily_operations',
  SECURITY_AUDIT: 'security_audit',
  RELEASE_PIPELINE: 'release_pipeline',
  INFRASTRUCTURE_AS_CODE: 'infrastructure_as_code',
  CUSTOM: 'custom'
}

export const WorkflowTemplateInfo = {
  [WorkflowTemplate.NEW_PROJECT_INIT]: {
    id: WorkflowTemplate.NEW_PROJECT_INIT,
    name: '新项目初始化流程',
    description: '从项目创建到 CI/CD 配置的完整初始化流程',
    icon: '🚀',
    category: '项目管理',
    tags: ['初始化', 'CI/CD', 'Docker', '代码审查'],
    steps: [
      {
        id: 'step_1_create_cicd_config',
        name: '生成 CI/CD 配置',
        actionType: ActionType.GENERATE_CICD_CONFIG,
        description: '根据项目技术栈生成对应的 CI/CD 配置文件',
        config: {
          platform: 'github',
          template: 'simple',
          variables: {
            nodeVersion: '20.x',
            buildCommand: 'npm run build',
            testCommand: 'npm test'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 2000
        },
        timeout: 120000,
        dependsOn: []
      },
      {
        id: 'step_2_create_dockerfile',
        name: '分析并优化 Dockerfile',
        actionType: ActionType.ANALYZE_DOCKERFILE,
        description: '创建项目的 Dockerfile 并进行安全性分析',
        config: {
          createIfNotExists: true,
          baseImage: 'node:20-alpine',
          optimize: true,
          securityScan: true
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 1000
        },
        timeout: 120000,
        dependsOn: ['step_1_create_cicd_config']
      },
      {
        id: 'step_3_analyze_cicd',
        name: 'CI/CD 配置诊断',
        actionType: ActionType.ANALYZE_CICD_CONFIG,
        description: '对生成的 CI/CD 配置进行安全性和性能诊断',
        config: {
          platform: 'github',
          deepScan: true,
          securityCheck: true,
          performanceOptimize: true
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 1,
          delay: 1000
        },
        timeout: 90000,
        dependsOn: ['step_1_create_cicd_config']
      },
      {
        id: 'step_4_notification',
        name: '发送初始化完成通知',
        actionType: ActionType.WEBHOOK,
        description: '通过 Webhook 发送初始化完成通知',
        config: {
          url: '{{webhookUrl}}',
          method: 'POST',
          payload: {
            event: 'project_init_completed',
            projectName: '{{projectName}}',
            timestamp: '{{timestamp}}',
            steps: {
              cicdGenerated: '{{step_1_create_cicd_config}}',
              dockerfileAnalyzed: '{{step_2_create_dockerfile}}',
              cicdAnalyzed: '{{step_3_analyze_cicd}}'
            }
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 30000,
        dependsOn: ['step_2_create_dockerfile', 'step_3_analyze_cicd']
      }
    ],
    variables: {
      projectName: 'my-new-project',
      projectType: 'nodejs',
      webhookUrl: 'https://hooks.slack.com/services/xxx/xxx/xxx',
      platform: 'github',
      nodeVersion: '20.x',
      dockerBaseImage: 'node:20-alpine'
    },
    settings: {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 600000
    }
  },

  [WorkflowTemplate.DISASTER_RECOVERY_SWITCH]: {
    id: WorkflowTemplate.DISASTER_RECOVERY_SWITCH,
    name: '灾备切换流程',
    description: '主备环境切换的自动化流程，确保业务连续性保障',
    icon: '🔄',
    category: '运维管理',
    tags: ['灾备', '高可用', '故障转移', '业务连续性'],
    steps: [
      {
        id: 'step_1_health_check_primary',
        name: '检查主节点健康状态',
        actionType: ActionType.WEBHOOK,
        description: '检查主节点的健康状态',
        config: {
          url: '{{primaryHealthCheckUrl}}',
          method: 'GET',
          validateResponse: true,
          expectedStatusCode: 200,
          timeout: 10000
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 30000,
        dependsOn: []
      },
      {
        id: 'step_2_health_check_standby',
        name: '检查备节点健康状态',
        actionType: ActionType.WEBHOOK,
        description: '检查备节点的健康状态',
        config: {
          url: '{{standbyHealthCheckUrl}}',
          method: 'GET',
          validateResponse: true,
          expectedStatusCode: 200
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 30000,
        dependsOn: ['step_1_health_check_primary']
      },
      {
        id: 'step_3_sync_data',
        name: '数据同步验证',
        actionType: ActionType.CONDITION,
        description: '验证主备数据同步状态',
        config: {
          condition: '{{dataSynced}} === true',
          onTrue: [
            {
              id: 'sub_step_3a_sync_verify',
              name: '执行数据同步',
              actionType: ActionType.WEBHOOK,
              config: {
                url: '{{dataSyncUrl}}',
                method: 'POST',
                payload: { action: 'sync', source: 'primary', target: 'standby' }
              }
            }
          ],
          onFalse: [
            {
              id: 'sub_step_3b_force_sync',
              name: '强制数据强制同步',
            actionType: ActionType.WEBHOOK,
            config: {
              url: '{{forceSyncUrl}}',
              method: 'POST',
              payload: { action: 'force_sync' }
            }
          }
          ]
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 1,
          delay: 1000
        },
        timeout: 180000,
        dependsOn: ['step_2_health_check_standby']
      },
      {
        id: 'step_4_switch_traffic',
        name: '流量切换',
        actionType: ActionType.WEBHOOK,
        description: '将流量切换到备节点',
        config: {
          url: '{{trafficSwitchUrl}}',
          method: 'POST',
          payload: {
            target: 'standby',
            weight: 100
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 10000
        },
        timeout: 60000,
        dependsOn: ['step_3_sync_data']
      },
      {
        id: 'step_5_verify_switch',
        name: '验证切换结果',
        actionType: ActionType.WEBHOOK,
        description: '验证流量切换后的服务状态',
        config: {
          url: '{{verifyUrl}}',
          method: 'GET',
          validateResponse: true,
          expectedStatusCode: 200,
          retryInterval: 5000,
          maxAttempts: 5
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 5,
          delay: 10000
        },
        timeout: 120000,
        dependsOn: ['step_4_switch_traffic']
      },
      {
        id: 'step_6_notification',
        name: '发送切换完成通知',
        actionType: ActionType.WEBHOOK,
        description: '发送灾备切换完成通知',
        config: {
          url: '{{notificationUrl}}',
          method: 'POST',
          payload: {
            event: 'disaster_recovery_completed',
            timestamp: '{{timestamp}}',
            switchTime: '{{step_5_verify_switch.duration}}',
            fromNode: 'primary',
            toNode: 'standby',
            status: 'success'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 30000,
        dependsOn: ['step_5_verify_switch']
      }
    ],
    variables: {
      primaryHealthCheckUrl: 'http://primary.example.com/health',
      standbyHealthCheckUrl: 'http://standby.example.com/health',
      dataSynced: true,
      dataSyncUrl: 'http://sync.example.com/api/sync',
      forceSyncUrl: 'http://sync.example.com/api/force-sync',
      trafficSwitchUrl: 'http://lb.example.com/api/switch',
      verifyUrl: 'http://app.example.com/health',
      notificationUrl: 'https://hooks.slack.com/services/xxx/xxx/xxx'
    },
    settings: {
      maxRetries: 5,
      retryDelay: 5000,
      timeout: 900000
    }
  },

  [WorkflowTemplate.DAILY_OPERATIONS]: {
    id: WorkflowTemplate.DAILY_OPERATIONS,
    name: '日常运维巡检',
    description: '每日自动化的运维巡检流程，包含系统检查、日志分析、账单检查',
    icon: '📋',
    category: '日常运维',
    tags: ['巡检', '日志分析', '账单检查', '自动化'],
    steps: [
      {
        id: 'step_1_log_analysis',
        name: '系统日志分析',
        actionType: ActionType.TRANSLATE_LOG,
        description: '分析关键系统日志，识别潜在问题',
        config: {
          logSource: 'system',
          logType: 'error',
          timeRange: 'last_24h',
          severityThreshold: 'warning'
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 1000
        },
        timeout: 120000,
        dependsOn: []
      },
      {
        id: 'step_2_billing_analysis',
        name: '账单费用分析',
        actionType: ActionType.ANALYZE_BILLING,
        description: '分析云服务账单，识别成本优化机会',
        config: {
          billingProvider: 'aws',
          analyzePeriod: 'last_month',
          costThreshold: 100,
          includeRecommendations: true
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 1000
        },
        timeout: 120000,
        dependsOn: []
      },
      {
        id: 'step_3_generate_report',
        name: '生成巡检报告',
        actionType: ActionType.CUSTOM_ACTION,
        description: '汇总所有检查结果生成巡检报告',
        config: {
          includeLogs: true,
          includeBilling: true,
          format: 'html',
          sendEmail: true
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 1,
          delay: 1000
        },
        timeout: 60000,
        dependsOn: ['step_1_log_analysis', 'step_2_billing_analysis']
      },
      {
        id: 'step_4_send_report',
        name: '发送巡检报告',
        actionType: ActionType.WEBHOOK,
        description: '发送巡检报告到运维团队',
        config: {
          url: '{{reportWebhookUrl}}',
          method: 'POST',
          payload: {
            event: 'daily_check_report',
            reportDate: '{{reportDate}}',
            logAnalysis: '{{step_1_log_analysis}}',
            billingAnalysis: '{{step_2_billing_analysis}}',
            reportUrl: '{{step_3_generate_report.reportUrl}}'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 30000,
        dependsOn: ['step_3_generate_report']
      }
    ],
    variables: {
      logSource: 'system',
      billingProvider: 'aws',
      reportDate: new Date().toISOString().split('T')[0],
      reportWebhookUrl: 'https://hooks.slack.com/services/xxx/xxx/xxx'
    },
    settings: {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 600000
    }
  },

  [WorkflowTemplate.SECURITY_AUDIT]: {
    id: WorkflowTemplate.SECURITY_AUDIT,
    name: '安全审计流程',
    description: '系统安全审计流程，检测安全漏洞和合规检查',
    icon: '🔒',
    category: '安全管理',
    tags: ['安全审计', '漏洞扫描', '合规检查'],
    steps: [
      {
        id: 'step_1_dockerfile_audit',
        name: 'Dockerfile 安全审计',
        actionType: ActionType.ANALYZE_DOCKERFILE,
        description: '审计 Dockerfile 的安全配置',
        config: {
          securityScan: true,
          deepScan: true,
          complianceCheck: true
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 1000
        },
        timeout: 120000,
        dependsOn: []
      },
      {
        id: 'step_2_cicd_audit',
        name: 'CI/CD 配置安全审计',
        actionType: ActionType.ANALYZE_CICD_CONFIG,
        description: '审计 CI/CD 配置的安全性',
        config: {
          platform: '{{platform}}',
          securityCheck: true,
          secretScan: true,
          permissionCheck: true
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 1000
        },
        timeout: 120000,
        dependsOn: []
      },
      {
        id: 'step_3_vulnerability_scan',
        name: '漏洞扫描',
        actionType: ActionType.WEBHOOK,
        description: '执行漏洞扫描',
        config: {
          url: '{{vulnerabilityScannerUrl}}',
          method: 'POST',
          payload: {
            scanType: 'full',
            severity: 'critical'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 10000
        },
        timeout: 300000,
        dependsOn: ['step_1_dockerfile_audit', 'step_2_cicd_audit']
      },
      {
        id: 'step_4_compliance_check',
        name: '合规性检查',
        actionType: ActionType.WEBHOOK,
        description: '检查合规性要求',
        config: {
          url: '{{complianceCheckUrl}}',
          method: 'POST',
          payload: {
            frameworks: ['SOC2', 'GDPR', 'PCI-DSS']
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 5000
        },
        timeout: 180000,
        dependsOn: ['step_3_vulnerability_scan']
      },
      {
        id: 'step_5_generate_audit_report',
        name: '生成审计报告',
        actionType: ActionType.CUSTOM_ACTION,
        description: '生成安全审计报告',
        config: {
          includeAll: true,
          format: 'pdf',
          riskAssessment: true
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 1,
          delay: 1000
        },
        timeout: 120000,
        dependsOn: ['step_4_compliance_check']
      }
    ],
    variables: {
      platform: 'github',
      vulnerabilityScannerUrl: 'http://scanner.example.com/scan',
      complianceCheckUrl: 'http://compliance.example.com/check'
    },
    settings: {
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 1800000
    }
  },

  [WorkflowTemplate.RELEASE_PIPELINE]: {
    id: WorkflowTemplate.RELEASE_PIPELINE,
    name: '发布流水线',
    description: '从代码提交到生产环境的完整发布流程',
    icon: '🚢',
    category: '发布管理',
    tags: ['CI/CD', '发布', '部署', '自动化'],
    steps: [
      {
        id: 'step_1_code_review',
        name: '代码审查',
        actionType: ActionType.WEBHOOK,
        description: '触发代码审查流程',
        config: {
          url: '{{codeReviewUrl}}',
          method: 'POST',
          payload: {
            action: 'review',
            branch: '{{releaseBranch}}',
            reviewers: '{{reviewers}}'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 10000
        },
        timeout: 300000,
        dependsOn: []
      },
      {
        id: 'step_2_build',
        name: '构建与测试',
        actionType: ActionType.GENERATE_CICD_CONFIG,
        description: '执行构建和自动化测试',
        config: {
          platform: '{{platform}}',
          template: 'advanced',
          includeTests: true,
          codeQuality: true
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 5000
        },
        timeout: 600000,
        dependsOn: ['step_1_code_review']
      },
      {
        id: 'step_3_docker_build',
        name: 'Docker 镜像构建',
        actionType: ActionType.ANALYZE_DOCKERFILE,
        description: '构建并优化 Docker 镜像',
        config: {
          buildImage: true,
          pushToRegistry: true,
          tag: '{{releaseVersion}}'
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 10000
        },
        timeout: 300000,
        dependsOn: ['step_2_build']
      },
      {
        id: 'step_4_staging_deploy',
        name: '预发布环境部署',
        actionType: ActionType.WEBHOOK,
        description: '部署到预发布环境',
        config: {
          url: '{{stagingDeployUrl}}',
          method: 'POST',
          payload: {
            environment: 'staging',
            version: '{{releaseVersion}}',
            image: '{{dockerImage}}'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 15000
        },
        timeout: 300000,
        dependsOn: ['step_3_docker_build']
      },
      {
        id: 'step_5_staging_test',
        name: '预发布环境测试',
        actionType: ActionType.WEBHOOK,
        description: '在预发布环境执行集成测试',
        config: {
          url: '{{stagingTestUrl}}',
          method: 'POST',
          payload: {
            environment: 'staging',
            testSuite: 'integration',
            timeout: 300000
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 10000
        },
        timeout: 600000,
        dependsOn: ['step_4_staging_deploy']
      },
      {
        id: 'step_6_approval',
        name: '发布审批',
        actionType: ActionType.DELAY,
        description: '等待人工审批',
        config: {
          delay: 0,
          requireApproval: true,
          approvers: '{{releaseManagers}}'
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 1,
          delay: 1000
        },
        timeout: 86400000,
        dependsOn: ['step_5_staging_test']
      },
      {
        id: 'step_7_production_deploy',
        name: '生产环境部署',
        actionType: ActionType.WEBHOOK,
        description: '部署到生产环境',
        config: {
          url: '{{productionDeployUrl}}',
          method: 'POST',
          payload: {
            environment: 'production',
            version: '{{releaseVersion}}',
            strategy: 'blue-green',
            rollbackReady: true
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 30000
        },
        timeout: 600000,
        dependsOn: ['step_6_approval']
      },
      {
        id: 'step_8_production_verify',
        name: '生产环境验证',
        actionType: ActionType.WEBHOOK,
        description: '验证生产环境部署结果',
        config: {
          url: '{{productionVerifyUrl}}',
          method: 'GET',
          validateResponse: true,
          expectedStatusCode: 200,
          healthChecks: ['health', 'metrics', 'logs']
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 5,
          delay: 10000
        },
        timeout: 300000,
        dependsOn: ['step_7_production_deploy']
      },
      {
        id: 'step_9_notification',
        name: '发送发布完成通知',
        actionType: ActionType.WEBHOOK,
        description: '发送发布完成通知',
        config: {
          url: '{{notificationUrl}}',
          method: 'POST',
          payload: {
            event: 'release_completed',
            version: '{{releaseVersion}}',
            environment: 'production',
            status: 'success',
            deployTime: '{{step_8_production_verify.duration}}'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 5000
        },
        timeout: 30000,
        dependsOn: ['step_8_production_verify']
      }
    ],
    variables: {
      platform: 'github',
      releaseBranch: 'main',
      releaseVersion: '1.0.0',
      reviewers: ['dev1', 'dev2'],
      releaseManagers: ['manager1', 'manager2'],
      codeReviewUrl: 'http://git.example.com/api/review',
      stagingDeployUrl: 'http://deploy.example.com/staging',
      stagingTestUrl: 'http://test.example.com/run',
      productionDeployUrl: 'http://deploy.example.com/production',
      productionVerifyUrl: 'http://app.example.com/health',
      notificationUrl: 'https://hooks.slack.com/services/xxx/xxx/xxx'
    },
    settings: {
      maxRetries: 5,
      retryDelay: 10000,
      timeout: 3600000
    }
  },

  [WorkflowTemplate.INFRASTRUCTURE_AS_CODE]: {
    id: WorkflowTemplate.INFRASTRUCTURE_AS_CODE,
    name: '基础设施即代码',
    description: '基础设施自动化部署和配置管理流程',
    icon: '🏗️',
    category: '基础设施',
    tags: ['IaC', 'Terraform', '自动化部署'],
    steps: [
      {
        id: 'step_1_validate_iac',
        name: '验证 IaC 配置',
        actionType: ActionType.WEBHOOK,
        description: '验证基础设施即代码配置验证',
        config: {
          url: '{{iacValidateUrl}}',
          method: 'POST',
          payload: {
            action: 'validate',
            provider: 'terraform'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 5000
        },
        timeout: 120000,
        dependsOn: []
      },
      {
        id: 'step_2_plan_changes',
        name: '执行变更计划',
        actionType: ActionType.WEBHOOK,
        description: '生成基础设施变更计划',
        config: {
          url: '{{iacPlanUrl}}',
          method: 'POST',
          payload: {
            action: 'plan',
            environment: '{{environment}}'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 5000
        },
        timeout: 300000,
        dependsOn: ['step_1_validate_iac']
      },
      {
        id: 'step_3_review_plan',
        name: '变更计划审查',
        actionType: ActionType.DELAY,
        description: '等待变更计划审查',
        config: {
          requireApproval: true,
          approvers: '{{infraManagers}}'
        },
        retryPolicy: {
          enabled: false,
          maxRetries: 1,
          delay: 1000
        },
        timeout: 86400000,
        dependsOn: ['step_2_plan_changes']
      },
      {
        id: 'step_4_apply_changes',
        name: '应用基础设施变更',
        actionType: ActionType.WEBHOOK,
        description: '应用基础设施变更',
        config: {
          url: '{{iacApplyUrl}}',
          method: 'POST',
          payload: {
            action: 'apply',
            environment: '{{environment}}',
            autoApprove: true
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          delay: 30000
        },
        timeout: 600000,
        dependsOn: ['step_3_review_plan']
      },
      {
        id: 'step_5_verify_infra',
        name: '验证基础设施',
        actionType: ActionType.WEBHOOK,
        description: '验证基础设施部署结果',
        config: {
          url: '{{infraVerifyUrl}}',
          method: 'GET',
          validateResponse: true
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 5,
          delay: 10000
        },
        timeout: 300000,
        dependsOn: ['step_4_apply_changes']
      },
      {
        id: 'step_6_configure',
        name: '配置管理',
        actionType: ActionType.WEBHOOK,
        description: '应用服务器配置管理',
        config: {
          url: '{{configMgmtUrl}}',
          method: 'POST',
          payload: {
            action: 'apply',
            playbook: '{{playbookName}}'
          }
        },
        retryPolicy: {
          enabled: true,
          maxRetries: 2,
          delay: 10000
        },
        timeout: 300000,
        dependsOn: ['step_5_verify_infra']
      }
    ],
    variables: {
      environment: 'production',
      infraManagers: ['infra1', 'infra2'],
      playbookName: 'site.yml',
      iacValidateUrl: 'http://iac.example.com/validate',
      iacPlanUrl: 'http://iac.example.com/plan',
      iacApplyUrl: 'http://iac.example.com/apply',
      infraVerifyUrl: 'http://infra.example.com/verify',
      configMgmtUrl: 'http://ansible.example.com/run'
    },
    settings: {
      maxRetries: 3,
      retryDelay: 10000,
      timeout: 1800000
    }
  }
}

export const WorkflowCategory = {
  '项目管理': [
    WorkflowTemplate.NEW_PROJECT_INIT,
    WorkflowTemplate.RELEASE_PIPELINE
  ],
  '运维管理': [
    WorkflowTemplate.DISASTER_RECOVERY_SWITCH,
    WorkflowTemplate.DAILY_OPERATIONS
  ],
  '安全管理': [
    WorkflowTemplate.SECURITY_AUDIT
  ],
  '基础设施': [
    WorkflowTemplate.INFRASTRUCTURE_AS_CODE
  ]
}

export function getTemplateById(templateId) {
  return WorkflowTemplateInfo[templateId]
}

export function getTemplatesByCategory(category) {
  const templateIds = WorkflowCategory[category] || []
  return templateIds.map(id => WorkflowTemplateInfo[id]).filter(Boolean)
}

export function getAllTemplates() {
  return Object.values(WorkflowTemplateInfo)
}

export function createWorkflowFromTemplate(templateId, customizations = {}) {
  const template = WorkflowTemplateInfo[templateId]
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  return {
    id: `workflow_${Date.now()}`,
    name: customizations.name || template.name,
    description: customizations.description || template.description,
    templateId: templateId,
    steps: JSON.parse(JSON.stringify(template.steps)),
    variables: {
      ...template.variables,
      ...customizations.variables
    },
    settings: {
      ...template.settings,
      ...customizations.settings
    },
    tags: [...template.tags],
    createdAt: new Date().toISOString()
  }
}

export function getStepConfigSchema(actionType) {
  const configSchemas = {
    [ActionType.GENERATE_CICD_CONFIG]: {
      platform: {
        type: 'select',
        label: 'CI/CD 平台',
        options: [
          { value: 'jenkins', label: 'Jenkins' },
          { value: 'gitlab', label: 'GitLab CI/CD' },
          { value: 'github', label: 'GitHub Actions' },
          { value: 'azure', label: 'Azure DevOps' }
        ],
        required: true
      },
      template: {
        type: 'select',
        label: '模板类型',
        options: [
          { value: 'simple', label: '简单构建' },
          { value: 'docker', label: 'Docker 构建' },
          { value: 'advanced', label: '高级流水线' }
        ],
        required: true
      }
    },
    [ActionType.ANALYZE_DOCKERFILE]: {
      securityScan: {
        type: 'checkbox',
        label: '安全扫描',
        required: false
      },
      deepScan: {
        type: 'checkbox',
        label: '深度扫描',
        required: false
      },
      optimize: {
        type: 'checkbox',
        label: '性能优化',
        required: false
      }
    },
    [ActionType.ANALYZE_CICD_CONFIG]: {
      platform: {
        type: 'select',
        label: '平台',
        options: [
          { value: 'jenkins', label: 'Jenkins' },
          { value: 'gitlab', label: 'GitLab CI/CD' },
          { value: 'github', label: 'GitHub Actions' },
          { value: 'azure', label: 'Azure DevOps' }
        ],
        required: true
      },
      securityCheck: {
        type: 'checkbox',
        label: '安全检查',
        required: false
      },
      performanceOptimize: {
        type: 'checkbox',
        label: '性能优化',
        required: false
      }
    },
    [ActionType.ANALYZE_BILLING]: {
      billingProvider: {
        type: 'select',
        label: '云服务提供商',
        options: [
          { value: 'aws', label: 'AWS' },
          { value: 'azure', label: 'Azure' },
          { value: 'gcp', label: 'GCP' }
        ],
        required: true
      }
    },
    [ActionType.TRANSLATE_LOG]: {
      logSource: {
        type: 'select',
        label: '日志来源',
        options: [
          { value: 'system', label: '系统日志' },
          { value: 'application', label: '应用日志' },
          { value: 'database', label: '数据库日志' }
        ],
        required: true
      }
    },
    [ActionType.WEBHOOK]: {
      url: {
        type: 'text',
        label: 'Webhook URL',
        required: true
      },
      method: {
        type: 'select',
        label: 'HTTP 方法',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' }
        ],
        required: true
      }
    },
    [ActionType.DELAY]: {
      delay: {
        type: 'number',
        label: '延迟时间 (毫秒)',
        required: true
      },
      requireApproval: {
        type: 'checkbox',
        label: '需要审批',
        required: false
      }
    },
    [ActionType.CONDITION]: {
      condition: {
        type: 'text',
        label: '条件表达式',
        required: true
      }
    },
    [ActionType.PARALLEL]: {
      parallelSteps: {
        type: 'array',
        label: '并行步骤',
        required: true
      }
    },
    [ActionType.CUSTOM_ACTION]: {
      script: {
        type: 'text',
        label: '自定义脚本',
        required: false
      }
    }
  }

  return configSchemas[actionType] || {}
}
