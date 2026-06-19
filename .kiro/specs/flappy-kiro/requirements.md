# Requirements Document

## Introduction

Flappy Kiro is a retro-styled endless side-scrolling browser game built with HTML5 Canvas and JavaScript. The player controls a ghost character (Kiro) that navigates through gaps between vertically-oriented green pipes. The game features a hand-drawn aesthetic with a light blue background, parallax cloud layers for depth, floating collectible clouds, sound effects for jumping, scoring, and game over events, screen shake on collision, particle trails behind the ghost, and a persistent high score display. The game supports pause/resume functionality and runs entirely client-side with no server dependencies.

## Glossary

- **Game_Canvas**: The HTML5 Canvas element that renders the game at a fixed logical resolution
- **Ghost**: The player-controlled character rendered from the ghosty.png sprite asset
- **Pipe**: A vertical green obstacle that extends from the top or bottom of the screen, forming a pair with a gap for the Ghost to pass through
- **Pipe_Pair**: A top Pipe and bottom Pipe positioned at the same horizontal location with a defined gap between them
- **Gap**: The vertical opening between a top Pipe and bottom Pipe that the Ghost must pass through
- **Scrolling_Engine**: The subsystem responsible for continuously moving Pipe_Pairs, Collectibles, Clouds, and background elements from right to left
- **Collision_Detector**: The subsystem that determines whether the Ghost has collided with a Pipe or boundary
- **Score_Manager**: The subsystem that tracks, displays, and persists the current score and high score
- **Collectible**: A semi-transparent white floating rounded-rectangle element that appears in the game scene at varying depths and can be collected by the Ghost for bonus points
- **Cloud**: A decorative semi-transparent background element rendered as a soft white rounded shape that scrolls at varying speeds to create depth perception
- **Cloud_Layer**: A synonym for Parallax_Layer; a distinct depth tier containing multiple Cloud instances that share the same scroll speed, opacity, and scale
- **Parallax_Layer**: A background rendering layer containing Clouds that scrolls at a distinct speed relative to the foreground, with multiple layers creating the illusion of depth
- **Physics_Engine**: The subsystem responsible for applying gravity, velocity impulses, terminal velocity capping, momentum conservation, and smooth movement interpolation to the Ghost
- **Terminal_Velocity**: The maximum speed the Ghost can reach in either the upward or downward direction, preventing uncontrolled acceleration
- **Movement_Interpolation**: A smoothing technique applied to the Ghost's position updates to ensure visually fluid motion between frames regardless of frame rate variation
- **HUD**: The heads-up display bar at the bottom of the screen showing current score and high score
- **Game_State**: The current mode of the game: Ready, Playing, Paused, or Game_Over
- **Paused**: A Game_State in which all gameplay movement (Ghost physics, Pipe_Pair scrolling, Collectible movement) is frozen, the current scene remains rendered, and a semi-transparent "Paused" overlay is displayed until the player resumes
- **Audio_Manager**: The subsystem responsible for loading, managing, and playing sound effects and background music
- **Screen_Shake**: A visual effect that rapidly offsets the Game_Canvas rendering origin by small random amounts for a brief duration to convey impact
- **Particle_Trail**: A series of small semi-transparent visual elements emitted behind the Ghost during movement to convey motion and energy
- **Score_Popup**: A brief animated text element (e.g., "+1" or "+5") that appears near the Ghost when points are scored and fades out over a short duration
- **Difficulty_Manager**: The subsystem that progressively adjusts game parameters (pipe speed, gap size, spacing) based on the player's current score

## Requirements

### Requirement 1: Game Initialization and Rendering

**User Story:** As a player, I want the game to load in my browser and display a start screen, so that I can begin playing when ready.

#### Acceptance Criteria

1. THE Game_Canvas SHALL render at a fixed logical resolution of 480 by 640 pixels that scales to fit the browser window while maintaining aspect ratio
2. WHEN the game page loads, THE Game_Canvas SHALL display the Ghost character centered both horizontally and vertically, a light blue background, and a text prompt instructing the player how to start the game
3. THE Game_Canvas SHALL render all game elements using the HTML5 Canvas 2D rendering context at a frame rate targeting 60 frames per second with a minimum acceptable frame rate of 30 frames per second
4. WHEN the page loads, THE Game_Canvas SHALL preload the ghosty.png sprite, jump.wav sound, and game_over.wav sound before displaying the start screen, completing within 10 seconds
5. IF any asset fails to load within the timeout period, THEN THE Game_Canvas SHALL display an error message indicating which assets could not be loaded and shall not transition to the start screen

