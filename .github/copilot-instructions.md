# Copilot 使用要点 — AI DevOps 助手

**目标（1 行）**: 辅助工程师快速在此代码库中实现或修改功能——重点是 Jenkinsfile 生成、Dockerfile 分析与本地 mock 模式支持。

## 🧭 项目概览
- 单体前端 SPA（Vue 3 + Vite），状态管理用 Pinia，路由用 Vue Router，UI 用 Element Plus。主要路径：`src/views/*`（Home/Dockerfile/Jenkinsfile/History）。
- AI 接入点：`src/services/ai-service.js`（负责与 OpenAI 一类服务的请求与 prompt），本地分析器：`src/utils/dockerfile-analyzer.js`（客户端静态分析 + sample 数据）。
- 编辑器集成：`monaco` worker 在 `src/utils/monaco.js` 配置（注意 worker 引入方式是必需的）。

## 🔧 快速命令
- 本地开发: `npm run dev` (Vite; script: `vite --host 0.0.0.0`) ✅
- 打包: `npm run build` (Vite build)
- 本地预览: `npm run preview`

> 小提示：README 中提到的 3000 端口可能是历史文档，Vite 默认端口通常是 5173（除非在环境/配置中覆盖）。

## ⚙️ 重要环境变量
- `VITE_APP_MODE` = `mock` | `ai`（默认 mock，便于无需 API key 的本地调试）
- `VITE_OPENAI_API_KEY`（AI 模式必需）
- `VITE_OPENAI_API_BASE_URL`（默认 `https://api.openai.com/v1`）
- `VITE_OPENAI_MODEL`（默认 `gpt-3.5-turbo`）

## 🧠 AI 集成细节（必须精确）
- 位置: `src/services/ai-service.js`。文件中包含两类核心调用：
  - Jenkinsfile 生成：生成 prompt（见文件内 prompt 模板），期望返回“只包含 Jenkinsfile 的文本”，组件直接显示/保存为历史记录。
  - Dockerfile 分析：向 AI 要求以 JSON 返回 { issues, suggestions, score, optimizedContent }。`ai-service` 会尝试 JSON.parse；若失败，会把原始响应作为 suggestion 包装回来。
  - 新增：账单分析（`analyzeBillingCSV(csv)`）与日志翻译（`translateLog(log)`）：
    - `analyzeBillingCSV`：期望返回 JSON { summary: { totalCost, period }, topResources: [{resource,cost,percent}], suggestions: [], chartData: { categories: [], values: [] } }，前端视图为 `src/views/BillingView.vue`。
    - `translateLog`：期望返回 JSON { translation, explanation, fixes }，前端视图为 `src/views/LogView.vue`。
- Mock 注意：当 `VITE_APP_MODE=mock` 时，`AIService` 返回固定模拟内容（便于迭代和测试）。
- 如果要更改 prompt 或模型行为：修改 `ai-service.js` 的 prompt 文本并在本地实测（先用 mock 模式或使用真实 API key）。

## 📚 项目约定 & 实作细节（重点）
- Types: 项目采用 JSDoc 注解（不是 TypeScript 源码），因此保持函数注释以利 IDE 智能提示。
- 状态持久化: 历史记录保存在 `localStorage` 键 `ai-devops-history`（见 `src/stores/app.js`）。
- Templates: Jenkins 模板为常量写在 `src/views/JenkinsfileView.vue` 中（方便快速编辑与本地预览）。
- 路由扩展: 在 `src/router/index.js` 添加新视图并在 `src/views/` 下创建对应页面。
- 代码风格: 项目包含 ESLint + Prettier 配置（devDependencies）。没有内置测试脚本（目前没有 `npm test`）。

## ✅ 建议给 Copilot / 代理的行动准则
- 开发迭代：优先在 `mock` 模式开发/测试（VITE_APP_MODE=mock），再切换到 `ai` 模式验证真实行为。
- 修改 AI 行为：更新 `src/services/ai-service.js` 的 prompt，然后验证：
  1. Jenkinsfile UI 正确显示完整文件；
  2. 对 Dockerfile 的分析在 AI 返回 JSON 或被 `ai-service` 包装为 JSON 时能被正确解析并展示在 `DockerfileView.vue`。
