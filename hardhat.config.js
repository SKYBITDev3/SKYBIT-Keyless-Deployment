require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()
const chains = require("@wagmi/chains")

const accounts = { mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk" }
// const accounts = [process.env.PRIVATE_KEY1, process.env.PRIVATE_KEY2]

// You can add more blockchains to this list if they don't already exist in @wagmi/chains
const additionalNetworks = { // See https://github.com/wagmi-dev/references/blob/main/packages/chains/src/index.ts
  bttc: {
    chainId: 199,
    url: "https://rpc.bittorrentchain.io",
    accounts,

    network: "bttc",
    urls: {
      apiURL: "https://api.bttcscan.com/api",
      browserURL: "https://bttcscan.com"
    }
  },
  bttcTestnet: {
    chainId: 1028,
    url: "https://testrpc.bittorrentchain.io",
    accounts,

    network: "bttcTestnet",
    urls: {
      apiURL: "https://api-testnet.bttcscan.com/api",
      browserURL: "https://testnet.bttcscan.com"
    }
  },

  heco: {
    chainId: 128,
    url: "https://http-mainnet.hecochain.com",
    accounts,
    // use built-in hardhat-verify details
  },
  hecoTestnet: {
    chainId: 256,
    url: "https://http-testnet.hecochain.com",
    accounts,
    // use built-in hardhat-verify details
  },

  harmonyTest: {
    chainId: 1666700000,
    url: "https://api.s0.b.hmny.io",
    accounts,
    // use built-in hardhat-verify details
  },

  bobaTestnet: {
    chainId: 2888,
    url: "https://goerli.boba.network",
    accounts,

    network: "bobaTestnet",
    urls: {
      apiURL: "https://api-testnet.bobascan.com/api",
      browserURL: "https://testnet.bobascan.com"
    }
  },
}

const hardhatVerifyBuiltinChains = ["mainnet", "goerli", "optimisticEthereum", "bsc", "sokol", "bscTestnet", "xdai", "gnosis", "heco", "polygon", "opera", "hecoTestnet", "optimisticGoerli", "moonbeam", "moonriver", "moonbaseAlpha", "ftmTestnet", "base", "chiado", "arbitrumOne", "avalancheFujiTestnet", "avalanche", "polygonMumbai", "baseGoerli", "arbitrumTestnet", "arbitrumGoerli", "sepolia", "aurora", "auroraTestnet", "harmony", "harmonyTest"] // https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts
const wagmiToHardhatVerifyTranslation = { // because some names don't match. So we'll use the name in hardhat-verify.
  arbitrum: "arbitrumOne",
  avalancheFuji: "avalancheFujiTestnet",
  fantom: "opera",
  fantomTestnet: "ftmTestnet",
  gnosisChiado: "chiado",
  harmonyOne: "harmony",
  optimism: "optimisticEthereum",
  optimismGoerli: "optimisticGoerli",
}

let networks = {}
for (let [chainName, chainData] of Object.entries(chains)) {
  if (!["hardhat", "localhost"].includes(chainName)) { // "HardhatConfig.networks.hardhat can't have an url"
    chainName = wagmiToHardhatVerifyTranslation[chainName] === undefined ? chainName : wagmiToHardhatVerifyTranslation[chainName] // change to what hardhat-verify uses

    networks[chainName] = {
      chainId: chainData.id,
      url: chainData.rpcUrls.public.http[0],
      accounts,
    }

    // add keys for hardhat-verify if blockchain isn't built in hardhat-verify and has explorer
    if (!hardhatVerifyBuiltinChains.includes(chainName) && Object.hasOwn(chainData, "blockExplorers")) {
      const browserURL = chainData.blockExplorers[Object.hasOwn(chainData.blockExplorers, "etherscan") ? "etherscan" : "default"].url

      networks[chainName] = {
        ...networks[chainName],
        ...{
          network: chainName,
          urls: {
            apiURL: `${browserURL.slice(0, 8)}api${browserURL.split(".").length === 2 ? "." : "-"}${browserURL.slice(8)}/api`,
            browserURL
          }
        }
      }
    }
  }
}
networks = { ...networks, ...additionalNetworks }

const customChains = Object.values(networks).filter(network => Object.hasOwn(network, "urls"))


/** @type import("hardhat/config").HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.21",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000
            // runs: 2000000
          },
          evmVersion: "paris", // shanghai is current default but many blockchains don't support push0 opcode yet (causing "ProviderError: invalid opcode: opcode 0x5f not defined" and "ProviderError: execution reverted"). paris is prior version. 
        }
      },
    ],

  },
  networks,
  etherscan: {
    apiKey: { // ADD LINES FOR YOUR DESIRED BLOCKCHAINS HERE
      celo: process.env.CELOSCAN_API_KEY,
      celoAlfajores: process.env.CELOSCAN_API_KEY,
      polygonZkEvm: process.env.ZKEVM_POLYGONSCAN_API_KEY,
      polygonZkEvmTestnet: process.env.ZKEVM_POLYGONSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
    },
    customChains,
    timeout: 60000  // 1min (default is 20s)
  }
}
