import { useState, useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';

export type BotConfig = {
  enabled: boolean;
  count: number;
  autoPlay: boolean;
  thinkingDelay: number; // milliseconds
};

const DEFAULT_BOT_CONFIG: BotConfig = {
  enabled: false,
  count: 1,
  autoPlay: true,
  thinkingDelay: 3000, // 3 seconds
};

export function useBotPlayer(zamaInstance: any | null) {
  const [botConfig, setBotConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);
  const [processingBots, setProcessingBots] = useState<Set<number>>(new Set());

  const { writeContract } = useWriteContract();

  // Enable/disable bots
  const toggleBots = useCallback((enabled: boolean) => {
    setBotConfig(prev => ({ ...prev, enabled }));
  }, []);

  // Set number of bots (1-3)
  const setBotCount = useCallback((count: number) => {
    const validCount = Math.max(1, Math.min(3, count));
    setBotConfig(prev => ({ ...prev, count: validCount }));
  }, []);

  // Generate random move (1=Rock, 2=Paper, 3=Scissors)
  const getRandomMove = useCallback((): number => {
    return Math.floor(Math.random() * 3) + 1;
  }, []);

  // Bot joins a game
  const botJoinGame = useCallback(async (gameId: bigint, botIndex: number) => {
    if (processingBots.has(botIndex)) return;

    try {
      setProcessingBots(prev => new Set(prev).add(botIndex));

      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'joinGame',
        args: [gameId],
      });

      console.log(`🤖 Bot ${botIndex + 1} joining game ${gameId}`);
    } catch (error) {
      console.error(`Bot ${botIndex + 1} failed to join:`, error);
    } finally {
      setTimeout(() => {
        setProcessingBots(prev => {
          const next = new Set(prev);
          next.delete(botIndex);
          return next;
        });
      }, 1000);
    }
  }, [writeContract, processingBots]);

  // Bot submits encrypted move
  const botSubmitMove = useCallback(async (
    gameId: bigint,
    botIndex: number
  ) => {
    if (!zamaInstance || processingBots.has(botIndex)) return;

    try {
      setProcessingBots(prev => new Set(prev).add(botIndex));

      // Random thinking delay (1-3 seconds)
      const thinkDelay = Math.random() * 2000 + 1000;
      await new Promise(resolve => setTimeout(resolve, thinkDelay));

      const randomMove = getRandomMove();
      console.log(`🤖 Bot ${botIndex + 1} chose: ${randomMove} (1=Rock, 2=Paper, 3=Scissors)`);

      // Encrypt the move
      const encryptedMove = await zamaInstance.createEncryptedInput(
        CONTRACT_ADDRESS,
        await zamaInstance.getPublicKey(CONTRACT_ADDRESS)
      );

      encryptedMove.add8(randomMove);
      const { handles, inputProof } = await encryptedMove.encrypt();

      // Submit to contract
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'submitMove',
        args: [gameId, handles[0], inputProof],
      });

      console.log(`🤖 Bot ${botIndex + 1} submitted encrypted move for game ${gameId}`);
    } catch (error) {
      console.error(`Bot ${botIndex + 1} failed to submit move:`, error);
    } finally {
      setTimeout(() => {
        setProcessingBots(prev => {
          const next = new Set(prev);
          next.delete(botIndex);
          return next;
        });
      }, 1000);
    }
  }, [zamaInstance, writeContract, getRandomMove, processingBots]);

  // Auto-join game with bots after creation
  const autoFillGameWithBots = useCallback(async (
    gameId: bigint,
    maxPlayers: number,
    currentPlayers: number
  ) => {
    if (!botConfig.enabled || currentPlayers >= maxPlayers) return;

    const botsNeeded = Math.min(
      botConfig.count,
      maxPlayers - currentPlayers
    );

    console.log(`🤖 Auto-filling game ${gameId} with ${botsNeeded} bots`);

    // Join bots one by one with delays
    for (let i = 0; i < botsNeeded; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      await botJoinGame(gameId, i);
    }
  }, [botConfig, botJoinGame]);

  // Auto-submit moves for bots
  const autoSubmitBotMoves = useCallback(async (
    gameId: bigint,
    totalPlayers: number,
    movesSubmitted: number
  ) => {
    if (!botConfig.enabled || !botConfig.autoPlay) return;

    // Calculate how many bots need to submit (assuming last X players are bots)
    const botsInGame = Math.min(botConfig.count, totalPlayers - 1); // -1 for human player
    const humanSubmitted = movesSubmitted > botsInGame;

    if (!humanSubmitted) return; // Wait for human to submit first

    const botMovesNeeded = botsInGame;
    const botMovesSubmitted = movesSubmitted - 1; // -1 for human

    console.log(`🤖 Game ${gameId}: ${botMovesSubmitted}/${botMovesNeeded} bot moves submitted`);

    // Submit remaining bot moves
    for (let i = botMovesSubmitted; i < botMovesNeeded; i++) {
      const delay = botConfig.thinkingDelay + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      await botSubmitMove(gameId, i);
    }
  }, [botConfig, botSubmitMove]);

  return {
    botConfig,
    toggleBots,
    setBotCount,
    autoFillGameWithBots,
    autoSubmitBotMoves,
    isBotProcessing: processingBots.size > 0,
    processingBots,
  };
}
