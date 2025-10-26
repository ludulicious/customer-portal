import { authClient } from "@@/lib/auth-client";
import { useUserStore } from "~/stores/user";

export default defineNuxtPlugin({
  name: "auth",
  async setup() {
    const userStore = useUserStore();

    try {
      const sessionData = await authClient.getSession();
      console.log("Initial session data:", sessionData);

      if (sessionData?.data?.user) {
        console.log("Setting user from initial session:", sessionData.data.user);
        userStore.setUser(sessionData.data.user);
        await userStore.fetchUserPermissions();
      } else {
        console.log("No user found in initial session");
      }
    } catch (error) {
      console.log("getSession error:", error);
    }

    const { data: session } = await authClient.useSession(useFetch);

    watch(
      () => session.value?.user,
      async (newUser) => {
        console.log("newUser", newUser);
        userStore.setUser(newUser);
        if (newUser) {
          await userStore.fetchUserPermissions();
        } else {
          userStore.clearUserData();
        }
      },
      { immediate: true },
    );

    // Also watch for session changes to handle OTP verification
    watch(
      () => session.value,
      async (newSession) => {
        if (newSession?.user) {
          console.log("Session updated, user:", newSession.user);
          userStore.setUser(newSession.user);
          await userStore.fetchUserPermissions();
        }
      },
      { deep: true }
    );
  },
});
