import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// Skills taxonomy data organized by categories
const skillsData = [
  // Programming Languages
  { name: 'JavaScript', category: 'Programming Languages', description: 'Dynamic programming language for web development' },
  { name: 'TypeScript', category: 'Programming Languages', description: 'Typed superset of JavaScript' },
  { name: 'Python', category: 'Programming Languages', description: 'High-level programming language for various applications' },
  { name: 'Java', category: 'Programming Languages', description: 'Object-oriented programming language' },
  { name: 'C++', category: 'Programming Languages', description: 'Systems programming language' },
  { name: 'C#', category: 'Programming Languages', description: 'Microsoft .NET programming language' },
  { name: 'Go', category: 'Programming Languages', description: 'Google\'s systems programming language' },
  { name: 'Rust', category: 'Programming Languages', description: 'Systems programming language focused on safety' },
  { name: 'Swift', category: 'Programming Languages', description: 'Apple\'s programming language for iOS/macOS' },
  { name: 'Kotlin', category: 'Programming Languages', description: 'JetBrains programming language for Android/JVM' },

  // Frontend Technologies
  { name: 'React', category: 'Frontend Technologies', description: 'JavaScript library for building user interfaces' },
  { name: 'Vue.js', category: 'Frontend Technologies', description: 'Progressive JavaScript framework' },
  { name: 'Angular', category: 'Frontend Technologies', description: 'TypeScript-based web application framework' },
  { name: 'Next.js', category: 'Frontend Technologies', description: 'React framework for production applications' },
  { name: 'Svelte', category: 'Frontend Technologies', description: 'Compile-time JavaScript framework' },
  { name: 'HTML5', category: 'Frontend Technologies', description: 'Latest version of HyperText Markup Language' },
  { name: 'CSS3', category: 'Frontend Technologies', description: 'Latest version of Cascading Style Sheets' },
  { name: 'Tailwind CSS', category: 'Frontend Technologies', description: 'Utility-first CSS framework' },
  { name: 'SASS/SCSS', category: 'Frontend Technologies', description: 'CSS preprocessor with additional features' },

  // Backend Technologies
  { name: 'Node.js', category: 'Backend Technologies', description: 'JavaScript runtime for server-side development' },
  { name: 'Express.js', category: 'Backend Technologies', description: 'Web framework for Node.js' },
  { name: 'Django', category: 'Backend Technologies', description: 'Python web framework' },
  { name: 'Flask', category: 'Backend Technologies', description: 'Lightweight Python web framework' },
  { name: 'Spring Boot', category: 'Backend Technologies', description: 'Java framework for building applications' },
  { name: 'ASP.NET Core', category: 'Backend Technologies', description: 'Microsoft web framework' },
  { name: 'Ruby on Rails', category: 'Backend Technologies', description: 'Ruby web application framework' },
  { name: 'Laravel', category: 'Backend Technologies', description: 'PHP web application framework' },

  // Databases
  { name: 'PostgreSQL', category: 'Databases', description: 'Advanced open-source relational database' },
  { name: 'MySQL', category: 'Databases', description: 'Popular open-source relational database' },
  { name: 'MongoDB', category: 'Databases', description: 'NoSQL document database' },
  { name: 'Redis', category: 'Databases', description: 'In-memory data structure store' },
  { name: 'SQLite', category: 'Databases', description: 'Lightweight embedded database' },
  { name: 'Elasticsearch', category: 'Databases', description: 'Search and analytics engine' },

  // Cloud & DevOps
  { name: 'AWS', category: 'Cloud & DevOps', description: 'Amazon Web Services cloud platform' },
  { name: 'Google Cloud', category: 'Cloud & DevOps', description: 'Google Cloud Platform services' },
  { name: 'Azure', category: 'Cloud & DevOps', description: 'Microsoft Azure cloud services' },
  { name: 'Docker', category: 'Cloud & DevOps', description: 'Containerization platform' },
  { name: 'Kubernetes', category: 'Cloud & DevOps', description: 'Container orchestration system' },
  { name: 'CI/CD', category: 'Cloud & DevOps', description: 'Continuous Integration/Continuous Deployment' },
  { name: 'Terraform', category: 'Cloud & DevOps', description: 'Infrastructure as Code tool' },

  // Mobile Development
  { name: 'React Native', category: 'Mobile Development', description: 'Cross-platform mobile development framework' },
  { name: 'Flutter', category: 'Mobile Development', description: 'Google\'s UI toolkit for mobile apps' },
  { name: 'iOS Development', category: 'Mobile Development', description: 'Native iOS app development' },
  { name: 'Android Development', category: 'Mobile Development', description: 'Native Android app development' },

  // Data Science & AI
  { name: 'Machine Learning', category: 'Data Science & AI', description: 'Algorithms that learn from data' },
  { name: 'Deep Learning', category: 'Data Science & AI', description: 'Neural networks and advanced ML' },
  { name: 'Data Analysis', category: 'Data Science & AI', description: 'Extracting insights from data' },
  { name: 'TensorFlow', category: 'Data Science & AI', description: 'Google\'s machine learning framework' },
  { name: 'PyTorch', category: 'Data Science & AI', description: 'Facebook\'s machine learning framework' },
  { name: 'Pandas', category: 'Data Science & AI', description: 'Python data manipulation library' },
  { name: 'NumPy', category: 'Data Science & AI', description: 'Python numerical computing library' },

  // Design & UX
  { name: 'UI/UX Design', category: 'Design & UX', description: 'User interface and experience design' },
  { name: 'Figma', category: 'Design & UX', description: 'Collaborative design tool' },
  { name: 'Adobe XD', category: 'Design & UX', description: 'Adobe\'s UX design tool' },
  { name: 'Sketch', category: 'Design & UX', description: 'Digital design toolkit' },
  { name: 'Prototyping', category: 'Design & UX', description: 'Creating interactive design prototypes' },

  // Soft Skills
  { name: 'Problem Solving', category: 'Soft Skills', description: 'Analytical thinking and solution finding' },
  { name: 'Communication', category: 'Soft Skills', description: 'Effective verbal and written communication' },
  { name: 'Team Collaboration', category: 'Soft Skills', description: 'Working effectively in teams' },
  { name: 'Project Management', category: 'Soft Skills', description: 'Planning and executing projects' },
  { name: 'Leadership', category: 'Soft Skills', description: 'Guiding and inspiring others' },
  { name: 'Mentoring', category: 'Soft Skills', description: 'Teaching and guiding others' },
];

