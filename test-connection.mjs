import { PrismaClient } from '@prisma/client';

const testUrls = {
  'pooler-basic': "postgresql://postgres.pcjjjpydenieeonnfngn:Cambiasso19%21%28@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  'pooler-sslmode': "postgresql://postgres.pcjjjpydenieeonnfngn:Cambiasso19%21%28@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require",
  'direct-basic': "postgresql://postgres:Cambiasso19%21%28@db.pcjjjpydenieeonnfngn.supabase.co:5432/postgres",
  'direct-sslmode': "postgresql://postgres:Cambiasso19%21%28@db.pcjjjpydenieeonnfngn.supabase.co:5432/postgres?sslmode=require"
};

for (const [name, url] of Object.entries(testUrls)) {
  console.log(`\nTesting ${name}...`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`✓ ${name} SUCCESS!`);
    await prisma.$disconnect();
  } catch (error) {
    console.log(`✗ ${name} failed: ${error.message.split('\n')[0]}`);
    await prisma.$disconnect();
  }
}
