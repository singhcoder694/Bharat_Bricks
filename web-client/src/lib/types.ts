export type ApiSuccess<T = unknown> = {
  success: true;
  message: string;
  data?: T;
  meta?: unknown;
};

export type ApiErrorBody = {
  success: false;
  message: string;
  details?: string;
  stack?: string;
};

export type HealthData = {
  uptime: number;
};
