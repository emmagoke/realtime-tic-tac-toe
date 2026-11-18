# Real-time Tic Tac Toe

A two-player Tic Tac Toe game played over WebSockets. The NestJS backend is the single source of truth: it validates every move, stores games, rounds and moves in PostgreSQL, forfeits idle players with BullMQ turn timers, and lets you replay any game move by move.

<!-- Add a screenshot or a short GIF of two browser windows playing: ![Gameplay](docs/gameplay.gif) -->

## Features

- **Real-time play** with Socket.IO. Create a game, share the 4-letter code, and the second player joins.
- **Server-authoritative rules.** Clients only send "I clicked cell N". The server checks turn order, cell state and the winner, so clients cannot cheat.
- **Reconnect and rejoin.** Close the tab or lose your connection and you return straight to your game. Players are identified by a signed JWT, not by a socket id.
- **Turn timer.** Each turn has a deadline. When it passes, a delayed BullMQ job forfeits the player on the clock.
- **Replays.** Every round and every move is stored, so a finished game can be stepped through or played back.
- **Concurrency-safe.** Each action runs in a transaction with a row lock, backed by unique constraints, so simultaneous clicks cannot corrupt a game.
- **Tested** with unit, service (real PostgreSQL) and WebSocket end-to-end tests.
- **Monitored** with Sentry for unexpected errors.

## Tech stack

| Area | Tools |
|---|---|
| Backend | NestJS 11, TypeScript, Socket.IO (`@nestjs/websockets`) |
| Database | PostgreSQL, TypeORM, migrations |
| Queue | BullMQ on Redis |
| Auth | JWT (`@nestjs/jwt`), anonymous guest identities |
| Frontend | Plain HTML, CSS and JavaScript served by Nest |
| Testing | Jest, `socket.io-client` |
| Monitoring | Sentry |
| Tooling | pnpm |

## How it works

```mermaid
sequenceDiagram
  participant B as Browser
  participant G as Gateway
  participant S as GameService
  participant DB as PostgreSQL
  participant Q as BullMQ (Redis)

  B->>G: makeMove { index }
  G->>S: makeMove(code, playerId, index)
  S->>DB: BEGIN, SELECT game FOR UPDATE
  S->>DB: INSERT move, UPDATE game
  S->>DB: COMMIT
  S->>Q: schedule turn-timeout (delayed job)
  S-->>G: new game state
  G-->>B: gameState (both players)
  Q-->>S: turn-timeout fires after the deadline
  S->>DB: forfeit only if this turn is still current
  S-->>B: gameState (winner by timeout)
```

### Data model

```mermaid
erDiagram
  PLAYERS ||--o{ GAME_PLAYERS : "joins"
  GAMES ||--|{ GAME_PLAYERS : "has 2"
  GAMES ||--o{ ROUNDS : "has"
  ROUNDS ||--o{ MOVES : "has"
  PLAYERS ||--o{ MOVES : "plays"

  GAMES {
    uuid id PK
    string code UK
    jsonb board
    string status
    string currentTurn
    int scoreX
    int scoreO
    int scoreTie
    timestamptz createdAt
    timestamptz updatedAt
  }
  GAME_PLAYERS {
    uuid gameId FK
    uuid playerId FK
    string mark "X or O"
  }
  ROUNDS {
    uuid id PK
    int roundNumber
    uuid winnerId FK
    string endReason
  }
  MOVES {
    int moveNumber
    int cellIndex
    string mark
  }
```

A *game* is a room that can hold several *rounds* (the New Game button starts a new round in the same room). Every move belongs to a round, which is what makes replay possible.

### Design decisions

- **The server decides.** The client's view is only a rendering of the state the server broadcasts.
- **One transaction per action with `SELECT ... FOR UPDATE`.** Concurrent actions on the same game are serialized, and unique constraints on `(round, moveNumber)`, `(round, cellIndex)` and `(game, mark)` are a second line of defence.
- **Identity is a JWT, verified in a Socket.IO middleware** before a connection exists, so a handler never runs for an unauthenticated socket.
- **Timers are stateless.** The deadline is stored on the game row. A delayed job carries that deadline, and when it fires it checks that the stored deadline still matches. A job from an earlier turn finds a different deadline and does nothing, so cancelling jobs is never required for correctness.
- **Timers are scheduled after the commit**, so a job can never fire before the data it depends on exists. The database is the source of truth, and the timer is best-effort.

