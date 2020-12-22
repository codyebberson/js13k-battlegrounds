'use strict';

/**
 * The time in seconds before the game actually starts.
 */
const PREGAME_TIME = 30;

const server = {
    /** @type {number} */
    nextGameId: LOBBY_ID,

    /**
     * List of all games on server.
     * @type {!Array.<!Game>}
     */
    games: []
};

/**
 * Creates a new user.
 *
 * @constructor
 * @param {!Socket} socket
 * @param {!Game} game
 */
function User(socket, game) {

    /**
     * User's socket connection.
     * @type {!Socket}
     */
    this.socket = socket;

    /**
     * Current game.
     * @type {!Game}
     */
    this.game = game;

    /**
     * Current game entity.
     * @type {!GameEntity}
     */
    this.entity = game.createPlayer(25, 25);

    /**
     * List of events to be sent to the user on the next update.
     * @type {!Array.<!GameEntity>}
     */
    this.events = [];
}


/**
 * Sends the current game state to the user.
 */
User.prototype.sendState = function () {
    let gameState = this.game.gameState;

    // Update the clock -- cannot assume that user's clock is synchronized
    gameState.updateClock();

    // Tell the user what player ID they are
    gameState.currentPlayerId = /** @type {number} */ (this.entity.entityId);

    // Add all queued events to the game state.
    gameState.events.length = 0;
    moveElements(this.events, gameState.events);

    // Send the entire game state to the client
    this.socket.emit('update', gameState);
};

/**
 * Creates a new game.
 *
 * @constructor
 */
function Game() {

    /**
     * The unique game ID.
     * @type {number}
     */
    this.gameId = server.nextGameId++;

    /**
     * The rng seed.
     * @type {number}
     */
    this.seed = (Math.random() * 10000) | 0;

    /**
     * The integer ID of the next entity.
     * @type {number}
     */
    this.nextEntityId = 1;

    /**
     * List of connected users.
     * @type {!Array.<!User>}
     */
    this.users = [];

    /**
     * The map including height map, trees, rocks, etc.
     * @type {!GameMap}
     */
    this.gameMap = new GameMap(this.seed);

    /**
     * Current game state such as entity positions.
     * This entire object is sent to users on every network update.
     * @type {!ServerGameState}
     */
    this.gameState = new ServerGameState(this.gameId, this.seed);

    /**
     * The count of updates.
     * Some actions (i.e., blue circle damage) only happen once per second.
     * Use this update counter to track that.
     * @type {number}
     */
    this.updateCount = 0;

    if (this.gameId !== LOBBY_ID) {
        // Create bots
        for (let i = 0; i < 19; i++) {
            const bot = this.createPlayer(
                this.gameMap.getRandomPlayableXZ(),
                this.gameMap.getRandomPlayableXZ());
            bot.name = generatePlayerName();
            bot.bot = true;
        }

        // Create ammo pickups
        let ammo = this.gameMap.createRandomEntities(EntityType.AMMO, 40, AMMO_SIZE);
        for (let i = 0; i < ammo.length; i++) {
            this.createEntity(EntityType.AMMO, ammo[i].x, ammo[i].y, ammo[i].z);
        }

        // Create medkit pickups
        let medkits = this.gameMap.createRandomEntities(EntityType.MEDKIT, 40, MEDKIT_SIZE);
        for (let i = 0; i < medkits.length; i++) {
            this.createEntity(EntityType.MEDKIT, medkits[i].x, medkits[i].y, medkits[i].z);
        }
    }
}

/**
 * Adds a user to the game.
 * @param {!User} user
 */
Game.prototype.addUser = function (user) {
    if (user.game) {
        user.game.removeUser(user);
    }

    this.users.push(user);
    user.game = this;
    user.entity = this.createPlayer(25, 25);
};

/**
 * Creates a new entity in the game.
 * @param {number} entityType
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number=} dx
 * @param {number=} dy
 * @param {number=} dz
 * @return {!GameEntity}
 */
Game.prototype.createEntity = function (entityType, x, y, z, dx, dy, dz) {
    const entity = new GameEntity(entityType, x, y, z, dx, dy, dz);
    entity.entityId = this.nextEntityId++;
    this.gameState.entities.push(entity);
    return entity;
};

/**
 * Creates a new player entity.
 * @param {number} x
 * @param {number} z
 */
