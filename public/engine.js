
const origin = vec3.create();
const forward = vec3.fromValues(0.0, 0.0, 1.0);
const tempVec = vec3.create();
const cameraTranslate = vec3.create();
const cameraFlip = vec3.fromValues(-1.0, 1.0, 1.0);
const projectionMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const pitchMatrix = mat4.create();
const yawMatrix = mat4.create();

const gl = /** @type {!WebGLRenderingContext} */ (canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false
}));

const texture = loadTexture('textures.png');

/**
 * Initialize a texture and load an image.
 * When the image finished loading copy it into the texture.
 * @param {string} url
 * @return {!WebGLTexture}
 */
function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = RGBA;
    const srcType = UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(TEXTURE_2D, texture);
        gl.texImage2D(TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
        gl.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, NEAREST);
        gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, NEAREST);
        gl.generateMipmap(TEXTURE_2D);
    };
    image.src = url;

    return texture;
}

/**
 * Initialize the buffers we'll need. For this demo, we just
 * have one object -- a simple three-dimensional cube.
 */
function initBuffers() {
    const skyHeight = 1000.0;
    const maxXY = MAX_X * 2;

    // Sky box
    for (let i = 0; i < CIRCLE_SEGMENT_COUNT; i++) {
        const theta1 = i / CIRCLE_SEGMENT_COUNT * PI * 2.0;
        const theta2 = (i + 1) / CIRCLE_SEGMENT_COUNT * PI * 2.0;
        const x1 = maxXY * Math.cos(theta1);
        const z1 = maxXY * Math.sin(theta1);
        const x2 = maxXY * Math.cos(theta2);
        const z2 = maxXY * Math.sin(theta2);
        const p1 = vec3.fromValues(x1, skyHeight, z1);
        const p2 = vec3.fromValues(x2, skyHeight, z2);
        const p3 = vec3.fromValues(x2, 0, z2);
        const p4 = vec3.fromValues(x1, 0, z1);
        staticBuffers.addQuad([p1, p2, p3, p4], 64, 0);
    }

    // Ceiling (sky)
    {
        const p1 = vec3.fromValues(-maxXY, skyHeight, -maxXY);
        const p2 = vec3.fromValues(maxXY, skyHeight, -maxXY);
        const p3 = vec3.fromValues(maxXY, skyHeight, maxXY);
        const p4 = vec3.fromValues(-maxXY, skyHeight, maxXY);
        staticBuffers.addQuad([p1, p2, p3, p4], 64, 0, 1);
    }

    // Floor (water)
    {
        const p1 = vec3.fromValues(-maxXY, 0, -maxXY);
        const p2 = vec3.fromValues(maxXY, 0, -maxXY);
        const p3 = vec3.fromValues(maxXY, 0, maxXY);
        const p4 = vec3.fromValues(-maxXY, 0, maxXY);
        staticBuffers.addQuad([p1, p2, p3, p4], 96, 0);
    }

    // Create ground
    for (let x = PLAYABLE_MIN_X; x < PLAYABLE_MAX_X; x += TILE_SIZE) {
        for (let z = PLAYABLE_MIN_Z; z < PLAYABLE_MAX_Z; z += TILE_SIZE) {
            const p1 = vec3.fromValues(x, gameMap.getY(x, z), z);
            const p2 = vec3.fromValues(x + TILE_SIZE, gameMap.getY(x + TILE_SIZE, z), z);
            const p3 = vec3.fromValues(x + TILE_SIZE, gameMap.getY(x + TILE_SIZE, z + TILE_SIZE), z + TILE_SIZE);
            const p4 = vec3.fromValues(x, gameMap.getY(x, z + TILE_SIZE), z + TILE_SIZE);
            staticBuffers.addQuad([p1, p2, p3, p4], 80, 0);
        }
    }

    // Create trees
    for (let i = 0; i < gameMap.trees.length; i++) {
        createStationaryObject(staticBuffers, gameMap.trees[i].x, gameMap.trees[i].z, TREE_SIZE, 0, 0, 32);
    }

    // Create rocks
    for (let i = 0; i < gameMap.rocks.length; i++) {
        createStationaryObject(staticBuffers, gameMap.rocks[i].x, gameMap.rocks[i].z, ROCK_SIZE, 32, 0, 16);
    }

    staticBuffers.initBuffers(gl);
    dynamicBuffers.initBuffers(gl);
}

