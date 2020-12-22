"use strict";

/**
 * Controls logging level.
 * When false, all logging becomes no-op, so compiled to nothing.
 * @const {boolean}
 */
const DEBUG = false;

/**
 * Epsilon for vec3 and mat4 comparisons.
 * @const {number}
 */
const EPSILON = 0.00001;

/**
 * Pi approximation.
 * Google Closure seems to need the "const" hint.
 * @const {number}
 */
const PI = Math.PI;

/**
 * The number of segments in a circle approximation.
 * @const {number}
 */
const CIRCLE_SEGMENT_COUNT = 64;

/**
 * @const {number}
 */
const MENU_BUTTON_WIDTH = 100;

/**
 * @const {number}
 */
const MENU_BUTTON_HEIGHT = 40;

/**
 * Y-coordinate of "Join" button relative to centerY.
 * @const {number}
 */
const JOIN_BUTTON_OFFSET = 40;

/**
 * Y-coordinate of "Name" button relative to centerY.
 * @const {number}
 */
const NAME_BUTTON_OFFSET = 100;

/**
 * The game ID of the "lobby" game.
 * The lobby game is a special case game with no geometry,
 * and specialy HUD rendering.
 * @const {number}
 */
const LOBBY_ID = 0;

/**
 * Height of the player model (in meters).
 * @const {number}
 */
const PLAYER_HEIGHT = 2.0;

/**
 * Half of player height.
 * Player xyz coordinate is the center of the player.
 * @const {number}
 */
const PLAYER_HALF_HEIGHT = 0.5 * PLAYER_HEIGHT;

/**
 * Height of the player eye level (in meters).
 * Relative to player center point.
 * @const {number}
 */
const PLAYER_EYELEVEL = 0.25 * PLAYER_HEIGHT;

/**
 * Radius (half width and half height) of a tree (in meters).
 * @const {number}
 */
const TREE_SIZE = 5;

/**
 * Radius (half width and half height) of a rock (in meters).
 * @const {number}
 */
const ROCK_SIZE = 1;

/**
 * Radius (half width and half height) of a medkit (in meters).
 * @const {number}
 */
const AMMO_SIZE = .5;

/**
 * Radius (half width and half height) of a medkit (in meters).
 * @const {number}
 */
const MEDKIT_SIZE = .5;

/**
 * Total number of white/blue circles.
 * @const {number}
 */
const CIRCLE_COUNT = 6;

/**
 * Index of the last circle.
 * @const {number}
 */
const LAST_CIRCLE_INDEX = CIRCLE_COUNT - 1;

/**
 * The last circle phase index.
 * @const {number}
 */
const LAST_CIRCLE_PHASE = LAST_CIRCLE_INDEX * 2;

/**
 * Default player run speed (meters per second).
 * @const {number}
 */
const RUN_SPEED = 8.0;

/**
 * Gravitational force (meters per second per second).
 * @const {number}
 */
const GRAVITY = 20;

/**
 * Jump speed at time of jump (meters per second).
 * @const {number}
 */
const JUMP_POWER = 6;

/**
 * Minimum x value for the world in meters.
 * @const {number}
 */
const MIN_X = -500.0;

/**
 * Maximum X value for the world in meters.
 * @const {number}
 */
const MAX_X = 500.0;

/**
 * Minimum z value for the world in meters.
 * @const {number}
 */
const MIN_Z = -500.0;

/**
 * Maximum z value for the world in meters.
 * @const {number}
 */
const MAX_Z = 500.0;

/**
 * The "playable" range is the percentage of the map area that has land.
 * Outside of this playable range is only water.
 * @const {number}
 */
const PLAYABLE_RANGE = 0.8;

/**
 * Minimum "playable" x value in meters.
 * @const {number}
 */
const PLAYABLE_MIN_X = PLAYABLE_RANGE * MIN_X;

/**
 * Maximum "playable" x value in meters.
 * @const {number}
 */