### Requirement 2: Ghost Character Control

**User Story:** As a player, I want to control the ghost by tapping or pressing a key, so that I can navigate through obstacles.

#### Acceptance Criteria

1. WHEN the player presses the spacebar, clicks the mouse, or taps the screen while the Game_State is Playing, THE Ghost SHALL apply an upward velocity impulse of a fixed magnitude between 5 and 10 pixels per frame, causing the Ghost to move upward
2. WHILE the game is in the Playing state, THE Ghost SHALL be subject to a constant downward gravitational acceleration of a fixed value between 0.3 and 0.8 pixels per frame squared, applied each frame
3. WHEN the player triggers a jump input while the Game_State is Playing, THE Game_Canvas SHALL play the jump.wav sound effect
4. THE Ghost SHALL be rendered using the ghosty.png sprite asset at a fixed width between 30 and 50 pixels and a fixed height between 30 and 50 pixels
5. WHILE the game is in the Playing state, THE Ghost SHALL remain at a fixed horizontal position located within the left third of the Game_Canvas width while the world scrolls past
6. WHILE the game is in the Playing state, THE Ghost SHALL have its upward velocity capped at a maximum magnitude so that rapid successive inputs do not cause the Ghost to exceed the defined impulse speed

### Requirement 3: Pipe Obstacle Generation and Scrolling

**User Story:** As a player, I want pipes to appear at regular intervals with randomized gaps and increasing difficulty, so that the game provides an endless and progressively challenging experience.

#### Acceptance Criteria

1. WHILE the game is in the Playing state, THE Scrolling_Engine SHALL generate new Pipe_Pairs at a regular horizontal spacing interval of between 200 and 300 pixels measured from the trailing edge of the previous Pipe_Pair to the leading edge of the next Pipe_Pair
2. THE Scrolling_Engine SHALL position the Gap center of each Pipe_Pair at a random vertical location between 20% and 80% of the playable area height, using a uniform random distribution to ensure unpredictable but always reachable Gap placement
3. WHILE the game is in the Playing state, THE Scrolling_Engine SHALL move all Pipe_Pairs from right to left at a base horizontal speed of between 2 and 4 pixels per frame at the start of a game session
4. WHEN a Pipe_Pair moves entirely off the left edge of the screen, THE Scrolling_Engine SHALL remove that Pipe_Pair from the active game elements and release its associated memory
5. THE Scrolling_Engine SHALL set an initial Gap height of between 120 and 150 pixels between the top Pipe and bottom Pipe of each Pipe_Pair at the start of a game session
6. THE Pipe_Pairs SHALL be rendered as green rectangular columns with a fixed width of between 50 and 70 pixels extending from the top and bottom edges of the screen to the respective edges of the Gap
7. WHILE the game is in the Playing state, THE Difficulty_Manager SHALL progressively increase the horizontal scroll speed by a defined increment of between 0.1 and 0.3 pixels per frame for every 10 points scored, up to a maximum speed cap of between 6 and 8 pixels per frame
8. WHILE the game is in the Playing state, THE Difficulty_Manager SHALL progressively decrease the Gap height by between 2 and 5 pixels for every 10 points scored, down to a minimum Gap height of between 80 and 100 pixels
9. WHILE the game is in the Playing state, THE Difficulty_Manager SHALL progressively decrease the horizontal spacing interval between consecutive Pipe_Pairs by between 5 and 10 pixels for every 10 points scored, down to a minimum spacing of between 150 and 180 pixels

### Requirement 4: Collision Detection and Game Over

**User Story:** As a player, I want the game to detect when I hit a pipe or boundary so that the game ends fairly.

#### Acceptance Criteria