function createStationaryObject(staticBuffers, x, z, size, tx, ty, ts) {
    const y = gameMap.getY(x, z) + size;
    {
        const p1 = vec3.fromValues(x - size, y + size, z);
        const p2 = vec3.fromValues(x + size, y + size, z);
        const p3 = vec3.fromValues(x + size, y - size, z);
        const p4 = vec3.fromValues(x - size, y - size, z);
        staticBuffers.addQuad([p1, p2, p3, p4], tx, ty, ts);
    }
    {
        const p1 = vec3.fromValues(x, y + size, z - size);
        const p2 = vec3.fromValues(x, y + size, z + size);
        const p3 = vec3.fromValues(x, y - size, z + size);
        const p4 = vec3.fromValues(x, y - size, z - size);
        staticBuffers.addQuad([p1, p2, p3, p4], tx, ty, ts);
    }
}

function resetGl(gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(LEQUAL);            // Near things obscure far things
    gl.enable(BLEND);
    gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);

    // Clear the canvas before we start drawing on it.
    gl.clear(COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT);
}

function setupCamera(gl) {
    // Update WebGL to use the full canvas
    gl.viewport(0, 0, width, height);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    const fieldOfView = (zoom ? 10 : 60) * PI / 180;   // in radians
    const aspect = width / height;
    const zNear = 0.1;
    const zFar = 4000.0;
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Rotate around the X-axis by the pitch
    mat4.identity(pitchMatrix);
    mat4.rotateX(pitchMatrix, pitchMatrix, /** @type {number} */(player.pitch));

    // Rotate around the Y-axis by the yaw
    mat4.identity(yawMatrix);
    mat4.rotateY(yawMatrix, yawMatrix, /** @type {number} */(player.yaw));

    // Combine the pitch and yaw transformations
    mat4.multiply(modelViewMatrix, pitchMatrix, yawMatrix);

    // Turn the camera around 180 degrees
    mat4.rotateY(modelViewMatrix, modelViewMatrix, PI);

    // Flip the x-axis to render in left-handed coordinates
    mat4.scale(modelViewMatrix, modelViewMatrix, cameraFlip);

    cameraTranslate[0] = -player.x;
    cameraTranslate[1] = -player.y - PLAYER_EYELEVEL;
    cameraTranslate[2] = -player.z;
    mat4.translate(modelViewMatrix, modelViewMatrix, cameraTranslate);
}

/**
 * Renders an array of game entities to the dynamic buffer.
 * @param {!Array.<!GameEntity>} entities
 */
function renderEntities(entities) {
    for (let i = entities.length - 1; i >= 0; i--) {
        let entity = entities[i];
        if (entity.health <= 0 || entity.entityId === gameState.currentPlayerId) {
            // Don't draw dead or self
            continue;
        }

        switch (entity.entityType) {
            case EntityType.PLAYER:
                drawPlayer(entity);
                break;

            case EntityType.BULLET:
                drawSpriteQuad(entity, 0.05, 48, 0);
                break;

            case EntityType.GUNFIRE:
                drawSpriteQuad(entity, 0.04, 112, 16);
                entity.cooldown -= 4;
                break;

            case EntityType.BLOOD:
                const frame2 = Math.min(3, ((16 - entity.cooldown) / 4) | 0);
                drawSpriteQuad(entity, 0.5, 32 + 16 * frame2, 16);
                entity.cooldown--;
                break;

            case EntityType.AMMO:
                drawSpriteQuad(entity, 0.5, 96, 16);
                break;

            case EntityType.MEDKIT:
                drawSpriteQuad(entity, 0.5, 112, 0);
                break;
        }

        if (entity.entityType !== EntityType.PLAYER && entity.cooldown === 0) {
            entities.splice(i, 1);
        }
    }
}

/**
 * Draws a player entity.
 * This function does the calculations for view angle and animation frames.
 * @param {!GameEntity} entity
 */
