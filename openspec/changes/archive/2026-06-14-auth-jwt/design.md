# Design: auth-jwt — JWT Authentication (issue #14)

Reconstructed from Engram observation id 166.

## Technical Approach

Canonical NestJS JWT pattern (Passport). New `AuthModule` imports `JwtModule.registerAsync` (secret via `ConfigService`), `PassportModule`, and `UsersModule`. `AuthService` orchestrates register (delegates to `UsersService.create`) and login (`UsersService.findByEmail` + `bcrypt.compare` + `JwtService.sign`). Password hashing lives in `UsersService.create()` so EVERY creation path hashes consistently. `JwtStrategy.validate()` rebuilds the request user from `AuthTokenPayload`. `JwtAuthGuard extends AuthGuard('jwt')` is built/exported but only wired to one demonstrator route `GET /auth/profile`.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Hash location | `UsersService.create()` | Hash in AuthService/controller | Covers POST /users + register; no path can store plaintext |
| Module wiring | AuthModule imports UsersModule (exports UsersService) | Duplicate Prisma user logic in AuthService | Single source of truth; canonical Nest DI |
| Secret source | `ConfigService.get('JWT_SECRET')` via registerAsync | `process.env` direct | Testable, global ConfigModule already loaded |
| Guard scope | Only `GET /auth/profile` | Global APP_GUARD | Keeps existing Task/User/Project e2e green (out of scope) |
| Role type | Prisma `Role` (`@prisma/client`) | `packages/types` Role enum | Existing DTO/spec already use Prisma Role; avoid enum mismatch |
| Token shape | reuse `AuthTokenPayload`/`LoginResponse` from packages/types | new local types | No duplication (though @mantys/types not linked — used a local mirror interface, tech debt) |

## Module Dependency Graph

```
AppModule
 └─ AuthModule
     ├─ JwtModule (registerAsync → ConfigService)
     ├─ PassportModule
     └─ UsersModule (exports UsersService)
            └─ PrismaModule (@Global)
```

## Data Flow

```
register: Controller → AuthService.register → UsersService.create (bcrypt.hash) → Prisma → user (no password)
login:    Controller → AuthService.login → UsersService.findByEmail (incl password)
          → bcrypt.compare → JwtService.sign(AuthTokenPayload) → { accessToken, user }
protected:Request(Bearer) → JwtAuthGuard → JwtStrategy.validate(payload) → req.user
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/auth/auth.module.ts` | Create | Wires JwtModule(registerAsync)/PassportModule/UsersModule; providers AuthService+JwtStrategy; controller AuthController |
| `apps/api/src/auth/auth.service.ts` | Create | `register(dto)`, `login(dto)`, `validateUser(email,pwd)` |
| `apps/api/src/auth/auth.controller.ts` | Create | POST /auth/register, POST /auth/login, GET /auth/profile (guarded) |
| `apps/api/src/auth/jwt.strategy.ts` | Create | PassportStrategy(Strategy); fromAuthHeaderAsBearerToken; validate() |
| `apps/api/src/auth/jwt-auth.guard.ts` | Create | `JwtAuthGuard extends AuthGuard('jwt')` |
| `apps/api/src/auth/auth.service.spec.ts` | Create | Unit tests (mock UsersService, JwtService, bcrypt) |
| `apps/api/src/dto/login.dto.ts` | Create | email + password validators |
| `apps/api/test/auth.e2e-spec.ts` | Create | register→login→profile happy path + 401 |
| `apps/api/src/users/users.service.ts` | Modify | bcrypt.hash in create(); add findByEmail() returning password |
| `apps/api/src/users/users.module.ts` | Modify | add `exports: [UsersService]` |
| `apps/api/src/users/users.service.spec.ts` | Modify | create() asserts hashed value (not raw dto); add findByEmail tests |
| `apps/api/src/app.module.ts` | Modify | import AuthModule |
| `apps/api/src/main.ts` | Modify | `.addBearerAuth()` on DocumentBuilder |
| `apps/api/package.json` | Modify | add auth deps + @types |
| `.env`, `.env.test` | Modify | add JWT_SECRET |

## Interfaces / Signatures

```ts
// dto/login.dto.ts
export class LoginDto { @IsEmail() email: string; @IsString() @MinLength(6) password: string; }

// users.service.ts (additions)
async create(dto: CreateUserDto)        // hashes dto.password via bcrypt.hash(pwd, 10) before prisma.create
async findByEmail(email: string)        // prisma.user.findUnique({ where:{email} }) — NO select (password included), may return null

// auth.service.ts
constructor(private users: UsersService, private jwt: JwtService)
async register(dto: CreateUserDto): Promise<LoginResponse>   // create() then signs token
async validateUser(email: string, pwd: string): Promise<UserSafe>  // findByEmail + bcrypt.compare, throws UnauthorizedException
async login(dto: LoginDto): Promise<LoginResponse>           // validateUser → sign(payload)
private sign(user): string                                   // jwt.sign({ sub, email, role })

// jwt.strategy.ts
constructor(config: ConfigService)  // secretOrKey: config.get('JWT_SECRET'), jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
async validate(payload: AuthTokenPayload): Promise<{ id; email; role }>  // returns req.user

// jwt-auth.guard.ts
export class JwtAuthGuard extends AuthGuard('jwt') {}

// auth.controller.ts
@Post('register') register(@Body() dto: CreateUserDto)
@Post('login')    login(@Body() dto: LoginDto)
@UseGuards(JwtAuthGuard) @Get('profile') profile(@Req() req)  // returns req.user
```

## JWT Payload

`AuthTokenPayload`-shaped: `{ sub: string (user.id), email: string, role: Role }`. Signed with HS256, secret = JWT_SECRET. Strategy `validate()` maps `sub → id`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (auth.service.spec) | register hashes+signs, login success returns token+user, login bad pwd → Unauthorized, unknown email → Unauthorized | Mock UsersService + JwtService; `jest.mock('bcrypt')` for deterministic hash/compare |
| Unit (users.service.spec, updated) | create() calls prisma with HASHED password (not raw dto); findByEmail returns user incl password / null | Spy `bcrypt.hash` → fixed hash; assert prisma.create data.password === hash, not dto.password |
| E2E (auth.e2e-spec) | register→login→GET /auth/profile 200; profile without/invalid token → 401; password never in responses | Supertest against full app; real Jwt; JWT_SECRET from .env.test |

## Package Install

```
npm --workspace apps/api install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm --workspace apps/api install -D @types/passport-jwt @types/bcrypt
```

`@nestjs/passport` pinned to `10.0.3` (11.x requires NestJS 10+; this codebase is on NestJS 9.x).

## Migration / Rollout

No DB migration — `password String` already existed on the User model. Existing plaintext dev rows won't validate via bcrypt.compare post-change; acceptable (no production data at this point). Revert = remove `src/auth/*`, `login.dto.ts`, undo edits, uninstall packages.
