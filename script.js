const candleHolder = document.querySelector('#candles');
const cakeButton = document.querySelector('#cakeButton');
const micButton = document.querySelector('#micButton');
const hint = document.querySelector('#hint');
const scene = document.querySelector('#scene');
const celebration = document.querySelector('#celebration');
const confetti = document.querySelector('#confetti');
const soundButton = document.querySelector('#soundButton');

let celebrated = false;
let audioContext;
let analyser;
let microphoneStream;
let listeningFrame;
let loudFrames = 0;

function buildCandles() {
  const candleColors = ['#f08ca7', '#7fc7d2', '#ac95d7', '#f4b184', '#83c9a2', '#f2ca68'];
  for (let i = 0; i < 26; i += 1) {
    const candle = document.createElement('span');
    candle.className = 'candle';
    const row = i < 13 ? 0 : 1;
    const col = i % 13;
    candle.style.left = `${col * 14.7 + (row ? 2 : 0)}px`;
    candle.style.bottom = `${row * 22}px`;
    candle.style.animationDelay = `${1.48 + i * .035}s`;
    candle.style.setProperty('--candle-color', candleColors[i % candleColors.length]);
    candle.innerHTML = '<span class="flame"></span>';
    candleHolder.appendChild(candle);
  }
}

async function playBirthdaySong() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = audioContext || new AudioCtx();
  audioContext = ctx;
  if (ctx.state === 'suspended') await ctx.resume();
  const master = ctx.createGain();
  master.gain.value = 0.13;
  master.connect(ctx.destination);

  const notes = [
    [392.00,.24],[392.00,.24],[440.00,.48],[392.00,.48],[523.25,.48],[493.88,.86],
    [392.00,.24],[392.00,.24],[440.00,.48],[392.00,.48],[587.33,.48],[523.25,.86],
    [392.00,.24],[392.00,.24],[783.99,.48],[659.25,.48],[523.25,.48],[493.88,.48],[440.00,.86],
    [698.46,.24],[698.46,.24],[659.25,.48],[523.25,.48],[587.33,.48],[523.25,1.05]
  ];

  let time = ctx.currentTime + .15;
  notes.forEach(([frequency, duration], index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(.72, time + .035);
    gain.gain.setValueAtTime(.62, time + Math.max(.04, duration - .09));
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(time);
    oscillator.stop(time + duration + .04);
    time += duration + .035;
  });
}

function addSmoke() {
  document.querySelectorAll('.candle').forEach((candle, index) => {
    if (index % 2 !== 0) return;
    const smoke = document.createElement('i');
    smoke.className = 'smoke';
    smoke.style.left = `${candle.offsetLeft - 2}px`;
    smoke.style.bottom = `${candle.offsetTop + 33}px`;
    smoke.style.animationDelay = `${Math.random() * .25}s`;
    candleHolder.appendChild(smoke);
  });
}

function makeConfetti() {
  const colors = ['#ff6f91', '#78c9d4', '#ffd86b', '#a889db', '#6fcf97'];
  for (let i = 0; i < 95; i += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 1.6}s`;
    piece.style.animationDuration = `${2.6 + Math.random() * 3.2}s`;
    piece.style.borderRadius = i % 3 === 0 ? '50%' : '1px';
    confetti.appendChild(piece);
  }
}

function stopMicrophone() {
  cancelAnimationFrame(listeningFrame);
  if (microphoneStream) microphoneStream.getTracks().forEach(track => track.stop());
  microphoneStream = null;
}

async function celebrate() {
  if (celebrated) return;
  celebrated = true;
  stopMicrophone();
  document.querySelectorAll('.flame').forEach(flame => flame.remove());
  addSmoke();
  hint.textContent = 'Make a wish ✨';
  micButton.hidden = true;
  try {
    await playBirthdaySong();
    soundButton.textContent = '♫ replay birthday song';
  } catch (error) {
    soundButton.textContent = '♫ tap for sound';
  }
  makeConfetti();
  setTimeout(() => {
    scene.classList.add('celebrating');
    celebration.setAttribute('aria-hidden', 'false');
  }, 650);
}

async function enableBlowing() {
  if (celebrated) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = audioContext || new AudioCtx();
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(microphoneStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const values = new Uint8Array(analyser.frequencyBinCount);
    micButton.textContent = 'Listening… blow now!';
    micButton.classList.add('listening');
    hint.textContent = 'Blow towards your microphone';

    const listen = () => {
      analyser.getByteFrequencyData(values);
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      loudFrames = average > 38 ? loudFrames + 1 : Math.max(0, loudFrames - 1);
      if (loudFrames > 5) celebrate();
      else listeningFrame = requestAnimationFrame(listen);
    };
    listen();
  } catch (error) {
    micButton.textContent = 'Microphone unavailable — tap the cake';
    hint.textContent = 'Tap the cake to blow out the candles';
  }
}

buildCandles();
cakeButton.addEventListener('click', celebrate);
micButton.addEventListener('click', enableBlowing);
soundButton.addEventListener('click', async () => {
  await playBirthdaySong();
  soundButton.textContent = '♫ replay birthday song';
});
