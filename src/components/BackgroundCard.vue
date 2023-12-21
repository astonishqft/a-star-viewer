<script setup lang="ts">
defineProps<{
  bgColor: string
  desc: string
}>()
</script>
<template>
  <div class="card">
    <div class="card-fill" :style="{ background: bgColor }"></div>
    <div class="card-desc">{{desc}}</div>
  </div>
</template>

<style scoped lang="less">
.card {
  // width: 60px;
  // height: 60px;
  margin: 0 10px;
  .card-fill {
    width: 60px;
    height: 60px;
    border: 1px solid #000;
  }
  .card-desc {
    width: 60px;
    height: 60px;
    display: flex;
    justify-content: center;
  }
}


</style>
