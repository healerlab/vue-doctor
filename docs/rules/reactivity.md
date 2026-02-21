# Reactivity Rules

## `reactivity-destructure-props` ❌ error

Destructuring props loses reactivity in Vue 3.

### Bad

```vue
<script setup>
const { name, count } = defineProps<{ name: string; count: number }>()
</script>
```

### Good

```vue
<script setup>
const props = defineProps<{ name: string; count: number }>()
// Use props.name, props.count
</script>
```

Or use `toRefs`:

```vue
<script setup>
import { toRefs } from 'vue'
const props = defineProps<{ name: string; count: number }>()
const { name, count } = toRefs(props)
</script>
```

---

## `reactivity-reactive-reassign` ❌ error

Reassigning a `reactive()` variable replaces the proxy and breaks reactivity.

### Bad

```ts
let state = reactive({ count: 0 })
state = { count: 1 } // ❌ Proxy is replaced
```

### Good

```ts
const state = reactive({ count: 0 })
Object.assign(state, { count: 1 }) // ✅ Preserves proxy
```

---

## `reactivity-ref-no-value` ⚠️ warning

Using a ref without `.value` in `<script>` compares the Ref object itself, not its value.

### Bad

```ts
const count = ref(0)
if (count === 0) { /* ❌ Always false */ }
count = 5 // ❌ Replaces the ref
```

### Good

```ts
const count = ref(0)
if (count.value === 0) { /* ✅ */ }
count.value = 5 // ✅
```
