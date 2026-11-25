<script setup lang="ts">
import { computed } from 'vue';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';

const props = withDefaults(
  defineProps<{
    label: string;
    tone?: BadgeTone;
    showDot?: boolean;
  }>(),
  {
    tone: 'neutral',
    showDot: true,
  },
);

const toneClasses = computed(() => {
  switch (props.tone) {
    case 'success':
      return {
        wrapper: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
        dot: 'bg-[#16A34A]',
      };
    case 'warning':
      return {
        wrapper: 'bg-amber-50 text-[#D97706] border-amber-200',
        dot: 'bg-[#D97706]',
      };
    case 'danger':
      return {
        wrapper: 'bg-red-50 text-[#DC2626] border-red-200',
        dot: 'bg-[#DC2626]',
      };
    case 'primary':
      return {
        wrapper: 'bg-teal-50 text-[#0F766E] border-teal-200',
        dot: 'bg-[#0F766E]',
      };
    default:
      return {
        wrapper: 'bg-slate-100 text-[#475569] border-[#E2E8F0]',
        dot: 'bg-[#64748B]',
      };
  }
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap"
    :class="toneClasses.wrapper"
  >
    <span
      v-if="showDot"
      class="h-1.5 w-1.5 rounded-full shrink-0"
      :class="toneClasses.dot"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </span>
</template>
