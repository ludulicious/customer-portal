import type { NavigationMenuItem } from '@nuxt/ui'

export const useNavigationLinks = (sidebarOpen: Ref<boolean>) => {
  const { t } = useI18n()

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
    }, {
      label: t('menu.settings.title'),
      to: '/settings',
      icon: 'i-lucide-settings',
      defaultOpen: false,
      type: 'trigger',
      children: [{
        label: t('menu.settings.general'),
        to: '/settings',
        exact: true,
        onSelect: () => {
          sidebarOpen.value = false
        }
      }, {
        label: t('menu.settings.organization'),
        to: '/settings/organization',
        onSelect: () => {
          sidebarOpen.value = false
        }
      }, {
        label: t('menu.settings.notifications'),
        to: '/settings/notifications',
        onSelect: () => {
          sidebarOpen.value = false
        }
      }, {
        label: t('menu.settings.security'),
        to: '/settings/security',
        onSelect: () => {
          sidebarOpen.value = false
        }
      }]
    }]

    return [dashboardMainLinks, footerLinks]
  })

  return {
    links
  }
}
