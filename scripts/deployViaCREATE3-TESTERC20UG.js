// implementation deployed normally, proxy deployed via CREATE3
const { ethers, network, upgrades } = require(`hardhat`)

// CHOOSE WHICH FACTORY YOU WANT TO USE:
// const factoryToUse = { name: `axelarnetwork`, address: `0x8cf037a598957EFE440841E256f4CA0056A8219C` }
// const factoryToUse = { name: `ZeframLou`, address: `0x03B583D983aAe5a965dfCC3565F58C9153Af1Be3` }
// const factoryToUse = { name: `SKYBITSolady`, address: `0x5391d63aBd39A43360CE360531f5Ba5c19249030` }
const factoryToUse = { name: `SKYBITLite`, address: `0x739201bA340A675624D9ADb1cc27e68F76a29765` }

const isDeployEnabled = true // toggle in case you do deployment and verification separately.

const isVerifyEnabled = true

const useDeployProxy = false // openzeppelin's deployment script for upgradeable contracts (the usual way without CREATE3)
const useCREATE3 = true

const salt = ethers.encodeBytes32String(`SKYBIT.ASIA TESTERC20UGV1......`) // 31 characters that you choose


async function main() {
  const { rootRequire, printNativeCurrencyBalance, verifyContract } = require(`./utils`)

  const [wallet, wallet2] = await ethers.getSigners()
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${await printNativeCurrencyBalance(wallet.address)} of native currency, RPC url: ${network.config.url}`)

  const implContractName = `TESTERC20UGV1`
  const initializerArgsForImpl = [ // constructor not used in UUPS contracts. Instead, proxy will call initializer in implementation contract instance
    wallet.address,
    { x: 10, y: 5 },
  ]


  const cfImpl = await ethers.getContractFactory(implContractName)

  let proxy, proxyAddress, implAddress, initializerData
  if (useDeployProxy) { // Using openzeppelin's script (e.g. to test that the usual way (without CREATE3) of deploying upgradeable contracts works)
    if (isDeployEnabled) {
      proxy = await upgrades.deployProxy(cfImpl, initializerArgsForImpl, { kind: `uups`, timeout: 0 })
      await proxy.waitForDeployment()

      proxyAddress = proxy.target
    }
  } else { // not using openzeppelin's script
    const nonce = await wallet.getNonce()
    const addressExpectedOfImpl = ethers.getCreateAddress({ from: wallet.address, nonce })
    console.log(`Expected address of implementation using nonce ${nonce}: ${addressExpectedOfImpl}`)
    implAddress = addressExpectedOfImpl

    const implGasCost = await ethers.provider.estimateGas(await cfImpl.getDeployTransaction())
    console.log(`Expected gas cost to deploy implementation: ${implGasCost}`)
    
    if (isDeployEnabled) {
      const feeData = await ethers.provider.getFeeData()
      delete feeData.gasPrice
      const impl = await cfImpl.deploy({ ...feeData })
      await impl.waitForDeployment()
      implAddress = await impl.getAddress()
      console.log(`implAddress ${implAddress === addressExpectedOfImpl ? `matches` : `doesn't match`} addressExpectedOfImpl`)
    }
    const proxyContractName = `ERC1967Proxy`
    const cfProxy = await ethers.getContractFactory(proxyContractName) // got the artifacts locally from @openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol. The one in @openzeppelin/upgrades-core may be old.
    const fragment = cfImpl.interface.getFunction(`initialize`)
    initializerData = cfImpl.interface.encodeFunctionData(fragment, initializerArgsForImpl)
    const proxyConstructorArgs = [implAddress, initializerData]

    if (useCREATE3) {
      const { getArtifactOfFactory, getDeployedAddress, CREATE3Deploy } = rootRequire(`scripts/CREATE3-deploy-functions.js`)

      if (isDeployEnabled) {
        proxy = await CREATE3Deploy(factoryToUse.name, factoryToUse.address, cfProxy, proxyContractName, proxyConstructorArgs, salt, wallet, isDeployEnabled)
        if (proxy === undefined) {
          console.error(`proxy is undefined`)
          return
        }

        proxyAddress = proxy.target

        await upgrades.forceImport(proxy, cfImpl) // imports proxy to manifest so that it can be upgraded in future via OpenZeppelin's upgradeProxy. See https://github.com/OpenZeppelin/openzeppelin-upgrades/blob/master/packages/plugin-hardhat/src/force-import.ts
        console.log(`implementation has been connected with proxy`)
      } else { // Not actually deploying
        const artifactOfFactory = getArtifactOfFactory(factoryToUse.name)
        const instanceOfFactory = await ethers.getContractAt(artifactOfFactory.abi, factoryToUse.address)
        const proxyBytecodeWithArgs = (await cfProxy.getDeployTransaction(...proxyConstructorArgs)).data
        proxyAddress = await getDeployedAddress(factoryToUse.name, instanceOfFactory, proxyBytecodeWithArgs, wallet, salt)
      }
    } else { // not using CREATE3
      const feeData = await ethers.provider.getFeeData()
      delete feeData.gasPrice
      proxy = await cfProxy.deploy(implAddress, initializerData, { ...feeData })
      await proxy.waitForDeployment()
      proxyAddress = proxy.target
    }
  }
  console.log(`proxy address (use this to operate with your contract): ${proxyAddress}`)

  const implAddressFound = await upgrades.erc1967.getImplementationAddress(proxyAddress)
  console.log(`implementation address found in proxy: ${implAddressFound} ${implAddressFound === implAddress ? `as expected` : `which is different to ${implAddress}. Please investigate.`}`)


    // Testing the deployed contracts.
  console.log(`Testing the deployed contracts:`)
  const deployedContract = await ethers.getContractAt(implContractName, proxyAddress)
    console.log(`point: ${await deployedContract.points(wallet.address)}`)
    console.log(`Version: ${await deployedContract.getV()}`)
    

  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled) {
    if (![`hardhat`, `localhost`].includes(network.name)) {
      if (isDeployEnabled) {
        console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
        const { setTimeout } = require(`timers/promises`)
        await setTimeout(20000)
      }

      await verifyContract(proxyAddress) // also verifies implementation
    }
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

