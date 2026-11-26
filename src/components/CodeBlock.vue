<script setup>
import { computed, ref } from 'vue'
import { highlightCode } from '../utils/highlight'

const props = defineProps({
  code: { type: String, required: true },
  lang: { type: String, default: 'java' },
  title: { type: String, default: 'Java' },
})

const copied = ref(false)
const html = computed(() => highlightCode(props.code, props.lang))

async function copy() {
  const text = props.code
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="code-block">
    <div class="code-block__head">
      <span class="code-block__dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="code-block__title">{{ title }}</span>
      <button class="code-block__copy" type="button" @click="copy">{{ copied ? '已复制 ✓' : '复制代码' }}</button>
    </div>
    <pre><code v-html="html"></code></pre>
  </div>
</template>