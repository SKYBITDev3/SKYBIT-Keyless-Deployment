let isDeployEnabled = true // set to false initially to get gas cost or if you've already deployed and need to do verification on explorer.
const isVerifyEnabled = true

async function main() {
  const [wallet] = await ethers.getSigners()
  const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${ethers.formatUnits(balanceOfWallet, "ether")} of native currency, RPC url: ${network.config.url}`)

  // WRITE YOUR CONTRACT NAME AND CONSTRUCTOR ARGUMENTS HERE
  const contractName = "TESTERC20"
  const wallet2Address = "0xEB2e452fC167b5bb948c6FC2c9215ce7F4064692" // just for testing deployed token
  const constructorArgs = [
    "Token 4628",
    "TOKEN4628",
    1000,
    [wallet.address, wallet2Address], // test array constructor argument
    { x: 10, y: 5 }, // test struct constructor argument
    "0xabcdef", // test byte constructor argument. bytes have to be 0x-prefixed
  ]

  const artifactOfContractToDeploy = getArtifactOfContract(contractName)

  const cfToken = await ethers.getContractFactory(artifactOfContractToDeploy.abi, artifactOfContractToDeploy.bytecode)

  const bytecodeWithArgs = (await cfToken.getDeployTransaction(...constructorArgs)).data
  // console.log(`bytecodeWithArgs: ${bytecodeWithArgs}`)

  const gasPrice = 100000000000n // = 100 Gwei. Made high for future-proofing. DON'T CHANGE IT AFTER DEPLOYING YOUR FIRST CONTRACT TO LIVE BLOCKCHAIN.
  const gasCost = await ethers.provider.estimateGas({ data: bytecodeWithArgs })
  console.log(`Expected gas cost: ${gasCost}`)
  // const gasFeeEstimate = BigInt(gasPrice) * gasCost
  // console.log(`gasFeeEstimate: ${ethers.formatUnits(gasFeeEstimate, "ether")} of native currency`)

  // ENTER A ROUNDED-UP GAS LIMIT VALUE FOR FUTURE-PROOFING. Try to make it > 25% * gasCost. DON'T CHANGE IT AFTER DEPLOYING YOUR FIRST CONTRACT TO LIVE BLOCKCHAIN.
  const gasLimit = 2500000n
  const gasLimitPercentageAboveCost = Number(gasLimit * 100n / gasCost) - 100
  console.log(`gasLimit: ${gasLimit} (${gasLimitPercentageAboveCost}% above expected cost)`)
  if (gasLimitPercentageAboveCost < 10) {
    console.log(`gasLimit may be too low to accommodate for possibly increasing future opcode cost. Once you choose a gasLimit, you'll need to use the same value for deployments on other blockchains any time in the future in order for your contract to have the same address.`)
    return
  }

  // Keep this data consistent otherwise the deployment address will become different
  const txData = {
    type: 0,
    data: bytecodeWithArgs,
    nonce: 0,
    gasLimit,
    gasPrice,
    value: 0,
    chainId: 0,
  }

  // Keep this data consistent otherwise the deployment address will become different
  const splitSig = { // manually created
    r: "0x3333333333333333333333333333333333333333333333333333333333333333",
    s: "0x3333333333333333333333333333333333333333333333333333333333333333",
    v: 27
  }

  const { deriveAddressOfSignerFromSig } = require("./utils")
  const derivedAddressOfSigner = await deriveAddressOfSignerFromSig(txData, splitSig)
  console.log(`Derived address of transaction signer: ${derivedAddressOfSigner}`)

  txData.signature = splitSig
  const txSignedSerialized = ethers.Transaction.from(txData).serialized
  // console.log(`Signed raw transaction to be pushed to ${hre.network.name}: ${txSignedSerialized}`)

  // const tx = ethers.Transaction.from(txSignedSerialized) // checking the contents of signed transaction
  // console.log(`Signed transaction: ${JSON.stringify(tx, null, 2)}`)

  const addressExpected = ethers.getCreateAddress({ from: derivedAddressOfSigner, nonce: txData.nonce })
  console.log(`Expected address of deployed ${contractName} contract: ${addressExpected}`)

  if (await ethers.provider.getCode(addressExpected) !== "0x") {
    console.log(`The contract already exists at ${addressExpected}.`)
    return
  }

  const txSignedSerializedHash = ethers.keccak256(txSignedSerialized)
  console.log(`Expected transaction ID: ${txSignedSerializedHash}`)


  // FUND SIGNER - There needs to be some funds at derivedAddressOfSigner to pay gas fee for the deployment.
  const isTransactionSignerFunded = await fundTransactionSigner(txData.gasPrice, txData.gasLimit, derivedAddressOfSigner, wallet, isDeployEnabled)
  if (!isTransactionSignerFunded) isDeployEnabled = false


  // THE DEPLOYMENT TRANSACTION
  if (isDeployEnabled) {
    console.log(`Deploying ${contractName} contract by broadcasting signed raw transaction to ${network.name}...`)
    const transactionId = await ethers.provider.send("eth_sendRawTransaction", [txSignedSerialized])
    console.log(`${contractName} contract was successfully deployed to ${addressExpected} in transaction ${transactionId}`)
  }


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled && !["hardhat", "localhost"].includes(network.name)) {
    if (isDeployEnabled) {
      console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
      const { setTimeout } = require("timers/promises")
      await setTimeout(20000)
    }
    const { verifyContract } = require("./utils")
    await verifyContract(addressOfCreate3Factory, [])
  } else console.log(`Verification on local network isn't possible`)
}


