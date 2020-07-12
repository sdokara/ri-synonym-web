<template>
  <div class="home-root">
    <synonym-box/>
  </div>
</template>

<script lang="ts">
  import SynonymBox from '@/components/SynonymBox.vue'

  export default {
    name: 'Home',
    components: {
      SynonymBox
    }
  }
</script>

<style scoped lang="scss">
  div.home-root {
    margin-top: 30px;
  }
</style>
