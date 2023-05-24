import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Subscription contract", function () {
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    // Token Contract
    const Token = await ethers.getContractFactory("MyToken");
    const token = await Token.deploy();

    //Subscription Contract
    const Sub = await ethers.getContractFactory("Subscribe");
    const sub = await upgrades.deployProxy(Sub, [token.address], {
      initializer: "initialize",
    });
    await sub.deployed();

    return { sub, token, owner, otherAccount };
  }
  it("should deploy subscribe", async function () {
    const { sub, owner } = await loadFixture(deployFixture);
    const ADMIN_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("ADMIN_ROLE")
    );
    const admin = await sub.hasRole(ADMIN_ROLE, owner.address);
    expect(admin).to.equal(true);
  });

  it("should deploy mytoken", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    const balance: any = await token.balanceOf(owner.address);
    expect(balance / 10 ** 18).to.equal(10000);
  });
  it("Should transfer tokens to accounts", async function () {
    const { token, owner, otherAccount } = await loadFixture(deployFixture);
    // Transfer 10 tokens from owner to otherAccount
    // console.log(token.balanceOf(owner.address));
    await expect(
      token.transfer(otherAccount.address, 10)
    ).to.changeTokenBalances(token, [owner, otherAccount], [-10, 10]);
  });
});
