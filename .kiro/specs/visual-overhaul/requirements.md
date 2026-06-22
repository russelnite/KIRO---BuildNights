# Requirements Document

## Introduction

Visual Overhaul is a set of upgrades to the Flappy Kiro game that modernizes the look and feel while adding a new gameplay mechanic. The changes include replacing the ghost character with a custom winged character (Nailong) featuring hybrid three-tier wing animation, changing the canvas from portrait (480×640) to landscape orientation (800×500) with a centered HUD layout, adding velocity-based character tilt/rotation for visual flair, upgrading flat green pipe rectangles to styled pipes with rounded caps, and introducing flying obstacle enemies at higher difficulty tiers that cross the screen horizontally as additional collision hazards. The existing jump mechanics (single tap and hold-to-rapid-jump) remain unchanged; only visual feedback for these inputs is added.

## Glossary

- **Game_Canvas**: The HTML5 Canvas element that renders the game at a fixed logical resolution of 800×500, scaled to fit the browser window while maintaining aspect ratio
- **Nailong**: The player-controlled custom winged character sprite that replaces the previous Ghost, rendered using two alternating sprite frames (wings-up and wings-down) with a hybrid three-tier animation speed system
- **Wings_Up_Frame**: The sprite image showing Nailong with wings raised, used as one frame of the continuous flying animation
- **Wings_Down_Frame**: The sprite image showing Nailong with wings lowered, used as one frame of the continuous flying animation
- **Wing_Cycle**: The continuous alternation between Wings_Up_Frame and Wings_Down_Frame at a rate determined by the current animation speed tier
- **Base_Wing_Rate**: The slowest Wing_Cycle speed (250–350ms per frame) used during idle/normal flying with no active jump input
- **Jump_Wing_Rate**: The moderate Wing_Cycle speed (120–180ms per frame) triggered briefly after a single jump input
- **Rapid_Wing_Rate**: The fastest Wing_Cycle speed (60–100ms per frame) active while the player is holding the jump key and rapid jumping is occurring (using the game's existing hold-to-jump behavior)
- **Character_Tilt**: The visual rotation applied to Nailong based on vertical velocity, tilting forward (clockwise) when descending and backward (counter-clockwise) when ascending
- **Pipe_Pair**: A top Pipe and bottom Pipe positioned at the same horizontal location with a defined gap between them
- **Pipe_Cap**: A wider, darker-green rounded rectangle drawn at the open end of each Pipe (bottom of top Pipe, top of bottom Pipe) to give a classic plumbing pipe appearance
- **Flying_Obstacle**: An image-based enemy hazard that spawns off-screen and travels horizontally across the play area once the player's score reaches 30 points, causing Game_Over on collision with Nailong
- **Difficulty_Manager**: The subsystem that progressively adjusts game parameters (pipe speed, gap size, spacing, and Flying_Obstacle spawn behavior) based on the player's current score
- **Scrolling_Engine**: The subsystem responsible for moving Pipe_Pairs, Collectibles, Clouds, and Flying_Obstacles from right to left across the screen
- **Collision_Detector**: The subsystem that determines whether Nailong has collided with a Pipe, boundary, or Flying_Obstacle
- **CONFIG**: The centralized JavaScript object holding all tunable game parameters, serving as the single source of truth for constants
- **Renderer**: The subsystem that orchestrates all Canvas 2D drawing operations in the correct z-order each frame
- **HUD**: The heads-up display bar rendered at the bottom of the Game_Canvas showing the current score and best (high) score, with text centered horizontally

## Requirements

### Requirement 1: Landscape Canvas Orientation

**User Story:** As a player, I want the game displayed in a landscape aspect ratio with a clean centered HUD, so that the gameplay feels like the classic Flappy Bird layout with more horizontal viewing space and clear score visibility.

#### Acceptance Criteria

1. THE Game_Canvas SHALL render at a fixed logical resolution of 800 pixels wide by 500 pixels tall
2. THE Game_Canvas SHALL scale to fit the browser window while maintaining the 800:500 aspect ratio using CSS scaling
3. WHEN the canvas dimensions change, THE CONFIG object SHALL update the canvas.width to 800 and canvas.height to 500, and all subsystems that reference canvas dimensions SHALL use the updated values
4. THE Nailong character SHALL have a starting horizontal position located within the left quarter of the 800-pixel canvas width (startX of 150 pixels)
5. THE Nailong character SHALL have a starting vertical position at the vertical center of the 500-pixel canvas height (startY of 250 pixels)
6. THE Scrolling_Engine SHALL position Pipe_Pair gap centers between 20% and 80% of the playable area height, where playable area height equals 500 minus the HUD height
7. WHEN the game renders, THE Renderer SHALL draw all elements (Pipes, Clouds, Collectibles, HUD, Nailong) correctly within the 800×500 coordinate space
8. THE Renderer SHALL display the score text and the best (high) score text centered horizontally within the HUD bar, not left-aligned
9. WHEN the Game_State transitions to Game_Over, THE Renderer SHALL display the "Game Over!" text in a red color (hex value approximately #e74c3c) instead of white

### Requirement 2: Custom Winged Character with Hybrid Wing Animation

**User Story:** As a player, I want Nailong (a custom winged character) with a three-tier flapping animation that responds to my input style, so that the game feels more alive and my actions have clear visual feedback.

#### Acceptance Criteria

1. THE Renderer SHALL load two sprite image assets: a Wings_Up_Frame image and a Wings_Down_Frame image from the assets directory
2. WHILE the Game_State is Playing and no jump input is active, THE Renderer SHALL cycle the Nailong sprite between Wings_Up_Frame and Wings_Down_Frame at the Base_Wing_Rate (250–350 milliseconds per frame)
3. WHEN the player triggers a single jump input (one press), THE Renderer SHALL increase the Wing_Cycle speed to the Jump_Wing_Rate (120–180 milliseconds per frame) for a duration of between 200 and 400 milliseconds, then return to the Base_Wing_Rate
4. WHILE the player holds the jump key and the existing rapid jump behavior is active (repeated jump impulses firing), THE Renderer SHALL set the Wing_Cycle speed to the Rapid_Wing_Rate (60–100 milliseconds per frame) for the entire duration the key is held
5. WHEN the player releases the jump key after rapid jumping, THE Renderer SHALL return the Wing_Cycle speed to the Base_Wing_Rate
6. THE Renderer SHALL detect the held-key state (rapid jumping) by tracking whether multiple jump inputs occur within a short window (e.g., within 200ms of each other) without requiring changes to the existing InputHandler jump mechanics
6. WHILE the Game_State is Ready, THE Renderer SHALL display Nailong with the continuous Wing_Cycle animation at the Base_Wing_Rate alongside the idle vertical bob animation
7. THE Nailong character SHALL be rendered at a fixed width and height defined in CONFIG (between 36 and 48 pixels per dimension), maintaining the circular hitbox radius proportional to the sprite size
8. IF either sprite image fails to load, THEN THE Renderer SHALL fall back to rendering a white circle of the configured Nailong dimensions as a placeholder
9. WHILE the Game_State is Paused, THE Renderer SHALL freeze the Wing_Cycle at its current frame and not advance the animation
10. WHILE the Game_State is Game_Over, THE Renderer SHALL freeze the Wing_Cycle at its current frame and apply the existing death rotation and opacity fade effects

### Requirement 3: Character Tilt and Rotation

**User Story:** As a player, I want Nailong to tilt forward when falling and tilt backward when rising, so that the character movement looks natural and responsive to physics.

#### Acceptance Criteria

1. WHILE Nailong has a positive vertical velocity (descending), THE Renderer SHALL apply a clockwise rotation (forward tilt) to the Nailong sprite proportional to the downward velocity magnitude
2. WHILE Nailong has a negative vertical velocity (ascending), THE Renderer SHALL apply a counter-clockwise rotation (backward tilt) to the Nailong sprite proportional to the upward velocity magnitude
3. THE Renderer SHALL apply a maximum forward tilt (descending) that is greater than the maximum backward tilt (ascending), so that the descending tilt is more pronounced than the ascending tilt
4. WHEN Nailong's vertical velocity is zero, THE Renderer SHALL render Nailong with no rotation (level orientation)
5. THE Character_Tilt SHALL be purely visual and SHALL NOT affect the circular hitbox used by the Collision_Detector for collision calculations
6. THE Renderer SHALL apply the Character_Tilt rotation using canvas transform operations (save, translate to center, rotate, draw, restore) without modifying Nailong's position or hitbox coordinates

### Requirement 4: Styled Pipes with Caps

**User Story:** As a player, I want the pipes to look like classic plumbing pipes with rounded caps at their open ends, so that the game has a more polished and recognizable visual style.

#### Acceptance Criteria

1. THE Renderer SHALL draw each top Pipe with a Pipe_Cap at the bottom edge of the top Pipe (the edge facing the gap)
2. THE Renderer SHALL draw each bottom Pipe with a Pipe_Cap at the top edge of the bottom Pipe (the edge facing the gap)
3. THE Pipe_Cap SHALL be rendered as a rectangle that is wider than the Pipe body by between 6 and 12 pixels on each side (total width = Pipe width + 12 to 24 pixels), with a height of between 20 and 30 pixels
4. THE Pipe_Cap SHALL be filled with a darker green color (distinct from the Pipe body fill) and have rounded corners with a border radius of between 3 and 6 pixels
5. THE Pipe body SHALL retain its existing green fill color and dark green outline as defined in CONFIG
6. THE Collision_Detector SHALL use the Pipe body dimensions (not the Pipe_Cap dimensions) for collision detection, so that Pipe_Caps are purely decorative and do not affect gameplay fairness
7. THE Renderer SHALL draw Pipe_Caps as part of the pipe rendering pass, positioned correctly relative to each Pipe's x coordinate and gap position

### Requirement 5: Flying Obstacles at Higher Difficulty

**User Story:** As a player, I want flying enemy obstacles to appear once my score reaches 30 points, so that advanced gameplay provides an additional challenge beyond faster pipes and narrower gaps.

#### Acceptance Criteria

1. WHEN the player's score reaches a defined activation threshold of 30 points, THE Scrolling_Engine SHALL begin spawning Flying_Obstacles in addition to Pipe_Pairs
2. THE Scrolling_Engine SHALL spawn Flying_Obstacles at a horizontal position off the right edge of the Game_Canvas, at a random vertical position within 15% to 85% of the playable area height
3. WHILE the Game_State is Playing and Flying_Obstacles are active, THE Scrolling_Engine SHALL move each Flying_Obstacle from right to left at a speed faster than the current pipe speed, defined as a multiplier of between 1.2 and 2.0 times the pipe speed
4. THE Difficulty_Manager SHALL increase Flying_Obstacle spawn frequency as the score increases beyond the activation threshold, starting at one obstacle per 3 to 5 seconds and increasing to one per 1.5 to 2.5 seconds at maximum difficulty
5. THE Difficulty_Manager SHALL increase Flying_Obstacle speed multiplier as the score increases, starting at 1.2 times pipe speed at the activation threshold and reaching 2.0 times pipe speed at maximum difficulty
6. THE Scrolling_Engine SHALL enforce a maximum of 2 Flying_Obstacles visible on screen at any given time, deferring new spawns until an existing Flying_Obstacle exits the screen
7. WHEN a Flying_Obstacle collides with Nailong, THE Collision_Detector SHALL transition the Game_State to Game_Over using the same circle-vs-rectangle collision algorithm used for Pipe collision
8. THE Renderer SHALL render each Flying_Obstacle using a user-provided image asset loaded from the assets directory, at a height of approximately 75% of Nailong's configured height (e.g., if Nailong is 48px tall, the Flying_Obstacle is approximately 36px tall), with width scaled proportionally to the source image aspect ratio
9. WHEN a Flying_Obstacle moves entirely off the left edge of the Game_Canvas, THE Scrolling_Engine SHALL remove that Flying_Obstacle from the active game elements and return the object to the pool
10. WHILE the Game_State is Paused, THE Scrolling_Engine SHALL freeze all Flying_Obstacles at their current positions
11. WHILE the Game_State is Game_Over or Ready, THE Scrolling_Engine SHALL not spawn or move Flying_Obstacles
12. IF the Flying_Obstacle image asset fails to load, THEN THE Renderer SHALL fall back to rendering a red filled circle of the configured Flying_Obstacle dimensions as a placeholder
13. THE Flying_Obstacle objects SHALL be managed using the existing ObjectPool pattern to avoid per-frame memory allocation, with a pool size defined in CONFIG
