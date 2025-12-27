import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Contract } from 'ethers';
import { CONTRACT_ABI, CONTRACT_ADDRESS, GAME_STATE_LABELS, MOVE_LABELS } from './config/contracts';
import { useEthersSigner } from './hooks/useEthersSigner';
import { useZamaInstance } from './hooks/useZamaInstance';
import { useArcadeSound } from './hooks/useArcadeSound';
import { ArcadeButton } from './components/ArcadeButton';
import { MoveSelector } from './components/MoveSelector';
import './styles/Home.css';
import type { Address } from 'viem';

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

type NumericValue = number | bigint;

type RawGameResponse = readonly [
  `0x${string}`,
  NumericValue,
  NumericValue,
  NumericValue,
  NumericValue,
  readonly `0x${string}`[],
  readonly `0x${string}`[],
  readonly NumericValue[],
  bigint,
];

type RawPlayerState = readonly [boolean, boolean, boolean, NumericValue, string];

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
      if (!publicClient) {
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
          })) as RawGameResponse;

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
          ] = data;

          return {
            id: index,
            host,
            maxPlayers: Number(maxPlayers),
            currentPlayers: Number(currentPlayers),
            movesSubmitted: Number(movesSubmitted),
            state: Number(state),
            players: Array.from(players),
            winners: Array.from(winners),
            revealedMoves: Array.from(revealedMoves, value => Number(value)),
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
    enabled: !!publicClient  && !!address && gameId !== null,
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
        args: [BigInt(gameId), address as Address],
      })) as RawPlayerState;

      const [joined, moveSubmitted, moveRevealed, revealedMove, encryptedMove] = data;

      return {
        joined,
        moveSubmitted,
        moveRevealed,
        revealedMove: Number(revealedMove),
        encryptedMove: encryptedMove as string,
      };
    },
  });
}

type ActionState = 'create' | 'join' | 'start' | 'submit' | null;