- 添加功能：遵循现有模式（视图在 `src/views/`，复杂逻辑放 `src/services/`，可复用工具放 `src/utils/`）。记得更新路由和本地历史保存逻辑（如果需要）。

## ⚠️ 易错点（避免的改动）
- 不要直接把生产 API key 提交到仓库；使用 `.env`（未包含在仓库）或 CI Secret。
- 更改 AI prompts 前，先在 mock 模式下验证前端行为，避免因响应结构变化导致的 NPE 或解析失败。
- 修改 monaco worker 引入要小心（`src/utils/monaco.js`），错误会导致编辑器不工作。

## 🔧 Monaco 编辑器：添加 Groovy 高亮（示例）

Monaco 默认不包含 Groovy（Jenkinsfile）高亮。下面给出两种可行方式：简单的 Monarch tokenizer（直接在 `src/utils/monaco.js` 中注册）与更可靠的 TextMate grammar（结合 `monaco-editor-textmate` + `onigasm`）。

1) Monarch 简单高亮（快速、客户端实现）：把如下片段追加到 `src/utils/monaco.js` 中：

```js
// 注册Groovy语言并添加简单的Monarch tokenizer（基础高亮）
monaco.languages.register({ id: 'groovy' });

monaco.languages.setMonarchTokensProvider('groovy', {
  defaultToken: '',
  tokenPostfix: '.groovy',
  keywords: [
    'abstract','assert','true','false','class','interface','def','if','else','for','while','return','new','in','try','catch','finally','throw','throws','import','package'
  ],
  operators: ['=','==','===','!=','!==','<','>','<=','>=','+','-','*','/','%','++','--'],
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  tokenizer: {
    root: [
      [/[A-Z][\w\$]*/, 'type.identifier' ],
      [/[a-zA-Z_]\w*/, {
         cases: {
           '@keywords': 'keyword',
           '@default': 'identifier'
         }
      }],
      { include: '@whitespace' },
      [/\/\*/, 'comment', '@comment' ],
      [/\/\/.*$/, 'comment'],
      [/"/, 'string', '@string'],
      [/'/, 'string', '@stringSingle'],
      [/@\w+/, 'annotation'],
      [/\d+/, 'number'],
      /[{}()\[\]]/, '@brackets',
      /[;,.]/, 'delimiter',
      [/@symbols/, 'operator']
    ],
    comment: [
      [/[^\/*]+/, 'comment' ],
      [/\*\//, 'comment', '@pop'],
      /[\/*]/, 'comment' 
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop']
    ],
    stringSingle: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop']
    ],
    whitespace: [
      [/[^\S\n]+/, 'white']
    ]
  }
});
```

使用方法：在创建 Monaco 模型或编辑器时传入 `language: 'groovy'`（或在 `MonacoEditor.vue` 中设置 `language="groovy"`）。

2) TextMate grammar（建议用于更准确高亮）：使用 `monaco-editor-textmate` 加载现成的 Groovy grammar（来自 vscode-groovy 插件），并用 `onigasm` 提供正则支持。优点是与 VS Code 语法一致，缺点是体积和额外依赖。可参考：
- https://github.com/microsoft/monaco-editor-textmate
- https://github.com/oyyd/monaco-textmate-examples

> 小贴士：高亮只是编辑体验。若想做 Jenkins Pipeline 的**语法/语义校验**，推荐在后端使用 Jenkins lint 或 `jenkinsfile-runner` 做可靠校验，并通过 `monaco.editor.setModelMarkers` 展示问题（见项目 README 中的验证建议）。

## 示例（快速参考）
- 检查 AI 模式: `aiService.getMode()`（返回 `'mock'|'ai'`）
- 检查是否配置: `aiService.isConfigured()`（非 mock 且有 key 时为 true）
- 历史数据键: `localStorage.getItem('ai-devops-history')`

---
如果你希望，我可以把这份草稿直接提交到 `.github/copilot-instructions.md`（我已准备好保存）。请告诉我是否需要包含额外内容（例如示例 prompt 全文、API contract 的示例响应）。 🔧💡