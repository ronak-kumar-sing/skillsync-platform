// Database connection test script
import prisma, { checkDatabaseConnection } from './prisma';
import { initializeDatabase } from './db-init';

/**
 * Test database connection and basic operations
 */
export async function testDatabaseSetup(): Promise<void> {
  try {
    console.log('🧪 Testing database setup...');

    // Test 1: Initialize database
    await initializeDatabase();

    // Test 2: Check connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    // Test 3: Test basic query (count skills)
    const skillCount = await prisma.skill.count();
    console.log(`✅ Skills in database: ${skillCount}`);

    // Test 4: Test basic query (count achievements)
    const achievementCount = await prisma.achievement.count();
    console.log(`✅ Achievements in database: ${achievementCount}`);

    console.log('🎉 Database setup test completed successfully!');
  } catch (error) {
    console.error('❌ Database setup test failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDatabaseSetup()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}