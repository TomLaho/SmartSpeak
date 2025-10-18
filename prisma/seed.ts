import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@smartspeak.app';
  const password = '$2a$10$1JfD0uYVOlJawVS.wGInxezY6SY3n17sSmbDUAX5fnllUzVnZaB2K'; // "password123"

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: 'Demo Speaker'
    }
  });

  await prisma.tip.deleteMany({ where: { recording: { userId: user.id } } });
  await prisma.metrics.deleteMany({ where: { recording: { userId: user.id } } });
  await prisma.recording.deleteMany({ where: { userId: user.id } });

  const recordings = await prisma.$transaction(
    [0, 1, 2].map((index) =>
      prisma.recording.create({
        data: {
          userId: user.id,
          title: `Practice Session ${index + 1}`,
          originalUrl: `/uploads/demo-session-${index + 1}.mp4`,
          audioUrl: `/uploads/demo-session-${index + 1}.wav`,
          durationSec: 240 + index * 30,
          transcript:
            'Good morning everyone and thank you for joining. Today we will walk through the latest project update and next steps.',
          language: 'en',
          createdAt: subDays(new Date(), (2 - index) * 3)
        }
      })
    )
  );

  for (const [i, recording] of recordings.entries()) {
    const wpm = 120 + i * 8;
    const fillerRate = i === 0 ? 3.2 : i === 1 ? 2.4 : 1.2;
    await prisma.metrics.create({
      data: {
        recordingId: recording.id,
        wpm,
        wpmStdDev: 14 - i * 3,
        fillerCount: Math.round((recording.durationSec / 60) * fillerRate),
        fillerRate,
        avgPauseMs: 400 + i * 80,
        clarityScore: 68 + i * 5,
        readability: 64 + i * 4,
        fillersJson: [{ word: 'um', timestamps: [12.4, 45.8, 89.2 - i * 5] }],
        pausesJson: [
          { start: 34.2, end: 35.0 },
          { start: 78.9, end: 80.0 }
        ]
      }
    });

    await prisma.tip.createMany({
      data: [
        {
          recordingId: recording.id,
          category: 'Filler',
          text: 'Pause for a silent count instead of saying “um” when collecting your thoughts.',
          priority: 1
        },
        {
          recordingId: recording.id,
          category: 'Pace',
          text: 'Highlight key transitions in your outline to encourage intentional pauses.',
          priority: 2
        }
      ]
    });
  }

  console.log('Seed completed');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
