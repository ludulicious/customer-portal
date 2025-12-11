<script setup lang="ts">
import * as z from 'zod'
import type { FormError } from '@nuxt/ui'

const passwordSchema = z.object({
  current: z.string().min(8, 'Must be at least 8 characters'),
  new: z.string().min(8, 'Must be at least 8 characters')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: undefined,
  new: undefined
})

const userStore = useUserStore()
const { changePasswordAllowed } = storeToRefs(userStore)
console.log(changePasswordAllowed.value)
const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    errors.push({ name: 'new', message: 'Passwords must be different' })
  }
  return errors
}
</script>

<template>
  <div>
  <AppCard v-if="changePasswordAllowed"
    title="Password"
    description="Confirm your current password before setting a new one."
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      class="flex flex-col gap-4 max-w-xs"
    >
      <UFormField name="current">
        <UInput
          v-model="password.current"
          type="password"
          placeholder="Current password"
          class="w-full"
        />
      </UFormField>

      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          placeholder="New password"
          class="w-full"
        />
      </UFormField>

      <UButton label="Update" class="w-fit" type="submit" />
    </UForm>
  </AppCard>

  <UCard
    title="Account"
    description=""
    class="bg-gradient-to-tl from-error/10 from-5% to-default mt-8"
    variant="subtle"
  >
  <template #header>
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Terminate Account
        </h2>
        <h6 class="text-sm text-gray-600 dark:text-gray-400">
           No longer want to use our service? You can delete your account here. This action is not reversible. All information related to this account will be deleted permanently.
        </h6>
      </div>
    </template>
    <template #footer>
      <UButton label="Delete account" color="error" />
      </template>
    </UCard>
  </div>
</template>