const PLAYABLE_MAX_X = PLAYABLE_RANGE * MAX_X;

/**
 * Minimum "playable" z value in meters.
 * @const {number}
 */
const PLAYABLE_MIN_Z = PLAYABLE_RANGE * MIN_Z;

/**
 * Maximum "playable" z value in meters.
 * @const {number}
 */
const PLAYABLE_MAX_Z = PLAYABLE_RANGE * MAX_Z;

/**
 * Width and height of a map "tile" in meters.
 * @const {number}
 */
const TILE_SIZE = 40.0;

/**
 * Length of a game phase duration in seconds.
 * A "full" phase is two "half" phases.
 * The first "half" phase is the stationary blue circle.
 * The second "half" phase is the shrinking blue circle.
 * @const {number}
 */
const FULL_PHASE_DURATION = 60;

/**
 * Length of a half phase duration.
 * A "full" phase is two "half" phases.
 * The first "half" phase is the stationary blue circle.
 * The second "half" phase is the shrinking blue circle.
 * @const {number}
 */
const HALF_PHASE_DURATION = FULL_PHASE_DURATION / 2;

/*
 * Basic utility helpers.
 */

/**
 * Removes an element from the array.
 * @param {!Array} array
 * @param {!Object} element
 */
function removeElement(array, element) {
    array.splice(array.indexOf(element), 1);
}

/**
 * Moves elements from the source array to the destination array.
 * @param {!Array} source
 * @param {!Array} dest
 */
function moveElements(source, dest) {
    if (source.length > 0) {
        // Copy all elements
        // https://stackoverflow.com/a/1374131/2051724
        dest.push.apply(dest, source);

        // Clear the source array
        source.length = 0;
    }
}

/**
 * Normalizes a radians value to the range -pi to +pi.
 * @param {number} radians
 * @return {number}
 */
function normalizeRadians(radians) {
    while (radians > PI) {
        radians -= 2 * PI;
    }
    while (radians < -PI) {
        radians += 2 * PI;
    }
    return radians;
}

/**
 * Normalizes a degrees value to the range 0 to 360.
 * @param {number} degrees
 * @return {number}
 */
function normalizeDegrees(degrees) {
    while (degrees < 0) {
        degrees += 360;
    }
    while (degrees >= 360) {
        degrees -= 360;
    }
    return degrees;
}

/**
 * Converts radians to degrees.
 * @param {number} radians
 * @return {number}
 */
function toDegrees(radians) {
    return (radians * 180.0 / PI + .5) | 0;
}

/**
 * Returns a random element from the array.
 * @param {!Array} array
 */
function chooseRandom(array) {
    return array[(Math.random() * array.length) | 0];
}

/**
 * Generates a random player name.
 * @return {string}
 */
function generatePlayerName() {
    return chooseRandom(['Blue', 'Red', 'Green', 'Orange', 'Mad', 'Crazy']) +
        chooseRandom(['Cat', 'Dog', 'Turtle', 'Wombat', 'Tiger', 'Boi', 'Killer']) +
        ((Math.random() * 1e3) | 0);
}

/*
 * Game data structures
 */

/**
 * Entity types.
 *
 * Entities include 3 use cases:
 *   1) Actual entities (players, bullets)
 *   2) Client side events (joining, shooting)
 *   3) Server side events (bullet collisions, death, game over)
 *
 * @enum {number}
 */
const EntityType = {
    // Global constants
    GROUND: 1,

    // Entities
    PLAYER: 2,
    BULLET: 3,
    TREE: 4,
    ROCK: 5,
    AMMO: 6,
    MEDKIT: 7,

    // Client events
    JOIN: 8,
    SHOOT: 9,

    // Server events
    GAME_CREATE: 10,
    GAME_START: 11,
    GAME_END: 12,
    GUNFIRE: 13,
    BLOOD: 14,
    DEATH: 15,
    PICKUP: 16
};

