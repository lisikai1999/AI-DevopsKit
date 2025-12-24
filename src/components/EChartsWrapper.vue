<template>
  <div ref="chartRef" class="echarts-container" :style="{ width, height }"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = withDefaults(defineProps(), {
  width: '100%',
  height: '400px',
  theme: 'default'
})

const chartRef = ref()
let chart = null

const initChart = () => {
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