const getArtifactOfContract = contractName => {
  const { existsSync, cpSync } = require("fs")

  const savedArtifactFilePath = `artifacts-saved/contracts/${contractName}.sol/${contractName}.json`
  const savedArtifactExists = existsSync(savedArtifactFilePath)
  
  let useSavedArtifact = true
  if (savedArtifactExists) {
    const readlineSync = require("readline-sync")
    useSavedArtifact = !["n", "N"].includes(readlineSync.question(`${contractName} artifact found in artifacts-saved. Reuse it (y/n)? `))
    if (!useSavedArtifact) useSavedArtifact = !["y", "Y"].includes(readlineSync.question(`The saved ${contractName} artifact will be overwritten, causing your contract to be possibly deployed to a different address. Are you sure (y/n)? `))
    if (useSavedArtifact) console.log(`Using ${contractName} artifact that was found in artifacts-saved.`)
  }
  
  if (!savedArtifactExists || !useSavedArtifact) {
    console.log(`Storing new ${contractName} artifact into artifacts-saved.`)
    cpSync(savedArtifactFilePath.replace("artifacts-saved", "artifacts"), savedArtifactFilePath, { recursive: true })
  }

  const { rootRequire } = require("./utils")
  return rootRequire(savedArtifactFilePath)
}


const fundTransactionSigner = async (gasPrice, gasLimit, derivedAddressOfSigner, wallet, isDeployEnabled) => {
  const balanceOfSignerMinRequired = gasPrice * gasLimit
  console.log(`Minimum balance of signer required based on the gasPrice and gasLimit: ${gasPrice} x ${gasLimit} wei = ${ethers.formatUnits(balanceOfSignerMinRequired, "ether")} of native currency`)
  let balanceOfSigner = await ethers.provider.getBalance(derivedAddressOfSigner)
  console.log(`balanceOfSigner: ${ethers.formatUnits(balanceOfSigner, "ether")}`)

  const shortfall = balanceOfSignerMinRequired - balanceOfSigner
  if (balanceOfSigner < balanceOfSignerMinRequired) {
    const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
    if (balanceOfWallet > balanceOfSignerMinRequired) {
      console.log(`There are insufficient funds at ${derivedAddressOfSigner} on ${network.name} to broadcast the transaction.`)

      if (isDeployEnabled) {
        const readlineSync = require("readline-sync")
        const anwser = readlineSync.question(`Do you want to try to transfer ${ethers.formatUnits(shortfall, "ether")} of native currency from your wallet ${wallet.address} to there now (y/n)? `)
        if (["y", "Y"].includes(anwser)) {
          console.log(`Transferring ${ethers.formatUnits(shortfall, "ether")} of native currency from ${wallet.address} to ${derivedAddressOfSigner} on ${network.name}...`)
          let txRec = await wallet.sendTransaction({ to: derivedAddressOfSigner, value: shortfall })
          await txRec.wait(1)
          balanceOfSigner = await ethers.provider.getBalance(derivedAddressOfSigner)
          console.log(`${derivedAddressOfSigner} now has ${ethers.formatUnits(balanceOfSigner, "ether")} of native currency`)
          return true
        }
      }
    }
    console.log(`You'll need to transfer at least ${ethers.formatUnits(shortfall, "ether")} of native currency to there.`)
    return false
  }
  return true
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
