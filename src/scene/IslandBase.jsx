// The submerged part of the island — a darker sandy base extending below the
// waterline. Lives outside .sky (which clips to its own overflow) and is
// aligned to the same x-range as the above-water island so the two read as
// one continuous landmass. When waves dip below the surface this is what
// you see through the water.
export function IslandBase() {
  return (
    <div className="island-base" aria-hidden="true">
      <div className="isl-base-shape" />
      <div className="isl-base-shape-shadow" />
    </div>
  );
}
