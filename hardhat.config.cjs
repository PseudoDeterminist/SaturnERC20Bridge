require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.20" },
      { version: "0.4.18" },
    ],
  },
  etherscan: {
    apiKey: {
      etc: process.env.BLOCKSCOUT_API_KEY || "",
    },
    customChains: [
      {
        network: "etc",
        chainId: 61,
        urls: {
          apiURL:
            process.env.BLOCKSCOUT_API_URL ||
            "https://blockscout.com/etc/mainnet/api",
          browserURL:
            process.env.BLOCKSCOUT_BROWSER_URL ||
            "https://blockscout.com/etc/mainnet",
        },
      },
    ],
  },
  networks: {
    etc: {
      url: process.env.ETC_RPC || "",
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
      chainId: 61,
      gasPrice: process.env.ETC_GAS_PRICE
        ? parseInt(process.env.ETC_GAS_PRICE, 10)
        : undefined,
    },
    mordor: {
      url: process.env.MORDOR_RPC || "",
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
      chainId: 63,
    },
  },
};
