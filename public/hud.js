
const COLOR_WHITE = '#fff';
const COLOR_BLACK = '#000';
const COLOR_LIGHT_GRAY = '#888';
const COLOR_DARK_GRAY = '#444';
const COLOR_YELLOW = '#fffe37';
const COLOR_ORANGE = '#fe9400';

const ALIGN_LEFT = 'left';
const ALIGN_CENTER = 'center';
const ALIGN_RIGHT = 'right';

const COMPASS_DIRECTIONS = {
    0: 'N',
    45: 'NE',
    90: 'E',
    135: 'SE',
    180: 'S',
    225: 'SW',
    270: 'W',
    315: 'NW'
};

function drawHud() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!gameState) {
        drawTitleLogo();
        setFontSize(11);
        setTextAlign(ALIGN_CENTER);
        drawShadowText('Connecting...', centerX, centerY + 50);

    } else if (gameState.gameId === LOBBY_ID) {
        drawTitleLogo();
        setFontSize(20);
        setTextAlign(ALIGN_CENTER);
        drawMenuButton('JOIN', JOIN_BUTTON_OFFSET);
        drawMenuButton('NAME', NAME_BUTTON_OFFSET);

    } else if (!ServerGameState.isCurrentPlayerAlive(gameState)) {
        drawGameOverScreen('YOU DIED');

    } else if (ServerGameState.getAliveCount(gameState) === 1) {
        drawGameOverScreen('WINNER WINNER CHICKEN DINNER');

    } else {
        drawDamageOverlay();

        if (mapOpen) {
            const mapSize = (height * 0.9) | 0;
            const mapX = (centerX - mapSize / 2) | 0;
            const mapY = (centerY - mapSize / 2) | 0;
            drawMap(mapX, mapY, mapSize, true);
        } else {
            drawCompass();
            drawGameStats();
            drawAmmo();
            drawHealthbar();
            drawMinimap();
            drawControlTips();

            if (!ServerGameState.isStarted(gameState)) {
                drawPreGameClock();
            } else {
                drawCrosshairs();
                drawPhaseWarnings();
            }

            setFontSize(11);
            setTextAlign(ALIGN_RIGHT);
            for (let i = 0; i < messages.length; i++) {
                drawShadowText(messages[i], width - 10, 80 + 20 * i);
            }
        }

        setFontSize(11);
        setTextAlign(ALIGN_CENTER);
        drawShadowText('Ping ' + averagePing.toFixed(0) + ' ms', centerX, height - 10);
    }
}

function drawTitleLogo() {
    setTextAlign(ALIGN_CENTER);
    {
        let gradient = overlayCtx.createLinearGradient(centerX, centerY - 100, centerX, centerY - 50);
        gradient.addColorStop(0, COLOR_YELLOW);
        gradient.addColorStop(1, COLOR_ORANGE);
        overlayCtx.fillStyle = gradient;
        overlayCtx.fillRect(centerX - 100, centerY - 100, 200, 50);

        overlayCtx.fillStyle = COLOR_BLACK;
        overlayCtx.font = "bold 40px arial";
        overlayCtx.fillText('#JS13K', centerX, centerY - 60);
    }

    {
        let gradient = overlayCtx.createLinearGradient(centerX, centerY - 50, centerX, centerY + 50);
        gradient.addColorStop(0, COLOR_YELLOW);
        gradient.addColorStop(1, COLOR_ORANGE);
        overlayCtx.fillStyle = gradient;
        overlayCtx.font = "bold 50px arial";
        overlayCtx.fillText('BATTLEGROUNDS', centerX, centerY);
    }
}

function isMouseOverButton(yOffset) {
    return mouseX > centerX - MENU_BUTTON_WIDTH / 2 &&
        mouseX < centerX + MENU_BUTTON_WIDTH / 2 &&
        mouseY > centerY + yOffset &&
        mouseY < centerY + yOffset + MENU_BUTTON_HEIGHT;
}

