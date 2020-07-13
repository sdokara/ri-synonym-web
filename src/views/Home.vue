<template>
  <div class="root">
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

<style lang="scss">
  div.root {
    margin-top: 30px;
  }
</style>
