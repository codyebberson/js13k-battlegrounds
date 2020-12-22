
/**
 * The Web Audio Context.
 *
 * @const {!AudioContext}
 */
const audioContext = new AudioContext();

/**
 * Audio sample rate.
 * Doubles as the gunfire "frame count", because the effect is 1 second long.
 * @const {number}
 */
const sampleRate = audioContext.sampleRate;

/**
 * White noise audio buffer.
 * The base of the gunfire sound is plain old white noise.
 * @const {!AudioBuffer}
 */
const whiteNoiseBuffer = audioContext.createBuffer(1, sampleRate, sampleRate);

/**
 * White noise audio data.
 * Filled with random numbers in the range of -1..1.
 * @const {!Float32Array}
 */
const whiteNoiseData = whiteNoiseBuffer.getChannelData(0);
for (let i = 0; i < sampleRate; i++) {
    whiteNoiseData[i] = Math.random() * 2 - 1;
}

/**
 * Plays a gunfire sound.
 *
 * Largely based on this BBC article:
 * https://webaudio.prototyping.bbc.co.uk/gunfire/
 *
 * @param {number} distance
 * @param {number=} opt_length Optional length, default is 1 second.
 */
function playGunfire(distance, opt_length) {
    if (distance > 500) {
        return;
    }

    let length = opt_length || 1;

    // Volume by distance
    // https://gamedev.stackexchange.com/a/11619
    let inverseDistance = 1.0 - distance / 500.0;
    let volumePercent = inverseDistance * inverseDistance;
    let lowpassFrequency = 1000 - distance;
    let bassBoostFrequency = 5000 - 10 * distance;
    let bassBoostGain = Math.max(1, 10 - distance / 50);

    let now = audioContext.currentTime;
    let envelope = audioContext.createGain();
    envelope.gain.value = 0;
    envelope.gain.setValueAtTime(10 * volumePercent, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.7 * length);
    envelope.gain.setValueAtTime(0, now + length);
    envelope.connect(audioContext.destination);

    let filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 1;
    filter.frequency.value = lowpassFrequency;
    filter.connect(envelope);

    // Boost bass
    // https://stackoverflow.com/a/29111314/2051724
    let bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = bassBoostFrequency;
    bassFilter.gain.value = bassBoostGain;
    bassFilter.connect(filter);

    let node = audioContext.createBufferSource();
    node.buffer = whiteNoiseBuffer;
    node.connect(bassFilter);
    node.start();
}

function playPickupSound() {
    playGunfire(0, 0.2);
}

/*
 * Music
 */

/**
 * The scheduler "look ahead time".
 *
 * Notes must not be scheduled too far in advance.
 *
 * Read Chris Wilson's excellent explanation of Web Audio scheduling:
 * https://www.html5rocks.com/en/tutorials/audio/scheduling/
 *
 * There are effectively 2 schedulers working in tandem:
 *   1) A plain old JavaScript scheduler using window.setInterval().
 *   2) A high precision audio scheduler using the Web Audio API.
 *
 * The high precision audio scheduler is the only way to get sufficient accuracy for music.
 *
 * Unfortunately, notes cannot be scheduled in the buffer too far in advance.
 *
 * So we use a plain old JavaScript scheduler to throttle notes and prevent overflow.
 *
 * @const {number}
 */
const MUSIC_SCHEDULE_AHEAD_TIME = 0.1;

/**
 * Music time represents the time that notes have been scheduled up to.
 * All notes before this time have been scheduled.
 * All notes after this time have not been scheduled yet.
 * @type {number}
 */
let musicTime = 0.0;

/**
 * Music index represents the beat count.
 * Integer increasing from zero to infinity.
 * @type {number}
 */
let musicIndex = 0;

/**
 * Master music volume control.
 * @const {!GainNode}
 */
const musicGain = audioContext.createGain();
musicGain.connect(audioContext.destination);
musicGain.gain.setTargetAtTime(0.04, 0, 0.01);

/**
 * Turns music on or off.
 * @param {boolean} enabled
 */
function setMusicEnabled(enabled) {
    musicGain.gain.setValueAtTime(enabled ? 0.1 : 0, audioContext.currentTime);
}

/**
 * Schedules a music note to be played.
 * @param {number} freq The frequency of the note in hertz.
 * @param {number} duration The duration of the note in seconds.
 */
function scheduleNote(freq, duration) {
    let osc = audioContext.createOscillator();
    osc.connect(musicGain);
    osc.type = 'sawtooth';
    osc.frequency.setTargetAtTime(freq, musicTime, 0.01);
    osc.start(musicTime);
    osc.stop(musicTime + 0.99 * duration);
}

/**
 * Performs one iteration of the Javascript music scheduler.
 * (In contrast to the WebAudio high precision scheduler.)
 */
function scheduler() {
    while (musicTime < (audioContext.currentTime + MUSIC_SCHEDULE_AHEAD_TIME)) {
        let bar = ((musicIndex / 8) | 0) % 4;
        let beat = musicIndex % 8;

        // Bass line
        // D2 = 73 Hz
        if (beat === 0 || beat === 3) {
            scheduleNote(73, 0.5);
        } else {
            scheduleNote(73, 0.25);
        }

        // F / G / A-minor
        // F4 = 349 Hz
        // G4 = 392 Hz
        // A4' = 415 Hz
        if (beat === 0) {
            if (bar === 1) {
                scheduleNote(349, 2);
            } else if (bar === 2) {
                scheduleNote(392, 2);
            } else if (bar === 3) {
                scheduleNote(415, 2);
            }
        }

        musicTime += 0.25;
        musicIndex++;
    }
}

setInterval(scheduler, 1000 * MUSIC_SCHEDULE_AHEAD_TIME);