function drawMenuButton(str, yOffset) {
    overlayCtx.fillStyle = isMouseOverButton(yOffset) ? COLOR_YELLOW : COLOR_ORANGE;
    overlayCtx.fillRect(
        centerX - MENU_BUTTON_WIDTH / 2,
        centerY + yOffset,
        MENU_BUTTON_WIDTH,
        MENU_BUTTON_HEIGHT);
    drawShadowText(str, centerX, centerY + yOffset + 27);
}

function drawGameOverScreen(msg) {
    overlayCtx.fillStyle = HSVtoRGB(0, 0, 0, 0.5);
    overlayCtx.fillRect(0, 0, width, height);

    setTextAlign(ALIGN_LEFT);
    setFontSize(40);
    drawShadowText(msg, 50, 100);

    let entity = ServerGameState.getCurrentPlayer(gameState);
    if (entity) {
        drawShadowText('Rank #' + (entity.rank || 1), 50, 150);
    }
}

function drawDamageOverlay() {
    if (ServerGameState.isStarted(gameState)) {
        let blueCircle = gameMap.getBlueCircle(gameState.currentTime);
        let player = ServerGameState.getCurrentPlayer(gameState);
        if (blueCircle && player && Circle.isOutside(blueCircle, player)) {
            overlayCtx.fillStyle = HSVtoRGB(0, 1, 1, .5);
            overlayCtx.fillRect(0, 0, width, height);
        }
    }
}

function drawCompass() {
    const compassCenter = toDegrees(/** @type {number} */(player.yaw));
    const compassStart = compassCenter - 90;

    const startX = width / 3;
    const dx = (width / 3) / 180.0;

    setTextAlign(ALIGN_CENTER);

    for (let i = 0, d = compassStart, sx = startX; i <= 180; i++ , d++ , sx += dx) {
        const x = (sx + .5) | 0;
        d = normalizeDegrees(d);
        if (d % 15 === 0) {
            if (COMPASS_DIRECTIONS[d]) {
                setFontSize(14);
                overlayCtx.lineWidth = 2;
                drawShadowLine(x, 30, x, 40);
                drawShadowText(COMPASS_DIRECTIONS[d], x, 60);
            } else {
                setFontSize(11);
                overlayCtx.lineWidth = 1;
                drawShadowLine(x, 32, x, 38);
                drawShadowText(d.toString(), x, 60);
            }
        }
    }
}

function drawGameStats() {
    setFontSize(18);

    overlayCtx.fillStyle = COLOR_BLACK;
    overlayCtx.fillRect(width - 130, 20, 40, 30);
    setTextAlign(ALIGN_CENTER);
    drawColoredText(ServerGameState.getAliveCount(gameState), width - 110, 42, COLOR_WHITE);

    overlayCtx.fillStyle = COLOR_LIGHT_GRAY;
    overlayCtx.fillRect(width - 90, 20, 80, 30);
    setTextAlign(ALIGN_LEFT);
    drawColoredText('ALIVE', width - 85, 42, COLOR_DARK_GRAY);
}

function drawCrosshairs() {
    overlayCtx.lineWidth = 2;
    drawShadowLine(centerX - 30, centerY, centerX + 30, centerY);
    drawShadowLine(centerX, centerY - 30, centerX, centerY + 30);
}

function drawPhaseWarnings() {
    let phaseTime = ((gameState.currentTime) | 0) % FULL_PHASE_DURATION;
    let warningY = (0.25 * height) | 0;

    setFontSize(40);
    setTextAlign(ALIGN_CENTER);

    if (phaseTime < 5) {
        drawShadowText('New Play Area marked on map', centerX, warningY);
    } else if (phaseTime >= 20 && phaseTime < 25) {
        drawShadowText('Old Play Area goes OFFLINE in 10s!', centerX, warningY);
    } else if (phaseTime >= 30 && phaseTime < 35) {
        drawShadowText('Old Play Area going OFFLINE!', centerX, warningY);
    }
}

function drawAmmo() {
    const player = ServerGameState.getCurrentPlayer(gameState);
    if (!player) {
        return;
    }

    setFontSize(24);
    setTextAlign(ALIGN_CENTER);
    drawShadowText('Ammo: ' + player.ammo, centerX, height - 65);
}

