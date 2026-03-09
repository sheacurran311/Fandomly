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
    fuji: {
      type: "http",
      chainType: "l1",
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
});