/**
 * Constant for ground.
 * @const {!GameEntity}
 */
const GROUND = new GameEntity(EntityType.GROUND, 0, 0, 0);

/**
 * Creates a new random number generator.
 *
 * LCG
 * https://stackoverflow.com/a/424445/2051724
 *
 * @constructor
 * @param {number} seed  The integer seed.
 */
function RNG(seed) {
    // LCG using GCC's constants
    this.m = 0x80000000; // 2**31;
    this.a = 1103515245;
    this.c = 12345;
    this.state = seed;
}

RNG.prototype.nextInt = function () {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
};

RNG.prototype.nextFloat = function () {
    // returns in range [0,1]
    return this.nextInt() / (this.m - 1);
};

RNG.prototype.nextRange = function (start, end) {
    // returns in range [start, end): including start, excluding end
    // can't modulu nextInt because of weak randomness in lower bits
    var rangeSize = end - start;
    var randomUnder1 = this.nextInt() / this.m;
    return start + ((randomUnder1 * rangeSize) | 0);
};

/**
 * Creates a new circle.
 *
 * @constructor
 * @param {number} x
 * @param {number} z
 * @param {number} radius
 */
function Circle(x, z, radius) {
    this.x = x;
    this.z = z;
    this.radius = radius;
}

/**
 * Returns true if the entity is outside the circle.
 * @param {!Circle} circle
 * @param {!GameEntity} entity
 */
Circle.isOutside = function (circle, entity) {
    return Math.hypot(circle.x - entity.x, circle.z - entity.z) > circle.radius;
};

/**
 * Creates a new map generator.
 *
 * @constructor
 * @param {number} seed  The random number generator seed.
 */
function GameMap(seed) {
    this.seed = seed;
    this.rng = new RNG(seed);
    this.circles = this.initCircles();
    this.hills = this.initHills();
    this.mapHeights = this.initGround();
    this.trees = this.createRandomEntities(EntityType.TREE, 1000, TREE_SIZE);
    this.rocks = this.createRandomEntities(EntityType.ROCK, 1000, ROCK_SIZE);
    this.blueCircle = new Circle(0, 0, 0);
}

/**
 * Precalculates the circles for the map.
 * @return {!Array.<!Circle>}
 */
GameMap.prototype.initCircles = function () {
    const circles = [];

    // First circle is always the entire island
    let currCircle = new Circle(0, 0, MAX_X);
    circles.push(currCircle);

    let radius = 320;

    while (circles.length < CIRCLE_COUNT) {
        currCircle = this.chooseCircle(currCircle, radius);
        circles.push(currCircle);
        radius = radius / 2;
    }

    return circles;
};

/**
 * @param {!Circle} parent The parent circle (x, z, radius).
 * @param {number} nr New circle radius.
 * @return {!Circle} The random circle within the parent circle.
 */
GameMap.prototype.chooseCircle = function (parent, nr) {
    const rdelta = parent.radius - nr;
    const minX = parent.x - rdelta;
    const maxX = parent.x + rdelta;
    const minZ = parent.z - rdelta;
    const maxZ = parent.z + rdelta;

    while (true) {
        const nx = this.rng.nextRange(minX, maxX);
        const nz = this.rng.nextRange(minZ, maxZ);
        const dist = Math.hypot(parent.x - nx, parent.z - nz);
        if (dist < rdelta) {
            return new Circle(nx, nz, nr);
        }
    }
};

/**
 * Initializes the map hills.
 */
GameMap.prototype.initHills = function () {
    const hillCount = this.rng.nextRange(6, 20);
    const hills = [];
    for (var i = 0; i < hillCount; i++) {
        let angle = this.rng.nextRange(0, 1e3) / 1e2;
        let dist = this.rng.nextRange(0, 200);
        hills.push([dist * Math.cos(angle), dist * Math.sin(angle)]);
    }
    return hills;
};

