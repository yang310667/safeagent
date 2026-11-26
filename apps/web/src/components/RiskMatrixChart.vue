<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { RiskAssessmentRecord } from '@safeagent/shared';

const props = withDefaults(
  defineProps<{
    records: RiskAssessmentRecord[];
    showBarChart?: boolean;
  }>(),
  {
    showBarChart: true,
  },
);

const matrixChartRef = ref<HTMLDivElement | null>(null);
const barChartRef = ref<HTMLDivElement | null>(null);

let matrixChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

function buildMatrixHeatmapData(): Array<[number, number, number]> {
  const cells: Array<[number, number, number]> = [];
  for (let pIdx = 0; pIdx < 5; pIdx++) {
    for (let sIdx = 0; sIdx < 5; sIdx++) {
      const score = (pIdx + 1) * (sIdx + 1);
      cells.push([sIdx, pIdx, score]);
    }
  }
  return cells;
}

function renderMatrixChart(): void {
  if (!matrixChart) return;

  const initialPoints = props.records.map((rec) => ({
    name: `${rec.hazardName}（改善前）`,
    value: [rec.initialRisk.severity - 1, rec.initialRisk.probability - 1, rec.initialRisk.score],
  }));

  const residualPoints = props.records
    .filter((rec) => rec.residualRisk !== null)
    .map((rec) => ({
      name: `${rec.hazardName}（剩餘）`,
      value: [
        (rec.residualRisk?.severity ?? 1) - 1,
        (rec.residualRisk?.probability ?? 1) - 1,
        rec.residualRisk?.score ?? 1,
      ],
    }));

  matrixChart.setOption({
    tooltip: {
      position: 'top',
      formatter: (params: { seriesName?: string; name?: string; value?: number[] }) => {
        const val = params.value ?? [0, 0, 0];
        const sev = (val[0] ?? 0) + 1;
        const prob = (val[1] ?? 0) + 1;
        const score = val[2] ?? prob * sev;
        const prefix = params.name ? `${params.name}<br/>` : '';
        return `${prefix}可能性 P=${prob} × 嚴重度 S=${sev} = <b>${score} 分</b>`;
      },
    },
    grid: { top: 20, right: 20, bottom: 48, left: 76 },
    xAxis: {
      type: 'category',
      name: '後果嚴重度 (S)',
      nameLocation: 'middle',
      nameGap: 28,
      data: ['1 輕微', '2 中度', '3 嚴重', '4 重大', '5 災難性'],
      axisLabel: { color: '#334155', fontSize: 11 },
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      name: '可能性 (P)',
      data: ['1 極不可能', '2 較不可能', '3 可能', '4 很可能', '5 極可能'],
      axisLabel: { color: '#334155', fontSize: 11 },
      splitArea: { show: true },
    },
    visualMap: {
      show: false,
      type: 'piecewise',
      dimension: 2,
      seriesIndex: 0,
      pieces: [
        { min: 15, max: 25, color: '#FECACA' },
        { min: 6, max: 14, color: '#FDE68A' },
        { min: 1, max: 5, color: '#BBF7D0' },
      ],
    },
    series: [
      {
        name: '5×5 風險矩陣',
        type: 'heatmap',
        data: buildMatrixHeatmapData(),
        label: {
          show: true,
          color: '#1E293B',
          fontSize: 11,
          fontWeight: 600,
        },
        itemStyle: {
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
      },
      {
        name: '改善前風險',
        type: 'scatter',
        symbol: 'circle',
        symbolSize: 15,
        itemStyle: {
          color: '#DC2626',
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
        data: initialPoints,
        z: 5,
      },
      {
        name: '剩餘風險',
        type: 'scatter',
        symbol: 'diamond',
        symbolSize: 15,
        itemStyle: {
          color: '#0F766E',
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
        data: residualPoints,
        z: 6,
      },
    ],
  });
}

function renderBarChart(): void {
  if (!barChart) return;

  const labels = props.records.map((rec) => rec.hazardName);
  const initialScores = props.records.map((rec) => rec.initialRisk.score);
  const residualScores = props.records.map((rec) => rec.residualRisk?.score ?? null);

  barChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['改善前風險分數', '剩餘風險分數'],
      bottom: 0,
      textStyle: { color: '#475569', fontSize: 11 },
    },
    grid: { top: 24, right: 20, bottom: 42, left: 42 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: '#334155', fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 25,
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    series: [
      {
        name: '改善前風險分數',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color: '#DC2626', borderRadius: [3, 3, 0, 0] },
        data: initialScores,
      },
      {
        name: '剩餘風險分數',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color: '#0F766E', borderRadius: [3, 3, 0, 0] },
        data: residualScores,
      },
    ],
  });
}

function isCanvas2dSupported(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return typeof canvas.getContext === 'function' && canvas.getContext('2d') !== null;
  } catch {
    return false;
  }
}

function initCharts(): void {
  if (!isCanvas2dSupported()) {
    return;
  }
  try {
    if (matrixChartRef.value) {
      matrixChart = echarts.init(matrixChartRef.value);
      renderMatrixChart();
    }
    if (props.showBarChart && barChartRef.value) {
      barChart = echarts.init(barChartRef.value);
      renderBarChart();
    }
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        matrixChart?.resize();
        barChart?.resize();
      });
      if (matrixChartRef.value) resizeObserver.observe(matrixChartRef.value);
      if (barChartRef.value) resizeObserver.observe(barChartRef.value);
    }
  } catch {
    // Gracefully skip ECharts initialization in non-canvas environments such as happy-dom tests.
  }
}

watch(
  () => props.records,
  async () => {
    renderMatrixChart();
    renderBarChart();
    await nextTick();
    barChart?.resize();
  },
  { deep: true },
);

onMounted(() => {
  initCharts();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  matrixChart?.dispose();
  barChart?.dispose();
  matrixChart = null;
  barChart = null;
});
</script>

<template>
  <div class="space-y-4">
    <div class="border border-[#E2E8F0] rounded-md bg-white p-3">
      <div class="flex items-center justify-between text-xs mb-2">
        <span class="font-semibold text-[#1E293B]">ECharts 5×5 風險矩陣分佈圖</span>
        <div class="flex items-center gap-3 text-[11px] text-[#475569]">
          <span class="inline-flex items-center gap-1">
            <span class="h-2.5 w-2.5 rounded-full bg-[#DC2626]" aria-hidden="true" />
            <span>改善前風險</span>
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="h-2.5 w-2.5 rotate-45 bg-[#0F766E]" aria-hidden="true" />
            <span>剩餘風險</span>
          </span>
        </div>
      </div>
      <div ref="matrixChartRef" class="w-full h-[290px]" data-testid="echarts-matrix-container" />
    </div>

    <div
      v-if="showBarChart"
      v-show="records.length > 0"
      class="border border-[#E2E8F0] rounded-md bg-white p-3"
    >
      <div class="text-xs font-semibold text-[#1E293B] mb-2">
        改善前 vs 剩餘風險分數對照（ECharts）
      </div>
      <div ref="barChartRef" class="w-full h-[210px]" data-testid="echarts-bar-container" />
    </div>
  </div>
</template>
