export const dynamicEnvironmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || "";

if (!dynamicEnvironmentId) {
  console.warn("VITE_DYNAMIC_ENVIRONMENT_ID is not set. Dynamic authentication will not work.");
}

export const dynamicConfig = {
  environmentId: dynamicEnvironmentId,
  walletConnectors: [],
  multiWallet: true,
  enableVisitTrackingOnConnectOnly: true,
  appMetadata: {
    name: "FanRewards",
    shortName: "FanRewards", 
    description: "Web3-enabled loyalty rewards platform for creators and fans",
    url: window.location.origin,
    iconUrl: `${window.location.origin}/favicon.ico`,
  },
};
