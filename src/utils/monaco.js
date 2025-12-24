import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as monaco from 'monaco-editor';


// 定义Groovy语言的语法高亮规则
// 配置MonacoEnvironment：解决不同语言的worker加载问题
self.MonacoEnvironment = {
  getWorker(_, label) {
    // JSON语言worker
    if (label === 'json') {
      return new jsonWorker();
    }
    // CSS/SCSS/LESS语言worker
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    // HTML/handlebars/razor语言worker
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    // TypeScript/JavaScript语言worker
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    // 默认worker（其他语言）
    return new editorWorker();
  }
};

// === 语言高亮扩展（Monarch） ===
// Groovy（用于 Jenkinsfile）的基础 Monarch tokenizer（轻量、客户端实现）
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
      [/[{}()\[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
      [/@symbols/, 'operator']
    ],
    comment: [
      [/[^*]+/, 'comment' ],
      [/\*\//, 'comment', '@pop'],
      [/\*/, 'comment']
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

// Dockerfile 简单 Monarch 高亮（快速实现）
monaco.languages.register({ id: 'dockerfile' });
monaco.languages.setMonarchTokensProvider('dockerfile', {
  defaultToken: '',
  tokenizer: {
    root: [
      [/^\s*#.*$/, 'comment'],
      [/^\s*(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|WORKDIR|USER|ARG|ONBUILD|VOLUME|HEALTHCHECK|STOPSIGNAL|SHELL)\b/, 'keyword'],
      [/[A-Z_][A-Z0-9_]+(?==)/, 'variable'],
      [/".*?"/, 'string'],
      [/\d+/, 'number'],
      [/[;,.(){}\[\]]/, 'delimiter'],
      [/\s+/, 'white']
    ]
  }
});



