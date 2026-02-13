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
    PRE_BOSS: "pre_boss",
    PLAY: "play",
    BOSS: "boss",
    DEAD: "dead",
    CLEAR: "clear",
  };

  const BOSS_ARENA = {
    minX: 6860,
    maxX: 7180,
  };
  const MAX_HEARTS = 3;
  const START_LIVES = 3;

  const input = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    start: false,
  };

  const prevInput = {
    jump: false,
    attack: false,
    start: false,
  };

  let gameState = STATE.CUTSCENE;
  let cutsceneTime = 0;
  let preBossCutsceneTimer = 0;
  let deadTimer = 0;
  let deadTimerMax = 0;
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
  let playerLives = START_LIVES;
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
  let hammerTimer = 0;
  let gloveTimer = 0;
  let hammerHitCooldown = 0;
  let gloveHitCooldown = 0;
  let weaponHudTimer = 0;
  let dashJumpAssistTimer = 0;
  let attackCooldown = 0;
  let attackEffectTimer = 0;
  let attackEffectMode = "none";
  let attackEffectPhase = 0;
  let hitSparks = [];
  let deathFlashTimer = 0;
  let deathShakeTimer = 0;
  let deathJumpVy = 0;
  let deathPauseTimer = 0;
  let deathAnimActive = false;
  let deadReason = "";
  let audioCtx = null;
  let bgmMaster = null;
  let bgmNoiseBuffer = null;
  let stageMusic = null;
  let stageMusicPrimed = false;
  let stageMusicFadeTimer = 0;
  let stageMusicFadeDuration = 0;
  let stageMusicFadeStart = 0;
  let stageMusicFadeEnd = 0;
  let invincibleMusic = null;
  let invincibleMusicPrimed = false;
  let invincibleMusicFadeTimer = 0;
  let invincibleMusicFadeDuration = 0;
  let openingThemeActive = false;
  let rilaVoiceNextAt = 0;
  let robotVoiceCurve = null;
  let bgmStarted = false;

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
  const BGM_NORMAL_VOL = 0.38;
  const BGM_DEAD_VOL = 0.14;
  const INVINCIBLE_BGM_VOL = 0.44;
  const INVINCIBLE_DURATION = 900;
  const INVINCIBLE_BGM_FADE_SEC = 1.2;
  const STAGE_BGM_PATH = "assets/stage_bgm.mp3";
  const INVINCIBLE_BGM_PATH = "assets/invincible_bgm.mp3";
  const WEAPON_DURATION = 600;
  const OPENING_CUTSCENE_DURATION = 760;
  const PRE_BOSS_CUTSCENE_DURATION = 460;
  const CANNON_BULLET_SPEED = 1.3;
  const CANNON_WARN_WINDOW = 24;
  const CANNON_EXTRA_COOLDOWN = 26;
  const DASH_JUMP_MIN_SPEED = 1.2;
  const DASH_JUMP_VX_BONUS = 0.88;
  const DASH_JUMP_VY_BONUS = 0.46;
  const DASH_JUMP_ASSIST_FRAMES = 20;
  const DASH_JUMP_SPEED_CAP_MULT = 1.45;
  const DASH_JUMP_GRAVITY_MULT = 0.84;
  const STOMP_VERTICAL_GRACE = 16;
  const STOMP_SIDE_GRACE = 6;
  const STOMP_DESCEND_MIN = -0.25;

  function proteinLevel() {
    return collectedProteinIds.size;
  }

  function powerFactor() {
    return 1;
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

  function ensureStageMusic() {
    if (stageMusic) return;
    stageMusic = new Audio(STAGE_BGM_PATH);
    stageMusic.loop = true;
    stageMusic.volume = BGM_NORMAL_VOL;
    stageMusic.preload = "auto";
  }

  function startStageMusic(fromStart = false) {
    ensureStageMusic();
    if (!stageMusic) return;
    stageMusicFadeTimer = 0;
    stageMusicFadeDuration = 0;
    try {
      if (fromStart) {
        stageMusic.currentTime = 0;
      }
      stageMusic.volume = clamp(stageMusic.volume || BGM_NORMAL_VOL, 0, 1);
      stageMusic.play().catch(() => {});
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function stopStageMusic(resetToStart = false) {
    if (!stageMusic) return;
    stageMusicFadeTimer = 0;
    stageMusicFadeDuration = 0;
    try {
      stageMusic.pause();
      if (resetToStart) {
        stageMusic.currentTime = 0;
      }
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function setBgmVolume(target, fadeSec = 0.08) {
    ensureStageMusic();
    if (!stageMusic) return;

    const safeTarget = clamp(target, 0, 1);
    if (fadeSec <= 0.01) {
      stageMusicFadeTimer = 0;
      stageMusicFadeDuration = 0;
      try {
        stageMusic.volume = safeTarget;
      } catch (_e) {
        // Ignore media errors and keep gameplay responsive.
      }
      return;
    }

    stageMusicFadeStart = clamp(stageMusic.volume || 0, 0, 1);
    stageMusicFadeEnd = safeTarget;
    stageMusicFadeDuration = Math.max(1, Math.round(fadeSec * 60));
    stageMusicFadeTimer = stageMusicFadeDuration;
  }

  function updateStageMusicFade(dt) {
    if (!stageMusic || stageMusicFadeTimer <= 0 || stageMusicFadeDuration <= 0) return;
    stageMusicFadeTimer = Math.max(0, stageMusicFadeTimer - dt);
    const t = 1 - stageMusicFadeTimer / stageMusicFadeDuration;
    const vol = stageMusicFadeStart + (stageMusicFadeEnd - stageMusicFadeStart) * clamp(t, 0, 1);
    try {
      stageMusic.volume = clamp(vol, 0, 1);
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
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
    stopStageMusic(false);
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
      startStageMusic(true);
      setBgmVolume(0, 0);
      setBgmVolume(BGM_NORMAL_VOL, INVINCIBLE_BGM_FADE_SEC);
    }
  }

  function startOpeningTheme() {
    if (openingThemeActive) return;
    if (gameState !== STATE.CUTSCENE && gameState !== STATE.PRE_BOSS) return;
    if (!audioCtx || audioCtx.state !== "running") return;
    ensureInvincibleMusic();
    if (!invincibleMusic) return;

    openingThemeActive = true;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;
    stopStageMusic(true);

    try {
      invincibleMusic.volume = INVINCIBLE_BGM_VOL;
      invincibleMusic.currentTime = 0;
      const starting = invincibleMusic.play();
      if (starting && typeof starting.then === "function") {
        starting.catch(() => {
          openingThemeActive = false;
        });
      }
    } catch (_e) {
      openingThemeActive = false;
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
    }

    ensureStageMusic();
    if (stageMusic && !stageMusicPrimed) {
      stageMusicPrimed = true;
      try {
        if (stageMusic.paused) {
          stageMusic.muted = true;
          const priming = stageMusic.play();
          if (priming && typeof priming.then === "function") {
            priming.then(() => {
              stageMusic.pause();
              stageMusic.currentTime = 0;
              stageMusic.muted = false;
              stageMusic.volume = BGM_NORMAL_VOL;
            }).catch(() => {
              stageMusic.muted = false;
              stageMusic.volume = BGM_NORMAL_VOL;
            });
          } else {
            stageMusic.pause();
            stageMusic.currentTime = 0;
            stageMusic.muted = false;
            stageMusic.volume = BGM_NORMAL_VOL;
          }
        }
      } catch (_e) {
        // Ignore media errors and keep gameplay responsive.
      }
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

  function playDeathJingle() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const step = 0.12;
    const notes = [76, 72, 69, 64, 57];

    for (let i = 0; i < notes.length; i += 1) {
      const t = now + i * step;
      const freq = midiToFreq(notes[i]);

      const lead = audioCtx.createOscillator();
      const leadGain = audioCtx.createGain();
      lead.type = "square";
      lead.frequency.setValueAtTime(freq, t);
      leadGain.gain.setValueAtTime(0.0001, t);
      leadGain.gain.exponentialRampToValueAtTime(0.1, t + 0.008);
      leadGain.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.95);
      lead.connect(leadGain);
      leadGain.connect(audioCtx.destination);
      lead.start(t);
      lead.stop(t + step);

      const bass = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bass.type = "triangle";
      bass.frequency.setValueAtTime(freq * 0.5, t);
      bassGain.gain.setValueAtTime(0.0001, t);
      bassGain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.9);
      bass.connect(bassGain);
      bassGain.connect(audioCtx.destination);
      bass.start(t);
      bass.stop(t + step * 0.92);
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

  function playRilaRobotVoice(type = "attack") {
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
    if (!bgmStarted || !stageMusic) return;
    const stageActive = gameState === STATE.PLAY || gameState === STATE.BOSS;
    if (!stageActive) return;
    if (invincibleTimer > 0 || openingThemeActive) return;
    if (!stageMusic.paused) return;
    try {
      stageMusic.play().catch(() => {});
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function buildStage() {
    const solids = [];
    const enemies = [];
    const proteins = [];
    const bikes = [];
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

    const addBike = (id, x, y) => {
      bikes.push({
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
      [5260, 380],
      [5720, 320],
      [6120, 340],
      [6540, 360],
      [6940, 460],
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
    addSolid(5380, 118, 100, 10);
    addSolid(5860, 108, 110, 10, { kind: "crumble", state: "solid", collapseAt: 18 });
    addSolid(6340, 114, 120, 10);
    addSolid(6760, 104, 130, 10, { kind: "crumble", state: "solid", collapseAt: 16 });
    addSolid(7090, 116, 90, 10);

    addSolid(1220, 98, 26, 62);
    addSolid(2060, 90, 20, 70);
    addSolid(3460, 94, 26, 66);
    addSolid(4360, 88, 20, 72);
    addSolid(5610, 96, 22, 64);
    addSolid(6480, 92, 24, 68);

    breakWalls.push({ x: 3570, y: 96, w: 22, h: 64, hp: 3, maxHp: 3, isWall: true, hitCooldown: 0 });
    breakWalls.push({ x: 6210, y: 98, w: 22, h: 62, hp: 3, maxHp: 3, isWall: true, hitCooldown: 0 });

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
      { kind: "peacock", x: 4210, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.48, minX: 4100, maxX: 4350, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.5, chargeCooldown: 66, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
      { x: 5480, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.7, minX: 5330, maxX: 5600, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 92, hopInterval: 92 },
      { x: 5950, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.72, minX: 5820, maxX: 6030, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { x: 6420, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.74, minX: 6280, maxX: 6480, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 86, hopInterval: 86 },
      { kind: "peacock", x: 6640, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.5, minX: 6520, maxX: 6750, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.58, chargeCooldown: 70, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
      { x: 6890, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.76, minX: 6780, maxX: 7010, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0, forceShooter: true }
    );

    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      enemy.shooter = enemy.kind !== "peacock" && (enemy.forceShooter || i === 2 || i === 7 || i === 13);
      enemy.shootInterval = enemy.shooter ? 156 + i * 10 : 0;
      enemy.shootCooldown = enemy.shooter ? 96 + i * 10 : 0;
      enemy.flash = 0;
    }

    // Spikes removed per latest request.

    fallBlocks.push(
      { x: 690, y: 16, w: 20, h: 38, triggerX: 640, state: "idle", vy: 0, timer: 0, warnDuration: 44 },
      { x: 1310, y: 10, w: 20, h: 44, triggerX: 1250, state: "idle", vy: 0, timer: 0, warnDuration: 42 },
      { x: 2140, y: 10, w: 24, h: 50, triggerX: 2090, state: "idle", vy: 0, timer: 0, warnDuration: 40 },
      { x: 2870, y: 6, w: 22, h: 46, triggerX: 2810, state: "idle", vy: 0, timer: 0, warnDuration: 40 },
      { x: 3720, y: 4, w: 24, h: 52, triggerX: 3660, state: "idle", vy: 0, timer: 0, warnDuration: 38 },
      { x: 5570, y: 6, w: 24, h: 48, triggerX: 5510, state: "idle", vy: 0, timer: 0, warnDuration: 36 },
      { x: 6460, y: 6, w: 24, h: 48, triggerX: 6400, state: "idle", vy: 0, timer: 0, warnDuration: 34 }
    );

    cannons.push(
      { x: 1840, y: 142, dir: -1, triggerX: 1760, interval: 156, cool: 62, active: false },
      { x: 2660, y: 142, dir: 1, triggerX: 2580, interval: 144, cool: 52, active: false },
      { x: 3470, y: 142, dir: -1, triggerX: 3390, interval: 132, cool: 48, active: false },
      { x: 4300, y: 142, dir: -1, triggerX: 4220, interval: 122, cool: 44, active: false },
      { x: 6020, y: 142, dir: -1, triggerX: 5950, interval: 118, cool: 40, active: false },
      { x: 6760, y: 142, dir: 1, triggerX: 6700, interval: 112, cool: 38, active: false }
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
    addProtein(29, 5340, 132);
    addProtein(30, 5460, 102);
    addProtein(31, 5660, 132);
    addProtein(32, 5880, 94);
    addProtein(33, 6080, 132);
    addProtein(34, 6310, 100);
    addProtein(35, 6530, 132);
    addProtein(36, 6750, 90);
    addProtein(37, 6920, 132);
    addProtein(38, 7060, 104);
    addProtein(39, 7120, 132);
    addProtein(40, 7160, 132);

    // Bike = rare invincibility item.
    addBike(1, 1140, 110);
    addBike(2, 3360, 102);
    addBike(3, 5660, 106);
    addBike(4, 6840, 102);

    addWeaponItem(1, "hammer", 690, 108);
    addWeaponItem(2, "glove", 1710, 106);
    addWeaponItem(3, "hammer", 2760, 108);
    addWeaponItem(4, "glove", 3620, 102);
    addWeaponItem(5, "hammer", 4380, 104);
    addWeaponItem(6, "glove", 5030, 116);
    addWeaponItem(7, "hammer", 1530, 134);
    addWeaponItem(8, "glove", 3240, 100);
    addWeaponItem(9, "hammer", 5540, 102);
    addWeaponItem(10, "glove", 6120, 104);
    addWeaponItem(11, "hammer", 6690, 98);

    return {
      width: 7400,
      groundY,
      solids,
      enemies,
      proteins,
      bikes,
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
        { x: 3380, y: 136, label: "CP-2" },
        { x: 4300, y: 136, label: "CP-3" },
        { x: 5200, y: 136, label: "CP-4" },
        { x: 6040, y: 136, label: "CP-5" },
        { x: 6680, y: 136, label: "CP-6" },
      ],
      goal: { x: 7044, y: 112, w: 24, h: 48 },
      boss: {
        started: false,
        active: false,
        x: 7100,
        y: 124,
        w: 24,
        h: 36,
        vx: 0,
        vy: 0,
        dir: -1,
        onGround: false,
        hp: 28,
        maxHp: 28,
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

  function canStandAt(x, y, solids) {
    const body = { x, y, w: player.w, h: player.h };
    for (const s of solids) {
      if (overlap(body, s)) return false;
    }

    const head = { x, y: y - 8, w: player.w, h: 8 };
    for (const s of solids) {
      if (overlap(head, s)) return false;
    }

    const footY = y + player.h + 1;
    const supportXs = [
      x + 2,
      x + Math.floor(player.w * 0.5),
      x + player.w - 2,
    ];
    for (const sx of supportXs) {
      if (!pointInSolids(sx, footY, solids)) return false;
    }

    return true;
  }

  function isSpawnDangerous(x, y) {
    const probe = { x: x - 6, y: y - 4, w: player.w + 12, h: player.h + 8 };

    for (const enemy of stage.enemies) {
      if (!enemy.alive) continue;
      const enemyPad = { x: enemy.x - 4, y: enemy.y - 3, w: enemy.w + 8, h: enemy.h + 6 };
      if (overlap(probe, enemyPad)) return true;
    }

    for (const block of stage.fallBlocks) {
      if (block.state === "gone") continue;
      if (overlap(probe, block)) return true;
    }

    for (const cannon of stage.cannons) {
      const dx = Math.abs((x + player.w * 0.5) - cannon.x);
      const dy = Math.abs((y + player.h * 0.5) - cannon.y);
      if (dx < 20 && dy < 24) return true;
    }

    return false;
  }

  function findSafeRespawnPoint(cp) {
    const solids = collectSolids();
    const baseX = clamp(cp.x, 2, stage.width - player.w - 2);
    const baseY = cp.y;
    const offsets = [0, -8, 8, -16, 16, -24, 24, -34, 34, -46, 46, -60, 60, -78, 78, -98, 98, -120, 120];
    const candidates = [];

    for (const offset of offsets) {
      const x = clamp(baseX + offset, 2, stage.width - player.w - 2);
      let bestY = null;
      let bestDy = Infinity;

      for (const s of solids) {
        const left = x + 2;
        const right = x + player.w - 2;
        if (left < s.x || right > s.x + s.w) continue;

        const y = s.y - player.h;
        if (y < 0 || y > H + 20) continue;

        const dy = Math.abs(y - baseY);
        if (dy > 56) continue;
        if (dy < bestDy) {
          bestDy = dy;
          bestY = y;
        }
      }

      if (bestY === null) continue;
      candidates.push({ x, y: bestY });
    }

    for (const c of candidates) {
      if (canStandAt(c.x, c.y, solids) && !isSpawnDangerous(c.x, c.y)) return c;
    }
    for (const c of candidates) {
      if (canStandAt(c.x, c.y, solids)) return c;
    }

    return { x: baseX, y: baseY };
  }

  function placePlayerAtCheckpoint(cp) {
    player = createPlayer(cp.x, cp.y);
    const safe = findSafeRespawnPoint(cp);
    player.x = safe.x;
    player.y = safe.y;
    player.vx = 0;
    player.vy = -0.8;
    player.onGround = false;
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
    playRilaRobotVoice("attack");
    spawnHitSparks(x, y, "#fff7bc", "#ff9645");
    spawnHitSparks(x, y, "#ffe8a0", "#ff5d53");
  }

  function killPlayer(reason, options = {}) {
    const ignoreInvincible = options.ignoreInvincible === true;
    const instantGameOver = options.instantGameOver === true;

    if (gameState !== STATE.PLAY && gameState !== STATE.BOSS) return;
    if (invincibleTimer > 0 && !ignoreInvincible) {
      if (invincibleHitCooldown > 0) return;
      invincibleHitCooldown = 8;
      hudMessage = "バイク無敵! ノーダメージ";
      hudTimer = 28;
      triggerImpact(0.9, player.x + player.w * 0.5, player.y + player.h * 0.5, 1.2);
      return;
    }

    if (!instantGameOver) {
      if (damageInvulnTimer > 0) return;

      playerHearts = Math.max(0, playerHearts - 1);
      damageInvulnTimer = 84;
      hurtFlashTimer = 24;
      playDamageSfx();
      playRilaRobotVoice("hurt");
      triggerImpact(1.2, player.x + player.w * 0.5, player.y + player.h * 0.5, 1.8);

      if (playerHearts > 0) {
        const knockDir = player.facing > 0 ? -1 : 1;
        player.vx = knockDir * 2.1;
        player.vy = -3.0;
        player.onGround = false;
        hitStopTimer = Math.max(hitStopTimer, 5.0);
        hudMessage = `${reason} -1ハート`;
        hudTimer = 66;
        return;
      }
    } else {
      playerHearts = 0;
      hurtFlashTimer = 24;
      playDamageSfx();
      playRilaRobotVoice("hurt");
      triggerImpact(1.6, player.x + player.w * 0.5, player.y + player.h * 0.5, 2.4);
    }

    playerLives = Math.max(0, playerLives - 1);
    gameState = STATE.DEAD;
    deadTimer = playerLives > 0 ? 188 : 228;
    deadTimerMax = deadTimer;
    deathFlashTimer = 34;
    deathShakeTimer = 26;
    deathPauseTimer = 34;
    deathAnimActive = false;
    deathJumpVy = 0;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    deadReason = reason;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    stopInvincibleMusic();
    stopStageMusic(true);
    proteinRushTimer = 0;
    kickCombo = 0;
    kickComboTimer = 0;
    damageInvulnTimer = 0;
    hurtFlashTimer = 0;
    kickFlashTimer = 0;
    kickFlashPower = 0;
    hammerTimer = 0;
    gloveTimer = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    dashJumpAssistTimer = 0;
    attackCooldown = 0;
    attackEffectTimer = 0;
    attackEffectPhase = 0;
    attackEffectMode = "none";
    deaths += 1;
    hudMessage = playerLives > 0 ? `${reason} / 残機 x${playerLives}` : `${reason} / 残機 0`;
    hudTimer = 80;
    playDeathSfx();
    playDeathJingle();
  }

  function startGameplay(resetDeaths) {
    if (resetDeaths) {
      deaths = 0;
      collectedProteinIds = new Set();
    }
    checkpointIndex = 0;
    preBossCutsceneTimer = 0;
    stage = buildStage();
    const cp = stage.checkpoints[checkpointIndex];
    placePlayerAtCheckpoint(cp);
    cameraX = 0;
    proteinRushTimer = 0;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    playerHearts = MAX_HEARTS;
    playerLives = START_LIVES;
    damageInvulnTimer = 0;
    hurtFlashTimer = 0;
    impactShakeTimer = 0;
    impactShakePower = 0;
    hitStopTimer = 0;
    kickCombo = 0;
    kickComboTimer = 0;
    kickFlashTimer = 0;
    kickFlashPower = 0;
    hammerTimer = 0;
    gloveTimer = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    dashJumpAssistTimer = 0;
    attackCooldown = 0;
    attackEffectTimer = 0;
    attackEffectPhase = 0;
    attackEffectMode = "none";
    hitSparks = [];
    deathFlashTimer = 0;
    deathShakeTimer = 0;
    deathPauseTimer = 0;
    deathAnimActive = false;
    deathJumpVy = 0;
    deadReason = "";
    openingThemeActive = false;
    stopInvincibleMusic();
    gameState = STATE.PLAY;
    hudMessage = "りら: ホームパーティー会場へ殴り込み、彼氏を救出せよ";
    hudTimer = 170;
    deadTimerMax = 0;
    startStageMusic(true);
    setBgmVolume(0, 0);
    setBgmVolume(BGM_NORMAL_VOL, 0.08);
  }

  function respawnFromCheckpoint() {
    preBossCutsceneTimer = 0;
    stage = buildStage();
    const cp = stage.checkpoints[checkpointIndex];
    placePlayerAtCheckpoint(cp);
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
    hammerTimer = 0;
    gloveTimer = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    dashJumpAssistTimer = 0;
    attackCooldown = 0;
    attackEffectTimer = 0;
    attackEffectPhase = 0;
    attackEffectMode = "none";
    hitSparks = [];
    deathFlashTimer = 0;
    deathShakeTimer = 0;
    deathPauseTimer = 0;
    deathAnimActive = false;
    deathJumpVy = 0;
    deadReason = "";
    stopInvincibleMusic();
    gameState = STATE.PLAY;
    hudMessage = `${cp.label} から再開`;
    hudTimer = 70;
    deadTimerMax = 0;
    startStageMusic(true);
    setBgmVolume(0, 0);
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
      cannon.muzzleFlash = Math.max(0, (cannon.muzzleFlash || 0) - dt);
      if (!cannon.active && player.x + player.w > cannon.triggerX) {
        cannon.active = true;
      }

      if (!cannon.active) continue;

      cannon.cool -= dt;
      cannon.warning = cannon.cool > 0 && cannon.cool <= CANNON_WARN_WINDOW;
      if (cannon.cool <= 0) {
        const bx = cannon.dir < 0 ? cannon.x - 9 : cannon.x + 7;
        stage.hazardBullets.push({
          x: bx,
          y: cannon.y + 1,
          w: 9,
          h: 7,
          vx: cannon.dir * CANNON_BULLET_SPEED,
          kind: "cannon",
          reason: "砲台の弾に被弾",
        });
        cannon.muzzleFlash = 10;
        cannon.warning = false;
        cannon.cool = cannon.interval + CANNON_EXTRA_COOLDOWN + Math.random() * 24;
      }
    }
  }

  function updateHazardBullets(dt, solids) {
    for (const bullet of stage.hazardBullets) {
      if (bullet.dead) continue;
      bullet.x += bullet.vx * dt;

      const hit = bullet.kind === "cannon"
        ? { x: bullet.x + 1.5, y: bullet.y + 1.5, w: Math.max(2, bullet.w - 3), h: Math.max(2, bullet.h - 3) }
        : bullet;
      if (overlap(player, hit)) {
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

  function updateBikes(dt) {
    for (const bike of stage.bikes) {
      bike.bob += 0.11 * dt;
      if (bike.collected) continue;

      const floatY = bike.y + Math.sin(bike.bob) * 1.9;
      const hit = { x: bike.x, y: floatY, w: bike.w, h: bike.h };
      if (!overlap(player, hit)) continue;

      bike.collected = true;
      startInvincibleMode(INVINCIBLE_DURATION);
      playPowerupSfx();
      triggerImpact(1.25, bike.x + bike.w * 0.5, floatY + bike.h * 0.5, 2.2);
      hudMessage = "バイク搭乗! 15秒 無敵";
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
        hudMessage = "ハンマー獲得! 10秒 叩き強化";
      } else {
        gloveTimer = Math.max(gloveTimer, WEAPON_DURATION);
        hudMessage = "グローブ獲得! 10秒 百裂拳";
      }
      hudTimer = 84;
    }
  }

  function currentAttackMode() {
    if (hammerTimer > 0 && gloveTimer > 0) {
      return hammerTimer >= gloveTimer ? "hammer" : "glove";
    }
    if (hammerTimer > 0) return "hammer";
    if (gloveTimer > 0) return "glove";
    return null;
  }

  function executePlayerAttack(mode) {
    if (mode !== "hammer" && mode !== "glove") return;
    const pLv = proteinLevel();
    const gf = powerFactor();
    const px = player.x + player.w * 0.5;
    const dir = player.facing;

    let hitBox = { x: px - 6, y: player.y + 8, w: 12, h: 12 };
    let power = 1.06 + pLv * 0.05;
    let burstPower = 1.3 + pLv * 0.04;
    let cooldown = 10;
    let hitLabel = "アタック!";

    if (mode === "hammer") {
      const hitX = dir > 0 ? player.x + player.w - 2 : player.x - 14;
      hitBox = { x: hitX, y: player.y - 10, w: 14, h: 36 };
      power = 1.45 + pLv * 0.06;
      burstPower = 1.8 + pLv * 0.05;
      cooldown = 6;
      hitLabel = "ハンマー連打!";
    } else if (mode === "glove") {
      const range = 23 + pLv * 0.4;
      const hitX = dir > 0 ? player.x + player.w - 1 : player.x - range;
      hitBox = { x: hitX, y: player.y + 4, w: range, h: 16 };
      power = 1.12 + pLv * 0.04;
      burstPower = 1.45 + pLv * 0.04;
      cooldown = 3.4;
      hitLabel = "百裂拳!";
    }

    attackCooldown = cooldown;
    attackEffectTimer = mode === "hammer" ? 12 : 9;
    attackEffectMode = mode;
    attackEffectPhase = 0;
    if (mode === "hammer") {
      hammerHitCooldown = cooldown;
    } else if (mode === "glove") {
      gloveHitCooldown = cooldown;
    }

    let hits = 0;
    let hitX = player.x + player.w * 0.5 + dir * 8;
    let hitY = player.y + 11;

    for (const enemy of stage.enemies) {
      if (!enemy.alive || enemy.kicked) continue;
      if (!overlap(hitBox, enemy)) continue;
      const knockDir = enemy.x + enemy.w * 0.5 >= px ? 1 : -1;
      kickEnemy(enemy, knockDir, power * gf);
      hitX = enemy.x + enemy.w * 0.5;
      hitY = enemy.y + enemy.h * 0.5;
      hits += 1;
    }

    for (const b of stage.hazardBullets) {
      if (!overlap(hitBox, b)) continue;
      b.dead = true;
      hits += 1;
    }

    for (const bs of stage.bossShots) {
      if (!overlap(hitBox, bs)) continue;
      bs.dead = true;
      hits += 1;
    }

    for (const wall of stage.breakWalls) {
      if (wall.hp <= 0) continue;
      if (wall.hitCooldown > 0) continue;
      if (!overlap(hitBox, wall)) continue;
      const wallDamage = mode === "hammer" ? 3 : 1;
      wall.hp = Math.max(0, wall.hp - wallDamage);
      wall.hitCooldown = mode === "hammer" ? 12 : 16;
      hitX = wall.x + wall.w * 0.5;
      hitY = wall.y + wall.h * 0.4;
      hits += 1;
      hudMessage = wall.hp <= 0 ? "壁を破壊! 先へ進め!" : `壁にヒット! 残り耐久 ${wall.hp}`;
      hudTimer = wall.hp <= 0 ? 90 : 46;
    }

    if (stage.boss.active && stage.boss.hp > 0 && overlap(hitBox, stage.boss) && stage.boss.invuln <= 0) {
      const bossDamage = mode === "hammer" ? 2 : 1;
      stage.boss.hp = Math.max(0, stage.boss.hp - bossDamage);
      stage.boss.invuln = 16;
      stage.boss.vx += dir * (0.8 + bossDamage * 0.2);
      stage.boss.vy = Math.min(stage.boss.vy, -2.4);
      hitX = stage.boss.x + stage.boss.w * 0.5;
      hitY = stage.boss.y + stage.boss.h * 0.5;
      hits += 1;
      if (stage.boss.hp <= 0) {
        defeatBoss();
      }
    }

    if (hits > 0) {
      if (kickComboTimer > 0) {
        kickCombo = Math.min(99, kickCombo + hits);
      } else {
        kickCombo = hits;
      }
      kickComboTimer = mode === "glove" ? 38 : 48;
      triggerKickBurst(hitX, hitY, burstPower + hits * 0.08);
      playKickSfx(mode === "hammer" ? 1.78 : mode === "glove" ? 1.35 : 1.52);
      if (mode !== "hammer" || hits <= 1) {
        hudMessage = kickCombo > 1 ? `${hitLabel} x${kickCombo}` : hitLabel;
        hudTimer = 28;
      }
    }
  }

  function updatePlayerAttack(dt, actions) {
    const hasWeapon = hammerTimer > 0 || gloveTimer > 0;
    const wantRepeat = hasWeapon && input.attack;
    if (attackCooldown > 0) return;
    if (!hasWeapon) {
      if (actions.attackPressed) {
        hudMessage = "武器アイテム中のみ攻撃できる";
        hudTimer = 24;
      }
      return;
    }
    if (!actions.attackPressed && !wantRepeat) return;
    executePlayerAttack(currentAttackMode());
  }

  function resolveEnemyContactDamage() {
    for (const enemy of stage.enemies) {
      if (!enemy.alive) continue;
      const touchingBody = overlap(player, enemy);
      const feetBox = {
        x: player.x - STOMP_SIDE_GRACE,
        y: player.y + player.h - 6,
        w: player.w + STOMP_SIDE_GRACE * 2,
        h: 10 + STOMP_VERTICAL_GRACE,
      };
      const stompTarget = {
        x: enemy.x - STOMP_SIDE_GRACE,
        y: enemy.y - 2,
        w: enemy.w + STOMP_SIDE_GRACE * 2,
        h: enemy.h + STOMP_VERTICAL_GRACE + 4,
      };
      const stompTouch = overlap(feetBox, stompTarget);
      if (!touchingBody && !stompTouch) continue;

      const playerBottom = player.y + player.h;
      const enemyTop = enemy.y;
      const enemyMidY = enemy.y + enemy.h * 0.5;
      const verticalWindow = playerBottom >= enemyTop - 4 && playerBottom <= enemyTop + STOMP_VERTICAL_GRACE;
      const centerAbove = player.y + player.h * 0.42 <= enemyMidY + 5;
      const descending = player.vy > STOMP_DESCEND_MIN;
      const stompable = stompTouch && verticalWindow && centerAbove && descending;

      if (stompable) {
        const dir = player.x + player.w * 0.5 < enemy.x + enemy.w * 0.5 ? 1 : -1;
        const pLv = proteinLevel();
        const stompPower = 1.45 + pLv * 0.045;
        kickEnemy(enemy, dir, stompPower + 0.35);
        player.vy = -6.35 - Math.min(0.45, Math.abs(player.vx) * 0.08);
        player.vx += dir * 0.12;
        player.onGround = false;
        hitStopTimer = Math.max(hitStopTimer, 4.6);

        if (kickComboTimer > 0) {
          kickCombo = Math.min(99, kickCombo + 1);
        } else {
          kickCombo = 1;
        }
        kickComboTimer = 58;

        const hitX = enemy.x + enemy.w * 0.5;
        const hitY = enemy.y + enemy.h * 0.4;
        const burstPower = 2.1 + stompPower * 0.55 + Math.min(0.7, kickCombo * 0.03);
        triggerKickBurst(hitX, hitY, burstPower);
        triggerImpact(2.7, hitX, hitY, 4.2);
        spawnHitSparks(hitX, hitY, "#fff2bc", "#ffb26a");
        spawnHitSparks(hitX, hitY, "#ffe6b0", "#ff6e55");
        playKickSfx(1.58 + stompPower * 0.12);
        hudMessage = kickCombo > 1 ? `踏みつけクラッシュ x${kickCombo}!` : "踏みつけクラッシュ!";
        hudTimer = 32;
        return;
      }

      if (!touchingBody) continue;

      if (enemy.kind === "peacock") {
        killPlayer("孔雀に接触");
      } else {
        killPlayer("敵に接触");
      }
      return;
    }
  }

  function resolveBossContactDamage() {
    if (!stage.boss.active) return;
    if (!overlap(player, stage.boss)) return;
    const rage = stage.boss.hp <= Math.ceil(stage.boss.maxHp * 0.55);
    if (stage.boss.mode === "dash") {
      killPlayer("神の突進に被弾");
    } else {
      killPlayer(rage ? "神威に接触して被弾" : "神に接触して被弾");
    }
  }

  function startBossBattle() {
    if (stage.boss.started) return;

    stage.boss.started = true;
    stage.boss.active = true;
    stage.boss.hp = stage.boss.maxHp;
    stage.boss.x = 7100;
    stage.boss.y = 124;
    stage.boss.vx = 0;
    stage.boss.vy = 0;
    stage.boss.dir = -1;
    stage.boss.mode = "intro";
    stage.boss.modeTimer = 42;
    stage.boss.shotCooldown = 28;
    stage.boss.attackCycle = 0;
    stage.boss.invuln = 24;
    stage.bossShots = [];
    openingThemeActive = false;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    stopInvincibleMusic();
    startStageMusic(true);
    setBgmVolume(0, 0);
    setBgmVolume(BGM_NORMAL_VOL, 0.12);

    gameState = STATE.BOSS;
    cameraX = clamp(BOSS_ARENA.minX - 96, 0, stage.width - W);
    player.x = clamp(player.x, BOSS_ARENA.minX + 10, BOSS_ARENA.maxX - player.w - 12);
    player.vx = 0;
    player.vy = Math.min(player.vy, 0);

    triggerImpact(2.4, stage.boss.x + stage.boss.w * 0.5, stage.boss.y + stage.boss.h * 0.55, 3.4);
    playKickSfx(1.8);
    hudMessage = "ホームパーティー会場で神が降臨! 回避しつつ戦え";
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
    const rage = boss.hp <= Math.ceil(boss.maxHp * 0.55);
    boss.invuln = Math.max(0, boss.invuln - dt);
    boss.modeTimer -= dt;
    boss.shotCooldown -= dt;

    if (boss.mode === "intro") {
      boss.vx = -0.54;
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 38 : 48;
      }
    } else if (boss.mode === "idle") {
      boss.vx += boss.dir * (rage ? 0.29 : 0.22) * dt;
      boss.vx = clamp(boss.vx, -(rage ? 1.4 : 1.12), rage ? 1.4 : 1.12);

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
          boss.modeTimer = rage ? 20 : 28;
          boss.vx = 0;
        } else {
          boss.mode = "shoot";
          boss.modeTimer = rage ? 78 : 66;
          boss.shotCooldown = rage ? 10 : 14;
        }
        boss.attackCycle += 1;
      }
    } else if (boss.mode === "windup") {
      boss.vx *= Math.pow(rage ? 0.62 : 0.68, dt);
      if (boss.modeTimer <= 0) {
        boss.mode = "dash";
        boss.modeTimer = rage ? 34 : 28;
        boss.vx = boss.dir * (2.55 + (boss.maxHp - boss.hp) * 0.034 + (rage ? 0.38 : 0));
      }
    } else if (boss.mode === "dash") {
      if (boss.x <= BOSS_ARENA.minX + 3) {
        boss.x = BOSS_ARENA.minX + 3;
        boss.dir = 1;
        boss.mode = "idle";
        boss.modeTimer = rage ? 34 : 46;
      } else if (boss.x + boss.w >= BOSS_ARENA.maxX - 3) {
        boss.x = BOSS_ARENA.maxX - 3 - boss.w;
        boss.dir = -1;
        boss.mode = "idle";
        boss.modeTimer = rage ? 34 : 46;
      } else if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 34 : 46;
      }
    } else if (boss.mode === "shoot") {
      boss.vx *= Math.pow(rage ? 0.74 : 0.79, dt);

      if (boss.shotCooldown <= 0) {
        const aim = player.x + player.w * 0.5 < boss.x + boss.w * 0.5 ? -1 : 1;
        const spread = (boss.attackCycle % 3) - 1;
        const volleyOffsets = rage ? [-0.38, -0.19, 0, 0.19, 0.38] : [-0.22, 0, 0.22];
        for (const offset of volleyOffsets) {
          stage.bossShots.push({
            x: boss.x + boss.w * 0.5 - 2,
            y: boss.y + 10,
            w: rage ? 6 : 5,
            h: rage ? 6 : 5,
            vx: aim * (1.68 + Math.abs(spread) * 0.16) + aim * offset * 0.36,
            vy: -0.56 + spread * 0.18 + offset,
            ttl: rage ? 148 : 136,
          });
        }
        boss.shotCooldown = rage ? 11 : 16;
        boss.attackCycle += 1;
      }

      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 34 : 46;
      }
    }

    boss.vy = Math.min(boss.vy + GRAVITY * dt, MAX_FALL);
    moveWithCollisions(boss, solids, dt);
    boss.x = clamp(boss.x, BOSS_ARENA.minX + 2, BOSS_ARENA.maxX - boss.w - 2);
  }

  function updateImpactEffects(dt) {
    impactShakeTimer = Math.max(0, impactShakeTimer - dt);
    proteinRushTimer = Math.max(0, proteinRushTimer - dt);
    invincibleHitCooldown = Math.max(0, invincibleHitCooldown - dt);
    damageInvulnTimer = Math.max(0, damageInvulnTimer - dt);
    hurtFlashTimer = Math.max(0, hurtFlashTimer - dt);
    kickFlashTimer = Math.max(0, kickFlashTimer - dt);
    kickFlashPower = Math.max(0, kickFlashPower - dt * 0.24);
    hammerTimer = Math.max(0, hammerTimer - dt);
    gloveTimer = Math.max(0, gloveTimer - dt);
    hammerHitCooldown = Math.max(0, hammerHitCooldown - dt);
    gloveHitCooldown = Math.max(0, gloveHitCooldown - dt);
    weaponHudTimer = Math.max(0, weaponHudTimer - dt);
    attackCooldown = Math.max(0, attackCooldown - dt);
    attackEffectTimer = Math.max(0, attackEffectTimer - dt);
    attackEffectPhase += dt;
    dashJumpAssistTimer = Math.max(0, dashJumpAssistTimer - dt);
    if (gloveTimer <= 0) gloveHitCooldown = 0;
    if (hammerTimer <= 0) hammerHitCooldown = 0;
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

  function resolveBreakWalls(dt) {
    for (const wall of stage.breakWalls) {
      if (wall.hp <= 0) continue;
      wall.hitCooldown = Math.max(0, (wall.hitCooldown || 0) - dt);
    }
  }

  function resolveHazards() {
    if (player.y > H + 42) {
      killPlayer("奈落に落下", { ignoreInvincible: true, instantGameOver: true });
      return;
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
      startPreBossCutscene();
    }
  }

  function startPreBossCutscene() {
    if (stage.boss.started) return;
    if (gameState !== STATE.PLAY) return;
    gameState = STATE.PRE_BOSS;
    preBossCutsceneTimer = 0;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    player.vx = 0;
    player.vy = 0;
    hudMessage = "";
    hudTimer = 0;
  }

  function sampleActions() {
    const actions = {
      jumpPressed: input.jump && !prevInput.jump,
      attackPressed: input.attack && !prevInput.attack,
      startPressed: input.start && !prevInput.start,
    };

    prevInput.jump = input.jump;
    prevInput.attack = input.attack;
    prevInput.start = input.start;

    return actions;
  }

  function updatePlay(dt, actions) {
    if (hudTimer > 0) hudTimer -= dt;
    updateImpactEffects(dt);

    if (hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - dt);
      player.anim += dt * 0.2;
      return;
    }

    const pLv = proteinLevel();
    const rush = proteinRushTimer > 0 ? 1 : 0;
    const accel = 0.24 + pLv * 0.006 + rush * 0.03;
    const maxSpeed = 1.7 + pLv * 0.022 + rush * 0.26;
    const friction = rush ? 0.87 : 0.83;
    const jumpPower = 6.35 + pLv * 0.046 + rush * 0.16;

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

    const speedCap = maxSpeed * (dashJumpAssistTimer > 0 ? DASH_JUMP_SPEED_CAP_MULT : 1);
    player.vx = clamp(player.vx, -speedCap, speedCap);

    if (actions.jumpPressed && player.onGround) {
      player.vy = -jumpPower;
      const runningJump = move !== 0 && Math.abs(player.vx) >= DASH_JUMP_MIN_SPEED && Math.sign(player.vx) === move;
      if (runningJump) {
        player.vx = clamp(player.vx + move * DASH_JUMP_VX_BONUS, -maxSpeed * DASH_JUMP_SPEED_CAP_MULT, maxSpeed * DASH_JUMP_SPEED_CAP_MULT);
        player.vy -= DASH_JUMP_VY_BONUS;
        dashJumpAssistTimer = DASH_JUMP_ASSIST_FRAMES;
      }
      player.onGround = false;
    }

    const gravityMult = dashJumpAssistTimer > 0 && input.jump ? DASH_JUMP_GRAVITY_MULT : 1;
    player.vy = Math.min(player.vy + GRAVITY * gravityMult * dt, MAX_FALL);
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
    updateBikes(dt);
    updateWeaponItems(dt);
    updatePlayerAttack(dt, actions);
    resolveEnemyContactDamage();
    resolveBreakWalls(dt);
    resolveHazards();
    resolveGoal();
    updateCheckpoints();

    cameraX = clamp(player.x + player.w * 0.5 - W * 0.45, 0, stage.width - W);
  }

  function updateBossBattle(dt, actions) {
    if (hudTimer > 0) hudTimer -= dt;
    updateImpactEffects(dt);

    if (hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - dt);
      player.anim += dt * 0.2;
      return;
    }

    const pLv = proteinLevel();
    const rush = proteinRushTimer > 0 ? 1 : 0;
    const accel = 0.24 + pLv * 0.006 + rush * 0.03;
    const maxSpeed = 1.7 + pLv * 0.022 + rush * 0.26;
    const friction = rush ? 0.87 : 0.83;
    const jumpPower = 6.35 + pLv * 0.046 + rush * 0.16;

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

    const speedCap = maxSpeed * (dashJumpAssistTimer > 0 ? DASH_JUMP_SPEED_CAP_MULT : 1);
    player.vx = clamp(player.vx, -speedCap, speedCap);

    if (actions.jumpPressed && player.onGround) {
      player.vy = -jumpPower;
      const runningJump = move !== 0 && Math.abs(player.vx) >= DASH_JUMP_MIN_SPEED && Math.sign(player.vx) === move;
      if (runningJump) {
        player.vx = clamp(player.vx + move * DASH_JUMP_VX_BONUS, -maxSpeed * DASH_JUMP_SPEED_CAP_MULT, maxSpeed * DASH_JUMP_SPEED_CAP_MULT);
        player.vy -= DASH_JUMP_VY_BONUS;
        dashJumpAssistTimer = DASH_JUMP_ASSIST_FRAMES;
      }
      player.onGround = false;
    }

    const gravityMult = dashJumpAssistTimer > 0 && input.jump ? DASH_JUMP_GRAVITY_MULT : 1;
    player.vy = Math.min(player.vy + GRAVITY * gravityMult * dt, MAX_FALL);
    moveWithCollisions(player, solids, dt, triggerCrumble);
    player.x = clamp(player.x, BOSS_ARENA.minX + 2, BOSS_ARENA.maxX - player.w - 2);
    player.anim += dt;

    updateProteins(dt);
    updateBikes(dt);
    updateWeaponItems(dt);
    updateBoss(dt, solids);
    updateBossShots(dt, solids);
    updatePlayerAttack(dt, actions);
    resolveBossContactDamage();
    resolveBreakWalls(dt);
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

    if (cutsceneTime > OPENING_CUTSCENE_DURATION) {
      startGameplay(true);
    }
  }

  function updatePreBossCutscene(dt, actions) {
    preBossCutsceneTimer += dt;
    startOpeningTheme();
    if (actions.startPressed || actions.jumpPressed || preBossCutsceneTimer > PRE_BOSS_CUTSCENE_DURATION) {
      startBossBattle();
    }
  }

  function returnToTitle() {
    deadReason = "";
    deathPauseTimer = 0;
    deathAnimActive = false;
    deathJumpVy = 0;
    deadTimer = 0;
    deadTimerMax = 0;
    cutsceneTime = 0;
    preBossCutsceneTimer = 0;
    cameraX = 0;
    stopInvincibleMusic();
    stopStageMusic(true);
    gameState = STATE.CUTSCENE;
  }

  function updateDead(dt) {
    deadTimer = Math.max(0, deadTimer - dt);
    deathFlashTimer = Math.max(0, deathFlashTimer - dt);
    deathShakeTimer = Math.max(0, deathShakeTimer - dt);

    if (deathPauseTimer > 0) {
      deathPauseTimer = Math.max(0, deathPauseTimer - dt);
      if (deathPauseTimer <= 0 && !deathAnimActive) {
        deathAnimActive = true;
        deathJumpVy = -5.6;
      }
    }

    if (deathAnimActive) {
      player.y += deathJumpVy * dt;
      deathJumpVy = Math.min(MAX_FALL + 2.2, deathJumpVy + GRAVITY * 1.08 * dt);
      player.anim += dt * 0.45;
    }

    if (deadTimer > 0) {
      return;
    }

    if (playerLives > 0) {
      respawnFromCheckpoint();
    } else {
      returnToTitle();
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
    updateStageMusicFade(dt);

    if (gameState === STATE.CUTSCENE) {
      updateCutscene(dt, actions);
      return;
    }

    if (gameState === STATE.PRE_BOSS) {
      updatePreBossCutscene(dt, actions);
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
      updateDead(dt);
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

  function drawHero(x, y, facing, animFrame, scale = 1, kickPose = 0) {
    const px = Math.floor(x);
    const py = Math.floor(y);
    const step = Math.sin(animFrame * 0.28);
    const legA = Math.round(step * 1.6);
    const legB = -legA;
    const armA = -Math.round(step * 1.2);
    const armB = -armA;
    const kp = clamp(kickPose, 0, 1);
    const armKickLift = Math.round(kp * 2);
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

    // Hair: fluffy side bob with bangs.
    paint("#07080d", 2, 0, 10, 1);
    paint("#08090d", 1, 1, 12, 1);
    paint("#090b11", 0, 2, 14, 2);
    paint("#0e1220", 0, 4, 14, 4);
    paint("#141a2c", 1, 5, 12, 3);
    paint("#1f2740", 2, 4, 10, 2);
    paint("#2a344e", 3, 3, 8, 1);
    paint("#12182a", 0, 8, 3, 2);
    paint("#12182a", 11, 8, 3, 2);
    paint("#1a2136", 1, 9, 4, 2);
    paint("#1a2136", 9, 9, 4, 2);
    paint("#0a0c13", 5, 4, 4, 4);
    paint("#07090f", 6, 5, 2, 4);

    // Face: softer cute look, larger eyes, small blush.
    paint("#f8e9e1", 4, 6, 6, 6);
    paint("#edd8cd", 4, 11, 6, 1);
    paint("#fff6f1", 5, 7, 2, 1);
    paint("#fff6f1", 8, 7, 2, 1);
    paint("#2a1c1d", 5, 6, 2, 1);
    paint("#2a1c1d", 8, 6, 2, 1);
    paint("#6f4838", 5, 7, 2, 2);
    paint("#6f4838", 8, 7, 2, 2);
    paint("#fff8f4", 5, 7, 1, 1);
    paint("#fff8f4", 8, 7, 1, 1);
    paint("#f2c8bb", 4, 9, 1, 1);
    paint("#f2c8bb", 10, 9, 1, 1);
    paint("#c48a83", 6, 10, 2, 1);

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
    paint("#0e121d", 0, 13 + armA + armKickLift, 2, 6);
    paint("#2b3447", 1, 14 + armA + armKickLift, 1, 3);
    paint("#f4e0d3", 0, 19 + armA + armKickLift, 2, 1);
    paint("#0e121d", 12, 13 + armB - armKickLift, 2, 6);
    paint("#2b3447", 12, 14 + armB - armKickLift, 1, 3);
    paint("#f4e0d3", 12, 19 + armB - armKickLift, 2, 1);

    // Legs and boots.
    if (kp > 0.04) {
      const backLift = Math.round(kp * 1.2);
      const frontReach = Math.round(kp * 3);
      const frontRaise = Math.round(kp * 2);
      const frontLen = Math.round(kp * 2);
      const backH = Math.max(2, 3 + legA - backLift);
      const frontY = 19 - frontRaise;
      const frontH = Math.max(3, 4 + legB + frontLen);

      paint("#24345a", 3, 20, 4, backH);
      paint("#324975", 4, 20, 2, 2);
      paint("#161118", 3, 20 + backH, 4, 1);
      paint("#2b1f27", 3, 21 + backH, 4, 1);

      paint("#24345a", 7 + frontReach, frontY, 4, frontH);
      paint("#324975", 8 + frontReach, frontY, 2, 2);
      paint("#161118", 8 + frontReach, frontY + frontH, 4, 1);
      paint("#2b1f27", 8 + frontReach, frontY + frontH + 1, 4, 1);
      paint("#efe8dd", 11 + frontReach, frontY + frontH, 1, 1);
    } else {
      paint("#24345a", 3, 20, 4, 3 + legA);
      paint("#324975", 4, 20, 2, 2);
      paint("#24345a", 7, 20, 4, 3 + legB);
      paint("#324975", 8, 20, 2, 2);
      paint("#161118", 3, 23 + legA, 4, 1);
      paint("#161118", 7, 23 + legB, 4, 1);
      paint("#2b1f27", 3, 24 + legA, 4, 1);
      paint("#2b1f27", 7, 24 + legB, 4, 1);
    }

    ctx.restore();
  }

  function drawBoyfriend(x, y) {
    const px = Math.floor(x - cameraX);
    const py = Math.floor(y);
    const paint = (color, dx, dy, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(px + dx, py + dy, w, h);
    };

    // Red cap + side shadowed face.
    paint("#151a24", 1, 0, 10, 1);
    paint("#da3f3f", 2, 1, 8, 3);
    paint("#b72e2e", 2, 3, 9, 1);
    paint("#8e2020", 8, 2, 3, 3);
    paint("#f2d8c7", 4, 4, 6, 5);
    paint("#dfbea9", 4, 8, 6, 1);
    paint("#1d2332", 4, 4, 3, 2);
    paint("#2f3748", 7, 5, 3, 2);
    paint("#f9eee6", 8, 5, 1, 1);
    paint("#7d5445", 6, 8, 2, 1);

    // Hoodie + jacket.
    paint("#212939", 3, 9, 8, 2);
    paint("#3d5f8e", 3, 11, 8, 8);
    paint("#5c80b1", 4, 12, 6, 3);
    paint("#2a3d5a", 6, 12, 1, 7);
    paint("#17202f", 1, 10, 2, 6);
    paint("#17202f", 11, 10, 2, 6);
    paint("#f2d8c7", 2, 15, 1, 2);
    paint("#f2d8c7", 11, 15, 1, 2);

    // Pants + shoes.
    paint("#2b3549", 3, 19, 3, 4);
    paint("#2b3549", 8, 19, 3, 4);
    paint("#202736", 4, 19, 1, 3);
    paint("#202736", 9, 19, 1, 3);
    paint("#191b24", 3, 23, 3, 1);
    paint("#191b24", 8, 23, 3, 1);
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

    ctx.fillStyle = "#121623";
    ctx.fillRect(x, y, 10, 12);
    ctx.fillStyle = "#e9d59f";
    ctx.fillRect(x + 1, y + 1, 8, 2);
    ctx.fillStyle = "#c5a068";
    ctx.fillRect(x + 2, y + 2, 6, 1);
    ctx.fillStyle = "#f7f8fd";
    ctx.fillRect(x + 1, y + 3, 8, 8);
    ctx.fillStyle = "#cdd6e8";
    ctx.fillRect(x + 1, y + 10, 8, 1);
    ctx.fillStyle = "#4770b8";
    ctx.fillRect(x + 2, y + 6, 6, 3);
    ctx.fillStyle = "#eaf4ff";
    ctx.fillRect(x + 3, y + 6, 1, 3);
    ctx.fillRect(x + 4, y + 6, 2, 1);
    ctx.fillRect(x + 5, y + 7, 1, 1);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x + 2, y + 4, 1, 2);
  }

  function drawBikePickup(bike) {
    if (bike.collected) return;
    const x = Math.floor(bike.x - cameraX);
    const y = Math.floor(bike.y + Math.sin(bike.bob) * 1.9);
    const blink = Math.floor(player.anim * 0.18) % 2 === 0;

    ctx.fillStyle = "#0f1220";
    ctx.fillRect(x + 1, y + 8, 3, 3);
    ctx.fillRect(x + 8, y + 8, 3, 3);
    ctx.fillStyle = "#7e97cd";
    ctx.fillRect(x + 2, y + 9, 1, 1);
    ctx.fillRect(x + 9, y + 9, 1, 1);

    ctx.fillStyle = "#ff5f84";
    ctx.fillRect(x + 3, y + 7, 5, 1);
    ctx.fillRect(x + 6, y + 6, 3, 1);
    ctx.fillStyle = "#6ddfff";
    ctx.fillRect(x + 4, y + 6, 2, 1);
    ctx.fillRect(x + 8, y + 5, 2, 1);
    ctx.fillRect(x + 9, y + 4, 1, 1);
    ctx.fillStyle = "#d7f6ff";
    ctx.fillRect(x + 5, y + 5, 2, 1);
    ctx.fillStyle = "#ffd983";
    ctx.fillRect(x + 7, y + 4, 2, 1);
    ctx.fillStyle = "#101626";
    ctx.fillRect(x + 5, y + 7, 1, 2);

    if (blink) {
      ctx.fillStyle = "#ffd97d";
      ctx.fillRect(x + 5, y + 1, 2, 1);
      ctx.fillRect(x + 6, y + 0, 1, 3);
      ctx.fillStyle = "#ff82c5";
      ctx.fillRect(x - 1, y + 3, 1, 1);
      ctx.fillRect(x + 12, y + 4, 1, 1);
    }
  }

  function drawWeaponItem(item) {
    if (item.collected) return;
    const x = Math.floor(item.x - cameraX);
    const y = Math.floor(item.y + Math.sin(item.bob) * 1.6);
    const hammer = item.type === "hammer";

    ctx.fillStyle = hammer ? "#1a2236" : "#2b1821";
    ctx.fillRect(x, y, 12, 12);
    ctx.fillStyle = hammer ? "#6ab3ff" : "#ff88b0";
    ctx.fillRect(x + 1, y + 1, 10, 10);
    ctx.fillStyle = "#151928";
    ctx.fillRect(x + 2, y + 2, 8, 8);

    if (hammer) {
      ctx.fillStyle = "#dce7ff";
      ctx.fillRect(x + 3, y + 3, 6, 3);
      ctx.fillStyle = "#9eb2d8";
      ctx.fillRect(x + 4, y + 4, 4, 1);
      ctx.fillStyle = "#8a5a35";
      ctx.fillRect(x + 6, y + 5, 2, 5);
      ctx.fillStyle = "#5e3b21";
      ctx.fillRect(x + 6, y + 9, 2, 1);
      ctx.fillStyle = "rgba(222, 244, 255, 0.5)";
      ctx.fillRect(x + 2, y + 2, 1, 1);
    } else {
      ctx.fillStyle = "#ffdbe4";
      ctx.fillRect(x + 3, y + 4, 6, 4);
      ctx.fillRect(x + 8, y + 5, 2, 2);
      ctx.fillStyle = "#f3b8cc";
      ctx.fillRect(x + 4, y + 5, 4, 2);
      ctx.fillStyle = "#c97b95";
      ctx.fillRect(x + 3, y + 8, 3, 2);
      ctx.fillStyle = "#ffd89d";
      ctx.fillRect(x + 1, y + 5, 2, 1);
      ctx.fillRect(x + 0, y + 6, 2, 1);
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
    if (proteinRushTimer <= 0 && invincibleTimer <= 0) return;
    const r = clamp(proteinRushTimer / 90, 0, 1);
    const i = clamp(invincibleTimer / INVINCIBLE_DURATION, 0, 1);
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
      const shimmer = 0.18 + Math.sin(player.anim * 0.7) * 0.06;
      ctx.fillStyle = `rgba(255, 80, 80, ${shimmer * i})`;
      ctx.fillRect(px - 6, py - 6, player.w + 12, 2);
      ctx.fillStyle = `rgba(255, 173, 72, ${shimmer * i})`;
      ctx.fillRect(px - 6, py - 3, player.w + 12, 2);
      ctx.fillStyle = `rgba(255, 235, 112, ${shimmer * i})`;
      ctx.fillRect(px - 6, py + 0, player.w + 12, 2);
      ctx.fillStyle = `rgba(95, 232, 160, ${shimmer * i})`;
      ctx.fillRect(px - 6, py + 3, player.w + 12, 2);
      ctx.fillStyle = `rgba(105, 188, 255, ${shimmer * i})`;
      ctx.fillRect(px - 6, py + 6, player.w + 12, 2);
      ctx.fillStyle = `rgba(192, 142, 255, ${shimmer * i})`;
      ctx.fillRect(px - 6, py + 9, player.w + 12, 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.26 * i})`;
      ctx.strokeRect(px - 5, py - 5, player.w + 10, player.h + 10);
    }
  }

  function drawInvincibleBikeRide() {
    if (invincibleTimer <= 0) return;
    const x = Math.floor(player.x - cameraX - 4);
    const y = Math.floor(player.y + 11 + Math.sin(player.anim * 0.24) * 0.5);
    const dir = player.facing;
    const pulse = Math.sin(player.anim * 0.34);
    const shimmer = Math.sin(player.anim * 0.28) * 0.5 + 0.5;
    const rainbow = ["#ff5f8a", "#ffb66d", "#ffe46f", "#80e79a", "#78bcff", "#bf91ff"];

    for (let i = 0; i < rainbow.length; i += 1) {
      const tail = 5 + i * 3 + pulse * 1.6;
      const tx = dir > 0 ? Math.floor(x - tail) : Math.floor(x + 22 + tail);
      ctx.fillStyle = rainbow[i];
      ctx.fillRect(tx, y - 2 + (i % 2), 3, 1);
    }

    ctx.save();
    ctx.globalAlpha = 0.23 + shimmer * 0.18;
    for (let i = 0; i < rainbow.length; i += 1) {
      ctx.fillStyle = rainbow[i];
      ctx.fillRect(x - 4 + i, y - 14 + i * 2, 30 - i * 2, 2);
    }
    ctx.restore();

    const wheelSpin = Math.floor(player.anim * 0.5) % 2;
    ctx.fillStyle = "#0d111a";
    ctx.fillRect(x + 2, y + 7, 5, 5);
    ctx.fillRect(x + 14, y + 7, 5, 5);
    ctx.fillStyle = "#7089b9";
    ctx.fillRect(x + 3 + wheelSpin, y + 9, 1, 1);
    ctx.fillRect(x + 5 - wheelSpin, y + 8, 1, 1);
    ctx.fillRect(x + 15 + wheelSpin, y + 9, 1, 1);
    ctx.fillRect(x + 17 - wheelSpin, y + 8, 1, 1);
    ctx.fillStyle = "#39435a";
    ctx.fillRect(x + 4, y + 8, 1, 3);
    ctx.fillRect(x + 16, y + 8, 1, 3);

    ctx.fillStyle = "#2a3247";
    ctx.fillRect(x + 5, y + 5, 10, 2);
    ctx.fillStyle = "#8ee4ff";
    ctx.fillRect(x + 6, y + 4, 6, 1);
    ctx.fillStyle = "#ffd995";
    ctx.fillRect(x + 12, y + 4, 2, 1);
    ctx.fillStyle = "#87a2d9";
    ctx.fillRect(x + 9, y + 3, 1, 2);
    ctx.fillStyle = "#d6f3ff";
    ctx.fillRect(x + 9, y + 2, 2, 1);
    ctx.fillStyle = "#c04f62";
    ctx.fillRect(x + 8, y + 6, 3, 1);

    ctx.save();
    ctx.translate(x + 6, y - 11);
    if (dir < 0) {
      ctx.translate(12, 0);
      ctx.scale(-1, 1);
    }
    const paint = (color, dx, dy, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(dx, dy, w, h);
    };

    paint("#06070c", 1, 0, 9, 1);
    paint("#0c1020", 0, 1, 11, 3);
    paint("#161f36", 1, 3, 9, 2);
    paint("#f8e9e1", 3, 4, 5, 4);
    paint("#6f4838", 4, 5, 2, 2);
    paint("#6f4838", 6, 5, 1, 2);
    paint("#fff8f4", 4, 5, 1, 1);
    paint("#fff8f4", 6, 5, 1, 1);
    paint("#10141f", 1, 8, 10, 4);
    paint("#1d273c", 2, 8, 8, 3);
    paint("#f4f1ee", 4, 9, 3, 2);
    paint("#24345a", 4, 11, 6, 2);
    paint("#141821", 4, 12, 6, 1);
    paint("#f4e0d3", 1, 9, 1, 2);
    paint("#f4e0d3", 10, 9, 1, 2);
    paint("#0e121d", 0, 8, 1, 3);
    paint("#0e121d", 10, 8, 1, 3);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.38 + shimmer * 0.2;
    for (let i = 0; i < rainbow.length; i += 1) {
      ctx.fillStyle = rainbow[(i + Math.floor(player.anim * 0.04)) % rainbow.length];
      ctx.fillRect(0, i * 2, 11, 2);
    }
    ctx.restore();
  }

  function drawAutoWeaponEffects() {
    if (attackEffectTimer <= 0) return;

    const cx = Math.floor(player.x - cameraX + player.w * 0.5);
    const cy = Math.floor(player.y + 11);
    const mode = attackEffectMode;

    if (mode === "hammer") {
      const dir = player.facing;
      const hx = Math.floor(cx + dir * 8);
      const topY = cy - 15;
      const bottomY = cy + 11;
      const cycle = (Math.sin(attackEffectPhase * 1.9) + 1) * 0.5;
      const hy = Math.floor(topY + (bottomY - topY) * cycle);

      ctx.fillStyle = "rgba(255,220,160,0.28)";
      ctx.fillRect(hx - 2, topY - 2, 4, bottomY - topY + 6);

      ctx.fillStyle = "#c8d3ea";
      ctx.fillRect(hx - 4, hy - 3, 8, 4);
      ctx.fillStyle = "#98a8c4";
      ctx.fillRect(hx - 3, hy - 2, 6, 2);
      ctx.fillStyle = "#6b4a32";
      ctx.fillRect(hx - 1, hy + 1, 2, 8);
      ctx.fillStyle = "#4d331f";
      ctx.fillRect(hx - 1, hy + 8, 2, 2);

      ctx.fillStyle = "rgba(255, 240, 188, 0.5)";
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(hx - 6 + i * 6, hy + 7 + i, 4, 1);
      }
      return;
    }

    if (mode === "glove") {
      const dir = player.facing;
      const startX = dir > 0 ? cx + 7 : cx - 7;
      const gy = cy - 1;
      const phase = player.anim * 0.95;
      const fists = 7;

      for (let i = 0; i < fists; i += 1) {
        const wave = phase * 3.4 + i * 0.9;
        const reach = 5 + i * 3 + Math.sin(wave) * 1.6;
        const fx = startX + dir * reach;
        const fy = gy + (i % 2 === 0 ? -2 : 1) + Math.floor(Math.cos(wave * 1.4) * 1.2);
        const fistX = Math.floor(dir > 0 ? fx : fx - 6);
        const alpha = clamp(0.95 - i * 0.11, 0.2, 0.95);
        const g = clamp(232 - i * 12, 140, 232);
        const b = clamp(232 - i * 8, 150, 232);

        ctx.fillStyle = `rgba(255, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(fistX, fy, 6, 3);
        ctx.fillStyle = `rgba(244, ${clamp(g - 36, 110, 200)}, ${clamp(b - 30, 110, 200)}, ${alpha})`;
        ctx.fillRect(fistX + 1, fy + 1, 4, 1);

        ctx.fillStyle = `rgba(255, 236, 175, ${0.32 - i * 0.03})`;
        if (dir > 0) {
          ctx.fillRect(fistX - 6, fy + 1, 6, 1);
          ctx.fillRect(fistX + 5, fy + 1, 2, 1);
        } else {
          ctx.fillRect(fistX + 6, fy + 1, 6, 1);
          ctx.fillRect(fistX - 1, fy + 1, 2, 1);
        }
      }

      const flashX = Math.floor(startX + dir * (25 + Math.sin(phase * 2.6) * 2));
      ctx.fillStyle = "rgba(255, 245, 188, 0.6)";
      for (let i = 0; i < 4; i += 1) {
        const sx = dir > 0 ? flashX + i * 2 : flashX - i * 2;
        const sy = gy - 2 + i;
        ctx.fillRect(sx, sy, 2, 1);
      }
      return;
    }
  }

  function drawCannon(c) {
    const x = Math.floor(c.x - cameraX);
    const y = Math.floor(c.y);
    const warning = c.active && c.warning;
    const warnBlink = warning && Math.floor((c.cool || 0) / 2) % 2 === 0;
    const flash = (c.muzzleFlash || 0) > 0;
    const muzzleX = c.dir < 0 ? x - 10 : x + 11;
    const muzzleY = y + 1;

    ctx.fillStyle = "#20242f";
    ctx.fillRect(x - 6, y - 4, 14, 11);
    ctx.fillStyle = "#3f4c62";
    ctx.fillRect(x - 5, y - 3, 12, 8);
    ctx.fillStyle = "#667388";
    ctx.fillRect(x - 4, y - 2, 10, 2);

    ctx.fillStyle = warnBlink ? "#786168" : "#4e596d";
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

    if (warnBlink) {
      ctx.fillStyle = "rgba(255, 146, 110, 0.68)";
      for (let i = 0; i < 6; i += 1) {
        const wx = muzzleX + c.dir * (i * 6 + 1);
        ctx.fillRect(wx, muzzleY + (i % 2), 3, 1);
      }
    }

    if (warning || flash) {
      ctx.fillStyle = flash ? "#ffe0b2" : "#ffb18a";
      ctx.fillRect(muzzleX, muzzleY, 2, 2);
      ctx.fillStyle = flash ? "#ff8a54" : "#ff6d5a";
      ctx.fillRect(muzzleX + c.dir, muzzleY, 2, 2);
    }
    if (flash) {
      ctx.fillStyle = "rgba(255, 180, 120, 0.5)";
      ctx.fillRect(muzzleX + c.dir * 2, muzzleY - 1, 4, 4);
    }
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

    for (const block of stage.fallBlocks) {
      drawFallingBlock(block);
    }

    for (const cannon of stage.cannons) {
      drawCannon(cannon);
    }

    for (const protein of stage.proteins) {
      drawProtein(protein);
    }

    for (const bike of stage.bikes) {
      drawBikePickup(bike);
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
      const bx = Math.floor(b.x - cameraX);
      const by = Math.floor(b.y);
      if (b.kind === "cannon") {
        const pulse = Math.floor((player.anim + b.x * 0.04) * 0.26) % 2 === 0;
        ctx.fillStyle = "rgba(255, 98, 98, 0.42)";
        ctx.fillRect(bx - 2, by - 2, b.w + 4, b.h + 4);
        ctx.fillStyle = "#181d2b";
        ctx.fillRect(bx, by, b.w, b.h);
        ctx.fillStyle = pulse ? "#fff0b8" : "#ffd790";
        ctx.fillRect(bx + 2, by + 2, b.w - 4, b.h - 4);
        ctx.fillStyle = "#ff7f52";
        ctx.fillRect(bx + 1, by + 1, 1, b.h - 2);
        const trailDir = b.vx > 0 ? -1 : 1;
        for (let i = 0; i < 3; i += 1) {
          ctx.fillStyle = `rgba(255, 173, 122, ${0.36 - i * 0.1})`;
          ctx.fillRect(bx + trailDir * (3 + i * 3), by + 2, 2, 2);
        }
        continue;
      }

      const enemyShot = b.kind === "enemy";
      ctx.fillStyle = enemyShot ? "#d4c2ff" : "#ffcb67";
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.fillStyle = enemyShot ? "#9f7dff" : "#ffa934";
      ctx.fillRect(bx + 1, by + 1, b.w - 2, b.h - 2);
    }

    drawHitSparks();
    drawBoss();
    drawGoal();
    drawRushAura();
    drawAutoWeaponEffects();
    const hurtBlink = damageInvulnTimer > 0 && Math.floor(damageInvulnTimer / 3) % 2 === 0;
    if (!hurtBlink) {
      if (invincibleTimer > 0) {
        drawInvincibleBikeRide();
      } else {
        drawHero(player.x - cameraX, player.y, player.facing, player.anim, 1);
      }
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

    if (t < 260) {
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
    } else {
      const k = clamp((t - 260) / 430, 0, 1);
      const kidnapX = 120 + k * 120;

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

      const run = Math.sin(t * 0.22) * 1.2;
      drawHero(84 + run, 112, 1, t);

      ctx.fillStyle = "#2d1c21";
      ctx.fillRect(kidnapX, 100, 14, 24);
      ctx.fillStyle = "#8f2e2e";
      ctx.fillRect(kidnapX + 2, 98, 10, 3);

      ctx.fillStyle = "#d44242";
      ctx.fillRect(kidnapX + 14, 108, 8, 3);
      ctx.fillStyle = "#1a1f2a";
      ctx.fillRect(kidnapX + 16, 111, 6, 4);

      if (t < 470) {
        drawTextPanel([
          "悪の組織が彼氏に権利収入と不労所得を甘く勧誘。",
          "断った彼氏はホームパーティー会場へ連行された。",
        ]);
      } else if (t < 650) {
        drawTextPanel([
          "彼氏がさらわれた! りらは会場へ全力ダッシュ。",
          "今すぐ追いかけて救出だ!",
        ]);
      } else {
        drawTextPanel([
          "ターゲットはマンション最上階のホームパーティー会場。",
          "りらの救出作戦が今、始まる。",
        ]);
      }
    }

    ctx.fillStyle = "rgba(0,0,0,0.44)";
    ctx.fillRect(90, 8, 140, 14);
    ctx.fillStyle = "#f4f3ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("タップ / Enter でスキップ", 101, 11);
  }

  function drawPreBossCutscene() {
    const t = preBossCutsceneTimer;
    const approach = clamp(t / 150, 0, 1);
    const party = clamp((t - 120) / 180, 0, 1);
    const descend = clamp((t - 244) / 170, 0, 1);

    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#1a2746";
    for (let i = 0; i < W; i += 16) {
      const h = 36 + ((i / 16) % 5) * 12;
      ctx.fillRect(i, 124 - h, 11, h);
      if ((i / 16) % 2 === 0) {
        ctx.fillStyle = "#7ce2ff";
        ctx.fillRect(i + 2, 124 - h + 8, 2, 2);
        ctx.fillStyle = "#1a2746";
      }
    }

    const mx = 172;
    const my = 48;
    ctx.fillStyle = "#22293b";
    ctx.fillRect(mx, my, 104, 112);
    ctx.fillStyle = "#2f3952";
    ctx.fillRect(mx + 4, my + 4, 96, 104);
    ctx.fillStyle = "#455173";
    ctx.fillRect(mx + 10, my + 10, 84, 18);
    ctx.fillStyle = "#6ad7ff";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(mx + 14 + i * 12, my + 16, 4, 4);
    }

    ctx.fillStyle = "#2a1e24";
    ctx.fillRect(mx + 39, my + 64, 26, 40);
    ctx.fillStyle = "#8f2b58";
    ctx.fillRect(mx + 37, my + 62, 30, 3);

    ctx.fillStyle = "#262d3b";
    ctx.fillRect(0, 132, W, 48);
    ctx.fillStyle = "#4f5d73";
    for (let i = 0; i < W; i += 18) ctx.fillRect(i, 140, 10, 1);

    const heroX = 38 + approach * 122;
    drawHero(heroX, 112, 1, t * 1.3);

    if (t > 128) {
      const open = clamp((t - 128) / 34, 0, 1);
      const doorW = Math.max(8, Math.floor(26 - open * 16));
      ctx.fillStyle = "#11141d";
      ctx.fillRect(mx + 39, my + 64, doorW, 40);
      ctx.fillStyle = "rgba(255, 220, 170, 0.18)";
      ctx.fillRect(mx + 39 + doorW, my + 64, 26 - doorW, 40);
    }

    if (party > 0.02) {
      const roomX = mx + 12;
      const roomY = my + 40;
      const roomW = 80;
      const roomH = 54;
      ctx.fillStyle = `rgba(72, 30, 84, ${0.48 + party * 0.3})`;
      ctx.fillRect(roomX, roomY, roomW, roomH);

      const pulse = 0.18 + (Math.sin(t * 0.24) * 0.5 + 0.5) * 0.22;
      ctx.fillStyle = `rgba(255, 116, 198, ${pulse})`;
      ctx.fillRect(roomX + 2, roomY + 3, roomW - 4, 2);
      ctx.fillStyle = `rgba(112, 208, 255, ${pulse * 0.9})`;
      ctx.fillRect(roomX + 2, roomY + 9, roomW - 4, 1);

      // Party silhouettes.
      const guests = [roomX + 10, roomX + 24, roomX + 55, roomX + 68];
      for (const gx of guests) {
        ctx.fillStyle = "#1d2032";
        ctx.fillRect(gx, roomY + 26, 8, 20);
        ctx.fillStyle = "#2f3350";
        ctx.fillRect(gx + 1, roomY + 25, 6, 2);
      }

      ctx.fillStyle = "#3a2f28";
      ctx.fillRect(roomX + 28, roomY + 36, 24, 6);
      ctx.fillStyle = "#bb8e67";
      ctx.fillRect(roomX + 30, roomY + 34, 20, 2);
      ctx.fillStyle = "#f2d5a8";
      ctx.fillRect(roomX + 33, roomY + 33, 2, 1);
      ctx.fillRect(roomX + 45, roomY + 33, 2, 1);
    }

    if (descend > 0.01) {
      const beamX = mx + 52;
      const beamTop = 0;
      const beamBottom = my + 90;
      const beamW = 12 + Math.sin(t * 0.35) * 2;
      ctx.fillStyle = `rgba(236, 246, 255, ${0.16 + descend * 0.28})`;
      ctx.fillRect(beamX - beamW, beamTop, beamW * 2, beamBottom);
      ctx.fillStyle = `rgba(255, 242, 196, ${0.14 + descend * 0.22})`;
      ctx.fillRect(beamX - 4, beamTop, 8, beamBottom);

      for (let i = 0; i < 4; i += 1) {
        const lx = beamX - 18 + i * 12 + Math.sin((t + i * 22) * 0.2) * 2;
        ctx.fillStyle = "rgba(210, 236, 255, 0.42)";
        ctx.fillRect(Math.floor(lx), Math.floor(26 + i * 10), 2, 8);
      }

      const godY = my - 22 + descend * 42;
      ctx.fillStyle = "#f6f8ff";
      ctx.fillRect(beamX - 8, Math.floor(godY), 16, 8);
      ctx.fillStyle = "#e5ebf9";
      ctx.fillRect(beamX - 7, Math.floor(godY + 1), 14, 5);
      ctx.fillStyle = "#f2dec5";
      ctx.fillRect(beamX - 4, Math.floor(godY + 7), 8, 6);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(beamX - 6, Math.floor(godY + 11), 12, 6);
      ctx.fillStyle = "#d7dff2";
      ctx.fillRect(beamX - 4, Math.floor(godY + 12), 8, 2);
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(beamX - 7, Math.floor(godY + 15), 14, 8);
      ctx.fillStyle = "#dee6f8";
      ctx.fillRect(beamX - 5, Math.floor(godY + 16), 10, 4);
      ctx.fillStyle = "#f5d785";
      ctx.fillRect(beamX - 5, Math.floor(godY - 3), 10, 2);
    }

    if (t < 180) {
      drawTextPanel(["マンションのホームパーティー会場に到着。"]);
    } else if (t < 330) {
      drawTextPanel(["会場では怪しい勧誘会が始まっていた。"]);
    } else {
      drawTextPanel(["ホームパーティーで白ヒゲの神が降臨。"], 136);
    }

    ctx.fillStyle = "rgba(0,0,0,0.44)";
    ctx.fillRect(90, 8, 140, 14);
    ctx.fillStyle = "#f4f3ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("タップ / Enter でスキップ", 101, 11);
  }

  function drawHUD() {
    const hudH = 18;
    ctx.fillStyle = "rgba(9, 8, 12, 0.74)";
    ctx.fillRect(0, 0, W, hudH);

    ctx.fillStyle = "#f7f1ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(`D${deaths}`, 5, 4);
    ctx.fillText(`P${collectedProteinIds.size}`, 24, 4);
    ctx.fillText(`L${playerLives}`, 41, 4);

    for (let i = 0; i < MAX_HEARTS; i += 1) {
      drawHeartIcon(50 + i * 10, 5, i < playerHearts);
    }

    if (gameState === STATE.BOSS && stage.boss.active) {
      const barX = 116;
      const barY = 6;
      const barW = 86;
      const ratio = clamp(stage.boss.hp / stage.boss.maxHp, 0, 1);
      ctx.fillStyle = "#2a1314";
      ctx.fillRect(barX, barY, barW, 6);
      ctx.fillStyle = "#e25555";
      ctx.fillRect(barX + 1, barY + 1, Math.floor((barW - 2) * ratio), 4);
      ctx.fillStyle = "#f7f1ff";
    }

    if (hammerTimer > 0) {
      ctx.fillText(`HAM ${Math.ceil(hammerTimer / 60)}`, 208, 4);
    } else if (gloveTimer > 0) {
      ctx.fillText(`GLV ${Math.ceil(gloveTimer / 60)}`, 208, 4);
    }

    if (invincibleTimer > 0) {
      ctx.fillStyle = "#ffe7a8";
      ctx.fillText(`INV ${Math.ceil(invincibleTimer / 60)}`, 266, 4);
      ctx.fillStyle = "#f7f1ff";
    }

    if (hurtFlashTimer > 0 && (gameState === STATE.PLAY || gameState === STATE.BOSS)) {
      const flash = clamp(hurtFlashTimer / 24, 0, 1);
      ctx.fillStyle = `rgba(255, 130, 130, ${0.18 * flash})`;
      ctx.fillRect(0, hudH, W, H - hudH);
    }
  }

  function drawDeadOverlay() {
    const flashRatio = clamp(deathFlashTimer / 34, 0, 1);
    const blink = Math.floor((deadTimer + 12) / 5) % 2 === 0;

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
    ctx.fillText("MISS!   LIFE -1", 108, 98);
    ctx.fillText(`残機 x${playerLives}`, 126, 110);

    if (playerLives > 0) {
      const c = Math.max(1, Math.ceil(deadTimer / 60));
      ctx.fillText(`再開まで ${c}...`, 120, 122);

      const ratio = deadTimerMax > 0 ? clamp(deadTimer / deadTimerMax, 0, 1) : 0;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(88, 133, 144, 5);
      ctx.fillStyle = "#ffd29b";
      ctx.fillRect(89, 134, Math.floor((142) * (1 - ratio)), 3);
    } else {
      ctx.fillStyle = blink ? "#ffe5b6" : "#cda977";
      ctx.fillText("GAME OVER", 122, 122);
    }
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

    if (gameState === STATE.PRE_BOSS) {
      drawPreBossCutscene();
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
  bindHoldButton("btn-attack", "attack");

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    unlockAudio();

    if (gameState === STATE.CUTSCENE) {
      startGameplay(true);
      return;
    }

    if (gameState === STATE.PRE_BOSS) {
      startBossBattle();
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
      return;
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
    KeyJ: "attack",
    KeyF: "attack",
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
    input.attack = false;
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
