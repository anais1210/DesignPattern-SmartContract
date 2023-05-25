import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Subscription contract", async function () {
  const duration = 1;
  const price = 1;

  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    // Token Contract
    const Token = await ethers.getContractFactory("MyToken");
    const token = await Token.deploy();

    //Subscription Contract
    const Sub = await ethers.getContractFactory("Subscribe");
    const sub = await upgrades.deployProxy(
      Sub,
      [token.address, duration, price],
      {
        initializer: "initialize",
      }
    );
    await sub.deployed();
    return { sub, token, owner, otherAccount };
  }

  //Checking deployments
  it("Should deploy Subscribe", async function () {
    const { sub, owner } = await loadFixture(deployFixture);
    // convertir string à un byte
    const ADMIN_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("ADMIN_ROLE")
    );
    // attribution du rôle admin
    const admin = await sub.hasRole(ADMIN_ROLE, owner.address);
    expect(admin).to.equal(true);
  });

  it("Should deploy MyToken", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    const balance: any = await token.balanceOf(owner.address);
    // deploiement avec le bon nombre de tokens 10000
    expect(balance / 10 ** 18).to.equal(10000);
  });

  //Checking token transfer
  it("Should transfer tokens to accounts", async function () {
    const { token, owner, otherAccount } = await loadFixture(deployFixture);
    // Transfer 10 tokens from owner to otherAccount
    await expect(
      token.transfer(otherAccount.address, 10)
    ).to.changeTokenBalances(token, [owner, otherAccount], [-10, 10]);
  });

  it("Should revert transfer tokens if no balance", async function () {
    const { token, owner, otherAccount } = await loadFixture(deployFixture);
    // Transfer 10 tokens from otherAccount to owner
    await expect(
      token.connect(otherAccount).transfer(owner.address, 10)
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  //Checking register method
  it("Should register new subscriber", async function () {
    const { sub, token, otherAccount } = await loadFixture(deployFixture);

    //transferer token à otherAccount pour qu'il puisse payé avec notre token
    await token.transfer(otherAccount.address, 10000000);
    await token.connect(otherAccount).approve(sub.address, 10000000);

    await sub.connect(otherAccount).register();
    // Convertir le string en byte
    const SUBSCRIBER_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("SUBSCRIBER_ROLE")
    );
    // Attribution du rôle de "SUBSCRIBER" une fois le transfer approved
    const isSubscribed = await sub.hasRole(
      SUBSCRIBER_ROLE,
      otherAccount.address
    );
    // Vérifie si il est bien abonné
    expect(isSubscribed).to.equal(true);
  });

  it("Should revert when a subscriber tries to register again", async function () {
    const { sub, token, otherAccount } = await loadFixture(deployFixture);
    await token.transfer(otherAccount.address, 10000000);
    await token.connect(otherAccount).approve(sub.address, 10000000);

    await sub.connect(otherAccount).register();

    await expect(sub.connect(otherAccount).register()).to.be.revertedWith(
      "User is already subscribed"
    );
  });

  it("Should revert when insufficient balance", async function () {
    const { sub, otherAccount } = await loadFixture(deployFixture);

    await expect(sub.connect(otherAccount).register()).to.be.revertedWith(
      "Not enough tokens"
    );
  });

  //Checking renew method
  it("Should renew subscriber", async function () {
    const { sub, token, otherAccount } = await loadFixture(deployFixture);

    await token.transfer(otherAccount.address, 10000000);
    await token.connect(otherAccount).approve(sub.address, 10000000);

    await sub.connect(otherAccount).register();
    // récupère sa date de fin avant le renouvellement
    const endDateBefore = await sub.getSubscriptionEndDates(
      otherAccount.address
    );
    // renouvelle son abonnement
    await sub.connect(otherAccount).renew();

    // définis sa date de fin d'abonnement après le renouvellement
    const endDateAfter = await sub.getSubscriptionEndDates(
      otherAccount.address
    );
    // Because 30 days = 2592000 seconds
    expect(Number(endDateAfter)).to.be.equal(Number(endDateBefore) + 2592000);
  });

  it("Should revert when not subscriber tries to renew", async function () {
    const { sub, otherAccount } = await loadFixture(deployFixture);

    await expect(sub.connect(otherAccount).renew()).to.be.revertedWith(
      "Restricted to subscribers"
    );
  });

  it("Should revert when subscriber has insufficient balance to renew", async function () {
    const { sub, token, otherAccount } = await loadFixture(deployFixture);

    await token.transfer(otherAccount.address, 1);
    await token.connect(otherAccount).approve(sub.address, 1);

    await sub.connect(otherAccount).register();

    await expect(sub.connect(otherAccount).renew()).to.be.revertedWith(
      "Not enough tokens"
    );
  });

  //Checking withdraw method
  it("Should withdraw", async function () {
    const { sub, token, owner } = await loadFixture(deployFixture);
    const contractBalance = await token.balanceOf(sub.address);
    // transfer contract --> owner et
    // vérification des balances du owner et du contract après le transfer
    await expect(
      token.transfer(owner.address, contractBalance)
    ).to.changeTokenBalances(
      token,
      [sub.address, owner.address],
      [0, contractBalance]
    );
  });

  it("Should revert when non-admin tries to withdraw", async function () {
    const { sub, otherAccount } = await loadFixture(deployFixture);

    await expect(sub.connect(otherAccount).withdraw()).to.be.revertedWith(
      "Restricted to admins"
    );
  });

  //Checking access method
  // Vérifie le statue de SUBSCRIBER de l'utilisateur
  it("Should give access to subscriber", async function () {
    const { sub, token, otherAccount } = await loadFixture(deployFixture);

    await token.transfer(otherAccount.address, 10000000);
    await token.connect(otherAccount).approve(sub.address, 10000000);

    // Register pour avoir le rôle de SUBSCRIBER
    await sub.connect(otherAccount).register();

    // vérifie la string qui est définis dans le smart contract
    const reward = await sub.connect(otherAccount).access();
    expect(reward).to.be.equal("An amazing string!");
  });

  it("Should revert access to non-subscriber", async function () {
    const { sub, otherAccount } = await loadFixture(deployFixture);

    await expect(sub.connect(otherAccount).access()).to.be.revertedWith(
      "Restricted to subscribers"
    );
  });

  //Checking revoke method
  it("Should revoke subscriber", async function () {
    const { sub, token, otherAccount } = await loadFixture(deployFixture);

    await token.transfer(otherAccount.address, 10000000);
    await token.connect(otherAccount).approve(sub.address, 10000000);

    await sub.connect(otherAccount).register();
    await sub.revoke(otherAccount.address);

    const SUBSCRIBER_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("SUBSCRIBER_ROLE")
    );
    const isSubscribed = await sub.hasRole(
      SUBSCRIBER_ROLE,
      otherAccount.address
    );
    // vérifie que l'utilisateur n'est plus abonné => n'a plus le rôle
    expect(isSubscribed).to.equal(false);
  });

  it("Should not revoke if not admin", async function () {
    const { sub, token, otherAccount } = await loadFixture(deployFixture);

    await token.transfer(otherAccount.address, 10000000);
    await token.connect(otherAccount).approve(sub.address, 10000000);

    await sub.connect(otherAccount).register();
    await expect(
      sub.connect(otherAccount).revoke(otherAccount.address)
    ).to.be.revertedWith("Restricted to admins");
  });
});
