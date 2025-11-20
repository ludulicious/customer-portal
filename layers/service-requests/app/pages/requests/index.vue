<script setup lang="ts">
const {
  requests,
  loading,
  pagination,
  fetchRequests
} = useServiceRequests()

onMounted(() => {
  fetchRequests()
})

const handleFilter = (filters: ServiceRequestFilters) => {
  fetchRequests(filters)
}

</script>

<template>
  <div class="container mx-auto py-8">
    <CustomerRequestList
      :requests="requests"
      :loading="loading"
      :pagination="pagination"
      @create="navigateTo('/requests/new')"
      @select="navigateTo(`/requests/${$event}`)"
      @filter="handleFilter"
    />
  </div>
</template>