## Getting started

### Prerequisites

- Node.js 22 or later and pnpm
- PostgreSQL 16 and Redis 7 (Docker commands below)

### Run it locally

```bash
git clone https://github.com/emmagoke/realtime-tic-tac-toe.git
cd realtime-tic-tac-toe
pnpm install

# Postgres and Redis
docker run --name tic-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tictactoe \
  -p 5432:5432 -d postgres:16
docker run --name tic-redis -p 6379:6379 -d redis:7

cp .env.example .env        # then edit the values
pnpm migration:run
pnpm start:dev
```

Open <http://localhost:3000>. To play against yourself, use two profiles in one browser: `http://localhost:3000/?as=alice` and `http://localhost:3000/?as=bob`. Each gets its own identity.

### Environment variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/tictactoe` |
| `DB_SSL` | Set to `true` for hosted databases that require SSL | `false` |
| `JWT_SECRET` | Long random string used to sign tokens (`openssl rand -base64 48`) | |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password, if any | |
| `TURN_SECONDS` | Seconds each player has per turn (default 30) | `30` |
| `SENTRY_DSN` | Sentry project DSN. Leave empty to disable | |

### Scripts

| Command | What it does |
|---|---|
| `pnpm start:dev` | Run with file watching |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Service and WebSocket tests against a real test database |
| `pnpm migration:generate src/database/migrations/Name` | Generate a migration from entity changes |
| `pnpm migration:run` / `pnpm migration:revert` | Apply or undo migrations |

## API

### WebSocket events (Socket.IO)

The token is sent in the handshake: `io({ auth: { token } })`.

| Client sends | Payload | Effect |
|---|---|---|
| `createGame` | | Create a game and become X |
| `joinGame` | `{ gameId }` | Join (or rejoin) a game by code |
| `makeMove` | `{ index }` | Play a cell, 0 to 8 |
| `rematch` | | Start a new round after a game ends |
| `resetScores` | | Reset the scoreboard |
| `leaveGame` | | Leave and abandon the game |

| Server sends | Payload |
|---|---|
| `ready` | `{ playerId }` after authentication |
| `joined` | `{ gameId, mark }` |
| `gameState` | Full game state, including `turnMsLeft` for the countdown |
| `left` | Confirms `leaveGame` |
| `exception` | `{ status, message }` for rejected actions |

### HTTP

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/guest` | Create an anonymous player and return a JWT |
| `GET` | `/games/mine` | The caller's recent games (Bearer token) |
| `GET` | `/games/:code/replay` | Rounds and moves of a game, players only (Bearer token) |

## Project structure

```
src/
├── auth/        # guest tokens, JWT verification, HTTP guard
├── players/     # Player entity
├── game/
│   ├── entities/    # Game, GamePlayer, Round, Move
│   ├── providers/   # GameService (rules, transactions, timers)
│   ├── game.gateway.ts
│   ├── game.controller.ts
│   ├── turn-timer.processor.ts
│   └── game.rules.ts
├── database/    # TypeORM config, data source, migrations
public/          # index.html, script.js, style.css
test/            # service and gateway end-to-end tests
```

## Testing

```bash
pnpm test                 # pure game rules
pnpm test:e2e             # needs Postgres and Redis running
```

The service tests run against a real PostgreSQL database, which is what catches locking and constraint problems that mocks hide. They cover win and tie detection, out-of-turn moves, rejoining, simultaneous duplicate moves, replay history and turn timeouts, including stale timer jobs.

## Error monitoring

Unexpected server errors and failed background jobs are reported to Sentry. Expected game-rule rejections (for example "Not your turn") are sent to the client as `exception` events and are not reported.

## Roadmap

- Docker Compose and a CI workflow (GitHub Actions) that runs the tests
- Deployment with infrastructure as code
- Email or OAuth accounts, with stats and a leaderboard
- Matchmaking queue and spectators
- Solo mode against a minimax bot
- Socket.IO Redis adapter for running several instances

## License

MIT
