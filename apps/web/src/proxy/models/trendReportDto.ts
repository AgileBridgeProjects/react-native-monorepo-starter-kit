// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
// Source: StarterKit.WebApi | v1 1.0.0
import type { ForecastPointDto } from './forecastPointDto';
import type { TrendPointDto } from './trendPointDto';

export interface TrendReportDto {
  participationTrend?: TrendPointDto[];
  achievementTrend?: TrendPointDto[];
  sessionsTrend?: TrendPointDto[];
  activePlayersTrend?: TrendPointDto[];
  participationForecast?: ForecastPointDto[];
  achievementForecast?: ForecastPointDto[];
  sessionsForecast?: ForecastPointDto[];
  activePlayersForecast?: ForecastPointDto[];
}
