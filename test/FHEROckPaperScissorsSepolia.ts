import { expect } from "chai";
import { ethers, fhevm, deployments } from "hardhat";
import type { FHEROckPaperScissors } from "../types";

const CONTRACT_NAME = "FHEROckPaperScissors";

describe("FHEROckPaperScissorsSepolia", function () {
  let contract: FHEROckPaperScissors;

  before(async function () {
    if (fhevm.isMock) {
      this.skip();
    }

    try {
      const deployment = await deployments.get(CONTRACT_NAME);
      contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    } catch (error) {
      (error as Error).message += `. Call 'npx hardhat deploy --network sepolia' before running this test.`;
      throw error;
    }
  });

  it("exposes contract metadata", async function () {
    const oracle = await contract.decryptionOracle();
    expect(oracle).to.not.equal(ethers.ZeroAddress);

    const total = await contract.totalGames();
    expect(total).to.be.a("bigint");
  });
});
