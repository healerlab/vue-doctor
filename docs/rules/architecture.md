# Architecture Rules

## `arch-mixed-api-styles` ⚠️ warning

Mixing Options API (`data()`, `methods`, `computed`, `watch`) and Composition API (`ref`, `reactive`, `computed()`, `onMounted`) in the same component creates confusion and inconsistency.

### Bad

```vue
<script>
import { ref } from 'vue'

export default {
  data() {
    return { name: 'Vue' }           // ❌ Options API
  },
  methods: {
    greet() { console.log(this.name) } // ❌ Options API
  },
  setup() {
    const count = ref(0)               // ❌ Composition API
    return { count }
  }
}
</script>
```

### Good

Use `<script setup>` (Composition API):

```vue
<script setup>
import { ref } from 'vue'

const name = ref('Vue')
const count = ref(0)

const greet = () => console.log(name.value)
</script>
```

::: tip Migration
Use Vue's [Reactivity Transform](https://vuejs.org/guide/extras/reactivity-transform.html) or migrate components one at a time from Options API to Composition API.
:::
