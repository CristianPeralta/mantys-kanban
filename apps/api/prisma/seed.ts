import { config } from 'dotenv'
config()

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hashedOwner = await bcrypt.hash('password123', 10)
  const hashedMember = await bcrypt.hash('password123', 10)

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

  console.log('Seed complete — owner@mantys.dev / member@mantys.dev (password: password123)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
