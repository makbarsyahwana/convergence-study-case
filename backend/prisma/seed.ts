import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', description: 'Platform administrator' },
    }),
    prisma.role.upsert({
      where: { name: 'EDITOR' },
      update: {},
      create: { name: 'EDITOR', description: 'Content editor' },
    }),
    prisma.role.upsert({
      where: { name: 'SUBSCRIBER' },
      update: {},
      create: { name: 'SUBSCRIBER', description: 'Regular subscriber' },
    }),
  ]);

  const [adminRole, editorRole, subscriberRole] = roles;
  console.log(`Created ${roles.length} roles`);

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@healthfulforu.com' },
    update: {},
    create: {
      email: 'admin@healthfulforu.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      roles: { create: { roleId: adminRole.id } },
      subscriptions: {
        create: { plan: 'YEARLY', status: 'ACTIVE' },
      },
    },
  });

  // Create editor user
  const editorPassword = await bcrypt.hash('Editor123!', 12);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@healthfulforu.com' },
    update: {},
    create: {
      email: 'editor@healthfulforu.com',
      password: editorPassword,
      firstName: 'Sarah',
      lastName: 'Editor',
      roles: { create: { roleId: editorRole.id } },
      subscriptions: {
        create: { plan: 'YEARLY', status: 'ACTIVE' },
      },
    },
  });

  // Create free user
  const freePassword = await bcrypt.hash('FreeUser123!', 12);
  const freeUser = await prisma.user.upsert({
    where: { email: 'free@example.com' },
    update: {},
    create: {
      email: 'free@example.com',
      password: freePassword,
      firstName: 'Free',
      lastName: 'User',
      roles: { create: { roleId: subscriberRole.id } },
      subscriptions: {
        create: { plan: 'FREE', status: 'ACTIVE' },
      },
    },
  });

  // Create premium user
  const premiumPassword = await bcrypt.hash('Premium123!', 12);
  const premiumUser = await prisma.user.upsert({
    where: { email: 'premium@example.com' },
    update: {},
    create: {
      email: 'premium@example.com',
      password: premiumPassword,
      firstName: 'Premium',
      lastName: 'User',
      roles: { create: { roleId: subscriberRole.id } },
      subscriptions: {
        create: { plan: 'MONTHLY', status: 'ACTIVE' },
      },
    },
  });

  console.log('Created 4 users (admin, editor, free, premium)');

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'nutrition' },
      update: {},
      create: {
        name: 'Nutrition',
        slug: 'nutrition',
        description: 'Diet, food science, and nutritional health',
      },
    }),
    prisma.tag.upsert({
      where: { slug: 'mental-health' },
      update: {},
      create: {
        name: 'Mental Health',
        slug: 'mental-health',
        description: 'Psychology, mindfulness, and emotional well-being',
      },
    }),
    prisma.tag.upsert({
      where: { slug: 'fitness' },
      update: {},
      create: {
        name: 'Fitness',
        slug: 'fitness',
        description: 'Exercise, workouts, and physical activity',
      },
    }),
    prisma.tag.upsert({
      where: { slug: 'preventive-care' },
      update: {},
      create: {
        name: 'Preventive Care',
        slug: 'preventive-care',
        description: 'Vaccinations, screenings, and disease prevention',
      },
    }),
    prisma.tag.upsert({
      where: { slug: 'chronic-disease' },
      update: {},
      create: {
        name: 'Chronic Disease',
        slug: 'chronic-disease',
        description: 'Diabetes, heart disease, and long-term conditions',
      },
    }),
  ]);

  console.log(`Created ${tags.length} tags`);

  // Create sample content
  const articles = [
    {
      title: '10 Simple Ways to Improve Your Daily Nutrition',
      slug: '10-simple-ways-improve-daily-nutrition',
      type: 'ARTICLE' as const,
      body: '<p>Good nutrition is the foundation of a healthy life. In the Asia Pacific region, dietary habits vary widely, but universal principles apply...</p><p>1. Start your day with a balanced breakfast...</p>',
      excerpt: 'Discover practical tips to improve your daily nutrition without overhauling your entire diet.',
      isPremium: false,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2024-01-15'),
      readTimeMinutes: 5,
      tagSlugs: ['nutrition'],
    },
    {
      title: 'Understanding Anxiety: A Comprehensive Guide',
      slug: 'understanding-anxiety-comprehensive-guide',
      type: 'ARTICLE' as const,
      body: '<p>Anxiety disorders affect millions across the Asia Pacific. This guide covers symptoms, causes, and evidence-based treatments...</p>',
      excerpt: 'Everything you need to know about anxiety disorders, from symptoms to treatment options.',
      isPremium: true,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2024-01-20'),
      readTimeMinutes: 12,
      tagSlugs: ['mental-health'],
    },
    {
      title: 'Home Workout Routines for Busy Professionals',
      slug: 'home-workout-routines-busy-professionals',
      type: 'VIDEO' as const,
      body: null,
      excerpt: '30-minute workout routines you can do at home with no equipment.',
      videoUrl: 'https://example.com/videos/home-workout.mp4',
      isPremium: false,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2024-02-01'),
      readTimeMinutes: 30,
      tagSlugs: ['fitness'],
    },
    {
      title: 'The Complete Guide to Heart Health Screening',
      slug: 'complete-guide-heart-health-screening',
      type: 'ARTICLE' as const,
      body: '<p>Heart disease remains the leading cause of death in many APAC countries. Regular screening can detect issues early...</p>',
      excerpt: 'Learn when and how to get screened for cardiovascular disease.',
      isPremium: true,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2024-02-10'),
      readTimeMinutes: 8,
      tagSlugs: ['preventive-care', 'chronic-disease'],
    },
    {
      title: 'Managing Type 2 Diabetes Through Diet',
      slug: 'managing-type-2-diabetes-through-diet',
      type: 'ARTICLE' as const,
      body: '<p>Diet plays a crucial role in managing Type 2 Diabetes. This article covers meal planning, glycemic index, and practical recipes...</p>',
      excerpt: 'Practical dietary strategies for managing Type 2 Diabetes effectively.',
      isPremium: true,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2024-02-15'),
      readTimeMinutes: 10,
      tagSlugs: ['nutrition', 'chronic-disease'],
    },
    {
      title: 'Meditation for Beginners: 5-Minute Daily Practice',
      slug: 'meditation-beginners-5-minute-daily-practice',
      type: 'VIDEO' as const,
      body: null,
      excerpt: 'Start your meditation journey with this beginner-friendly 5-minute guided session.',
      videoUrl: 'https://example.com/videos/meditation-beginners.mp4',
      isPremium: false,
      status: 'PUBLISHED' as const,
      publishedAt: new Date('2024-03-01'),
      readTimeMinutes: 5,
      tagSlugs: ['mental-health', 'fitness'],
    },
  ];

  for (const article of articles) {
    const { tagSlugs, ...data } = article;
    const content = await prisma.content.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        authorId: editor.id,
        thumbnailUrl: `https://placeholder.com/800x400?text=${encodeURIComponent(data.title.substring(0, 20))}`,
      },
    });

    for (const tagSlug of tagSlugs) {
      const tag = tags.find((t) => t.slug === tagSlug);
      if (tag) {
        await prisma.contentTag
          .upsert({
            where: {
              contentId_tagId: { contentId: content.id, tagId: tag.id },
            },
            update: {},
            create: { contentId: content.id, tagId: tag.id },
          })
          .catch(() => {});
      }
    }
  }

  console.log(`Created ${articles.length} sample content items`);

  // Create user preferences
  await prisma.userPreference
    .create({
      data: {
        userId: premiumUser.id,
        topicId: tags[0].id,
        emailDigest: true,
        language: 'en',
      },
    })
    .catch(() => {});

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
