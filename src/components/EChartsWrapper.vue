<template>
  <div ref="chartRef" class="echarts-container" :style="{ width, height }"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '400px'
  },
  theme: {
    type: String,
    default: 'default'
  },
  option: {
    type: Object,
    default: () => ({}) // 复杂类型用函数返回
  }
})

const chartRef = ref()
let chart = null

const initChart = () => {
  console.log('初始化 ECharts 图表', props.option);
  if (!chartRef.value) return
  
  nextTick(() => {
    if (chartRef.value) {
      chart = echarts.init(chartRef.value, props.theme)
      chart.setOption(props.option)
      
      // 响应式调整
      const resizeObserver = new ResizeObserver(() => {
        chart?.resize()
      })
      resizeObserver.observe(chartRef.value)
    }
  })
}

const updateChart = () => {
  if (chart) {
    chart.setOption(props.option, true)
  }
}

watch(() => props.option, updateChart, { deep: true })

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  if (chart) {
    chart.dispose()
  }
})
</script>

<style scoped>
.echarts-container {
  width: v-bind(width);
  height: v-bind(height);
}
</style>