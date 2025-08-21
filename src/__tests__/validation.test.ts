import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  refreshTokenSchema,
  updateProfileSchema,
  addSkillSchema,
  updateSkillSchema,
  createLearningGoalSchema,
  updateLearningGoalSchema,
  updatePreferencesSchema,
  validateRequest,
  sanitizeInput,
  isValidEmail,
  isValidUsername,
  validateProfileCompletion,
} from '@/lib/validation';
import {
  LoginRequest,
  RegisterRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  UpdateProfileRequest,
  AddSkillRequest,
  UpdateSkillRequest,
  CreateLearningGoalRequest,
  UpdateLearningGoalRequest,
  UpdatePreferencesRequest,
} from '@/types';

describe('Validation Library', () => {
  describe('Login Validation', () => {
    it('should validate correct login data', () => {
      const validLogin: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = validateRequest(loginSchema, validLogin);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validLogin);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid email formats', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = validateRequest(loginSchema, invalidLogin);
      expect(result.isValid).toBe(false);
      expect(result.errors?.email).toContain('valid email address');
    });

    it('should reject missing fields', () => {
      const incompleteLogin = {
        email: 'test@example.com',
      };

      const result = validateRequest(loginSchema, incompleteLogin);
      expect(result.isValid).toBe(false);
      expect(result.errors?.password).toContain('required');
    });
  });

  describe('Registration Validation', () => {
    it('should validate correct registration data', () => {
      const validRegistration: RegisterRequest = {
        email: 'test@example.com',
        username: 'testuser123',
        password: 'StrongPass123!',
        timezone: 'America/New_York',
      };

      const result = validateRequest(registerSchema, validRegistration);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validRegistration);
    });

    it('should reject weak passwords', () => {
      const weakPasswordRegistration = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
        timezone: 'UTC',
      };

      const result = validateRequest(registerSchema, weakPasswordRegistration);
      expect(result.isValid).toBe(false);
      expect(result.errors?.password).toBeDefined();
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = ['ab', 'user@name', 'user name', 'a'.repeat(31)];

      invalidUsernames.forEach(username => {
        const registration = {
          email: 'test@example.com',
          username,
          password: 'StrongPass123!',
          timezone: 'UTC',
        };

        const result = validateRequest(registerSchema, registration);
        expect(result.isValid).toBe(false);
        expect(result.errors?.username).toBeDefined();
      });
    });

    it('should accept valid usernames', () => {
      const validUsernames = ['abc', 'user123', 'testuser', 'a'.repeat(30)];

      validUsernames.forEach(username => {
        const registration = {
          email: 'test@example.com',
          username,
          password: 'StrongPass123!',
          timezone: 'UTC',
        };

        const result = validateRequest(registerSchema, registration);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Password Reset Validation', () => {
    it('should validate password reset request', () => {
      const validRequest: PasswordResetRequest = {
        email: 'test@example.com',
      };

      const result = validateRequest(passwordResetRequestSchema, validRequest);
      expect(result.isValid).toBe(true);
    });

    it('should validate password reset confirmation', () => {
      const validConfirmation: PasswordResetConfirm = {
        token: 'valid-reset-token',
        newPassword: 'NewStrongPass123!',
      };

      const result = validateRequest(passwordResetConfirmSchema, validConfirmation);
      expect(result.isValid).toBe(true);
    });

    it('should reject weak new passwords', () => {
      const weakPasswordConfirmation = {
        token: 'valid-token',
        newPassword: 'weak',
      };

      const result = validateRequest(passwordResetConfirmSchema, weakPasswordConfirmation);
      expect(result.isValid).toBe(false);
      expect(result.errors?.newPassword).toBeDefined();
    });
  });

  describe('Profile Management Validation', () => {
    it('should validate profile updates', () => {
      const validUpdate: UpdateProfileRequest = {
        username: 'newusername',
        timezone: 'Europe/London',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const result = validateRequest(updateProfileSchema, validUpdate);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid avatar URLs', () => {
      const invalidUpdate = {
        avatarUrl: 'not-a-url',
      };

      const result = validateRequest(updateProfileSchema, invalidUpdate);
      expect(result.isValid).toBe(false);
      expect(result.errors?.avatarUrl).toBeDefined();
    });

    it('should allow empty avatar URL', () => {
      const validUpdate = {
        avatarUrl: '',
      };

      const result = validateRequest(updateProfileSchema, validUpdate);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Skill Management Validation', () => {
    it('should validate adding skills', () => {
      const validSkill: AddSkillRequest = {
        skillId: '123e4567-e89b-12d3-a456-426614174000',
        proficiencyLevel: 3,
      };

      const result = validateRequest(addSkillSchema, validSkill);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid skill IDs', () => {
      const invalidSkill = {
        skillId: 'not-a-uuid',
        proficiencyLevel: 3,
      };

      const result = validateRequest(addSkillSchema, invalidSkill);
      expect(result.isValid).toBe(false);
      expect(result.errors?.skillId).toBeDefined();
    });

    it('should reject invalid proficiency levels', () => {
      const invalidLevels = [0, 6, -1, 3.5, 'three'];

      invalidLevels.forEach(level => {
        const skill = {
          skillId: '123e4567-e89b-12d3-a456-426614174000',
          proficiencyLevel: level,
        };

        const result = validateRequest(addSkillSchema, skill);
        expect(result.isValid).toBe(false);
        expect(result.errors?.proficiencyLevel).toBeDefined();
      });
    });

    it('should validate skill updates', () => {
      const validUpdate: UpdateSkillRequest = {
        proficiencyLevel: 4,
      };

      const result = validateRequest(updateSkillSchema, validUpdate);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Learning Goals Validation', () => {
    it('should validate creating learning goals', () => {
      const validGoal: CreateLearningGoalRequest = {
        title: 'Learn React Hooks',
        description: 'Master useState, useEffect, and custom hooks',
        targetDate: '2024-12-31',
        priority: 'high',
      };

      const result = validateRequest(createLearningGoalSchema, validGoal);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid titles', () => {
      const invalidTitles = ['ab', 'a'.repeat(201)];

      invalidTitles.forEach(title => {
        const goal = {
          title,
          priority: 'medium',
        };

        const result = validateRequest(createLearningGoalSchema, goal);
        expect(result.isValid).toBe(false);
        expect(result.errors?.title).toBeDefined();
      });
    });

    it('should reject invalid priorities', () => {
      const invalidPriorities = ['urgent', 'normal', 'critical'];

      invalidPriorities.forEach(priority => {
        const goal = {
          title: 'Valid Title',
          priority,
        };

        const result = validateRequest(createLearningGoalSchema, goal);
        expect(result.isValid).toBe(false);
        expect(result.errors?.priority).toBeDefined();
      });
    });

    it('should validate updating learning goals', () => {
      const validUpdate: UpdateLearningGoalRequest = {
        title: 'Updated Goal Title',
        status: 'completed',
        priority: 'low',
      };

      const result = validateRequest(updateLearningGoalSchema, validUpdate);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['done', 'in-progress', 'cancelled'];

      invalidStatuses.forEach(status => {
        const update = {
          status,
        };

        const result = validateRequest(updateLearningGoalSchema, update);
        expect(result.isValid).toBe(false);
        expect(result.errors?.status).toBeDefined();
      });
    });
  });

  describe('User Preferences Validation', () => {
    it('should validate preferences updates', () => {
      const validPreferences: UpdatePreferencesRequest = {
        preferredSessionTypes: ['learning', 'collaboration'],
        maxSessionDuration: 90,
        communicationStyle: 'balanced',
        languagePreferences: ['en', 'es'],
        availabilitySchedule: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [],
          wednesday: [{ start: '10:00', end: '16:00' }],
          thursday: [],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [],
          sunday: [],
        },
      };

      const result = validateRequest(updatePreferencesSchema, validPreferences);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid session types', () => {
      const invalidPreferences = {
        preferredSessionTypes: ['mentoring', 'tutoring'],
      };

      const result = validateRequest(updatePreferencesSchema, invalidPreferences);
      expect(result.isValid).toBe(false);
      expect(result.errors?.['preferredSessionTypes.0']).toBeDefined();
    });

    it('should reject invalid session durations', () => {
      const invalidDurations = [10, 300, -30];

      invalidDurations.forEach(duration => {
        const preferences = {
          maxSessionDuration: duration,
        };

        const result = validateRequest(updatePreferencesSchema, preferences);
        expect(result.isValid).toBe(false);
        expect(result.errors?.maxSessionDuration).toBeDefined();
      });
    });

    it('should reject invalid time formats', () => {
      const invalidSchedule = {
        availabilitySchedule: {
          monday: [{ start: '25:00', end: '17:00' }],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
      };

      const result = validateRequest(updatePreferencesSchema, invalidSchedule);
      expect(result.isValid).toBe(false);
    });

    it('should validate correct time formats', () => {
      const validTimes = ['00:00', '09:30', '17:45', '23:59'];

      validTimes.forEach(time => {
        const schedule = {
          availabilitySchedule: {
            monday: [{ start: time, end: '18:00' }],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
        };

        const result = validateRequest(updatePreferencesSchema, schedule);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('sanitizeInput', () => {
      it('should remove dangerous characters', () => {
        expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
        expect(sanitizeInput('Hello <world>')).toBe('Hello world');
        expect(sanitizeInput('  trimmed  ')).toBe('trimmed');
      });

      it('should preserve safe content', () => {
        expect(sanitizeInput('Normal text')).toBe('Normal text');
        expect(sanitizeInput('Text with numbers 123')).toBe('Text with numbers 123');
        expect(sanitizeInput('Special chars: !@#$%^&*()')).toBe('Special chars: !@#$%^&*()');
      });
    });

    describe('isValidEmail', () => {
      it('should validate email addresses', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          '123@example.com',
        ];

        validEmails.forEach(email => {
          expect(isValidEmail(email)).toBe(true);
        });

        const invalidEmails = [
          'invalid',
          'invalid@',
          '@example.com',
          'invalid@.com',
          'invalid.example.com',
          '',
        ];

        invalidEmails.forEach(email => {
          expect(isValidEmail(email)).toBe(false);
        });
      });
    });

    describe('isValidUsername', () => {
      it('should validate usernames', () => {
        const validUsernames = ['abc', 'user123', 'testuser', 'a'.repeat(30)];

        validUsernames.forEach(username => {
          expect(isValidUsername(username)).toBe(true);
        });

        const invalidUsernames = ['ab', 'user@name', 'user name', 'a'.repeat(31), ''];

        invalidUsernames.forEach(username => {
          expect(isValidUsername(username)).toBe(false);
        });
      });
    });
  });

  describe('Profile Completion Validation', () => {
    it('should calculate completion for complete profile', () => {
      const completeProfile = {
        username: 'testuser',
        timezone: 'UTC',
        skills: [{ id: '1', name: 'JavaScript' }],
        learningGoals: [{ id: '1', title: 'Learn React' }],
        preferences: {
          preferredSessionTypes: ['learning'],
        },
      };

      const result = validateProfileCompletion(completeProfile);
      expect(result.isComplete).toBe(true);
      expect(result.completionPercentage).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should calculate completion for incomplete profile', () => {
      const incompleteProfile = {
        username: 'testuser',
        timezone: 'UTC',
        skills: [],
        learningGoals: [],
        preferences: null,
      };

      const result = validateProfileCompletion(incompleteProfile);
      expect(result.isComplete).toBe(false);
      expect(result.completionPercentage).toBe(20); // Only username and timezone (10 + 10)
      expect(result.missingFields).toContain('skills');
      expect(result.missingFields).toContain('learningGoals');
      expect(result.missingFields).toContain('preferences');
    });

    it('should handle partially complete profile', () => {
      const partialProfile = {
        username: 'testuser',
        timezone: 'UTC',
        skills: [{ id: '1', name: 'JavaScript' }],
        learningGoals: [],
        preferences: null,
      };

      const result = validateProfileCompletion(partialProfile);
      expect(result.isComplete).toBe(false);
      expect(result.completionPercentage).toBe(50); // username (10) + timezone (10) + skills (30)
      expect(result.missingFields).toContain('learningGoals');
      expect(result.missingFields).toContain('preferences');
    });

    it('should handle null/undefined profile data', () => {
      const emptyProfile = {
        username: null,
        timezone: undefined,
        skills: null,
        learningGoals: undefined,
        preferences: null,
      };

      const result = validateProfileCompletion(emptyProfile);
      expect(result.isComplete).toBe(false);
      expect(result.completionPercentage).toBe(0);
      expect(result.missingFields).toHaveLength(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle multiple validation errors', () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'ab',
        password: 'weak',
      };

      const result = validateRequest(registerSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors || {})).toHaveLength(4); // email, username, password, timezone
    });

    it('should strip unknown fields', () => {
      const dataWithExtra = {
        email: 'test@example.com',
        password: 'password123',
        extraField: 'should be removed',
      };

      const result = validateRequest(loginSchema, dataWithExtra);
      expect(result.isValid).toBe(true);
      expect(result.data).not.toHaveProperty('extraField');
    });
  });
});