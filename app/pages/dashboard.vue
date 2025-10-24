<script setup lang="ts">
const { locale } = useI18n()
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const localePath = useLocalePath()

// Authentication is handled by the global auth middleware
// No need for additional redirect logic here

// Fake data for ApexPro dashboard
const dashboardData = ref({
  overview: {
    totalOrders: 47,
    completedOrders: 42,
    pendingOrders: 5,
    totalInvoices: 23,
    paidInvoices: 21,
    overdueInvoices: 2
  },
  monthlyStats: {
    ordersCompleted: [12, 15, 18, 14, 16, 20, 18],
    serviceRequests: [8, 12, 10, 15, 13, 17, 14],
    slaCompliance: [95, 97, 94, 96, 98, 99, 97]
  },
  recentActivity: [
    {
      id: 1,
      type: 'order',
      title: 'Office Cleaning - Floor 3',
      status: 'completed',
      date: '2024-01-15',
      time: '14:30'
    },
    {
      id: 2,
      type: 'invoice',
      title: 'Monthly Service Invoice #INV-2024-001',
      status: 'paid',
      date: '2024-01-14',
      time: '09:15'
    },
    {
      id: 3,
      type: 'request',
      title: 'HVAC Maintenance Request',
      status: 'in-progress',
      date: '2024-01-13',
      time: '16:45'
    },
    {
      id: 4,
      type: 'order',
      title: 'Window Cleaning - Building A',
      status: 'scheduled',
      date: '2024-01-12',
      time: '11:20'
    }
  ],
  slaMetrics: {
    responseTime: 2.3,
    resolutionTime: 4.7,
    customerSatisfaction: 4.8,
    complianceRate: 97.2
  }
})

// Chart data for visualizations
const ordersChartData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  datasets: [
    {
      label: 'Orders Completed',
      data: dashboardData.value.monthlyStats.ordersCompleted,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2
    }
  ]
}))

const slaChartData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  datasets: [
    {
      label: 'SLA Compliance %',
      data: dashboardData.value.monthlyStats.slaCompliance,
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 2
    }
  ]
}))

// Status colors for activity items
const getStatusColor = (status: string) => {
  const colors = {
    completed: 'green',
    paid: 'green',
    'in-progress': 'blue',
    scheduled: 'yellow',
    overdue: 'red'
  }
  return colors[status as keyof typeof colors] || 'gray'
}

const getStatusIcon = (type: string, status: string) => {
  if (type === 'order') {
    return status === 'completed' ? 'i-lucide-check-circle' : 'i-lucide-clock'
  }
  if (type === 'invoice') {
    return status === 'paid' ? 'i-lucide-receipt' : 'i-lucide-alert-circle'
  }
  if (type === 'request') {
    return 'i-lucide-life-buoy'
  }
  return 'i-lucide-circle'
}