// Achievement data for gamification
const achievementsData = [
  // Learning Achievements
  {
    name: 'First Steps',
    description: 'Complete your first learning session',
    category: 'Learning',
    points: 10,
    rarity: 'common',
    iconUrl: '/achievements/first-steps.svg',
    criteria: { type: 'session_count', value: 1 }
  },
  {
    name: 'Quick Learner',
    description: 'Complete 5 learning sessions',
    category: 'Learning',
    points: 50,
    rarity: 'common',
    iconUrl: '/achievements/quick-learner.svg',
    criteria: { type: 'session_count', value: 5 }
  },
  {
    name: 'Dedicated Student',
    description: 'Complete 25 learning sessions',
    category: 'Learning',
    points: 200,
    rarity: 'rare',
    iconUrl: '/achievements/dedicated-student.svg',
    criteria: { type: 'session_count', value: 25 }
  },
  {
    name: 'Learning Master',
    description: 'Complete 100 learning sessions',
    category: 'Learning',
    points: 1000,
    rarity: 'epic',
    iconUrl: '/achievements/learning-master.svg',
    criteria: { type: 'session_count', value: 100 }
  },

  // Teaching Achievements
  {
    name: 'First Mentor',
    description: 'Complete your first teaching session',
    category: 'Teaching',
    points: 15,
    rarity: 'common',
    iconUrl: '/achievements/first-mentor.svg',
    criteria: { type: 'teaching_session_count', value: 1 }
  },
  {
    name: 'Knowledge Sharer',
    description: 'Complete 10 teaching sessions',
    category: 'Teaching',
    points: 100,
    rarity: 'rare',
    iconUrl: '/achievements/knowledge-sharer.svg',
    criteria: { type: 'teaching_session_count', value: 10 }
  },
  {
    name: 'Master Teacher',
    description: 'Complete 50 teaching sessions',
    category: 'Teaching',
    points: 500,
    rarity: 'epic',
    iconUrl: '/achievements/master-teacher.svg',
    criteria: { type: 'teaching_session_count', value: 50 }
  },

  // Skill Achievements
  {
    name: 'Skill Explorer',
    description: 'Learn 3 different skills',
    category: 'Skills',
    points: 30,
    rarity: 'common',
    iconUrl: '/achievements/skill-explorer.svg',
    criteria: { type: 'skills_learned', value: 3 }
  },
  {
    name: 'Polyglot',
    description: 'Learn 5 programming languages',
    category: 'Skills',
    points: 150,
    rarity: 'rare',
    iconUrl: '/achievements/polyglot.svg',
    criteria: { type: 'programming_languages', value: 5 }
  },
  {
    name: 'Full Stack',
    description: 'Learn both frontend and backend technologies',
    category: 'Skills',
    points: 200,
    rarity: 'rare',
    iconUrl: '/achievements/full-stack.svg',
    criteria: { type: 'full_stack_skills', value: 1 }
  },

  // Engagement Achievements
  {
    name: 'Social Butterfly',
    description: 'Connect with 10 different learning partners',
    category: 'Social',
    points: 75,
    rarity: 'common',
    iconUrl: '/achievements/social-butterfly.svg',
    criteria: { type: 'unique_partners', value: 10 }
  },
  {
    name: 'Community Builder',
    description: 'Receive 50 positive ratings',
    category: 'Social',
    points: 250,
    rarity: 'rare',
    iconUrl: '/achievements/community-builder.svg',
    criteria: { type: 'positive_ratings', value: 50 }
  },

  // Streak Achievements
  {
    name: 'Consistent Learner',
    description: 'Maintain a 7-day learning streak',
    category: 'Consistency',
    points: 100,
    rarity: 'rare',
    iconUrl: '/achievements/consistent-learner.svg',
    criteria: { type: 'learning_streak', value: 7 }
  },
  {
    name: 'Unstoppable',
    description: 'Maintain a 30-day learning streak',
    category: 'Consistency',
    points: 500,
    rarity: 'epic',
    iconUrl: '/achievements/unstoppable.svg',
    criteria: { type: 'learning_streak', value: 30 }
  },
  {
    name: 'Legend',
    description: 'Maintain a 100-day learning streak',
    category: 'Consistency',
    points: 2000,
    rarity: 'legendary',
    iconUrl: '/achievements/legend.svg',
    criteria: { type: 'learning_streak', value: 100 }
  },

  // Special Achievements
  {
    name: 'Early Adopter',
    description: 'Join SkillSync in its first month',
    category: 'Special',
    points: 100,
    rarity: 'rare',
    iconUrl: '/achievements/early-adopter.svg',
    criteria: { type: 'early_adopter', value: 1 }
  },
  {
    name: 'Perfect Session',
    description: 'Receive a 5-star rating in a session',
    category: 'Quality',
    points: 25,
    rarity: 'common',
    iconUrl: '/achievements/perfect-session.svg',
    criteria: { type: 'perfect_rating', value: 1 }
  },
  {
    name: 'Excellence Standard',
    description: 'Maintain a 4.5+ average rating over 20 sessions',
    category: 'Quality',
    points: 300,
    rarity: 'epic',
    iconUrl: '/achievements/excellence-standard.svg',
    criteria: { type: 'high_average_rating', sessions: 20, rating: 4.5 }
  }
];

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing data...');
      await prisma.userAchievement.deleteMany();
      await prisma.achievement.deleteMany();
      await prisma.userSkill.deleteMany();
      await prisma.skill.deleteMany();
      console.log('✅ Existing data cleared');
    }

    // Seed skills
    console.log('🎯 Seeding skills...');
    const createdSkills = await Promise.all(
      skillsData.map(skill =>
        prisma.skill.create({
          data: skill
        })
      )
    );
    console.log(`✅ Created ${createdSkills.length} skills`);

    // Seed achievements
    console.log('🏆 Seeding achievements...');
    const createdAchievements = await Promise.all(
      achievementsData.map(achievement =>
        prisma.achievement.create({
          data: achievement
        })
      )
    );
    console.log(`✅ Created ${createdAchievements.length} achievements`);

    console.log('🎉 Database seeding completed successfully!');

    // Print summary
    console.log('\n📊 Seed Summary:');
    console.log(`Skills by category:`);
    const skillsByCategory = skillsData.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(skillsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} skills`);
    });

    console.log(`\nAchievements by category:`);
    const achievementsByCategory = achievementsData.reduce((acc, achievement) => {
      acc[achievement.category] = (acc[achievement.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(achievementsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} achievements`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });