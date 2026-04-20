export const sampleCICDConfigs = {
  jenkins: `pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/example/repo.git'
            }
        }
        
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
        
        stage('Test') {
            steps {
                sh 'mvn test'
            }
        }
    }
}`,

  gitlab: `stages:
  - build
  - test

build:
  stage: build
  image: node:16
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/

test:
  stage: test
  image: node:16
  script:
    - npm install
    - npm test`,

  github: `name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build
      run: npm run build
      
    - name: Test
      run: npm test`,

  azure: `trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    displayName: 'Build Stage'
    jobs:
      - job: Build
        displayName: 'Build Job'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'

          - script: |
              npm install
              npm run build
            displayName: 'npm install and build'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: 'dist'
              ArtifactName: 'drop'
            displayName: 'Publish artifacts'`
}

export const getSeverityColor = (severity) => {
  switch (severity) {
    case '高':
      return '#f56c6c'
    case '中':
      return '#e6a23c'
    case '低':
      return '#909399'
    default:
      return '#909399'
  }
}

export const getSeverityTagType = (severity) => {
  switch (severity) {
    case '高':
      return 'danger'
    case '中':
      return 'warning'
    case '低':
      return 'info'
    default:
      return 'info'
  }
}

export const getCategoryIcon = (category) => {
  switch (category) {
    case '缓存':
      return '📦'
    case '超时':
      return '⏰'
    case '并行':
      return '⚡'
    case '安全':
      return '🔒'
    case '性能':
      return '🚀'
    case '最佳实践':
      return '💡'
    case '资源':
      return '💾'
    default:
      return '📋'
  }
}

export const getPlatformName = (platform) => {
  const names = {
    jenkins: 'Jenkins',
    gitlab: 'GitLab CI/CD',
    github: 'GitHub Actions',
    azure: 'Azure DevOps'
  }
  return names[platform] || platform
}

export const getPlatformLanguage = (platform) => {
  if (platform === 'jenkins') {
    return 'groovy'
  }
  return 'yaml'
}

export const getPlatformFileName = (platform) => {
  const names = {
    jenkins: 'Jenkinsfile',
    gitlab: '.gitlab-ci.yml',
    github: 'workflow.yml',
    azure: 'azure-pipelines.yml'
  }
  return names[platform] || 'config.yml'
}
