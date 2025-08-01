export const dynamicEnvironmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "";

if (!dynamicEnvironmentId) {
  console.warn("VITE_DYNAMIC_ENVIRONMENT_ID is not set. Dynamic authentication will not work.");
}

export const dynamicConfig = {
  environmentId: dynamicEnvironmentId,
  walletConnectors: [],
  multiWallet: true,
  enableVisitTrackingOnConnectOnly: true,
  // Disable 2FA and email requirements
  privacyPolicy: undefined,
  termsOfService: undefined,
  socialProvidersFilter: undefined,
  overrides: {
    evmNetworks: [],
  },
  appMetadata: {
    name: "Fandomly",
    shortName: "Fandomly", 
    description: "AI-powered loyalty platform for creators and fans",
  },
  events: {
    onAuthSuccess: (args: any) => {
      console.log('Dynamic Auth Success:', args);
    },
    onLogout: (args: any) => {
      console.log('Dynamic Logout:', args);
      // Clear any local storage or cached data
      localStorage.removeItem('userType');
      localStorage.removeItem('onboardingCompleted');
    },
    onAuthFlowClose: (args: any) => {
      console.log('Dynamic Auth Flow Closed:', args);
    }
  }
};
