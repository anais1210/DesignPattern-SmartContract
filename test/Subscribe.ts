import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Subscription contract", function () {
  async function deployToken() {
    const Token = await ethers.getContractFactory("MyToken");
    const token = await upgrades.deployProxy(Token);
    await token.deployed();
    return token;
  }
  async function deployMTNFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();
    const admin = "0xBeFcc312CF77F7379B30aD939471DFCacB6e5EfE";
    const Sub = await ethers.getContractFactory("Subscription");
    const sub = await upgrades.deployProxy(Sub, { initializer: "initialize" });
    await sub.deployed();
    return { sub, owner, otherAccount };
  }

  it("should be deployed subscribe", async function () {
    const { sub, owner } = await loadFixture(deployMTNFixture);
    const admin = await sub.owner();
    expect(admin).to.equal(owner.address);
  });

  it("should deploy mytoken", async function () {
    const token = await deployToken();
    const balance = await expect(admin).to.equal(owner.address);
  });
});