/**
 * Initializes the height map based on the hills.
 */
GameMap.prototype.initGround = function () {
    const mapHeights = [];
    const tileCount = (PLAYABLE_MAX_X - PLAYABLE_MIN_X) / TILE_SIZE;
    for (var i = 0; i <= tileCount; i++) {
        const row = [];
        for (var j = 0; j <= tileCount; j++) {
            const x = PLAYABLE_MIN_X + i * TILE_SIZE;
            const z = PLAYABLE_MIN_Z + j * TILE_SIZE;
            row.push(this.calcY(x, z));
        }
        mapHeights.push(row);
    }
    return mapHeights;
};

/**
 * Calculates the Y-axis height at the specified x/z coordinate.
 * This is one-time use during map generation.
 * After map generation, use getY(x, z) instead.
 * @param {number} x
 * @param {number} z
 */
GameMap.prototype.calcY = function (x, z) {
    var maxHeight = 0.1;

    for (var i = 0; i < this.hills.length; i++) {
        var dist = Math.hypot(x - this.hills[i][0], z - this.hills[i][1]);
        var height = 70 - 0.3 * dist;
        maxHeight = Math.max(maxHeight, height);
    }

    // A little bit of randomness
    maxHeight += 5 * (this.rng.nextFloat() - 0.5);
    return maxHeight;
};

/**
 * Returns the Y-axis ground height at the specified x/z coordinate.
 * This is based on the pre-calculated map height, so can only be used after
 * initHills and initGround.
 * @param {number} x
 * @param {number} z
 */
GameMap.prototype.getY = function (x, z) {
    const epsilon = 1;

    if (x <= PLAYABLE_MIN_X) {
        x = PLAYABLE_MIN_X + epsilon;
    }
    if (x >= PLAYABLE_MAX_X) {
        x = PLAYABLE_MAX_X - epsilon;
    }
    if (z <= PLAYABLE_MIN_Z) {
        z = PLAYABLE_MIN_Z + epsilon;
    }
    if (z >= PLAYABLE_MAX_Z) {
        z = PLAYABLE_MAX_Z - epsilon;
    }

    const i = ((x - PLAYABLE_MIN_X) / TILE_SIZE) | 0;
    const j = ((z - PLAYABLE_MIN_Z) / TILE_SIZE) | 0;

    const x1 = i * TILE_SIZE + PLAYABLE_MIN_X;
    const z1 = j * TILE_SIZE + PLAYABLE_MIN_Z;
    const dx = x - x1;
    const dz = z - z1;

    const y1 = this.mapHeights[i][j];
    var x2;
    var y2;
    var z2;
    var x3;
    var y3;
    var z3;

    if (dx > dz) {
        // Top-right triangle
        x2 = x1 + TILE_SIZE;
        y2 = this.mapHeights[i + 1][j];
        z2 = z1;
        x3 = x1 + TILE_SIZE;
        y3 = this.mapHeights[i + 1][j + 1];
        z3 = z1 + TILE_SIZE;
    } else {
        // Bottom-left triangle
        x2 = x1 + TILE_SIZE;
        y2 = this.mapHeights[i + 1][j + 1];
        z2 = z1 + TILE_SIZE;
        x3 = x1;
        y3 = this.mapHeights[i][j + 1];
        z3 = z1 + TILE_SIZE;
    }

    // Barycentric coordinates
    // https://codeplea.com/triangular-interpolation
    const w1 = ((z2 - z3) * (x - x3) + (x3 - x2) * (z - z3)) / ((z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3));
    const w2 = ((z3 - z1) * (x - x3) + (x1 - x3) * (z - z3)) / ((z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3));
    const w3 = 1 - w1 - w2;
    return w1 * y1 + w2 * y2 + w3 * y3;
};

/**
 * Returns a random x or z coordinate in the playable range.
 * @return {number}
 */
