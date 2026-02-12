(() => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;
  const GRAVITY = 0.34;
  const MAX_FALL = 8.2;

  const STATE = {
    CUTSCENE: "cutscene",
    PLAY: "play",
    BOSS: "boss",
    DEAD: "dead",
    CLEAR: "clear",
  };

  const BOSS_ARENA = {
    minX: 4860,
    maxX: 5180,
  };
  const MAX_HEARTS = 3;

  const input = {
    left: false,
    right: false,
    jump: false,
    start: false,
  };

  const prevInput = {
    jump: false,
    start: false,
  };

  let gameState = STATE.CUTSCENE;
  let cutsceneTime = 0;
  let deadTimer = 0;
  let clearTimer = 0;
  let deaths = 0;
  let cameraX = 0;

  let hudMessage = "";
  let hudTimer = 0;

  let checkpointIndex = 0;
  let collectedProteinIds = new Set();
  let stage = buildStage();
  let player = createPlayer(stage.checkpoints[0].x, stage.checkpoints[0].y);
  let playerHearts = MAX_HEARTS;
  let damageInvulnTimer = 0;
  let hurtFlashTimer = 0;
  let proteinRushTimer = 0;
  let invincibleTimer = 0;
  let invincibleHitCooldown = 0;
  let impactShakeTimer = 0;
  let impactShakePower = 0;
  let hitStopTimer = 0;
  let kickCombo = 0;
  let kickComboTimer = 0;
  let kickFlashTimer = 0;
  let kickFlashPower = 0;
  let kickBurstX = 0;
  let kickBurstY = 0;
  let giantTimer = 0;
  let hammerTimer = 0;
  let gloveTimer = 0;
  let hammerSpin = 0;
  let hammerHitCooldown = 0;
  let gloveHitCooldown = 0;
  let weaponHudTimer = 0;
  let itemGuideTimer = 0;
  let hitSparks = [];
  let deathFlashTimer = 0;
  let deathShakeTimer = 0;
  let deadReason = "";
  let audioCtx = null;
  let bgmMaster = null;
  let bgmNoiseBuffer = null;
  let invincibleMusic = null;
  let invincibleMusicPrimed = false;
  let invincibleMusicFadeTimer = 0;
  let invincibleMusicFadeDuration = 0;
  let openingThemeActive = false;
  let rilaVoiceNextAt = 0;
  let robotVoiceCurve = null;
  let bgmStarted = false;
  let bgmStep = 0;
  let bgmNextTime = 0;

  const BGM_TEMPO = 146;
  const BGM_LEAD = [
    76, 79, 81, 83, 81, 79, 76, 74,
    72, 74, 76, 79, 76, 74, 72, 71,
    72, 74, 76, 79, 81, 79, 76, 74,
    72, 74, 71, 69, 71, 74, 72, 0,
  ];
  const BGM_BASS = [
    48, 0, 48, 0, 43, 0, 43, 0,
    45, 0, 45, 0, 41, 0, 41, 0,
    48, 0, 48, 0, 43, 0, 43, 0,
    45, 0, 45, 0, 41, 0, 41, 0,
  ];
  const BGM_NORMAL_VOL = 0.065;
  const BGM_DEAD_VOL = 0.018;
  const INVINCIBLE_BGM_VOL = 0.8;
  const INVINCIBLE_DURATION = 1200;
  const INVINCIBLE_BGM_FADE_SEC = 1.2;
  const INVINCIBLE_BGM_PATH = "assets/invincible_bgm.mp3";
  const GIANT_DURATION = 600;
  const WEAPON_DURATION = 600;
  const ITEM_GUIDE_DURATION = 720;

  function proteinLevel() {
    return collectedProteinIds.size;
  }

  function giantFactor() {
    return giantTimer > 0 ? 1.35 : 1;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function overlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function createPlayer(x, y) {
    return {
      x,
      y,
      w: 14,
      h: 24,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      anim: 0,
    };
  }

  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function buildNoiseBuffer() {
    if (!audioCtx) return null;
    const length = Math.floor(audioCtx.sampleRate * 0.08);
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      const fade = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * fade;
    }

    return buffer;
  }

  function setBgmVolume(target, fadeSec = 0.08) {
    if (!audioCtx || !bgmMaster) return;
    const now = audioCtx.currentTime;
    const safeTarget = Math.max(0.0001, target);
    const current = Math.max(0.0001, bgmMaster.gain.value);
    bgmMaster.gain.cancelScheduledValues(now);
    bgmMaster.gain.setValueAtTime(current, now);
    bgmMaster.gain.exponentialRampToValueAtTime(safeTarget, now + fadeSec);
  }

  function ensureInvincibleMusic() {
    if (invincibleMusic) return;
    invincibleMusic = new Audio(INVINCIBLE_BGM_PATH);
    invincibleMusic.loop = true;
    invincibleMusic.volume = INVINCIBLE_BGM_VOL;
    invincibleMusic.preload = "auto";
  }

  function stopInvincibleMusic() {
    if (!invincibleMusic) return;
    openingThemeActive = false;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;
    try {
      invincibleMusic.pause();
      invincibleMusic.currentTime = 0;
      invincibleMusic.volume = INVINCIBLE_BGM_VOL;
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function startInvincibleMusicFadeOut(seconds = INVINCIBLE_BGM_FADE_SEC) {
    if (!invincibleMusic || invincibleMusic.paused) {
      stopInvincibleMusic();
      return;
    }

    const frames = Math.max(1, Math.round(seconds * 60));
    invincibleMusicFadeDuration = frames;
    invincibleMusicFadeTimer = frames;
  }

  function updateInvincibleMusicFade(dt) {
    if (!invincibleMusic || invincibleMusicFadeTimer <= 0 || invincibleMusicFadeDuration <= 0) return;

    invincibleMusicFadeTimer = Math.max(0, invincibleMusicFadeTimer - dt);
    const ratio = clamp(invincibleMusicFadeTimer / invincibleMusicFadeDuration, 0, 1);

    try {
      invincibleMusic.volume = INVINCIBLE_BGM_VOL * ratio;
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }

    if (invincibleMusicFadeTimer <= 0) {
      stopInvincibleMusic();
    }
  }

  function startInvincibleMode(duration = INVINCIBLE_DURATION) {
    invincibleTimer = Math.max(invincibleTimer, duration);
    openingThemeActive = false;
    setBgmVolume(0.0001, 0.07);
    ensureInvincibleMusic();
    if (!invincibleMusic) return;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;
    try {
      invincibleMusic.volume = INVINCIBLE_BGM_VOL;
      if (invincibleMusic.paused) {
        invincibleMusic.currentTime = 0;
      }
      invincibleMusic.play().catch(() => {});
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function endInvincibleMode() {
    if (invincibleTimer > 0) return;
    startInvincibleMusicFadeOut(INVINCIBLE_BGM_FADE_SEC);
    if (gameState === STATE.PLAY || gameState === STATE.BOSS) {
      setBgmVolume(BGM_NORMAL_VOL, INVINCIBLE_BGM_FADE_SEC);
    }
  }

  function startOpeningTheme() {
    if (openingThemeActive || gameState !== STATE.CUTSCENE) return;
    if (!audioCtx || audioCtx.state !== "running") return;
    ensureInvincibleMusic();
    if (!invincibleMusic) return;

    openingThemeActive = true;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;
    setBgmVolume(0.0001, 0.16);

    try {
      invincibleMusic.volume = INVINCIBLE_BGM_VOL;
      invincibleMusic.currentTime = 0;
      const starting = invincibleMusic.play();
      if (starting && typeof starting.then === "function") {
        starting.catch(() => {
          openingThemeActive = false;
          setBgmVolume(BGM_NORMAL_VOL, 0.12);
        });
      }
    } catch (_e) {
      openingThemeActive = false;
      setBgmVolume(BGM_NORMAL_VOL, 0.12);
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function playChipNote(time, note, duration, type, level) {
    if (!audioCtx || !bgmMaster || note <= 0) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(midiToFreq(note), time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(bgmMaster);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function playChipNoise(time, level) {
    if (!audioCtx || !bgmMaster || !bgmNoiseBuffer) return;
    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    source.buffer = bgmNoiseBuffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1800, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(bgmMaster);
    source.start(time);
    source.stop(time + 0.08);
  }

  function unlockAudio() {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return;

    if (!audioCtx) {
      audioCtx = new AudioCtxClass();
      bgmMaster = audioCtx.createGain();
      bgmMaster.gain.value = BGM_NORMAL_VOL;
      bgmMaster.connect(audioCtx.destination);
      bgmNoiseBuffer = buildNoiseBuffer();
    }

    if (audioCtx.state !== "running") {
      audioCtx.resume();
    }

    if (!bgmStarted) {
      bgmStarted = true;
      bgmStep = 0;
      bgmNextTime = audioCtx.currentTime + 0.04;
    }

    ensureInvincibleMusic();
    if (invincibleMusic && !invincibleMusicPrimed) {
      invincibleMusicPrimed = true;
      try {
        if (invincibleMusic.paused) {
          invincibleMusic.muted = true;
          const priming = invincibleMusic.play();
          if (priming && typeof priming.then === "function") {
            priming.then(() => {
              invincibleMusic.pause();
              invincibleMusic.currentTime = 0;
              invincibleMusic.muted = false;
            }).catch(() => {
              invincibleMusic.muted = false;
            });
          } else {
            invincibleMusic.pause();
            invincibleMusic.currentTime = 0;
            invincibleMusic.muted = false;
          }
        }
      } catch (_e) {
        // Ignore media errors and keep gameplay responsive.
      }
    }

    if (gameState === STATE.CUTSCENE) {
      startOpeningTheme();
    }
  }

  function playDeathSfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;

    const tone = audioCtx.createOscillator();
    const toneGain = audioCtx.createGain();
    tone.type = "square";
    tone.frequency.setValueAtTime(620, now);
    tone.frequency.exponentialRampToValueAtTime(140, now + 0.42);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.11, now + 0.012);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    tone.connect(toneGain);
    toneGain.connect(audioCtx.destination);
    tone.start(now);
    tone.stop(now + 0.48);

    if (bgmNoiseBuffer) {
      const burst = audioCtx.createBufferSource();
      const burstFilter = audioCtx.createBiquadFilter();
      const burstGain = audioCtx.createGain();
      burst.buffer = bgmNoiseBuffer;
      burstFilter.type = "bandpass";
      burstFilter.frequency.setValueAtTime(640, now);
      burstFilter.Q.setValueAtTime(0.8, now);
      burstGain.gain.setValueAtTime(0.0001, now);
      burstGain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      burst.connect(burstFilter);
      burstFilter.connect(burstGain);
      burstGain.connect(audioCtx.destination);
      burst.start(now);
      burst.stop(now + 0.17);
    }
  }

  function playDamageSfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  function playPowerupSfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  function playKickSfx(power = 1) {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const tone = audioCtx.createOscillator();
    const toneGain = audioCtx.createGain();
    tone.type = "square";
    tone.frequency.setValueAtTime(250 + power * 60, now);
    tone.frequency.exponentialRampToValueAtTime(120 + power * 20, now + 0.07);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.09, now + 0.004);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    tone.connect(toneGain);
    toneGain.connect(audioCtx.destination);
    tone.start(now);
    tone.stop(now + 0.1);
  }

  function getRobotVoiceCurve() {
    if (robotVoiceCurve) return robotVoiceCurve;
    const size = 257;
    const curve = new Float32Array(size);
    for (let i = 0; i < size; i += 1) {
      const x = (i / (size - 1)) * 2 - 1;
      curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.42);
    }
    robotVoiceCurve = curve;
    return curve;
  }

  function playRilaRobotVoice(type = "kick") {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < rilaVoiceNextAt) return;

    const hurt = type === "hurt";
    const duration = hurt ? 0.22 : 0.15;
    rilaVoiceNextAt = now + (hurt ? 0.2 : 0.12);

    const sampleRate = audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    let held = 0;
    const holdStep = hurt ? 9 : 7;
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      let freq;
      if (hurt) {
        if (t < 0.05) freq = 410;
        else if (t < 0.1) freq = 340;
        else if (t < 0.16) freq = 280;
        else freq = 230;
      } else {
        if (t < 0.04) freq = 890;
        else if (t < 0.08) freq = 740;
        else if (t < 0.11) freq = 980;
        else freq = 620;
      }

      phase += freq / sampleRate;
      const sq = Math.sign(Math.sin(2 * Math.PI * phase));
      const metal = Math.sin(2 * Math.PI * phase * 1.9 + Math.sin(2 * Math.PI * t * 11) * 0.8);
      let sample = sq * 0.66 + metal * 0.34;

      const attack = hurt ? 0.02 : 0.01;
      const env = t < attack
        ? t / attack
        : Math.max(0, 1 - (t - attack) / Math.max(0.001, duration - attack));

      sample *= env;
      const quant = Math.round(sample * 10) / 10;
      if (i % holdStep === 0) held = quant;
      data[i] = held;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const crusher = audioCtx.createWaveShaper();
    crusher.curve = getRobotVoiceCurve();
    crusher.oversample = "none";

    const band = audioCtx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(hurt ? 760 : 980, now);
    band.Q.setValueAtTime(1.2, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(hurt ? 0.11 : 0.09, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(crusher);
    crusher.connect(band);
    band.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  function spawnHitSparks(x, y, colorA = "#ffeaa8", colorB = "#ff975b") {
    for (let i = 0; i < 12; i += 1) {
      const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.35;
      const spd = 1.0 + Math.random() * 2.1;
      hitSparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 0.4,
        life: 14 + Math.random() * 8,
        maxLife: 18,
        color: i % 2 === 0 ? colorA : colorB,
      });
    }
  }

  function triggerImpact(intensity, x, y, hitStop = 0) {
    impactShakeTimer = Math.max(impactShakeTimer, 7 + intensity * 3.2);
    impactShakePower = Math.max(impactShakePower, 0.5 + intensity * 0.55);
    if (hitStop > 0) {
      hitStopTimer = Math.max(hitStopTimer, hitStop);
    }
    spawnHitSparks(x, y);
  }

  function scheduleBGM() {
    if (!bgmStarted || !audioCtx || audioCtx.state !== "running") return;

    const stepDur = (60 / BGM_TEMPO) * 0.5;
    if (invincibleTimer > 0 || openingThemeActive) {
      bgmNextTime = audioCtx.currentTime + stepDur;
      return;
    }
    const lookAhead = 0.12;

    while (bgmNextTime < audioCtx.currentTime + lookAhead) {
      const idx = bgmStep % BGM_LEAD.length;
      const lead = BGM_LEAD[idx];
      const bass = BGM_BASS[idx];

      if (lead > 0) {
        playChipNote(bgmNextTime, lead, stepDur * 0.88, "square", 0.05);
      }

      if (bass > 0) {
        playChipNote(bgmNextTime, bass, stepDur * 1.55, "triangle", 0.07);
      }

      if (idx % 2 === 1) {
        playChipNoise(bgmNextTime, 0.026);
      }
      if (idx % 8 === 4) {
        playChipNoise(bgmNextTime, 0.04);
      }

      bgmStep += 1;
      bgmNextTime += stepDur;
    }
  }

  function buildStage() {
    const solids = [];
    const enemies = [];
    const proteins = [];
    const creamPuffs = [];
    const weaponItems = [];
    const staticSpikes = [];
    const popSpikes = [];
    const fallBlocks = [];
    const cannons = [];
    const breakWalls = [];

    const groundY = 160;

    const addSolid = (x, y, w, h, extra = {}) => {
      solids.push({ x, y, w, h, kind: "solid", state: "solid", timer: 0, ...extra });
    };

    const addProtein = (id, x, y) => {
      proteins.push({
        id,
        x,
        y,
        w: 10,
        h: 12,
        bob: (id * 1.37) % (Math.PI * 2),
        collected: collectedProteinIds.has(id),
      });
    };

    const addCreamPuff = (id, x, y) => {
      creamPuffs.push({
        id,
        x,
        y,
        w: 12,
        h: 10,
        bob: (id * 1.57) % (Math.PI * 2),
        collected: false,
      });
    };

    const addWeaponItem = (id, type, x, y) => {
      weaponItems.push({
        id,
        type,
        x,
        y,
        w: 12,
        h: 12,
        bob: (id * 1.91) % (Math.PI * 2),
        collected: false,
      });
    };

    const groundSegments = [
      [0, 560],
      [640, 350],
      [1060, 330],
      [1490, 370],
      [1960, 330],
      [2380, 340],
      [2830, 350],
      [3310, 350],
      [3780, 340],
      [4250, 340],
      [4700, 500],
    ];

    for (const [x, w] of groundSegments) {
      addSolid(x, groundY, w, 24);
    }

    addSolid(560, 132, 80, 10);
    addSolid(980, 120, 90, 10, { kind: "crumble", state: "solid", collapseAt: 24 });
    addSolid(1390, 126, 100, 10);
    addSolid(1860, 118, 100, 10, { kind: "crumble", state: "solid", collapseAt: 22 });
    addSolid(2290, 120, 95, 10);
    addSolid(2710, 124, 120, 10);
    addSolid(3180, 112, 125, 10, { kind: "crumble", state: "solid", collapseAt: 20 });
    addSolid(3660, 120, 120, 10);
    addSolid(4120, 112, 130, 10, { kind: "crumble", state: "solid", collapseAt: 18 });
    addSolid(4590, 118, 110, 10);

    addSolid(1220, 98, 26, 62);
    addSolid(2060, 90, 20, 70);
    addSolid(3460, 94, 26, 66);
    addSolid(4360, 88, 20, 72);

    breakWalls.push({ x: 3570, y: 96, w: 22, h: 64, hp: 3, maxHp: 3, isWall: true, hitCooldown: 0 });

    enemies.push(
      { x: 420, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.46, minX: 340, maxX: 520, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { x: 880, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.52, minX: 770, maxX: 950, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 124, hopInterval: 124 },
      { x: 1290, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.5, minX: 1130, maxX: 1360, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { x: 1760, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.58, minX: 1550, maxX: 1830, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 102, hopInterval: 102 },
      { x: 2230, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.54, minX: 2010, maxX: 2260, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { x: 2660, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.56, minX: 2410, maxX: 2690, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { x: 3070, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.63, minX: 2870, maxX: 3160, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 98, hopInterval: 98 },
      { x: 3970, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.66, minX: 3810, maxX: 4070, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { x: 4480, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.68, minX: 4310, maxX: 4560, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { kind: "peacock", x: 1620, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.44, minX: 1500, maxX: 1740, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.3, chargeCooldown: 62, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
      { kind: "peacock", x: 2940, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: 1, speed: 0.46, minX: 2820, maxX: 3090, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.4, chargeCooldown: 64, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
      { kind: "peacock", x: 4210, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.48, minX: 4100, maxX: 4350, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.5, chargeCooldown: 66, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 }
    );

    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      enemy.shooter = enemy.kind !== "peacock" && (i === 2 || i === 7);
      enemy.shootInterval = enemy.shooter ? 156 + i * 10 : 0;
      enemy.shootCooldown = enemy.shooter ? 96 + i * 10 : 0;
      enemy.flash = 0;
    }

    staticSpikes.push(
      { x: 2486, y: 146, w: 20, h: 14 },
      { x: 4060, y: 146, w: 18, h: 14 }
    );

    popSpikes.push(
      { x: 272, y: 146, w: 20, h: 14, triggerX: 250, delay: 30, armed: false, active: false, raise: 0, warningPulse: 0 },
      { x: 1108, y: 146, w: 28, h: 14, triggerX: 1080, delay: 28, armed: false, active: false, raise: 0, warningPulse: 0 },
      { x: 2010, y: 146, w: 28, h: 14, triggerX: 1980, delay: 27, armed: false, active: false, raise: 0, warningPulse: 0 },
      { x: 3010, y: 146, w: 26, h: 14, triggerX: 2980, delay: 25, armed: false, active: false, raise: 0, warningPulse: 0 },
      { x: 3950, y: 146, w: 26, h: 14, triggerX: 3920, delay: 25, armed: false, active: false, raise: 0, warningPulse: 0 },
      { x: 4448, y: 146, w: 30, h: 14, triggerX: 4410, delay: 25, armed: false, active: false, raise: 0, warningPulse: 0 }
    );

    fallBlocks.push(
      { x: 690, y: 16, w: 20, h: 38, triggerX: 640, state: "idle", vy: 0, timer: 0, warnDuration: 44 },
      { x: 1310, y: 10, w: 20, h: 44, triggerX: 1250, state: "idle", vy: 0, timer: 0, warnDuration: 42 },
      { x: 2140, y: 10, w: 24, h: 50, triggerX: 2090, state: "idle", vy: 0, timer: 0, warnDuration: 40 },
      { x: 2870, y: 6, w: 22, h: 46, triggerX: 2810, state: "idle", vy: 0, timer: 0, warnDuration: 40 },
      { x: 3720, y: 4, w: 24, h: 52, triggerX: 3660, state: "idle", vy: 0, timer: 0, warnDuration: 38 }
    );

    cannons.push(
      { x: 1840, y: 142, dir: -1, triggerX: 1760, interval: 156, cool: 62, active: false },
      { x: 2660, y: 142, dir: 1, triggerX: 2580, interval: 144, cool: 52, active: false },
      { x: 3470, y: 142, dir: -1, triggerX: 3390, interval: 132, cool: 48, active: false },
      { x: 4300, y: 142, dir: -1, triggerX: 4220, interval: 122, cool: 44, active: false }
    );

    addProtein(1, 180, 136);
    addProtein(2, 504, 136);
    addProtein(3, 606, 108);
    addProtein(4, 940, 136);
    addProtein(5, 1020, 96);
    addProtein(6, 1430, 102);
    addProtein(7, 1900, 95);
    addProtein(8, 2260, 136);
    addProtein(9, 2340, 98);
    addProtein(10, 2790, 102);
    addProtein(11, 3218, 90);
    addProtein(12, 3710, 102);
    addProtein(13, 4146, 88);
    addProtein(14, 4520, 102);
    addProtein(15, 4890, 132);
    addProtein(16, 5000, 122);
    addProtein(17, 720, 132);
    addProtein(18, 1120, 132);
    addProtein(19, 1600, 132);
    addProtein(20, 2050, 132);
    addProtein(21, 2480, 132);
    addProtein(22, 2960, 132);
    addProtein(23, 3440, 132);
    addProtein(24, 3900, 132);
    addProtein(25, 4360, 132);
    addProtein(26, 4740, 132);
    addProtein(27, 5080, 110);
    addProtein(28, 5140, 110);

    addCreamPuff(1, 760, 114);
    addCreamPuff(2, 1690, 112);
    addCreamPuff(3, 2620, 112);
    addCreamPuff(4, 3360, 102);
    addCreamPuff(5, 4180, 100);
    addCreamPuff(6, 4970, 126);
    addCreamPuff(7, 1140, 110);
    addCreamPuff(8, 2290, 108);
    addCreamPuff(9, 3010, 110);
    addCreamPuff(10, 3770, 106);
    addCreamPuff(11, 4540, 108);
    addCreamPuff(12, 5120, 120);
    addCreamPuff(13, 3460, 104);
    addCreamPuff(14, 4680, 108);

    addWeaponItem(1, "hammer", 690, 108);
    addWeaponItem(2, "glove", 1710, 106);
    addWeaponItem(3, "hammer", 2760, 108);
    addWeaponItem(4, "glove", 3620, 102);
    addWeaponItem(5, "hammer", 4380, 104);
    addWeaponItem(6, "glove", 5030, 116);
    addWeaponItem(7, "hammer", 1530, 134);
    addWeaponItem(8, "glove", 3240, 100);

    return {
      width: 5200,
      groundY,
      solids,
      enemies,
      proteins,
      creamPuffs,
      weaponItems,
      staticSpikes,
      popSpikes,
      fallBlocks,
      cannons,
      breakWalls,
      hazardBullets: [],
      bossShots: [],
      checkpoints: [
        { x: 34, y: 136, label: "START" },
        { x: 980, y: 136, label: "CP-0" },
        { x: 2200, y: 136, label: "CP-1" },
        { x: 2920, y: 136, label: "CP-1B" },
        { x: 3380, y: 136, label: "CP-2" },
        { x: 4300, y: 136, label: "CP-3" },
        { x: 4750, y: 136, label: "CP-4" },
      ],
      goal: { x: 5040, y: 112, w: 24, h: 48 },
      boss: {
        started: false,
        active: false,
        x: 5100,
        y: 124,
        w: 24,
        h: 36,
        vx: 0,
        vy: 0,
        dir: -1,
        onGround: false,
        hp: 14,
        maxHp: 14,
        mode: "idle",
        modeTimer: 0,
        shotCooldown: 56,
        attackCycle: 0,
        invuln: 0,
      },
    };
  }

  function collectSolids() {
    const list = [];

    for (const s of stage.solids) {
      if (s.kind === "crumble" && s.state === "gone") continue;
      list.push(s);
    }

    for (const wall of stage.breakWalls) {
      if (wall.hp > 0) list.push(wall);
    }

    return list;
  }

  function triggerCrumble(s) {
    if (s.kind !== "crumble") return;
    if (s.state !== "solid") return;
    s.state = "warning";
    s.timer = s.collapseAt;
  }

  function updateCrumble(dt) {
    for (const s of stage.solids) {
      if (s.kind !== "crumble") continue;
      if (s.state !== "warning") continue;
      s.timer -= dt;
      if (s.timer <= 0) {
        s.state = "gone";
      }
    }
  }

  function pointInSolids(x, y, solids) {
    for (const s of solids) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
    }
    return false;
  }

  function moveWithCollisions(entity, solids, dt, onLand) {
    entity.onGround = false;

    entity.x += entity.vx * dt;
    for (const s of solids) {
      if (!overlap(entity, s)) continue;

      if (entity.vx > 0) {
        entity.x = s.x - entity.w;
      } else if (entity.vx < 0) {
        entity.x = s.x + s.w;
      }
      entity.vx = 0;
    }

    entity.y += entity.vy * dt;
    for (const s of solids) {
      if (!overlap(entity, s)) continue;

      if (entity.vy > 0) {
        entity.y = s.y - entity.h;
        entity.vy = 0;
        entity.onGround = true;
        if (onLand) onLand(s);
      } else if (entity.vy < 0) {
        entity.y = s.y + s.h;
        entity.vy = 0;
      }
    }
  }

  function kickEnemy(enemy, dir, power = 1) {
    enemy.kicked = true;
    enemy.vx = dir * (4.3 + power * 1.55);
    enemy.vy = -(3.6 + power * 1.05);
    enemy.onGround = false;
  }

  function triggerKickBurst(x, y, power = 1) {
    const p = clamp(power, 0.8, 4.8);
    kickBurstX = x;
    kickBurstY = y;
    kickFlashTimer = Math.max(kickFlashTimer, 9 + p * 3);
    kickFlashPower = Math.max(kickFlashPower, 1 + p * 0.7);
    triggerImpact(1.65 + p * 0.55, x, y, 2.6 + p * 0.8);
    playRilaRobotVoice("kick");
    spawnHitSparks(x, y, "#fff7bc", "#ff9645");
    spawnHitSparks(x, y, "#ffe8a0", "#ff5d53");
  }

  function repositionPlayerAfterDamage() {
    if (gameState === STATE.BOSS) {
      player.x = BOSS_ARENA.minX + 26;
      player.y = 132;
      player.vx = 0;
      player.vy = -1.8;
      cameraX = clamp(BOSS_ARENA.minX - 120, 0, stage.width - W);
      return;
    }

    const cp = stage.checkpoints[checkpointIndex];
    player.x = cp.x;
    player.y = cp.y;
    player.vx = 0;
    player.vy = -1.2;
    player.onGround = false;
    cameraX = clamp(player.x - 120, 0, stage.width - W);
  }

  function killPlayer(reason) {
    if (gameState !== STATE.PLAY && gameState !== STATE.BOSS) return;
    if (invincibleTimer > 0) {
      if (invincibleHitCooldown > 0) return;
      invincibleHitCooldown = 8;
      hudMessage = "シュークリーム無敵! ノーダメージ";
      hudTimer = 28;
      triggerImpact(0.9, player.x + player.w * 0.5, player.y + player.h * 0.5, 1.2);
      return;
    }

    if (damageInvulnTimer > 0) return;

    playerHearts = Math.max(0, playerHearts - 1);
    damageInvulnTimer = 84;
    hurtFlashTimer = 24;
    playDamageSfx();
    playRilaRobotVoice("hurt");
    triggerImpact(1.2, player.x + player.w * 0.5, player.y + player.h * 0.5, 1.8);

    if (playerHearts > 0) {
      repositionPlayerAfterDamage();
      hudMessage = `${reason} -1ハート`;
      hudTimer = 80;
      return;
    }

    gameState = STATE.DEAD;
    deadTimer = 85;
    deathFlashTimer = 26;
    deathShakeTimer = 22;
    deadReason = reason;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    stopInvincibleMusic();
    proteinRushTimer = 0;
    kickCombo = 0;
    kickComboTimer = 0;
    damageInvulnTimer = 0;
    hurtFlashTimer = 0;
    kickFlashTimer = 0;
    kickFlashPower = 0;
    giantTimer = 0;
    hammerTimer = 0;
    gloveTimer = 0;
    hammerSpin = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    deaths += 1;
    hudMessage = reason;
    hudTimer = 80;
    setBgmVolume(BGM_DEAD_VOL, 0.05);
    playDeathSfx();
  }

  function startGameplay(resetDeaths) {
    if (resetDeaths) {
      deaths = 0;
      collectedProteinIds = new Set();
      itemGuideTimer = ITEM_GUIDE_DURATION;
    } else {
      itemGuideTimer = 0;
    }
    checkpointIndex = 0;
    stage = buildStage();
    const cp = stage.checkpoints[checkpointIndex];
    player = createPlayer(cp.x, cp.y);
    cameraX = 0;
    proteinRushTimer = 0;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    playerHearts = MAX_HEARTS;
    damageInvulnTimer = 0;
    hurtFlashTimer = 0;
    impactShakeTimer = 0;
    impactShakePower = 0;
    hitStopTimer = 0;
    kickCombo = 0;
    kickComboTimer = 0;
    kickFlashTimer = 0;
    kickFlashPower = 0;
    giantTimer = 0;
    hammerTimer = 0;
    gloveTimer = 0;
    hammerSpin = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    hitSparks = [];
    deathFlashTimer = 0;
    deathShakeTimer = 0;
    deadReason = "";
    openingThemeActive = false;
    stopInvincibleMusic();
    gameState = STATE.PLAY;
    hudMessage = "りら: ホームパーティー会場へ殴り込み、彼氏を救出せよ";
    hudTimer = 170;
    setBgmVolume(BGM_NORMAL_VOL, 0.08);
  }

  function respawnFromCheckpoint() {
    stage = buildStage();
    const cp = stage.checkpoints[checkpointIndex];
    player = createPlayer(cp.x, cp.y);
    cameraX = clamp(player.x - 120, 0, stage.width - W);
    proteinRushTimer = 0;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    playerHearts = MAX_HEARTS;
    damageInvulnTimer = 0;
    hurtFlashTimer = 0;
    impactShakeTimer = 0;
    impactShakePower = 0;
    hitStopTimer = 0;
    kickCombo = 0;
    kickComboTimer = 0;
    kickFlashTimer = 0;
    kickFlashPower = 0;
    giantTimer = 0;
    hammerTimer = 0;
    gloveTimer = 0;
    hammerSpin = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    itemGuideTimer = 0;
    hitSparks = [];
    deathFlashTimer = 0;
    deathShakeTimer = 0;
    deadReason = "";
    stopInvincibleMusic();
    gameState = STATE.PLAY;
    hudMessage = `${cp.label} から再開`;
    hudTimer = 70;
    setBgmVolume(BGM_NORMAL_VOL, 0.08);
  }

  function updateCheckpoints() {
    const next = stage.checkpoints[checkpointIndex + 1];
    if (!next) return;

    if (player.x >= next.x) {
      checkpointIndex += 1;
      hudMessage = `${next.label} 到達`;
      hudTimer = 90;
    }
  }

  function updatePopSpikes(dt) {
    for (const trap of stage.popSpikes) {
      if (!trap.armed && player.x + player.w > trap.triggerX) {
        trap.armed = true;
        trap.timer = trap.delay;
        trap.warningPulse = 0;
      }

      if (trap.armed && !trap.active) {
        trap.warningPulse += dt;
        trap.timer -= dt;
        if (trap.timer <= 0) {
          trap.active = true;
        }
      }

      if (trap.active && trap.raise < 1) {
        trap.raise = Math.min(1, trap.raise + 0.1 * dt);
      }
    }
  }

  function updateFallBlocks(dt) {
    for (const block of stage.fallBlocks) {
      if (block.state === "idle" && player.x + player.w > block.triggerX) {
        block.state = "warning";
        block.timer = block.warnDuration;
      }

      if (block.state === "warning") {
        block.timer -= dt;
        if (block.timer <= 0) {
          block.state = "fall";
        }
      }

      if (block.state === "fall") {
        block.vy += 0.42 * dt;
        block.y += block.vy * dt;

        if (overlap(player, block)) {
          killPlayer("天井トラップで即死");
        }

        if (block.y > H + 70) {
          block.state = "gone";
        }
      }
    }
  }

  function updateCannons(dt) {
    for (const cannon of stage.cannons) {
      if (!cannon.active && player.x + player.w > cannon.triggerX) {
        cannon.active = true;
      }

      if (!cannon.active) continue;

      cannon.cool -= dt;
      if (cannon.cool <= 0) {
        const bx = cannon.dir < 0 ? cannon.x - 7 : cannon.x + 7;
        stage.hazardBullets.push({
          x: bx,
          y: cannon.y + 2,
          w: 7,
          h: 5,
          vx: cannon.dir * 1.7,
          kind: "cannon",
          reason: "砲台の弾に被弾",
        });
        cannon.cool = cannon.interval + Math.random() * 16;
      }
    }
  }

  function updateHazardBullets(dt, solids) {
    for (const bullet of stage.hazardBullets) {
      if (bullet.dead) continue;
      bullet.x += bullet.vx * dt;

      if (overlap(player, bullet)) {
        killPlayer(bullet.reason || "飛び道具に被弾");
      }

      if (bullet.x < -20 || bullet.x > stage.width + 20) {
        bullet.dead = true;
        continue;
      }

      for (const s of solids) {
        if (overlap(bullet, s)) {
          bullet.dead = true;
          break;
        }
      }
    }

    stage.hazardBullets = stage.hazardBullets.filter((b) => !b.dead);
  }

  function updateEnemies(dt, solids) {
    for (const enemy of stage.enemies) {
      if (!enemy.alive) continue;
      enemy.flash = Math.max(0, (enemy.flash || 0) - dt);

      if (enemy.kicked) {
        enemy.vy = Math.min(enemy.vy + GRAVITY * dt, MAX_FALL);
        enemy.vx *= Math.pow(0.97, dt);
        moveWithCollisions(enemy, solids, dt);

        if (enemy.y > H + 90 || enemy.x < -90 || enemy.x > stage.width + 90) {
          enemy.alive = false;
        }
        continue;
      }

      if (enemy.kind === "peacock") {
        enemy.chargeCooldown = Math.max(0, (enemy.chargeCooldown || 0) - dt);
        enemy.windupTimer = Math.max(0, (enemy.windupTimer || 0) - dt);
        enemy.chargeTimer = Math.max(0, (enemy.chargeTimer || 0) - dt);
        enemy.recoverTimer = Math.max(0, (enemy.recoverTimer || 0) - dt);

        const px = player.x + player.w * 0.5;
        const ex = enemy.x + enemy.w * 0.5;
        const lane = Math.abs((player.y + player.h * 0.5) - (enemy.y + enemy.h * 0.5)) < 30;
        const towardPlayer = (px - ex) * enemy.dir > 0;

        if (enemy.mode === "windup") {
          enemy.vx *= Math.pow(0.72, dt);
          if (enemy.windupTimer <= 0) {
            enemy.mode = "charge";
            enemy.chargeTimer = 26;
            enemy.flash = 12;
          }
        } else if (enemy.mode === "charge") {
          enemy.vx = enemy.dir * enemy.chargeSpeed;
          if (enemy.chargeTimer <= 0) {
            enemy.mode = "recover";
            enemy.recoverTimer = 18;
            enemy.chargeCooldown = 98;
          }
        } else if (enemy.mode === "recover") {
          enemy.vx *= Math.pow(0.78, dt);
          if (enemy.recoverTimer <= 0) {
            enemy.mode = "patrol";
          }
        } else {
          enemy.vx = enemy.speed * enemy.dir;
          if (
            enemy.onGround &&
            enemy.chargeCooldown <= 0 &&
            lane &&
            towardPlayer &&
            Math.abs(px - ex) < 170
          ) {
            enemy.mode = "windup";
            enemy.windupTimer = 24;
            enemy.vx = enemy.dir * 0.16;
            enemy.flash = 10;
          }
        }

        enemy.vy = Math.min(enemy.vy + GRAVITY * dt, MAX_FALL);
        moveWithCollisions(enemy, solids, dt);

        if (enemy.x <= enemy.minX) {
          enemy.x = enemy.minX;
          enemy.dir = 1;
          if (enemy.mode === "charge") {
            enemy.mode = "recover";
            enemy.recoverTimer = 14;
            enemy.chargeCooldown = 102;
          }
        } else if (enemy.x >= enemy.maxX) {
          enemy.x = enemy.maxX;
          enemy.dir = -1;
          if (enemy.mode === "charge") {
            enemy.mode = "recover";
            enemy.recoverTimer = 14;
            enemy.chargeCooldown = 102;
          }
        }

        if (enemy.onGround) {
          const frontX = enemy.dir > 0 ? enemy.x + enemy.w + 1 : enemy.x - 1;
          const footY = enemy.y + enemy.h + 1;
          if (!pointInSolids(frontX, footY, solids)) {
            enemy.dir *= -1;
            if (enemy.mode === "charge") {
              enemy.mode = "recover";
              enemy.recoverTimer = 14;
              enemy.chargeCooldown = 108;
            }
          }
        }
        continue;
      }

      enemy.vx = enemy.speed * enemy.dir;
      enemy.vy = Math.min(enemy.vy + GRAVITY * dt, MAX_FALL);

      if (enemy.hop && enemy.onGround) {
        enemy.hopTimer -= dt;
        if (enemy.hopTimer <= 0) {
          enemy.vy = -5.0;
          enemy.hopTimer = enemy.hopInterval;
        }
      }

      moveWithCollisions(enemy, solids, dt);

      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.dir = 1;
      } else if (enemy.x >= enemy.maxX) {
        enemy.x = enemy.maxX;
        enemy.dir = -1;
      }

      if (enemy.onGround) {
        const frontX = enemy.dir > 0 ? enemy.x + enemy.w + 1 : enemy.x - 1;
        const footY = enemy.y + enemy.h + 1;
        if (!pointInSolids(frontX, footY, solids)) {
          enemy.dir *= -1;
        }
      }

      if (enemy.shooter) {
        enemy.shootCooldown -= dt;
        const dx = (player.x + player.w * 0.5) - (enemy.x + enemy.w * 0.5);
        const inRange = Math.abs(dx) < 178 && Math.abs(player.y - enemy.y) < 52;
        const facingTarget = dx * enemy.dir > 0;

        if (enemy.shootCooldown <= 0 && inRange && facingTarget) {
          stage.hazardBullets.push({
            x: enemy.dir > 0 ? enemy.x + enemy.w + 1 : enemy.x - 6,
            y: enemy.y + 7,
            w: 6,
            h: 4,
            vx: enemy.dir * 1.55,
            kind: "enemy",
            reason: "敵の飛び道具に被弾",
          });
          enemy.shootCooldown = enemy.shootInterval + Math.random() * 36;
          enemy.flash = 8;
        }
      }
    }

    stage.enemies = stage.enemies.filter((e) => e.alive);
  }

  function updateProteins(dt) {
    for (const protein of stage.proteins) {
      protein.bob += 0.08 * dt;
      if (protein.collected) continue;

      const floatY = protein.y + Math.sin(protein.bob) * 1.7;
      const hit = { x: protein.x, y: floatY, w: protein.w, h: protein.h };

      if (!overlap(player, hit)) continue;

      protein.collected = true;
      collectedProteinIds.add(protein.id);
      const pLv = proteinLevel();
      const speedPct = Math.round(pLv * 2.2);
      proteinRushTimer = Math.min(90, proteinRushTimer + 44);
      hudMessage = `PROTEIN BOOST! SPD +${speedPct}%`;
      hudTimer = 64;
      playPowerupSfx();
      triggerImpact(0.9, protein.x + protein.w * 0.5, floatY + protein.h * 0.5, 1.4);
    }
  }

  function updateCreamPuffs(dt) {
    for (const cream of stage.creamPuffs) {
      cream.bob += 0.11 * dt;
      if (cream.collected) continue;

      const floatY = cream.y + Math.sin(cream.bob) * 1.9;
      const hit = { x: cream.x, y: floatY, w: cream.w, h: cream.h };
      if (!overlap(player, hit)) continue;

      cream.collected = true;
      const wasInvincible = invincibleTimer > 0;
      startInvincibleMode(INVINCIBLE_DURATION);
      if (wasInvincible) {
        giantTimer = Math.max(giantTimer, GIANT_DURATION);
      }
      playPowerupSfx();
      triggerImpact(1.25, cream.x + cream.w * 0.5, floatY + cream.h * 0.5, 2.2);
      hudMessage = wasInvincible
        ? "シュークリーム連続! 一定時間 巨大化"
        : "シュークリーム! 一定時間 無敵";
      hudTimer = 90;
    }
  }

  function updateWeaponItems(dt) {
    for (const item of stage.weaponItems) {
      item.bob += 0.1 * dt;
      if (item.collected) continue;

      const floatY = item.y + Math.sin(item.bob) * 1.6;
      const hit = { x: item.x, y: floatY, w: item.w, h: item.h };
      if (!overlap(player, hit)) continue;

      item.collected = true;
      playPowerupSfx();
      triggerImpact(1.15, item.x + item.w * 0.5, floatY + item.h * 0.5, 1.9);
      weaponHudTimer = WEAPON_DURATION;

      if (item.type === "hammer") {
        hammerTimer = Math.max(hammerTimer, WEAPON_DURATION);
        hudMessage = "ハンマー獲得! 10秒オート攻撃";
      } else {
        gloveTimer = Math.max(gloveTimer, WEAPON_DURATION);
        hudMessage = "グローブ獲得! 10秒百裂拳";
      }
      hudTimer = 84;
    }
  }

  function updateAutoWeapons(dt) {
    const pLv = proteinLevel();
    const gf = giantFactor();
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.5;

    if (hammerTimer > 0) {
      hammerSpin += dt * (0.78 + gf * 0.18);
      if (hammerHitCooldown <= 0) {
        hammerHitCooldown = 9;
        const radius = 24 + gf * 6;
        let hits = 0;

        for (const enemy of stage.enemies) {
          if (!enemy.alive || enemy.kicked) continue;
          const ex = enemy.x + enemy.w * 0.5;
          const ey = enemy.y + enemy.h * 0.5;
          if (Math.hypot(ex - px, ey - py) > radius) continue;
          const dir = ex >= px ? 1 : -1;
          const power = 1.7 * gf + pLv * 0.04;
          kickEnemy(enemy, dir, power);
          hits += 1;
        }

        for (const b of stage.hazardBullets) {
          const bx = b.x + b.w * 0.5;
          const by = b.y + b.h * 0.5;
          if (Math.hypot(bx - px, by - py) <= radius + 6) {
            b.dead = true;
            hits += 1;
          }
        }

        for (const bs of stage.bossShots) {
          const sx = bs.x + bs.w * 0.5;
          const sy = bs.y + bs.h * 0.5;
          if (Math.hypot(sx - px, sy - py) <= radius + 5) {
            bs.dead = true;
            hits += 1;
          }
        }

        if (stage.boss.active && stage.boss.hp > 0) {
          const boss = stage.boss;
          const bx = boss.x + boss.w * 0.5;
          const by = boss.y + boss.h * 0.5;
          if (Math.hypot(bx - px, by - py) <= radius + 9 && boss.invuln <= 0) {
            const damage = 1;
            boss.hp = Math.max(0, boss.hp - damage);
            boss.invuln = 10;
            boss.vx += (bx >= px ? 1 : -1) * (0.8 + gf * 0.24);
            boss.vy = Math.min(boss.vy, -2.4);
            hits += 1;
            if (boss.hp <= 0) {
              defeatBoss();
            }
          }
        }

        if (hits > 0) {
          if (kickComboTimer > 0) {
            kickCombo = Math.min(99, kickCombo + hits);
          } else {
            kickCombo = hits;
          }
          kickComboTimer = 54;
          triggerKickBurst(px, py - 1, 2 + gf * 0.55 + hits * 0.08);
          playKickSfx(1.65 + gf * 0.35);
        }
      }
    }

    if (gloveTimer > 0) {
      if (gloveHitCooldown <= 0) {
        gloveHitCooldown = 2.2;
        const range = 20 + gf * 6;
        const hitX = player.facing > 0 ? player.x + player.w - 1 : player.x - range;
        const hitW = range;
        const hitY = player.y + 4;
        const hitH = 16;
        const punchHit = { x: hitX, y: hitY, w: hitW, h: hitH };
        let hits = 0;

        for (const enemy of stage.enemies) {
          if (!enemy.alive || enemy.kicked) continue;
          if (!overlap(punchHit, enemy)) continue;
          const power = 1.1 * gf + pLv * 0.03;
          kickEnemy(enemy, player.facing, power);
          hits += 1;
        }

        for (const b of stage.hazardBullets) {
          if (!overlap(punchHit, b)) continue;
          b.dead = true;
          hits += 1;
        }

        for (const bs of stage.bossShots) {
          if (!overlap(punchHit, bs)) continue;
          bs.dead = true;
          hits += 1;
        }

        if (stage.boss.active && stage.boss.hp > 0 && overlap(punchHit, stage.boss)) {
          if (stage.boss.invuln <= 0) {
            stage.boss.hp = Math.max(0, stage.boss.hp - 1);
            stage.boss.invuln = 8;
            stage.boss.vx += player.facing * (0.7 + gf * 0.2);
            stage.boss.vy = Math.min(stage.boss.vy, -2.1);
            hits += 1;
            if (stage.boss.hp <= 0) {
              defeatBoss();
            }
          }
        }

        if (hits > 0) {
          if (kickComboTimer > 0) {
            kickCombo = Math.min(99, kickCombo + hits);
          } else {
            kickCombo = hits;
          }
          kickComboTimer = 46;
          const bx = player.facing > 0 ? player.x + player.w + 7 : player.x - 7;
          triggerKickBurst(bx, player.y + 11, 1.35 + gf * 0.28 + hits * 0.05);
          playKickSfx(1.28 + gf * 0.2);
        }
      }
    }
  }

  function startBossBattle() {
    if (stage.boss.started) return;

    stage.boss.started = true;
    stage.boss.active = true;
    stage.boss.hp = stage.boss.maxHp;
    stage.boss.x = 5100;
    stage.boss.y = 124;
    stage.boss.vx = 0;
    stage.boss.vy = 0;
    stage.boss.dir = -1;
    stage.boss.mode = "intro";
    stage.boss.modeTimer = 54;
    stage.boss.shotCooldown = 44;
    stage.boss.attackCycle = 0;
    stage.boss.invuln = 24;
    stage.bossShots = [];

    gameState = STATE.BOSS;
    cameraX = clamp(BOSS_ARENA.minX - 96, 0, stage.width - W);
    player.x = clamp(player.x, BOSS_ARENA.minX + 10, BOSS_ARENA.maxX - player.w - 12);
    player.vx = 0;
    player.vy = Math.min(player.vy, 0);

    triggerImpact(2.4, stage.boss.x + stage.boss.w * 0.5, stage.boss.y + stage.boss.h * 0.55, 3.4);
    playKickSfx(1.8);
    hudMessage = "白髪・白ヒゲの神が降臨! 飛び道具を見て回避しろ";
    hudTimer = 120;
  }

  function defeatBoss() {
    if (!stage.boss.active) return;
    stage.boss.active = false;
    stage.boss.mode = "down";
    stage.boss.vx = 0;
    stage.boss.vy = 0;
    stage.bossShots = [];
    hitStopTimer = Math.max(hitStopTimer, 4);
    triggerImpact(3.1, stage.boss.x + stage.boss.w * 0.5, stage.boss.y + stage.boss.h * 0.5, 4.4);
    playKickSfx(2.2);
    hudMessage = "白ヒゲの神を撃破!";
    hudTimer = 150;
    gameState = STATE.CLEAR;
    clearTimer = 0;
  }

  function updateBossShots(dt, solids) {
    for (const shot of stage.bossShots) {
      if (shot.dead) continue;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.vy += 0.1 * dt;
      shot.ttl -= dt;

      if (overlap(player, shot)) {
        killPlayer("ボス弾に被弾");
      }

      if (shot.ttl <= 0 || shot.x < BOSS_ARENA.minX - 60 || shot.x > BOSS_ARENA.maxX + 60 || shot.y > H + 30) {
        shot.dead = true;
        continue;
      }

      for (const s of solids) {
        if (overlap(shot, s)) {
          shot.dead = true;
          break;
        }
      }
    }

    stage.bossShots = stage.bossShots.filter((s) => !s.dead);
  }

  function updateBoss(dt, solids) {
    if (!stage.boss.active) return;

    const boss = stage.boss;
    boss.invuln = Math.max(0, boss.invuln - dt);
    boss.modeTimer -= dt;
    boss.shotCooldown -= dt;

    if (boss.mode === "intro") {
      boss.vx = -0.36;
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = 64;
      }
    } else if (boss.mode === "idle") {
      boss.vx += boss.dir * 0.14 * dt;
      boss.vx = clamp(boss.vx, -0.82, 0.82);

      if (boss.x < BOSS_ARENA.minX + 18) {
        boss.x = BOSS_ARENA.minX + 18;
        boss.dir = 1;
      } else if (boss.x + boss.w > BOSS_ARENA.maxX - 18) {
        boss.x = BOSS_ARENA.maxX - 18 - boss.w;
        boss.dir = -1;
      }

      if (boss.modeTimer <= 0) {
        if (boss.attackCycle % 2 === 0) {
          boss.mode = "windup";
          boss.modeTimer = 40;
          boss.vx = 0;
        } else {
          boss.mode = "shoot";
          boss.modeTimer = 48;
          boss.shotCooldown = 18;
        }
        boss.attackCycle += 1;
      }
    } else if (boss.mode === "windup") {
      boss.vx *= Math.pow(0.74, dt);
      if (boss.modeTimer <= 0) {
        boss.mode = "dash";
        boss.modeTimer = 22;
        boss.vx = boss.dir * (1.95 + (boss.maxHp - boss.hp) * 0.022);
      }
    } else if (boss.mode === "dash") {
      if (boss.x <= BOSS_ARENA.minX + 3) {
        boss.x = BOSS_ARENA.minX + 3;
        boss.dir = 1;
        boss.mode = "idle";
        boss.modeTimer = 62;
      } else if (boss.x + boss.w >= BOSS_ARENA.maxX - 3) {
        boss.x = BOSS_ARENA.maxX - 3 - boss.w;
        boss.dir = -1;
        boss.mode = "idle";
        boss.modeTimer = 62;
      } else if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = 62;
      }
    } else if (boss.mode === "shoot") {
      boss.vx *= Math.pow(0.84, dt);

      if (boss.shotCooldown <= 0) {
        const aim = player.x + player.w * 0.5 < boss.x + boss.w * 0.5 ? -1 : 1;
        const spread = (boss.attackCycle % 3) - 1;
        stage.bossShots.push({
          x: boss.x + boss.w * 0.5 - 2,
          y: boss.y + 10,
          w: 5,
          h: 5,
          vx: aim * (1.35 + Math.abs(spread) * 0.12),
          vy: -0.46 + spread * 0.2,
          ttl: 120,
        });
        boss.shotCooldown = 26;
        boss.attackCycle += 1;
      }

      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = 62;
      }
    }

    boss.vy = Math.min(boss.vy + GRAVITY * dt, MAX_FALL);
    moveWithCollisions(boss, solids, dt);
    boss.x = clamp(boss.x, BOSS_ARENA.minX + 2, BOSS_ARENA.maxX - boss.w - 2);

    if (overlap(player, boss)) {
      const dir = player.x + player.w * 0.5 < boss.x + boss.w * 0.5 ? 1 : -1;

      if (boss.mode === "dash") {
        player.vx -= dir * 2.8;
        player.vy = -4.4;
        hitStopTimer = Math.max(hitStopTimer, 2.6);
        triggerImpact(1.8, boss.x + boss.w * 0.5, boss.y + boss.h * 0.5, 2.2);
        hudMessage = "突進ヒット! 体勢を立て直せ";
        hudTimer = 34;
        return;
      }

      if (boss.invuln <= 0) {
        if (kickComboTimer > 0) {
          kickCombo = Math.min(99, kickCombo + 1);
        } else {
          kickCombo = 1;
        }
        kickComboTimer = 52;

        const pLv = proteinLevel();
        const gf = giantFactor();
        const bonus = Math.min(2.4, kickCombo * 0.18) + pLv * 0.06;
        const damage = 1 + Math.floor(pLv / 10) + (gf > 1 ? 1 : 0);

        boss.hp = Math.max(0, boss.hp - damage);
        boss.invuln = 12;
        boss.vx += dir * (1.9 + bonus * 0.45 + (gf - 1) * 0.8);
        boss.vy = -2.8;

        player.vx -= dir * (0.45 + bonus * 0.05);
        player.vy = -4.8;

        triggerKickBurst(boss.x + boss.w * 0.5, boss.y + boss.h * 0.5, 2 + bonus * 1.05 + (gf - 1) * 1.1);
        playKickSfx(2 + bonus * 0.62 + (gf - 1) * 0.5);

        hudMessage = kickCombo > 1 ? `BOSS KICK x${kickCombo}!` : "ボスに接触キック!";
        hudTimer = 36;

        if (boss.hp <= 0) {
          defeatBoss();
          return;
        }
      } else {
        player.vx -= dir * 0.42;
        player.vy = Math.min(player.vy, -1.2);
      }
    }
  }

  function updateImpactEffects(dt) {
    impactShakeTimer = Math.max(0, impactShakeTimer - dt);
    proteinRushTimer = Math.max(0, proteinRushTimer - dt);
    invincibleHitCooldown = Math.max(0, invincibleHitCooldown - dt);
    damageInvulnTimer = Math.max(0, damageInvulnTimer - dt);
    hurtFlashTimer = Math.max(0, hurtFlashTimer - dt);
    kickFlashTimer = Math.max(0, kickFlashTimer - dt);
    kickFlashPower = Math.max(0, kickFlashPower - dt * 0.24);
    giantTimer = Math.max(0, giantTimer - dt);
    hammerTimer = Math.max(0, hammerTimer - dt);
    gloveTimer = Math.max(0, gloveTimer - dt);
    hammerHitCooldown = Math.max(0, hammerHitCooldown - dt);
    gloveHitCooldown = Math.max(0, gloveHitCooldown - dt);
    weaponHudTimer = Math.max(0, weaponHudTimer - dt);
    itemGuideTimer = Math.max(0, itemGuideTimer - dt);
    if (hammerTimer <= 0) hammerSpin = 0;
    if (gloveTimer <= 0) gloveHitCooldown = 0;
    updateInvincibleMusicFade(dt);
    if (invincibleTimer > 0) {
      invincibleTimer = Math.max(0, invincibleTimer - dt);
      if (invincibleTimer <= 0) {
        endInvincibleMode();
      }
    }

    if (impactShakeTimer <= 0) {
      impactShakePower = Math.max(0, impactShakePower - dt * 0.18);
    }

    kickComboTimer = Math.max(0, kickComboTimer - dt);
    if (kickComboTimer <= 0) {
      kickCombo = 0;
    }

    for (const spark of hitSparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 0.18 * dt;
      spark.vx *= Math.pow(0.94, dt);
      spark.life -= dt;
    }

    hitSparks = hitSparks.filter((s) => s.life > 0);
  }

  function resolvePlayerEnemyKick() {
    for (const enemy of stage.enemies) {
      if (!enemy.alive) continue;
      if (enemy.kicked) continue;
      if (!overlap(player, enemy)) continue;

      const dir = player.x + player.w * 0.5 < enemy.x + enemy.w * 0.5 ? 1 : -1;
      if (kickComboTimer > 0) {
        kickCombo = Math.min(99, kickCombo + 1);
      } else {
        kickCombo = 1;
      }
      kickComboTimer = 44;

      const pLv = proteinLevel();
      const gf = giantFactor();
      const comboBonus = Math.min(2.2, kickCombo * 0.16);
      const proteinBonus = pLv * 0.07;
      const kickPower = (1 + comboBonus + proteinBonus) * gf;
      const burstPower = 1.2 + comboBonus + proteinBonus * 0.45 + (gf - 1) * 1.1;

      kickEnemy(enemy, dir, kickPower);
      player.vx += dir * (0.55 + comboBonus * 0.2);
      player.vy = Math.min(player.vy, -(2.1 + comboBonus * 0.35));

      triggerKickBurst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, burstPower);
      playKickSfx(1.35 + comboBonus * 0.56);

      hudMessage = kickCombo > 1 ? `KICK x${kickCombo}!!` : "接触キック!";
      hudTimer = 28;
    }
  }

  function resolveBreakWalls(dt) {
    for (const wall of stage.breakWalls) {
      if (wall.hp <= 0) continue;
      wall.hitCooldown = Math.max(0, (wall.hitCooldown || 0) - dt);
      if (wall.hitCooldown > 0) continue;
      if (!overlap(player, wall)) continue;

      const dir = player.x + player.w * 0.5 < wall.x + wall.w * 0.5 ? 1 : -1;
      const pLv = proteinLevel();
      const damage = pLv >= 20 ? 2 : 1;
      const gf = giantFactor();
      const totalDamage = damage + (gf > 1 ? 1 : 0);
      wall.hp = Math.max(0, wall.hp - totalDamage);
      wall.hitCooldown = 18;

      player.vx -= dir * 0.56;
      player.vy = Math.min(player.vy, -2.6);
      triggerKickBurst(wall.x + wall.w * 0.5, player.y + 12, 1.5 + totalDamage * 0.6 + (gf - 1) * 0.55);
      playKickSfx(1.55 + totalDamage * 0.32 + (gf - 1) * 0.35);

      if (wall.hp <= 0) {
        hudMessage = "壁を破壊! 先へ進め!";
        hudTimer = 90;
      } else {
        hudMessage = `壁に蹴り! 残り耐久 ${wall.hp}`;
        hudTimer = 46;
      }
    }
  }

  function resolveHazards() {
    if (player.y > H + 42) {
      killPlayer("奈落に落下");
      return;
    }

    for (const s of stage.staticSpikes) {
      if (overlap(player, s)) {
        killPlayer("固定トゲに被弾");
        return;
      }
    }

    for (const trap of stage.popSpikes) {
      const h = trap.h * trap.raise;
      if (h <= 1) continue;
      const hit = { x: trap.x, y: trap.y + trap.h - h, w: trap.w, h };
      if (overlap(player, hit)) {
        killPlayer("飛び出しトゲに被弾");
        return;
      }
    }

    for (const block of stage.fallBlocks) {
      if (block.state !== "fall") continue;
      if (overlap(player, block)) {
        killPlayer("落下ブロックで即死");
        return;
      }
    }
  }

  function resolveGoal() {
    if (!overlap(player, stage.goal)) return;
    if (!stage.boss.started) {
      startBossBattle();
    }
  }

  function sampleActions() {
    const actions = {
      jumpPressed: input.jump && !prevInput.jump,
      startPressed: input.start && !prevInput.start,
    };

    prevInput.jump = input.jump;
    prevInput.start = input.start;

    return actions;
  }

  function updatePlay(dt, actions) {
    if (hudTimer > 0) hudTimer -= dt;
    updateImpactEffects(dt);
    if (itemGuideTimer > 0 && actions.startPressed) itemGuideTimer = 0;

    if (hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - dt);
      player.anim += dt * 0.2;
      return;
    }

    const pLv = proteinLevel();
    const rush = proteinRushTimer > 0 ? 1 : 0;
    const accel = 0.42 + pLv * 0.014 + rush * 0.06;
    const maxSpeed = 2.6 + pLv * 0.042 + rush * 0.52;
    const friction = rush ? 0.84 : 0.78;
    const jumpPower = 6.7 + pLv * 0.055 + rush * 0.25;

    const solids = collectSolids();

    let move = 0;
    if (input.left) move -= 1;
    if (input.right) move += 1;

    if (move !== 0) {
      player.vx += move * accel * dt;
      player.facing = move > 0 ? 1 : -1;
    } else {
      player.vx *= Math.pow(friction, dt);
    }

    player.vx = clamp(player.vx, -maxSpeed, maxSpeed);

    if (actions.jumpPressed && player.onGround) {
      player.vy = -jumpPower;
      player.onGround = false;
    }

    player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL);
    moveWithCollisions(player, solids, dt, triggerCrumble);

    player.x = clamp(player.x, 0, stage.width - player.w);
    player.anim += dt;

    updateCrumble(dt);
    updatePopSpikes(dt);
    updateFallBlocks(dt);
    updateCannons(dt);

    const solidsAfter = collectSolids();
    updateEnemies(dt, solidsAfter);
    updateHazardBullets(dt, solidsAfter);
    updateProteins(dt);
    updateCreamPuffs(dt);
    updateWeaponItems(dt);
    updateAutoWeapons(dt);

    resolvePlayerEnemyKick();
    resolveBreakWalls(dt);
    resolveHazards();
    resolveGoal();
    updateCheckpoints();

    cameraX = clamp(player.x + player.w * 0.5 - W * 0.45, 0, stage.width - W);
  }

  function updateBossBattle(dt, actions) {
    if (hudTimer > 0) hudTimer -= dt;
    updateImpactEffects(dt);
    if (itemGuideTimer > 0 && actions.startPressed) itemGuideTimer = 0;

    if (hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - dt);
      player.anim += dt * 0.2;
      return;
    }

    const pLv = proteinLevel();
    const rush = proteinRushTimer > 0 ? 1 : 0;
    const accel = 0.42 + pLv * 0.014 + rush * 0.06;
    const maxSpeed = 2.6 + pLv * 0.042 + rush * 0.52;
    const friction = rush ? 0.84 : 0.78;
    const jumpPower = 6.7 + pLv * 0.055 + rush * 0.25;

    const solids = collectSolids();

    let move = 0;
    if (input.left) move -= 1;
    if (input.right) move += 1;

    if (move !== 0) {
      player.vx += move * accel * dt;
      player.facing = move > 0 ? 1 : -1;
    } else {
      player.vx *= Math.pow(friction, dt);
    }

    player.vx = clamp(player.vx, -maxSpeed, maxSpeed);

    if (actions.jumpPressed && player.onGround) {
      player.vy = -jumpPower;
      player.onGround = false;
    }

    player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL);
    moveWithCollisions(player, solids, dt, triggerCrumble);
    player.x = clamp(player.x, BOSS_ARENA.minX + 2, BOSS_ARENA.maxX - player.w - 2);
    player.anim += dt;

    updateProteins(dt);
    updateCreamPuffs(dt);
    updateWeaponItems(dt);
    updateBoss(dt, solids);
    updateBossShots(dt, solids);
    updateAutoWeapons(dt);
    resolveHazards();

    cameraX = clamp(player.x + player.w * 0.5 - W * 0.45, BOSS_ARENA.minX - 120, stage.width - W);
  }

  function updateCutscene(dt, actions) {
    cameraX = 0;
    cutsceneTime += dt;
    startOpeningTheme();

    if (actions.startPressed || actions.jumpPressed) {
      startGameplay(true);
      return;
    }

    if (cutsceneTime > 740) {
      startGameplay(true);
    }
  }

  function updateDead(dt, actions) {
    deadTimer -= dt;
    deathFlashTimer = Math.max(0, deathFlashTimer - dt);
    deathShakeTimer = Math.max(0, deathShakeTimer - dt);
    if (actions.startPressed || actions.jumpPressed) {
      deadTimer = 0;
    }
    if (deadTimer <= 0) {
      respawnFromCheckpoint();
    }
  }

  function updateClear(dt, actions) {
    clearTimer += dt;
    if (hudTimer > 0) hudTimer -= dt;
    if (invincibleTimer > 0) {
      invincibleTimer = Math.max(0, invincibleTimer - dt);
      if (invincibleTimer <= 0) endInvincibleMode();
    }

    if (clearTimer > 180 && (actions.startPressed || actions.jumpPressed)) {
      cutsceneTime = 0;
      cameraX = 0;
      gameState = STATE.CUTSCENE;
    }
  }

  function update(dt, actions) {
    if (gameState === STATE.CUTSCENE) {
      updateCutscene(dt, actions);
      return;
    }

    if (gameState === STATE.PLAY) {
      updatePlay(dt, actions);
      return;
    }

    if (gameState === STATE.BOSS) {
      updateBossBattle(dt, actions);
      return;
    }

    if (gameState === STATE.DEAD) {
      updateDead(dt, actions);
      return;
    }

    if (gameState === STATE.CLEAR) {
      updateClear(dt, actions);
    }
  }

  function drawSkyGradient() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#04060d");
    g.addColorStop(0.35, "#0f1a34");
    g.addColorStop(0.7, "#29446a");
    g.addColorStop(1, "#4d6d93");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const moonGlow = ctx.createRadialGradient(258, 24, 2, 258, 24, 26);
    moonGlow.addColorStop(0, "rgba(255,236,196,0.95)");
    moonGlow.addColorStop(0.25, "rgba(255,220,162,0.52)");
    moonGlow.addColorStop(1, "rgba(255,210,150,0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(230, 0, 56, 56);

    ctx.fillStyle = "#ffdca8";
    ctx.fillRect(255, 21, 6, 6);
    ctx.fillStyle = "#fff2dd";
    ctx.fillRect(257, 23, 2, 2);

    ctx.fillStyle = "rgba(184, 214, 255, 0.1)";
    ctx.fillRect(0, 82, W, 18);

    const twinkleSeed = Math.floor(player.anim * 0.6);
    for (let i = 0; i < 30; i += 1) {
      const sx = ((i * 29 + Math.floor(cameraX * 0.08)) % (W + 14)) - 7;
      const sy = 6 + ((i * 17) % 48);
      const blink = (twinkleSeed + i * 3) % 14 < 3;
      ctx.fillStyle = blink ? "#f6f9ff" : "rgba(210,225,255,0.75)";
      ctx.fillRect(Math.floor(sx), sy, 1, 1);
      if (blink && i % 5 === 0) {
        ctx.fillRect(Math.floor(sx) - 1, sy, 1, 1);
      }
    }
  }

  function drawParallax() {
    const farShift = -Math.floor(cameraX * 0.11) % 176;
    for (let block = -2; block < 5; block += 1) {
      const base = block * 176 + farShift;
      for (let i = 0; i < 12; i += 1) {
        const bw = 9 + ((i + block + 14) % 3) * 2;
        const h = 34 + ((i * 13 + block * 9 + 200) % 40);
        const bx = Math.floor(base + i * 14);
        const by = 126 - h;

        ctx.fillStyle = "#131d34";
        ctx.fillRect(bx, by, bw, h);
        ctx.fillStyle = "#1d2b48";
        ctx.fillRect(bx + 1, by + 1, bw - 2, h - 2);
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(bx + bw - 2, by + 1, 1, h - 2);

        for (let wy = by + 6; wy < 124; wy += 6) {
          const lit = (wy + i + block) % 3 !== 0;
          ctx.fillStyle = lit ? "#86dcff" : "#2a3f5f";
          ctx.fillRect(bx + 2, wy, 2, 1);
          ctx.fillStyle = lit && i % 2 === 0 ? "#ffd69b" : "#24364f";
          ctx.fillRect(bx + bw - 4, wy + 1, 2, 1);
        }

        if ((i + block) % 6 === 0) {
          ctx.fillStyle = "#2e4466";
          ctx.fillRect(bx + 2, by - 3, bw - 4, 2);
          ctx.fillStyle = "#ff4b8a";
          ctx.fillRect(bx + 4, by - 2, Math.max(1, bw - 8), 1);
        }
      }
    }

    const midShift = -Math.floor(cameraX * 0.28) % 136;
    for (let block = -2; block < 6; block += 1) {
      const base = block * 136 + midShift;
      for (let i = 0; i < 8; i += 1) {
        const bw = 12 + ((i + block + 18) % 2) * 3;
        const h = 54 + ((i * 17 + block * 11 + 200) % 40);
        const bx = Math.floor(base + i * 17);
        const by = 144 - h;

        ctx.fillStyle = "#1d2d4c";
        ctx.fillRect(bx, by, bw, h);
        ctx.fillStyle = "#304a72";
        ctx.fillRect(bx, by, bw, 3);
        ctx.fillStyle = "#142036";
        ctx.fillRect(bx + bw - 2, by + 2, 1, h - 2);

        for (let wy = by + 8; wy < 140; wy += 7) {
          ctx.fillStyle = (wy + i) % 2 === 0 ? "#79e8ff" : "#2e4865";
          ctx.fillRect(bx + 3, wy, 2, 2);
          ctx.fillStyle = (wy + i) % 3 === 0 ? "#ffc37f" : "#27405b";
          ctx.fillRect(bx + bw - 5, wy + 1, 2, 2);
        }
      }
    }

    ctx.fillStyle = "rgba(130, 160, 200, 0.15)";
    ctx.fillRect(0, 120, W, 24);

    ctx.fillStyle = "#1f2430";
    ctx.fillRect(0, 136, W, 8);
    ctx.fillStyle = "#2c3342";
    const railShift = -Math.floor(cameraX * 0.6) % 22;
    for (let x = railShift - 22; x < W + 22; x += 22) {
      ctx.fillRect(x, 144, 4, 8);
      ctx.fillStyle = "#4e5565";
      ctx.fillRect(x + 1, 144, 1, 8);
      ctx.fillStyle = "#2c3342";
    }
  }

  function drawSolid(s) {
    let body = "#434956";
    let top = "#6c7484";

    if (s.kind === "crumble") {
      body = s.state === "warning" ? "#5f4247" : "#4b505d";
      top = s.state === "warning" ? "#cc8e78" : "#7c8292";
    }

    if (s.isWall) {
      body = "#3e333a";
      top = "#8f5967";
    }

    const ox = Math.floor(s.x - cameraX);
    const oy = Math.floor(s.y);

    ctx.fillStyle = body;
    ctx.fillRect(ox, oy, s.w, s.h);

    ctx.fillStyle = top;
    ctx.fillRect(ox, oy, s.w, 3);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let x = 2; x < s.w - 1; x += 6) {
      ctx.fillRect(ox + x, oy + 4, 1, Math.max(0, s.h - 8));
    }
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(ox + 1, oy + s.h - 2, s.w - 2, 1);

    if (s.isWall) {
      ctx.fillStyle = "#2a1a18";
      const damage = s.maxHp - s.hp;
      if (damage > 0) ctx.fillRect(ox + 6, oy + 14, 8, 2);
      if (damage > 1) ctx.fillRect(ox + 4, oy + 30, 10, 2);
      if (damage > 2) ctx.fillRect(ox + 8, oy + 44, 8, 2);
    }
  }

  function drawSpikesRect(x, y, w, h, colorA, colorB) {
    const count = Math.max(1, Math.floor(w / 4));
    const span = w / count;

    for (let i = 0; i < count; i += 1) {
      const sx = x + i * span;
      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.beginPath();
      ctx.moveTo(sx, y + h);
      ctx.lineTo(sx + span * 0.5, y);
      ctx.lineTo(sx + span, y + h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawHero(x, y, facing, animFrame, scale = 1) {
    const px = Math.floor(x);
    const py = Math.floor(y);
    const step = Math.sin(animFrame * 0.28);
    const legA = Math.round(step * 1.6);
    const legB = -legA;
    const armA = -Math.round(step * 1.2);
    const armB = -armA;
    const s = clamp(scale, 1, 1.8);
    const spriteW = 14;
    const spriteH = 25;

    ctx.save();
    const drawY = Math.floor(py + spriteH - spriteH * s);
    ctx.translate(px, drawY);
    ctx.scale(s, s);
    if (facing < 0) {
      ctx.translate(spriteW, 0);
      ctx.scale(-1, 1);
    }

    const paint = (color, dx, dy, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(dx, dy, w, h);
    };

    // Hair: black bob with soft highlights and center bangs.
    paint("#08090d", 1, 0, 12, 1);
    paint("#08090d", 0, 1, 14, 8);
    paint("#0f1320", 1, 2, 12, 7);
    paint("#151a2b", 2, 3, 10, 3);
    paint("#1d2338", 3, 2, 8, 1);
    paint("#2b3348", 4, 2, 6, 1);
    paint("#0a0b10", 5, 4, 4, 4);
    paint("#07080d", 6, 5, 2, 4);
    paint("#0d111d", 0, 7, 2, 3);
    paint("#0d111d", 12, 7, 2, 3);
    paint("#101626", 1, 9, 3, 2);
    paint("#101626", 10, 9, 3, 2);

    // Face: pale skin + brown eyes.
    paint("#f7e8df", 4, 6, 6, 6);
    paint("#ecd5c9", 4, 11, 6, 1);
    paint("#fdf6f0", 5, 7, 2, 1);
    paint("#fdf6f0", 8, 7, 2, 1);
    paint("#6f4838", 5, 7, 1, 1);
    paint("#6f4838", 8, 7, 1, 1);
    paint("#2a1c1d", 5, 6, 2, 1);
    paint("#2a1c1d", 8, 6, 2, 1);
    paint("#f0d0c1", 7, 8, 1, 1);
    paint("#c79189", 6, 10, 2, 1);

    // Neck + rider jacket + white inner shirt.
    paint("#f3ddd1", 6, 12, 2, 1);
    paint("#11151f", 1, 12, 12, 8);
    paint("#1b2230", 2, 12, 10, 7);
    paint("#0d1019", 3, 13, 3, 4);
    paint("#0d1019", 8, 13, 3, 4);
    paint("#2b3447", 3, 13, 2, 2);
    paint("#2b3447", 9, 13, 2, 2);
    paint("#f5f2ef", 5, 14, 4, 5);
    paint("#e8dfd9", 5, 18, 4, 1);
    paint("#bfc8d9", 9, 14, 1, 5);
    paint("#8e99ad", 4, 19, 6, 1);

    // Arms (jacket sleeves).
    paint("#0e121d", 0, 13 + armA, 2, 6);
    paint("#2b3447", 1, 14 + armA, 1, 3);
    paint("#f4e0d3", 0, 19 + armA, 2, 1);
    paint("#0e121d", 12, 13 + armB, 2, 6);
    paint("#2b3447", 12, 14 + armB, 1, 3);
    paint("#f4e0d3", 12, 19 + armB, 2, 1);

    // Legs and boots.
    paint("#24345a", 3, 20, 4, 3 + legA);
    paint("#324975", 4, 20, 2, 2);
    paint("#24345a", 7, 20, 4, 3 + legB);
    paint("#324975", 8, 20, 2, 2);
    paint("#161118", 3, 23 + legA, 4, 1);
    paint("#161118", 7, 23 + legB, 4, 1);
    paint("#2b1f27", 3, 24 + legA, 4, 1);
    paint("#2b1f27", 7, 24 + legB, 4, 1);

    ctx.restore();
  }

  function drawBoyfriend(x, y) {
    const px = Math.floor(x - cameraX);
    const py = Math.floor(y);
    const paint = (color, dx, dy, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(px + dx, py + dy, w, h);
    };

    paint("#11141d", 1, 0, 10, 1);
    paint("#d63a3a", 2, 1, 8, 3);
    paint("#aa2323", 2, 3, 9, 1);
    paint("#7f1919", 8, 2, 3, 3);
    paint("#1a1f2a", 3, 4, 8, 6);
    paint("#0d1118", 4, 4, 6, 3);
    paint("#222a39", 5, 7, 4, 1);
    paint("#3b5e89", 3, 10, 8, 8);
    paint("#597aa8", 4, 11, 6, 3);
    paint("#29354a", 3, 18, 3, 5);
    paint("#29354a", 8, 18, 3, 5);
    paint("#17181d", 3, 23, 3, 1);
    paint("#17181d", 8, 23, 3, 1);
  }

  function drawEnemy(enemy) {
    if (enemy.kind === "peacock") {
      const x = Math.floor(enemy.x - cameraX);
      const y = Math.floor(enemy.y);
      const charge = enemy.mode === "charge";
      const windup = enemy.mode === "windup";
      const dir = enemy.dir;

      const bodyMain = enemy.kicked ? "#3d5f73" : charge ? "#1f7dc4" : "#2a8eb0";
      const bodyShade = enemy.kicked ? "#2b4352" : "#206f89";
      const tailMain = charge ? "#1c6fa8" : "#267fa4";
      const tailEye = charge ? "#89f3ff" : "#57d5e4";
      const tailGlow = windup ? "#ffd994" : "#9cc9e8";

      ctx.fillStyle = "#10161f";
      ctx.fillRect(x + 4, y + 5, 8, 9);

      const tailX = dir > 0 ? x - 3 : x + 11;
      ctx.fillStyle = tailMain;
      ctx.fillRect(tailX, y + 4, 5, 10);
      ctx.fillStyle = "#1f4f73";
      ctx.fillRect(tailX + 1, y + 5, 3, 8);
      ctx.fillStyle = tailEye;
      ctx.fillRect(tailX + 2, y + 7, 1, 2);
      ctx.fillStyle = tailGlow;
      ctx.fillRect(tailX + 1, y + 11, 3, 1);

      ctx.fillStyle = bodyMain;
      ctx.fillRect(x + 4, y + 8, 8, 6);
      ctx.fillStyle = bodyShade;
      ctx.fillRect(x + 5, y + 10, 6, 3);
      ctx.fillStyle = "#2cc08f";
      ctx.fillRect(x + 7, y + 6, 3, 4);

      ctx.fillStyle = "#0f1520";
      ctx.fillRect(x + 8, y + 4, 3, 3);
      ctx.fillStyle = "#d7ecff";
      ctx.fillRect(x + 9, y + 5, 1, 1);

      ctx.fillStyle = "#f0c769";
      if (dir > 0) {
        ctx.fillRect(x + 11, y + 5, 3, 2);
      } else {
        ctx.fillRect(x + 5, y + 5, 3, 2);
      }

      ctx.fillStyle = "#3d2d22";
      ctx.fillRect(x + 6, y + 14, 1, 3);
      ctx.fillRect(x + 9, y + 14, 1, 3);
      ctx.fillStyle = "#231812";
      ctx.fillRect(x + 6, y + 17, 2, 1);
      ctx.fillRect(x + 8, y + 17, 2, 1);

      if (charge) {
        const fx = dir > 0 ? x + 13 : x - 4;
        ctx.fillStyle = "rgba(190,240,255,0.45)";
        ctx.fillRect(fx, y + 9, 4, 2);
        ctx.fillStyle = "rgba(120,195,245,0.55)";
        ctx.fillRect(fx + (dir > 0 ? -4 : 4), y + 9, 3, 1);
      }
      return;
    }

    const x = Math.floor(enemy.x - cameraX);
    const y = Math.floor(enemy.y);
    const coat = enemy.kicked ? "#533948" : "#3b2737";
    const coatHi = enemy.kicked ? "#6a4c5d" : "#58405a";

    ctx.fillStyle = "#111217";
    ctx.fillRect(x + 2, y, 10, 1);
    ctx.fillRect(x + 1, y + 1, 12, 8);
    ctx.fillRect(x + 2, y + 9, 10, 8);

    ctx.fillStyle = enemy.kicked ? "#68303a" : "#4f212b";
    ctx.fillRect(x + 3, y + 1, 8, 3);
    ctx.fillStyle = "#f0c2a4";
    ctx.fillRect(x + 4, y + 4, 6, 4);
    ctx.fillStyle = "#2b303e";
    ctx.fillRect(x + 5, y + 5, 1, 1);
    ctx.fillRect(x + 8, y + 5, 1, 1);
    ctx.fillStyle = "#101421";
    ctx.fillRect(x + 4, y + 8, 6, 1);

    ctx.fillStyle = coat;
    ctx.fillRect(x + 2, y + 9, 10, 6);
    ctx.fillStyle = coatHi;
    ctx.fillRect(x + 3, y + 10, 8, 2);
    ctx.fillStyle = "#7988a5";
    ctx.fillRect(x + 6, y + 10, 1, 5);
    ctx.fillStyle = "#1e2535";
    ctx.fillRect(x + 1, y + 10, 2, 3);
    ctx.fillRect(x + 11, y + 10, 2, 3);

    ctx.fillStyle = "#2a3144";
    ctx.fillRect(x + 3, y + 15, 3, 2);
    ctx.fillRect(x + 8, y + 15, 3, 2);
    ctx.fillStyle = "#171822";
    ctx.fillRect(x + 3, y + 17, 3, 1);
    ctx.fillRect(x + 8, y + 17, 3, 1);

    if (enemy.flash > 0) {
      const mx = enemy.dir > 0 ? x + 13 : x - 2;
      ctx.fillStyle = "#ffe7a2";
      ctx.fillRect(mx, y + 7, 2, 1);
      ctx.fillStyle = "#ff9053";
      ctx.fillRect(mx + (enemy.dir > 0 ? 1 : -1), y + 7, 1, 1);
    }
  }

  function drawBoss() {
    if (!stage.boss.active) return;
    const b = stage.boss;
    const x = Math.floor(b.x - cameraX);
    const y = Math.floor(b.y);
    const warn = b.mode === "windup" || b.mode === "dash";
    const rage = b.hp <= Math.ceil(b.maxHp * 0.35);

    ctx.fillStyle = "#11131a";
    ctx.fillRect(x + 1, y, 22, 1);
    ctx.fillRect(x, y + 1, 24, 35);

    ctx.fillStyle = rage ? "#f3cc74" : "#e7dfb5";
    ctx.fillRect(x + 8, y - 3, 8, 2);
    ctx.fillStyle = "rgba(255, 231, 177, 0.45)";
    ctx.fillRect(x + 7, y - 2, 10, 1);

    ctx.fillStyle = warn ? "#f4f9ff" : "#eaf0fb";
    ctx.fillRect(x + 4, y + 1, 16, 6);
    ctx.fillStyle = "#d7e0f2";
    ctx.fillRect(x + 5, y + 2, 14, 3);
    ctx.fillStyle = "#c2cce2";
    ctx.fillRect(x + 6, y + 6, 12, 2);

    ctx.fillStyle = "#efd7c3";
    ctx.fillRect(x + 7, y + 8, 10, 6);
    ctx.fillStyle = "#d2b29a";
    ctx.fillRect(x + 8, y + 13, 8, 1);
    ctx.fillStyle = warn || rage ? "#ffd6a6" : "#b6e1ff";
    ctx.fillRect(x + 9, y + 10, 2, 1);
    ctx.fillRect(x + 13, y + 10, 2, 1);

    ctx.fillStyle = "#f1f5ff";
    ctx.fillRect(x + 8, y + 13, 8, 5);
    ctx.fillStyle = "#d9e2f3";
    ctx.fillRect(x + 9, y + 14, 6, 3);
    ctx.fillStyle = "#f8fbff";
    ctx.fillRect(x + 10, y + 17, 4, 2);

    ctx.fillStyle = warn ? "#c4ccd9" : "#b6c0d0";
    ctx.fillRect(x + 3, y + 18, 18, 11);
    ctx.fillStyle = "#d4dbe8";
    ctx.fillRect(x + 4, y + 19, 16, 4);
    ctx.fillStyle = "#8fa0ba";
    ctx.fillRect(x + 11, y + 19, 2, 10);
    ctx.fillStyle = "#7f90aa";
    ctx.fillRect(x + 1, y + 20, 2, 7);
    ctx.fillRect(x + 21, y + 20, 2, 7);

    ctx.fillStyle = "#2d3951";
    ctx.fillRect(x + 4, y + 29, 6, 6);
    ctx.fillRect(x + 14, y + 29, 6, 6);
    ctx.fillStyle = "#465777";
    ctx.fillRect(x + 5, y + 30, 4, 2);
    ctx.fillRect(x + 15, y + 30, 4, 2);
    ctx.fillStyle = "#171b25";
    ctx.fillRect(x + 4, y + 35, 6, 1);
    ctx.fillRect(x + 14, y + 35, 6, 1);

    if (b.mode === "shoot" || warn) {
      ctx.fillStyle = "#d1b36b";
      ctx.fillRect(x + 19, y + 11, 2, 14);
      ctx.fillStyle = "#f3e7bb";
      ctx.fillRect(x + 18, y + 10, 4, 2);
      ctx.fillStyle = "rgba(190, 228, 255, 0.45)";
      ctx.fillRect(x + 17, y + 9, 6, 1);
    }

    if (warn) {
      ctx.strokeStyle = "rgba(255,220,165,0.9)";
      ctx.strokeRect(x - 1, y - 2, b.w + 2, b.h + 3);
      ctx.fillStyle = "rgba(255,236,188,0.16)";
      ctx.fillRect(x + 2, y + 1, b.w - 4, b.h - 2);
    }
  }

  function drawProtein(protein) {
    if (protein.collected) return;
    const x = Math.floor(protein.x - cameraX);
    const y = Math.floor(protein.y + Math.sin(protein.bob) * 1.7);

    ctx.fillStyle = "#212531";
    ctx.fillRect(x + 0, y + 0, 10, 12);
    ctx.fillStyle = "#f2f2f7";
    ctx.fillRect(x + 1, y + 1, 8, 10);
    ctx.fillStyle = "#d03a46";
    ctx.fillRect(x + 2, y + 2, 6, 3);
    ctx.fillStyle = "#f7cf88";
    ctx.fillRect(x + 4, y + 3, 2, 1);
    ctx.fillStyle = "#3a4c77";
    ctx.fillRect(x + 2, y + 6, 6, 3);
    ctx.fillStyle = "#b9c2d8";
    ctx.fillRect(x + 3, y + 0, 4, 1);
    ctx.fillStyle = "#7f8baa";
    ctx.fillRect(x + 2, y + 9, 6, 1);
  }

  function drawCreamPuff(cream) {
    if (cream.collected) return;
    const x = Math.floor(cream.x - cameraX);
    const y = Math.floor(cream.y + Math.sin(cream.bob) * 1.9);

    ctx.fillStyle = "#412f24";
    ctx.fillRect(x + 0, y + 2, 12, 7);
    ctx.fillStyle = "#d09a5f";
    ctx.fillRect(x + 1, y + 2, 10, 2);
    ctx.fillStyle = "#f2c98f";
    ctx.fillRect(x + 1, y + 4, 10, 2);
    ctx.fillStyle = "#f8f3e8";
    ctx.fillRect(x + 2, y + 5, 8, 2);
    ctx.fillStyle = "#efdfc8";
    ctx.fillRect(x + 3, y + 4, 6, 1);
    ctx.fillStyle = "#a66e3f";
    ctx.fillRect(x + 1, y + 8, 10, 1);
    ctx.fillStyle = "#fff6e6";
    ctx.fillRect(x + 5, y + 6, 2, 1);
  }

  function drawWeaponItem(item) {
    if (item.collected) return;
    const x = Math.floor(item.x - cameraX);
    const y = Math.floor(item.y + Math.sin(item.bob) * 1.6);

    ctx.fillStyle = "#1a1722";
    ctx.fillRect(x, y, 12, 12);
    ctx.fillStyle = "#31364a";
    ctx.fillRect(x + 1, y + 1, 10, 10);

    if (item.type === "hammer") {
      ctx.fillStyle = "#b8c4dd";
      ctx.fillRect(x + 2, y + 2, 7, 3);
      ctx.fillStyle = "#8493ae";
      ctx.fillRect(x + 3, y + 3, 5, 1);
      ctx.fillStyle = "#5a3b26";
      ctx.fillRect(x + 5, y + 4, 2, 6);
      ctx.fillStyle = "#3d2718";
      ctx.fillRect(x + 5, y + 9, 2, 2);
    } else {
      ctx.fillStyle = "#ffd7d7";
      ctx.fillRect(x + 3, y + 3, 6, 5);
      ctx.fillRect(x + 8, y + 4, 2, 3);
      ctx.fillStyle = "#efb7b7";
      ctx.fillRect(x + 4, y + 4, 4, 3);
      ctx.fillStyle = "#8d5f5f";
      ctx.fillRect(x + 3, y + 8, 3, 2);
    }
  }

  function drawHitSparks() {
    for (const spark of hitSparks) {
      const lifeRatio = clamp(spark.life / spark.maxLife, 0, 1);
      const size = lifeRatio > 0.6 ? 2 : 1;
      ctx.fillStyle = spark.color;
      ctx.fillRect(
        Math.floor(spark.x - cameraX),
        Math.floor(spark.y),
        size,
        size
      );
    }
  }

  function drawRushAura() {
    if (proteinRushTimer <= 0 && invincibleTimer <= 0 && giantTimer <= 0) return;
    const r = clamp(proteinRushTimer / 90, 0, 1);
    const i = clamp(invincibleTimer / INVINCIBLE_DURATION, 0, 1);
    const g = clamp(giantTimer / GIANT_DURATION, 0, 1);
    const px = Math.floor(player.x - cameraX);
    const py = Math.floor(player.y);
    const pulse = 0.25 + Math.sin(player.anim * 0.45) * 0.12;

    if (r > 0) {
      ctx.fillStyle = `rgba(110, 230, 255, ${pulse * r})`;
      ctx.fillRect(px - 3, py - 2, player.w + 6, player.h + 4);
      ctx.fillStyle = `rgba(255, 219, 132, ${0.16 * r})`;
      ctx.fillRect(px - 1, py - 1, player.w + 2, player.h + 2);
    }

    if (i > 0) {
      const sparkPulse = 0.2 + Math.sin(player.anim * 0.7) * 0.08;
      ctx.fillStyle = `rgba(255, 245, 150, ${sparkPulse * i})`;
      ctx.fillRect(px - 5, py - 4, player.w + 10, player.h + 8);
      ctx.strokeStyle = `rgba(255, 255, 210, ${0.32 * i})`;
      ctx.strokeRect(px - 4, py - 3, player.w + 8, player.h + 6);
    }

    if (g > 0) {
      const giantPulse = 0.16 + Math.sin(player.anim * 0.38) * 0.06;
      ctx.fillStyle = `rgba(255, 172, 80, ${giantPulse * g})`;
      ctx.fillRect(px - 8, py - 10, player.w + 16, player.h + 16);
      ctx.strokeStyle = `rgba(255, 217, 160, ${0.4 * g})`;
      ctx.strokeRect(px - 7, py - 9, player.w + 14, player.h + 14);
    }
  }

  function drawAutoWeaponEffects() {
    if (hammerTimer <= 0 && gloveTimer <= 0) return;

    const cx = Math.floor(player.x - cameraX + player.w * 0.5);
    const cy = Math.floor(player.y + 11);
    const gf = giantFactor();

    if (hammerTimer > 0) {
      const radius = 9 + gf * 4;
      const hx = Math.floor(cx + Math.cos(hammerSpin * 0.4) * radius);
      const hy = Math.floor(cy + Math.sin(hammerSpin * 0.4) * (radius - 2));
      ctx.fillStyle = "#c8d3ea";
      ctx.fillRect(hx - 3, hy - 2, 6, 3);
      ctx.fillStyle = "#98a8c4";
      ctx.fillRect(hx - 2, hy - 1, 4, 1);
      ctx.fillStyle = "#6b4a32";
      ctx.fillRect(hx - 1, hy + 1, 2, 5);
      ctx.fillStyle = "rgba(255, 225, 170, 0.35)";
      ctx.strokeRect(hx - 5, hy - 4, 10, 9);
    }

    if (gloveTimer > 0) {
      const dir = player.facing;
      const gx = dir > 0 ? cx + 8 : cx - 18;
      const gy = cy - 1;
      const pulse = Math.sin(player.anim * 1.2) * 1.6;
      ctx.fillStyle = "#ffd6d6";
      ctx.fillRect(Math.floor(gx + pulse * dir), gy - 1, 8, 4);
      ctx.fillStyle = "#f4bcbc";
      ctx.fillRect(Math.floor(gx + 2 + pulse * dir), gy, 5, 2);
      ctx.fillStyle = "rgba(255, 235, 180, 0.25)";
      for (let i = 0; i < 3; i += 1) {
        const tx = Math.floor(gx + pulse * dir - dir * i * 4);
        ctx.fillRect(tx, gy + i - 1, 3, 1);
      }
    }
  }

  function drawCannon(c) {
    const x = Math.floor(c.x - cameraX);
    const y = Math.floor(c.y);

    ctx.fillStyle = "#20242f";
    ctx.fillRect(x - 6, y - 4, 14, 11);
    ctx.fillStyle = "#3f4c62";
    ctx.fillRect(x - 5, y - 3, 12, 8);
    ctx.fillStyle = "#667388";
    ctx.fillRect(x - 4, y - 2, 10, 2);

    ctx.fillStyle = "#4e596d";
    if (c.dir < 0) {
      ctx.fillRect(x - 10, y - 1, 6, 5);
      ctx.fillStyle = "#7b889e";
      ctx.fillRect(x - 10, y + 1, 2, 1);
    } else {
      ctx.fillRect(x + 7, y - 1, 6, 5);
      ctx.fillStyle = "#7b889e";
      ctx.fillRect(x + 11, y + 1, 2, 1);
    }

    ctx.fillStyle = "#6e7d92";
    ctx.fillRect(x - 3, y + 6, 8, 2);
  }

  function drawFallingBlock(block) {
    if (block.state === "gone") return;
    const x = Math.floor(block.x - cameraX);
    const y = Math.floor(block.y);

    const warn = block.state === "warning" && Math.floor(block.timer / 2) % 2 === 0;
    ctx.fillStyle = warn ? "#7d3f45" : "#3d2d29";
    ctx.fillRect(x, y, block.w, block.h);
    ctx.fillStyle = warn ? "#f0b3a0" : "#7e5a4e";
    ctx.fillRect(x, y, block.w, 3);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x + 1, y + block.h - 2, block.w - 2, 1);
    if (warn) {
      ctx.fillStyle = "rgba(255,210,170,0.55)";
      for (let ix = 2; ix < block.w - 1; ix += 6) {
        ctx.fillRect(x + ix, y + 5, 2, 1);
      }
    }

    if (block.state === "warning") {
      ctx.fillStyle = "rgba(255, 120, 120, 0.35)";
      ctx.fillRect(x - 2, stage.groundY - 3, block.w + 4, 3);
    }
  }

  function drawGoal() {
    const g = stage.goal;
    const x = Math.floor(g.x - cameraX);
    const y = Math.floor(g.y);

    ctx.fillStyle = "#1f1f25";
    ctx.fillRect(x, y, g.w, g.h);

    ctx.fillStyle = "#5d606b";
    for (let i = 2; i < g.w - 2; i += 4) {
      ctx.fillRect(x + i, y + 2, 1, g.h - 4);
    }

    ctx.fillStyle = "#6b4f2f";
    ctx.fillRect(x - 3, y + g.h - 4, g.w + 6, 4);

    drawBoyfriend(g.x + 4, g.y + 22);

    const vx = x - 24;
    ctx.fillStyle = "#2b1e22";
    ctx.fillRect(vx, y + 4, 12, 20);
    ctx.fillStyle = "#8b2c2c";
    ctx.fillRect(vx + 2, y + 2, 8, 3);

    if (stage.boss.active) {
      ctx.fillStyle = "rgba(180,20,20,0.45)";
      ctx.fillRect(x - 4, y - 2, g.w + 8, g.h + 4);
      ctx.fillStyle = "#ffd0d0";
      ctx.font = "8px monospace";
      ctx.fillText("LOCK", x - 2, y - 10);
    }
  }

  function drawWorld() {
    drawSkyGradient();
    drawParallax();

    ctx.save();

    for (const s of stage.solids) {
      if (s.kind === "crumble" && s.state === "gone") continue;
      drawSolid(s);
    }

    for (const wall of stage.breakWalls) {
      if (wall.hp <= 0) continue;
      drawSolid(wall);
    }

    for (const s of stage.staticSpikes) {
      drawSpikesRect(s.x, s.y, s.w, s.h, "#b9cad4", "#d7e6f0");
    }

    for (const trap of stage.popSpikes) {
      if (!trap.active && trap.raise <= 0.05) {
        if (trap.armed) {
          const blink = Math.floor(trap.warningPulse / 2) % 2 === 0;
          ctx.fillStyle = blink ? "#e1b458" : "#734f2f";
          ctx.fillRect(Math.floor(trap.x), Math.floor(trap.y + trap.h - 3), trap.w, 3);
        } else {
          ctx.fillStyle = "#57473e";
          ctx.fillRect(Math.floor(trap.x), Math.floor(trap.y + trap.h - 2), trap.w, 2);
        }
        continue;
      }
      const h = trap.h * trap.raise;
      drawSpikesRect(trap.x, trap.y + trap.h - h, trap.w, h, "#d05b5b", "#f1b7b7");
    }

    for (const block of stage.fallBlocks) {
      drawFallingBlock(block);
    }

    for (const cannon of stage.cannons) {
      drawCannon(cannon);
    }

    for (const protein of stage.proteins) {
      drawProtein(protein);
    }

    for (const cream of stage.creamPuffs) {
      drawCreamPuff(cream);
    }

    for (const item of stage.weaponItems) {
      drawWeaponItem(item);
    }

    for (const e of stage.enemies) {
      drawEnemy(e);
    }

    for (const bs of stage.bossShots) {
      if (bs.dead) continue;
      ctx.fillStyle = "#ff8d6a";
      ctx.fillRect(Math.floor(bs.x - cameraX), Math.floor(bs.y), bs.w, bs.h);
      ctx.fillStyle = "#ffd6a8";
      ctx.fillRect(Math.floor(bs.x - cameraX + 1), Math.floor(bs.y + 1), bs.w - 2, bs.h - 2);
    }

    for (const b of stage.hazardBullets) {
      if (b.dead) continue;
      const enemyShot = b.kind === "enemy";
      ctx.fillStyle = enemyShot ? "#d4c2ff" : "#ffcb67";
      ctx.fillRect(Math.floor(b.x - cameraX), Math.floor(b.y), b.w, b.h);
      ctx.fillStyle = enemyShot ? "#9f7dff" : "#ffa934";
      ctx.fillRect(Math.floor(b.x - cameraX + 1), Math.floor(b.y + 1), b.w - 2, b.h - 2);
    }

    drawHitSparks();
    drawBoss();
    drawGoal();
    drawRushAura();
    drawAutoWeaponEffects();
    const hurtBlink = damageInvulnTimer > 0 && Math.floor(damageInvulnTimer / 3) % 2 === 0;
    if (!hurtBlink) {
      drawHero(player.x - cameraX, player.y, player.facing, player.anim, giantTimer > 0 ? 1.55 : 1);
    }

    ctx.restore();
  }

  function drawTextPanel(lines, y = 136) {
    ctx.fillStyle = "rgba(10,10,14,0.78)";
    ctx.fillRect(6, y, 308, 38);
    ctx.strokeStyle = "#bca8d2";
    ctx.lineWidth = 1;
    ctx.strokeRect(6, y, 308, 38);

    ctx.fillStyle = "#f3ecff";
    ctx.font = "10px monospace";
    ctx.textBaseline = "top";

    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], 12, y + 6 + i * 12);
    }
  }

  function drawHeartIcon(x, y, filled) {
    const px = Math.floor(x);
    const py = Math.floor(y);

    ctx.fillStyle = filled ? "#d63f66" : "#5c4651";
    ctx.fillRect(px + 1, py + 0, 2, 2);
    ctx.fillRect(px + 4, py + 0, 2, 2);
    ctx.fillRect(px + 0, py + 1, 7, 3);
    ctx.fillRect(px + 1, py + 4, 5, 2);
    ctx.fillRect(px + 2, py + 6, 3, 1);

    if (filled) {
      ctx.fillStyle = "#ff7a98";
      ctx.fillRect(px + 2, py + 1, 1, 1);
      ctx.fillRect(px + 5, py + 1, 1, 1);
    }
  }

  function drawCutscene() {
    const t = cutsceneTime;

    ctx.fillStyle = "#110f17";
    ctx.fillRect(0, 0, W, H);

    if (t < 220) {
      ctx.fillStyle = "#12182a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#25365b";
      for (let i = 0; i < W; i += 14) {
        const h = 34 + ((i / 14) % 5) * 10;
        ctx.fillRect(i, 132 - h, 10, h);
        if ((i / 14) % 2 === 0) {
          ctx.fillStyle = "#7edbff";
          ctx.fillRect(i + 3, 132 - h + 8, 2, 2);
          ctx.fillRect(i + 3, 132 - h + 16, 2, 2);
          ctx.fillStyle = "#25365b";
        }
      }
      ctx.fillStyle = "#2b313f";
      ctx.fillRect(0, 132, W, 48);
      ctx.fillStyle = "#424d60";
      for (let i = 0; i < W; i += 20) ctx.fillRect(i, 140, 10, 1);

      drawHero(90, 112, 1, t);
      drawBoyfriend(116, 110);

      drawTextPanel([
        "りら: 私はAI。普段はジムのインストラクターなリア充。",
        "シュークリームで元気回復、プロテインはバニラ派!",
      ]);
    } else if (t < 460) {
      const k = clamp((t - 220) / 240, 0, 1);
      const kidnapX = 120 + k * 110;

      ctx.fillStyle = "#161b2f";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2a3a66";
      for (let i = 0; i < W; i += 18) {
        const h = 40 + ((i / 18) % 4) * 12;
        ctx.fillRect(i, 126 - h, 12, h);
        ctx.fillStyle = "#ff6e98";
        if ((i / 18) % 2 === 0) ctx.fillRect(i + 2, 126 - h + 10, 2, 2);
        ctx.fillStyle = "#2a3a66";
      }
      ctx.fillStyle = "#212736";
      ctx.fillRect(0, 132, W, 48);

      drawHero(84, 112, 1, t);

      ctx.fillStyle = "#2d1c21";
      ctx.fillRect(kidnapX, 100, 14, 24);
      ctx.fillStyle = "#8f2e2e";
      ctx.fillRect(kidnapX + 2, 98, 10, 3);

      ctx.fillStyle = "#d44242";
      ctx.fillRect(kidnapX + 14, 108, 8, 3);
      ctx.fillStyle = "#1a1f2a";
      ctx.fillRect(kidnapX + 16, 111, 6, 4);

      drawTextPanel([
        "悪の組織が彼氏に権利収入と不労所得を甘く勧誘。",
        "断った彼氏はホームパーティー会場へ連行された。",
      ]);
    } else {
      ctx.fillStyle = "#11182d";
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 180; i += 12) {
        ctx.fillStyle = i % 24 === 0 ? "#2c3c62" : "#1e2b49";
        ctx.fillRect(i + 6, 48 + (i % 30), 7, 94);
        ctx.fillStyle = "#7ed5ff";
        if (i % 24 === 0) ctx.fillRect(i + 9, 64 + (i % 30), 2, 2);
      }
      ctx.fillStyle = "#252c3a";
      ctx.fillRect(0, 138, W, 42);

      drawHero(76, 108, 1, t);

      const cageX = 236;
      ctx.fillStyle = "#343743";
      ctx.fillRect(cageX, 94, 26, 42);
      ctx.fillStyle = "#646b78";
      for (let i = 3; i < 23; i += 4) {
        ctx.fillRect(cageX + i, 96, 1, 38);
      }

      ctx.fillStyle = "#d44242";
      ctx.fillRect(cageX + 7, 112, 9, 3);

      drawTextPanel([
        "目的: 白髪で白ヒゲの神を倒し、闇堕ち勧誘を阻止。",
        "ホームパーティー会場で救出し、結婚EDへ。",
      ]);
    }

    ctx.fillStyle = "rgba(0,0,0,0.44)";
    ctx.fillRect(90, 8, 140, 14);
    ctx.fillStyle = "#f4f3ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("タップ / Enter でスキップ", 101, 11);
  }

  function drawHUD() {
    ctx.fillStyle = "rgba(9, 8, 12, 0.72)";
    ctx.fillRect(0, 0, W, 24);

    ctx.fillStyle = "#f7f1ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(`DEATH ${deaths}`, 6, 3);
    ctx.fillText(`PROT ${collectedProteinIds.size}/${stage.proteins.length}`, 80, 3);
    if (kickCombo > 1 && kickComboTimer > 0) {
      ctx.fillText(`CMB x${kickCombo}`, 160, 3);
    }
    if (giantTimer > 0) {
      ctx.fillText(`BIG ${Math.ceil(giantTimer / 60)}s`, 206, 3);
    } else if (hammerTimer > 0) {
      ctx.fillText(`HAM ${Math.ceil(hammerTimer / 60)}s`, 206, 3);
    } else if (gloveTimer > 0) {
      ctx.fillText(`GLV ${Math.ceil(gloveTimer / 60)}s`, 206, 3);
    }

    const isBossHud = gameState === STATE.BOSS && stage.boss.active;
    ctx.fillText("LIFE", 6, 13);
    for (let i = 0; i < MAX_HEARTS; i += 1) {
      drawHeartIcon(26 + i * 10, 14, i < playerHearts);
    }

    if (isBossHud) {
      ctx.fillText(`BOSS HP ${stage.boss.hp}/${stage.boss.maxHp}`, 58, 13);
      const barX = 132;
      const barY = 13;
      const barW = 66;
      const ratio = clamp(stage.boss.hp / stage.boss.maxHp, 0, 1);
      ctx.fillStyle = "#311719";
      ctx.fillRect(barX, barY, barW, 7);
      ctx.fillStyle = "#e25555";
      ctx.fillRect(barX + 1, barY + 1, Math.floor((barW - 2) * ratio), 5);
      ctx.fillStyle = "#f7f1ff";
    } else {
      const cp = stage.checkpoints[checkpointIndex];
      ctx.fillText(`CP ${cp.label}`, 58, 13);
    }
    ctx.fillText("PLAYER りら", 202, 13);
    const speedPct = Math.round(proteinLevel() * 2.2 + (proteinRushTimer > 0 ? 12 : 0));
    ctx.fillText(`SPD +${speedPct}%`, 254, 13);
    if (invincibleTimer > 0) {
      const sec = (invincibleTimer / 60).toFixed(1);
      ctx.fillText("BGM LOVE", 246, 3);
      ctx.fillStyle = "#ffe7a8";
      ctx.fillText(`MUTEKI ${sec}s`, 226, 13);
      ctx.fillStyle = "#f7f1ff";
    } else {
      ctx.fillText(audioCtx && bgmStarted ? "BGM ON" : "BGM TAP", 248, 3);
    }

    if (hurtFlashTimer > 0 && (gameState === STATE.PLAY || gameState === STATE.BOSS)) {
      const flash = clamp(hurtFlashTimer / 24, 0, 1);
      ctx.fillStyle = `rgba(255, 130, 130, ${0.18 * flash})`;
      ctx.fillRect(0, 24, W, H - 24);
    }

    if (hudTimer > 0 && hudMessage) {
      const y = H - 18;
      ctx.fillStyle = "rgba(10, 10, 14, 0.82)";
      ctx.fillRect(0, y, W, 18);
      ctx.fillStyle = "#f4ecff";
      ctx.fillText(hudMessage, 8, y + 5);
    }
  }

  function drawItemGuideOverlay() {
    if (itemGuideTimer <= 0) return;
    if (gameState !== STATE.PLAY && gameState !== STATE.BOSS) return;

    const fadeIn = clamp((ITEM_GUIDE_DURATION - itemGuideTimer) / 42, 0, 1);
    const fadeOut = clamp(itemGuideTimer / 46, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    if (alpha <= 0.01) return;

    ctx.fillStyle = `rgba(7, 8, 12, ${0.84 * alpha})`;
    ctx.fillRect(10, 30, 300, 86);
    ctx.strokeStyle = `rgba(208, 224, 255, ${0.85 * alpha})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 30, 300, 86);

    ctx.fillStyle = `rgba(245, 245, 255, ${alpha})`;
    ctx.font = "8px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("ITEM GUIDE (Enterで閉じる)", 16, 36);
    ctx.fillText("PROTEIN : SPD/ジャンプ/キック強化", 16, 48);
    ctx.fillText("シュークリーム : 20秒無敵", 16, 58);
    ctx.fillText("無敵中に再取得 : 巨大化", 16, 68);
    ctx.fillText("HAMMER : 10秒 周囲オート攻撃", 16, 78);
    ctx.fillText("GLOVE  : 10秒 前方百裂拳", 16, 88);
    ctx.fillStyle = `rgba(255, 231, 168, ${0.9 * alpha})`;
    ctx.fillText("目安難易度: やや難しい(慣れれば15分前後でクリア)", 16, 100);
  }

  function drawDeadOverlay() {
    const flashRatio = clamp(deathFlashTimer / 26, 0, 1);
    const blink = Math.floor(deadTimer / 5) % 2 === 0;

    ctx.fillStyle = `rgba(140, 0, 24, ${0.35 + flashRatio * 0.35})`;
    ctx.fillRect(0, 0, W, H);

    if (flashRatio > 0.04) {
      ctx.fillStyle = `rgba(255, 240, 240, ${flashRatio * 0.62})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.strokeStyle = `rgba(255, 70, 70, ${0.2 + flashRatio * 0.7})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, H);
    ctx.moveTo(W, 0);
    ctx.lineTo(0, H);
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.84)";
    ctx.fillRect(34, 44, 252, 88);
    ctx.strokeStyle = blink ? "#ff8e8e" : "#8b4e4e";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 44, 252, 88);

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(36, 46, 248, 30);
    ctx.fillStyle = blink ? "#ffe4e4" : "#d8b2b2";
    ctx.font = "18px monospace";
    ctx.fillText("YOU DIED", 100, 52);

    ctx.fillStyle = "#ffd8d8";
    ctx.font = "9px monospace";
    ctx.fillText(`原因: ${deadReason || "ダメージ"}`, 48, 84);
    ctx.fillText("チェックポイントから再開", 88, 100);
    ctx.fillText("タップ/ジャンプ/Enterで即リトライ", 62, 114);
  }

  function drawClearOverlay() {
    const t = clearTimer;
    ctx.fillStyle = "#0b1021";
    ctx.fillRect(0, 0, W, H);

    if (t < 220) {
      ctx.fillStyle = "#1b2e52";
      for (let i = 0; i < W; i += 14) {
        const h = 36 + ((i / 14) % 4) * 12;
        ctx.fillRect(i, 132 - h, 10, h);
      }
      ctx.fillStyle = "#2a3243";
      ctx.fillRect(0, 136, W, 44);
      ctx.fillStyle = "#4a556d";
      for (let i = 0; i < W; i += 18) ctx.fillRect(i, 144, 9, 1);

      drawHero(112, 108, 1, t);
      drawBoyfriend(126 + cameraX, 108);
      ctx.fillStyle = "#f4e5e8";
      ctx.fillRect(126, 112, 10, 4);
      ctx.fillRect(130, 116, 6, 3);

      drawTextPanel([
        "白ヒゲの神を撃破。りらは彼氏をお姫様抱っこで救出。",
        "闇堕ち計画を止め、ふたりは未来へ進む。",
      ]);
      return;
    }

    if (t < 480) {
      ctx.fillStyle = "#22324d";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#e7e2d6";
      ctx.fillRect(80, 38, 160, 98);
      ctx.fillStyle = "#c9bda5";
      ctx.fillRect(88, 46, 144, 82);
      ctx.fillStyle = "#a3977e";
      ctx.fillRect(150, 30, 20, 116);
      ctx.fillStyle = "#f6f2ea";
      ctx.fillRect(146, 56, 28, 26);

      const sway = Math.sin(t * 0.06) * 2;
      drawHero(132 + sway, 106, 1, t);
      ctx.fillStyle = "#f4efef";
      ctx.fillRect(152 + sway, 112, 7, 9);
      ctx.fillStyle = "#e34242";
      ctx.fillRect(153 + sway, 110, 6, 2);
      ctx.fillStyle = "#f9d575";
      ctx.fillRect(163 + sway, 105, 2, 2);

      for (let i = 0; i < 6; i += 1) {
        const hx = 64 + i * 42 + ((t * 0.7 + i * 11) % 22);
        const hy = 20 + ((t * 0.5 + i * 17) % 50);
        ctx.fillStyle = i % 2 === 0 ? "#ff86ac" : "#ffd79d";
        ctx.fillRect(Math.floor(hx), Math.floor(hy), 2, 2);
      }

      drawTextPanel([
        "その後、ふたりは結婚。",
        "激戦を越えた絆は、幸せな日々へ。",
      ]);
      return;
    }

    ctx.fillStyle = "#08080b";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText("HAPPY WEDDING", 84, 70);
    ctx.font = "14px monospace";
    ctx.fillText("THE END", 124, 94);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#d7d7de";
    ctx.fillText(`PROTEIN ${collectedProteinIds.size}/${stage.proteins.length}`, 112, 116);
    if (t > 560) {
      ctx.fillStyle = "#f7d9d9";
      ctx.fillText("タップ/Enterでタイトルへ", 95, 136);
    }
  }

  function drawPs1Overlay() {
    ctx.fillStyle = "rgba(10,12,18,0.08)";
    for (let y = 0; y < H; y += 2) {
      ctx.fillRect(0, y, W, 1);
    }

    const vignette = ctx.createRadialGradient(
      W * 0.5,
      H * 0.56,
      58,
      W * 0.5,
      H * 0.56,
      214
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(170,205,255,0.04)";
    ctx.fillRect(0, 0, W, H);
  }

  function drawKickBurstOverlay() {
    if (kickFlashTimer <= 0 || kickFlashPower <= 0.01) return;

    const ratio = clamp(kickFlashTimer / 20, 0, 1);
    const power = clamp(kickFlashPower, 0, 5);
    const sx = Math.floor(kickBurstX - cameraX);
    const sy = Math.floor(kickBurstY);

    ctx.fillStyle = `rgba(255, 236, 176, ${0.08 * ratio * power})`;
    ctx.fillRect(0, 24, W, H - 24);

    ctx.fillStyle = `rgba(255, 255, 255, ${0.16 * ratio})`;
    ctx.fillRect(sx - 2, sy - 2, 4, 4);

    ctx.strokeStyle = `rgba(255, 210, 130, ${0.55 * ratio})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i += 1) {
      const ang = (Math.PI * 2 * i) / 10 + player.anim * 0.03;
      const len = 10 + power * 6 + ((i % 2) * 4);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(Math.floor(sx + Math.cos(ang) * len), Math.floor(sy + Math.sin(ang) * len));
      ctx.stroke();
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    if (gameState === STATE.CUTSCENE) {
      drawCutscene();
      drawPs1Overlay();
      return;
    }

    const deadShake = gameState === STATE.DEAD ? deathShakeTimer * 0.2 : 0;
    const impactRatio = clamp(impactShakeTimer / 18, 0, 1);
    const playShake = (gameState === STATE.PLAY || gameState === STATE.BOSS) ? impactShakePower * impactRatio : 0;
    const shakePower = Math.max(deadShake, playShake);
    let shakeX = 0;
    let shakeY = 0;
    if (shakePower > 0.01) {
      shakeX = (Math.random() * 2 - 1) * shakePower;
      shakeY = (Math.random() * 2 - 1) * (shakePower * 0.6);
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawWorld();
    drawKickBurstOverlay();
    drawHUD();
    drawItemGuideOverlay();

    if (gameState === STATE.DEAD) {
      drawDeadOverlay();
    }

    if (gameState === STATE.CLEAR) {
      drawClearOverlay();
    }
    ctx.restore();
    drawPs1Overlay();
  }

  function bindHoldButton(id, key) {
    const el = document.getElementById(id);
    if (!el) return;

    const pointers = new Set();

    const down = (e) => {
      e.preventDefault();
      unlockAudio();
      pointers.add(e.pointerId);
      input[key] = true;
      el.classList.add("is-down");
      el.setPointerCapture(e.pointerId);
    };

    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        input[key] = false;
        el.classList.remove("is-down");
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }

  bindHoldButton("btn-left", "left");
  bindHoldButton("btn-right", "right");
  bindHoldButton("btn-jump", "jump");

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    unlockAudio();

    if (gameState === STATE.CUTSCENE) {
      startGameplay(true);
      return;
    }

    if (gameState === STATE.CLEAR) {
      if (clearTimer > 180) {
        cutsceneTime = 0;
        cameraX = 0;
        gameState = STATE.CUTSCENE;
      }
      return;
    }

    if (gameState === STATE.DEAD) {
      deadTimer = 0;
    }
  });

  const keyToInput = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "jump",
    KeyW: "jump",
    Space: "jump",
    Enter: "start",
  };

  window.addEventListener("keydown", (e) => {
    unlockAudio();
    const mapped = keyToInput[e.code];
    if (!mapped) return;

    input[mapped] = true;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    const mapped = keyToInput[e.code];
    if (!mapped) return;
    input[mapped] = false;
  });

  window.addEventListener("blur", () => {
    input.left = false;
    input.right = false;
    input.jump = false;
    input.start = false;
  });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(2.4, (now - last) / 16.6667);
    last = now;

    scheduleBGM();
    const actions = sampleActions();
    update(dt, actions);
    render();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
