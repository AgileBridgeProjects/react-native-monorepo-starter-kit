export const allocationSliderConfig = {
  maxVisibleUnits: 80,
  maxVisibleMarkers: 25,
  rangeThumbBase:
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 ' +
    '[&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 ' +
    '[&::-moz-range-thumb]:shadow-md',
  rangeTrackBase:
    '[&::-moz-range-track]:appearance-none [&::-moz-range-track]:bg-transparent ' +
    '[&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent',
  webkitThumbBase:
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 ' +
    '[&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none ' +
    '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-md',
} as const;
