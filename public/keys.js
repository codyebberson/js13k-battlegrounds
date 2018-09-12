
const KEY_COUNT = 256;

const KEY_ESCAPE = 27;
const KEY_SPACE = 32;
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_A = 65;
const KEY_D = 68;
const KEY_M = 77;
const KEY_Q = 81;
const KEY_S = 83;
const KEY_W = 87;
const KEY_Z = 90;

/**
 * Creates a new key instance.
 * @constructor
 */
function Key() {
    this.down = false;
    this.downCount = 0;
}

/**
 * Array of keyboard keys.
 * @const {!Array.<!Key>}
 */
const keys = new Array(KEY_COUNT);
for (let i = 0; i < KEY_COUNT; i++) {
    keys[i] = new Key();
}

document.addEventListener(
    'keydown',
    function (e) {
        setKey(e.keyCode, true);
    });

document.addEventListener(
    'keyup',
    function (e) {
        setKey(e.keyCode, false);
    });

function setKey(keyCode, state) {
    if (keyCode >= 0 && keyCode < KEY_COUNT) {
        keys[keyCode].down = state;
    }
}

function updateKeys() {
    for (let i = 0; i < KEY_COUNT; i++) {
        if (keys[i].down) {
            keys[i].downCount++;
        } else {
            keys[i].downCount = 0;
        }
    }
}
