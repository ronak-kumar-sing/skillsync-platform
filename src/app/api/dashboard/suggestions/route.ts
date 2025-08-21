import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard/suggestions - Get suggested connections for user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    // Get current user's skills and preferences
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: {
            skill: {
              select: { name: true, category: true }
            }
          }
        },
        preferences: true
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userSkillNames = currentUser.skills.map(us => us.skill.name);
    const userSkillCategories = [...new Set(currentUser.skills.map(us => us.skill.category))];

    // Find potential connections
    const potentialConnections = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        skills: {
          some: {
            skill: {
              OR: [
                // Users with complementary skills (different proficiency levels in same skills)
                {
                  name: { in: userSkillNames }
                },
                // Users with skills in same categories
                {
                  category: { in: userSkillCategories }
                }
              ]
            }
          }
        }
      },
      include: {
        skills: {
          include: {
            skill: {
              select: { name: true, category: true }
            }
          }
        }
      },
      take: 20 // Get more candidates to filter from
    });

    // Calculate compatibility scores and format suggestions
    const suggestions = potentialConnections.map(user => {
      const userSkills = user.skills.map(us => us.skill.name);
      const commonSkills = userSkills.filter(skill => userSkillNames.includes(skill));
      const complementarySkills = userSkills.filter(skill => !userSkillNames.includes(skill));

      // Simple compatibility calculation
      let compatibilityScore = 0;

      // Bonus for common skills (can learn from each other)
      compatibilityScore += commonSkills.length * 15;

      // Bonus for complementary skills (can teach each other)
      compatibilityScore += Math.min(complementarySkills.length, 3) * 20;

      // Bonus for being recently active
      const isRecentlyActive = user.lastActive && user.lastActive >= activeThreshold;
      if (isRecentlyActive) {
        compatibilityScore += 10;
      }

      // Cap at 100%
      compatibilityScore = Math.min(100, compatibilityScore);

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatarUrl,
        skills: userSkills,
        compatibilityScore,
        isOnline: isRecentlyActive
      };
    })
      .filter(suggestion => suggestion.compatibilityScore > 30) // Only show decent matches
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore) // Sort by compatibility
      .slice(0, 5); // Take top 5

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}