// TiltCalculator — Testable ES module
// Computes visual rotation angle for Nailong based on vertical velocity.
// Tilt is purely visual — collision hitbox remains an axis-aligned circle.

// Default config values (same as CONFIG.character tilt params)
const DEFAULT_CONFIG = {
  maxDownTilt: 0.6,          // Max clockwise rotation when falling (radians)
  maxUpTilt: 0.4,            // Max counter-clockwise when rising (radians)
  maxDescentVelocity: 600,   // Velocity at which max down-tilt is reached
  maxAscentVelocity: 400     // Velocity at which max up-tilt is reached
};

/**
 * Calculates the visual tilt angle based on vertical velocity.
 *
 * - Positive velocity (descending) → positive angle (clockwise), proportional to velocity
 * - Negative velocity (ascending) → negative angle (counter-clockwise), proportional to magnitude
 * - Zero velocity → zero angle
 * - Clamped to maxDownTilt (positive) and -maxUpTilt (negative)
 *
 * @param {number} velocity - Current vertical velocity (positive = descending, negative = ascending)
 * @param {object} [config] - Optional config override for testing
 * @returns {number} Tilt angle in radians
 */
export function calculateTilt(velocity, config = DEFAULT_CONFIG) {
  if (velocity > 0) {
    // Descending: clockwise (positive rotation)
    const t = Math.min(velocity / config.maxDescentVelocity, 1.0);
    return t * config.maxDownTilt;
  } else if (velocity < 0) {
    // Ascending: counter-clockwise (negative rotation)
    const t = Math.min(-velocity / config.maxAscentVelocity, 1.0);
    return -t * config.maxUpTilt;
  }
  return 0; // Level
}

export { DEFAULT_CONFIG };
