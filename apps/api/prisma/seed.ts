import { config } from 'dotenv'
config()
if (!process.env.DATABASE_URL) config({ path: '.env.test', override: false })

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Contención post-pentest 2026-09-02: el seed traía password123 hardcodeado
  // y se corrio en produccion. Nunca correrlo ahi -- creaba un OWNER de facto.
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed skipped: NODE_ENV=production. Crear usuarios via POST /users como OWNER.')
    return
  }

  const seedPassword = process.env.SEED_PASSWORD ?? 'password123'
  const hashedOwner = await bcrypt.hash(seedPassword, 10)
  const hashedMember = await bcrypt.hash(seedPassword, 10)

  await prisma.user.upsert({
    where: { email: 'owner@mantys.dev' },
    update: {},
    create: {
      email: 'owner@mantys.dev',
      password: hashedOwner,
      name: 'Owner User',
      role: 'OWNER',
    },
  })

  await prisma.user.upsert({
    where: { email: 'member@mantys.dev' },
    update: {},
    create: {
      email: 'member@mantys.dev',
      password: hashedMember,
      name: 'Member User',
      role: 'MEMBER',
    },
  })

  console.log(`Seed complete — owner@mantys.dev / member@mantys.dev (password: ${seedPassword})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