1. WHEN the Ghost's bounding box overlaps with any Pipe's bounding box on any frame, THE Collision_Detector SHALL transition the Game_State to Game_Over
2. WHEN the Ghost's bounding box extends below the top edge of the HUD bar, THE Collision_Detector SHALL transition the Game_State to Game_Over
3. WHEN the Ghost's bounding box extends above the top edge of the Game_Canvas, THE Collision_Detector SHALL transition the Game_State to Game_Over
4. WHEN the Game_State transitions to Game_Over, THE Audio_Manager SHALL play the game_over.wav sound effect
5. WHEN the Game_State transitions to Game_Over, THE Scrolling_Engine SHALL stop moving all Pipe_Pairs and Collectibles
6. WHEN the Game_State transitions to Game_Over, THE Ghost SHALL stop applying gravitational acceleration and remain at its current position

### Requirement 5: Scoring System

**User Story:** As a player, I want to earn points for passing through pipes and see my score, so that I can track my progress.

#### Acceptance Criteria

1. WHEN the Ghost's horizontal position passes the trailing edge of a Pipe_Pair, THE Score_Manager SHALL increment the current score by one point
2. THE HUD SHALL display the current score and the high score in the format "Score: X | High: X" on a dark bar at the bottom of the Game_Canvas during all Game_States
3. WHEN the Game_State transitions to Game_Over, THE Score_Manager SHALL compare the current score to the stored high score and update the high score if the current score is greater
4. THE Score_Manager SHALL persist the high score using browser local storage so that the high score is retained across browser sessions
5. IF browser local storage is unavailable or the read operation fails, THEN THE Score_Manager SHALL default the high score to zero and continue operating without persistence
6. WHEN a new game session starts, THE Score_Manager SHALL reset the current score to zero
7. WHEN the score is incremented, THE HUD SHALL update the displayed current score within the same frame
8. WHEN the score is incremented by any amount, THE Game_Canvas SHALL display a Score_Popup near the Ghost showing the points awarded (e.g., "+1" or "+5") that animates upward and fades out over a duration of between 500 and 1000 milliseconds

### Requirement 6: Collectibles

**User Story:** As a player, I want to collect floating objects for bonus points, so that I have additional goals during gameplay.

#### Acceptance Criteria

1. WHILE the game is in the Playing state, THE Scrolling_Engine SHALL spawn a Collectible horizontally midway between consecutive Pipe_Pairs with a spawn probability between 30% and 50% per Pipe_Pair interval, positioned at a random vertical location within the playable area boundaries
2. THE Collectibles SHALL be rendered as white rounded rectangles with a fixed width and height, displayed with a semi-transparent opacity between 0.4 and 0.7, and with a gentle vertical oscillation animation to convey a floating effect
3. WHEN the Ghost intersects with a Collectible, THE Score_Manager SHALL award 5 bonus points to the current score and remove that Collectible from the scene
4. WHILE the game is in the Playing state, THE Scrolling_Engine SHALL move each Collectible from right to left at an individual horizontal speed randomly assigned at spawn time from a range between 50% and 150% of the base Pipe_Pair speed, creating a parallax depth effect where faster Collectibles appear closer and slower Collectibles appear farther away
5. WHEN a Collectible moves entirely off the left edge of the screen, THE Scrolling_Engine SHALL remove that Collectible from the active game elements
6. IF the Ghost collides with a Pipe or boundary on the same frame as intersecting a Collectible, THEN THE Collision_Detector SHALL transition the Game_State to Game_Over without awarding the bonus points for that Collectible
7. THE Scrolling_Engine SHALL assign each Collectible an opacity value that correlates with its assigned speed, where slower Collectibles have lower opacity to reinforce the perception of distance

### Requirement 7: Game State Management

**User Story:** As a player, I want to be able to start, play, pause, and restart the game seamlessly, so that I have a smooth gameplay experience with the ability to take breaks.

#### Acceptance Criteria

