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
      url: "https://nodes-prod.18.182.4.86.sslip.io/ext/bc/2Ux71YgdfbcyTCoDYFEkE1Qy9nYpSQyd1it4f953ZTQAaJLB7t/rpc",
      chainId: 89197,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