Game.prototype.createPlayer = function (x, z) {
    const player = this.createEntity(
        EntityType.PLAYER,
        x,
        this.gameMap.getY(x, z) + PLAYER_HALF_HEIGHT,
        z);
    player.ammo = 30;
    player.cooldown = 0;
    player.yaw = 0;
    player.pitch = 0;
    return player;
};

/**
 * Removes a user from the game.
 * @param {!User} user
 */
Game.prototype.removeUser = function (user) {
    removeElement(this.users, user);
    removeElement(this.gameState.entities, user.entity);
};

/**
 * Sends an event to all connected users.
 * @param {!GameEntity} event
 */
Game.prototype.broadcastEvent = function (event) {
    for (let i = 0; i < this.users.length; i++) {
        this.users[i].events.push(event);
    }
};

/**
 * Returns whether a new player can join this game.
 * @return {boolean}
 */
Game.prototype.isJoinable = function () {
    // Game is joinable if there is at least 3 seconds before the game begins.
    this.gameState.updateClock();
    return this.gameState.currentTime < -3;
};

Game.prototype.shoot = function (entity, dx, dy, dz) {
    if (entity.ammo <= 0) {
        return;
    }

    const magnitude = Math.hypot(dx, dy, dz);
    dx = dx / magnitude * 10.0;
    dy = dy / magnitude * 10.0;
    dz = dz / magnitude * 10.0;

    const bullet = this.createEntity(
        EntityType.BULLET,
        entity.x,
        entity.y + PLAYER_EYELEVEL,
        entity.z,
        dx,
        dy,
        dz);

    // Tag the shooting player ID
    bullet.playerId = entity.entityId;

    // Put the player's gun on cooldown
    entity.cooldown = 10;
    entity.ammo--;

    // Create the gunfire event
    let gunfire = new GameEntity(EntityType.GUNFIRE,
        bullet.x + 0.05 * dx,
        bullet.y + 0.05 * dy,
        bullet.z + 0.05 * dz);
    gunfire.playerId = bullet.playerId;
    this.broadcastEvent(gunfire);
};

/**
 * Performs bullet collision detection.
 *
 * Searches for first entity that a bullet hits.
 *
 * @param {!GameEntity} bullet The bullet entity.
 * @return {boolean} True if the bullet hit something.
 */
Game.prototype.bulletCollisionDetection = function (bullet) {
    const dx = /** @type {number} */ (bullet.dx);
    const dy = /** @type {number} */ (bullet.dy);
    const dz = /** @type {number} */ (bullet.dz);
    const velocity = Math.hypot(dx, dy, dz);

    // U = unit vector of the line
    const ux = dx / velocity;
    const uy = dy / velocity;
    const uz = dz / velocity;

    let collision = this.lineCollisionDetection(bullet, dx, dy, dz);
    if (collision) {
        let collisionEntity = collision.entity;
        let collisionT = collision.t;
        switch (collisionEntity.entityType) {
            case EntityType.PLAYER:
                log('bullet ' + bullet.entityId + ' hit player id=' + collisionEntity.entityId);
                collisionEntity.health -= 25;
                this.checkPlayerDeath(collisionEntity, bullet.playerId);
                this.broadcastEvent(new GameEntity(EntityType.BLOOD,
                    bullet.x + collisionT * ux,
                    bullet.y + collisionT * uy,
                    bullet.z + collisionT * uz));
                break;

            case EntityType.ROCK:
                log('bullet ' + bullet.entityId + ' hit rock');
                break;

            case EntityType.TREE:
                log('bullet ' + bullet.entityId + ' hit tree');
                break;

            case EntityType.GROUND:
                log('bullet ' + bullet.entityId + ' hit ground (1)');
                break;
        }
    }

    return !!collision;
};


/**
 *
 * @param {!GameEntity} entity Starting entity.
 * @param {number} dx Delta x
 * @param {number} dy Delta y
 * @param {number} dz Delta z
 * @return {?Collision}
 */
