const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Default User (Member)
  const user = await prisma.user.upsert({
    where: { email: 'demo@trellia.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@trellia.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo'
    },
  });

  // 2. Create Sample Board
  const board = await prisma.board.create({
    data: {
      title: 'Project Alpha',
      color: '#0079bf',
    },
  });

  // 3. Create Lists
  const listTodo = await prisma.list.create({
    data: {
      title: 'To Do',
      position: 1000,
      boardId: board.id,
    },
  });

  const listInProgress = await prisma.list.create({
    data: {
      title: 'In Progress',
      position: 2000,
      boardId: board.id,
    },
  });

  const listDone = await prisma.list.create({
    data: {
      title: 'Done',
      position: 3000,
      boardId: board.id,
    },
  });

  // 4. Create Labels
  const labelBug = await prisma.label.create({
    data: { title: 'Bug', color: '#ef4444' }
  });
  
  const labelFeature = await prisma.label.create({
    data: { title: 'Feature', color: '#3b82f6' }
  });

  // 5. Create Cards
  const card1 = await prisma.card.create({
    data: {
      title: 'Set up Next.js frontend',
      description: 'Initialize with Tailwind and necessary dependencies.',
      position: 1000,
      listId: listDone.id,
      labels: {
        connect: [{ id: labelFeature.id }]
      },
      members: {
        connect: [{ id: user.id }]
      }
    }
  });

  const card2 = await prisma.card.create({
    data: {
      title: 'Configure Prisma schema',
      description: 'Write models for Board, List, Card, Checklist, etc.',
      position: 1000,
      listId: listInProgress.id,
      labels: {
        connect: [{ id: labelFeature.id }]
      },
      members: {
        connect: [{ id: user.id }]
      }
    }
  });

  const card3 = await prisma.card.create({
    data: {
      title: 'Implement Drag and Drop',
      description: '@hello-pangea/dnd needs to be integrated for lists and cards.',
      position: 1000,
      listId: listTodo.id,
      labels: {
        connect: [{ id: labelFeature.id }]
      }
    }
  });

  const card4 = await prisma.card.create({
    data: {
      title: 'Fix board scrolling bug',
      description: 'Horizontal scroll is not working when there are too many lists.',
      position: 2000,
      listId: listTodo.id,
      labels: {
        connect: [{ id: labelBug.id }]
      }
    }
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
