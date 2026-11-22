export type ArmSide = 'left' | 'right';
export type BodyPosture = 'sitting' | 'lying' | 'standing';
export type MeasurementContext =
  | 'morning_before_meds'
  | 'morning_after_meds'
  | 'evening'
  | 'after_activity'
  | 'symptomatic'
  | 'routine';

export type BPCategoryKey =
  | 'low'
  | 'normal'
  | 'elevated'
  | 'stage1'
  | 'stage2'
  | 'crisis';

export interface BPCategoryInfo {
  key: BPCategoryKey;
  label: string;
  shortLabel: string;
  rangeText: string;
  textColor: string;
  dotColor: string;
  chartColor: string;
  guidance: string;
}

export interface BloodPressureReading {
  id: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  measuredAt: string; // ISO string
  arm: ArmSide;
  posture: BodyPosture;
  context: MeasurementContext;
  irregularHeartbeat: boolean;
  notes: string;
  source: 'manual' | 'image';
  isSample?: boolean;
}

export interface PatientProfile {
  fullName: string;
  age: string;
  doctorName: string;
  medications: string;
  targetSystolic: number;
  targetDiastolic: number;
}

export interface ExtractedBPResult {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  measuredAt: string;
  irregularHeartbeat: boolean;
  deviceDescription: string;
  confidence: 'high' | 'medium' | 'low' | string;
  notes: string;
}

export type DateRangeKey = '7d' | '30d' | '90d' | 'all';
export type NavSection =
  | 'dashboard'
  | 'scanner'
  | 'reminders'
  | 'charts'
  | 'history'
  | 'report';

export type ReminderFrequency = 'daily' | 'weekly';

export interface BPReminder {
  id: string;
  label: string;
  time: string; // "HH:mm" in 24h format
  frequency: ReminderFrequency;
  daysOfWeek: number[]; // 0 (Sunday) to 6 (Saturday)
  context: MeasurementContext;
  enabled: boolean;
  soundEnabled: boolean;
  notes: string;
}

export interface ActiveReminderAlert {
  reminderId: string;
  label: string;
  time: string;
  context: MeasurementContext;
  notes: string;
  triggeredAt: string;
}

