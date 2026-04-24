// Scene layout — every number is in vh, measured from the top of the scene.

export const SKY_VH = 20;                    // Height of the sky hero zone.
export const WATERLINE_VH = SKY_VH;          // The y of the surface itself.
export const WATER_TOP_VH = SKY_VH + 1;      // First usable row just under the surface.
export const FLOOR_MAX_VH = 295;             // Last usable row before the seabed.
export const WATER_RANGE_VH = FLOOR_MAX_VH - WATER_TOP_VH;

export const SKY_COMPOSE_VH = 7;             // Where a composing card hovers in the sky.