1. THE Game_State SHALL support exactly four states: Ready, Playing, Paused, and Game_Over
2. WHEN the player provides input (spacebar, click, or tap) while the Game_State is Ready, THE Game_State SHALL transition to Playing and begin the game loop using requestAnimationFrame
3. WHILE the Game_State is Ready, THE Game_Canvas SHALL display the Ghost character at its initial centered position, a text prompt instructing the player how to start, and the persisted high score displayed prominently so the player can see their best performance before starting
4. WHILE the Game_State is Ready, THE Ghost SHALL be rendered at its initial centered position without gravitational acceleration applied
5. WHEN the player presses the Escape key, the P key, or activates a pause button while the Game_State is Playing, THE Game_State SHALL transition to Paused
6. WHILE the Game_State is Paused, THE Physics_Engine SHALL not apply gravitational acceleration or velocity changes to the Ghost, and THE Scrolling_Engine SHALL not move Pipe_Pairs, Collectibles, or Clouds, freezing all movement at its current position
7. WHILE the Game_State is Paused, THE Game_Canvas SHALL continue to render the current frame (showing all game elements in their frozen positions) with a semi-transparent dark overlay and a centered "Paused" text label with a prompt instructing the player how to resume
8. WHEN the player presses the Escape key, the P key, or activates the pause button while the Game_State is Paused, THE Game_State SHALL transition to Playing and resume the game loop from the exact state prior to pausing
9. WHILE the Game_State is Paused, THE Game_Canvas SHALL ignore spacebar, click, and tap inputs so that the player does not accidentally trigger a jump upon resuming
10. WHEN the Game_State transitions to Game_Over, THE Game_Canvas SHALL display the final score, the high score, a "New High Score!" indicator if the current score exceeds the previously stored high score, and a text prompt instructing the player how to restart
11. WHEN the player provides input (spacebar, click, or tap) while the Game_State is Game_Over, THE Game_State SHALL transition to Ready, reset all Pipe_Pairs, Collectibles, Ghost position, and Ghost velocity to initial values, and reset the current score to zero
12. WHILE the Game_State is Ready or Game_Over, THE Scrolling_Engine SHALL not generate or move Pipe_Pairs or Collectibles

### Requirement 8: Visual Style and Background

**User Story:** As a player, I want the game to have a retro hand-drawn look, so that the experience feels charming and distinctive.

#### Acceptance Criteria

1. THE Game_Canvas SHALL render a light blue solid color as the background that is visually distinct from the green Pipe_Pairs and white Collectibles
2. THE Pipe_Pairs SHALL be rendered with a green fill color and a darker-shade outline of at least 2 pixels in width on all edges
3. THE HUD bar SHALL be rendered as a dark-filled rectangle spanning the full width of the Game_Canvas at the bottom, with a fixed height between 30 and 50 pixels at the logical resolution
4. THE Game_Canvas SHALL render all text using a monospace font at a minimum size of 14 pixels, with sufficient contrast against the HUD background to remain legible
5. IF a specified font fails to load, THEN THE Game_Canvas SHALL fall back to a default system monospace font

### Requirement 9: Parallax Cloud Background

**User Story:** As a player, I want to see semi-transparent clouds drifting at different speeds in the background, so that the game world feels deep and immersive with a sense of perspective.

#### Acceptance Criteria

1. THE Game_Canvas SHALL render at least three distinct Parallax_Layers behind all foreground game elements (Pipe_Pairs, Ghost, Collectibles) and in front of the solid background color
2. WHILE the game is in the Playing state, THE Scrolling_Engine SHALL move Clouds on the nearest Parallax_Layer at 70% to 90% of the base Pipe_Pair scroll speed, Clouds on the middle Parallax_Layer at 40% to 60% of the base speed, and Clouds on the farthest Parallax_Layer at 10% to 30% of the base speed
3. THE Scrolling_Engine SHALL render Clouds on the nearest Parallax_Layer with an opacity between 0.5 and 0.7, Clouds on the middle Parallax_Layer with an opacity between 0.3 and 0.5, and Clouds on the farthest Parallax_Layer with an opacity between 0.1 and 0.3
4. THE Scrolling_Engine SHALL render Clouds on the nearest Parallax_Layer at a scale factor between 0.8 and 1.0, Clouds on the middle Parallax_Layer at a scale factor between 0.5 and 0.7, and Clouds on the farthest Parallax_Layer at a scale factor between 0.2 and 0.4, relative to a base Cloud size of between 60 and 120 pixels in width
5. WHEN a Cloud moves entirely off the left edge of the screen, THE Scrolling_Engine SHALL remove that Cloud and spawn a new Cloud on the same Parallax_Layer at a random vertical position off the right edge of the screen
6. WHILE the Game_State is Ready or Game_Over, THE Scrolling_Engine SHALL continue to scroll all Parallax_Layers at their assigned speeds to maintain visual interest on non-playing screens
7. THE Clouds SHALL be rendered as soft white rounded shapes with no hard edges, using a fill color of white with the layer-appropriate opacity applied uniformly
8. THE Scrolling_Engine SHALL maintain between 2 and 5 Clouds per Parallax_Layer at all times, distributing them at random vertical positions within the playable area above the HUD

