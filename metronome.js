let audioCtx = null;
let masterGain = null;
let bpm = 100;
let intervalId = null;
let isPlaying = false;

const bpmInput = document.getElementById("bpmInput");
const bpmRange = document.getElementById("bpmRange");
const startStopBtn = document.getElementById("startStopBtn");
const beatBall = document.getElementById("beatBall");
const mensagem = document.getElementById("mensagem");
const compassoSelect = document.getElementById("compassoSelect");
const subdivisaoSelect = document.getElementById("subdivisaoSelect");


function ensureAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = Number(document.getElementById("volumeGeral").value || 0.7);
        masterGain.connect(audioCtx.destination);
    }
    return audioCtx;
}

function syncBPM(v) {
    v = Math.max(20, Math.min(300, Number(v) || 100));
    bpmInput.value = v;
    bpmRange.value = v;
    bpm = v;
    if (isPlaying) restartMetronome(); 
}
bpmInput.addEventListener("input", () => syncBPM(bpmInput.value));
bpmRange.addEventListener("input", () => syncBPM(bpmRange.value));

document.getElementById("volumeGeral").addEventListener("input", (e) => {
    if (masterGain) masterGain.gain.value = Number(e.target.value);
});

compassoSelect.addEventListener("change", () => {
    if (isPlaying) restartMetronome();
});
subdivisaoSelect.addEventListener("change", () => {
    if (isPlaying) restartMetronome();
});

/* ----- sons por tipo: accent, main, sub ----- */
function playTone(type = "main") {
    const ctx = ensureAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    let freq = 1000;
    let dur = 0.06;
    let level = Number(document.getElementById("volumeGeral").value || 0.7);

    const soundChoice = document.getElementById("somSelect").value;
    if (soundChoice === "wood") { osc.type = "triangle"; freq *= 0.75; }
    else if (soundChoice === "click") { osc.type = "square"; freq *= 0.9; }
    else { osc.type = "sine"; }

    if (type === "accent") {
        freq *= 1.5;      // mais agudo
        level *= 1.0;     // mais alto
        dur = 0.07;
    } else if (type === "main") {
        freq *= 1.0;
        level *= 0.8;
        dur = 0.06;
    } else { // sub
        freq *= 0.7;
        level *= 0.32;
        dur = 0.04;
    }

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(level, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    osc.connect(g);
    g.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);

    const vib = document.getElementById("vibracaoSelect").value;
    if (vib === "on" && navigator.vibrate) {
        try { navigator.vibrate(type === "sub" ? 10 : 40); } catch(e) { /* ignore */ }
    }
}

function pulseOnce() {
    beatBall.classList.add("pulse");
    setTimeout(() => beatBall.classList.remove("pulse"), 140);
}

startStopBtn.addEventListener("click", async () => {
    if (!isPlaying) await startMetronome();
    else stopMetronome();
});

async function startMetronome() {
    ensureAudioContext();
    if (audioCtx.state === "suspended") await audioCtx.resume();

    mensagem.textContent = "Concentre-se!";
    document.body.classList.add("playing");

    startStopBtn.textContent = "■ Parar";
    startStopBtn.classList.add("stop");
    isPlaying = true;

    restartMetronome();
}

function stopMetronome() {
    if (!isPlaying) return;
    isPlaying = false;

    clearInterval(intervalId);
    intervalId = null;

    mensagem.textContent = "Você foi bem, descanse os dedinhos agora.";
    document.body.classList.remove("playing");

    startStopBtn.textContent = "▶ Iniciar";
    startStopBtn.classList.remove("stop");
}

function restartMetronome() {
    if (!isPlaying) return;

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    bpm = Number(bpmInput.value) || bpm;
    const compasso = Number(compassoSelect.value) || 4;
    const subdiv = Number(subdivisaoSelect.value) || 1;

    const ms = (60000 / bpm) / subdiv;

    let mainBeat = 1;
    let subIndex = 0;

    function tick() {
        const isSubdivision = subIndex > 0;

        let type;
        if (isSubdivision) type = "sub";
        else type = (mainBeat === 1) ? "accent" : "main";

        playTone(type);
        pulseOnce();

        subIndex++;
        if (subIndex >= subdiv) {
            subIndex = 0;
            mainBeat++;
            if (mainBeat > compasso) mainBeat = 1;
        }
    }

    tick();
    intervalId = setInterval(tick, ms);
}

window.addEventListener('beforeunload', () => {
    if (audioCtx && typeof audioCtx.close === 'function') audioCtx.close();
});
