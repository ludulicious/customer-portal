import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'

type CommandPaletteItemWithChildren = CommandPaletteItem & {
  children?: CommandPaletteItem[]
}

export const useNavigationLinks = (sidebarOpen: Ref<boolean>) => {
  const { t } = useI18n()
  const userStore = useUserStore()
  const { isAdmin } = storeToRefs(userStore)

  const route = useRoute()
  const isHome = computed(() => route.path === '/')

  const links = computed<NavigationMenuItem[][]>(() => {
    // Footer links (same for both home and dashboard)
    const footerLinks: NavigationMenuItem[] = [{
      label: t('menu.feedback'),
      icon: 'i-lucide-message-circle',
      to: 'https://github.com/nuxt-ui-templates/dashboard',
      target: '_blank'
    }, {
      label: t('menu.helpSupport'),
      icon: 'i-lucide-info',
      to: 'https://github.com/nuxt-ui-templates/dashboard',
      target: '_blank'
    }]

    // Home page menu (public-facing)
    if (isHome.value) {
      const homeMainLinks: NavigationMenuItem[] = [{
        label: t('menu.dashboard'),
        icon: 'i-lucide-layout-dashboard',
        to: '/dashboard',
        onSelect: () => {
          sidebarOpen.value = false
        }
      }, {
        label: t('nav.blog'),
        icon: 'i-lucide-book-open',
        to: '/blog',
        onSelect: () => {
          sidebarOpen.value = false
        }
      }, {
        label: t('nav.contact'),
        icon: 'i-lucide-mail',
        to: '/contact',
        onSelect: () => {
          sidebarOpen.value = false
        }
      }]

      return [homeMainLinks, footerLinks]
    }

    // Dashboard/portal menu (authenticated)
    const dashboardMainLinks: NavigationMenuItem[] = [{
      label: t('menu.dashboard'),
      icon: 'i-lucide-layout-dashboard',
      to: '/dashboard',
      onSelect: () => {
        sidebarOpen.value = false
      },
    },
    {
      label: t('menu.inbox'),
      icon: 'i-lucide-inbox',
      to: '/inbox',
      badge: '4',
      onSelect: () => {
        sidebarOpen.value = false
      }
    }, {
      label: t('menu.serviceRequests.title'),
      icon: 'i-lucide-ticket',
      to: '/requests',
      onSelect: () => {
        sidebarOpen.value = false
      }
    }]

    // Add admin menu if user is admin
    if (isAdmin.value) {
      dashboardMainLinks.push({
        label: t('nav.admin'),
        icon: 'i-lucide-shield-check',
        to: '/admin/organizations',
        onSelect: () => {
          sidebarOpen.value = false
        }
      })
    }

    return [dashboardMainLinks, footerLinks]
  })

  const searchGroups = computed(() => {
    if (links.value.length === 0) return []

    // Flatten all menu items from all groups, including children
    const allItems: CommandPaletteItemWithChildren[] = []
    const itemsMap = new Map<string, CommandPaletteItemWithChildren>()

    links.value.forEach((group, groupIndex) => {
      group.forEach((item) => {
        // Add the main item if it has a 'to' property (is a link, not just a trigger)
        if (item.to && !('type' in item && item.type === 'trigger')) {
          const commandItem: CommandPaletteItemWithChildren = {
            id: item.id || `item-${groupIndex}-${item.to}`,
            label: item.label,
            to: item.to as string,
            icon: item.icon,
            children: [] // Initialize children array
          }
          allItems.push(commandItem)
          itemsMap.set(item.to as string, commandItem)
        }

        // Add children items if they exist
        if ('children' in item && item.children && Array.isArray(item.children)) {
          item.children.forEach((child) => {
            if (child.to) {
              const childItem: CommandPaletteItemWithChildren = {
                id: child.id || `child-${groupIndex}-${child.to}`,
                label: child.label,
                to: child.to as string,
                icon: child.icon
              }
              allItems.push(childItem)
              itemsMap.set(child.to as string, childItem)
            }
          })
        }
      })
    })

    // Add Settings routes as children of Settings parent
    // Find or create Settings parent item
    let settingsParent = itemsMap.get('/settings')
    if (!settingsParent) {
      settingsParent = {
        id: 'settings',
        label: t('menu.settings.title'),
        to: '/settings',
        icon: 'i-lucide-settings'
      }
      allItems.push(settingsParent)
      itemsMap.set('/settings', settingsParent)
    }

    // Add settings children
    const settingsChildren: CommandPaletteItem[] = [
      {
        id: 'settings-general',
        label: t('menu.settings.profile'),
        to: '/settings',
        icon: 'i-lucide-user'
      },
      {
        id: 'settings-organization',
        label: t('menu.settings.organization'),
        to: '/settings/organization',
        icon: 'i-lucide-building-2'
      },
      {
        id: 'settings-notifications',
        label: t('menu.settings.notifications'),
        to: '/settings/notifications',
        icon: 'i-lucide-bell'
      },
      {
        id: 'settings-security',
        label: t('menu.settings.security'),
        to: '/settings/security',
        icon: 'i-lucide-shield'
      }
    ]

    // Add settings children to the parent item (only in children, not in root)
    if (!settingsParent.children) {
      settingsParent.children = []
    }
    settingsChildren.forEach((child) => {
      const existsInChildren = settingsParent.children!.some(item => item.to === child.to)
      if (!existsInChildren) {
        // Only add to parent's children array, not to allItems (to keep them nested only)
        settingsParent.children!.push(child)
      }
    })

    // Add my-organizations as standalone item
    const myOrgsExists = allItems.some(item => item.to === '/my-organizations')
    if (!myOrgsExists) {
      allItems.push({
        id: 'my-organizations',
        label: t('myOrganizations.title'),
        to: '/my-organizations',
        icon: 'i-lucide-building'
      })
    }

    // Add Admin routes as children of Admin parent
    if (isAdmin.value) {
      // Find or create Admin parent item
      let adminParent = itemsMap.get('/admin/organizations')
      if (!adminParent) {
        adminParent = {
          id: 'admin',
          label: t('nav.admin'),
          to: '/admin/organizations',
          icon: 'i-lucide-shield-check'
        }
        allItems.push(adminParent)
        itemsMap.set('/admin/organizations', adminParent)
      }

      // Ensure children array is initialized
      if (!adminParent.children) {
        adminParent.children = []
      }

      // Add admin children
      const adminChildren: CommandPaletteItem[] = [
        {
          id: 'admin-organizations',
          label: t('admin.dashboard.organizations'),
          to: '/admin/organizations',
          icon: 'i-lucide-building-2'
        },
        {
          id: 'admin-users',
          label: t('admin.dashboard.users'),
          to: '/admin/users',
          icon: 'i-lucide-users'
        },
        {
          id: 'admin-organizations-create',
          label: t('admin.organization.create.title'),
          to: '/admin/organizations/create',
          icon: 'i-lucide-plus-circle'
        }
      ]

      // Add admin children to the parent item (only in children, not in root)
      adminChildren.forEach((child) => {
        const existsInChildren = adminParent.children!.some(item => item.to === child.to)
        if (!existsInChildren) {
          // Only add to parent's children for hierarchical display, not to allItems
          adminParent.children!.push(child)
        }
      })
    }

    // Create Home group with blog, contact, feedback, and help & support as children
    const homeChildren: CommandPaletteItem[] = [
      {
        id: 'blog',
        label: t('nav.blog'),
        to: '/blog',
        icon: 'i-lucide-book-open'
      },
      {
        id: 'contact',
        label: t('nav.contact'),
        to: '/contact',
        icon: 'i-lucide-mail'
      },
      {
        id: 'feedback',
        label: t('menu.feedback'),
        to: 'https://github.com/nuxt-ui-templates/dashboard',
        icon: 'i-lucide-message-circle',
        target: '_blank'
      },
      {
        id: 'help-support',
        label: t('menu.helpSupport'),
        to: 'https://github.com/nuxt-ui-templates/dashboard',
        icon: 'i-lucide-info',
        target: '_blank'
      }
    ]

    const homeParent: CommandPaletteItemWithChildren = {
      id: 'home',
      label: t('menu.home'),
      to: '/',
      icon: 'i-lucide-home',
      children: homeChildren
    }

    // Home children are only in the parent's children array, not in root list

    // Create groups - Home group and Navigation group
    const groups: CommandPaletteGroup<CommandPaletteItem>[] = [
      {
        id: 'home',
        label: t('menu.home'),
        items: [homeParent]
      },
      {
        id: 'navigation',
        label: 'Go to',
        items: allItems
      }
    ]

    return groups
  })

  return {
    links,
    searchGroups
  }
}