### Requirement 10: Ghost Physics System

**User Story:** As a player, I want the ghost's movement to feel responsive and physically consistent, so that I can develop muscle memory and predict trajectories accurately.

#### Acceptance Criteria

1. THE Physics_Engine SHALL apply a constant gravitational acceleration of a defined value between 0.4 and 0.6 pixels per frame squared to the Ghost's vertical velocity on every frame while the Game_State is Playing
2. WHEN the player presses the spacebar, clicks the mouse, or taps the screen while the Game_State is Playing, THE Physics_Engine SHALL set the Ghost's vertical velocity to an upward ascent velocity of a defined value between -6 and -9 pixels per frame (negative indicating upward direction)
3. THE Physics_Engine SHALL cap the Ghost's downward velocity at a Terminal_Velocity of a defined value between 8 and 12 pixels per frame, preventing the Ghost from falling faster than this limit regardless of gravitational accumulation
4. THE Physics_Engine SHALL cap the Ghost's upward velocity at a Terminal_Velocity of a defined value between -8 and -10 pixels per frame (negative indicating upward direction), preventing the Ghost from exceeding this speed even with rapid successive inputs
5. WHILE the Game_State is Playing, THE Physics_Engine SHALL conserve the Ghost's vertical momentum between frames by accumulating gravitational acceleration onto the existing velocity rather than replacing the velocity value each frame
6. THE Physics_Engine SHALL apply Movement_Interpolation using delta-time scaling so that the Ghost's position updates remain visually smooth and physically consistent when the frame rate fluctuates between 30 and 60 frames per second
7. WHEN the player triggers an ascent input, THE Physics_Engine SHALL immediately override the Ghost's current vertical velocity with the defined ascent velocity, providing responsive control without requiring deceleration of the existing downward momentum first
8. WHILE the Game_State is Ready, THE Physics_Engine SHALL not apply gravitational acceleration or velocity changes to the Ghost, maintaining the Ghost at a fixed vertical position

### Requirement 11: Audio and Visual Feedback

**User Story:** As a player, I want audio cues and visual effects for key game events, so that the game feels responsive, polished, and satisfying to play.

#### Acceptance Criteria

1. WHEN the player triggers a jump input while the Game_State is Playing, THE Audio_Manager SHALL play the jump.wav sound effect with no perceptible delay (within 50 milliseconds of input)
2. WHEN the Score_Manager increments the current score (pipe pass or collectible pickup), THE Audio_Manager SHALL play a short scoring sound effect distinct from the jump and game over sounds
3. WHEN the Game_State transitions to Game_Over, THE Audio_Manager SHALL play the game_over.wav sound effect
4. WHILE the Game_State is Playing, THE Audio_Manager SHALL play looping background music at a reduced volume level (between 20% and 40% of maximum) so that sound effects remain clearly audible over the music
5. WHEN the Game_State transitions to Paused, THE Audio_Manager SHALL pause the background music, and WHEN the Game_State transitions back to Playing, THE Audio_Manager SHALL resume the background music from the paused position
6. WHEN the Game_State transitions to Game_Over, THE Game_Canvas SHALL apply a Screen_Shake effect by offsetting the rendering origin by random values between -3 and 3 pixels on both axes for a duration of between 200 and 400 milliseconds
7. WHILE the Game_State is Playing, THE Game_Canvas SHALL emit Particle_Trail elements behind the Ghost at a rate of between 3 and 8 particles per frame, where each particle is a small semi-transparent circle (opacity between 0.3 and 0.6) that drifts slightly downward and to the left while fading out over a lifespan of between 200 and 500 milliseconds
8. WHEN the Ghost triggers an ascent input, THE Game_Canvas SHALL emit a brief burst of between 5 and 10 additional Particle_Trail elements in a downward fan pattern to visually emphasize the jump action
9. THE Particle_Trail elements SHALL use a color that complements the Ghost sprite (white or light blue with the defined opacity) and SHALL be rendered behind the Ghost but in front of the Parallax_Layers
10. WHEN the Game_State is Ready or Game_Over, THE Audio_Manager SHALL not play background music, and THE Game_Canvas SHALL not emit Particle_Trail elements
