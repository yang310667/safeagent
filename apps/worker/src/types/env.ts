export interface WorkerBindings {
  APP_VERSION?: string;
  AGENT_ENABLED?: string;
  ALLOWED_ORIGINS?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

export interface WorkerVariables {
  requestId: string;
}

export interface WorkerEnv {
  Bindings: WorkerBindings;
  Variables: WorkerVariables;
}
