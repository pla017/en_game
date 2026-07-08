<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('Mini game hub launched');
});

onShow(() => {
  console.log('Mini game hub shown');
});

onHide(() => {
  console.log('Mini game hub hidden');
});
</script>

<style lang="scss">
page {
  min-height: 100%;
  background: #f5f7fb;
  color: #182033;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
