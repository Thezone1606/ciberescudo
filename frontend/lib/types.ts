export type Role = "COLABORADOR" | "ANALISTA" | "SECOPS";
export type Track = "AWARENESS" | "TECHNICAL";
export type Difficulty = "BASIC" | "INTERMEDIATE" | "ADVANCED";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  department: { id: string; name: string };
  currentXp: number;
  currentStreak: number;
  shieldIntegrity: number;
  cooldownUntil: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  track: Track;
  difficulty: Difficulty;
  baseXp: number;
  orderIndex: number;
  category?: string;
  solved: boolean;
}

export interface DepartmentRank {
  rank: number;
  departmentId: string;
  department: string;
  members: number;
  totalXp: number;
  averageXp: number;
}
