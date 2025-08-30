// ====== Config ======
const DATE_KEY = "hb_target_date";
const CONFETTI_MIN = 50, CONFETTI_MAX = 90;
const BALLOON_MIN = 10, BALLOON_MAX = 20;
const MOVE_DURATION = 1800; // ms move
const PAUSE_DURATION = 1000; // ms pause between moves

// ====== Elements ======
const timerEl = document.getElementById("timer");
const timerScreen = document.getElementById("timer-screen");
const birthdayScreen = document.getElementById("birthday-screen");
const inputEl = document.getElementById("dateInput");
const saveBtn = document.getElementById("saveDate");
const cake = document.getElementById("cake");
const music = document.getElementById("bg-music");
const musicBtn = document.getElementById("musicBtn");

// ====== Date setup ======
const params = new URLSearchParams(window.location.search);
const urlTarget = params.get('unlock');
let targetDate = urlTarget || "2025-08-30T11:18"; // default fallback

localStorage.setItem(DATE_KEY, new Date(targetDate).toString());

// Hide date selection UI
if (inputEl) inputEl.style.display = "none";
if (saveBtn) saveBtn.style.display = "none";


// ====== Timer ======
function updateTimer() {
  const t = new Date(localStorage.getItem(DATE_KEY) || targetDate).getTime();
  const now = Date.now();
  const diff = t - now;
  if (diff <= 0) {
    timerScreen.classList.add("hidden");
    birthdayScreen.classList.remove("hidden");
    // NOTE: We DO NOT start confetti/balloons/slideshow yet.
    // They start only after cake is cut.
    // Try autoplay music (may require user gesture; cake click also plays).
    try { music.autoplay = true; music.play(); } catch(e) {}
    return;
  }
  const day = Math.floor(diff / (1000*60*60*24));
  const hrs = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
  const min = Math.floor((diff % (1000*60*60)) / (1000*60));
  const sec = Math.floor((diff % (1000*60)) / 1000);
  timerEl.textContent = `${day}d ${hrs}h ${min}m ${sec}s`;
}
setInterval(updateTimer, 1000); updateTimer();

// ====== Cake Cut -> start party ======
let partyStarted = false;
function startParty() {
  if (partyStarted) return;
  partyStarted = true;
  startConfetti();
  startBalloons();
  startCarousel();
  try { music.play(); } catch(e) {}
}
cake?.addEventListener("click", () => {
  cake.classList.add("cut");
  startParty();
});
cake?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { cake.classList.add("cut"); startParty(); }
});

// ====== Confetti (50-90 at a time) ======
let confettiCtx, confettiCanvas, confettiParticles = [], confettiTargetCount = 0;
function startConfetti() {
  confettiCanvas = document.getElementById("confetti");
  confettiCtx = confettiCanvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  confettiTargetCount = rand(CONFETTI_MIN, CONFETTI_MAX);
  spawnConfetti(confettiTargetCount);
  requestAnimationFrame(drawConfetti);
}
function spawnConfetti(n) {
  const colors = ["#ff595e","#ffca3a","#8ac926","#1982c4","#6a4c93"];
  for (let i = 0; i < n; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random()*colors.length)],
      tilt: Math.random()*10,
      tiltDir: Math.random() > 0.5 ? 1 : -1,
      vy: 2 + Math.random()*3,
      vx: -1 + Math.random()*2,
      rot: Math.random()*360
    });
  }
}
function maintainConfetti() {
  // Keep particle count in target range
  if (confettiParticles.length < CONFETTI_MIN) {
    spawnConfetti(CONFETTI_MIN - confettiParticles.length);
  } else if (confettiParticles.length > CONFETTI_MAX) {
    confettiParticles.length = CONFETTI_MAX;
  }
}
function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
function drawConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    p.y += p.vy;
    p.x += p.vx;
    p.tilt += 0.1 * p.tiltDir;
    p.rot += 2;
    if (p.y > confettiCanvas.height + 20) {
      // recycle to top
      p.y = -20; p.x = Math.random()*confettiCanvas.width;
    }
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rot*Math.PI)/180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
    confettiCtx.restore();
  });
  maintainConfetti();
  requestAnimationFrame(drawConfetti);
}

