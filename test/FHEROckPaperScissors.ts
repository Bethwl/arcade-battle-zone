import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { FHEROckPaperScissors, FHEROckPaperScissors__factory } from "../types";

type SignersFixture = {
  host: HardhatEthersSigner;
  challenger: HardhatEthersSigner;
  spectator: HardhatEthersSigner;
};

async function deployGameFixture(decryptionOracle: string) {
  const factory = (await ethers.getContractFactory("FHEROckPaperScissors")) as FHEROckPaperScissors__factory;
  const contract = (await factory.deploy(decryptionOracle)) as FHEROckPaperScissors;
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  return { contract, address };
}

describe("FHEROckPaperScissors", function () {
  let signers: SignersFixture;
  let contract: FHEROckPaperScissors;
  let contractAddress: string;

  before(async function () {
    const accounts = await ethers.getSigners();
    signers = {
      host: accounts[0],
      challenger: accounts[1],
      spectator: accounts[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    await fhevm.initializeCLIApi();
    const metadata = await fhevm.getRelayerMetadata();
    ({ contract, address: contractAddress } = await deployGameFixture(metadata.relayerSignerAddress));
  });

  it("allows players to create, join, and start a game", async function () {
    const createTx = await contract.connect(signers.host).createGame(2);
    await createTx.wait();

    let game = await contract.getGame(0n);
    expect(game.host).to.equal(signers.host.address);
    expect(Number(game.maxPlayers)).to.equal(2);
    expect(Number(game.currentPlayers)).to.equal(1);
    expect(Number(game.state)).to.equal(0); // Open

    await contract.connect(signers.challenger).joinGame(0n);
    game = await contract.getGame(0n);
    expect(Number(game.currentPlayers)).to.equal(2);
    expect(Number(game.state)).to.equal(1); // Ready

    const hostState = await contract.getPlayerState(0n, signers.host.address);
    expect(hostState.joined).to.be.true;
    expect(hostState.moveSubmitted).to.be.false;

    await contract.connect(signers.host).startGame(0n);
    game = await contract.getGame(0n);
    expect(Number(game.state)).to.equal(2); // Started
  });

  it("reveals the winner after encrypted submissions", async function () {
    await contract.connect(signers.host).createGame(2);
    await contract.connect(signers.challenger).joinGame(0n);
    await contract.connect(signers.host).startGame(0n);

    const hostInput = fhevm.createEncryptedInput(contractAddress, signers.host.address);
    hostInput.add8(1);
    const hostEncrypted = await hostInput.encrypt();
    await contract
      .connect(signers.host)
      .submitMove(0n, hostEncrypted.handles[0], hostEncrypted.inputProof);

    const challengerInput = fhevm.createEncryptedInput(contractAddress, signers.challenger.address);
    challengerInput.add8(2);
    const challengerEncrypted = await challengerInput.encrypt();
    const submitTx = await contract
      .connect(signers.challenger)
      .submitMove(0n, challengerEncrypted.handles[0], challengerEncrypted.inputProof);
    await submitTx.wait();

    let game = await contract.getGame(0n);
    expect(Number(game.movesSubmitted)).to.equal(2);
    expect(Number(game.state)).to.equal(3); // Revealing

    await fhevm.awaitDecryptionOracle();

    game = await contract.getGame(0n);
    expect(Number(game.state)).to.equal(4); // Revealed
    expect(game.winners).to.deep.equal([signers.challenger.address]);
    expect(game.players).to.deep.equal([signers.host.address, signers.challenger.address]);
    expect(game.revealedMoves.map(value => Number(value))).to.deep.equal([1, 2]);

    const hostState = await contract.getPlayerState(0n, signers.host.address);
    expect(hostState.moveSubmitted).to.be.true;
    expect(hostState.moveRevealed).to.be.true;
    expect(Number(hostState.revealedMove)).to.equal(1);
    const decryptedHostMove = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      hostState.encryptedMove,
      contractAddress,
      signers.host,
    );
    expect(Number(decryptedHostMove)).to.equal(1);

    const challengerState = await contract.getPlayerState(0n, signers.challenger.address);
    expect(challengerState.moveRevealed).to.be.true;
    expect(Number(challengerState.revealedMove)).to.equal(2);
  });

  it("handles draw scenarios with no winners", async function () {
    await contract.connect(signers.host).createGame(2);
    await contract.connect(signers.challenger).joinGame(0n);
    await contract.connect(signers.host).startGame(0n);

    const hostInput = fhevm.createEncryptedInput(contractAddress, signers.host.address);
    hostInput.add8(3);
    const hostEncrypted = await hostInput.encrypt();
    await contract
      .connect(signers.host)
      .submitMove(0n, hostEncrypted.handles[0], hostEncrypted.inputProof);

    const challengerInput = fhevm.createEncryptedInput(contractAddress, signers.challenger.address);
    challengerInput.add8(3);
    const challengerEncrypted = await challengerInput.encrypt();
    await contract
      .connect(signers.challenger)
      .submitMove(0n, challengerEncrypted.handles[0], challengerEncrypted.inputProof);

    await fhevm.awaitDecryptionOracle();

    const game = await contract.getGame(0n);
    expect(Number(game.state)).to.equal(4);
    expect(game.winners.length).to.equal(0);
    expect(game.revealedMoves.map(value => Number(value))).to.deep.equal([3, 3]);
  });
});
