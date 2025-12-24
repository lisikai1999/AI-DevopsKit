<template>
  <div class="monaco-editor-container">
    <div ref="editorRef" class="editor-wrapper"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
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

const emit = defineEmits(['update:modelValue'])

const editorRef = ref()

const initEditor = () => {
  if (!editorRef.value) return
  
  // 简化实现：使用 contenteditable div 作为代码编辑器
  editorRef.value.contentEditable = (!props.readonly).toString()
  editorRef.value.innerHTML = props.modelValue || ''
  console.log(props.theme)
  
  editorRef.value.addEventListener('input', handleInput)
  editorRef.value.addEventListener('keydown', handleKeydown)
  editorRef.value.style.fontFamily = 'Monaco, Consolas, "Courier New", monospace'
  editorRef.value.style.fontSize = '14px'
  editorRef.value.style.lineHeight = '1.5'
  editorRef.value.style.whiteSpace = 'pre'
  editorRef.value.style.overflow = 'auto'
}

const handleInput = (e) => {
  const target = e.target
  emit('update:modelValue', target.innerText || '')
}

const handleKeydown = (e) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '  ')
  }
}

const updateValue = (value) => {
  if (editorRef.value && editorRef.value.innerText !== value) {
    editorRef.value.innerText = value
  }
}

watch(() => props.modelValue, updateValue)

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  if (editorRef.value) {
    editorRef.value.removeEventListener('input', handleInput)
    editorRef.value.removeEventListener('keydown', handleKeydown)
  }
})
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