import { authClient } from '~~/lib/auth-client'

export const useServiceRequestMenu = () => {
  const { data: role } = authClient.organization.getActiveMemberRole()
  const isOrganizationAdmin = computed(() => {
    if (!role.value) return false
    return role.value.role === 'owner' || role.value.role === 'admin'
  })

  const menuItems = computed(() => {
    const items = [
      {
        label: 'My Requests',
        to: '/requests',
        icon: 'i-lucide-ticket'
      }
    ]

    if (isOrganizationAdmin.value) {
      items.push({
        label: 'Manage Requests',
        to: '/admin/requests',
        icon: 'i-lucide-settings'
      })
    }

    return items
  })

  return {
    menuItems: readonly(menuItems),
    isOrganizationAdmin: readonly(isOrganizationAdmin)
  }
}
