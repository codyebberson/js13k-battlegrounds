
const MAP_IMAGE_SIZE = 1024;

let mapImage = null;

let mapBufferCanvas = document.createElement('canvas');
mapBufferCanvas.width = MAP_IMAGE_SIZE;
mapBufferCanvas.height = MAP_IMAGE_SIZE;

let mapBufferContext = mapBufferCanvas.getContext('2d');

/**
 * Pre-render the map image.
 */
function prerenderMapImage() {
    mapImage = document.createElement('canvas');
    mapImage.width = MAP_IMAGE_SIZE;
    mapImage.height = MAP_IMAGE_SIZE;

    const mapCtx = mapImage.getContext('2d');

    // Start with blue water
    mapCtx.fillStyle = '#163849';
    mapCtx.fillRect(0, 0, MAP_IMAGE_SIZE, MAP_IMAGE_SIZE);

    let minHeight = 10000;
    let maxHeight = 0;

    for (let z = PLAYABLE_MIN_Z; z < PLAYABLE_MAX_Z; z += TILE_SIZE) {
        for (let x = PLAYABLE_MIN_X; x < PLAYABLE_MAX_X; x += TILE_SIZE) {
            let height = gameMap.getY(x, z);
            if (height > 0) {
                minHeight = Math.min(minHeight, height);
                maxHeight = Math.max(maxHeight, height);
            }
        }
    }

    for (let z = PLAYABLE_MIN_Z; z < PLAYABLE_MAX_Z; z += TILE_SIZE) {
        for (let x = PLAYABLE_MIN_X; x < PLAYABLE_MAX_X; x += TILE_SIZE) {
            const y1 = gameMap.getY(x, z);
            const y2 = gameMap.getY(x + TILE_SIZE, z);
            const y3 = gameMap.getY(x + TILE_SIZE, z + TILE_SIZE);
            const y4 = gameMap.getY(x, z + TILE_SIZE);
            const ya = (y1 + y2 + y3 + y4) / 4;
            if (ya <= 0) {
                continue;
            }

            const dx1 = convertXToMapX(x);
            const dy1 = convertZToMapY(z);
            const dx2 = convertXToMapX(x + TILE_SIZE);
            const dy2 = convertZToMapY(z + TILE_SIZE);

            const v = Math.min(1.0, 0.4 + 0.7 * (ya - minHeight) / (maxHeight - minHeight));
            mapCtx.fillStyle = HSVtoRGB(110.0 / 360.0, 0.4, v);
            mapCtx.beginPath();
            mapCtx.rect(dx1, dy1, dx2 - dx1, dy2 - dy1);
            mapCtx.fill();
        }
    }
}

/**
 * Draw the map image to the overlay canvas.
 * @param {number} x The x-coordinate in pixels.
 * @param {number} y The y-coordinate in pixels.
 * @param {number} size The width and height in pixels.
 * @param {boolean} full True to show the full map; false to show the area around the player.
 */
function drawMap(x, y, size, full) {
    overlayCtx.fillStyle = '#323e30';
    overlayCtx.fillRect(x, y, size, size);

    if (mapImage) {
        mapBufferContext.drawImage(mapImage, 0, 0, 1024, 1024, 0, 0, 1024, 1024);

        const dotX = convertXToMapX(player.x);
        const dotY = convertZToMapY(player.z);

        // Blue circle fill
        // Use inverted rectangle trick to flip the circle
        // https://stackoverflow.com/a/11770000/2051724
        let time = gameState.currentTime;// / 1000.0;
        if (time > 0) {
            let blueCircle = gameMap.getBlueCircle(time);
            let blueRadius = blueCircle.radius / (MAX_X - MIN_X) * MAP_IMAGE_SIZE;
            mapBufferContext.fillStyle = HSVtoRGB(.66,1,1,.5);
            mapBufferContext.beginPath();
            mapBufferContext.arc(convertXToMapX(blueCircle.x), convertZToMapY(blueCircle.z), blueRadius, 0, 2 * PI);
            mapBufferContext.rect(MAP_IMAGE_SIZE, 0, -MAP_IMAGE_SIZE, MAP_IMAGE_SIZE);
            mapBufferContext.fill();

            // White circle outline
            let whiteCircle = gameMap.getWhiteCircle(time);
            let whiteRadius = whiteCircle.radius / (MAX_X - MIN_X) * MAP_IMAGE_SIZE;
            let whiteCenterX = convertXToMapX(whiteCircle.x);
            let whiteCenterY = convertZToMapY(whiteCircle.z);
            mapBufferContext.strokeStyle = COLOR_WHITE;
            mapBufferContext.beginPath();
            mapBufferContext.arc(whiteCenterX, whiteCenterY, whiteRadius, 0, 2 * PI);
            mapBufferContext.rect(MAP_IMAGE_SIZE, 0, -MAP_IMAGE_SIZE, MAP_IMAGE_SIZE);
            mapBufferContext.lineWidth = 2;
            mapBufferContext.stroke();

            if (Circle.isOutside(whiteCircle, player)) {
                mapBufferContext.lineWidth = 1;
                mapBufferContext.strokeStyle = COLOR_WHITE;
                mapBufferContext.beginPath();
                mapBufferContext.moveTo(dotX, dotY);
                mapBufferContext.lineTo(whiteCenterX, whiteCenterY);
                mapBufferContext.stroke();
            }
        }

        // Player field-of-view
        const fovRadius = 60;
        mapBufferContext.beginPath();
        mapBufferContext.moveTo(dotX, dotY);
        mapBufferContext.arc(dotX, dotY,
            fovRadius,
            player.yaw - 0.16 * PI - 0.5 * PI,
            player.yaw + 0.16 * PI - 0.5 * PI);
        mapBufferContext.fillStyle = HSVtoRGB(0, 0, 1, 0.5);
        mapBufferContext.fill();

        // Player dot
        const radius = 5;
        mapBufferContext.beginPath();
        mapBufferContext.arc(dotX, dotY, radius, 0, 2 * PI);
        mapBufferContext.fillStyle = 'red';
        mapBufferContext.fill();
        mapBufferContext.lineWidth = 2;
        mapBufferContext.strokeStyle = COLOR_WHITE;
        mapBufferContext.stroke();

        if (full) {
            overlayCtx.drawImage(mapBufferCanvas, 0, 0, MAP_IMAGE_SIZE, MAP_IMAGE_SIZE, x, y, size, size);
        } else {
            const offsetX = dotX - size / 2;
            const offsetY = dotY - size / 2;
            overlayCtx.drawImage(mapBufferCanvas, offsetX, offsetY, size, size, x, y, size, size);
        }
    }

    overlayCtx.strokeStyle = COLOR_WHITE;
    overlayCtx.lineWidth = 2;
    overlayCtx.beginPath();
    overlayCtx.rect(x, y, size, size);
    overlayCtx.stroke();
}

function convertXToMapX(x) {
    // Convert from -500..500 to 0..1024
    return (x - MIN_X) / (MAX_X - MIN_X) * MAP_IMAGE_SIZE
}

function convertZToMapY(z) {
    // Convert from 500..-500 to 0..1024
    return (MAX_Z - z) / (MAX_X - MIN_X) * MAP_IMAGE_SIZE
}
