<template>
  <EHtml>
    <EHead>
      <ETitle>{{ title }}</ETitle>
      <EMeta name="viewport" content="width=device-width, initial-scale=1.0" />
    </EHead>
    <EBody>
      <EContainer>
        <ESection>
          <!-- Header -->
          <ERow>
            <EColumn>
              <EText align="center" style="font-size: 24px; font-weight: bold; color: #4CAF50; margin-bottom: 20px;">
                ApexPro
              </EText>
            </EColumn>
          </ERow>

          <!-- Content -->
          <ERow>
            <EColumn>
              <slot />
            </EColumn>
          </ERow>

          <!-- Footer -->
          <ERow>
            <EColumn>
              <EText align="center" style="font-size: 14px; color: #777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
                &copy; {{ currentYear }} ApexPro. All rights reserved.
              </EText>
            </EColumn>
          </ERow>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>

<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()

const currentYear = new Date().getFullYear()
</script>
