// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHEROckPaperScissors
/// @notice Multiplayer Rock-Paper-Scissors using Zama's FHEVM.
contract FHEROckPaperScissors is SepoliaConfig {
    enum GameState {
        Open,
        Ready,
        Started,
        Revealing,
        Revealed
    }

    struct PlayerState {
        bool joined;
        bool moveSubmitted;
        bool moveRevealed;
        euint8 encryptedMove;
        uint8 revealedMove;
    }

    struct Game {
        address host;
        uint8 maxPlayers;
        GameState state;
        uint8 movesSubmitted;
        uint256 revealRequestId;
        address[] players;
        address[] winners;
        uint8[] revealedMoves;
    }

    error InvalidPlayerLimit();
    error GameNotFound(uint256 gameId);
    error GameStateMismatch(uint256 gameId, GameState expected, GameState actual);
    error PlayerAlreadyJoined(uint256 gameId, address player);
    error GameIsFull(uint256 gameId);
    error PlayerNotInGame(uint256 gameId, address player);
    error MoveAlreadySubmitted(uint256 gameId, address player);
    error InvalidMoveValue(uint8 move);
    error InvalidRevealRequest(uint256 requestId);
    error UnexpectedResultLength(uint256 expected, uint256 actual);
    error InvalidOracleAddress();
    error Unauthorized(address sender);

    event GameCreated(uint256 indexed gameId, address indexed host, uint8 maxPlayers);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameReady(uint256 indexed gameId);
    event GameStarted(uint256 indexed gameId, address indexed starter);
    event MoveSubmitted(uint256 indexed gameId, address indexed player);
    event RevealRequested(uint256 indexed gameId, uint256 requestId);
    event GameRevealed(uint256 indexed gameId, address[] winners, uint8 winningMove);

    uint256 private _nextGameId;
    address public immutable decryptionOracle;

    mapping(uint256 gameId => Game game) private _games;
    mapping(uint256 gameId => mapping(address player => PlayerState state)) private _playerStates;
    mapping(uint256 requestId => uint256 encodedGame) private _requestToGame;

    constructor(address oracleAddress) {
        if (oracleAddress == address(0)) {
            revert InvalidOracleAddress();
        }
        decryptionOracle = oracleAddress;
    }

    /// @notice Create a new game and join as the host.
    /// @param maxPlayers Number of participants allowed (2-4).
    /// @return gameId Identifier of the newly created game.
    function createGame(uint8 maxPlayers) external returns (uint256 gameId) {
        if (maxPlayers < 2 || maxPlayers > 4) {
            revert InvalidPlayerLimit();
        }

        gameId = _nextGameId;
        _nextGameId++;

        Game storage game = _games[gameId];
        game.host = msg.sender;
        game.maxPlayers = maxPlayers;
        game.state = GameState.Open;
        game.players.push(msg.sender);

        PlayerState storage state = _playerStates[gameId][msg.sender];
        state.joined = true;

        emit GameCreated(gameId, msg.sender, maxPlayers);
        emit PlayerJoined(gameId, msg.sender);
    }

    /// @notice Join an open game.
    /// @param gameId Identifier of the game.
    function joinGame(uint256 gameId) external {
        Game storage game = _getExistingGame(gameId);
        if (game.state != GameState.Open) {
            revert GameStateMismatch(gameId, GameState.Open, game.state);
        }

        PlayerState storage state = _playerStates[gameId][msg.sender];
        if (state.joined) {
            revert PlayerAlreadyJoined(gameId, msg.sender);
        }

        if (game.players.length >= game.maxPlayers) {
            revert GameIsFull(gameId);
        }

        state.joined = true;
        game.players.push(msg.sender);

        emit PlayerJoined(gameId, msg.sender);

        if (game.players.length == game.maxPlayers) {
            game.state = GameState.Ready;
            emit GameReady(gameId);
        }
    }

    /// @notice Start a ready game once all seats are filled.
    /// @param gameId Identifier of the game.
    function startGame(uint256 gameId) external {
        Game storage game = _getExistingGame(gameId);
        if (msg.sender != game.host) {
            revert Unauthorized(msg.sender);
        }
        if (game.state != GameState.Ready) {
            revert GameStateMismatch(gameId, GameState.Ready, game.state);
        }

        game.state = GameState.Started;
        emit GameStarted(gameId, msg.sender);
    }

    /// @notice Submit an encrypted move for the calling player.
    /// @param gameId Identifier of the game.
    /// @param encryptedMove Encrypted move handle (1 rock, 2 paper, 3 scissors).
    /// @param inputProof Proof associated with the encrypted input.
    function submitMove(uint256 gameId, externalEuint8 encryptedMove, bytes calldata inputProof) external {
        Game storage game = _getExistingGame(gameId);
        if (game.state != GameState.Started) {
            revert GameStateMismatch(gameId, GameState.Started, game.state);
        }

        PlayerState storage state = _playerStates[gameId][msg.sender];
        if (!state.joined) {
            revert PlayerNotInGame(gameId, msg.sender);
        }
        if (state.moveSubmitted) {
            revert MoveAlreadySubmitted(gameId, msg.sender);
        }

        euint8 encryptedChoice = FHE.fromExternal(encryptedMove, inputProof);
        state.encryptedMove = encryptedChoice;
        state.moveSubmitted = true;

        FHE.allowThis(encryptedChoice);
        FHE.allow(encryptedChoice, msg.sender);

        game.movesSubmitted += 1;
        emit MoveSubmitted(gameId, msg.sender);

        if (game.movesSubmitted == game.maxPlayers) {
            _finalizeSubmissions(gameId, game);
        }
    }

    /// @notice Called by the Zama decryption oracle with the plaintext moves.
    /// @param requestId Identifier of the decryption request.
    /// @param cleartexts Packed decrypted moves, 32 bytes per value.
    /// @param decryptionProof Proof bundle from the KMS.
    function handleDecryptionResult(
        uint256 requestId,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        if (msg.sender != decryptionOracle) {
            revert Unauthorized(msg.sender);
        }

        uint256 encodedGame = _requestToGame[requestId];
        if (encodedGame == 0) {
            revert InvalidRevealRequest(requestId);
        }

        uint256 gameId = encodedGame - 1;
        Game storage game = _getExistingGame(gameId);
        if (game.revealRequestId != requestId) {
            revert InvalidRevealRequest(requestId);
        }
        if (game.state != GameState.Revealing) {
            revert GameStateMismatch(gameId, GameState.Revealing, game.state);
        }

        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint256 expectedLength = game.players.length * 32;
        if (cleartexts.length != expectedLength) {
            revert UnexpectedResultLength(expectedLength, cleartexts.length);
        }

        delete game.revealedMoves;
        delete game.winners;

        bytes memory plaintext = cleartexts;

        bool hasRock;
        bool hasPaper;
        bool hasScissors;

        uint256 playerCount = game.players.length;
        for (uint256 i = 0; i < playerCount; i++) {
            bytes32 word;
            assembly {
                word := mload(add(add(plaintext, 0x20), mul(i, 0x20)))
            }
            uint8 moveValue = uint8(uint256(word));
            if (moveValue < 1 || moveValue > 3) {
                revert InvalidMoveValue(moveValue);
            }

            address playerAddress = game.players[i];
            PlayerState storage state = _playerStates[gameId][playerAddress];
            state.moveRevealed = true;
            state.revealedMove = moveValue;

            game.revealedMoves.push(moveValue);

            if (moveValue == 1) {
                hasRock = true;
            } else if (moveValue == 2) {
                hasPaper = true;
            } else if (moveValue == 3) {
                hasScissors = true;
            }
        }

        uint8 winningMove = _determineWinningMove(hasRock, hasPaper, hasScissors);

        if (winningMove != 0) {
            for (uint256 i = 0; i < playerCount; i++) {
                if (game.revealedMoves[i] == winningMove) {
                    game.winners.push(game.players[i]);
                }
            }
        }

        delete _requestToGame[requestId];
        game.state = GameState.Revealed;
        emit GameRevealed(gameId, game.winners, winningMove);
    }

    /// @notice Returns information about a game.
    function getGame(uint256 gameId)
        external
        view
        returns (
            address host,
            uint8 maxPlayers,
            uint8 currentPlayers,
            uint8 movesSubmitted,
            uint8 state,
            address[] memory players,
            address[] memory winners,
            uint8[] memory revealedMoves,
            uint256 revealRequestId
        )
    {
        Game storage game = _getExistingGame(gameId);
        host = game.host;
        maxPlayers = game.maxPlayers;
        currentPlayers = uint8(game.players.length);
        movesSubmitted = game.movesSubmitted;
        state = uint8(game.state);
        players = _copyAddresses(game.players);
        winners = _copyAddresses(game.winners);
        revealedMoves = _copyUint8(game.revealedMoves);
        revealRequestId = game.revealRequestId;
    }

    /// @notice Returns information about a player within a game.
    function getPlayerState(uint256 gameId, address player)
        external
        view
        returns (bool joined, bool moveSubmitted, bool moveRevealed, uint8 revealedMove, euint8 encryptedMove)
    {
        PlayerState storage state = _playerStates[gameId][player];
        joined = state.joined;
        moveSubmitted = state.moveSubmitted;
        moveRevealed = state.moveRevealed;
        revealedMove = state.revealedMove;
        encryptedMove = state.encryptedMove;
    }

    /// @notice Returns the total number of games created so far.
    function totalGames() external view returns (uint256) {
        return _nextGameId;
    }

    function _finalizeSubmissions(uint256 gameId, Game storage game) private {
        game.state = GameState.Revealing;

        uint256 playerCount = game.players.length;
        bytes32[] memory handles = new bytes32[](playerCount);
        for (uint256 i = 0; i < playerCount; i++) {
            PlayerState storage state = _playerStates[gameId][game.players[i]];
            handles[i] = FHE.toBytes32(state.encryptedMove);
        }

        uint256 requestId = FHE.requestDecryption(handles, this.handleDecryptionResult.selector);
        game.revealRequestId = requestId;
        _requestToGame[requestId] = gameId + 1;

        emit RevealRequested(gameId, requestId);
    }

    function _determineWinningMove(bool hasRock, bool hasPaper, bool hasScissors) private pure returns (uint8) {
        uint8 distinctMoves;
        if (hasRock) distinctMoves++;
        if (hasPaper) distinctMoves++;
        if (hasScissors) distinctMoves++;

        if (distinctMoves != 2) {
            return 0;
        }

        if (hasRock && hasPaper) {
            return 2;
        }
        if (hasPaper && hasScissors) {
            return 3;
        }
        if (hasRock && hasScissors) {
            return 1;
        }
        return 0;
    }

    function _getExistingGame(uint256 gameId) private view returns (Game storage) {
        Game storage game = _games[gameId];
        if (game.host == address(0)) {
            revert GameNotFound(gameId);
        }
        return game;
    }

    function _copyAddresses(address[] storage source) private view returns (address[] memory result) {
        uint256 length = source.length;
        result = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = source[i];
        }
    }

    function _copyUint8(uint8[] storage source) private view returns (uint8[] memory result) {
        uint256 length = source.length;
        result = new uint8[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = source[i];
        }
    }
}
