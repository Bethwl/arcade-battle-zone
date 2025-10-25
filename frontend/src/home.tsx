import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Contract } from 'ethers';
import { CONTRACT_ABI, CONTRACT_ADDRESS, GAME_STATE_LABELS, MOVE_LABELS, ZERO_ADDRESS } from './config/contracts';
import { useEthersSigner } from './hooks/useEthersSigner';
import { useZamaInstance } from './hooks/useZamaInstance';
import './styles/Home.css';

type Game = {
  id: number;
  host: string;
  maxPlayers: number;
  currentPlayers: number;
  movesSubmitted: number;
  state: number;
  players: string[];
  winners: string[];
  revealedMoves: number[];
  revealRequestId: bigint;
};

type PlayerState = {
  joined: boolean;
  moveSubmitted: boolean;
  moveRevealed: boolean;
  revealedMove: number;
  encryptedMove: string;
};

const SHORT_ADDRESS_CHARS = 6;
const REFRESH_INTERVAL_MS = 15000;

function shortenAddress(address?: string | null) {
  if (!address) return '';
  return `${address.slice(0, SHORT_ADDRESS_CHARS)}…${address.slice(-4)}`;
}

function formatMove(move: number | undefined) {
  if (!move) return '—';
  return MOVE_LABELS[move] ?? 'Unknown';
}

function useGames(refreshKey: number, enabled: boolean) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['games', refreshKey],
    enabled: enabled && !!publicClient,
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
    queryFn: async (): Promise<Game[]> => {
      if (!publicClient || CONTRACT_ADDRESS === ZERO_ADDRESS) {
        return [];
      }

      const total = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'totalGames',
      })) as bigint;

      const totalGames = Number(total);
      if (totalGames === 0) {
        return [];
      }

      const games = await Promise.all(
        Array.from({ length: totalGames }, async (_, index) => {
          const data = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getGame',
            args: [BigInt(index)],
          })) as unknown[];

          const [
            host,
            maxPlayers,
            currentPlayers,
            movesSubmitted,
            state,
            players,
            winners,
            revealedMoves,
            revealRequestId,
          ] = data as [
            string,
            number | bigint,
            number | bigint,
            number | bigint,
            number | bigint,
            readonly string[],
            readonly string[],
            readonly (number | bigint)[],
            bigint,
          ];

          return {
            id: index,
            host,
            maxPlayers: Number(maxPlayers),
            currentPlayers: Number(currentPlayers),
            movesSubmitted: Number(movesSubmitted),
            state: Number(state),
            players: Array.from(players),
            winners: Array.from(winners),
            revealedMoves: Array.from(revealedMoves).map(value => Number(value)),
            revealRequestId,
          } satisfies Game;
        }),
      );

      return games.sort((a, b) => b.id - a.id);
    },
  });
}

function usePlayerState(gameId: number | null, address: string | undefined, refreshKey: number) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['playerState', gameId, address, refreshKey],
    enabled: !!publicClient && CONTRACT_ADDRESS !== ZERO_ADDRESS && !!address && gameId !== null,
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
    queryFn: async (): Promise<PlayerState> => {
      if (!publicClient || !address || gameId === null) {
        throw new Error('Missing requirements for player state');
      }

      const data = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getPlayerState',
        args: [BigInt(gameId), address],
      })) as unknown[];

      const [joined, moveSubmitted, moveRevealed, revealedMove, encryptedMove] = data as [
        boolean,
        boolean,
        boolean,
        number | bigint,
        string,
      ];

      return {
        joined,
        moveSubmitted,
        moveRevealed,
        revealedMove: Number(revealedMove),
        encryptedMove,
      };
    },
  });
}

type ActionState = 'create' | 'join' | 'start' | 'submit' | null;

