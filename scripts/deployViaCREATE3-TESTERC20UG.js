// implementation deployed normally, proxy deployed via CREATE3
const { ethers, network, upgrades } = require(`hardhat`)

// CHOOSE WHICH FACTORY YOU WANT TO USE:
// const factoryToUse = { name: `axelarnetwork`, address: `0x95A9323CF0443758df5F3becf3B221cB3D42f3A0` } // gas cost: 2413077 + 498930
// const factoryToUse = { name: `ZeframLou`, address: `0x2befaF9234EE4d5b10dDAECF55F73dA87F74Facb` } // gas cost: 2413077 + 422294
// const factoryToUse = { name: `SKYBITSolady`, address: `0xF545230eE44735CCDb71325c6D4bC981b444CBb6` } // gas cost: 2413077 + 418479
const factoryToUse = { name: `SKYBITLite`, address: `0x739201bA340A675624D9ADb1cc27e68F76a29765` } // gas cost: 2413077 + 419071

const isDeployEnabled = true // toggle in case you do deployment and verification separately.

const isVerifyEnabled = true

const useOZDeployProxy = false // openzeppelin's deployment script for upgradeable contracts (the usual way without CREATE3). Doesn't work in local Axelar environment

const useCREATE3 = true
const saltForCREATE3 = ethers.encodeBytes32String(`SKYBIT.ASIA TESTERC20UG........`) // 31 characters that you choose


async function main() {
  const { rootRequire, printNativeCurrencyBalance, verifyContract } = require(`../utils`)

  const [wallet, wallet2] = await ethers.getSigners()
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${await printNativeCurrencyBalance(wallet.address)} of native currency, RPC url: ${network.config.url}`)

  const implContractName = `TESTERC20UGv1`
  const initializerArgsForImpl = [ // constructor not used in UUPS contracts. Instead, proxy will call initializer in implementation contract instance
    wallet.address,
    { x: 10, y: 5 },
  ]

  const cfImpl = await ethers.getContractFactory(implContractName)

  let proxy, proxyAddress
  if (useOZDeployProxy) { // Using openzeppelin's script (e.g. to test that the usual way (without CREATE3) of deploying upgradeable contracts works)
    if (isDeployEnabled) {
      proxy = await upgrades.deployProxy(cfImpl, initializerArgsForImpl, { kind: `uups`, timeout: 0 })
      await proxy.waitForDeployment()

      proxyAddress = proxy.target
    }
  } else { // not using openzeppelin's script
    let implAddress, initializerData
    let isDeployed = false

    // Derive address of proxy and check whether contract had already been deployed to there
    const proxyContractName = `ERC1967Proxy`
    const cfProxy = await ethers.getContractFactory(proxyContractName) // got the artifacts locally from @openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol. The one in @openzeppelin/upgrades-core may be old.
    const fragment = cfImpl.interface.getFunction(`initialize`)
    initializerData = cfImpl.interface.encodeFunctionData(fragment, initializerArgsForImpl)
    let proxyConstructorArgs = [ethers.ZeroAddress, initializerData] // actual implAddress not needed to get proxy address

    let proxyAddressExpected
    if (useCREATE3) {
      const { getArtifactOfFactory, getDeployedAddress } = rootRequire(`scripts/CREATE3-deploy-functions.js`)
      const artifactOfFactory = getArtifactOfFactory(factoryToUse.name)
      const instanceOfFactory = await ethers.getContractAt(artifactOfFactory.abi, factoryToUse.address)
      const proxyBytecodeWithArgs = (await cfProxy.getDeployTransaction(...proxyConstructorArgs)).data
      proxyAddressExpected = await getDeployedAddress(factoryToUse.name, instanceOfFactory, proxyBytecodeWithArgs, wallet, saltForCREATE3)
      console.log(`Expected address of proxyAddress: ${proxyAddressExpected}`)
    } else {
      const nonce = await wallet.getNonce() + 1 // skip 1 as that'll be for implementation
      proxyAddressExpected = ethers.getCreateAddress({ from: wallet.address, nonce })
      console.log(`Expected address of proxy using nonce ${nonce}: ${proxyAddressExpected}`)
    }

    if (await ethers.provider.getCode(proxyAddressExpected) !== `0x`) {
      console.log(`The contract already exists at ${proxyAddressExpected}. Change the salt if you want to deploy your contract to a different address.`)
      proxy = cfProxy.attach(proxyAddressExpected)

      const implAddressFound = await upgrades.erc1967.getImplementationAddress(proxyAddressExpected)
      console.log(`implementation address found in proxy: ${implAddressFound}`)

      if (await ethers.provider.getCode(implAddressFound) !== `0x`) {
        console.log(`implementation has already been deployed to: ${implAddressFound}`)
        isDeployed = true
      }
    }

    if (!isDeployed) { // Deploy implementation
      const nonce = await wallet.getNonce()
      const implAddressExpected = ethers.getCreateAddress({ from: wallet.address, nonce })
      console.log(`Expected address of implementation using nonce ${nonce}: ${implAddressExpected}`)

      const implGasCost = await ethers.provider.estimateGas(await cfImpl.getDeployTransaction())
      console.log(`Expected gas cost to deploy implementation: ${implGasCost}`)

      if (isDeployEnabled) {
        const feeData = await ethers.provider.getFeeData()
        delete feeData.gasPrice
        const impl = await cfImpl.deploy({ ...feeData })
        await impl.waitForDeployment()
        implAddress = await impl.getAddress()
      } else implAddress = implAddressExpected

      console.log(`implAddress: ${implAddress}`)
    }

    if (isDeployEnabled) {
      proxyConstructorArgs = [implAddress, initializerData] // update to set actual value of implAddress

      if (useCREATE3) {
        if (!isDeployed) { // Deploy proxy
          const { CREATE3Deploy } = rootRequire(`scripts/CREATE3-deploy-functions.js`)
          proxy = await CREATE3Deploy(factoryToUse.name, factoryToUse.address, cfProxy, proxyContractName, proxyConstructorArgs, saltForCREATE3, wallet, isDeployEnabled) // Gas cost: 425068

          if (proxy === undefined) {
            console.error(`proxy is undefined`)
            return
          }
        }
      } else { // not using CREATE3
        if (!isDeployed) { // Deploy proxy
          const feeData = await ethers.provider.getFeeData()
          delete feeData.gasPrice
          proxy = await cfProxy.deploy(...proxyConstructorArgs, { ...feeData })
          await proxy.waitForDeployment()
        }
      } // if (useCREATE3)

      if (isDeployEnabled) {
        await upgrades.forceImport(proxy, cfImpl) // import proxy to manifest so that it can be upgraded in future via OpenZeppelin's upgradeProxy. See https://github.com/OpenZeppelin/openzeppelin-upgrades/blob/master/packages/plugin-hardhat/src/force-import.ts
        console.log(`implementation has been connected with proxy`)

        proxyAddress = proxy.target
        console.log(`proxy address (use this to operate with your contract): ${proxyAddress}`)

        const implAddressFound = await upgrades.erc1967.getImplementationAddress(proxyAddress)
        console.log(`implementation address found in proxy: ${implAddressFound} ${implAddressFound === implAddress ? `as expected` : ``}`)
      }
    } else proxyAddress = proxyAddressExpected
  } // if (useOZDeployProxy)


  // Testing the deployed contracts.
  console.log(`Testing the deployed contracts:`)
  const contractInstance = await ethers.getContractAt(implContractName, proxyAddress)
  console.log(`point: ${await contractInstance.points(wallet.address)}`)
  console.log(`Version: ${await contractInstance.getV()}`)


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

