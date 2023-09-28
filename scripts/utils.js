const rootRequire = name => {
  const path = require(`path`)
  const rootPath = path.resolve(__dirname, `..`)
  return require(`${rootPath}/${name}`)
}

const deriveAddressOfSignerFromSig = async (txData, splitSig) => {
  const txWithResolvedProperties = await ethers.resolveProperties(txData)
  const txUnsignedSerialized = ethers.Transaction.from(txWithResolvedProperties).unsignedSerialized // returns RLP encoded tx
  const txUnsignedSerializedHashed = ethers.keccak256(txUnsignedSerialized) // as specified by ECDSA
  const txUnsignedSerializedHashedBytes = ethers.getBytes(txUnsignedSerializedHashed) // create binary hash
  const signatureSerialized = ethers.Signature.from(splitSig).serialized
  const recoveredAddressOfSigner = ethers.recoverAddress(txUnsignedSerializedHashedBytes, signatureSerialized)
  return recoveredAddressOfSigner
}

const getContractAbi = async (contractAddress) => {
  const axios = require(`axios`)
  const httpResponse = await axios.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`)
  // const httpResponse = await axios.get(`https://api-alfajores.celoscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.CELOSCAN_API_KEY}`)
  // const httpResponse = await axios.get(`https://testnet.snowtrace.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.SNOWTRACE_API_KEY}`)
  // console.log(`httpResponse.data: ${JSON.stringify(httpResponse.data, null, 2)}`)
  return httpResponse.data.result
}

const verifyContract = async (address, constructorArguments) => {
  console.log(`Verifying contract...`)
  try {
    await run(`verify:verify`, {
      address,
      constructorArguments,
    })

    console.log(`Contract verified!`)
  } catch (err) {
    console.error(err)
  }
}

const printNativeCurrencyBalance = async (walletAddress, decimals = `ether`) => ethers.formatUnits(await ethers.provider.getBalance(walletAddress), decimals)


const printContractBalanceOf = async (tokenContract, holderAddress, decimals = `ether`) => ethers.formatUnits(await tokenContract.balanceOf(holderAddress), decimals)


const getCreate3Address = async (addressOfFactory, callerAddress, salt) => {
  const { evmVersion } = hre.config.solidity.compilers[0].settings

  const bytecodeOfCreateFactory = evmVersion === `shanghai` ? `0x601180600a5f395ff3fe365f6020373660205ff05f526014600cf3` : `0x601480600c6000396000f3fe3660006020373660206000f06000526014600cf3` // This needs to be updated if CREATEFactory object in contracts/SKYBITCREATE3FactoryLite.yul is changed

  const keccak256Calculated = ethers.solidityPackedKeccak256([`address`, `bytes32`], [callerAddress, salt]) // same as ethers.keccak256(callerAddress + salt.slice(2)) //. Inputs must not be 0-padded.

  const addressOfCreateFactory = ethers.getCreate2Address(addressOfFactory, keccak256Calculated, ethers.keccak256(bytecodeOfCreateFactory))

  return ethers.getCreateAddress({ 
    from: addressOfCreateFactory,
    nonce: 1 // nonce starts at 1 in contracts. Don't use getTransactionCount to get nonce because if a deployment is repeated with same inputs getCreate2Address would fail before it gets here.
  })  
}


module.exports = {
  rootRequire,
  deriveAddressOfSignerFromSig,
  getContractAbi,
  verifyContract,
  printNativeCurrencyBalance,
  printContractBalanceOf,
  getCreate3Address,
}
