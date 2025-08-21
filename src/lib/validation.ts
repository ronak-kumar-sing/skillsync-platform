import Joi from 'joi';
import { LoginRequest, RegisterRequest, PasswordResetRequest, PasswordResetConfirm } from '@/types';

// Common validation patterns
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .required()
  .messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  });

const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

const usernameSchema = Joi.string()
  .alphanum()
  .min(3)
  .max(30)
  .required()
  .messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 30 characters',
    'any.required': 'Username is required',
  });

const timezoneSchema = Joi.string()
  .required()
  .messages({
    'any.required': 'Timezone is required',
  });

// Login validation schema
export const loginSchema = Joi.object<LoginRequest>({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// Registration validation schema
export const registerSchema = Joi.object<RegisterRequest>({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  timezone: timezoneSchema,
});

// Password reset request validation schema
export const passwordResetRequestSchema = Joi.object<PasswordResetRequest>({
  email: emailSchema,
});

// Password reset confirmation validation schema
export const passwordResetConfirmSchema = Joi.object<PasswordResetConfirm>({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  newPassword: passwordSchema,
});

// Refresh token validation schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

/**
 * Validate request data against a Joi schema
 */
export function validateRequest<T>(schema: Joi.ObjectSchema<T>, data: unknown): {
  isValid: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors: Record<string, string> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      errors[key] = detail.message;
    });

    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    data: value,
  };
}

/**
 * Sanitize input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Validate email format (additional client-side validation)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format (additional client-side validation)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9]{3,30}$/;
  return usernameRegex.test(username);
}

// Profile Management Validation Schemas
import {
  UpdateProfileRequest,
  AddSkillRequest,
  UpdateSkillRequest,
  CreateLearningGoalRequest,
  UpdateLearningGoalRequest,
  UpdatePreferencesRequest,
  AvailabilitySchedule,
  TimeSlot
} from '@/types';

// Time slot validation
const timeSlotSchema = Joi.object<TimeSlot>({
  start: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'Time must be in HH:MM format (24-hour)',
      'any.required': 'Start time is required',
    }),
  end: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'Time must be in HH:MM format (24-hour)',
      'any.required': 'End time is required',
    }),
});

// Availability schedule validation
const availabilityScheduleSchema = Joi.object<AvailabilitySchedule>({
  monday: Joi.array().items(timeSlotSchema).default([]),
  tuesday: Joi.array().items(timeSlotSchema).default([]),
  wednesday: Joi.array().items(timeSlotSchema).default([]),
  thursday: Joi.array().items(timeSlotSchema).default([]),
  friday: Joi.array().items(timeSlotSchema).default([]),
  saturday: Joi.array().items(timeSlotSchema).default([]),
  sunday: Joi.array().items(timeSlotSchema).default([]),
});

// Profile update validation schema
export const updateProfileSchema = Joi.object<UpdateProfileRequest>({
  username: usernameSchema.optional(),
  timezone: timezoneSchema.optional(),
  avatarUrl: Joi.string().uri().allow('').optional().messages({
    'string.uri': 'Avatar URL must be a valid URL',
  }),
});

// Skill management validation schemas
export const addSkillSchema = Joi.object<AddSkillRequest>({
  skillId: Joi.string().uuid().required().messages({
    'string.uuid': 'Skill ID must be a valid UUID',
    'any.required': 'Skill ID is required',
  }),
  proficiencyLevel: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Proficiency level must be a number',
    'number.integer': 'Proficiency level must be an integer',
    'number.min': 'Proficiency level must be between 1 and 5',
    'number.max': 'Proficiency level must be between 1 and 5',
    'any.required': 'Proficiency level is required',
  }),
});

export const updateSkillSchema = Joi.object<UpdateSkillRequest>({
  proficiencyLevel: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Proficiency level must be a number',
    'number.integer': 'Proficiency level must be an integer',
    'number.min': 'Proficiency level must be between 1 and 5',
    'number.max': 'Proficiency level must be between 1 and 5',
    'any.required': 'Proficiency level is required',
  }),
});

// Learning goals validation schemas
export const createLearningGoalSchema = Joi.object<CreateLearningGoalRequest>({
  title: Joi.string().min(3).max(200).required().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title must not exceed 200 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Description must not exceed 1000 characters',
  }),
  targetDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Target date must be a valid ISO date',
  }),
  priority: Joi.string().valid('low', 'medium', 'high').required().messages({
    'any.only': 'Priority must be low, medium, or high',
    'any.required': 'Priority is required',
  }),
});

export const updateLearningGoalSchema = Joi.object<UpdateLearningGoalRequest>({
  title: Joi.string().min(3).max(200).optional().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title must not exceed 200 characters',
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Description must not exceed 1000 characters',
  }),
  targetDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Target date must be a valid ISO date',
  }),
  priority: Joi.string().valid('low', 'medium', 'high').optional().messages({
    'any.only': 'Priority must be low, medium, or high',
  }),
  status: Joi.string().valid('active', 'completed', 'paused').optional().messages({
    'any.only': 'Status must be active, completed, or paused',
  }),
});

// User preferences validation schema
export const updatePreferencesSchema = Joi.object<UpdatePreferencesRequest>({
  preferredSessionTypes: Joi.array()
    .items(Joi.string().valid('learning', 'teaching', 'collaboration'))
    .min(1)
    .optional()
    .messages({
      'array.min': 'At least one session type must be selected',
      'any.only': 'Session types must be learning, teaching, or collaboration',
    }),
  maxSessionDuration: Joi.number().integer().min(15).max(240).optional().messages({
    'number.base': 'Max session duration must be a number',
    'number.integer': 'Max session duration must be an integer',
    'number.min': 'Max session duration must be at least 15 minutes',
    'number.max': 'Max session duration must not exceed 240 minutes',
  }),
  communicationStyle: Joi.string().valid('formal', 'casual', 'balanced').optional().messages({
    'any.only': 'Communication style must be formal, casual, or balanced',
  }),
  availabilitySchedule: availabilityScheduleSchema.optional(),
  languagePreferences: Joi.array()
    .items(Joi.string().length(2))
    .min(1)
    .optional()
    .messages({
      'array.min': 'At least one language preference must be selected',
      'string.length': 'Language codes must be 2 characters long',
    }),
});

/**
 * Validate profile completion requirements
 */
export function validateProfileCompletion(profile: any): {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
} {
  const requiredFields = [
    { field: 'username', weight: 10 },
    { field: 'timezone', weight: 10 },
    { field: 'skills', weight: 30, validator: (skills: any[]) => skills && skills.length > 0 },
    { field: 'learningGoals', weight: 20, validator: (goals: any[]) => goals && goals.length > 0 },
    { field: 'preferences', weight: 30, validator: (prefs: any) => prefs && prefs.preferredSessionTypes && prefs.preferredSessionTypes.length > 0 },
  ];

  let completedWeight = 0;
  const missingFields: string[] = [];

  for (const { field, weight, validator } of requiredFields) {
    const value = profile[field];
    const isValid = validator ? validator(value) : value !== null && value !== undefined && value !== '';

    if (isValid) {
      completedWeight += weight;
    } else {
      missingFields.push(field);
    }
  }

  const completionPercentage = Math.round(completedWeight);
  const isComplete = completionPercentage >= 100;

  return {
    isComplete,
    completionPercentage,
    missingFields,
  };
}