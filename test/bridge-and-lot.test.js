const { expect } = require("chai");
const { ethers } = require("hardhat");

const BRIDGE_TAG = "0x4d494e54"; // "MINT"
const LOT_SIZE = 10_000n * 10_000n; // 10,000 * 10^4

async function deployAll() {
  const [deployer, user, attacker] = await ethers.getSigners();

  const Saturn = await ethers.getContractFactory("Saturn");
  const saturn = await Saturn.deploy();
  await saturn.waitForDeployment();

  const STRN = await ethers.getContractFactory("SaturnERC20Bridge");
  const strn = await STRN.deploy(await saturn.getAddress());
  await strn.waitForDeployment();

  const STRN10K = await ethers.getContractFactory("SaturnERC20LotToken");
  const strn10k = await STRN10K.deploy(await strn.getAddress());
  await strn10k.waitForDeployment();

  return { deployer, user, attacker, saturn, strn, strn10k };
}

describe("Saturn -> STRN -> STRN10K", function () {
  it("mints STRN on valid Saturn ERC223 transfer", async function () {
    const { deployer, user, saturn, strn } = await deployAll();
    const amount = 1_234_567n; // base units (4 decimals)

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);

    await saturn
      .connect(user)
      ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, BRIDGE_TAG);

    expect(await strn.balanceOf(user.address)).to.equal(amount);
    expect(await saturn.balanceOf(await strn.getAddress())).to.equal(amount);
  });

  it("rejects invalid tag", async function () {
    const { deployer, user, saturn, strn } = await deployAll();
    const amount = 10_000n;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);

    await expect(
      saturn
        .connect(user)
        ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, "0x12345678")
    ).to.be.reverted;
  });

  it("rejects empty data tag on SATURN transfer", async function () {
    const { deployer, user, saturn, strn } = await deployAll();
    const amount = 10_000n;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);

    await expect(
      saturn.connect(user)["transfer(address,uint256)"](await strn.getAddress(), amount)
    ).to.be.reverted;
  });

  it("rejects non-4-byte data tag length", async function () {
    const { deployer, user, saturn, strn } = await deployAll();
    const amount = 10_000n;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);

    await expect(
      saturn
        .connect(user)
        ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, "0x010203")
    ).to.be.reverted;
  });

  it("rejects direct tokenFallback calls", async function () {
    const { user, strn } = await deployAll();
    await expect(
      strn.connect(user).tokenFallback(user.address, 1, BRIDGE_TAG)
    ).to.be.revertedWith("Only Saturn");
  });

  it("redeems STRN back to SATURN", async function () {
    const { deployer, user, saturn, strn } = await deployAll();
    const amount = 250_000n;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);
    await saturn
      .connect(user)
      ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, BRIDGE_TAG);

    await expect(strn.connect(user).redeem(amount)).to.emit(strn, "Redeemed");

    expect(await strn.balanceOf(user.address)).to.equal(0n);
    expect(await saturn.balanceOf(user.address)).to.equal(amount);
  });

  it("rejects redeeming more STRN than balance", async function () {
    const { user, strn } = await deployAll();
    await expect(strn.connect(user).redeem(1)).to.be.reverted;
  });

  it("rejects zero redeem amount", async function () {
    const { user, strn } = await deployAll();
    await expect(strn.connect(user).redeem(0)).to.be.revertedWith("Amount=0");
  });

  it("mints and redeems STRN10K lots", async function () {
    const { deployer, user, saturn, strn, strn10k } = await deployAll();
    const amount = LOT_SIZE * 2n;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);
    await saturn
      .connect(user)
      ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, BRIDGE_TAG);

    await strn.connect(user).approve(await strn10k.getAddress(), amount);
    await expect(strn10k.connect(user).deposit(amount)).to.emit(strn10k, "Deposited");

    expect(await strn10k.balanceOf(user.address)).to.equal(2n);
    expect(await strn.balanceOf(user.address)).to.equal(0n);

    await expect(strn10k.connect(user).redeem(1)).to.emit(strn10k, "Redeemed");
    expect(await strn.balanceOf(user.address)).to.equal(LOT_SIZE);
  });

  it("rejects non-lot STRN10K deposits", async function () {
    const { deployer, user, saturn, strn, strn10k } = await deployAll();
    const amount = LOT_SIZE;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);
    await saturn
      .connect(user)
      ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, BRIDGE_TAG);

    await strn.connect(user).approve(await strn10k.getAddress(), amount);

    await expect(strn10k.connect(user).deposit(amount - 1n)).to.be.revertedWith(
      "Not multiple of lot"
    );
  });

  it("rejects STRN10K deposit without approval", async function () {
    const { deployer, user, saturn, strn, strn10k } = await deployAll();
    const amount = LOT_SIZE;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);
    await saturn
      .connect(user)
      ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, BRIDGE_TAG);

    await expect(strn10k.connect(user).deposit(amount)).to.be.reverted;
  });

  it("rejects STRN10K redeem with zero lots", async function () {
    const { user, strn10k } = await deployAll();
    await expect(strn10k.connect(user).redeem(0)).to.be.revertedWith("Lots=0");
  });

  it("reverts direct SATURN transfers to STRN10K", async function () {
    const { deployer, user, saturn, strn10k } = await deployAll();
    const amount = 1_000n;

    await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);

    await expect(
      saturn.connect(user)["transfer(address,uint256)"](await strn10k.getAddress(), amount)
    ).to.be.reverted;
  });

  it("adversarial random round-trips preserve balances", async function () {
    const { deployer, user, saturn, strn, strn10k } = await deployAll();

    for (let i = 0; i < 25; i++) {
      const lots = BigInt(1 + Math.floor(Math.random() * 5));
      const amount = lots * LOT_SIZE;

      const saturnBefore = await saturn.balanceOf(user.address);

      await saturn.connect(deployer)["transfer(address,uint256)"](user.address, amount);
      await saturn
        .connect(user)
        ["transfer(address,uint256,bytes)"](await strn.getAddress(), amount, BRIDGE_TAG);

      await strn.connect(user).approve(await strn10k.getAddress(), amount);
      await strn10k.connect(user).deposit(amount);
      await strn10k.connect(user).redeem(Number(lots));

      await strn.connect(user).redeem(amount);

      const saturnAfter = await saturn.balanceOf(user.address);
      expect(saturnAfter).to.equal(saturnBefore + amount);
      expect(await strn.balanceOf(user.address)).to.equal(0n);
      expect(await strn10k.balanceOf(user.address)).to.equal(0n);
    }
  });
});
