const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { expectRevert } = require("../utils/expectRevert");

const BASE = BigNumber.from(10).pow(18);

describe("PunkFund", function () {
  it("Should run as expected", async function () {
    const CryptoPunksMarket = await ethers.getContractFactory(
      "CryptoPunksMarket"
    );
    const PunkToken = await ethers.getContractFactory("PunkToken");
    const PunkFund = await ethers.getContractFactory("PunkFund");

    const cpm = await CryptoPunksMarket.deploy();
    await cpm.deployed();

    const pt = await PunkToken.deploy();
    await pt.deployed();

    const pf = await PunkFund.deploy(cpm.address, pt.address);
    await pf.deployed();

    const [owner, alice, bob, carol] = await ethers.getSigners();

    const initialBalance = await pt.balanceOf(owner._address);
    await pt.connect(owner).transfer(pf.address, initialBalance);

    await expectRevert(pf.connect(alice).initiateUnlock());
    await expectRevert(pf.connect(owner).pause());

    const stageAndWithdraw = async (signer, punkId) => {
      await expectRevert(pf.connect(signer).stageCryptoPunk(punkId));
      await cpm.setInitialOwner(signer._address, punkId);
      await pf.connect(signer).stageCryptoPunk(punkId);
      await expectRevert(pf.connect(signer).withdrawPunkToken(punkId));
      await cpm.connect(signer).transferPunk(pf.address, punkId);
      await pf.connect(signer).withdrawPunkToken(punkId);
    };

    const approveAndRedeem = async (signer) => {
      const signerPunkBalance = await pt.balanceOf(signer._address);
      const signerCPBalance = await cpm.balanceOf(signer._address);
      const contractPunkBalance = await pt.balanceOf(pf.address);
      const contractCPBalance = await cpm.balanceOf(pf.address);
      pt.connect(signer).approve(pf.address, BASE.toString());
      await pf.connect(signer).redeemCryptoPunk();
      expect((await pt.balanceOf(signer._address)).toString()).to.equal(
        signerPunkBalance.sub(BASE).toString()
      );
      expect((await cpm.balanceOf(signer._address)).toString()).to.equal(
        signerCPBalance.add(1).toString()
      );
      expect((await pt.balanceOf(pf.address)).toString()).to.equal(
        contractPunkBalance.add(BASE).toString()
      );
      expect((await cpm.balanceOf(pf.address)).toString()).to.equal(
        contractCPBalance.sub(1).toString()
      );
    };

    for (let i = 0; i < 20; i++) {
      await stageAndWithdraw(alice, i);
      await stageAndWithdraw(bob, 20 + i);
    }

    for (let i = 0; i < 20; i++) {
      await approveAndRedeem(alice);
      await approveAndRedeem(bob);
    }

    const aliceCPs = [];
    const bobCPs = [];
    for (let i = 0; i < 40; i++) {
      const cpOwner = await cpm.punkIndexToAddress(i);
      if (cpOwner === alice._address) {
        aliceCPs.push(i);
      } else {
        bobCPs.push(i);
      }
    }
    console.log("aliceCPs", aliceCPs);
    console.log("bobCPs", bobCPs);

    await cpm.setInitialOwner(alice._address, 42);
    await cpm.connect(alice).transferPunk(pf.address, 42);
    await expectRevert(pf.connect(alice).withdrawPunkToken(42));
    await expectRevert(
      pf.connect(alice).stageRetroactively(42, alice._address)
    );
    await expectRevert(
      pf.connect(owner).stageRetroactively(57, alice._address)
    );
    await pf.connect(owner).stageRetroactively(42, alice._address);
    await expectRevert(pf.connect(alice).withdrawPunkToken(57));
    await pf.connect(alice).withdrawPunkToken(42);
    await approveAndRedeem(alice);

    await stageAndWithdraw(alice, 98);
    await stageAndWithdraw(bob, 99);
    await pt.connect(alice).transfer(pf.address, BASE);
    await pt.connect(bob).transfer(pf.address, BASE);

    await pf.connect(owner).redeemRetroactively(alice._address);
    await pf.connect(owner).redeemRetroactively(bob._address);

    await cpm.setInitialOwner(alice._address, 101);
    await pf.connect(alice).stageCryptoPunk(101);
    await cpm.connect(alice).transferPunk(bob._address, 101);
    await expectRevert(pf.connect(alice).withdrawPunkToken(101));
    await pf.connect(bob).stageCryptoPunk(101);
    await cpm.connect(bob).transferPunk(pf.address, 101);
    await expectRevert(pf.connect(alice).withdrawPunkToken(101));
    await pf.connect(bob).withdrawPunkToken(101);
    await approveAndRedeem(bob);

    await expectRevert(pf.connect(owner).migrate(owner._address));
    await expectRevert(pf.connect(alice).transferOwnership(carol._address));
    await expectRevert(pf.connect(carol).transferOwnership(carol._address));
    await pf.connect(owner).transferOwnership(carol._address);
    await expectRevert(pf.connect(carol).migrate(carol._address));
    await expectRevert(pf.connect(carol).pause());
    await pf.connect(carol).initiateUnlock();
    await expectRevert(pf.connect(carol).migrate(carol._address));
    await expectRevert(pf.connect(carol).pause());

    // Change timelock to 5s to test unlocking

    /* console.log("waiting...");
    await new Promise((resolve) => setTimeout(() => resolve(), 5000));
    await pb.connect(carol).pause();
    await pb.connect(carol).migrate(alice._address);
    expect((await pt.balanceOf(alice._address)).toString()).to.equal(
      BASE.mul(9999).toString()
    );
    expect((await cpm.balanceOf(alice._address)).toString()).to.equal("1"); */
  });
});
