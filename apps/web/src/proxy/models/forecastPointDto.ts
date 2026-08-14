// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0

export interface ForecastPointDto {
  date: string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  value: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  lower: number | string;
  /** @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$ */
  upper: number | string;
  isLowConfidence: boolean;
}
