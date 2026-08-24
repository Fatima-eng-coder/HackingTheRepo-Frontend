export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "refined";

export type UserRole = "user" | "admin";

export interface AuthUser {
  id?: string;
  username: string;
  email: string;
  githubUsername?: string;
  totalJobs?: number;
  successfulPRs?: number;
}

export interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  githubUsername?: string;
  totalJobs?: number;
  successfulPRs?: number;
  createdAt: string;
}

export interface LocalUser extends AuthUser {
  password: string;
}

export interface AuthResponse {
  user: AuthUser | null;
}

export interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export interface JobRefinement {
  instruction: string;
  timestamp: string;
}

export interface Job {
  _id: string;
  repoUrl: string;
  instruction: string;
  branchName: string;
  prTitle?: string;
  prUrl?: string;
  previewBeforePush?: boolean;
  status: JobStatus | string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  repomindJobId?: string;
  diffSummary?: string;
  diff?: string;
  errorMessage?: string;
  refinements?: JobRefinement[];
   userId?: string | { _id: string; username: string; email: string };
}

export interface Settings {
  githubUsername: string;
  githubToken: string;
  openaiKey: string;
  hasGithubToken: boolean;
  hasOpenaiKey: boolean;
}
