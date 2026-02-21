# Nuxt Rules

## `nuxt-fetch-in-mounted` ❌ error

Data fetching composables (`useFetch`, `useAsyncData`) used inside `onMounted()` won't run during SSR.

### Bad

```vue
<script setup>
onMounted(async () => {
  const { data } = await useFetch('/api/users') // ❌ Skipped on SSR
})
</script>
```

### Good

```vue
<script setup>
const { data } = await useFetch('/api/users') // ✅ Runs on SSR + client
</script>
```

---

## `nuxt-no-navigate-to-in-setup` ⚠️ warning

Calling `navigateTo()` at the top level of `<script setup>` without `return` may not work correctly.

### Bad

```vue
<script setup>
if (!user.value) {
  navigateTo('/login') // ❌ Missing return
}
</script>
```

### Good

```vue
<script setup>
if (!user.value) {
  return navigateTo('/login') // ✅
}
</script>
```

Or use route middleware:

```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  if (!useAuth().value) return navigateTo('/login')
})
```
