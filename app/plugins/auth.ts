import { authClient } from "../../lib/auth-client";
import { useUserStore } from "~/stores/user";

export default defineNuxtPlugin({
  name: "auth",
  async setup() {
    const userStore = useUserStore();

    try {
      const sessionData = await authClient.getSession();

      if (sessionData?.data?.user) {
        userStore.setUser(sessionData.data.user);
        await userStore.fetchUserPermissions();
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
  },
});
