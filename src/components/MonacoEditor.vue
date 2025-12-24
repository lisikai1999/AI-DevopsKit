<template>
  <div class="monaco-editor-container">
    <CodeEditor
      v-model:value="codeContent"
      :language="language"
      theme="vs-dark"
      :options="editorOptions"
    />
    
  </div>
</template>

<script setup>
import { CodeEditor } from 'monaco-editor-vue3';
import { ref, onMounted, watch } from 'vue'

// 简化实现，先使用基础 textarea，后续可以集成真实的 Monaco Editor
const props = defineProps({
  language: {
    type: String,
    default: 'javascript' // 直接写默认值
  },
  theme: {
    type: String,
    default: 'vs-dark'
  },
  height: {
    type: String,
    default: '400px'
  },
  readonly: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: String,
    default: ''
  },
  options: {
    type: Object,
    default: () => ({}) // 复杂类型用函数返回
  }
})

const codeContent = ref(props.modelValue)

const emit = defineEmits(['update:modelValue'])

const editorRef = ref()

watch(codeContent, (newValue) => {
  emit('update:modelValue', newValue)
})

watch(() => props.modelValue, () =>{
    codeContent.value = props.modelValue
  }
)


</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: v-bind(height);
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  background-color: #1e1e1e;
}

.editor-wrapper {
  width: 100%;
  height: 100%;
  padding: 12px;
  color: #d4d4d4;
  background-color: #1e1e1e;
  outline: none;
  min-height: 200px;
}

.editor-wrapper:focus {
  border: 1px solid #409eff;
}
</style>