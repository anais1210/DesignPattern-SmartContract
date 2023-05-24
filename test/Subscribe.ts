import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";

describe("Subscription contract", async function () {
  const subscriptionCost = 1;
  const subscriptionDuration = 30;
  // Current date: September 29, 2022
  //   const date = new Date();
  //   date.setDate(date.getDate() - subscriptionDuration);

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
  //   const { sub, token, owner, otherAccount } = await loadFixture(deployFixture);

  it("Should deploy Subscribe", async function () {
    const { sub, owner } = await loadFixture(deployFixture);
    const ADMIN_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("ADMIN_ROLE")
    );
    const admin = await sub.hasRole(ADMIN_ROLE, owner.address);
    expect(admin).to.equal(true);
  });

  it("Should deploy MyToken", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    const balance: any = await token.balanceOf(owner.address);
    expect(balance / 10 ** 18).to.equal(10000);
  });
  it("Should transfer tokens to accounts", async function () {
    const { token, owner, otherAccount } = await loadFixture(deployFixture);
    // Transfer 10 tokens from owner to otherAccount
    await expect(
      token.transfer(otherAccount.address, 10)
    ).to.changeTokenBalances(token, [owner, otherAccount], [-10, 10]);
    const balance: any = await token.balanceOf(otherAccount.address);

    await expect(balance).to.equal(10);
  });
  it("Should register new subscriber", async function () {
    const { sub, token, owner, otherAccount } = await loadFixture(
      deployFixture
    );

    const initialEndDate = await sub.subscriptionEndDates(otherAccount.address);
    const initialUserBalance = await token.balanceOf(otherAccount.address);
    await console.log(Number(initialUserBalance));

    // await expect(token.transfer(sub.address, 1)).to.changeTokenBalances(
    //   token,
    //   [otherAccount, sub.address],
    //   [Number(initialUserBalance) - 1, 1]
    // );

    await expect(token.transfer(sub.address, 1));
    await token.approve(sub.address, 1);

    const contractBalance = await token.balanceOf(sub.address);
    await expect(Number(contractBalance)).to.equal(1);

    await sub.register();
    // const endDate = await sub.subscriptionEndDates(otherAccount.address);
    // const date = new Date();
    // date.setDate(date.getDate() - subscriptionDuration);
    // const newEndDate = await sub.subscriptionEndDates(otherAccount.address);
    // const newUserBalance = await token.balanceOf(otherAccount.address);
    // await console.log(endDate.toNumber(), date);
    // expect(endDate).to.equal(date);
    // expect(newUserBalance).to.equal(initialUserBalance - 1);
    const SUBSCRIBER_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("SUBSCRIBER_ROLE")
    );

    const isSubscriber = await sub.hasRole(
      SUBSCRIBER_ROLE,
      otherAccount.address
    );
    await console.log(isSubscriber);
    // expect(isSubscriber).to.be.true;
  });
  it("Should withdraw", async function () {
    const { sub, token, owner, otherAccount } = await loadFixture(
      deployFixture
    );
    const ADMIN_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("ADMIN_ROLE")
    );
    const admin = await sub.hasRole(ADMIN_ROLE, owner.address);
    expect(admin).to.equal(true);
    const contractBalance = await token.balanceOf(sub.address);
    const initialBalance = await token.balanceOf(owner.address);
    await expect(
      token.transfer(owner.address, contractBalance)
    ).to.changeTokenBalances(
      token,
      [sub.address, owner.address],
      [0, contractBalance]
    );
  });
  it("Should revoke", async function () {
    const { sub, otherAccount } = await loadFixture(deployFixture);
    await expect(sub.hasRole("SUBSCRIBER_ROLE", otherAccount.address));
    await sub.revoke(otherAccount.address);
    await expect(sub.hasRole("", otherAccount.address));
  });
});
