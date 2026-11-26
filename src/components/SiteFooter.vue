<script setup>
import { stats } from '../data'
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <span>SpringBoot 速查 · 基于 Spring Boot 3.5.x / Spring Framework 6.2.x</span>
      <span>共收录 {{ stats.annotations }} 条注解、{{ stats.knowledge }} 篇知识文章</span>
      <span class="footer-links">
        <RouterLink to="/about">内容核查</RouterLink>
        <RouterLink to="/annotations">注解速查</RouterLink>
        <RouterLink to="/knowledge">知识库</RouterLink>
      </span>
    </div>
  </footer>
</template>