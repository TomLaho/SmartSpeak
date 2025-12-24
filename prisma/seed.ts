import { PrismaClient, Plan, SessionMode, SessionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { id: 'demo-user' },
    update: {},
    create: {
      id: 'demo-user',
      email: 'demo@smartspeak.local',
      plan: Plan.FREE,
      lifetimeSessionsUsed: 1,
      sessions: {
        create: {
          title: 'Welcome to SmartSpeak',
          mode: SessionMode.FREE,
          audioKey: 'demo/audio.wav',
          audioMimeType: 'audio/wav',
          transcript: 'Hello! This is a demo transcript to show you how SmartSpeak works.',
          metrics: {
            totalWords: 14,
            wordsPerMinute: 120,
            fillerCounts: { countTotal: 0, perMinute: 0, per100Words: 0, breakdown: {} },
            smartSpeakScore: 82,
          },
          feedback: {
            strengths: ['Friendly tone', 'Clear diction'],
            improvements: ['Add more structure'],
            quickWins: ['Use signposts like first, next, finally'],
            paceFeedback: 'Great pace around 120 WPM.',
            clarityFeedback: 'Articulation is clean.',
            structureFeedback: 'Add an intro and conclusion.',
            confidenceFeedback: 'Steady voice, keep it up!',
            overallSummary: 'Promising start!'
          },
          status: SessionStatus.COMPLETED,
        }
      }
    }
  });

  console.log({ demoUser });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
