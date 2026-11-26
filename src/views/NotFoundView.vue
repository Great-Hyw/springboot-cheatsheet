<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="main-inner">
    <div class="empty-state" style="padding: 100px 20px">
      <span class="empty-icon">🧭</span>
      <h1 class="page-title">页面不存在</h1>
      <p>
        没有找到 <code>{{ route.fullPath }}</code> 这个页面。可能是链接拼错了，或者内容已经移动。
      </p>
      <div class="empty-actions">
        <RouterLink class="btn btn-sm btn-primary" to="/">回到首页</RouterLink>
        <RouterLink class="btn btn-sm" to="/annotations">注解速查</RouterLink>
        <button class="btn btn-sm" type="button" @click="router.back()">返回上一页</button>
      </div>
    </div>
  </div>
</template>