Game.prototype.lineCollisionDetection = function (entity, dx, dy, dz) {
    const velocity = Math.hypot(dx, dy, dz);

    // U = unit vector of the line
    const ux = dx / velocity;
    const uy = dy / velocity;
    const uz = dz / velocity;

    // The range of "t" and "minT" is 0-velocity.
    // Where t=0 represents the bullet at the start of the frame,
    // and t=velocity represents the bullet at the end of the frame.
    let minT = velocity;
    let minEntity = null;

    // Check for bullet collision detections
    for (let j = 0; j < this.gameState.entities.length; j++) {
        let other = this.gameState.entities[j];
        if (other.entityType !== EntityType.PLAYER ||
            other.entityId === entity.entityId ||
            other.entityId === entity.playerId ||
            other.health <= 0) {
            continue;
        }

        const qx = entity.x - other.x;
        const qy = entity.y - other.y;//(other.y + PLAYER_HEIGHT / 2);
        const qz = entity.z - other.z;
        const radius = PLAYER_HEIGHT / 2;
        const t = lineIntersectSphere(ux, uy, uz, qx, qy, qz, radius, velocity);
        if (t !== null && t < minT) {
            minT = t;
            minEntity = other;
        }
    }

    // Check against rocks
    for (let j = 0; j < this.gameMap.rocks.length; j++) {
        const rock = this.gameMap.rocks[j];
        const qx = entity.x - rock.x;
        const qy = entity.y - rock.y;
        const qz = entity.z - rock.z;
        const radius = 0.8;
        const t = lineIntersectSphere(ux, uy, uz, qx, qy, qz, radius, velocity);
        if (t !== null && t < minT) {
            minT = t;
            minEntity = rock;
        }
    }

    // Check against trees
    // (Really only checking against a sphere at the bottom of the tree)
    for (let j = 0; j < this.gameMap.trees.length; j++) {
        const tree = this.gameMap.trees[j];
        const qx = entity.x - tree.x;
        const qy = entity.y - (tree.y - 4.2);
        const qz = entity.z - tree.z;
        const radius = 0.8;
        const t = lineIntersectSphere(ux, uy, uz, qx, qy, qz, radius, velocity);
        if (t !== null && t < minT) {
            minT = t;
            minEntity = tree;
        }
    }

    // Check against ground
    for (let t = 0; t < minT; t += 0.1) {
        const bulletY = entity.y + t * uy;
        const groundY = this.gameMap.getY(entity.x + t * ux, entity.z + t * uz);
        if (bulletY < groundY) {
            minT = t;
            minEntity = GROUND;
            break;
        }
    }

    return minEntity ? new Collision(minEntity, minT) : null;
};

/**
 * Checks if a player entity has died.
 * If the player has died, set rank and broadcast the death event.
 * @param {!GameEntity} entity
 * @param {number=} killerId
 */
Game.prototype.checkPlayerDeath = function (entity, killerId) {
    if (entity.health <= 0) {
        entity.health = 0;

        let aliveCount = ServerGameState.getAliveCount(this.gameState);
        entity.rank = aliveCount + 1;
        log('player id=' + entity.entityId + ' died, rank #' + entity.rank);

        let deathEvent = new GameEntity(EntityType.DEATH,
            entity.x,
            entity.y,
            entity.z);
        deathEvent.entityId = entity.entityId;
        deathEvent.playerId = killerId;
        this.broadcastEvent(deathEvent);
    }
};

/**
 * Line intersect with sphere
 * https://math.stackexchange.com/a/1939462
 *
 * @param {number} ux
 * @param {number} uy
 * @param {number} uz
 * @param {number} qx
 * @param {number} qy
 * @param {number} qz
 * @param {number} r
 * @param {number} max The maximum t value.
 */
