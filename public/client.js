
const player = new GameEntity(EntityType.PLAYER, 0, 200, 0, 0, 0, 0);
player.name = getPlayerName();
player.pitch = 0.1;
player.yaw = 0.1;
player.actions = [];

const localEntities = /** @type {!Array.<!GameEntity>} */ ([]);
const messages = [];
let programInfo = null;
let staticBuffers = null;
let dynamicBuffers = null;
let pointerLocked = false;
let mapOpen = false;
let width = 2;
let height = 2;
let centerX = 1;
let centerY = 1;
let mouseX = 0;
let mouseY = 0;

/** @type {?ServerGameState} */
let gameState = null;

/** @type {?GameMap} */
let gameMap = null;

const canvases = document.querySelectorAll('canvas');
const canvas = canvases[0];
const overlayCanvas = canvases[1];
const overlayCtx = overlayCanvas.getContext('2d');
let zoom = false;
let then = 0;

window.addEventListener('resize', handleResizeEvent, false);
handleResizeEvent();

overlayCanvas.addEventListener('click', function (e) {
    if (e.button === 0) {
        if (!gameState) {
            // Not connected, do nothing
        } else if (gameState.gameId === LOBBY_ID) {
            // Handle lobby button clicks
            if (isMouseOverButton(JOIN_BUTTON_OFFSET)) {
                createClientEvent(EntityType.JOIN);
                playPickupSound();
            }
            if (isMouseOverButton(NAME_BUTTON_OFFSET)) {
                setMusicEnabled(false);
                let newName = prompt('Enter your name', player.name);
                if (newName) {
                    setPlayerName(newName);
                    player.name = newName;
                }
                setMusicEnabled(true);
            }
        } else if (mapOpen) {
            // TODO: handle map clicks?
        } else if (!pointerLocked) {
            overlayCanvas.requestPointerLock();
        } else if (ServerGameState.isStarted(gameState)) {
            shoot();
        }
    }
});

function getPlayerName() {
    let name = localStorage.getItem('n');
    if (!name) {
        name = generatePlayerName();
        setPlayerName(name);
    }
    return name;
}

function setPlayerName(name) {
    localStorage.setItem('n', name);
}

function shoot() {
    createClientEvent(EntityType.SHOOT);
    playGunfire(0);

    // Recoil
    player.pitch -= 0.02 * Math.random();
    player.yaw += 0.02 * Math.random() - 0.01;
}

/**
 * Creates a new client side event (join a match, shoot the gun, etc).
 * @param {!EntityType} eventType
 */
function createClientEvent(eventType) {
    vec3.rotateX(tempVec, forward, origin, /** @type {number} */(player.pitch));
    vec3.rotateY(tempVec, tempVec, origin, /** @type {number} */(player.yaw));
    player.actions.push(new GameEntity(
        eventType,
        player.x,
        player.y,
        player.z,
        tempVec[0],
        tempVec[1],
        tempVec[2]));
}

overlayCanvas.addEventListener('mousedown', function (e) {
    if (e.button === 2) {
        zoom = true;
    }
});

overlayCanvas.addEventListener('mouseup', function (e) {
    if (e.button === 2) {
        zoom = false;
    }
});

overlayCanvas.addEventListener('mousemove', function (e) {
    mouseX = e.pageX;
    mouseY = e.pageY;
});

// Hook pointer lock state change events for different browsers
document.addEventListener('pointerlockchange', handleLockChangeEvent);

function initGame() {
    // Create the map from the seed
    gameMap = new GameMap(gameState.seed);

    // Setup WebGL
    programInfo = initShaderProgramInfo(gl);
    staticBuffers = new BufferSet(STATIC_DRAW);
    dynamicBuffers = new BufferSet(DYNAMIC_DRAW);

    // Create world geometry
    initBuffers();

    // Prerender map image
    prerenderMapImage();

    // If in lobby, turn music on.
    // Otherwise, turn music off.
    setMusicEnabled(gameState.gameId === LOBBY_ID);
}

