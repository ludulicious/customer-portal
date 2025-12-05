<template>
  <div>
    <AppHeader :show-navigation="true" />

    <UMain class="main-content">
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>
