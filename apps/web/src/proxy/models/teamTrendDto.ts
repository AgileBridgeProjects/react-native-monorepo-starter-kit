// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { ForecastPointDto } from './forecastPointDto';
import type { TrendPointDto } from './trendPointDto';

export interface TeamTrendDto {
  teamId?: string;
  teamName?: string;
  points?: TrendPointDto[];
  forecast?: ForecastPointDto[];
}
