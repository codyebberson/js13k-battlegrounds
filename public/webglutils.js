
// Use custom GL constants for minifier.
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants

/** @type {!GLenum} */
const STATIC_DRAW = 0x88E4;

/** @type {!GLenum} */
const DYNAMIC_DRAW = 0x88E8;

/** @type {!GLenum} */
const TEXTURE_2D = 0x0DE1;

/** @type {!GLenum} */
const RGBA = 0x1908;

/** @type {!GLenum} */
const UNSIGNED_BYTE = 0x1401;

/** @type {!GLenum} */
const UNSIGNED_SHORT = 0x1403;

/** @type {!GLenum} */
const FLOAT = 0x1406;

/** @type {!GLenum} */
const TEXTURE_MAG_FILTER = 0x2800;

/** @type {!GLenum} */
const TEXTURE_MIN_FILTER = 0x2801;

/** @type {!GLenum} */
const NEAREST = 0x2600;

/** @type {!GLenum} */
const DEPTH_TEST = 0x0B71;

/** @type {!GLenum} */
const LEQUAL = 0x0203;

/** @type {!GLenum} */
const BLEND = 0x0BE2;

/** @type {!GLenum} */
const SRC_ALPHA = 0x0302;

/** @type {!GLenum} */
const ONE_MINUS_SRC_ALPHA = 0x0303;

/** @type {!GLenum} */
const COLOR_BUFFER_BIT = 0x00004000;

/** @type {!GLenum} */
const DEPTH_BUFFER_BIT = 0x00000100;

/** @type {!GLenum} */
const ELEMENT_ARRAY_BUFFER = 0x8893;

/** @type {!GLenum} */
const TRIANGLES = 0x0004;

/** @type {!GLenum} */
const TEXTURE0 = 0x84C0;

/** @type {!GLenum} */
const ARRAY_BUFFER = 0x8892;


// Basic WebGL setup
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL

/**
 * Vertex shader program.
 *
 * a = attribute vec4 aVertexPosition;
 * b = attribute vec2 aTextureCoord;
 * c = uniform mat4 uModelViewMatrix;
 * d = uniform mat4 uProjectionMatrix;
 * e = varying highp vec2 vTextureCoord;
 *
 * @const {string}
 */
const vsSource = `
attribute vec4 a;
attribute vec2 b;
uniform mat4 c;
uniform mat4 d;
varying highp vec2 e;
void main(void){
gl_Position=d*c*a;
e=b;
}`;

/**
 * Fragment shader program.
 *
 * e = varying highp vec2 vTextureCoord;
 * f = uniform sampler2D uSampler;
 *
 * @const {string}
 */
const fsSource = `
varying highp vec2 e;
uniform sampler2D f;
void main(void){
gl_FragColor=texture2D(f,e);
if(gl_FragColor.a<0.1)discard;
}`;

function initShaderProgramInfo(gl) {
    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = initShaderProgram(gl);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aTextureCoord and also
    // look up uniform locations.
    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'a'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'b'),
        },
        uniformLocations: {
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'c'),
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'd'),
        },
    };
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}
