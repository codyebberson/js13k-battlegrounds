
/**
 * The main Socket.io connection.
 * @type {!Socket}
 */
const socket = io({ upgrade: false, transports: ["websocket"] });

let lastMessageTime = 0;
let lastPing = 0;
let averagePing = 0;

/**
 * Receives a message from the server.
 * Sends a message to the client.
 */
socket.on("update", function (serverData) {
    let newGameState = /** @type {?ServerGameState} */ (serverData);
    let changed = gameState === null || gameState.gameId !== newGameState.gameId;
    gameState = newGameState;
    if (changed) {
        destroyGame();
        initGame();
    }

    let events = /** @type {?Array.<!GameEntity>} */ (serverData.events);
    if (events) {
        for (let i = 0; i < events.length; i++) {
            let event = events[i];
            switch (event.entityType) {
                case EntityType.GUNFIRE:
                    event.cooldown = 8;
                    localEntities.push(event);
                    if (event.playerId !== serverData.currentPlayerId) {
                        playGunfire(Math.hypot(event.x - player.x, event.z - player.z));
                    }
                    break;
                case EntityType.BLOOD:
                    event.cooldown = 16;
                    localEntities.push(event);
                    break;
                case EntityType.DEATH:
                    let deadPlayer = ServerGameState.getEntityById(gameState, event.entityId);
                    let killerPlayer = ServerGameState.getEntityById(gameState, event.playerId);
                    if (killerPlayer) {
                        messages.push(killerPlayer.name + ' killed ' + deadPlayer.name);
                    } else {
                        messages.push(deadPlayer.name + ' died outside the circle');
                    }
                    break;
                case EntityType.PICKUP:
                    // TODO: Should be played globally, but sharp distance dropoff
                    // For now, just play if it is the current user.
                    if (event.playerId === serverData.currentPlayerId) {
                        playPickupSound();
                    }
                    break;
            }
        }
        events.length = 0;
    }

    const now = Date.now();
    if (lastMessageTime > 0) {
        lastPing = now - lastMessageTime;
        if (averagePing > 0) {
            averagePing = 0.1 * lastPing + 0.9 * averagePing;
        } else {
            averagePing = lastPing;
        }
    }
    lastMessageTime = now;

    // Send the current state to the server
    socket.emit('update', player);

    // Reset player actions
    player.actions = [];
});

if (DEBUG) {
    socket.on("connect", function () {
        log('socket io connect');
    });

    socket.on("disconnect", function () {
        log('socket io disconnect');
    });

    socket.on("error", function () {
        log('socket io error');
    });
}
