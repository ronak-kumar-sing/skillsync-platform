import prisma from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  verifyRefreshToken
} from '@/lib/auth';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthUser,
  PasswordResetRequest,
  PasswordResetConfirm
} from '@/types';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new Error('A user with this email already exists');
      }
      if (existingUser.username === data.username) {
        throw new Error('This username is already taken');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        timezone: data.timezone,
        isVerified: false, // Email verification required
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        isVerified: true,
        avatarUrl: true,
        timezone: true,
      }
    });

    // Generate tokens
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
    };
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(user.id);

    // TODO: Send verification email (implement in future task)

    return {
      user: authUser,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        isVerified: true,
        isActive: true,
        avatarUrl: true,
        timezone: true,
      }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() }
    });

    // Generate tokens
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
    };
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(user.id);

    return {
      user: authUser,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        isVerified: true,
        isActive: true,
        avatarUrl: true,
        timezone: true,
      }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
    };
    const newAccessToken = generateAccessToken(authUser);
    const newRefreshToken = generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        isVerified: true,
        avatarUrl: true,
        timezone: true,
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
    };
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      // Don't reveal if user exists for security
      return { message: 'If an account with this email exists, a password reset link has been sent.' };
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken(user.id, user.email);

    // TODO: Send password reset email with token (implement in future task)
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return { message: 'If an account with this email exists, a password reset link has been sent.' };
  }

  /**
   * Confirm password reset
   */
  static async confirmPasswordReset(data: PasswordResetConfirm): Promise<{ message: string }> {
    const decoded = verifyPasswordResetToken(data.token);
    if (!decoded) {
      throw new Error('Invalid or expired reset token');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
        email: decoded.email,
      },
      select: {
        id: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Hash new password
    const passwordHash = await hashPassword(data.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Verify user email (for future implementation)
   */
  static async verifyEmail(_token: string): Promise<{ message: string }> {
    // TODO: Implement email verification logic
    throw new Error('Email verification not implemented yet');
  }

  /**
   * Change password (for authenticated users)
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return { message: 'Password changed successfully' };
  }
}