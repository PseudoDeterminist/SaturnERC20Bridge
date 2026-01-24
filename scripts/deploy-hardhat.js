const hre = require("hardhat");

async function main() {
  if (hre.network.name !== "hardhat") {
    throw new Error("deploy-hardhat.js is restricted to the hardhat network");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  let saturnAddress = process.env.SATURN_ADDRESS;
  if (!saturnAddress) {
    const Saturn = await hre.ethers.getContractFactory("Saturn");
    const saturn = await Saturn.deploy();
    await saturn.waitForDeployment();
    saturnAddress = await saturn.getAddress();
    console.log("Saturn (local):", saturnAddress);
  } else {
    console.log("Saturn (existing):", saturnAddress);
  }

  const STRN = await hre.ethers.getContractFactory("SaturnERC20Bridge");
  const strn = await STRN.deploy(saturnAddress);
  await strn.waitForDeployment();
  const strnAddress = await strn.getAddress();
  console.log("STRN:", strnAddress);

  const STRN10K = await hre.ethers.getContractFactory("SaturnERC20LotToken");
  const strn10k = await STRN10K.deploy(strnAddress);
  await strn10k.waitForDeployment();
  const strn10kAddress = await strn10k.getAddress();
  console.log("STRN10K:", strn10kAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});