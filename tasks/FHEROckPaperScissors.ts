import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

const CONTRACT_NAME = "FHEROckPaperScissors";

async function resolveDeployment(hre: HardhatRuntimeEnvironment, addressOverride?: string) {
  if (addressOverride) {
    return { address: addressOverride };
  }

  const deployment = await hre.deployments.get(CONTRACT_NAME);
  return { address: deployment.address };
}

async function getSignerByIndex(hre: HardhatRuntimeEnvironment, index: number) {
  const signers = await hre.ethers.getSigners();
  if (index < 0 || index >= signers.length) {
    throw new Error(`Signer index ${index} is out of range (available: ${signers.length})`);
  }
  return signers[index];
}

function parseIndex(value: TaskArguments[keyof TaskArguments] | undefined): number {
  if (value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid signer index: ${value}`);
  }
  return parsed;
}

task("task:address", "Prints the FHEROckPaperScissors deployment address")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const deployment = await resolveDeployment(hre, taskArguments.address);
    console.log(`${CONTRACT_NAME} address: ${deployment.address}`);
  });

task("task:create-game", "Creates a new game with the specified player cap")
  .addParam("maxPlayers", "Maximum players (2-4)")
  .addOptionalParam("index", "Signer index to send the transaction from", "0")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const maxPlayers = Number(taskArguments.maxPlayers);
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
      throw new Error("maxPlayers must be an integer between 2 and 4");
    }

    const signerIndex = parseIndex(taskArguments.index);
    const signer = await getSignerByIndex(hre, signerIndex);
    const deployment = await resolveDeployment(hre, taskArguments.address);

    const contract = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address, signer);
    const tx = await contract.createGame(maxPlayers);
    console.log(`createGame tx: ${tx.hash}`);
    const receipt = await tx.wait();

    const iface = contract.interface;
    for (const log of receipt?.logs ?? []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "GameCreated") {
          console.log(`Game created with ID ${parsed.args.gameId.toString()} by ${parsed.args.host}`);
        }
      } catch {
        // ignore unrelated logs
      }
    }
  });

task("task:join-game", "Joins an open game")
  .addParam("gameId", "Game identifier")
  .addOptionalParam("index", "Signer index to send the transaction from", "0")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const gameId = BigInt(taskArguments.gameId);
    const signerIndex = parseIndex(taskArguments.index);
    const signer = await getSignerByIndex(hre, signerIndex);
    const deployment = await resolveDeployment(hre, taskArguments.address);

    const contract = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address, signer);
    const tx = await contract.joinGame(gameId);
    console.log(`joinGame tx: ${tx.hash}`);
    await tx.wait();
    console.log(`Joined game ${gameId.toString()} as ${signer.address}`);
  });

task("task:start-game", "Starts a ready game (host only)")
  .addParam("gameId", "Game identifier")
  .addOptionalParam("index", "Signer index for the host", "0")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const gameId = BigInt(taskArguments.gameId);
    const signerIndex = parseIndex(taskArguments.index);
    const signer = await getSignerByIndex(hre, signerIndex);
    const deployment = await resolveDeployment(hre, taskArguments.address);

    const contract = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address, signer);
    const tx = await contract.startGame(gameId);
    console.log(`startGame tx: ${tx.hash}`);
    await tx.wait();
    console.log(`Game ${gameId.toString()} started by ${signer.address}`);
  });

task("task:submit-move", "Submits an encrypted move (1=Rock, 2=Paper, 3=Scissors)")
  .addParam("gameId", "Game identifier")
  .addParam("move", "Move value (1, 2, or 3)")
  .addOptionalParam("index", "Signer index submitting the move", "0")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const move = Number(taskArguments.move);
    if (!Number.isInteger(move) || move < 1 || move > 3) {
      throw new Error("Move must be 1, 2, or 3");
    }

    const gameId = BigInt(taskArguments.gameId);
    const signerIndex = parseIndex(taskArguments.index);
    const signer = await getSignerByIndex(hre, signerIndex);
    const deployment = await resolveDeployment(hre, taskArguments.address);

    await hre.fhevm.initializeCLIApi();
    const input = hre.fhevm.createEncryptedInput(deployment.address, signer.address);
    input.add8(BigInt(move));
    const encrypted = await input.encrypt();

    const contract = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address, signer);
    const tx = await contract.submitMove(gameId, encrypted.handles[0], encrypted.inputProof);
    console.log(`submitMove tx: ${tx.hash}`);
    await tx.wait();
    console.log(`Submitted move ${move} for game ${gameId.toString()} as ${signer.address}`);
  });

task("task:get-game", "Reads game details")
  .addParam("gameId", "Game identifier")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const gameId = BigInt(taskArguments.gameId);
    const deployment = await resolveDeployment(hre, taskArguments.address);
    const contract = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address);

    const result = await contract.getGame(gameId);
    console.log(`Game ${gameId.toString()} details:`);
    console.log({
      host: result.host,
      maxPlayers: Number(result.maxPlayers),
      currentPlayers: Number(result.currentPlayers),
      movesSubmitted: Number(result.movesSubmitted),
      state: Number(result.state),
      revealRequestId: result.revealRequestId.toString(),
      players: result.players,
      winners: result.winners,
      revealedMoves: result.revealedMoves.map((value: bigint) => Number(value)),
    });
  });

task("task:get-player", "Reads player state within a game")
  .addParam("gameId", "Game identifier")
  .addParam("player", "Player address")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const gameId = BigInt(taskArguments.gameId);
    const player = taskArguments.player as string;
    const deployment = await resolveDeployment(hre, taskArguments.address);
    const contract = await hre.ethers.getContractAt(CONTRACT_NAME, deployment.address);

    const result = await contract.getPlayerState(gameId, player);
    console.log(`Player ${player} state in game ${gameId.toString()}:`);
    console.log({
      joined: result.joined,
      moveSubmitted: result.moveSubmitted,
      moveRevealed: result.moveRevealed,
      revealedMove: Number(result.revealedMove),
      encryptedMove: result.encryptedMove,
    });
  });
