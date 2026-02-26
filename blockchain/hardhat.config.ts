import { defineConfig, configVariable } from "hardhat/config";

export default defineConfig({
  solidity: {
    profiles: {
      default: {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
    },
  },
  networks: {
    fandomlyChain: {
      type: "http",
      chainType: "l1",
      url: "https://nodes-prod.18.182.4.86.sslip.io/ext/bc/Xw6RyupcvTsiJdnwc88U2rxt9RkacGbw2wHRJJD4H1sBu2z1H/rpc",
      chainId: 31111,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
