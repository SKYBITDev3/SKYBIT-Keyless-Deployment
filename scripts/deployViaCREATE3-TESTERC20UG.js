// CHOOSE WHICH FACTORY YOU WANT TO USE: "axelarnetwork" or "ZeframLou"
const factoryToUse = "axelarnetwork"
// const factoryToUse = "ZeframLou"

const isDeployEnabled = true // toggle in case you do deployment and verification separately.

const isVerifyEnabled = true

const useDeployProxy = false // openzeppelin's deployment script for upgradeable contracts
const useCREATE3 = true


const addressOfFactory = "0xDd9F606e518A955Cd3800f18126DC14E54e4E995"
// const addressOfFactory = "0xFAD1A5cA55b731b512FeF5FEb19c60Ab35f3657f"

const salt = ethers.encodeBytes32String("SKYBIT.ASIA TESTERC20UGV1......") // 31 characters that you choose


async function main() {
  const { rootRequire, printNativeCurrencyBalance, verifyContract } = require("./utils")

  const [wallet, wallet2] = await ethers.getSigners()
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${await printNativeCurrencyBalance(wallet.address)} of native currency, RPC url: ${network.config.url}`)

  const tokenContractName = "TESTERC20UGV1"
  const constructorArgsOfToken = [
    wallet.address,
    { x: 10, y: 5 },
  ]


  const cfToken = await ethers.getContractFactory(tokenContractName)

  let proxy, proxyAddress, implAddress, initializerData
  if (useDeployProxy) {
    if (isDeployEnabled) {
      proxy = await upgrades.deployProxy(cfToken, constructorArgsOfToken, { kind: "uups", timeout: 0 })
      await proxy.waitForDeployment()

      proxyAddress = proxy.target
    }
  } else { // not using openzeppelin's script
    const nonce = await wallet.getNonce()
    const expectedAddressOfImpl = ethers.getCreateAddress({ from: wallet.address, nonce })
    console.log(`Expected address of implementation using nonce ${nonce}: ${expectedAddressOfImpl}`)
    implAddress = expectedAddressOfImpl

    if (isDeployEnabled) {
      const impl = await cfToken.deploy()
      await impl.waitForDeployment()
      implAddress = await impl.getAddress()
      console.log(`implAddress ${implAddress === expectedAddressOfImpl ? "matches" : "doesn't match"} expectedAddressOfImpl`)
    }
    const proxyContractName = "ERC1967Proxy"
    const cfProxy = await ethers.getContractFactory(proxyContractName) // used hardhat-dependency-compiler to get the artifacts locally. The one in @openzeppelin/upgrades-core is old.
    const fragment = cfToken.interface.getFunction("initialize")
    initializerData = cfToken.interface.encodeFunctionData(fragment, constructorArgsOfToken)

    if (useCREATE3) {
      const { getArtifactOfFactory, getDeployedAddress, CREATE3Deploy } = rootRequire("scripts/CREATE3-deploy-functions.js")

      if (isDeployEnabled) {
        proxy = await CREATE3Deploy(factoryToUse, addressOfFactory, cfProxy, proxyContractName, [implAddress, initializerData], salt, wallet)
        proxyAddress = proxy.target
      } else {
        const artifactOfFactory = getArtifactOfFactory(factoryToUse)
        const instanceOfFactory = await ethers.getContractAt(artifactOfFactory.abi, addressOfFactory)
        proxyAddress = await getDeployedAddress(factoryToUse, instanceOfFactory, wallet.address, salt)  
      }
    } else { // not using CREATE3
      proxy = await cfProxy.deploy(implAddress, initializerData)
      await proxy.waitForDeployment()
      proxyAddress = proxy.target
    }

    if (isDeployEnabled) proxy = await upgrades.forceImport(proxyAddress, cfToken)
  }
  console.log(`proxy address: ${proxyAddress}`)

  implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress)
  console.log(`implementation address: ${implAddress}`)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled && !["hardhat", "localhost"].includes(network.name)) {
    if (isDeployEnabled) {
      console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
      const { setTimeout } = require("timers/promises")
      await setTimeout(20000)
    }

    await verifyContract(proxyAddress) // also verifies implementation
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