export default function Home() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: encryptionLoading, error: encryptionError } = useZamaInstance();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isContractConfigured = CONTRACT_ADDRESS !== ZERO_ADDRESS;

  const {
    data: games = [],
    isLoading: gamesLoading,
    isFetching: gamesFetching,
  } = useGames(refreshKey, isContractConfigured);

  const selectedGame = useMemo(
    () => games.find(game => game.id === selectedGameId) ?? null,
    [games, selectedGameId],
  );

  useEffect(() => {
    if (games.length === 0) {
      setSelectedGameId(null);
      return;
    }

    if (selectedGameId === null || !games.some(game => game.id === selectedGameId)) {
      setSelectedGameId(games[0].id);
    }
  }, [games, selectedGameId]);

  const {
    data: playerState,
    isLoading: playerStateLoading,
    isFetching: playerFetching,
  } = usePlayerState(selectedGame?.id ?? null, address, refreshKey);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(value => value + 1);
  }, []);

  const resetStatus = useCallback(() => {
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  const getSigner = useCallback(async () => {
    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Please connect your wallet');
    }
    return signer;
  }, [signerPromise]);

  const handleCreateGame = useCallback(async () => {
    if (!isConnected) {
      setErrorMessage('Connect your wallet to create a game.');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      return;
    }
    if (maxPlayers < 2 || maxPlayers > 4) {
      setErrorMessage('Player count must be between 2 and 4.');
      return;
    }

    try {
      resetStatus();
      setActionState('create');
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.createGame(maxPlayers);
      setStatusMessage('Creating game… awaiting confirmation.');
      await tx.wait();
      setStatusMessage('Game created successfully.');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to create game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create game.');
    } finally {
      setActionState(null);
    }
  }, [getSigner, isConnected, isContractConfigured, maxPlayers, resetStatus, triggerRefresh]);

  const handleJoinGame = useCallback(async () => {
    if (!selectedGame) return;
    if (!isConnected) {
      setErrorMessage('Connect your wallet to join a game.');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      return;
    }

    try {
      resetStatus();
      setActionState('join');
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.joinGame(BigInt(selectedGame.id));
      setStatusMessage('Joining game… awaiting confirmation.');
      await tx.wait();
      setStatusMessage('Joined game successfully.');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to join game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to join game.');
    } finally {
      setActionState(null);
    }
  }, [getSigner, isConnected, isContractConfigured, resetStatus, selectedGame, triggerRefresh]);

  const handleStartGame = useCallback(async () => {
    if (!selectedGame) return;
    if (!isConnected) {
      setErrorMessage('Connect your wallet to start the game.');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      return;
    }

    try {
      resetStatus();
      setActionState('start');
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.startGame(BigInt(selectedGame.id));
      setStatusMessage('Starting game… awaiting confirmation.');
      await tx.wait();
      setStatusMessage('Game started. Players can now submit moves.');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to start game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start game.');
    } finally {
      setActionState(null);
    }
  }, [getSigner, isConnected, isContractConfigured, resetStatus, selectedGame, triggerRefresh]);

  const handleSubmitMove = useCallback(async () => {
    if (!selectedGame) return;
    if (selectedMove === null) {
      setErrorMessage('Select a move before submitting.');
      return;
    }
    if (!instance) {
      setErrorMessage('Encryption service is not ready yet.');
      return;
    }
    if (!address) {
      setErrorMessage('Connect your wallet to submit a move.');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      return;
    }

    try {
      resetStatus();
      setActionState('submit');
      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add8(BigInt(selectedMove));
      const encrypted = await input.encrypt();

      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.submitMove(
        BigInt(selectedGame.id),
        encrypted.handles[0],
        encrypted.inputProof,
      );

      setStatusMessage('Submitting move… awaiting confirmation.');
      await tx.wait();
      setSelectedMove(null);
      setStatusMessage('Move submitted. Waiting for reveal.');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to submit move:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit move.');
    } finally {
      setActionState(null);
    }
  }, [
    address,
    getSigner,
    instance,
    isContractConfigured,
    resetStatus,
    selectedGame,
    selectedMove,
    triggerRefresh,
  ]);

  const isBusy = actionState !== null;
  const isRefreshing = gamesFetching || playerFetching || actionState !== null;

  return (
    <div className="home-container">
      <header className="home-header">
        <div>
          <h1 className="home-title">FHE Rock · Paper · Scissors</h1>
          <p className="home-subtitle">Create private games, submit encrypted moves, and reveal winners on-chain.</p>
        </div>
        <ConnectButton />
      </header>

      {!isContractConfigured && (
        <div className="status-banner warning">
          <strong>Contract address missing.</strong> Set <code>VITE_RPS_CONTRACT_ADDRESS</code> in your environment.
        </div>
      )}

      {encryptionLoading && (
        <div className="status-banner info">Initializing Zama encryption services…</div>
      )}

      {encryptionError && (
        <div className="status-banner error">{encryptionError}</div>
      )}

      {statusMessage && (
        <div className="status-banner success">{statusMessage}</div>
      )}

      {errorMessage && (
        <div className="status-banner error">{errorMessage}</div>
      )}

      <section className="controls-grid">
        <div className="card">
          <h2 className="card-title">Create a Game</h2>
          <p className="card-description">
            Host a new encrypted Rock-Paper-Scissors match. Each seat will be filled by one player.
          </p>
          <label className="form-label" htmlFor="maxPlayers">
            Players per game
          </label>
          <input
            id="maxPlayers"
            type="number"
            min={2}
            max={4}
            value={maxPlayers}
            onChange={event => setMaxPlayers(Number(event.target.value))}
            className="number-input"
          />
          <button
            className="primary-button"
            onClick={handleCreateGame}
            disabled={isBusy || !isConnected || encryptionLoading}
          >
            {actionState === 'create' ? 'Creating…' : 'Create Game'}
          </button>
          <button
            className="secondary-button"
            onClick={triggerRefresh}
            disabled={isRefreshing}
          >
            Refresh Games
          </button>
        </div>

        <div className="card">
          <h2 className="card-title">Available Games</h2>
          {gamesLoading ? (
            <p className="placeholder-text">Loading games…</p>
          ) : games.length === 0 ? (
            <p className="placeholder-text">No games yet. Create the first one!</p>
          ) : (
            <ul className="games-list">
              {games.map(game => {
                const isSelected = selectedGame?.id === game.id;
                return (
                  <li key={game.id}>
                    <button
                      className={`game-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedGameId(game.id)}
                      disabled={isBusy}
                    >
                      <div className="game-item-row">
                        <span className="game-id">Game #{game.id}</span>
                        <span className={`badge state-${GAME_STATE_LABELS[game.state]?.toLowerCase() ?? 'unknown'}`}>
                          {GAME_STATE_LABELS[game.state] ?? 'Unknown'}
                        </span>
                      </div>
                      <div className="game-item-row muted">
                        <span>{game.currentPlayers}/{game.maxPlayers} players</span>
                        <span>{game.movesSubmitted} moves</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {selectedGame ? (
        <section className="card">
          <div className="game-header">
            <h2 className="card-title">Game #{selectedGame.id}</h2>
            <span className={`badge state-${GAME_STATE_LABELS[selectedGame.state]?.toLowerCase() ?? 'unknown'}`}>
              {GAME_STATE_LABELS[selectedGame.state] ?? 'Unknown'}
            </span>
          </div>

          <div className="game-grid">
            <div>
              <h3 className="section-heading">Host</h3>
              <p className="monospace">{shortenAddress(selectedGame.host)}</p>
            </div>
            <div>
              <h3 className="section-heading">Players</h3>
              <p>{selectedGame.currentPlayers} / {selectedGame.maxPlayers}</p>
            </div>
            <div>
              <h3 className="section-heading">Moves</h3>
              <p>{selectedGame.movesSubmitted} submitted</p>
            </div>
            <div>
              <h3 className="section-heading">Reveal request</h3>
              <p className="monospace">
                {selectedGame.revealRequestId === 0n ? '—' : selectedGame.revealRequestId.toString()}
              </p>
            </div>
          </div>

          <div className="players-grid">
            {selectedGame.players.map((player, index) => {
              const revealedMove = selectedGame.revealedMoves[index];
              const isWinner = selectedGame.winners.includes(player);
              return (
                <div key={player} className={`player-card ${isWinner ? 'winner' : ''}`}>
                  <div className="player-header">
                    <span className="monospace">{shortenAddress(player)}</span>
                    {isWinner && <span className="badge winner-badge">Winner</span>}
                  </div>
                  <p className="player-move">
                    {selectedGame.state === 4 && revealedMove
                      ? formatMove(revealedMove)
                      : playerState?.joined && address === player && playerState.moveSubmitted
                        ? 'Move submitted'
                        : 'Awaiting move'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="actions-row">
            <button
              className="secondary-button"
              onClick={handleJoinGame}
              disabled={
                isBusy ||
                !isConnected ||
                !selectedGame ||
                playerState?.joined ||
                selectedGame.state !== 0 ||
                selectedGame.currentPlayers >= selectedGame.maxPlayers
              }
            >
              {playerState?.joined ? 'Joined' : actionState === 'join' ? 'Joining…' : 'Join Game'}
            </button>

            <button
              className="secondary-button"
              onClick={handleStartGame}
              disabled={
                isBusy ||
                !isConnected ||
                !selectedGame ||
                address?.toLowerCase() !== selectedGame.host.toLowerCase() ||
                selectedGame.state !== 1
              }
            >
              {actionState === 'start' ? 'Starting…' : 'Start Game'}
            </button>
          </div>

          <div className="move-section">
            <h3 className="section-heading">Submit Encrypted Move</h3>
            <p className="helper-text">
              Choose Rock (1), Paper (2), or Scissors (3). Your choice is encrypted locally before being sent on-chain.
            </p>
            <div className="move-selector">
              {[1, 2, 3].map(move => (
                <button
                  key={move}
                  className={`move-button ${selectedMove === move ? 'selected' : ''}`}
                  onClick={() => setSelectedMove(move)}
                  disabled={isBusy}
                  type="button"
                >
                  <span className="move-number">{move}</span>
                  <span>{formatMove(move)}</span>
                </button>
              ))}
            </div>
            <button
              className="primary-button"
              onClick={handleSubmitMove}
              disabled={
                isBusy ||
                !isConnected ||
                !playerState?.joined ||
                playerState.moveSubmitted ||
                selectedGame.state !== 2 ||
                selectedMove === null ||
                encryptionLoading
              }
            >
              {playerState?.moveSubmitted
                ? 'Move Submitted'
                : actionState === 'submit'
                  ? 'Submitting…'
                  : 'Submit Move'}
            </button>
            {playerStateLoading && <p className="helper-text">Checking your player status…</p>}
          </div>
        </section>
      ) : (
        <section className="card">
          <h2 className="card-title">Game Details</h2>
          <p className="placeholder-text">
            Select a game to see its encrypted moves, player seats, and reveal status.
          </p>
        </section>
      )}
    </div>
  );
}
