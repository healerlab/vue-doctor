# Pinia Rules

## `pinia-no-store-to-refs` ⚠️ warning

Destructuring a Pinia store without `storeToRefs()` loses reactivity for state and getters.

### Bad

```ts
const { count, doubleCount } = useCounterStore() // ❌ Not reactive
```

### Good

```ts
import { storeToRefs } from 'pinia'

const store = useCounterStore()
const { count, doubleCount } = storeToRefs(store) // ✅ Reactive

// Actions can be destructured directly (they don't need reactivity)
const { increment } = store
```

---

## `pinia-direct-state-mutation` ⚠️ warning

Mutating store state directly outside of actions reduces traceability and makes debugging harder.

### Bad

```ts
const store = useCounterStore()
store.count = 42 // ❌ Direct mutation
```

### Good

```ts
// Option 1: Use an action
const store = useCounterStore()
store.setCount(42)

// Option 2: Use $patch
store.$patch({ count: 42 })

// Option 3: Use $patch with function
store.$patch((state) => {
  state.count = 42
})
```
