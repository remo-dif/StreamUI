// User and Authentication Models
export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  tokenQuota?: number;
  tokensUsed?: number;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  tenantId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// Chat Models
export interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  isArchived: boolean;
}

export interface Attachment {
  name: string;
  contentType: string;
  url: string; // base64 data URL or file URL
  size: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens: number | null;
  createdAt: string;
  attachments?: Attachment[];
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface SendMessageRequest {
  content: string;
  model?: string;
  attachments?: Attachment[];
}

export interface StreamEvent {
  type: 'delta' | 'done' | 'error' | 'retrying';
  content?: string;
  usage?: TokenUsage;
  error?: string;
  attempt?: number;
  delay?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Usage Dashboard Models
export interface UsageDashboard {
  quota: {
    total: number;
    used: number;
    percentage: number;
  };
  today: {
    tokens: number;
  };
  last30Days: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
    avgTokensPerRequest: number;
  };
  dailyBreakdown: DailyUsage[];
}

export interface DailyUsage {
  date: string;
  tokens: number;
  requests: number;
}

export interface UsageLog {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number | null;
  createdAt: string;
  user?: {
    email: string;
  };
}

// Background Jobs
export interface AsyncJob {
  id: string;
  jobType: string;
  status: JobStatus;
  result: any;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface SubmitJobRequest {
  jobType: 'summarize' | 'analyze' | 'translate';
  payload: any;
}

// API Response Wrappers
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

// Error Models
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  code?: string;
  timestamp?: string;
}
