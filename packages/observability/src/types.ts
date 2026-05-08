// types.ts - Shared types for observability package

export type Counter = number;
export type Histogram = { count: number; sum: number; min: number; max: number };
export type Gauge = number;

export interface MetricLabels {
  [key: string]: string;
}