function drawHealthbar() {
    const player = ServerGameState.getCurrentPlayer(gameState);
    if (!player) {
        return;
    }

    const x = centerX - 200;
    const y = height - 50;
    const w = 400;
    const h = 25;

    const f = player.health / 100;
    const w2 = f * w;

    // As health goes from 100 to 0, color goes from white to red
    // Hue stays constant at 0
    // Saturation goes from 0 (white) to 100 (red)
    // Value goes from 100 (white) to 50 (red)
    const hue = 0;
    const sat = 1.0 - f;
    const val = 0.5 + 0.5 * f;
    const color = HSVtoRGB(hue, sat, val);

    overlayCtx.fillStyle = color;
    overlayCtx.fillRect(x, y, w2, h);

    overlayCtx.strokeStyle = COLOR_WHITE;
    overlayCtx.lineWidth = 1;
    overlayCtx.beginPath();
    overlayCtx.rect(x, y, w, h);
    overlayCtx.stroke();
}

function drawMinimap() {
    const mapSize = (overlayCanvas.width * 0.15) | 0;
    const mapX = (overlayCanvas.width - mapSize - 20) | 0;
    const mapY = (overlayCanvas.height - mapSize - 20) | 0;
    drawMap(mapX, mapY, mapSize, false);

    if (gameState && ServerGameState.isStarted(gameState)) {
        const clockX = mapX;
        const clockY = mapY - 10;
        const clockTime = HALF_PHASE_DURATION - ((gameState.currentTime | 0) % HALF_PHASE_DURATION);
        setFontSize(14);
        setTextAlign(ALIGN_LEFT);
        drawShadowText(clockTime, clockX, clockY);
    }
}

function drawControlTips() {
    setTextAlign(ALIGN_LEFT);
    setFontSize(11);
    drawShadowText('WASD - Move', 20, height - 140);
    drawShadowText('Left click - Shoot', 20, height - 120);
    drawShadowText('Right click - Zoom', 20, height - 100);
    drawShadowText('M - Map', 20, height - 80);
}

function drawPreGameClock() {
    if (!gameState || ServerGameState.isStarted(gameState)) {
        return;
    }

    setTextAlign(ALIGN_CENTER);

    setFontSize(14);
    drawShadowText('Starts in:', centerX, centerY - 60);

    setFontSize(60);
    drawShadowText((-gameState.currentTime) | 0, centerX, centerY);
}

function drawShadowText(str, x, y) {
    drawColoredText(str, x + 1, y + 1, COLOR_BLACK);
    drawColoredText(str, x, y, COLOR_WHITE);
}

function drawColoredText(str, x, y, color) {
    overlayCtx.fillStyle = color;
    overlayCtx.fillText(str, x, y);
}

function drawShadowLine(x1, y1, x2, y2) {
    overlayCtx.strokeStyle = COLOR_BLACK;
    overlayCtx.beginPath();
    overlayCtx.moveTo(x1, y1);
    overlayCtx.lineTo(x2, y2);
    overlayCtx.stroke();
    overlayCtx.strokeStyle = COLOR_WHITE;
    overlayCtx.beginPath();
    overlayCtx.moveTo(x1, y1);
    overlayCtx.lineTo(x2, y2);
    overlayCtx.stroke();
}

function setFontSize(size) {
    overlayCtx.font = size + 'px sans-serif';
}

function setTextAlign(align) {
    overlayCtx.textAlign = align;
}

/**
 * Converts a color from HSV format to RGB format.
 *
 * Based on: https://stackoverflow.com/a/17243070/2051724
 *
 * @param {number} h Hue.
 * @param {number} s Saturation.
 * @param {number} v Value.
 * @param {number=} a Optional alpha, default is 1 (opaque).
 */
function HSVtoRGB(h, s, v, a) {
    var r, g, b, i, f, p, q, t;
    i = (h * 6) | 0;
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return 'rgba(' + ((r * 255) | 0) + ',' + ((g * 255) | 0) + ',' + ((b * 255) | 0) + ',' + (a || 1) + ')';
}

function toClockString(time) {
    if (time < 0) {
        return '';
    }
    const totalSeconds = (time / 1000) | 0;
    const minutes = (totalSeconds / 60) | 0;
    const seconds = (totalSeconds % 60) | 0;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}
