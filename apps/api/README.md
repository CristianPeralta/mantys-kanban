# API

NestJS API for Mantys Kanban.

## Local E2E Setup

The e2e tests require a local PostgreSQL database. Before running `npm run test:e2e`:

1. Create the test database and push the schema:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mantys_kanban_test npx prisma db push
   ```
2. Copy `.env.test.example` to `.env.test` and fill in your credentials.
