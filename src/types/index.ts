export interface ICNUScore {
  interest: number;
  challenge: number;
  novelty: number;
  urgency: number;
}

export interface Task {
  id: string;
  title: string;
  icnu_score: ICNUScore;
  dopamine_rating: 1 | 2 | 3 | 4 | 5;
  status: 'todo' | 'active' | 'done';
  start_time?: string; // ISO string
  duration?: number; // minutes
  color_hex?: string;
}

export interface CapturedThought {
  id: string;
  text: string;
  captured_at: string; // ISO string
  time_to_capture_ms: number;
}