// Page metadata
useSeoMeta({
  title: locale.value === 'en' ? 'Dashboard - ApexPro Portal' : 'Dashboard - ApexPro Portaal',
  description: locale.value === 'en'
    ? 'Manage your facility services, orders, and invoices with ApexPro'
    : 'Beheer uw facilitaire diensten, orders en facturen met ApexPro'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Dashboard Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ locale === 'en' ? 'Dashboard' : 'Dashboard' }}
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ locale === 'en'
                ? 'Welcome back! Here\'s what\'s happening with your facility services.'
                : 'Welkom terug! Hier is wat er gebeurt met uw facilitaire diensten.'
              }}
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <UButton
              :to="localePath('/orders')"
              color="primary"
              variant="outline"
              icon="i-lucide-clipboard-list"
            >
              {{ locale === 'en' ? 'View All Orders' : 'Bekijk Alle Orders' }}
            </UButton>
            <UButton
              :to="localePath('/invoices')"
              color="gray"
              variant="outline"
              icon="i-lucide-file-text"
            >
              {{ locale === 'en' ? 'View Invoices' : 'Bekijk Facturen' }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Orders Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ locale === 'en' ? 'Total Orders' : 'Totaal Orders' }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.overview.totalOrders }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UIcon name="i-lucide-clipboard-check" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center text-sm">
              <span class="text-green-600 dark:text-green-400 font-medium">
                {{ dashboardData.overview.completedOrders }} {{ locale === 'en' ? 'completed' : 'voltooid' }}
              </span>
              <span class="text-gray-500 dark:text-gray-400 mx-2">•</span>
              <span class="text-yellow-600 dark:text-yellow-400">
                {{ dashboardData.overview.pendingOrders }} {{ locale === 'en' ? 'pending' : 'in behandeling' }}
              </span>
            </div>
          </div>
        </UCard>

        <!-- Invoices Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ locale === 'en' ? 'Invoices' : 'Facturen' }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.overview.totalInvoices }}
              </p>
            </div>
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UIcon name="i-lucide-receipt-text" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center text-sm">
              <span class="text-green-600 dark:text-green-400 font-medium">
                {{ dashboardData.overview.paidInvoices }} {{ locale === 'en' ? 'paid' : 'betaald' }}
              </span>
              <span class="text-gray-500 dark:text-gray-400 mx-2">•</span>
              <span class="text-red-600 dark:text-red-400">
                {{ dashboardData.overview.overdueInvoices }} {{ locale === 'en' ? 'overdue' : 'achterstallig' }}
              </span>
            </div>
          </div>
        </UCard>

        <!-- SLA Compliance Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ locale === 'en' ? 'SLA Compliance' : 'SLA Naleving' }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.complianceRate }}%
              </p>
            </div>
            <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UIcon name="i-lucide-gauge" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div class="mt-4">
            <UProgress :value="dashboardData.slaMetrics.complianceRate" color="green" />
          </div>
        </UCard>

        <!-- Customer Satisfaction Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ locale === 'en' ? 'Satisfaction' : 'Tevredenheid' }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.customerSatisfaction }}/5
              </p>
            </div>
            <div class="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <UIcon name="i-lucide-star" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center">
              <div class="flex text-yellow-400">
                <UIcon v-for="i in 5" :key="i"
                  :name="i <= Math.floor(dashboardData.slaMetrics.customerSatisfaction) ? 'i-lucide-star' : 'i-lucide-star'"
                  :class="i <= Math.floor(dashboardData.slaMetrics.customerSatisfaction) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Orders Chart -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ locale === 'en' ? 'Orders Completed' : 'Orders Voltooid' }}
              </h3>
              <UButton size="sm" variant="ghost" icon="i-lucide-download">
                {{ locale === 'en' ? 'Export' : 'Exporteren' }}
              </UButton>
            </div>
          </template>
          <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="text-center">
              <UIcon name="i-lucide-bar-chart-3" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500 dark:text-gray-400">
                {{ locale === 'en' ? 'Chart visualization would go here' : 'Grafiek visualisatie zou hier komen' }}
              </p>
              <p class="text-sm text-gray-400 mt-2">
                {{ locale === 'en' ? 'Integration with chart library needed' : 'Integratie met grafiek bibliotheek nodig' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- SLA Performance Chart -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ locale === 'en' ? 'SLA Performance' : 'SLA Prestaties' }}
              </h3>
              <UButton size="sm" variant="ghost" icon="i-lucide-download">
                {{ locale === 'en' ? 'Export' : 'Exporteren' }}
              </UButton>
            </div>
          </template>
          <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="text-center">
              <UIcon name="i-lucide-trending-up" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500 dark:text-gray-400">
                {{ locale === 'en' ? 'SLA performance chart would go here' : 'SLA prestaties grafiek zou hier komen' }}
              </p>
              <p class="text-sm text-gray-400 mt-2">
                {{ locale === 'en' ? 'Integration with chart library needed' : 'Integratie met grafiek bibliotheek nodig' }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Recent Activity and Quick Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Activity -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ locale === 'en' ? 'Recent Activity' : 'Recente Activiteit' }}
                </h3>
                <UButton size="sm" variant="ghost" :to="localePath('/activity')">
                  {{ locale === 'en' ? 'View All' : 'Bekijk Alles' }}
                </UButton>
              </div>
            </template>
            <div class="space-y-4">
              <div v-for="activity in dashboardData.recentActivity" :key="activity.id"
                class="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div class="shrink-0">
                  <UAvatar
                    :icon="getStatusIcon(activity.type, activity.status)"
                    :color="getStatusColor(activity.status)"
                    size="sm"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ activity.title }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ activity.date }} at {{ activity.time }}
                  </p>
                </div>
                <div class="shrink-0">
                  <UBadge
                    :color="getStatusColor(activity.status)"
                    variant="subtle"
                  >
                    {{ activity.status }}
                  </UBadge>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Quick Stats -->
        <div class="space-y-6">
          <!-- Response Time -->
          <UCard>
            <div class="text-center">
              <UIcon name="i-lucide-clock" class="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.responseTime }}h
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ locale === 'en' ? 'Avg Response Time' : 'Gem. Reactietijd' }}
              </p>
            </div>
          </UCard>

          <!-- Resolution Time -->
          <UCard>
            <div class="text-center">
              <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.resolutionTime }}h
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ locale === 'en' ? 'Avg Resolution Time' : 'Gem. Oplostijd' }}
              </p>
            </div>
          </UCard>

          <!-- Quick Actions -->
          <UCard>
            <template #header>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ locale === 'en' ? 'Quick Actions' : 'Snelle Acties' }}
              </h4>
            </template>
            <div class="space-y-3">
              <UButton
                :to="localePath('/orders/new')"
                color="primary"
                variant="outline"
                block
                icon="i-lucide-plus"
              >
                {{ locale === 'en' ? 'New Order' : 'Nieuwe Order' }}
              </UButton>
              <UButton
                :to="localePath('/requests/new')"
                color="gray"
                variant="outline"
                block
                icon="i-lucide-life-buoy"
              >
                {{ locale === 'en' ? 'New Request' : 'Nieuw Verzoek' }}
              </UButton>
              <UButton
                :to="localePath('/reports')"
                color="gray"
                variant="outline"
                block
                icon="i-lucide-file-text"
              >
                {{ locale === 'en' ? 'Generate Report' : 'Rapport Genereren' }}
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
