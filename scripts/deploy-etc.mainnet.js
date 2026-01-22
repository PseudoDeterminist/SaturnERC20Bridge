const hre = require("hardhat");

async function main() {
  if (process.env.CONFIRM_MAINNET !== "true") {
    throw new Error("Set CONFIRM_MAINNET=true to run mainnet deploy");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const saturnAddress = process.env.SATURN_ADDRESS;
  if (!saturnAddress) {
    throw new Error("SATURN_ADDRESS is required in .env");
  }
  console.log("Saturn (existing):", saturnAddress);

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
