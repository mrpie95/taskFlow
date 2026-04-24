// Small dev panel for tuning timings + toggling experimental gestures.
export function DevTools({
  splashDelay,
  onSplashDelayChange,
  dragCompleteEnabled,
  onDragCompleteChange,
  gridEnabled,
  onGridChange,
}) {
  return (
    <div className="splash-tuner" aria-hidden="true">
      <label>
        splash {splashDelay}ms
        <input
          type="range"
          min={0}
          max={1500}
          step={25}
          value={splashDelay}
          onChange={(e) => onSplashDelayChange(Number(e.target.value))}
        />
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={dragCompleteEnabled}
          onChange={(e) => onDragCompleteChange(e.target.checked)}
        />
        drag-above-water completes
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={gridEnabled}
          onChange={(e) => onGridChange(e.target.checked)}
        />
        organise mode (snap to grid)
      </label>
    </div>
  );
}
