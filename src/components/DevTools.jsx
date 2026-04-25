// Dev panel — toggle experimental gestures + scene prototypes, and tune
// the spring-physics water when it's on. Hidden by default until revealed
// via the little dev-toggle button in the deep.

const WATER_SLIDERS = [
  { key: "springK",           label: "spring pull",        min: 0.003, max: 0.05,  step: 0.001, format: (v) => v.toFixed(3) },
  { key: "damping",           label: "damping",            min: 0.9,   max: 0.995, step: 0.005, format: (v) => v.toFixed(3) },
  { key: "neighborSpread",    label: "neighbor spread",    min: 0.04,  max: 0.3,   step: 0.01,  format: (v) => v.toFixed(2) },
  { key: "propagationPasses", label: "propagation passes", min: 1,     max: 8,     step: 1,     format: (v) => String(v) },
  { key: "canvasHeightVh",    label: "surface depth (vh)", min: 6,     max: 30,    step: 1,     format: (v) => `${v}vh` },
  { key: "verticalForce",     label: "cursor force",       min: 0.05,  max: 1.2,   step: 0.01,  format: (v) => v.toFixed(2) },
];

export function DevTools({
  dragCompleteEnabled,
  onDragCompleteChange,
  gridEnabled,
  onGridChange,
  canvasWaterEnabled,
  onCanvasWaterChange,
  waterParams,
  onWaterParamChange,
  onWaterReset,
  onAddRandomTasks,
  onClearAllTasks,
  cardBlur,
  onCardBlurChange,
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
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={canvasWaterEnabled}
          onChange={(e) => onCanvasWaterChange(e.target.checked)}
        />
        spring-physics water surface
      </label>

      <label className="slider-row" style={{ marginTop: 8 }}>
        <span className="slider-label">
          card blur
          <span className="slider-value">{cardBlur}px</span>
        </span>
        <input
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={cardBlur}
          onChange={(e) => onCardBlurChange(Number(e.target.value))}
        />
      </label>

      <div className="dev-actions">
        <button type="button" className="reset-btn" onClick={() => onAddRandomTasks(15)}>
          + 15 random tasks
        </button>
        <button type="button" className="reset-btn" onClick={onClearAllTasks}>
          clear all tasks
        </button>
      </div>

      {canvasWaterEnabled && (
        <div className="slider-group">
          {WATER_SLIDERS.map((s) => (
            <label key={s.key} className="slider-row">
              <span className="slider-label">
                {s.label}
                <span className="slider-value">{s.format(waterParams[s.key])}</span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={waterParams[s.key]}
                onChange={(e) =>
                  onWaterParamChange(s.key, Number(e.target.value))
                }
              />
            </label>
          ))}
          <button type="button" className="reset-btn" onClick={onWaterReset}>
            reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
