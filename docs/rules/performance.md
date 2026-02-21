# Performance Rules

## `perf-giant-component` ⚠️ warning

Components with more than 300 lines are harder to maintain and often indicate the component is doing too much.

### Bad

A single component with 500+ lines handling layout, data fetching, form validation, and display logic.

### Good

Split into focused sub-components:

```
UserProfile.vue (parent)
├── UserAvatar.vue
├── UserForm.vue
└── UserStats.vue
```

---

## `perf-v-for-method-call` ⚠️ warning

Calling a method inside `v-for` causes it to run on every re-render.

### Bad

```vue
<template>
  <div v-for="item in getFilteredItems()" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

### Good

Use a `computed` property:

```vue
<script setup>
const filteredItems = computed(() => items.value.filter(/* ... */))
</script>

<template>
  <div v-for="item in filteredItems" :key="item.id">
    {{ item.name }}
  </div>
</template>
```