GameMap.prototype.getRandomPlayableXZ = function () {
    return PLAYABLE_MIN_X + (PLAYABLE_MAX_X - PLAYABLE_MIN_X) * this.rng.nextFloat();
};

/**
 * Creates an array of entities in the playable range.
 * Ensures that entities are above sea level.
 * @param {!EntityType} entityType
 * @param {number} count
 * @param {number} yOffset
 * @return {!Array.<!GameEntity>}
 */
GameMap.prototype.createRandomEntities = function (entityType, count, yOffset) {
    const result = [];
    while (result.length < count) {
        const x = this.getRandomPlayableXZ();
        const z = this.getRandomPlayableXZ();
        const y = this.getY(x, z) + yOffset;
        if (y > 0) {
            result.push(new GameEntity(entityType, x, y, z));
        }
    }
    return result;
};

/**
 * Returns the circle phase index.
 *
 * "Circle phase" represents the various phases of white and blue circles.
 *
 * In even circle phases, show a new white circle and a stationary blue circle.
 *
 * In odd circle phases, the blue circle moves to the white circle.
 *
 * The structure of circle phases is:
 * [Circle index]/[Circle phase]: [Start time]-[End time]
 *
 *  0/0:   0-60: 0
 *  0/1:  60-120: 0 to 1
 *  1/2: 120-180: 1
 *  1/3: 180-240: 1 to 2
 *  2/4: 240-300: 2
 *  2/5: 300-360: 2 to 3
 *  3/6: 360-420: 3
 *  3/7: 420-480: 3 to 4
 *  4/8: 480-...: 4
 * @param {number} time Time in seconds since game started.
 * @return {number} The circle phase index.
 */
GameMap.prototype.getCirclePhase = function (time) {
    return Math.min(LAST_CIRCLE_PHASE, (time / HALF_PHASE_DURATION) | 0);
};

/**
 * @param {number} time Time in seconds since game started.
 * @return {number} The circle index.
 */
GameMap.prototype.getCircleIndex = function (time) {
    return Math.min(LAST_CIRCLE_INDEX, (time / FULL_PHASE_DURATION) | 0);
};

/**
 * @param {number} time Time in seconds since game started.
 * @return {!Circle} The white circle.
 */
GameMap.prototype.getWhiteCircle = function (time) {
    let phase = this.getCirclePhase(time);
    if (phase === LAST_CIRCLE_PHASE) {
        return this.circles[LAST_CIRCLE_INDEX];
    }

    let index = this.getCircleIndex(time);
    return this.circles[index + 1];
};

/**
 * @param {number} time Time in seconds since game started.
 * @return {!Circle} The blue circle.
 */
GameMap.prototype.getBlueCircle = function (time) {
    let phase = this.getCirclePhase(time);
    if (phase === LAST_CIRCLE_PHASE) {
        return this.circles[LAST_CIRCLE_INDEX];
    }

    let index = this.getCircleIndex(time);
    if (phase % 2 === 0) {
        return this.circles[index];
    }

    let f2 = (time % HALF_PHASE_DURATION) / HALF_PHASE_DURATION;
    let f1 = 1.0 - f2;
    let c1 = this.circles[index];
    let c2 = this.circles[index + 1];

    this.blueCircle.x = f1 * c1.x + f2 * c2.x;
    this.blueCircle.z = f1 * c1.z + f2 * c2.z;
    this.blueCircle.radius = f1 * c1.radius + f2 * c2.radius;
    return this.blueCircle;
};

/**
 * Creates a new game entity.
 *
 * Entities include 3 use cases:
 *   1) Actual entities (players, bullets)
 *   2) Client side events (joining, shooting)
 *   3) Server side events (bullet collisions, death, game over)
 *
 * Full entities are sent in full every game update.
 *
 * Event entities are sent once at the time of the event.
 *
 * It is important to use "undefined" rather than "null" for empty property values.
 * Socket.io serializes "null" property values, which increases network traffic overhead.
 * Socket.io ignores "undefined" property values.
 *
 * @constructor
 * @param {number} entityType
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number=} dx
 * @param {number=} dy
 * @param {number=} dz
 */
