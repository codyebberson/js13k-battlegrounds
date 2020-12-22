const fs = require('fs');
const archiver = require('archiver');
const chokidar = require('chokidar');
const ClosureCompiler = require('google-closure-compiler').compiler;
let watchTimerId = null;

function compile() {
    return new Promise((resolve, reject) => {
        const closureCompiler = new ClosureCompiler({
            language_in: 'ECMASCRIPT_2019',
            language_out: 'ECMASCRIPT_2019',
            compilation_level: 'ADVANCED',
            strict_mode_input: true,
            warning_level: 'VERBOSE',
            summary_detail_level: 3,
            externs: 'src/externs.js',
            js: [
                'src/shared.js',
                'src/vec3.js',
                'src/mat4.js',
                'src/bufferset.js',
                'src/keys.js',
                'src/webglutils.js',
                'src/audio.js',
                'src/minimap.js',
                'src/hud.js',
                'src/network.js',
                'src/client.js',
                'src/engine.js',
                'src/server.js',
            ],
            chunk: [
                'shared:1',
                'client:11:shared',
                'server:1:shared'
            ],
            chunk_output_path_prefix: 'public/'
        });

        closureCompiler.run((exitCode, stdOut, stdErr) => {
            console.log('exitCode', exitCode);
            console.log('stdOut', stdOut);
            console.log('stdErr', stdErr);
            if (exitCode === 0) {
                resolve();
            } else {
                reject();
            }
        });
    });
}

function createZip() {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const output = fs.createWriteStream('public.zip');
        output.on('close', () => {
            const packageSize = archive.pointer();
            const pct = packageSize / 13312 * 100;
            console.log(`Package: ${packageSize} byte / ${pct.toFixed(2)}%`);
            resolve(packageSize);
        });
        output.on('error', (error) => {
            packageSize = -1;
            reject(error);
        })
        archive.on('error', (error) => {
            packageSize = -1;
            reject(error);
        })
        archive.pipe(output);
        archive.directory('public/', '');
        archive.finalize();
    })
}

function scheduleCompile() {
    if (watchTimerId) {
        clearTimeout(watchTimerId);
    }
    watchTimerId = setTimeout(() => {
        console.log('Building...');
        compile().then(() => createZip()).then(() => console.log('done'));
    }, 100);
}

function watch() {
    return chokidar.watch('./src/', {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    })
        .on('add', () => scheduleCompile())
        .on('change', () => scheduleCompile())
        .on('unlink', () => scheduleCompile());
}

if (require.main === module) {
    compile().then(() => createZip()).then(() => console.log('done'));
} else {
    module.exports = {
        compile: compile,
        watch: watch
    };
}