function drawPlayer(entity) {
    let playerFrame = (((30 + gameState.currentTime) * 5) | 0) % 4;
    if (playerFrame === 3) {
        // Animation sequence is: 0, 1, 2, 1, ...
        playerFrame = 1;
    }

    let moving = Math.hypot(/** @type {number} */(entity.dx), /** @type {number} */(entity.dz)) > 0.001;
    let deltaX = entity.x - player.x;
    let deltaZ = entity.z - player.z;
    let deltaMag = Math.hypot(deltaX, deltaZ);
    let dotProduct = 0;
    let side = 0;

    if (deltaMag > 0) {
        deltaX /= deltaMag;
        deltaZ /= deltaMag;

        let facingDirectionX = Math.sin(entity.yaw);
        let facingDirectionZ = Math.cos(entity.yaw);
        dotProduct = deltaX * facingDirectionX + deltaZ * facingDirectionZ;
        side = deltaX * facingDirectionZ - deltaZ * facingDirectionX;
    }

    let tx = 0;
    let ty = 0;
    let flip = false;

    if (dotProduct > 0.7) {
        // Back side
        if (moving) {
            // Running, back
            tx = 48 + 16 * playerFrame;
            ty = 48;
        } else {
            // Standing, back
            tx = 32;
            ty = 32;
        }
    } else if (dotProduct < -0.7) {
        // Head on
        if (moving) {
            // Running
            tx = 48 + 16 * playerFrame;
            ty = 32;
        } else {
            // Standing
            tx = 0;
            ty = 32;
        }
    } else {
        // Side
        if (moving) {
            // Running, side
            tx = 16 * playerFrame;
            ty = 48;
        } else {
            // Standing, side
            tx = 16;
            ty = 32;
        }

        // Right side by default
        // Left side flips the texture
        flip = side < 0;
    }

    drawSpriteQuad(entity, PLAYER_HALF_HEIGHT, tx, ty, flip);
}

/**
 * Draws a billboard sprite.
 * The billboard is always perpendicular to the camera.
 * @param {!GameEntity} entity
 * @param {number} size
 * @param {number} tx
 * @param {number} ty
 * @param {boolean=} opt_flip
 */
function drawSpriteQuad(entity, size, tx, ty, opt_flip) {
    const x = entity.x;
    const y = entity.y;
    const z = entity.z;

    // Calculate vector from camera to player
    // so that quad is perpendicular to the camera
    const cameraDx = x - player.x;
    const cameraDz = z - player.z;
    const cameraDist = Math.hypot(cameraDx, cameraDz);
    const cameraDxn = cameraDx / cameraDist;
    const cameraDzn = cameraDz / cameraDist;
    const m = opt_flip ? -1 : 1;
    const x1 = x - m * size * cameraDzn;
    const x2 = x + m * size * cameraDzn;
    const z1 = z + m * size * cameraDxn;
    const z2 = z - m * size * cameraDxn;
    const y1 = y + size;
    const y2 = y - size;
    const p1 = vec3.fromValues(x1, y1, z1);
    const p2 = vec3.fromValues(x2, y1, z2);
    const p3 = vec3.fromValues(x2, y2, z2);
    const p4 = vec3.fromValues(x1, y2, z1);
    dynamicBuffers.addQuad([p1, p2, p3, p4], tx, ty);
}

function addBlueCircleQuads() {
    let timeInSeconds = gameState.currentTime;
    let blueCircle = gameMap.getBlueCircle(timeInSeconds);

    for (let i = 0; i < CIRCLE_SEGMENT_COUNT; i++) {
        const theta1 = i / CIRCLE_SEGMENT_COUNT * PI * 2.0;
        const theta2 = (i + 1) / CIRCLE_SEGMENT_COUNT * PI * 2.0;
        const x1 = blueCircle.x + blueCircle.radius * Math.cos(theta1);
        const z1 = blueCircle.z + blueCircle.radius * Math.sin(theta1);
        const x2 = blueCircle.x + blueCircle.radius * Math.cos(theta2);
        const z2 = blueCircle.z + blueCircle.radius * Math.sin(theta2);
        const p1 = vec3.fromValues(x1, 400, z1);
        const p2 = vec3.fromValues(x2, 400, z2);
        const p3 = vec3.fromValues(x2, 0, z2);
        const p4 = vec3.fromValues(x1, 0, z1);
        const frame = (((timeInSeconds * 5) | 0) + i) % 4;
        const tx = frame * 32;
        dynamicBuffers.addQuad([p1, p2, p3, p4], tx, 64, 32, 64);
    }
}