function destroyGame() {
    // TODO: Cleanup WebGL
}

// Draw the scene repeatedly
function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    handleKeys(deltaTime);

    if (gameState && gameState.gameId !== LOBBY_ID) {
        dynamicBuffers.resetBuffers();

        if (gameState.entities) {
            renderEntities(gameState.entities);
        }

        renderEntities(localEntities);

        // Blue circle walls
        // Always draw this *LAST* because it is transluscent
        if (ServerGameState.isStarted(gameState)) {
            addBlueCircleQuads();
        }

        dynamicBuffers.updateBuffers(gl);

        // Draw 3D
        resetGl(gl);
        setupCamera(gl);
        staticBuffers.render(gl, programInfo, texture);
        dynamicBuffers.render(gl, programInfo, texture);
    }

    drawHud();
    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// Runs each time the DOM window resize event fires.
// Resets the canvas dimensions to match window,
// then draws the new borders accordingly.
function handleResizeEvent() {
    width = window.innerWidth;
    height = window.innerHeight;
    centerX = (width / 2) | 0;
    centerY = (height / 2) | 0;

    if (canvas) {
        canvas.width = width;
        canvas.height = height;
    }
    if (overlayCanvas) {
        overlayCanvas.width = width;
        overlayCanvas.height = height;
    }
}

function handleLockChangeEvent() {
    if (document.pointerLockElement === overlayCanvas || document['mozPointerLockElement'] === overlayCanvas) {
        document.addEventListener("mousemove", handleMouseMoveEvent, false);
        pointerLocked = true;
    } else {
        document.removeEventListener("mousemove", handleMouseMoveEvent, false);
        pointerLocked = false;
    }
}

function handleMouseMoveEvent(e) {
    const sensitivity = zoom ? 0.0001 : 0.001;
    player.yaw = normalizeRadians(player.yaw + sensitivity * e.movementX);
    player.pitch = normalizeRadians(player.pitch + sensitivity * e.movementY);
}

function handleKeys(deltaTime) {
    if (!gameMap) {
        return;
    }

    updateKeys();

    vec3.rotateY(tempVec, forward, origin, /** @type {number} */(player.yaw));

    // TODO: Add shift-key running
    player.dx = 0;
    player.dz = 0;

    if (keys[KEY_UP].down || keys[KEY_W].down || keys[KEY_Z].down) {
        player.dx = RUN_SPEED * tempVec[0];
        player.dz = RUN_SPEED * tempVec[2];
        player.dy -= 0.02;
    }
    if (keys[KEY_DOWN].down || keys[KEY_S].down) {
        player.dx = -RUN_SPEED * tempVec[0];
        player.dz = -RUN_SPEED * tempVec[2];
        player.dy -= 0.02;
    }
    if (keys[KEY_LEFT].down || keys[KEY_A].down || keys[KEY_Q].down) {
        player.dx = -RUN_SPEED * tempVec[2];
        player.dz = RUN_SPEED * tempVec[0];
        player.dy -= 0.02;
    }
    if (keys[KEY_RIGHT].down || keys[KEY_D].down) {
        player.dx = RUN_SPEED * tempVec[2];
        player.dz = -RUN_SPEED * tempVec[0];
        player.dy -= 0.02;
    }
    if (keys[KEY_M].downCount === 1 || (mapOpen && keys[KEY_ESCAPE].downCount === 1)) {
        if (!mapOpen) {
            mapOpen = true;
        } else {
            mapOpen = false;
        }
    }

    player.x += deltaTime * player.dx;
    player.z += deltaTime * player.dz;

    player.dy -= deltaTime * GRAVITY;
    player.y += deltaTime * player.dy;

    let groundY = gameMap.getY(player.x, player.z);
    if (player.y < groundY + PLAYER_HALF_HEIGHT) {
        player.dy = 0;
        player.y = groundY + PLAYER_HALF_HEIGHT;

        if (keys[KEY_SPACE].downCount === 1) {
            player.dy = JUMP_POWER;
        }
    }
}
