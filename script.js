// === Utility Functions ===
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getNormalizedCoords(evt, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / rect.width,
        y: (evt.clientY - rect.top) / rect.height
    };
}

// === DOM Elements ===
const animatedBox = document.querySelector(".animated-box");
const easingSelect = document.getElementById("easing-select");
const playPauseBtn = document.getElementById("play-pause-btn");
const replayBtn = document.getElementById("replay-btn");
const progressSlider = document.getElementById("progress-slider");
const autoReplayToggle = document.getElementById("auto-replay-toggle");
const bezierEditor = document.getElementById("bezier-builder");
const bezierCanvas = document.getElementById("bezier-canvas");
const ctx = bezierCanvas.getContext("2d");
const copyBtn = document.getElementById("copy-bezier");
const cubicOutput = document.getElementById("cubic-output");
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = themeToggleBtn?.querySelector("i");
const bezierInputs = ['x1', 'y1', 'x2', 'y2'].map(id => document.getElementById(id));

// === State Variables ===
let animationFrame = null;
let startTime = null;
let duration = 2000;
let isPlaying = false;
let autoReplay = false;
let currentEasing = easingSelect.value;
let p1 = { x: 0.25, y: 0.1 };
let p2 = { x: 0.25, y: 1 };
let draggingPoint = null;
let customEasingFunction = BezierEasing(p1.x, p1.y, p2.x, p2.y);

const easingMap = {};

async function loadEasings() {
    const res = await fetch("easings.json");
    const data = await res.json();

    data.forEach(group => {
        const optGroup = document.createElement("optgroup");
        optGroup.label = group.label;

        group.options.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option.name;
            opt.textContent = option.name;

            // Store bezier for later reference
            if (option.bezier) {
                easingMap[option.name] = option.bezier;
            }

            optGroup.appendChild(opt);
        });

        easingSelect.appendChild(optGroup);
    });
}

function getEasingFunction() {
    return customEasingFunction;
}

function updateCustomEasing() {
    let x1 = clamp(parseFloat(bezierInputs[0].value), 0, 1);
    let y1 = clamp(parseFloat(bezierInputs[1].value), 0, 1);
    let x2 = clamp(parseFloat(bezierInputs[2].value), 0, 1);
    let y2 = clamp(parseFloat(bezierInputs[3].value), 0, 1);

    bezierInputs[0].value = x1.toFixed(3);
    bezierInputs[1].value = y1.toFixed(3);
    bezierInputs[2].value = x2.toFixed(3);
    bezierInputs[3].value = y2.toFixed(3);

    customEasingFunction = BezierEasing(x1, y1, x2, y2);
    cubicOutput.textContent = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

function updateInputsFromPoints() {
    bezierInputs[0].value = p1.x.toFixed(3);
    bezierInputs[1].value = p1.y.toFixed(3);
    bezierInputs[2].value = p2.x.toFixed(3);
    bezierInputs[3].value = p2.y.toFixed(3);
}

function updatePointsFromInputs() {
    p1.x = clamp(parseFloat(bezierInputs[0].value), 0, 1);
    p1.y = clamp(parseFloat(bezierInputs[1].value), 0, 1);
    p2.x = clamp(parseFloat(bezierInputs[2].value), 0, 1);
    p2.y = clamp(parseFloat(bezierInputs[3].value), 0, 1);
}

function drawBezierPreview() {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    ctx.clearRect(0, 0, bezierCanvas.width, bezierCanvas.height);
    const scale = bezierCanvas.width;
    ctx.save();
    ctx.scale(scale, scale);

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.005;
    for (let i = 0; i <= 1; i += 0.1) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1, i); ctx.stroke();
    }

    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(x1, 1 - y1);
    ctx.lineTo(x2, 1 - y2);
    ctx.lineTo(1, 0);
    ctx.stroke();

    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.bezierCurveTo(x1, 1 - y1, x2, 1 - y2, 1, 0);
    ctx.stroke();

    ctx.fillStyle = "#ff4136";
    [[x1, 1 - y1], [x2, 1 - y2]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 0.015, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function drawBezierPreviewWithDot(t, easedT) {
    drawBezierPreview();
    ctx.save();
    ctx.scale(bezierCanvas.width, bezierCanvas.height);
    ctx.beginPath();
    ctx.arc(t, 1 - easedT, 0.015, 0, 2 * Math.PI);
    ctx.fillStyle = "#28a745";
    ctx.fill();
    ctx.restore();
}

function copyCubicOutput() {
    navigator.clipboard.writeText(cubicOutput.textContent.trim()).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = "Copy", 1500);
    });
}

function animateBox() {
    if (!isPlaying) return;
    const now = Date.now();
    const tRaw = (now - startTime) / duration;
    const t = Math.min(tRaw, 1);
    const easingFn = getEasingFunction();
    const easedT = easingFn(t);
    const track = document.querySelector(".animation-track");
    const boxWidth = animatedBox.offsetWidth;
    const trackWidth = track.clientWidth;
    const padding = 10;
    const usableDistance = trackWidth - boxWidth - padding * 2;
    animatedBox.style.left = `${padding + easedT * usableDistance}px`;
    progressSlider.value = Math.round(t * 100);

    if (currentEasing === "custom") drawBezierPreviewWithDot(t, easedT);
    if (t < 1) animationFrame = requestAnimationFrame(animateBox);
    else {
        isPlaying = false;
        playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
        if (autoReplay) {
            isPlaying = true;
            startTime = Date.now();
            animationFrame = requestAnimationFrame(animateBox);
        }
    }
}