export default function Home() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: encryptionLoading, error: encryptionError } = useZamaInstance();
  const { play, toggleMute, isMuted } = useArcadeSound();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevWinnersRef = useRef<string[]>([]);

  const isContractConfigured = true;

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
    play('click');
    if (!isConnected) {
      setErrorMessage('Connect your wallet to create a game.');
      play('error');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      play('error');
      return;
    }
    if (maxPlayers < 2 || maxPlayers > 4) {
      setErrorMessage('Player count must be between 2 and 4.');
      play('error');
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
      play('created');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to create game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create game.');
      play('error');
    } finally {
      setActionState(null);
    }
  }, [getSigner, isConnected, isContractConfigured, maxPlayers, play, resetStatus, triggerRefresh]);

  const handleJoinGame = useCallback(async () => {
    play('click');
    if (!selectedGame) return;
    if (!isConnected) {
      setErrorMessage('Connect your wallet to join a game.');
      play('error');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      play('error');
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
      play('join');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to join game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to join game.');
      play('error');
    } finally {
      setActionState(null);
    }
  }, [getSigner, isConnected, isContractConfigured, play, resetStatus, selectedGame, triggerRefresh]);

  const handleStartGame = useCallback(async () => {
    play('click');
    if (!selectedGame) return;
    if (!isConnected) {
      setErrorMessage('Connect your wallet to start the game.');
      play('error');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      play('error');
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
      play('start');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to start game:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start game.');
      play('error');
    } finally {
      setActionState(null);
    }
  }, [getSigner, isConnected, isContractConfigured, play, resetStatus, selectedGame, triggerRefresh]);

  const handleSubmitMove = useCallback(async () => {
    play('click');
    if (!selectedGame) return;
    if (selectedMove === null) {
      setErrorMessage('Select a move before submitting.');
      play('error');
      return;
    }
    if (!instance) {
      setErrorMessage('Encryption service is not ready yet.');
      play('error');
      return;
    }
    if (!address) {
      setErrorMessage('Connect your wallet to submit a move.');
      play('error');
      return;
    }
    if (!isContractConfigured) {
      setErrorMessage('Contract address is not configured.');
      play('error');
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
      play('submit');
      triggerRefresh();
    } catch (error) {
      console.error('Failed to submit move:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit move.');
      play('error');
    } finally {
      setActionState(null);
    }
  }, [
    address,
    getSigner,
    instance,
    isContractConfigured,
    play,
    resetStatus,
    selectedGame,
    selectedMove,
    triggerRefresh,
  ]);

  // Detect winner reveal and play sound
  useEffect(() => {
    if (selectedGame && selectedGame.winners.length > 0 && prevWinnersRef.current.length === 0) {
      play('winner');
    }
    prevWinnersRef.current = selectedGame?.winners ?? [];
  }, [selectedGame?.winners, play, selectedGame]);

  const handleMoveSelect = useCallback((move: number) => {
    play('select');
    setSelectedMove(move);
  }, [play]);

  const handleGameSelect = useCallback((gameId: number) => {
    play('click');
    setSelectedGameId(gameId);
  }, [play]);

  const isBusy = actionState !== null;
  const isRefreshing = gamesFetching || playerFetching || actionState !== null;

  return (
    <div className="arcade-cabinet">
      <header className="arcade-marquee">
        <div className="marquee-content">
          <h1 className="arcade-title">FHE ROCK•PAPER•SCISSORS</h1>
          <p className="arcade-subtitle">ENCRYPTED MOVES • ONCHAIN REVEALS</p>
        </div>
        <div className="arcade-controls">
          <button
            className="mute-toggle"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <ConnectButton />
        </div>
      </header>

      <div className="arcade-body">

        {/* Status Banners */}
        {!isContractConfigured && (
          <div className="status-banner warning">
            <strong>CONTRACT ERROR:</strong> Update <code>CONTRACT_ADDRESS</code>
          </div>
        )}

        {encryptionLoading && (
          <div className="status-banner info">INITIALIZING ENCRYPTION...</div>
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

        {/* CRT Screen - Main Game Display */}
        <section className="crt-screen">
          <div className="crt-bezel">
            <div className="crt-content">

{selectedGame ? (
                <>
                  <div className="game-header-crt">
                    <h2 className="crt-title">GAME #{selectedGame.id}</h2>
                    <span className={`badge state-${GAME_STATE_LABELS[selectedGame.state]?.toLowerCase() ?? 'unknown'}`}>
                      {GAME_STATE_LABELS[selectedGame.state] ?? 'Unknown'}
                    </span>
                  </div>

                  <div className="game-stats-grid">
                    <div className="stat-box">
                      <span className="stat-label">HOST</span>
                      <span className="stat-value monospace">{shortenAddress(selectedGame.host)}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">PLAYERS</span>
                      <span className="stat-value">{selectedGame.currentPlayers}/{selectedGame.maxPlayers}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">MOVES</span>
                      <span className="stat-value">{selectedGame.movesSubmitted}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">REVEAL ID</span>
                      <span className="stat-value monospace">
                        {selectedGame.revealRequestId === 0n ? '—' : `#${selectedGame.revealRequestId.toString().slice(0, 8)}`}
                      </span>
                    </div>
                  </div>

                  <div className="players-grid">
                    {selectedGame.players.map((player, index) => {
                      const revealedMove = selectedGame.revealedMoves[index];
                      const isWinner = selectedGame.winners.includes(player);
                      return (
                        <div key={player} className={`player-card ${isWinner ? 'winner' : ''}`}>
                          <div className="player-header">
                            <span className="monospace player-address">{shortenAddress(player)}</span>
                            {isWinner && <span className="badge winner-badge">★ WINNER ★</span>}
                          </div>
                          <p className="player-move">
                            {selectedGame.state === 4 && revealedMove
                              ? formatMove(revealedMove)
                              : playerState?.joined && address === player && playerState.moveSubmitted
                                ? '✓ SUBMITTED'
                                : '⏳ WAITING'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="crt-placeholder">
                  <div className="insert-coin">INSERT COIN</div>
                  <p className="crt-message">SELECT A GAME TO BEGIN</p>
                </div>
              )}
            </div>
            <div className="crt-scanlines"></div>
          </div>
        </section>

        {/* Control Panels */}
        <div className="control-deck">
          {/* Left Panel: Create Game */}
          <aside className="left-panel arcade-panel">
            <h2 className="panel-label">PLAYER 1</h2>
            <div className="panel-content">
              <h3 className="panel-title">CREATE GAME</h3>
              <label className="arcade-label" htmlFor="maxPlayers">
                PLAYERS:
              </label>
              <input
                id="maxPlayers"
                type="number"
                min={2}
                max={4}
                value={maxPlayers}
                onChange={event => setMaxPlayers(Number(event.target.value))}
                className="arcade-input"
              />
              <ArcadeButton
                onClick={handleCreateGame}
                disabled={isBusy || !isConnected || encryptionLoading}
                loading={actionState === 'create'}
                color="cyan"
              >
                {actionState === 'create' ? 'CREATING' : 'CREATE GAME'}
              </ArcadeButton>
              <ArcadeButton
                variant="secondary"
                onClick={() => { play('click'); triggerRefresh(); }}
                disabled={isRefreshing}
              >
                REFRESH
              </ArcadeButton>
            </div>
          </aside>

          {/* Center Panel: Move Controls */}
          <section className="center-panel arcade-panel">
            <h2 className="panel-label">CONTROLS</h2>
            <div className="panel-content">
              <h3 className="panel-title">SELECT MOVE</h3>
              <MoveSelector
                selectedMove={selectedMove}
                onSelectMove={handleMoveSelect}
                disabled={isBusy}
              />
              <div className="action-buttons">
                <ArcadeButton
                  onClick={handleJoinGame}
                  disabled={
                    isBusy ||
                    !isConnected ||
                    !selectedGame ||
                    playerState?.joined ||
                    selectedGame.state !== 0 ||
                    selectedGame.currentPlayers >= selectedGame.maxPlayers
                  }
                  color="green"
                  variant="secondary"
                >
                  {playerState?.joined ? 'JOINED' : actionState === 'join' ? 'JOINING' : 'JOIN GAME'}
                </ArcadeButton>
                <ArcadeButton
                  onClick={handleStartGame}
                  disabled={
                    isBusy ||
                    !isConnected ||
                    !selectedGame ||
                    address?.toLowerCase() !== selectedGame.host.toLowerCase() ||
                    selectedGame.state !== 1
                  }
                  color="yellow"
                  variant="secondary"
                >
                  {actionState === 'start' ? 'STARTING' : 'START GAME'}
                </ArcadeButton>
                <ArcadeButton
                  onClick={handleSubmitMove}
                  disabled={
                    isBusy ||
                    !isConnected ||
                    !playerState?.joined ||
                    playerState?.moveSubmitted ||
                    selectedGame?.state !== 2 ||
                    selectedMove === null ||
                    encryptionLoading
                  }
                  loading={actionState === 'submit'}
                  color="magenta"
                >
                  {playerState?.moveSubmitted
                    ? 'SUBMITTED'
                    : actionState === 'submit'
                      ? 'SUBMITTING'
                      : 'SUBMIT MOVE'}
                </ArcadeButton>
              </div>
              {playerStateLoading && <p className="helper-text">CHECKING STATUS...</p>}
            </div>
          </section>

          {/* Right Panel: Games List */}
          <aside className="right-panel arcade-panel">
            <h2 className="panel-label">ARCADE</h2>
            <div className="panel-content">
              <h3 className="panel-title">GAMES LIST</h3>
              {gamesLoading ? (
                <p className="placeholder-text">LOADING...</p>
              ) : games.length === 0 ? (
                <p className="placeholder-text">NO GAMES FOUND</p>
              ) : (
                <ul className="games-list">
                  {games.map(game => {
                    const isSelected = selectedGame?.id === game.id;
                    return (
                      <li key={game.id}>
                        <button
                          className={`game-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleGameSelect(game.id)}
                          disabled={isBusy}
                        >
                          <div className="game-item-row">
                            <span className="game-id">#{game.id}</span>
                            <span className={`badge state-${GAME_STATE_LABELS[game.state]?.toLowerCase() ?? 'unknown'}`}>
                              {GAME_STATE_LABELS[game.state] ?? 'N/A'}
                            </span>
                          </div>
                          <div className="game-item-row muted">
                            <span>{game.currentPlayers}/{game.maxPlayers} P</span>
                            <span>{game.movesSubmitted} M</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