function GameEntity(entityType, x, y, z, dx, dy, dz) {
    this.entityType = entityType;
    this.x = x;
    this.y = y;
    this.z = z;

    /** @type {number|undefined} */
    this.dx = dx;
    /** @type {number|undefined} */
    this.dy = dy;
    /** @type {number|undefined} */
    this.dz = dz;

    /**
     * Entity ID.
     * @type {number|undefined}
     */
    this.entityId = undefined;

    /**
     * Entity name.
     * @type {string|undefined}
     */
    this.name = undefined;

    /**
     * "Other" player ID.
     * For bullets, this is the player who shot the bullet.
     * For deaths, this is the "other" player who killed "this" player.
     * @type {number|undefined}
     */
    this.playerId = undefined;

    /**
     * Remaining lifetime for temporary entities (bullets, bloodsplatter, etc).
     * @type {number|undefined}
     */
    this.cooldown = undefined;

    /**
     * Health points.
     * @type {number}
     */
    this.health = 100;

    /**
     * Ammo
     * @type {number|undefined}
     */
    this.ammo = undefined;

    /**
     * Final rank.
     * @type {number|undefined}
     */
    this.rank = undefined;

    /** @type {number|undefined} */
    this.yaw = undefined;

    /** @type {number|undefined} */
    this.pitch = undefined;

    /** @type {!Array.<GameEntity>|undefined} */
    this.actions = undefined;
}

/**
 * Creates a new server-side game state.
 *
 * Instances of this class are sent from server to client on every network update.
 *
 * @constructor
 * @param {number} gameId
 * @param {number} seed
 */
function ServerGameState(gameId, seed) {
    /** @type {number} */
    this.gameId = gameId;

    /** @type {number} */
    this.seed = seed;

    /**
     * The entity ID of the player receiving this game state instance.
     * @type {number}
     */
    this.currentPlayerId = 0;

    /** @type {!Array.<!GameEntity>} */
    this.entities = [];

    /** @type {!Array.<!GameEntity>} */
    this.events = [];

    /**
     * Absolute start time in seconds since epoch.
     * @type {number}
     * */
    this.startTime = 0;

    /**
     * Relative game time in seconds since startTime.
     * @type {number}
     * */
    this.currentTime = 0;
}

ServerGameState.prototype.updateClock = function () {
    this.currentTime = Date.now() / 1000 - this.startTime;
};

ServerGameState.isStarted = function (gameState) {
    return gameState.currentTime >= 0;
};

ServerGameState.isGameOver = function (gameState) {
    return ServerGameState.getAliveCount(gameState) <= 1;
};

ServerGameState.getEntityById = function (gameState, entityId) {
    for (let i = 0; i < gameState.entities.length; i++) {
        let entity = gameState.entities[i];
        if (entity.entityId === entityId) {
            return entity;
        }
    }
    return null;
};

ServerGameState.getCurrentPlayer = function (gameState) {
    return ServerGameState.getEntityById(gameState, gameState.currentPlayerId);
};

ServerGameState.isCurrentPlayerAlive = function (gameState) {
    let entity = ServerGameState.getCurrentPlayer(gameState);
    return entity && entity.health > 0;
};

ServerGameState.getAliveCount = function (gameState) {
    let count = 0;
    for (let i = 0; i < gameState.entities.length; i++) {
        let entity = gameState.entities[i];
        if (entity.entityType === EntityType.PLAYER && entity.health > 0) {
            count++;
        }
    }
    return count;
};

/**
 * Creates a collision.
 * @constructor
 * @param {!GameEntity} entity
 * @param {number} t
 */
function Collision(entity, t) {
    this.entity = entity;
    this.t = t;
}

function log(str) {
    if (DEBUG) {
        console.log(str);
    }
}