function playAnimation() {
    if (isPlaying) {
        cancelAnimationFrame(animationFrame);
        isPlaying = false;
        playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
    } else {
        if (progressSlider.value >= 100) progressSlider.value = 0;
        isPlaying = true;
        startTime = Date.now() - (progressSlider.value / 100) * duration;
        animationFrame = requestAnimationFrame(animateBox);
        playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;
    }
}

function replayAnimation() {
    cancelAnimationFrame(animationFrame);
    isPlaying = true;
    progressSlider.value = 0;
    startTime = Date.now();
    animationFrame = requestAnimationFrame(animateBox);
    playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;
}

function updateEasing() {
    currentEasing = easingSelect.value;
    cancelAnimationFrame(animationFrame);
    isPlaying = autoReplay;
    playPauseBtn.innerHTML = autoReplay ? `<i class="fas fa-pause"></i>` : `<i class="fas fa-play"></i>`;

    // Handle easing selection
    if (currentEasing === "custom") {
        bezierEditor.classList.remove("hidden");
        updateCustomEasing();
        drawBezierPreview();
    } else {
        bezierEditor.classList.add("hidden");

        const bezierString = easingMap[currentEasing]; // from JSON
        if (bezierString) {
            const [x1, y1, x2, y2] = parseBezierString(bezierString);
            customEasingFunction = BezierEasing(x1, y1, x2, y2);
            document.getElementById("cubic-output").textContent = bezierString;
        } else {
            // fallback if no bezier string found
            document.getElementById("cubic-output").textContent = "linear";
            customEasingFunction = t => t;
        }
    }

    // Reset box and play if autoplay is on
    if (isPlaying) {
        startTime = Date.now();
        animationFrame = requestAnimationFrame(animateBox);
    } else {
        animatedBox.style.left = `10px`;
        progressSlider.value = 0;
    }
}

function parseBezierString(str) {
    const match = str.match(/cubic-bezier\(([^)]+)\)/);
    if (!match) return [0, 0, 1, 1];
    return match[1].split(',').map(Number);
}



function scrubAnimation(e) {
    cancelAnimationFrame(animationFrame);
    const t = e.target.value / 100;
    const easingFn = getEasingFunction();
    const easedT = easingFn(t);
    const track = document.querySelector(".animation-track");
    const boxWidth = animatedBox.offsetWidth;
    const trackWidth = track.clientWidth;
    const padding = 10;
    const usableDistance = trackWidth - boxWidth - padding * 2;
    animatedBox.style.left = `${padding + easedT * usableDistance}px`;
    if (currentEasing === "custom") drawBezierPreviewWithDot(t, easedT);
    isPlaying = false;
    playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
}

function toggleAutoReplay() {
    autoReplay = !autoReplay;
    autoReplayToggle.textContent = autoReplay ? "On" : "Off";
    autoReplayToggle.setAttribute("aria-pressed", autoReplay);
}

function setDarkMode(on) {
    document.body.classList.toggle("dark", on);
    themeIcon?.classList.toggle("fa-sun", on);
    themeIcon?.classList.toggle("fa-moon", !on);
}

function initializeEventListeners() {
    playPauseBtn.addEventListener("click", playAnimation);
    replayBtn.addEventListener("click", replayAnimation);
    easingSelect.addEventListener("change", updateEasing);
    progressSlider.addEventListener("input", scrubAnimation);
    autoReplayToggle.addEventListener("click", toggleAutoReplay);
    copyBtn.addEventListener("click", copyCubicOutput);

    themeToggleBtn?.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem("prefers-dark", isDark);
        setDarkMode(isDark);
    });

    bezierInputs.forEach(input => input.addEventListener("input", () => {
        updatePointsFromInputs();
        updateCustomEasing();
        drawBezierPreview();
    }));

    bezierCanvas.addEventListener("mousedown", (e) => {
        const { x, y } = getNormalizedCoords(e, bezierCanvas);
        const r = 0.03;
        if (distance(x, y, p1.x, 1 - p1.y) < r) draggingPoint = p1;
        else if (distance(x, y, p2.x, 1 - p2.y) < r) draggingPoint = p2;
    });

    bezierCanvas.addEventListener("mousemove", (e) => {
        const { x, y } = getNormalizedCoords(e, bezierCanvas);
        bezierCanvas.style.cursor =
            distance(x, y, p1.x, 1 - p1.y) < 0.03 ||
                distance(x, y, p2.x, 1 - p2.y) < 0.03 ? "pointer" : "default";
        if (!draggingPoint) return;
        draggingPoint.x = clamp(x, 0, 1);
        draggingPoint.y = clamp(1 - y, 0, 1);
        updateInputsFromPoints();
        updateCustomEasing();
        drawBezierPreview();
    });

    bezierCanvas.addEventListener("mouseup", () => draggingPoint = null);
    bezierCanvas.addEventListener("mouseleave", () => draggingPoint = null);
}

// === Initialization ===
document.addEventListener("DOMContentLoaded", async () => {
    const prefersDark = localStorage.getItem("prefers-dark") === "true";
    setDarkMode(prefersDark);
    updatePointsFromInputs();
    drawBezierPreview();
    await loadEasings();
    updateEasing();
    initializeEventListeners();
});
