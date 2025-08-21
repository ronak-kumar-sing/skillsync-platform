// Common types used throughout the application

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'student' | 'mentor' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange?: (value: string) => void;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glassOpacity: number;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animations: boolean;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Loading States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  timezone: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    isVerified: boolean;
    avatarUrl?: string | null;
    timezone: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isVerified: boolean;
  avatarUrl?: string | null;
  timezone: string;
}

// User Profile Management Types
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  timezone: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;

  // Profile completion data
  skills: UserSkill[];
  learningGoals: LearningGoal[];
  preferences: UserPreference | null;
  stats: UserStats | null;
  achievements: UserAchievement[];
}

export interface UserSkill {
  id: string;
  skillId: string;
  skill: Skill;
  proficiencyLevel: 1 | 2 | 3 | 4 | 5;
  verified: boolean;
  endorsements: number;
  createdAt: Date;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  createdAt: Date;
}

export interface LearningGoal {
  id: string;
  title: string;
  description?: string | null;
  targetDate?: Date | null;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreference {
  id: string;
  preferredSessionTypes: ('learning' | 'teaching' | 'collaboration')[];
  maxSessionDuration: number; // minutes
  communicationStyle: 'formal' | 'casual' | 'balanced';
  availabilitySchedule: AvailabilitySchedule;
  languagePreferences: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilitySchedule {
  [key: string]: TimeSlot[];
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface UserStats {
  id: string;
  totalSessions: number;
  totalMinutesLearned: number;
  averageRating?: number | null;
  skillsLearned: number;
  skillsTaught: number;
  achievementPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  achievement: Achievement;
  earnedAt: Date;
  progress?: any; // JSON object for tracking progress
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string | null;
  category: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: any; // JSON object defining achievement criteria
  createdAt: Date;
}

// Profile Update Request Types
export interface UpdateProfileRequest {
  username?: string;
  timezone?: string;
  avatarUrl?: string;
}

export interface AddSkillRequest {
  skillId: string;
  proficiencyLevel: 1 | 2 | 3 | 4 | 5;
}

export interface UpdateSkillRequest {
  proficiencyLevel: 1 | 2 | 3 | 4 | 5;
}

export interface CreateLearningGoalRequest {
  title: string;
  description?: string;
  targetDate?: string; // ISO date string
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateLearningGoalRequest {
  title?: string;
  description?: string;
  targetDate?: string; // ISO date string
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'completed' | 'paused';
}

export interface UpdatePreferencesRequest {
  preferredSessionTypes?: ('learning' | 'teaching' | 'collaboration')[];
  maxSessionDuration?: number;
  communicationStyle?: 'formal' | 'casual' | 'balanced';
  availabilitySchedule?: AvailabilitySchedule;
  languagePreferences?: string[];
}

// Profile Completion Status
export interface ProfileCompletionStatus {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
  requiredSteps: ProfileCompletionStep[];
}

export interface ProfileCompletionStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  weight: number; // Percentage weight towards completion
}

// Matching System Types
export interface MatchingRequest {
  userId: string;
  preferredSkills: string[];
  sessionType: 'learning' | 'teaching' | 'collaboration';
  maxDuration: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface MatchResult {
  partnerId: string;
  compatibilityScore: number;
  scoreBreakdown: CompatibilityScoreBreakdown;
  estimatedWaitTime?: number;
}

export interface CompatibilityScoreBreakdown {
  skillCompatibility: number;
  timezoneCompatibility: number;
  availabilityCompatibility: number;
  communicationCompatibility: number;
  sessionHistoryCompatibility: number;
  totalScore: number;
}

export interface MatchingCandidate {
  user: UserProfile;
  compatibilityScore: number;
  scoreBreakdown: CompatibilityScoreBreakdown;
}

export interface QueueStatus {
  position: number;
  estimatedWaitTime: number;
  totalInQueue: number;
  isActive: boolean;
}

export interface MatchingQueueEntry {
  id: string;
  userId: string;
  preferredSkills: string[];
  sessionType: 'learning' | 'teaching' | 'collaboration';
  maxDuration: number;
  urgency: 'low' | 'medium' | 'high';
  status: 'waiting' | 'matched' | 'expired' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
}

// Session Management Types
export interface SessionRequest {
  partnerId: string;
  sessionType: 'learning' | 'teaching' | 'collaboration';
  duration: number;
  topics: string[];
}

export interface SessionResponse {
  sessionId: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
}

export interface ActiveSession {
  id: string;
  initiatorId: string;
  partnerId: string;
  sessionType: 'learning' | 'teaching' | 'collaboration';
  startTime: Date;
  estimatedEndTime: Date;
  topics: string[];
  status: 'waiting' | 'active' | 'ended';
  tools: {
    codeEditor: boolean;
    whiteboard: boolean;
    screenShare: boolean;
    recording: boolean;
  };
}

// Collaborative Tools Types
export interface CodeEditorState {
  content: string;
  language: string;
  cursorPosition: { line: number; column: number };
  selections: CodeSelection[];
  participants: CodeParticipant[];
}

export interface CodeSelection {
  userId: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  color: string;
}

export interface CodeParticipant {
  userId: string;
  username: string;
  color: string;
  cursorPosition: { line: number; column: number };
  isActive: boolean;
}

export interface CodeChangeEvent {
  userId: string;
  sessionId: string;
  changes: CodeChange[];
  timestamp: number;
}

export interface CodeChange {
  type: 'insert' | 'delete' | 'replace';
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
}

export interface WhiteboardState {
  elements: WhiteboardElement[];
  participants: WhiteboardParticipant[];
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
}

export interface WhiteboardElement {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'freehand';
  userId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    strokeColor: string;
    fillColor?: string;
    strokeWidth: number;
    opacity: number;
  };
  data: any; // Element-specific data (text content, path points, etc.)
  timestamp: number;
}

export interface WhiteboardParticipant {
  userId: string;
  username: string;
  color: string;
  cursor: { x: number; y: number };
  isDrawing: boolean;
  tool: WhiteboardTool;
}

export interface WhiteboardTool {
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'select';
  size: number;
  color: string;
  opacity: number;
}

export interface DrawEvent {
  userId: string;
  sessionId: string;
  element: WhiteboardElement;
  action: 'add' | 'update' | 'delete';
  timestamp: number;
}

export interface ScreenShareState {
  isSharing: boolean;
  sharerUserId?: string;
  streamId?: string;
  quality: 'low' | 'medium' | 'high';
  hasAudio: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'file' | 'code' | 'system';
  timestamp: Date;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    codeLanguage?: string;
  };
}

export interface ChatState {
  messages: ChatMessage[];
  participants: ChatParticipant[];
  isTyping: { [userId: string]: boolean };
  unreadCount: number;
}

export interface ChatParticipant {
  userId: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface FileShareEvent {
  userId: string;
  sessionId: string;
  file: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  };
  timestamp: number;
}

export interface CollaborationSession {
  id: string;
  participants: string[];
  tools: {
    codeEditor: CodeEditorState;
    whiteboard: WhiteboardState;
    screenShare: ScreenShareState;
    chat: ChatState;
  };
  permissions: {
    [userId: string]: CollaborationPermissions;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CollaborationPermissions {
  canEditCode: boolean;
  canDrawWhiteboard: boolean;
  canShareScreen: boolean;
  canUploadFiles: boolean;
  canManageSession: boolean;
}

// Socket Events for Collaboration
export interface CollaborationSocketEvents {
  // Code Editor Events
  'code:change': CodeChangeEvent;
  'code:cursor-move': { userId: string; position: { line: number; column: number } };
  'code:selection': { userId: string; selection: CodeSelection };
  'code:language-change': { language: string };

  // Whiteboard Events
  'whiteboard:draw': DrawEvent;
  'whiteboard:cursor-move': { userId: string; position: { x: number; y: number } };
  'whiteboard:tool-change': { userId: string; tool: WhiteboardTool };
  'whiteboard:clear': { userId: string };

  // Screen Share Events
  'screen:start-share': { userId: string; streamId: string };
  'screen:stop-share': { userId: string };
  'screen:quality-change': { quality: 'low' | 'medium' | 'high' };

  // Chat Events
  'chat:message': ChatMessage;
  'chat:typing-start': { userId: string };
  'chat:typing-stop': { userId: string };
  'chat:file-share': FileShareEvent;

  // Session Events
  'session:join': { userId: string; sessionId: string };
  'session:leave': { userId: string; sessionId: string };
  'session:sync': CollaborationSession;
}

// Session Analytics Types
export interface SessionAnalyticsData {
  overview: {
    totalSessions: number;
    totalHours: number;
    averageRating: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
  };
  skillProgression: SkillProgressionData[];
  learningVelocity: VelocityMetrics;
  sessionDistribution: SessionDistribution;
  performanceTrends: PerformanceTrend[];
  topPartners: PartnerStats[];
  insights?: PersonalizedInsights;
}

export interface SkillProgressionData {
  skillId: string;
  skillName: string;
  category: string;
  initialLevel: number;
  currentLevel: number;
  progressPercentage: number;
  sessionsCount: number;
  hoursSpent: number;
  lastPracticed: Date;
  trend: 'improving' | 'stable' | 'declining';
  milestones: SkillMilestone[];
}

export interface SkillMilestone {
  date: Date;
  level: number;
  achievement?: string;
  sessionId: string;
}

export interface VelocityMetrics {
  sessionsPerWeek: number;
  hoursPerWeek: number;
  skillsLearnedPerMonth: number;
  averageSessionDuration: number;
  peakLearningDays: string[];
  learningConsistency: number; // 0-100 score
}

export interface SessionDistribution {
  byType: { type: string; count: number; percentage: number }[];
  byDayOfWeek: { day: string; count: number; averageRating: number }[];
  byTimeOfDay: { hour: number; count: number; averageRating: number }[];
  byDuration: { range: string; count: number; averageRating: number }[];
}

export interface PerformanceTrend {
  date: Date;
  averageRating: number;
  sessionCount: number;
  hoursLearned: number;
  skillsProgressed: number;
}

export interface PartnerStats {
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  sessionsCount: number;
  averageRating: number;
  totalHours: number;
  skillsShared: string[];
  lastSession: Date;
  compatibility: number;
}

export interface PersonalizedInsights {
  performance: PerformanceInsight[];
  patterns: LearningPattern[];
  recommendations: Recommendation[];
  achievements: AchievementInsight[];
}

export interface PerformanceInsight {
  type: 'improvement' | 'decline' | 'milestone' | 'streak';
  title: string;
  description: string;
  metric: string;
  value: number;
  change: number;
  timeframe: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LearningPattern {
  type: 'time_preference' | 'session_length' | 'skill_focus' | 'partner_preference';
  title: string;
  description: string;
  confidence: number; // 0-100
  data: Record<string, any>;
}

export interface Recommendation {
  type: 'skill' | 'schedule' | 'partner' | 'goal';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionable: boolean;
  estimatedImpact: string;
  data?: Record<string, any>;
}

export interface AchievementInsight {
  type: 'progress' | 'near_completion' | 'suggestion';
  achievementId?: string;
  title: string;
  description: string;
  progress: number; // 0-100
  requirement: string;
}

export interface DetailedSessionFeedback {
  rating: number;
  feedback?: string;
  skillsLearned: string[];
  skillsTaught: string[];
  learningOutcomes: string[];
  difficultyLevel?: 1 | 2 | 3 | 4 | 5;
  paceRating?: 1 | 2 | 3 | 4 | 5;
  communicationRating?: 1 | 2 | 3 | 4 | 5;
  technicalIssues: string[];
  wouldRecommendPartner?: boolean;
  improvementSuggestions?: string;
  sharedResources: SharedResource[];
}

export interface SharedResource {
  type: 'link' | 'file' | 'code' | 'note';
  title: string;
  content: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface SessionHistoryFilters {
  page: number;
  limit: number;
  search?: string;
  sessionType?: 'learning' | 'teaching' | 'collaboration' | '';
  dateFrom?: Date;
  dateTo?: Date;
  minRating?: number;
  partnerId?: string;
  topics?: string[];
}

// Generic Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};