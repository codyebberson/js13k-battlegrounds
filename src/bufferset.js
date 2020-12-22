
/**
 * Maximum number of elements per buffer.
 *
 * Some browsers / video cards allow large buffers, but 16-bit is the safe max.
 * https://stackoverflow.com/a/5018021/2051724
 *
 * @const {number}
 */
const BUFFER_SIZE = 65536;

/** @typedef {number} */
var GLenum;

/**
 * Creates a new buffer set.
 *
 * A buffer set is the combination of three buffers:
 * 1) Positions - coordinates are in the world.
 * 2) Textures - coordinates on the texture image.
 * 3) Indices - indices lookups for the individual triangles.
 *
 * The general philosophy is "let webgl do as much as possible", so a single
 * call to "render()" will include many triangles.
 *
 * @constructor
 * @param {!GLenum} usage The usage pattern (either STATIC_DRAW or DYNAMIC_DRAW).
 */
function BufferSet(usage) {
    this.usage = usage;
    this.positions = new Float32Array(BUFFER_SIZE);
    this.textureCoordinates = new Float32Array(BUFFER_SIZE);
    this.indices = new Uint16Array(BUFFER_SIZE);
    this.resetBuffers();
}

/**
 * Resets the buffers to empty state.
 */
BufferSet.prototype.resetBuffers = function () {
    this.vertexCount = 0;
    this.positionsCount = 0;
    this.textureCoordCount = 0;
    this.indicesCount = 0;
};

/**
 *
 * @param {!Array.<vec3>} points Array of 4 corners.
 * @param {number} tx Texture x.
 * @param {number} ty Texture y.
 * @param {number=} opt_width Optional texture width in pixels (default is 16).
 * @param {number=} opt_height Optional texture height in pixels (default is width).
 */
BufferSet.prototype.addQuad = function (points, tx, ty, opt_width, opt_height) {
    const index = this.vertexCount;

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 3; j++) {
            this.positions[this.positionsCount++] = points[i][j];
        }
        this.vertexCount++;
    }

    const width = opt_width || 16.0;
    const height = opt_height || width;
    const tx1 = tx / 128.0;
    const ty1 = ty / 128.0;
    const tx2 = (tx + width) / 128.0;
    const ty2 = (ty + height) / 128.0;
    this.textureCoordinates[this.textureCoordCount++] = tx1;
    this.textureCoordinates[this.textureCoordCount++] = ty1;
    this.textureCoordinates[this.textureCoordCount++] = tx2;
    this.textureCoordinates[this.textureCoordCount++] = ty1;
    this.textureCoordinates[this.textureCoordCount++] = tx2;
    this.textureCoordinates[this.textureCoordCount++] = ty2;
    this.textureCoordinates[this.textureCoordCount++] = tx1;
    this.textureCoordinates[this.textureCoordCount++] = ty2;

    // 0, 1, 2, 0, 2, 3
    this.indices[this.indicesCount++] = index;
    this.indices[this.indicesCount++] = index + 1;
    this.indices[this.indicesCount++] = index + 2;
    this.indices[this.indicesCount++] = index;
    this.indices[this.indicesCount++] = index + 2;
    this.indices[this.indicesCount++] = index + 3;
};


BufferSet.prototype.initBuffers = function (gl) {
    this.positionBuffer = gl.createBuffer();
    this.textureCoordBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    this.updateBuffers(gl);
};


BufferSet.prototype.updateBuffers = function (gl) {
    gl.bindBuffer(ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(ARRAY_BUFFER, this.positions, this.usage);

    gl.bindBuffer(ARRAY_BUFFER, this.textureCoordBuffer);
    gl.bufferData(ARRAY_BUFFER, this.textureCoordinates, this.usage);

    gl.bindBuffer(ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(ELEMENT_ARRAY_BUFFER, this.indices, this.usage);
};


//
// Draw the scene.
//
BufferSet.prototype.render = function (gl, programInfo, texture) {
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
        const numComponents = 3;
        const type = FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the texture coordinates from
    // the texture coordinate buffer into the textureCoord attribute.
    {
        const numComponents = 2;
        const type = FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(ARRAY_BUFFER, this.textureCoordBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.textureCoord);
    }

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    // Specify the texture to map onto the faces.

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(TEXTURE_2D, texture);

    // Tell the shader we bound the texture to texture unit 0
    {
        const vertexCount = this.indicesCount;
        const type = UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(TRIANGLES, vertexCount, type, offset);
    }
};
