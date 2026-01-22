const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function verifyContract(address, constructorArguments) {
  await hre.run("verify:verify", {
    address,
    constructorArguments,
  });
}

async function main() {
  if (process.env.CONFIRM_MAINNET !== "true") {
    throw new Error("Set CONFIRM_MAINNET=true to run mainnet verification");
  }

  const deploymentsPath = path.join(__dirname, "..", "deployments", "etc-mainnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const saturnAddress = deployments.saturn.address;
  const strnAddress = deployments.strn.address;
  const strn10kAddress = deployments.strn10k.address;

  if (!saturnAddress || !strnAddress || !strn10kAddress) {
    throw new Error("Missing addresses in deployments/etc-mainnet.json");
  }

  console.log("Verifying STRN:", strnAddress);
  await verifyContract(strnAddress, [saturnAddress]);

  console.log("Verifying STRN10K:", strn10kAddress);
  await verifyContract(strn10kAddress, [strnAddress]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