function lineIntersectSphere(ux, uy, uz, qx, qy, qz, r, max) {
    const a = ux * ux + uy * uy + uz * uz;
    const b = 2 * (ux * qx + uy * qy + uz * qz);
    const c = (qx * qx + qy * qy + qz * qz) - r * r;
    const d = b * b - 4 * a * c;
    if (d < 0) {
        // Solutions are complex, so no intersections
        return null;
    }

    const t1 = (-1 * b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
    const t2 = (-1 * b - Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
    if ((t1 >= 0.0 && t1 < max) || (t2 >= 0.0 && t2 < max)) {
        return Math.min(t1, t2);
    } else if (t1 >= 0 && t1 < max) {
        return t1;
    } else if (t2 >= 0 && t2 < max) {
        return t2;
    } else {
        return null;
    }
}

/**
 * Bot walks to a point.
 * @param {!GameEntity} bot
 * @param {!GameEntity|!Circle|*} dest
 */
Game.prototype.walkTo = function (bot, dest) {
    let dx = dest.x - bot.x;
    let dz = dest.z - bot.z;
    let dist = Math.hypot(dx, dz);
    dx /= dist;
    dz /= dist;
    bot.dx = dx * RUN_SPEED / 30.0;
    bot.dz = dz * RUN_SPEED / 30.0;
    bot.x += bot.dx;
    bot.z += bot.dz;
    bot.y = this.gameMap.getY(bot.x, bot.z) + PLAYER_HALF_HEIGHT;
    bot.yaw = Math.atan2(bot.dx, bot.dz);
};

/**
 * Executes the AI for one clock tick.
 * @param {!GameEntity} bot
 * @param {!Circle} blueCircle
 * @param {!Circle} whiteCircle
 */
Game.prototype.doAi = function (bot, blueCircle, whiteCircle) {
    bot.dx = bot.dy = bot.dz = 0;

    let nearestPlayer = this.getNearest(bot, EntityType.PLAYER, 40.0);
    let nearestAmmo = this.getNearest(bot, EntityType.AMMO, 20.0, blueCircle);
    let nearestTree = this.getNearest(bot, EntityType.TREE, 40, whiteCircle, this.gameMap.trees);

    if (Circle.isOutside(blueCircle, bot)) {
        // P1: Get inside the blue circle
        this.walkTo(bot, whiteCircle);
    } else if (bot.cooldown === 0 && nearestPlayer) {
        log('bot id=' + bot.entityId + ' shoots at player id=' + nearestPlayer.entityId);
        this.walkTo(bot, nearestPlayer);
        // P2: Shoot anyone within 10 meters in the 90 degree FOV
        this.shoot(
            bot,
            nearestPlayer.x - bot.x + 0.2 * Math.random() - 0.1,
            nearestPlayer.y - bot.y + 0.2 * Math.random() - 0.1,
            nearestPlayer.z - bot.z + 0.2 * Math.random() - 0.1);
    } else if (nearestAmmo) {
        // P3: Opportunistically pick up ammo
        this.walkTo(bot, nearestAmmo);
    } else if (Circle.isOutside(whiteCircle, bot)) {
        // P4: Get inside the white circle
        this.walkTo(bot, whiteCircle);
    } else if (nearestTree) {
        // P5: Dance around the nearest tree
        // From the nearest tree, imagine a 3 meter circle
        // The player will try to walk that circle every 3 seconds
        let treeTime = Date.now() / 3000 * 2 * PI;
        let treeTarget = {x: nearestTree.x + 3 * Math.cos(treeTime), z: nearestTree.z + 3 * Math.sin(treeTime)};
        this.walkTo(bot, treeTarget);
    }
};

/**
 * Returns the nearest entity within maxDistance.
 * Optionally restrict to entities within a circle.
 * Optionally use a specified array of entities.
 * Returns null if not found.
 * @param {!GameEntity} entity
 * @param {!EntityType} entityType
 * @param {number} maxDistance
 * @param {!Circle=} opt_circle Optional circle constraint.
 * @param {!Array.<!GameEntity>=} opt_entities Optional array to search in.
 * @return {?GameEntity}
 */
Game.prototype.getNearest = function (
    entity,
    entityType,
    maxDistance,
    opt_circle,
    opt_entities) {

    let nearestPlayer = null;
    let nearestDist = maxDistance;
    let entities = opt_entities || this.gameState.entities;

    for (let i = 0; i < entities.length; i++) {
        let other = entities[i];
        if (entity !== other &&
            other.entityType === entityType &&
            other.health > 0 &&
            (!opt_circle || !Circle.isOutside(opt_circle, other))) {

            let dx = other.x - entity.x;
            let dy = other.y - entity.y;
            let dz = other.z - entity.z;
            let dist = Math.hypot(dx, dz);
            if (dist < nearestDist) {
                let collision = this.lineCollisionDetection(entity, dx, dy, dz);
                if (!collision || collision.entity === other) {
                    nearestPlayer = other;
                    nearestDist = dist;
                }
            }
        }
    }

    return nearestPlayer;
};

/**
 * Updates the game for one clock tick.
 */
Game.prototype.update = function () {
    this.gameState.updateClock();
    if (!ServerGameState.isStarted(this.gameState) || ServerGameState.isGameOver(this.gameState)) {
        return;
    }

    let blueCircle = this.gameMap.getBlueCircle(this.gameState.currentTime);
    let whiteCircle = this.gameMap.getWhiteCircle(this.gameState.currentTime);

    for (let i = this.gameState.entities.length - 1; i >= 0; i--) {
        let entity = this.gameState.entities[i];
        if (entity.health <= 0) {
            continue;
        }

        let kill = false;

        switch (entity.entityType) {
            case EntityType.PLAYER:
                if (entity.cooldown > 0) {
                    entity.cooldown--;
                }

                if (entity.bot) {
                    this.doAi(entity, blueCircle, whiteCircle);
                }

                if (this.updateCount % 33 == 0) {
                    if (Circle.isOutside(blueCircle, entity)) {
                        log('player id=' + entity.entityId + ' outside the circle');
                        entity.health -= 5;
                        this.checkPlayerDeath(entity);
                    }
                }
                break;

            case EntityType.BULLET:
                if (this.bulletCollisionDetection(entity)) {
                    // Bullet hit something
                    kill = true;
                }

                entity.x += entity.dx;
                entity.y += entity.dy;
                entity.z += entity.dz;

                if (entity.x < MIN_X || entity.x > MAX_X || entity.z < MIN_Z || entity.z > MAX_Z) {
                    // Out of bounds
                    log('bullet id=' + entity.entityId + ' out of bounds');
                    kill = true;
                }
                break;

            case EntityType.AMMO:
            case EntityType.MEDKIT:
                let nearest = this.getNearest(entity, EntityType.PLAYER, 1.0);
                if (nearest) {
                    log('pickup id=' + entity.entityId + ' picked up by player id=' + nearest.entityId);
                    if (entity.entityType === EntityType.AMMO) {
                        nearest.ammo += 30;
                    } else {
                        nearest.health = Math.min(100, nearest.health + 50);
                    }
                    let pickup = new GameEntity(EntityType.PICKUP, entity.x, entity.y, entity.z);
                    pickup.playerId = nearest.entityId;
                    this.broadcastEvent(pickup);
                    kill = true;
                }
                break;
        }

        if (kill) {
            this.gameState.entities.splice(i, 1);
        }
    }

    this.updateCount++;
};


/**
 * Returns a game for a new user.
 * @param {!boolean=} lobby
 * @return {!Game}
 */
function getGameForUser(lobby) {
    // If there is an existing game in "setup" phase, return that game.
    let startIndex = lobby ? 0 : 1;
    for (let i = startIndex; i < server.games.length; i++) {
        if (lobby || server.games[i].isJoinable()) {
            return server.games[i];
        }
    }

    // Otherwise, create a new game.
    const game = new Game();
    game.gameState.startTime = Date.now() / 1000 + PREGAME_TIME;
    server.games.push(game);
    log('Creating new game id=' + game.gameId + ', seed=' + game.seed);
    return game;
}

// Update the state of all games 30 times per second (every 33 ms).
setInterval(function () {
    for (let i = server.games.length - 1; i > LOBBY_ID; i--) {
        let game = server.games[i];
        if (game.users.length === 0) {
            // No users connected, so remove the game
            log('Destroying game id=' + game.gameId);
            server.games.splice(i, 1);
        } else {
            // Otherwise do a normal update
            game.update();
        }
    }
}, 33);

module.exports = function (socket) {
    const user = new User(socket, getGameForUser(true));

    socket.on('update', function (data) {
        if (!data) {
            // Can receive bad messages at startup and shutdown
            return;
        }

        const localState = /** @type {!GameEntity} */ (data);
        if (localState.x === undefined || localState.y === undefined || localState.z === undefined) {
            // Can receive bad messages at startup and shutdown
            return;
        }

        user.entity.name = localState.name;
        user.entity.yaw = localState.yaw;
        user.entity.x = localState.x;
        user.entity.y = localState.y;
        user.entity.z = localState.z;
        user.entity.dx = localState.dx;
        user.entity.dy = localState.dy;
        user.entity.dz = localState.dz;

        if (localState.actions) {
            for (let i = 0; i < localState.actions.length; i++) {
                const action = localState.actions[i];
                switch (action.entityType) {
                    case EntityType.JOIN:
                        // Add the user to the next available game
                        getGameForUser().addUser(user);
                        break;
                    case EntityType.SHOOT:
                        user.game.shoot(user.entity, action.dx, action.dy, action.dz);
                        break;
                }
            }
        }

        user.sendState();
    });

    socket.on('disconnect', function () {
        log('Disconnected: ' + socket.id);
        user.game.removeUser(user);
    });

    log('Connected: ' + socket.id);
    user.sendState();
};
