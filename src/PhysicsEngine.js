/**
 * PhysicsEngine — Applies forces and velocity to the Ghost character.
 *
 * Exported as a factory function for testability. Accepts a config object
 * so tests can inject custom physics values.
 *
 * @param {object} [config] - Configuration object with a `physics` sub-object
 * @returns {{ update: Function, applyJump: Function }}
 */
export function createPhysicsEngine(config) {
  const physics = (config && config.physics) ? config.physics : {
    gravity: 800,
    jumpVelocity: -300,
    terminalVelocityDown: 600,
    terminalVelocityUp: -400
  };

  function _clamp(val, min, max) {
    return val < min ? min : val > max ? max : val;
  }

  /**
   * Update ghost physics for one frame.
   * Only applies physics when state is 'playing'.
   *
   * @param {object} ghost - Ghost object with { y, velocity }
   * @param {number} dt - Delta time in seconds
   * @param {string} state - Current game state ('ready'|'playing'|'paused'|'game_over')
   */
  function update(ghost, dt, state) {
    if (state !== 'playing') return;

    // Apply gravity (acceleration)
    ghost.velocity += physics.gravity * dt;

    // Clamp velocity between terminal velocities
    ghost.velocity = _clamp(ghost.velocity, physics.terminalVelocityUp, physics.terminalVelocityDown);

    // Update position (frame-rate independent)
    ghost.y += ghost.velocity * dt;
  }

  /**
   * Apply jump — immediately override velocity with jump impulse.
   *
   * @param {object} ghost - Ghost object with { velocity }
   */
  function applyJump(ghost) {
    ghost.velocity = physics.jumpVelocity;
  }

  return { update, applyJump };
}