// ====== Balloons (10-20) ======
function startBalloons() {
  const cont = document.getElementById("balloons");
  const colors = ["#ff4d6d","#6a4c93","#1982c4","#8ac926","#ffca3a","#f72585","#4cc9f0","#b5179e"];
  const total = rand(BALLOON_MIN, BALLOON_MAX);
  for (let i = 0; i < total; i++) {
    spawnBalloon(cont, colors);
  }
  // gentle trickle: keep within range
  setInterval(() => {
    const current = cont.querySelectorAll('.balloon').length;
    if (current < BALLOON_MIN) spawnBalloon(cont, colors);
  }, 1200);
}
function spawnBalloon(cont, colors) {
  const b = document.createElement("div");
  b.className = "balloon";
  b.style.left = Math.random()*100 + "vw";
  b.style.setProperty("--clr", colors[Math.floor(Math.random()*colors.length)]);
  b.style.setProperty("--dur", (7 + Math.random()*6) + "s");
  b.style.setProperty("--drift", (-40 + Math.random()*80) + "px");
  cont.appendChild(b);
  setTimeout(() => b.remove(), 16000);
}

// ====== Carousel (center highlight, right->left, 1s pause) ======
let carouselIndex = 0, carouselNodes = [];
function startCarousel() {
  const c = document.getElementById("carousel");
  carouselNodes = Array.from(c.querySelectorAll(".card"));
  if (!carouselNodes.length) return;
  layoutCarousel();
  // cycle
  function step() {
    // move
    carouselIndex = (carouselIndex + 1) % carouselNodes.length;
    layoutCarousel();
    // after move, wait PAUSE_DURATION before next move
    setTimeout(step, MOVE_DURATION + PAUSE_DURATION);
  }
  setTimeout(step, MOVE_DURATION + PAUSE_DURATION);
}
function layoutCarousel() {
  const n = carouselNodes.length;
  const center = carouselIndex % n;
  const left = (center - 1 + n) % n;
  const right = (center + 1) % n;
  for (let i=0;i<n;i++) {
    const card = carouselNodes[i];
    card.classList.remove("pos-center","pos-left","pos-right","pos-back");
    if (i === center) card.classList.add("pos-center");
    else if (i === left) card.classList.add("pos-left");
    else if (i === right) card.classList.add("pos-right");
    else card.classList.add("pos-back");
  }
}

// ====== Utils ======
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
// Envelope click → flap open + paper slide (no auto-open)
(function () {
  const env   = document.getElementById("envelope");
  const flap  = document.getElementById("envFront");
  const letter = document.getElementById("letter") || document.querySelector(".letter-paper");

  if (!env || !flap || !letter) return;

  // Force CLOSED on load
  flap.classList.remove("env-open");
  flap.classList.add("env-closed");
  letter.classList.remove("show");
  letter.setAttribute("aria-hidden", "true");

  function openEnvelope() {
    if (flap.classList.contains("env-open")) return;
    flap.classList.remove("env-closed");
    flap.classList.add("env-open");
    setTimeout(() => {
      letter.classList.add("show");
      letter.setAttribute("aria-hidden", "false");
    }, 120);
  }

  env.addEventListener("click", openEnvelope);
  env.setAttribute("tabindex", "0");
  env.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); }
  });
})();

// ===== Cake click -> capture selfie -> insert into carousel =====
const cakeEl = document.getElementById("cake");
const previewEl = document.getElementById("camPreview");

let camStream = null;
let selfieTaken = false;

// Open camera with front-facing preference; fallback to any camera
async function openCamera() {
  const attempts = [
    { video: { facingMode: { ideal: "user" } }, audio: false },
    { video: true, audio: false }
  ];
  for (const opts of attempts) {
    try { return await navigator.mediaDevices.getUserMedia(opts); } catch (_) {}
  }
  throw new Error("Camera access failed");
}

function stopCamera() {
  try {
    if (camStream) {
      camStream.getTracks().forEach(t => t.stop());
      camStream = null;
    }
    if (previewEl) {
      previewEl.srcObject = null;
      previewEl.style.display = "none";
      previewEl.style.width = "";
      previewEl.style.height = "";
    }
  } catch (_) {}
}

async function ensureVideoReady() {
  if (!previewEl) return;
  // Make preview tiny-visible so iOS produces frames
  previewEl.style.display = "block";
  previewEl.style.width = "2px";
  previewEl.style.height = "2px";
  try { await previewEl.play(); } catch (_) {} // some browsers need play()
  if (previewEl.readyState < 2 || !previewEl.videoWidth || !previewEl.videoHeight) {
    await new Promise(res => {
      const onMeta = () => {
        previewEl.removeEventListener("loadedmetadata", onMeta);
        res();
      };
      previewEl.addEventListener("loadedmetadata", onMeta, { once: true });
    });
  }
}

