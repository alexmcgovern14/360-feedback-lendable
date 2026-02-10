import { PrismaClient } from '@prisma/client';

// Try different connection string formats
const formats = [
  "postgresql://postgres:IwfLX6wFPk0l1j0B@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
  "postgresql://postgres.pcjjjpydenieeonnfngn:IwfLX6wFPk0l1j0B@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
  "postgresql://postgres:IwfLX6wFPk0l1j0B@db.pcjjjpydenieeonnfngn.supabase.co:5432/postgres",
];

for (const url of formats) {
  console.log(`\nTrying: ${url.replace(/:[^:@]+@/, ':***@')}`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ SUCCESS!');
    await prisma.$disconnect();
    break;
  } catch (error) {
    console.log(`✗ Failed: ${error.message.split('\n')[0]}`);
    await prisma.$disconnect();
  }
}
