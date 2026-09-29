import { expect } from "chai";
import { ethers } from "hardhat";
import { PraiseBoard } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PraiseBoard", function () {
  let praiseBoard: PraiseBoard;
  let owner: HardhatEthersSigner;
  let supporter1: HardhatEthersSigner;
  let supporter2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, supporter1, supporter2] = await ethers.getSigners();
    const PraiseBoardFactory = await ethers.getContractFactory("PraiseBoard");
    praiseBoard = (await PraiseBoardFactory.deploy()) as PraiseBoard;
    await praiseBoard.waitForDeployment();
  });

  describe("Constructor", function () {
    it("Should set the deployer as owner", async function () {
      expect(await praiseBoard.owner()).to.equal(owner.address);
    });

    it("Should initialize contract balance to 0", async function () {
      expect(await praiseBoard.contractBalance()).to.equal(0);
    });
  });

  describe("tip()", function () {
    it("Should accept tips and emit TipReceived event with exact sender, amount, and note", async function () {
      const tipAmount = ethers.parseEther("0.05");
      const note = "Thank you for the awesome work!";

      const tx = praiseBoard.connect(supporter1).tip(note, { value: tipAmount });

      await expect(tx)
        .to.emit(praiseBoard, "TipReceived")
        .withArgs(supporter1.address, tipAmount, note, (timestamp: number) => timestamp > 0);

      expect(await praiseBoard.contractBalance()).to.equal(tipAmount);
    });

    it("Should revert if note exceeds MAX_NOTE_LENGTH (280 characters/bytes)", async function () {
      const overLongNote = "a".repeat(281);
      const tipAmount = ethers.parseEther("0.01");

      await expect(
        praiseBoard.connect(supporter1).tip(overLongNote, { value: tipAmount })
      ).to.be.revertedWithCustomError(praiseBoard, "NoteTooLong");
    });

    it("Should allow a note with exactly 280 characters", async function () {
      const exactNote = "a".repeat(280);
      const tipAmount = ethers.parseEther("0.01");

      await expect(
        praiseBoard.connect(supporter1).tip(exactNote, { value: tipAmount })
      ).to.emit(praiseBoard, "TipReceived");
    });

    it("Should revert if tip value is zero (ZeroTip)", async function () {
      await expect(
        praiseBoard.connect(supporter1).tip("No money tip", { value: 0 })
      ).to.be.revertedWithCustomError(praiseBoard, "ZeroTip");
    });

    it("Should track totalTips counter properly across tips", async function () {
      expect(await praiseBoard.totalTips()).to.equal(0);
      await praiseBoard.connect(supporter1).tip("First", { value: ethers.parseEther("0.01") });
      expect(await praiseBoard.totalTips()).to.equal(1);
      await praiseBoard.connect(supporter2).tip("Second", { value: ethers.parseEther("0.02") });
      expect(await praiseBoard.totalTips()).to.equal(2);
    });

    it("Should accept plain ETH transfers via receive() and emit TipReceived with empty note", async function () {
      const tipAmount = ethers.parseEther("0.03");
      const tx = supporter1.sendTransaction({
        to: await praiseBoard.getAddress(),
        value: tipAmount,
      });

      await expect(tx)
        .to.emit(praiseBoard, "TipReceived")
        .withArgs(supporter1.address, tipAmount, "", (timestamp: number) => timestamp > 0);

      expect(await praiseBoard.contractBalance()).to.equal(tipAmount);
      expect(await praiseBoard.totalTips()).to.equal(1);
    });

    it("Should revert if plain ETH transfer sends zero value", async function () {
      await expect(
        supporter1.sendTransaction({
          to: await praiseBoard.getAddress(),
          value: 0,
        })
      ).to.be.revertedWithCustomError(praiseBoard, "ZeroTip");
    });
  });

  describe("withdraw()", function () {
    it("Should revert if non-owner attempts to withdraw", async function () {
      const tipAmount = ethers.parseEther("0.1");
      await praiseBoard.connect(supporter1).tip("Great job!", { value: tipAmount });

      await expect(
        praiseBoard.connect(supporter1).withdraw()
      ).to.be.revertedWithCustomError(praiseBoard, "NotOwner");
    });

    it("Should revert if contract balance is zero", async function () {
      await expect(
        praiseBoard.connect(owner).withdraw()
      ).to.be.revertedWithCustomError(praiseBoard, "NothingToWithdraw");
    });

    it("Should zero the tracked balance before external transfer and transfer ETH to owner", async function () {
      const tipAmount = ethers.parseEther("0.5");
      await praiseBoard.connect(supporter1).tip("Generous tip", { value: tipAmount });

      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const tx = await praiseBoard.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(await praiseBoard.contractBalance()).to.equal(0);
      expect(finalOwnerBalance + gasUsed - initialOwnerBalance).to.equal(tipAmount);
    });
  });
});
