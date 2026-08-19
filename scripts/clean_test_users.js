const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.deleteMany({ where: { email: { contains: 'test_user_' } } })
  .then(r => console.log('Cleaned test users:', r.count))
  .catch(console.error)
  .finally(() => p.$disconnect());
