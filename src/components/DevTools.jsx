// Small dev panel for toggling experimental gestures.
export function DevTools({
  dragCompleteEnabled,
  onDragCompleteChange,
  gridEnabled,
  onGridChange,
}) {
  return (
    <div className="splash-tuner" aria-hidden="true">
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
