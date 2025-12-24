<template>
  <div style="height: 400px; width: 800px">
    <CodeEditor
      v-model:value="code"
      language="dockerfile"
      theme="vs-dark"
      :height="600"
      :options="editorOptions"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { CodeEditor } from 'monaco-editor-vue3';

const code = ref(`function hello() {
console.log('Hello, Monaco Editor!');
}`);

const editorOptions = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
};
</script>