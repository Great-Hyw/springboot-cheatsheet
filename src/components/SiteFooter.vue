<script setup>
import { stats } from '../data'
import { commandStats } from '../data/commands'
import { topicStats } from '../data/topics'
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <span>SpringBoot 速查 · 注解 / 知识 / 专题 / Linux / Git</span>
      <span>共收录 {{ stats.annotations }} 条注解、{{ stats.knowledge }} 篇知识文章、{{ topicStats.total }} 篇实战专题、{{ commandStats.total }} 条命令</span>
      <span class="footer-links">
        <RouterLink to="/about">内容核查</RouterLink>
        <RouterLink to="/annotations">注解速查</RouterLink>
        <RouterLink to="/knowledge">知识库</RouterLink>
        <RouterLink to="/topics">实战专题</RouterLink>
        <RouterLink to="/commands">命令速查</RouterLink>
      </span>
    </div>
  </footer>
</template>