async function grabFrameToDataURL() {
  const w = previewEl.videoWidth || 0;
  const h = previewEl.videoHeight || 0;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  await new Promise(r => requestAnimationFrame(r)); // avoid black first frame
  ctx.drawImage(previewEl, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return dataUrl && dataUrl.length > 50 ? dataUrl : null;
}

// Insert or replace a selfie slide, then center it
function addSelfieToCarousel(dataUrl, caption = "Fresh cake selfie 🎂📸") {
  const carousel = document.getElementById("carousel");
  if (!carousel || !dataUrl) return;

  // Use placeholder if present, else create a new card
  let card = document.getElementById("selfie-card");
  const placeholder = document.getElementById("selfie-placeholder");

  if (placeholder) {
    card = placeholder;
    card.id = "selfie-card";
  }
  if (!card) {
    card = document.createElement("div");
    card.className = "card";
    card.id = "selfie-card";
    const img = document.createElement("img");
    const p = document.createElement("p");
    card.append(img, p);
    carousel.prepend(card); // put it early so centering looks instant
  }

  const imgEl = card.querySelector("img");
  const pEl = card.querySelector("p");
  if (imgEl) { imgEl.src = dataUrl; imgEl.alt = "Captured selfie"; }
  if (pEl) pEl.textContent = caption;

  // Refresh your carousel cache and center on the selfie
  if (typeof window !== "undefined") {
    // Rebuild node list if your code caches it
    if (typeof carouselNodes === "undefined" || !Array.isArray(carouselNodes)) {
      window.carouselNodes = Array.from(carousel.querySelectorAll(".card"));
    } else {
      window.carouselNodes = Array.from(carousel.querySelectorAll(".card"));
    }
    // Move focus to the selfie slide
    const idx = window.carouselNodes.findIndex(n => n.id === "selfie-card");
    if (idx >= 0) {
      window.carouselIndex = idx;
      if (typeof window.layoutCarousel === "function") window.layoutCarousel();
    }
  }
}

async function captureSelfieFlow() {
  try {
    camStream = await openCamera();
    previewEl.srcObject = camStream;
    await ensureVideoReady();

    // Warm-up and capture with retry
    await new Promise(r => setTimeout(r, 900));
    let dataUrl = await grabFrameToDataURL();
    if (!dataUrl) {
      await new Promise(r => setTimeout(r, 300));
      dataUrl = await grabFrameToDataURL();
    }

    if (dataUrl) {
      addSelfieToCarousel(dataUrl, "Just now 🎂📸");
      try { localStorage.setItem("hb_selfie", dataUrl); } catch (_) {}
      selfieTaken = true;
    }
  } finally {
    stopCamera();
  }
}

// Single entry: cut cake, start party, capture selfie, show slide
async function cutCakeCaptureAndShow() {
  cakeEl?.classList.add("cut");
  if (typeof startParty === "function") startParty();
  if (!selfieTaken) {
    await captureSelfieFlow();
  }
}

// Bind to cake click/keyboard once
cakeEl?.addEventListener("click", () => { cutCakeCaptureAndShow(); });
cakeEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cutCakeCaptureAndShow(); }
});

// Restore last selfie into carousel on load (optional)
(() => {
  try {
    const saved = localStorage.getItem("hb_selfie");
    if (saved) addSelfieToCarousel(saved, "From last time 🎉");
  } catch (_) {}
})();



// ===== Camera Feature Integration =====
const carousel = document.getElementById("carousel");
const overlay = document.getElementById("overlay");
const grantBtn = document.getElementById("grantAccess");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
let stream = null;

// Grant camera once
grantBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    overlay.style.display = "none"; // hide overlay
  } catch (err) {
    alert("Camera access denied ❌");
  }
});

// Extend cake click → add snapshot
cake?.addEventListener("click", () => {
  // Already calls startParty()
  setTimeout(() => {
    takeSnapshot();
  }, 1000);
});

// Snapshot → update existing slide (pic5)
function takeSnapshot() {
  if (!stream) return;
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imgURL = canvas.toDataURL("image/png");

  // Target last slide (pic5)
  const targetSlide = document.querySelector('#carousel .card:last-child img');
  if (targetSlide) {
    targetSlide.src = imgURL; // replace image
    targetSlide.alt = "Surprise Reaction 🎉";
  }

  // (optional: update caption too)
  const caption = document.querySelector('#carousel .card:last-child p');
  if (caption) {
    caption.textContent = "Surprise Reaction 🎉";
  }
}

document.addEventListener("DOMContentLoaded", () => {
    const cake = document.querySelector(".cake");   // cake element
    const cards = document.querySelectorAll(".card"); // sabhi cards

    cake.addEventListener("click", () => {
      cards.forEach(card => {
        card.classList.add("highlight");   // click hote hi shadow add
      });
    });
  });