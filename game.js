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
    TITLE: "title",
    CUTSCENE: "cutscene",
    PRE_BOSS: "pre_boss",
    PLAY: "play",
    BOSS: "boss",
    DEAD: "dead",
    CLEAR: "clear",
  };

  let BOSS_ARENA = {
    minX: 8340,
    maxX: 8660,
  };
  const FINAL_STAGE_NUMBER = 2;
  const MAX_HEARTS = 5;
  const START_LIVES = 5;

  const input = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    special: false,
    start: false,
  };

  const prevInput = {
    jump: false,
    attack: false,
    special: false,
    start: false,
  };

  let gameState = STATE.TITLE;
  let titleTimer = 0;
  let cutsceneTime = 0;
  let preBossCutsceneTimer = 0;
  let deadTimer = 0;
  let deadTimerMax = 0;
  let clearTimer = 0;
  let deaths = 0;
  let cameraX = 0;

  let hudMessage = "";
  let hudTimer = 0;
  let deathContinueMode = "checkpoint";

  let checkpointIndex = 0;
  let currentStageNumber = 1;
  let collectedProteinIds = new Set();
  let collectedLifeUpIds = new Set();
  let stage = buildStage();
  let player = createPlayer(stage.checkpoints[0].x, stage.checkpoints[0].y);
  let playerHearts = MAX_HEARTS;
  let playerLives = START_LIVES;
  let damageInvulnTimer = 0;
  let hurtFlashTimer = 0;
  let proteinRushTimer = 0;
  let proteinBurstGauge = 0;
  let proteinBurstTimer = 0;
  let proteinBurstBlastDone = false;
  let proteinBurstLaserTimer = 0;
  let proteinBurstLaserPhase = 0;
  let proteinBurstUsedGauge = 0;
  let proteinBurstPower = 1;
  let invincibleTimer = 0;
  let invincibleHitCooldown = 0;
  let impactShakeTimer = 0;
  let impactShakePower = 0;
  let hitStopTimer = 0;
  let stompChainGuardTimer = 0;
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
  let attackChargeTimer = 0;
  let attackChargeReadyPlayed = false;
  let attackMashCount = 0;
  let attackMashTimer = 0;
  let hyakuretsuTimer = 0;
  let hyakuretsuHitTimer = 0;
  let attackEffectTimer = 0;
  let attackEffectMode = "none";
  let attackEffectPhase = 0;
  let attackEffectPower = 0;
  let waveFlashTimer = 0;
  let waveFlashPower = 0;
  let waveFlashX = 0;
  let waveFlashY = 0;
  let waveBursts = [];
  let hitSparks = [];
  let invincibleBonusPops = [];
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
  let pendingStageResumeAfterInvincible = false;
  let audioUnlockedByUser = false;
  let openingThemeMutedAutoplayTried = false;
  let rilaVoiceNextAt = 0;
  let enemyDefeatSeNextAt = 0;
  let uiSeNextAt = 0;
  let parrySeNextAt = 0;
  let jumpSeNextAt = 0;
  let landSeNextAt = 0;
  let shootSeNextAt = 0;
  let waveSeNextAt = 0;
  let waveReadySeNextAt = 0;
  let invincibleExtendSeNextAt = 0;
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
  const CLEAR_BGM_VOL = 0.4;
  const SE_GAIN_BOOST = 1.42;
  const INVINCIBLE_DURATION = 900;
  const INVINCIBLE_KILL_EXTEND_FRAMES = 60;
  const INVINCIBLE_BONUS_POP_LIFE = 44;
  const INVINCIBLE_BGM_FADE_SEC = 1.2;
  const STAGE_BGM_PATH = "assets/stage_bgm.mp3";
  const INVINCIBLE_BGM_PATH = "assets/invincible_bgm.mp3";
  const WEAPON_DURATION = 600;
  const PROTEIN_BURST_REQUIRE = 15;
  const PROTEIN_BURST_MIN = Math.ceil(PROTEIN_BURST_REQUIRE * 0.5);
  const PROTEIN_BURST_DURATION = 98;
  const PROTEIN_BURST_BLAST_AT = 0.38;
  const PROTEIN_BURST_TOP_Y = 30;
  const PROTEIN_BURST_LASER_DURATION = 56;
  const OPENING_CUTSCENE_DURATION = 760;
  const PRE_BOSS_CUTSCENE_DURATION = 460;
  const PRE_BOSS_ENTRY_DURATION = 78;
  const PRE_BOSS_MOVIE_START_AT = 230;
  const CANNON_BULLET_SPEED = 1.3;
  const CANNON_WARN_WINDOW = 24;
  const CANNON_EXTRA_COOLDOWN = 26;
  const DASH_JUMP_MIN_SPEED = 1.2;
  const DASH_JUMP_VX_BONUS = 0.88;
  const DASH_JUMP_VY_BONUS = 0.46;
  const DASH_JUMP_ASSIST_FRAMES = 20;
  const DASH_JUMP_SPEED_CAP_MULT = 1.45;
  const DASH_JUMP_GRAVITY_MULT = 0.84;
  const ATTACK_CHARGE_MAX = 132;
  const ATTACK_WAVE_CHARGE_MIN = ATTACK_CHARGE_MAX;
  const ATTACK_SPEAR_CHARGE_MIN = ATTACK_CHARGE_MAX * 0.55;
  const ATTACK_COMBO_TAP_MAX = 14;
  const ATTACK_PUNCH_COOLDOWN = 10;
  const ATTACK_WAVE_COOLDOWN = 28;
  const ATTACK_MASH_WINDOW = 42;
  const ATTACK_MASH_TRIGGER = 4;
  const HYAKURETSU_DURATION = 40;
  const HYAKURETSU_HIT_INTERVAL = 2;
  const HYAKURETSU_POST_COOLDOWN = 10;
  const STOMP_VERTICAL_GRACE = 16;
  const STOMP_SIDE_GRACE = 6;
  const STOMP_DESCEND_MIN = -0.25;
  const STOMP_CHAIN_GUARD_FRAMES = 16;

  function proteinLevel() {
    return collectedProteinIds.size;
  }

  function powerFactor() {
    return 1;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function seLevel(v) {
    return Math.max(0.0001, v * SE_GAIN_BOOST);
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

  function resumeStageMusicAfterInvincible() {
    if (gameState !== STATE.PLAY) return;

    ensureStageMusic();
    if (!stageMusic) return;
    stageMusicFadeTimer = 0;
    stageMusicFadeDuration = 0;
    try {
      stageMusic.pause();
      stageMusic.currentTime = 0;
      stageMusic.muted = false;
      if ("playbackRate" in stageMusic) stageMusic.playbackRate = 1;
      if ("defaultPlaybackRate" in stageMusic) stageMusic.defaultPlaybackRate = 1;
      if ("preservesPitch" in stageMusic) stageMusic.preservesPitch = true;
      if ("webkitPreservesPitch" in stageMusic) stageMusic.webkitPreservesPitch = true;
      if ("mozPreservesPitch" in stageMusic) stageMusic.mozPreservesPitch = true;
      stageMusic.volume = 0;
      stageMusic.play().catch(() => {});
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
    setBgmVolume(BGM_NORMAL_VOL, INVINCIBLE_BGM_FADE_SEC);
  }

  function stopInvincibleMusic(clearPendingResume = true) {
    if (!invincibleMusic) return;
    openingThemeActive = false;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;
    if (clearPendingResume) {
      pendingStageResumeAfterInvincible = false;
    }
    try {
      invincibleMusic.pause();
      invincibleMusic.currentTime = 0;
      invincibleMusic.muted = false;
      invincibleMusic.volume = INVINCIBLE_BGM_VOL;
    } catch (_e) {
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function startInvincibleMusicFadeOut(seconds = INVINCIBLE_BGM_FADE_SEC) {
    if (!invincibleMusic || invincibleMusic.paused) {
      const shouldResume = pendingStageResumeAfterInvincible;
      stopInvincibleMusic(false);
      pendingStageResumeAfterInvincible = false;
      if (shouldResume) {
        resumeStageMusicAfterInvincible();
      }
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
      const shouldResume = pendingStageResumeAfterInvincible;
      stopInvincibleMusic(false);
      pendingStageResumeAfterInvincible = false;
      if (shouldResume) {
        resumeStageMusicAfterInvincible();
      }
    }
  }

  function startInvincibleMode(duration = INVINCIBLE_DURATION) {
    if (invincibleTimer > 0) return false;
    invincibleTimer = duration;
    openingThemeActive = false;
    pendingStageResumeAfterInvincible = false;
    stopStageMusic(false);
    ensureInvincibleMusic();
    if (!invincibleMusic) return true;
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
    return true;
  }

  function endInvincibleMode() {
    if (invincibleTimer > 0) return;
    pendingStageResumeAfterInvincible = false;
    resumeStageMusicAfterInvincible();
    startInvincibleMusicFadeOut(INVINCIBLE_BGM_FADE_SEC);
  }

  function startOpeningTheme() {
    if (gameState !== STATE.TITLE && gameState !== STATE.CUTSCENE && gameState !== STATE.PRE_BOSS) return;
    ensureInvincibleMusic();
    if (!invincibleMusic) return;
    if (!audioUnlockedByUser && openingThemeMutedAutoplayTried && invincibleMusic.paused) return;
    if (openingThemeActive && !invincibleMusic.paused) return;

    openingThemeActive = true;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;
    stopStageMusic(true);

    try {
      invincibleMusic.muted = false;
      invincibleMusic.volume = INVINCIBLE_BGM_VOL;
      invincibleMusic.currentTime = 0;
      const starting = invincibleMusic.play();
      if (starting && typeof starting.then === "function") {
        starting.catch(() => {
          if (!audioUnlockedByUser && !openingThemeMutedAutoplayTried) {
            openingThemeMutedAutoplayTried = true;
            try {
              invincibleMusic.currentTime = 0;
              invincibleMusic.muted = true;
              invincibleMusic.volume = INVINCIBLE_BGM_VOL;
              const mutedStart = invincibleMusic.play();
              if (mutedStart && typeof mutedStart.then === "function") {
                mutedStart.then(() => {
                  try {
                    invincibleMusic.muted = false;
                    invincibleMusic.volume = INVINCIBLE_BGM_VOL;
                  } catch (_e) {
                    // Ignore media errors and keep gameplay responsive.
                  }
                }).catch(() => {
                  openingThemeActive = false;
                  try {
                    invincibleMusic.muted = false;
                  } catch (_e) {
                    // Ignore media errors and keep gameplay responsive.
                  }
                });
              } else {
                invincibleMusic.muted = false;
                invincibleMusic.volume = INVINCIBLE_BGM_VOL;
              }
            } catch (_e) {
              openingThemeActive = false;
              try {
                invincibleMusic.muted = false;
              } catch (_e2) {
                // Ignore media errors and keep gameplay responsive.
              }
            }
          } else {
            openingThemeActive = false;
          }
        });
      }
    } catch (_e) {
      openingThemeActive = false;
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function startBossTheme() {
    openingThemeActive = true;
    pendingStageResumeAfterInvincible = false;
    ensureInvincibleMusic();
    if (!invincibleMusic) return;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;
    stopStageMusic(true);

    try {
      invincibleMusic.muted = false;
      invincibleMusic.volume = INVINCIBLE_BGM_VOL;
      invincibleMusic.currentTime = 0;
      invincibleMusic.play().catch(() => {});
    } catch (_e) {
      openingThemeActive = false;
      startStageMusic(true);
      setBgmVolume(0, 0);
      setBgmVolume(BGM_NORMAL_VOL, 0.12);
      // Ignore media errors and keep gameplay responsive.
    }
  }

  function startClearTheme() {
    openingThemeActive = false;
    pendingStageResumeAfterInvincible = false;
    stopStageMusic(true);
    ensureInvincibleMusic();
    if (!invincibleMusic) return;
    invincibleMusicFadeTimer = 0;
    invincibleMusicFadeDuration = 0;

    try {
      invincibleMusic.pause();
      invincibleMusic.currentTime = 0;
      invincibleMusic.muted = false;
      invincibleMusic.volume = CLEAR_BGM_VOL;
      invincibleMusic.play().catch(() => {});
    } catch (_e) {
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
    audioUnlockedByUser = true;
    openingThemeMutedAutoplayTried = false;

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

    if (gameState === STATE.TITLE || gameState === STATE.CUTSCENE || gameState === STATE.PRE_BOSS) {
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
    toneGain.gain.exponentialRampToValueAtTime(seLevel(0.12), now + 0.012);
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
      burstGain.gain.exponentialRampToValueAtTime(seLevel(0.1), now + 0.01);
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
      leadGain.gain.exponentialRampToValueAtTime(seLevel(0.11), t + 0.008);
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
      bassGain.gain.exponentialRampToValueAtTime(seLevel(0.07), t + 0.01);
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
    gain.gain.exponentialRampToValueAtTime(seLevel(0.09), now + 0.008);
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
    gain.gain.exponentialRampToValueAtTime(seLevel(0.09), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  function playInvincibleExtendSfx(power = 1) {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < invincibleExtendSeNextAt) return;
    invincibleExtendSeNextAt = now + 0.042;
    const p = clamp(power, 0.8, 5);

    const lead = audioCtx.createOscillator();
    const leadGain = audioCtx.createGain();
    lead.type = "square";
    lead.frequency.setValueAtTime(700 + p * 58, now);
    lead.frequency.exponentialRampToValueAtTime(1280 + p * 44, now + 0.09);
    leadGain.gain.setValueAtTime(0.0001, now);
    leadGain.gain.exponentialRampToValueAtTime(seLevel(0.082), now + 0.004);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    lead.connect(leadGain);
    leadGain.connect(audioCtx.destination);
    lead.start(now);
    lead.stop(now + 0.12);

    const sparkle = audioCtx.createOscillator();
    const sparkleGain = audioCtx.createGain();
    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(980 + p * 42, now + 0.015);
    sparkle.frequency.exponentialRampToValueAtTime(1520 + p * 36, now + 0.08);
    sparkleGain.gain.setValueAtTime(0.0001, now + 0.01);
    sparkleGain.gain.exponentialRampToValueAtTime(seLevel(0.058), now + 0.03);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(audioCtx.destination);
    sparkle.start(now + 0.01);
    sparkle.stop(now + 0.13);

    if (bgmNoiseBuffer) {
      const src = audioCtx.createBufferSource();
      const bp = audioCtx.createBiquadFilter();
      const ng = audioCtx.createGain();
      src.buffer = bgmNoiseBuffer;
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(2200, now);
      bp.Q.setValueAtTime(1.2, now);
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(seLevel(0.032), now + 0.003);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(audioCtx.destination);
      src.start(now);
      src.stop(now + 0.06);
    }
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
    toneGain.gain.exponentialRampToValueAtTime(seLevel(0.12), now + 0.004);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    tone.connect(toneGain);
    toneGain.connect(audioCtx.destination);
    tone.start(now);
    tone.stop(now + 0.1);

    const punch = audioCtx.createOscillator();
    const punchGain = audioCtx.createGain();
    punch.type = "triangle";
    punch.frequency.setValueAtTime(140 + power * 32, now);
    punch.frequency.exponentialRampToValueAtTime(72, now + 0.08);
    punchGain.gain.setValueAtTime(0.0001, now);
    punchGain.gain.exponentialRampToValueAtTime(seLevel(0.08), now + 0.006);
    punchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    punch.connect(punchGain);
    punchGain.connect(audioCtx.destination);
    punch.start(now);
    punch.stop(now + 0.11);

    if (bgmNoiseBuffer) {
      const src = audioCtx.createBufferSource();
      const bp = audioCtx.createBiquadFilter();
      const ng = audioCtx.createGain();
      src.buffer = bgmNoiseBuffer;
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1500 + power * 80, now);
      bp.Q.setValueAtTime(0.9, now);
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(seLevel(0.05), now + 0.003);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(audioCtx.destination);
      src.start(now);
      src.stop(now + 0.06);
    }
  }

  function playEnemyDefeatSfx(power = 1) {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < enemyDefeatSeNextAt) return;
    enemyDefeatSeNextAt = now + 0.045;
    const p = clamp(power, 0.8, 5.2);

    const lead = audioCtx.createOscillator();
    const leadGain = audioCtx.createGain();
    lead.type = "square";
    lead.frequency.setValueAtTime(390 + p * 70, now);
    lead.frequency.exponentialRampToValueAtTime(150 + p * 26, now + 0.11);
    leadGain.gain.setValueAtTime(0.0001, now);
    leadGain.gain.exponentialRampToValueAtTime(seLevel(0.095), now + 0.006);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    lead.connect(leadGain);
    leadGain.connect(audioCtx.destination);
    lead.start(now);
    lead.stop(now + 0.13);

    const bass = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bass.type = "triangle";
    bass.frequency.setValueAtTime(180 + p * 24, now);
    bass.frequency.exponentialRampToValueAtTime(84, now + 0.13);
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.exponentialRampToValueAtTime(seLevel(0.055), now + 0.01);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    bass.connect(bassGain);
    bassGain.connect(audioCtx.destination);
    bass.start(now);
    bass.stop(now + 0.15);

    if (bgmNoiseBuffer) {
      const src = audioCtx.createBufferSource();
      const hp = audioCtx.createBiquadFilter();
      const ng = audioCtx.createGain();
      src.buffer = bgmNoiseBuffer;
      hp.type = "highpass";
      hp.frequency.setValueAtTime(1200, now);
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(seLevel(0.045), now + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(audioCtx.destination);
      src.start(now);
      src.stop(now + 0.07);
    }
  }

  function playParrySfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < parrySeNextAt) return;
    parrySeNextAt = now + 0.055;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(seLevel(0.075), now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  function playCheckpointSfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < uiSeNextAt) return;
    uiSeNextAt = now + 0.1;

    const notes = [660, 880, 1040];
    for (let i = 0; i < notes.length; i += 1) {
      const t = now + i * 0.045;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[i], t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(seLevel(0.06), t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  function playUiStartSfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < uiSeNextAt) return;
    uiSeNextAt = now + 0.11;

    const notes = [520, 700, 920];
    for (let i = 0; i < notes.length; i += 1) {
      const t = now + i * 0.03;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(notes[i], t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(seLevel(0.065), t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.065);
    }
  }

  function playBossStartSfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.2);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(seLevel(0.105), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    if (bgmNoiseBuffer) {
      const src = audioCtx.createBufferSource();
      const bp = audioCtx.createBiquadFilter();
      const ng = audioCtx.createGain();
      src.buffer = bgmNoiseBuffer;
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(420, now);
      bp.Q.setValueAtTime(0.7, now);
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(seLevel(0.055), now + 0.01);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(audioCtx.destination);
      src.start(now);
      src.stop(now + 0.17);
    }
  }

  function playJumpSfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < jumpSeNextAt) return;
    jumpSeNextAt = now + 0.06;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(seLevel(0.07), now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  function playLandSfx(intensity = 1) {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < landSeNextAt) return;
    landSeNextAt = now + 0.08;

    const p = clamp(intensity, 0.6, 2.4);
    const thump = audioCtx.createOscillator();
    const thumpGain = audioCtx.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(180 + p * 24, now);
    thump.frequency.exponentialRampToValueAtTime(72, now + 0.11);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(seLevel(0.06 + p * 0.01), now + 0.006);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    thump.connect(thumpGain);
    thumpGain.connect(audioCtx.destination);
    thump.start(now);
    thump.stop(now + 0.13);

    if (bgmNoiseBuffer) {
      const src = audioCtx.createBufferSource();
      const bp = audioCtx.createBiquadFilter();
      const ng = audioCtx.createGain();
      src.buffer = bgmNoiseBuffer;
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(520, now);
      bp.Q.setValueAtTime(0.8, now);
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(seLevel(0.03 + p * 0.006), now + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(audioCtx.destination);
      src.start(now);
      src.stop(now + 0.09);
    }
  }

  function playProjectileSfx(kind = "enemy") {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < shootSeNextAt) return;
    shootSeNextAt = now + 0.03;

    const cannon = kind === "cannon";
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = cannon ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(cannon ? 280 : 760, now);
    osc.frequency.exponentialRampToValueAtTime(cannon ? 160 : 420, now + 0.06);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(seLevel(cannon ? 0.065 : 0.055), now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  function playWaveShotSfx(power = 1) {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < waveSeNextAt) return;
    waveSeNextAt = now + 0.08;

    const p = clamp(power, 0.2, 1.2);
    const lead = audioCtx.createOscillator();
    const leadGain = audioCtx.createGain();
    lead.type = "sawtooth";
    lead.frequency.setValueAtTime(640 + p * 260, now);
    lead.frequency.exponentialRampToValueAtTime(240 + p * 70, now + 0.16);
    leadGain.gain.setValueAtTime(0.0001, now);
    leadGain.gain.exponentialRampToValueAtTime(seLevel(0.115), now + 0.006);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    lead.connect(leadGain);
    leadGain.connect(audioCtx.destination);
    lead.start(now);
    lead.stop(now + 0.18);

    const sub = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    sub.type = "triangle";
    sub.frequency.setValueAtTime(220 + p * 70, now);
    sub.frequency.exponentialRampToValueAtTime(88, now + 0.18);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(seLevel(0.062), now + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    sub.connect(subGain);
    subGain.connect(audioCtx.destination);
    sub.start(now);
    sub.stop(now + 0.2);

    const spark = audioCtx.createOscillator();
    const sparkGain = audioCtx.createGain();
    spark.type = "square";
    spark.frequency.setValueAtTime(1500 + p * 420, now);
    spark.frequency.exponentialRampToValueAtTime(620 + p * 150, now + 0.1);
    sparkGain.gain.setValueAtTime(0.0001, now);
    sparkGain.gain.exponentialRampToValueAtTime(seLevel(0.05 + p * 0.014), now + 0.004);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    spark.connect(sparkGain);
    sparkGain.connect(audioCtx.destination);
    spark.start(now);
    spark.stop(now + 0.12);

    if (bgmNoiseBuffer) {
      const src = audioCtx.createBufferSource();
      const hp = audioCtx.createBiquadFilter();
      const ng = audioCtx.createGain();
      src.buffer = bgmNoiseBuffer;
      hp.type = "highpass";
      hp.frequency.setValueAtTime(1400, now);
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.exponentialRampToValueAtTime(seLevel(0.052 + p * 0.024), now + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(audioCtx.destination);
      src.start(now);
      src.stop(now + 0.1);
    }
  }

  function playChargeReadySfx() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    if (now < waveReadySeNextAt) return;
    waveReadySeNextAt = now + 0.18;

    const notes = [920, 1220];
    for (let i = 0; i < notes.length; i += 1) {
      const t = now + i * 0.04;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(notes[i], t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(seLevel(0.06), t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }
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
    gain.gain.exponentialRampToValueAtTime(seLevel(hurt ? 0.13 : 0.11), now + 0.01);
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

  function spawnEnemyBlood(x, y, power = 1) {
    const p = clamp(power, 0.9, 5.4);
    const count = 20 + Math.floor(p * 8);
    const palette = [
      { color: "#ff5a6e", dark: "#6f0a16" },
      { color: "#d51a2d", dark: "#560710" },
      { color: "#b70f22", dark: "#43050d" },
      { color: "#8f0a1b", dark: "#2a0308" },
    ];
    for (let i = 0; i < count; i += 1) {
      const tone = palette[Math.floor(Math.random() * palette.length)];
      const spray = Math.random();
      const speedMul = spray < 0.22 ? 1.55 : spray < 0.68 ? 1.06 : 0.78;
      const side = Math.random() * 2 - 1;
      const vx = side * speedMul * (0.9 + Math.random() * (1.55 + p * 0.42));
      const vy = -(0.9 + Math.random() * (2.1 + p * 0.5)) * speedMul;
      const size = spray < 0.16 ? 3 : spray < 0.56 ? 2 : 1;
      const life = 22 + Math.random() * (14 + p * 3);
      hitSparks.push({
        kind: "blood",
        x: x + side * (1.2 + Math.random() * 2.8),
        y: y + (Math.random() * 2 - 1) * (0.8 + p * 0.25),
        vx,
        vy,
        life,
        maxLife: life,
        size,
        stretch: 1.3 + Math.random() * 2.8 + p * 0.22,
        gravity: 0.23 + Math.random() * 0.13 + p * 0.02,
        drag: 0.89 + Math.random() * 0.05,
        splatted: false,
        poolW: 0,
        poolH: 0,
        color: tone.color,
        darkColor: tone.dark,
      });
    }

    const mistCount = 8 + Math.floor(p * 2);
    for (let i = 0; i < mistCount; i += 1) {
      const side = Math.random() * 2 - 1;
      const tone = Math.random() < 0.5 ? "#ff6a74" : "#c71326";
      const life = 8 + Math.random() * 8;
      hitSparks.push({
        kind: "blood",
        x: x + side * (0.4 + Math.random() * 1.3),
        y: y + (Math.random() * 2 - 1) * 0.7,
        vx: side * (0.8 + Math.random() * 1.5),
        vy: -(0.6 + Math.random() * 1.4),
        life,
        maxLife: life,
        size: 1,
        stretch: 0.9 + Math.random() * 1.4,
        gravity: 0.18 + Math.random() * 0.08,
        drag: 0.92 + Math.random() * 0.04,
        splatted: false,
        poolW: 0,
        poolH: 0,
        color: tone,
        darkColor: "#5c0912",
      });
    }
  }

  function spawnWaveBurst(x, y, power = 1) {
    const p = clamp(power, 0.5, 2.6);
    waveBursts.push({
      x,
      y,
      life: 18 + p * 8,
      maxLife: 18 + p * 8,
      radius: 6 + p * 9,
      phase: Math.random() * Math.PI * 2,
      power: p,
    });
  }

  function triggerImpact(intensity, x, y, hitStop = 0) {
    impactShakeTimer = Math.max(impactShakeTimer, 7 + intensity * 3.2);
    impactShakePower = Math.max(impactShakePower, 0.5 + intensity * 0.55);
    if (hitStop > 0) {
      hitStopTimer = Math.max(hitStopTimer, hitStop);
    }
    spawnHitSparks(x, y);
  }

  function triggerProteinBurst() {
    if (proteinBurstTimer > 0) return false;
    if (proteinBurstGauge < PROTEIN_BURST_MIN) return false;

    const spentGauge = proteinBurstGauge;
    const gaugeRatio = clamp(
      (spentGauge - PROTEIN_BURST_MIN) / Math.max(1, PROTEIN_BURST_REQUIRE - PROTEIN_BURST_MIN),
      0,
      1
    );
    proteinBurstUsedGauge = spentGauge;
    proteinBurstPower = 0.9 + gaugeRatio * 1.1;

    proteinBurstGauge = 0;
    proteinBurstTimer = PROTEIN_BURST_DURATION;
    proteinBurstBlastDone = false;
    player.vx *= 0.4;
    player.vy = Math.min(player.vy, -8.1 - gaugeRatio * 1.3);
    player.onGround = false;
    attackCooldown = 0;
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    attackEffectTimer = 0;
    attackEffectPhase = 0;
    attackEffectMode = "none";
    attackEffectPower = 0;
    stage.playerWaves = [];
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
    playPowerupSfx();
    playKickSfx(1.96 + gaugeRatio * 0.34);
    for (let i = 0; i < 10; i += 1) {
      const ang = (Math.PI * 2 * i) / 10;
      const radius = 5 + i * 1.8;
      const sx = player.x + player.w * 0.5 + Math.cos(ang) * radius;
      const sy = player.y + player.h * 0.5 + Math.sin(ang) * radius * 0.72;
      spawnWaveBurst(sx, sy, 1.1 + gaugeRatio * 0.95);
    }
    triggerImpact(
      3.1 + proteinBurstPower * 1.15,
      player.x + player.w * 0.5,
      player.y + player.h * 0.55,
      5.1 + proteinBurstPower * 1.45
    );
    waveFlashX = player.x + player.w * 0.5;
    waveFlashY = player.y + player.h * 0.4;
    waveFlashTimer = Math.max(waveFlashTimer, 42 + gaugeRatio * 16);
    waveFlashPower = Math.max(waveFlashPower, 2.0 + gaugeRatio * 1.5);
    hudMessage = spentGauge >= PROTEIN_BURST_REQUIRE ? "PROTEIN BURST MAX!" : "PROTEIN BURST!";
    hudTimer = 58;
    return true;
  }

  function performProteinBurstSweep() {
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.5;
    const gaugeRatio = clamp(
      (proteinBurstUsedGauge - PROTEIN_BURST_MIN) / Math.max(1, PROTEIN_BURST_REQUIRE - PROTEIN_BURST_MIN),
      0,
      1
    );
    const sweepPower = clamp(proteinBurstPower, 0.9, 2.4);

    let swept = 0;
    for (const enemy of stage.enemies) {
      if (!enemy.alive) continue;
      enemy.alive = false;
      enemy.kicked = true;
      enemy.vx = 0;
      enemy.vy = 0;
      swept += 1;
    }

    for (const bullet of stage.hazardBullets) {
      if (bullet.dead) continue;
      bullet.dead = true;
      swept += 1;
    }

    for (const shot of stage.bossShots) {
      if (shot.dead) continue;
      shot.dead = true;
      swept += 1;
    }

    stage.enemies = stage.enemies.filter((e) => e.alive);
    stage.hazardBullets = stage.hazardBullets.filter((b) => !b.dead);
    stage.bossShots = stage.bossShots.filter((s) => !s.dead);

    if (stage.boss.active && stage.boss.hp > 0 && stage.boss.invuln <= 0) {
      const bossDamage = 1 + Math.floor(gaugeRatio * 2.2) + bossDamageBonus();
      stage.boss.hp = Math.max(0, stage.boss.hp - bossDamage);
      stage.boss.invuln = bossDamageBonus() > 0 ? 12 : 20;
      stage.boss.vx += player.facing * (0.5 + gaugeRatio * 0.95);
      stage.boss.vy = Math.min(stage.boss.vy, -(2.0 + gaugeRatio * 1.6));
      handleBossHpZero();
    }

    triggerImpact(5.4 + sweepPower * 1.6, px, py - 24, 7.6 + sweepPower * 1.95);
    for (let i = 0; i < 1 + Math.floor(gaugeRatio * 3); i += 1) {
      const ox = (Math.random() * 2 - 1) * 6;
      const oy = (Math.random() * 2 - 1) * 4;
      spawnHitSparks(px + ox, py - 24 + oy, "#fff0b8", "#ff8d68");
    }
    for (let i = 0; i < 14; i += 1) {
      const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.25;
      const dist = 8 + (i % 4) * 6;
      const sx = px + Math.cos(ang) * dist;
      const sy = py - 22 + Math.sin(ang) * dist * 0.7;
      spawnWaveBurst(sx, sy, 1.1 + sweepPower * 0.44);
      if (i % 2 === 0) {
        spawnHitSparks(sx, sy, "#d7f7ff", "#87b2ff");
      }
    }
    spawnHitSparks(px, py - 24, "#d7f7ff", "#87b2ff");
    proteinBurstLaserTimer = PROTEIN_BURST_LASER_DURATION + Math.round(gaugeRatio * 24);
    proteinBurstLaserPhase = 0;
    waveFlashX = px;
    waveFlashY = py - 20;
    waveFlashTimer = Math.max(waveFlashTimer, 54 + gaugeRatio * 20);
    waveFlashPower = Math.max(waveFlashPower, 2.4 + gaugeRatio * 1.7);
    kickBurstX = px;
    kickBurstY = py - 18;
    kickFlashTimer = Math.max(kickFlashTimer, 28 + sweepPower * 7);
    kickFlashPower = Math.max(kickFlashPower, 2.2 + sweepPower * 0.8);
    playKickSfx(2.16 + gaugeRatio * 0.36);
    hudMessage = swept > 0 ? `PROTEIN BURST x${swept}` : "PROTEIN BURST!";
    hudTimer = 34;
  }

  function updateProteinBurst(dt, solids, minX, maxX) {
    if (proteinBurstTimer <= 0) return false;

    const elapsed = PROTEIN_BURST_DURATION - proteinBurstTimer;
    const progress = clamp(elapsed / PROTEIN_BURST_DURATION, 0, 1);
    const sweepPower = clamp(proteinBurstPower, 0.9, 2.4);
    if (!proteinBurstBlastDone && progress >= PROTEIN_BURST_BLAST_AT) {
      proteinBurstBlastDone = true;
      performProteinBurstSweep();
    }

    player.vx *= Math.pow(0.86, dt);
    if (progress < 0.42) {
      player.vy = Math.min(player.vy - (0.22 + sweepPower * 0.06) * dt, -(4.0 + sweepPower * 0.55));
    } else {
      player.vy = Math.min(player.vy + GRAVITY * (0.84 + sweepPower * 0.03) * dt, MAX_FALL);
    }

    const rumblePulse = 0.5 + Math.sin((proteinBurstLaserPhase + elapsed) * 0.34) * 0.5;
    impactShakeTimer = Math.max(impactShakeTimer, 4 + sweepPower * 2.2);
    impactShakePower = Math.max(impactShakePower, 0.9 + sweepPower * 0.55 + rumblePulse * 0.35);

    moveWithCollisions(player, solids, dt, triggerCrumble);
    player.x = clamp(player.x, minX, maxX);
    if (player.y < PROTEIN_BURST_TOP_Y) {
      player.y = PROTEIN_BURST_TOP_Y;
      if (player.vy < -0.9) {
        player.vy = -0.9;
      }
    }
    player.anim += dt * 1.2;

    proteinBurstTimer = Math.max(0, proteinBurstTimer - dt);
    if (proteinBurstTimer <= 0) {
      proteinBurstBlastDone = false;
      proteinBurstUsedGauge = 0;
      proteinBurstPower = 1;
      player.vy = Math.min(player.vy, -2.7);
      hudMessage = "BURST END";
      hudTimer = 22;
    }
    return true;
  }

  function consumeBurstIfPressed(actions) {
    if (!actions.specialPressed) return;
    if (gameState !== STATE.PLAY && gameState !== STATE.BOSS) return;

    if (!triggerProteinBurst()) {
      if (proteinBurstTimer > 0) return;
      hudMessage = `BURST ${proteinBurstGauge}/${PROTEIN_BURST_MIN}+`;
      hudTimer = 28;
    }
  }

  function scheduleBGM() {
    if (!bgmStarted || !stageMusic) return;
    const stageActive = gameState === STATE.PLAY;
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
    const heartItems = [];
    const lifeUpItems = [];
    const bikes = [];
    const weaponItems = [];
    const checkpointTokens = [];
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
        w: 18,
        h: 14,
        bob: (id * 1.57) % (Math.PI * 2),
        collected: false,
      });
    };

    const addHeartItem = (id, x, y) => {
      heartItems.push({
        id,
        x,
        y,
        w: 12,
        h: 12,
        bob: (id * 1.73) % (Math.PI * 2),
        collected: false,
      });
    };

    const addLifeUpItem = (id, x, y) => {
      if (collectedLifeUpIds.has(id)) return;
      lifeUpItems.push({
        id,
        x,
        y,
        w: 12,
        h: 12,
        bob: (id * 1.81) % (Math.PI * 2),
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

    if (currentStageNumber === 1) {
      const checkpoints = [
        { x: 34, y: 136, label: "START" },
        { x: 980, y: 136, label: "CP-A" },
        { x: 2060, y: 136, label: "CP-B" },
        { x: 3180, y: 136, label: "CP-C" },
      ];

      const groundSegments = [
        [0, 800],
        [850, 900],
        [1810, 950],
        [2820, 960],
        [3840, 920],
      ];
      for (const [x, w] of groundSegments) {
        addSolid(x, groundY, w, 24);
      }

      addSolid(710, 128, 110, 10);
      addSolid(1360, 124, 110, 10);
      addSolid(1710, 114, 120, 10, { kind: "crumble", state: "solid", collapseAt: 34 });
      addSolid(2240, 120, 120, 10);
      addSolid(2650, 112, 110, 10);
      addSolid(3140, 118, 130, 10, { kind: "crumble", state: "solid", collapseAt: 32 });
      addSolid(3560, 110, 128, 10);
      addSolid(4020, 118, 120, 10);

      addSolid(1510, 100, 24, 60);
      addSolid(3320, 98, 24, 62);

      enemies.push(
        { x: 430, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.38, minX: 340, maxX: 540, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
        { x: 920, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.42, minX: 860, maxX: 1040, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 142, hopInterval: 142 },
        { x: 1230, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.42, minX: 1130, maxX: 1330, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
        { x: 1840, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.46, minX: 1730, maxX: 1940, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 132, hopInterval: 132 },
        { x: 2380, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.46, minX: 2260, maxX: 2450, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
        { x: 2860, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.48, minX: 2750, maxX: 3010, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 124, hopInterval: 124 },
        { x: 3380, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.5, minX: 3260, maxX: 3460, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
        { x: 4010, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.52, minX: 3880, maxX: 4090, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 120, hopInterval: 120 },
        { kind: "peacock", x: 2100, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.38, minX: 1980, maxX: 2230, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.0, chargeCooldown: 76, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
        { kind: "peacock", x: 3620, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.4, minX: 3510, maxX: 3750, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.08, chargeCooldown: 78, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
      );
      for (let i = 0; i < enemies.length; i += 1) {
        const enemy = enemies[i];
        enemy.shooter = enemy.kind !== "peacock" && (i === 2 || i === 6);
        enemy.shootInterval = enemy.shooter ? 176 + i * 9 : 0;
        enemy.shootCooldown = enemy.shooter ? 104 + i * 7 : 0;
        enemy.flash = 0;
      }

      fallBlocks.push(
        { x: 1180, y: 8, w: 22, h: 44, triggerX: 1120, state: "idle", vy: 0, timer: 0, warnDuration: 52 },
        { x: 2960, y: 8, w: 22, h: 44, triggerX: 2890, state: "idle", vy: 0, timer: 0, warnDuration: 48 }
      );
      cannons.push(
        { x: 1670, y: 142, dir: -1, triggerX: 1600, interval: 170, cool: 60, active: false },
        { x: 2510, y: 142, dir: 1, triggerX: 2440, interval: 162, cool: 56, active: false },
        { x: 3460, y: 142, dir: -1, triggerX: 3380, interval: 154, cool: 54, active: false }
      );
      for (const block of fallBlocks) {
        block.destroyed = false;
        block.debrisTimer = 0;
      }
      for (const cannon of cannons) {
        cannon.destroyed = false;
        cannon.debrisTimer = 0;
        cannon.warning = false;
        cannon.muzzleFlash = 0;
      }

      addProtein(101, 180, 136);
      addProtein(102, 430, 136);
      addProtein(103, 620, 118);
      addProtein(104, 880, 136);
      addProtein(105, 1080, 132);
      addProtein(106, 1360, 112);
      addProtein(107, 1600, 132);
      addProtein(108, 1820, 102);
      addProtein(109, 2050, 136);
      addProtein(110, 2280, 132);
      addProtein(111, 2520, 132);
      addProtein(112, 2760, 106);
      addProtein(113, 3010, 132);
      addProtein(114, 3250, 132);
      addProtein(115, 3490, 108);
      addProtein(116, 3740, 132);
      addProtein(117, 3990, 132);
      addProtein(118, 4230, 110);
      addProtein(119, 4460, 132);

      addBike(101, 2440, 108);
      addHeartItem(101, 1420, 96);
      addHeartItem(102, 3320, 96);
      addLifeUpItem(101, 2870, 88);

      const checkpointTokenIds = [1, 3];
      const checkpointTokenAnchors = {
        1: { x: 1010, y: 102 },
        3: { x: 3210, y: 98 },
      };
      for (const i of checkpointTokenIds) {
        const cp = checkpoints[i];
        if (!cp) continue;
        const anchor = checkpointTokenAnchors[i] || { x: cp.x + 2, y: cp.y - 18 };
        checkpointTokens.push({
          id: i,
          x: anchor.x,
          y: anchor.y,
          w: 12,
          h: 12,
          bob: (i * 1.29) % (Math.PI * 2),
          collected: checkpointIndex >= i,
        });
      }

      return {
        id: 1,
        theme: "city_basic",
        width: 4760,
        groundY,
        solids,
        enemies,
        proteins,
        heartItems,
        lifeUpItems,
        bikes,
        weaponItems,
        checkpointTokens,
        staticSpikes,
        popSpikes,
        fallBlocks,
        cannons,
        breakWalls,
        hazardBullets: [],
        bossShots: [],
        godGimmicks: [],
        playerWaves: [],
        checkpoints,
        goal: { x: 4300, y: 112, w: 24, h: 48 },
        bossArena: { minX: 4380, maxX: 4660 },
        boss: {
          kind: "peacock",
          started: false,
          active: false,
          x: 4490,
          y: 124,
          w: 24,
          h: 36,
          vx: 0,
          vy: 0,
          dir: -1,
          onGround: false,
          hp: 7,
          maxHp: 7,
          mode: "idle",
          modeTimer: 0,
          shotCooldown: 48,
          attackCycle: 0,
          spiralAngle: 0,
          invuln: 0,
        },
      };
    }

    const checkpoints = [
      { x: 34, y: 136, label: "START" },
      { x: 980, y: 136, label: "CP-0" },
      { x: 2200, y: 136, label: "CP-1" },
      { x: 3380, y: 136, label: "CP-2" },
      { x: 4300, y: 136, label: "CP-3" },
      { x: 5200, y: 136, label: "CP-4" },
      { x: 6040, y: 136, label: "CP-5" },
      { x: 8060, y: 136, label: "CP-6" },
    ];

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
      [7420, 420],
      [7888, 372],
      [8360, 500],
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
    addSolid(7320, 110, 120, 10, { kind: "crumble", state: "solid", collapseAt: 14 });
    addSolid(7570, 118, 90, 10);
    addSolid(7790, 114, 110, 10, { kind: "crumble", state: "solid", collapseAt: 14 });
    addSolid(8090, 120, 120, 10);
    addSolid(8460, 108, 120, 10, { kind: "crumble", state: "solid", collapseAt: 13 });

    addSolid(1220, 104, 26, 56);
    addSolid(2060, 96, 20, 64);
    addSolid(3460, 100, 26, 60);
    addSolid(4360, 94, 20, 66);
    addSolid(5610, 102, 22, 58);
    addSolid(6480, 98, 24, 62);
    addSolid(8020, 100, 24, 60);
    addSolid(8420, 98, 24, 62);

    // Break walls removed with hammer/glove abolition.

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
      { x: 6890, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.76, minX: 6780, maxX: 7010, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0, forceShooter: true },
      { x: 7210, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.72, minX: 7070, maxX: 7290, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 90, hopInterval: 90 },
      { kind: "peacock", x: 7420, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.5, minX: 7310, maxX: 7520, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.5, chargeCooldown: 72, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
      { x: 7600, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.74, minX: 7480, maxX: 7680, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0 },
      { x: 7920, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: 1, speed: 0.76, minX: 7800, maxX: 8030, kicked: false, onGround: false, alive: true, hop: true, hopTimer: 88, hopInterval: 88 },
      { kind: "peacock", x: 8180, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.52, minX: 8060, maxX: 8290, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.6, chargeCooldown: 74, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 },
      { x: 8440, y: 144, w: 14, h: 16, vx: 0, vy: 0, dir: -1, speed: 0.78, minX: 8320, maxX: 8510, kicked: false, onGround: false, alive: true, hop: false, hopTimer: 0, hopInterval: 0, forceShooter: true },
      { kind: "peacock", x: 8620, y: 142, w: 16, h: 18, vx: 0, vy: 0, dir: -1, speed: 0.54, minX: 8500, maxX: 8720, kicked: false, onGround: false, alive: true, mode: "patrol", chargeSpeed: 2.65, chargeCooldown: 76, windupTimer: 0, chargeTimer: 0, recoverTimer: 0 }
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
      { x: 6460, y: 6, w: 24, h: 48, triggerX: 6400, state: "idle", vy: 0, timer: 0, warnDuration: 34 },
      { x: 7240, y: 8, w: 24, h: 48, triggerX: 7180, state: "idle", vy: 0, timer: 0, warnDuration: 32 },
      { x: 8120, y: 8, w: 24, h: 48, triggerX: 8060, state: "idle", vy: 0, timer: 0, warnDuration: 30 },
      { x: 8520, y: 8, w: 24, h: 48, triggerX: 8460, state: "idle", vy: 0, timer: 0, warnDuration: 28 }
    );

    cannons.push(
      { x: 1840, y: 142, dir: -1, triggerX: 1760, interval: 156, cool: 62, active: false },
      { x: 2660, y: 142, dir: 1, triggerX: 2580, interval: 144, cool: 52, active: false },
      { x: 3470, y: 142, dir: -1, triggerX: 3390, interval: 132, cool: 48, active: false },
      { x: 4300, y: 142, dir: -1, triggerX: 4220, interval: 122, cool: 44, active: false },
      { x: 6020, y: 142, dir: -1, triggerX: 5950, interval: 118, cool: 40, active: false },
      { x: 6760, y: 142, dir: 1, triggerX: 6700, interval: 112, cool: 38, active: false },
      { x: 7360, y: 142, dir: -1, triggerX: 7300, interval: 108, cool: 36, active: false },
      { x: 8020, y: 142, dir: 1, triggerX: 7950, interval: 104, cool: 34, active: false },
      { x: 8440, y: 142, dir: -1, triggerX: 8380, interval: 100, cool: 32, active: false }
    );

    for (const block of fallBlocks) {
      block.destroyed = false;
      block.debrisTimer = 0;
    }

    for (const cannon of cannons) {
      cannon.destroyed = false;
      cannon.debrisTimer = 0;
      cannon.warning = false;
      cannon.muzzleFlash = 0;
    }

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
    addProtein(41, 7240, 132);
    addProtein(42, 7380, 96);
    addProtein(43, 7510, 132);
    addProtein(44, 7630, 102);
    addProtein(45, 7780, 96);
    addProtein(46, 7940, 132);
    addProtein(47, 8060, 104);
    addProtein(48, 8180, 132);
    addProtein(49, 8320, 94);
    addProtein(50, 8460, 132);
    addProtein(51, 8580, 102);
    addProtein(52, 8720, 132);
    addProtein(53, 8820, 102);

    // Bike = rare invincibility item.
    addBike(1, 3360, 102);
    addBike(2, 5660, 106);

    // Rare heart recovery pickups.
    addHeartItem(1, 1480, 110);
    addHeartItem(2, 4480, 102);
    addHeartItem(3, 8360, 102);

    // Rare 1UP item (single spawn in stage).
    addLifeUpItem(1, 6488, 78);

    // Weapon items removed.

    const checkpointTokenAnchors = {
      1: { x: 1020, y: 104 },
      2: { x: 2340, y: 102 },
      3: { x: 3710, y: 102 },
      4: { x: 4590, y: 100 },
      5: { x: 5460, y: 102 },
      6: { x: 6340, y: 98 },
      7: { x: 7890, y: 92 },
    };

    const checkpointTokenIds = [2, 5, 7];
    for (const i of checkpointTokenIds) {
      if (i >= checkpoints.length) continue;
      const cp = checkpoints[i];
      const anchor = checkpointTokenAnchors[i] || { x: cp.x + 2, y: cp.y - 18 };
      checkpointTokens.push({
        id: i,
        x: anchor.x,
        y: anchor.y,
        w: 12,
        h: 12,
        bob: (i * 1.29) % (Math.PI * 2),
        collected: checkpointIndex >= i,
      });
    }

    return {
      id: 2,
      theme: "city_deluxe",
      width: 8960,
      groundY,
      solids,
      enemies,
      proteins,
      heartItems,
      lifeUpItems,
      bikes,
      weaponItems,
      checkpointTokens,
      staticSpikes,
      popSpikes,
      fallBlocks,
      cannons,
      breakWalls,
      hazardBullets: [],
      bossShots: [],
      godGimmicks: [],
      playerWaves: [],
      checkpoints,
      goal: { x: 8508, y: 112, w: 24, h: 48 },
      bossArena: { minX: 8340, maxX: 8660 },
      boss: {
        kind: "god",
        started: false,
        active: false,
        x: 8420,
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
        spiralAngle: 0,
        invuln: 0,
      },
    };
  }

  function createPartyGoon(x, minX, maxX, dir = 1) {
    return {
      kind: "partygoon",
      x,
      y: 144,
      w: 13,
      h: 16,
      vx: 0,
      vy: 0,
      dir,
      speed: 0.32,
      minX,
      maxX,
      kicked: false,
      onGround: false,
      alive: true,
      hop: false,
      hopTimer: 0,
      hopInterval: 0,
      shooter: false,
      shootInterval: 0,
      shootCooldown: 0,
      flash: 0,
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

  function triggerInvincibleKillBonus(x, y, power = 1) {
    if (invincibleTimer <= 0) return;
    const p = clamp(power, 0.9, 4.8);
    invincibleTimer += INVINCIBLE_KILL_EXTEND_FRAMES;
    invincibleBonusPops.push({
      x,
      y: y - 3,
      vx: (Math.random() * 2 - 1) * 0.22,
      vy: 0.33 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      life: INVINCIBLE_BONUS_POP_LIFE,
      maxLife: INVINCIBLE_BONUS_POP_LIFE,
      power: p,
    });
    kickFlashTimer = Math.max(kickFlashTimer, 11 + p * 1.2);
    kickFlashPower = Math.max(kickFlashPower, 1.5 + p * 0.25);
    triggerImpact(1.15 + p * 0.18, x, y - 1, 1.8 + p * 0.25);
    spawnHitSparks(x, y - 4, "#fff6be", "#ffd977");
    playInvincibleExtendSfx(p);
  }

  function kickEnemy(enemy, dir, power = 1, options = {}) {
    const immediateRemove = options.immediateRemove !== false;
    const flyLifetime = options.flyLifetime || 42;
    const freshDefeat = enemy.alive && !enemy.kicked;
    const hitX = enemy.x + enemy.w * 0.5;
    const hitY = enemy.y + enemy.h * 0.45;
    spawnEnemyBlood(hitX, hitY, power);
    if (freshDefeat) {
      triggerInvincibleKillBonus(hitX, hitY, power);
    }
    enemy.kicked = true;
    enemy.vx = dir * (4.3 + power * 1.55);
    enemy.vy = -(3.6 + power * 1.05);
    enemy.onGround = false;
    enemy.kickDespawn = immediateRemove ? 0 : Math.max(1, flyLifetime);
    enemy.alive = true;
    if (immediateRemove) {
      enemy.alive = false;
    }
    playEnemyDefeatSfx(power);
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
    const fromBossBattle = gameState === STATE.BOSS;

    if (gameState !== STATE.PLAY && gameState !== STATE.BOSS) return;
    const burstGuard = proteinBurstTimer > 0;
    if ((invincibleTimer > 0 || burstGuard) && !ignoreInvincible) {
      if (invincibleHitCooldown > 0) return;
      invincibleHitCooldown = 8;
      hudMessage = burstGuard ? "PROTEIN BURST中!" : "バイク無敵! ノーダメージ";
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
    deathContinueMode = fromBossBattle ? "boss" : "checkpoint";
    gameState = STATE.DEAD;
    deadTimer = playerLives > 0 ? 134 : 182;
    deadTimerMax = deadTimer;
    deathFlashTimer = 34;
    deathShakeTimer = 26;
    deathPauseTimer = 24;
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
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
    kickCombo = 0;
    kickComboTimer = 0;
    stompChainGuardTimer = 0;
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
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    attackEffectTimer = 0;
    attackEffectPhase = 0;
    attackEffectMode = "none";
    attackEffectPower = 0;
    stage.playerWaves = [];
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
    deaths += 1;
    hudMessage = playerLives > 0 ? `${reason} / 残機 x${playerLives}` : `${reason} / 残機 0`;
    hudTimer = 80;
    playDeathSfx();
    playDeathJingle();
  }

  function stageStartMessage() {
    if (currentStageNumber <= 1) {
      return "STAGE 1: 都会トレーニングエリア突破! 孔雀ボスを倒せ";
    }
    return "STAGE 2: マンション会場へ突入し、彼氏を救出せよ";
  }

  function startGameplay(resetDeaths, options = {}) {
    const keepLives = options.keepLives === true;
    const keepDeaths = options.keepDeaths === true;
    const previousLives = playerLives;
    const previousDeaths = deaths;
    if (resetDeaths && !keepDeaths) {
      deaths = 0;
    }
    collectedProteinIds = new Set();
    collectedLifeUpIds = new Set();
    checkpointIndex = 0;
    deathContinueMode = "checkpoint";
    preBossCutsceneTimer = 0;
    stage = buildStage();
    const cp = stage.checkpoints[checkpointIndex];
    placePlayerAtCheckpoint(cp);
    cameraX = 0;
    proteinRushTimer = 0;
    proteinBurstGauge = 0;
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    playerHearts = MAX_HEARTS;
    playerLives = keepLives ? Math.max(1, previousLives) : START_LIVES;
    damageInvulnTimer = 0;
    hurtFlashTimer = 0;
    impactShakeTimer = 0;
    impactShakePower = 0;
    hitStopTimer = 0;
    kickCombo = 0;
    kickComboTimer = 0;
    stompChainGuardTimer = 0;
    kickFlashTimer = 0;
    kickFlashPower = 0;
    hammerTimer = 0;
    gloveTimer = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    dashJumpAssistTimer = 0;
    attackCooldown = 0;
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    attackEffectTimer = 0;
    attackEffectPhase = 0;
    attackEffectMode = "none";
    attackEffectPower = 0;
    stage.playerWaves = [];
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
    hitSparks = [];
    deathFlashTimer = 0;
    deathShakeTimer = 0;
    deathPauseTimer = 0;
    deathAnimActive = false;
    deathJumpVy = 0;
    deadReason = "";
    openingThemeActive = false;
    BOSS_ARENA = stage.bossArena ? { ...stage.bossArena } : BOSS_ARENA;
    if (keepDeaths) {
      deaths = previousDeaths;
    }
    stopInvincibleMusic();
    gameState = STATE.PLAY;
    hudMessage = stageStartMessage();
    hudTimer = currentStageNumber <= 1 ? 150 : 170;
    deadTimerMax = 0;
    playUiStartSfx();
    startStageMusic(true);
    setBgmVolume(0, 0);
    setBgmVolume(BGM_NORMAL_VOL, 0.08);
  }

  function respawnFromCheckpoint() {
    preBossCutsceneTimer = 0;
    deathContinueMode = "checkpoint";
    stage = buildStage();
    BOSS_ARENA = stage.bossArena ? { ...stage.bossArena } : BOSS_ARENA;
    const cp = stage.checkpoints[checkpointIndex];
    placePlayerAtCheckpoint(cp);
    cameraX = clamp(player.x - 120, 0, stage.width - W);
    proteinRushTimer = 0;
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
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
    stompChainGuardTimer = 0;
    kickFlashTimer = 0;
    kickFlashPower = 0;
    hammerTimer = 0;
    gloveTimer = 0;
    hammerHitCooldown = 0;
    gloveHitCooldown = 0;
    weaponHudTimer = 0;
    dashJumpAssistTimer = 0;
    attackCooldown = 0;
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    attackEffectTimer = 0;
    attackEffectPhase = 0;
    attackEffectMode = "none";
    attackEffectPower = 0;
    stage.playerWaves = [];
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
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
    playUiStartSfx();
    startStageMusic(true);
    setBgmVolume(0, 0);
    setBgmVolume(BGM_NORMAL_VOL, 0.08);
  }

  function findPreMansionCheckpointIndex() {
    if (!stage || !stage.checkpoints || stage.checkpoints.length === 0) return checkpointIndex;
    const goalX = stage.goal && typeof stage.goal.x === "number"
      ? stage.goal.x
      : Infinity;
    let bestIndex = 0;
    let bestX = -Infinity;
    for (let i = 0; i < stage.checkpoints.length; i += 1) {
      const cp = stage.checkpoints[i];
      if (!cp) continue;
      if (cp.x >= goalX) continue;
      if (cp.x > bestX) {
        bestX = cp.x;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  function respawnFromBossBattle() {
    checkpointIndex = findPreMansionCheckpointIndex();
    respawnFromCheckpoint();
    deathContinueMode = "checkpoint";
    hudMessage = currentStageNumber < FINAL_STAGE_NUMBER
      ? "ボスゲート前から再開"
      : "マンション前から再開";
    hudTimer = 96;
  }

  function updateCheckpointTokens(dt) {
    for (const token of stage.checkpointTokens) {
      token.bob += 0.09 * dt;
      if (token.collected) continue;

      const floatY = token.y + Math.sin(token.bob) * 1.6;
      const hit = { x: token.x, y: floatY, w: token.w, h: token.h };
      if (!overlap(player, hit)) continue;

      token.collected = true;
      checkpointIndex = Math.max(checkpointIndex, token.id);
      const cp = stage.checkpoints[token.id];
      hudMessage = `${cp.label} セーブ`;
      hudTimer = 90;
      playPowerupSfx();
      playCheckpointSfx();
      triggerImpact(1.2, token.x + token.w * 0.5, floatY + token.h * 0.5, 2.0);
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
      if (block.destroyed) {
        block.debrisTimer = Math.max(0, (block.debrisTimer || 0) - dt);
        continue;
      }

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
      if (cannon.destroyed) {
        cannon.debrisTimer = Math.max(0, (cannon.debrisTimer || 0) - dt);
        continue;
      }

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
        playProjectileSfx("cannon");
        cannon.warning = false;
        cannon.cool = cannon.interval + CANNON_EXTRA_COOLDOWN + Math.random() * 24;
      }
    }
  }

  function spawnGimmickBreakFx(x, y, power = 1) {
    const p = clamp(power, 0.8, 3.4);
    triggerImpact(1.8 + p * 0.42, x, y, 2.8 + p * 0.48);
    spawnHitSparks(x, y, "#dfe8ff", "#8ea0bc");
    spawnHitSparks(x, y, "#ffd8aa", "#8f5e4b");
    playKickSfx(1.54 + p * 0.18);
  }

  function destroyCannon(cannon, power = 1) {
    if (cannon.destroyed) return false;
    cannon.destroyed = true;
    cannon.active = false;
    cannon.warning = false;
    cannon.cool = 1e9;
    cannon.muzzleFlash = 0;
    cannon.debrisTimer = 82;

    const cx = cannon.x + (cannon.dir > 0 ? 1 : -1);
    const cy = cannon.y + 2;
    spawnGimmickBreakFx(cx, cy, 1.1 + power * 0.4);

    for (const bullet of stage.hazardBullets) {
      if (bullet.dead || bullet.kind !== "cannon") continue;
      if (Math.abs(bullet.x - cannon.x) <= 56) {
        bullet.dead = true;
      }
    }
    return true;
  }

  function destroyFallBlock(block, power = 1) {
    if (block.destroyed || block.state === "gone") return false;
    block.destroyed = true;
    block.state = "gone";
    block.vy = 0;
    block.timer = 0;
    block.debrisTimer = 92;
    const cx = block.x + block.w * 0.5;
    const cy = block.y + block.h * 0.45;
    spawnGimmickBreakFx(cx, cy, 0.9 + power * 0.35);
    return true;
  }

  function destroyCrumbleSolid(solid, power = 1) {
    if (solid.kind !== "crumble" || solid.state === "gone") return false;
    solid.state = "gone";
    solid.timer = 0;
    const cx = solid.x + solid.w * 0.5;
    const cy = solid.y + solid.h * 0.5;
    spawnGimmickBreakFx(cx, cy, 0.84 + power * 0.3);
    return true;
  }

  function hitBreakableGimmicks(hitBox, power = 1) {
    let broken = 0;

    for (const cannon of stage.cannons) {
      if (cannon.destroyed) continue;
      const cannonHit = { x: cannon.x - 10, y: cannon.y - 4, w: 20, h: 13 };
      if (!overlap(hitBox, cannonHit)) continue;
      if (destroyCannon(cannon, power)) {
        broken += 1;
      }
    }

    for (const block of stage.fallBlocks) {
      if (block.destroyed || block.state === "gone") continue;
      if (!overlap(hitBox, block)) continue;
      if (destroyFallBlock(block, power)) {
        broken += 1;
      }
    }

    for (const solid of stage.solids) {
      if (solid.kind !== "crumble" || solid.state === "gone") continue;
      if (!overlap(hitBox, solid)) continue;
      if (destroyCrumbleSolid(solid, power)) {
        broken += 1;
      }
    }

    if (broken > 0) {
      hudMessage = broken > 1 ? `ギミック破壊 x${broken}!` : "ギミック破壊!";
      hudTimer = Math.max(hudTimer, 34);
    }

    return broken;
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
        if ((enemy.kickDespawn || 0) > 0) {
          enemy.kickDespawn -= dt;
          if (enemy.kickDespawn <= 0) {
            enemy.alive = false;
            continue;
          }
        }
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
          playProjectileSfx("enemy");
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
      proteinBurstGauge = clamp(proteinBurstGauge + 1, 0, PROTEIN_BURST_REQUIRE);
      const lifeUp = pLv % 30 === 0;
      if (lifeUp) {
        playerLives = Math.min(99, playerLives + 1);
        hudMessage = `PROTEIN ${pLv}! 1UP`;
        hudTimer = 90;
        playCheckpointSfx();
      } else {
        hudMessage = `PROTEIN BOOST! SPD +${speedPct}%`;
        hudTimer = 64;
      }
      playPowerupSfx();
      triggerImpact(0.9, protein.x + protein.w * 0.5, floatY + protein.h * 0.5, 1.4);
    }
  }

  function updateHeartItems(dt) {
    for (const item of stage.heartItems) {
      item.bob += 0.09 * dt;
      if (item.collected) continue;

      const floatY = item.y + Math.sin(item.bob) * 1.5;
      const hit = { x: item.x, y: floatY, w: item.w, h: item.h };
      if (!overlap(player, hit)) continue;

      item.collected = true;
      const before = playerHearts;
      playerHearts = Math.min(MAX_HEARTS, playerHearts + 1);
      playPowerupSfx();
      playCheckpointSfx();
      triggerImpact(0.85, item.x + item.w * 0.5, floatY + item.h * 0.5, 1.2);
      if (playerHearts > before) {
        hudMessage = "ハート回復!";
        hudTimer = 56;
      } else {
        hudMessage = "ハート満タン";
        hudTimer = 38;
      }
    }
  }

  function updateLifeUpItems(dt) {
    for (const item of stage.lifeUpItems) {
      item.bob += 0.095 * dt;
      if (item.collected) continue;

      const floatY = item.y + Math.sin(item.bob) * 1.7;
      const hit = { x: item.x, y: floatY, w: item.w, h: item.h };
      if (!overlap(player, hit)) continue;

      item.collected = true;
      collectedLifeUpIds.add(item.id);
      playerLives = Math.min(99, playerLives + 1);
      playPowerupSfx();
      playCheckpointSfx();
      triggerImpact(1.15, item.x + item.w * 0.5, floatY + item.h * 0.5, 2.0);
      hudMessage = "1UP! 残機 +1";
      hudTimer = 90;
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
      const started = startInvincibleMode(INVINCIBLE_DURATION);
      playPowerupSfx();
      triggerImpact(1.25, bike.x + bike.w * 0.5, floatY + bike.h * 0.5, 2.2);
      hudMessage = started ? "バイク搭乗! 15秒 無敵" : "無敵中! 時間は延長されない";
      hudTimer = 90;
    }
  }

  function updateWeaponItems(dt) {
    // Hammer/Glove abolished.
    return;
  }

  function releaseChargeAttack(chargeFrames, options = {}) {
    const comboStage = clamp(Math.floor(options.comboStage || 0), 0, ATTACK_MASH_TRIGGER - 1);
    const comboPunch = comboStage > 0;
    const forcePunch = options.forcePunch === true;
    const chargeRatio = clamp(chargeFrames / ATTACK_CHARGE_MAX, 0, 1);
    const strongWave = !forcePunch && chargeFrames >= ATTACK_WAVE_CHARGE_MIN - 0.01;
    const spearThrust = !forcePunch && !comboPunch && !strongWave && chargeFrames >= ATTACK_SPEAR_CHARGE_MIN;
    const punchYOffset = strongWave ? 0 : spearThrust ? 1 : comboPunch ? Math.max(0, 3 - comboStage) : 2;
    const pLv = proteinLevel();
    const dir = player.facing;
    const px = player.x + player.w * 0.5;
    const reach = strongWave
      ? 22 + Math.floor(chargeRatio * 40)
      : spearThrust
        ? 26 + Math.floor(chargeRatio * 30)
      : comboPunch
        ? 12 + comboStage * 4 + Math.floor(chargeRatio * 4)
        : 12 + Math.floor(chargeRatio * 50);
    const hitBox = {
      x: dir > 0 ? player.x + player.w - 1 : player.x - reach + 1,
      y: player.y + (spearThrust ? 8 : comboPunch ? 6 : 4) + punchYOffset,
      w: reach,
      h: spearThrust ? 8 + Math.floor(chargeRatio * 3) : comboPunch ? 10 + comboStage * 2 : 13 + Math.floor(chargeRatio * 8),
    };

    let hits = 0;
    let parryHits = 0;
    let hitX = px + dir * (12 + reach * 0.48);
    let hitY = player.y + 10 + punchYOffset;
    const hitPower = 0.94 + chargeRatio * 0.68 + comboStage * 0.14 + (spearThrust ? 0.22 : 0) + pLv * 0.01;
    const gimmickBreaks = hitBreakableGimmicks(hitBox, 1 + chargeRatio * 0.8);
    if (gimmickBreaks > 0) {
      hitX = hitBox.x + hitBox.w * 0.5;
      hitY = hitBox.y + hitBox.h * 0.5;
      hits += gimmickBreaks;
    }

    for (const enemy of stage.enemies) {
      if (!enemy.alive || enemy.kicked) continue;
      if (!overlap(hitBox, enemy)) continue;
      kickEnemy(enemy, dir, hitPower + 0.2, { immediateRemove: false, flyLifetime: 32 + Math.round(chargeRatio * 16) });
      enemy.vx = dir * (3.8 + hitPower * 0.95 + comboStage * 0.2 + (spearThrust ? 0.45 : 0));
      enemy.vy = Math.min(
        enemy.vy,
        -(
          spearThrust
            ? 2.5 + chargeRatio * 0.95
            : 3.4 + chargeRatio * 1.3 + comboStage * 0.14
        )
      );
      enemy.flash = 12;
      hitX = enemy.x + enemy.w * 0.5;
      hitY = enemy.y + enemy.h * 0.42;
      hits += 1;
    }

    for (const b of stage.hazardBullets) {
      if (!overlap(hitBox, b)) continue;
      b.dead = true;
      hits += 1;
      parryHits += 1;
    }

    for (const bs of stage.bossShots) {
      if (!overlap(hitBox, bs)) continue;
      bs.dead = true;
      hits += 1;
      parryHits += 1;
    }

    if (stage.boss.active && stage.boss.hp > 0 && overlap(hitBox, stage.boss) && stage.boss.invuln <= 0) {
      const bossDamage = 1 + bossDamageBonus();
      stage.boss.hp = Math.max(0, stage.boss.hp - bossDamage);
      stage.boss.invuln = spearThrust
        ? (bossDamageBonus() > 0 ? 9 : 13)
        : (bossDamageBonus() > 0 ? 11 : 15);
      stage.boss.vx += dir * (0.62 + chargeRatio * 0.38 + (spearThrust ? 0.28 : 0));
      stage.boss.vy = Math.min(stage.boss.vy, -(spearThrust ? 1.55 + chargeRatio * 0.26 : 1.9 + chargeRatio * 0.36));
      hitX = stage.boss.x + stage.boss.w * 0.5;
      hitY = stage.boss.y + stage.boss.h * 0.45;
      hits += 1;
      handleBossHpZero();
    }

    if (strongWave) {
      const waveW = 18 + Math.floor(chargeRatio * 8);
      const waveH = 8 + Math.floor(chargeRatio * 4);
      const waveSpeed = (2.8 + chargeRatio * 1.5) * dir;
      stage.playerWaves.push({
        x: dir > 0 ? player.x + player.w + 2 : player.x - waveW - 2,
        y: player.y + 7,
        w: waveW,
        h: waveH,
        vx: waveSpeed,
        ttl: 130 + Math.floor(chargeRatio * 34),
        phase: 0,
        spin: Math.random() * Math.PI * 2,
        power: chargeRatio,
      });
      const sx = player.x + player.w * 0.5 + dir * (10 + waveW * 0.25);
      const sy = player.y + player.h * 0.45;
      waveFlashX = sx;
      waveFlashY = sy;
      waveFlashTimer = Math.max(waveFlashTimer, 26 + chargeRatio * 12);
      waveFlashPower = Math.max(waveFlashPower, 1.1 + chargeRatio * 1.6);
      spawnWaveBurst(sx, sy, 1.2 + chargeRatio);
      spawnWaveBurst(sx + dir * 14, sy + 2, 0.9 + chargeRatio * 0.7);
      playWaveShotSfx(chargeRatio);
    }

    if (hits > 0) {
      if (kickComboTimer > 0) {
        kickCombo = Math.min(99, kickCombo + hits);
      } else {
        kickCombo = hits;
      }
      kickComboTimer = 44;
    }

    triggerKickBurst(hitX, hitY, 1.6 + chargeRatio * 1.2 + comboStage * 0.32 + hits * 0.08);
    triggerImpact(
      1.9 + chargeRatio * 1.4 + comboStage * 0.28 + (spearThrust ? 0.44 : 0) + (strongWave ? 0.9 : 0),
      hitX,
      hitY,
      3.1 + chargeRatio * 1.1 + comboStage * 0.35 + (spearThrust ? 0.46 : 0) + (strongWave ? 1.3 : 0)
    );
    if (strongWave) {
      spawnWaveBurst(hitX, hitY, 1.0 + chargeRatio * 0.8);
    } else if (spearThrust) {
      spawnWaveBurst(hitX, hitY, 0.7 + chargeRatio * 0.46);
    }
    playKickSfx(1.2 + chargeRatio * 0.5 + comboStage * 0.08 + (spearThrust ? 0.14 : 0));
    if (parryHits > 0) playParrySfx();
    playRilaRobotVoice("attack");

    attackCooldown = strongWave
      ? ATTACK_WAVE_COOLDOWN
      : comboPunch
        ? Math.max(4, ATTACK_PUNCH_COOLDOWN - comboStage * 2)
        : spearThrust
          ? ATTACK_PUNCH_COOLDOWN + 2
        : ATTACK_PUNCH_COOLDOWN;
    attackEffectTimer = strongWave ? 16 : comboPunch ? 8 + comboStage * 2 : spearThrust ? 13 : 11;
    attackEffectMode = strongWave ? "wave" : comboPunch ? `combo${comboStage}` : spearThrust ? "spear" : "punch";
    attackEffectPhase = comboPunch ? comboStage * 0.75 + chargeRatio * 0.8 : spearThrust ? 0.8 + chargeRatio * 1.6 : chargeRatio * 2.6;
    attackEffectPower = comboPunch ? clamp(0.32 + comboStage * 0.24 + chargeRatio * 0.2, 0, 1) : spearThrust ? clamp(0.46 + chargeRatio * 0.5, 0, 1) : chargeRatio;
  }

  function startHyakuretsuMode() {
    if (hyakuretsuTimer > 0) return;
    hyakuretsuTimer = HYAKURETSU_DURATION;
    hyakuretsuHitTimer = 0;
    attackMashCount = 0;
    attackMashTimer = 0;
    attackCooldown = 0;
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackEffectTimer = 8;
    attackEffectMode = "hyakuretsu";
    attackEffectPhase = 0;
    attackEffectPower = 0.72;
    hudMessage = "百裂拳!";
    hudTimer = 24;
    playKickSfx(1.78);
    playRilaRobotVoice("attack");
  }

  function performHyakuretsuStrike() {
    const pLv = proteinLevel();
    const dir = player.facing;
    const reach = 12 + Math.min(6, Math.floor(pLv * 0.12));
    const hitBox = {
      x: dir > 0 ? player.x + player.w - 2 : player.x - reach + 2,
      y: player.y + 8,
      w: reach,
      h: 12,
    };

    let hits = 0;
    let parryHits = 0;
    let hitX = player.x + player.w * 0.5 + dir * (6 + reach * 0.34);
    let hitY = player.y + 13;
    const hitPower = 0.86 + pLv * 0.006;
    const gimmickBreaks = hitBreakableGimmicks(hitBox, 0.98 + pLv * 0.015);
    if (gimmickBreaks > 0) {
      hitX = hitBox.x + hitBox.w * 0.5;
      hitY = hitBox.y + hitBox.h * 0.5;
      hits += gimmickBreaks;
    }

    for (const enemy of stage.enemies) {
      if (!enemy.alive || enemy.kicked) continue;
      if (!overlap(hitBox, enemy)) continue;
      kickEnemy(enemy, dir, hitPower + 0.15, { immediateRemove: false, flyLifetime: 24 });
      enemy.vx = dir * (4.0 + hitPower * 0.72);
      enemy.vy = Math.min(enemy.vy, -(2.8 + hitPower * 0.48));
      enemy.flash = 10;
      hitX = enemy.x + enemy.w * 0.5;
      hitY = enemy.y + enemy.h * 0.45;
      hits += 1;
    }

    for (const bullet of stage.hazardBullets) {
      if (!overlap(hitBox, bullet)) continue;
      bullet.dead = true;
      parryHits += 1;
    }

    for (const shot of stage.bossShots) {
      if (!overlap(hitBox, shot)) continue;
      shot.dead = true;
      parryHits += 1;
    }

    if (stage.boss.active && stage.boss.hp > 0 && overlap(hitBox, stage.boss) && stage.boss.invuln <= 0) {
      stage.boss.hp = Math.max(0, stage.boss.hp - (1 + bossDamageBonus()));
      stage.boss.invuln = bossDamageBonus() > 0 ? 10 : 16;
      stage.boss.vx += dir * 0.48;
      stage.boss.vy = Math.min(stage.boss.vy, -1.6);
      hitX = stage.boss.x + stage.boss.w * 0.5;
      hitY = stage.boss.y + stage.boss.h * 0.44;
      hits += 1;
      handleBossHpZero();
    }

    if (hits > 0) {
      if (kickComboTimer > 0) {
        kickCombo = Math.min(99, kickCombo + hits);
      } else {
        kickCombo = hits;
      }
      kickComboTimer = 30;
    }

    if (hits > 0 || parryHits > 0) {
      triggerImpact(1.08 + Math.min(0.8, hits * 0.07), hitX, hitY, 1.4);
      spawnHitSparks(hitX, hitY, "#fff0bc", "#ff9369");
      spawnHitSparks(hitX, hitY, "#ffe6b6", "#ff6b58");
      playKickSfx(1.36 + Math.random() * 0.18);
      if (Math.random() < 0.36) {
        playRilaRobotVoice("attack");
      }
    }
    if (parryHits > 0) {
      playParrySfx();
    }

    attackEffectTimer = 6;
    attackEffectMode = "hyakuretsu";
    attackEffectPhase += 1.14;
    attackEffectPower = clamp(0.62 + hits * 0.06 + parryHits * 0.04, 0.62, 1);
  }

  function updatePlayerAttack(dt, actions) {
    const playable = gameState === STATE.PLAY || gameState === STATE.BOSS;
    if (!playable) {
      if (!input.attack) {
        attackChargeTimer = 0;
        attackChargeReadyPlayed = false;
      }
      attackMashCount = 0;
      attackMashTimer = 0;
      hyakuretsuTimer = 0;
      hyakuretsuHitTimer = 0;
      return;
    }

    if (hyakuretsuTimer > 0) {
      attackChargeTimer = 0;
      attackChargeReadyPlayed = false;
      hyakuretsuTimer = Math.max(0, hyakuretsuTimer - dt);
      hyakuretsuHitTimer = Math.max(0, hyakuretsuHitTimer - dt);
      if (hyakuretsuHitTimer <= 0) {
        performHyakuretsuStrike();
        hyakuretsuHitTimer = HYAKURETSU_HIT_INTERVAL;
      }
      if (hyakuretsuTimer <= 0) {
        attackCooldown = Math.max(attackCooldown, HYAKURETSU_POST_COOLDOWN);
      }
      return;
    }

    if (attackCooldown > 0) {
      if (!input.attack) {
        attackChargeTimer = 0;
        attackChargeReadyPlayed = false;
      }
      return;
    }

    if (input.attack) {
      const beforeCharge = attackChargeTimer;
      attackChargeTimer = Math.min(ATTACK_CHARGE_MAX, attackChargeTimer + dt);
      if (
        !attackChargeReadyPlayed &&
        attackChargeTimer >= ATTACK_WAVE_CHARGE_MIN &&
        beforeCharge < ATTACK_WAVE_CHARGE_MIN
      ) {
        attackChargeReadyPlayed = true;
        playChargeReadySfx();
      }
      return;
    }

    if (actions.attackReleased && attackChargeTimer > 0) {
      const quickTapCombo = attackChargeTimer <= ATTACK_COMBO_TAP_MAX;
      if (quickTapCombo) {
        attackMashCount = attackMashTimer > 0 ? Math.min(ATTACK_MASH_TRIGGER, attackMashCount + 1) : 1;
        attackMashTimer = ATTACK_MASH_WINDOW;
        if (attackMashCount >= ATTACK_MASH_TRIGGER && hyakuretsuTimer <= 0) {
          startHyakuretsuMode();
        } else {
          releaseChargeAttack(attackChargeTimer, { forcePunch: true, comboStage: attackMashCount });
        }
      } else {
        attackMashCount = 0;
        attackMashTimer = 0;
        releaseChargeAttack(attackChargeTimer);
      }
    }
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
  }

  function updatePlayerWaves(dt, solids) {
    if (!stage.playerWaves || stage.playerWaves.length === 0) return;

    for (const wave of stage.playerWaves) {
      if (wave.dead) continue;
      let parryHits = 0;
      let parryX = wave.x + wave.w * 0.5;
      let parryY = wave.y + wave.h * 0.5;
      wave.phase += dt;
      wave.spin = (wave.spin || 0) + dt * (0.24 + (wave.power || 0) * 0.18);
      wave.x += wave.vx * dt;
      wave.y += Math.sin(wave.phase * 0.2) * 0.22;
      wave.ttl -= dt;
      hitBreakableGimmicks(wave, 1 + (wave.power || 0) * 0.7);

      for (const enemy of stage.enemies) {
        if (wave.dead) break;
        if (!enemy.alive || enemy.kicked) continue;
        if (!overlap(wave, enemy)) continue;
        const dir = wave.vx >= 0 ? 1 : -1;
        kickEnemy(enemy, dir, 1.2 + (wave.power || 0) * 0.7, { immediateRemove: false, flyLifetime: 38 });
        enemy.vx = dir * (5.1 + (wave.power || 0) * 1.3);
        enemy.vy = -(3.5 + (wave.power || 0) * 0.7);
        enemy.flash = 12;
        const hx = enemy.x + enemy.w * 0.5;
        const hy = enemy.y + enemy.h * 0.4;
        triggerImpact(1.5 + (wave.power || 0), hx, hy, 2.6);
        spawnWaveBurst(hx, hy, 0.8 + (wave.power || 0) * 0.9);
        playKickSfx(1.32 + (wave.power || 0) * 0.34);
      }

      if (!wave.dead && stage.boss.active && stage.boss.hp > 0 && overlap(wave, stage.boss) && stage.boss.invuln <= 0) {
        const dir = wave.vx >= 0 ? 1 : -1;
        const bossDamage = 1 + bossDamageBonus();
        stage.boss.hp = Math.max(0, stage.boss.hp - bossDamage);
        stage.boss.invuln = bossDamageBonus() > 0 ? 9 : 13;
        stage.boss.vx += dir * (0.62 + (wave.power || 0) * 0.28);
        stage.boss.vy = Math.min(stage.boss.vy, -(1.85 + (wave.power || 0) * 0.24));
        const hx = stage.boss.x + stage.boss.w * 0.5;
        const hy = stage.boss.y + stage.boss.h * 0.4;
        triggerImpact(2.0 + (wave.power || 0), hx, hy, 3.0);
        spawnWaveBurst(hx, hy, 1.0 + (wave.power || 0));
        playKickSfx(1.52 + (wave.power || 0) * 0.28);
        handleBossHpZero();
      }

      for (const bullet of stage.hazardBullets) {
        if (wave.dead) break;
        if (bullet.dead) continue;
        if (!overlap(wave, bullet)) continue;
        bullet.dead = true;
        parryX = bullet.x + bullet.w * 0.5;
        parryY = bullet.y + bullet.h * 0.5;
        parryHits += 1;
      }

      for (const shot of stage.bossShots) {
        if (wave.dead) break;
        if (shot.dead) continue;
        if (!overlap(wave, shot)) continue;
        shot.dead = true;
        parryX = shot.x + shot.w * 0.5;
        parryY = shot.y + shot.h * 0.5;
        parryHits += 1;
      }

      if (parryHits > 0) {
        playParrySfx();
        spawnWaveBurst(parryX, parryY, 0.72 + (wave.power || 0) * 0.7);
      }

      if (wave.ttl <= 0 || wave.x + wave.w < -24 || wave.x > stage.width + 24) {
        wave.dead = true;
        continue;
      }
    }

    stage.playerWaves = stage.playerWaves.filter((w) => !w.dead);
  }

  function resolveEnemyContactDamage() {
    for (const enemy of stage.enemies) {
      if (!enemy.alive || enemy.kicked) continue;

      const weakPartyGuest = enemy.kind === "partygoon";
      const sideGrace = STOMP_SIDE_GRACE;
      const verticalGrace = STOMP_VERTICAL_GRACE;

      const touchingBody = overlap(player, enemy);
      const feetBox = {
        x: player.x - sideGrace,
        y: player.y + player.h - 6,
        w: player.w + sideGrace * 2,
        h: 10 + verticalGrace,
      };
      const stompTarget = {
        x: enemy.x - sideGrace,
        y: enemy.y - 6,
        w: enemy.w + sideGrace * 2,
        h: Math.max(9, Math.floor(enemy.h * 0.68)) + verticalGrace,
      };
      const stompTouch = overlap(feetBox, stompTarget);
      if (!touchingBody && !stompTouch) continue;

      const playerBottom = player.y + player.h;
      const enemyTop = enemy.y;
      const enemyMidY = enemy.y + enemy.h * 0.5;
      const verticalWindow = playerBottom >= enemyTop - 5 && playerBottom <= enemyTop + Math.max(9, enemy.h * 0.72);
      const centerAbove = player.y + player.h * 0.54 <= enemyMidY + 1;
      const descending = player.vy > 0.22;
      const chainAssist = stompChainGuardTimer > 0 && player.vy >= STOMP_DESCEND_MIN;
      const stompable = stompTouch && verticalWindow && centerAbove && (descending || chainAssist);

      if (stompable) {
        const dir = player.x + player.w * 0.5 < enemy.x + enemy.w * 0.5 ? 1 : -1;
        const pLv = proteinLevel();
        const stompPower = (weakPartyGuest ? 1.28 : 1.45) + pLv * 0.045;
        kickEnemy(enemy, dir, stompPower + 0.35);
        player.vy = -6.35 - Math.min(0.45, Math.abs(player.vx) * 0.08);
        player.vx += dir * 0.12;
        player.onGround = false;
        stompChainGuardTimer = STOMP_CHAIN_GUARD_FRAMES;
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

      if (invincibleTimer > 0 || proteinBurstTimer > 0) {
        const dir = player.x + player.w * 0.5 < enemy.x + enemy.w * 0.5 ? 1 : -1;
        const speedBoost = Math.min(2.2, Math.abs(player.vx) * 0.5);
        const burstBonus = proteinBurstTimer > 0 ? 2.0 : 0;
        const blastPower = 3.4 + speedBoost + burstBonus;
        kickEnemy(enemy, dir, blastPower, { immediateRemove: false, flyLifetime: 48 });
        enemy.vx = dir * (9.4 + blastPower * 1.2);
        enemy.vy = -(6.6 + blastPower * 0.7);
        enemy.flash = 14;
        const ex = enemy.x + enemy.w * 0.5;
        const ey = enemy.y + enemy.h * 0.5;
        triggerKickBurst(ex, ey, 4.6);
        triggerImpact(5.4, ex, ey, 8.0);
        spawnHitSparks(ex, ey, "#fff7d1", "#ffb16d");
        spawnHitSparks(ex, ey, "#ffecc0", "#ff6d58");
        playKickSfx(2.06);
        hudMessage = proteinBurstTimer > 0 ? "BURSTクラッシュ!" : "無敵クラッシュ!";
        hudTimer = 20;
        return;
      }

      if (stompChainGuardTimer > 0) {
        player.vy = Math.min(player.vy, -4.6);
        player.onGround = false;
        continue;
      }

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
    const b = stage.boss;
    const bossName = b.kind === "peacock" ? "孔雀ボス" : "神";
    if (b.kind === "god" && (b.phaseTransitionTimer || 0) > 0) {
      const pushDir = player.x + player.w * 0.5 < b.x + b.w * 0.5 ? -1 : 1;
      player.vx += pushDir * 0.34;
      player.vy = Math.min(player.vy, -5.1);
      player.onGround = false;
      stompChainGuardTimer = Math.max(stompChainGuardTimer, STOMP_CHAIN_GUARD_FRAMES * 0.52);
      return;
    }
    const playerBottom = player.y + player.h;
    const bossTop = b.y;
    const bossMidY = b.y + b.h * 0.5;
    const sideGrace = 8;
    const stompHit = {
      x: player.x - sideGrace,
      y: player.y + Math.floor(player.h * 0.26),
      w: player.w + sideGrace * 2,
      h: player.h - Math.floor(player.h * 0.26),
    };
    const stompTouch = overlap(stompHit, b);
    const descending = player.vy > -0.26;
    const verticalWindow = playerBottom >= bossTop - 10 && playerBottom <= bossTop + 16;
    const centerAbove = player.y + player.h * 0.66 <= bossMidY + 5;
    const stompable = stompTouch && descending && verticalWindow && centerAbove;
    const nearStompSafe =
      stompTouch &&
      playerBottom >= bossTop - 14 &&
      playerBottom <= bossTop + 22 &&
      player.y + player.h * 0.72 <= bossMidY + 7 &&
      player.vy > -0.42;

    if (stompable) {
      const dir = player.x + player.w * 0.5 < b.x + b.w * 0.5 ? 1 : -1;
      if (b.invuln <= 0 && b.hp > 0) {
        b.hp = Math.max(0, b.hp - (1 + bossDamageBonus()));
        b.invuln = bossDamageBonus() > 0 ? 13 : 20;
        b.vx += dir * 0.72;
        b.vy = Math.min(b.vy, -2.2);
        player.vy = -6.4;
        player.onGround = false;
        stompChainGuardTimer = STOMP_CHAIN_GUARD_FRAMES;
        hitStopTimer = Math.max(hitStopTimer, 4.2);
        const hitX = b.x + b.w * 0.5;
        const hitY = b.y + b.h * 0.25;
        triggerKickBurst(hitX, hitY, 2.9);
        triggerImpact(3.0, hitX, hitY, 4.6);
        spawnHitSparks(hitX, hitY, "#fff2bc", "#ffb26a");
        playKickSfx(1.74);
        hudMessage = `${bossName}を踏みつけ!`;
        hudTimer = 28;
        handleBossHpZero();
      } else {
        player.vy = -5.2;
        player.onGround = false;
        stompChainGuardTimer = Math.max(stompChainGuardTimer, STOMP_CHAIN_GUARD_FRAMES * 0.55);
      }
      return;
    }

    if (nearStompSafe) {
      player.vy = -5.0;
      player.onGround = false;
      stompChainGuardTimer = Math.max(stompChainGuardTimer, STOMP_CHAIN_GUARD_FRAMES * 0.55);
      return;
    }

    if (stompChainGuardTimer > 0) {
      player.vy = Math.min(player.vy, -4.8);
      player.onGround = false;
      return;
    }

    const rage = stage.boss.hp <= Math.ceil(stage.boss.maxHp * 0.55);
    if (stage.boss.mode === "dash") {
      killPlayer(`${bossName}の突進に被弾`);
    } else {
      if (b.kind === "god" && (b.gimmickAdvantageTimer || 0) > 0) {
        player.vy = -5.6;
        player.onGround = false;
        player.vx += (player.x + player.w * 0.5 < b.x + b.w * 0.5 ? -1 : 1) * 0.48;
        stompChainGuardTimer = Math.max(stompChainGuardTimer, STOMP_CHAIN_GUARD_FRAMES * 0.66);
        triggerImpact(1.2, player.x + player.w * 0.5, player.y + player.h * 0.5, 1.8);
        hudMessage = "電磁拘束中! 押し切れ!";
        hudTimer = 18;
        return;
      }
      killPlayer(rage ? `${bossName}の猛攻に被弾` : `${bossName}に接触して被弾`);
    }
  }

  function setupGodPhaseGimmicks() {
    const left = BOSS_ARENA.minX + 34;
    const center = Math.floor((BOSS_ARENA.minX + BOSS_ARENA.maxX) * 0.5) - 8;
    const right = BOSS_ARENA.maxX - 50;
    stage.godGimmicks = [
      { id: 1, x: left, y: stage.groundY - 12, w: 16, h: 10, charge: 0, cooldown: 0, pulse: 0 },
      { id: 2, x: center, y: stage.groundY - 12, w: 16, h: 10, charge: 0, cooldown: 0, pulse: 0.9 },
      { id: 3, x: right, y: stage.groundY - 12, w: 16, h: 10, charge: 0, cooldown: 0, pulse: 1.8 },
    ];
  }

  function bossDamageBonus() {
    if (!stage || !stage.boss) return 0;
    const b = stage.boss;
    if (b.kind !== "god") return 0;
    return (b.gimmickAdvantageTimer || 0) > 0 ? 1 : 0;
  }

  function handleBossHpZero() {
    if (!stage || !stage.boss) return;
    const b = stage.boss;
    if (b.hp > 0) return;
    if (b.kind === "god" && (b.phase || 1) < 2) {
      startGodSecondForm();
      return;
    }
    defeatBoss();
  }

  function activateGodGimmick(gimmick) {
    if (!stage || !stage.boss || !stage.boss.active) return;
    const b = stage.boss;
    if (b.kind !== "god" || (b.phase || 1) < 2) return;

    gimmick.charge = 0;
    gimmick.cooldown = 380;
    b.stunTimer = Math.max(b.stunTimer || 0, 88);
    b.gimmickAdvantageTimer = Math.max(b.gimmickAdvantageTimer || 0, 220);
    b.invuln = Math.min(b.invuln || 0, 4);
    b.vx *= 0.24;
    b.vy = Math.min(b.vy, -1.4);
    b.hp = Math.max(0, b.hp - 2);
    const bx = b.x + b.w * 0.5;
    const by = b.y + b.h * 0.44;
    triggerImpact(3.1, bx, by, 5.4);
    spawnWaveBurst(bx, by, 1.2);
    spawnWaveBurst(gimmick.x + gimmick.w * 0.5, gimmick.y + gimmick.h * 0.5, 1.05);
    spawnHitSparks(bx, by, "#d8f6ff", "#7dd1ff");
    playCheckpointSfx();
    playParrySfx();
    playKickSfx(1.92);
    hudMessage = "電磁パネル起動! 神が硬直!";
    hudTimer = 48;
    handleBossHpZero();
  }

  function updateGodGimmicks(dt) {
    if (gameState !== STATE.BOSS || !stage || !stage.boss || !stage.boss.active) return;
    const b = stage.boss;
    if (b.kind !== "god") return;
    if (!stage.godGimmicks || stage.godGimmicks.length === 0) return;

    for (const gimmick of stage.godGimmicks) {
      gimmick.pulse += dt * 0.14;
      gimmick.cooldown = Math.max(0, (gimmick.cooldown || 0) - dt);
      if ((b.phase || 1) < 2 || (b.phaseTransitionTimer || 0) > 0 || gimmick.cooldown > 0) {
        gimmick.charge = Math.max(0, gimmick.charge - dt * 0.7);
        continue;
      }

      const zone = {
        x: gimmick.x - 2,
        y: gimmick.y - 4,
        w: gimmick.w + 4,
        h: gimmick.h + 8,
      };
      const onPad = player.onGround && overlap(player, zone);
      if (onPad) {
        const add = input.attack ? 1.85 : 1.2;
        gimmick.charge = Math.min(54, gimmick.charge + dt * add);
        if (gimmick.charge >= 54) {
          activateGodGimmick(gimmick);
        }
      } else {
        gimmick.charge = Math.max(0, gimmick.charge - dt * 0.52);
      }
    }
  }

  function startGodSecondForm() {
    if (!stage || !stage.boss) return;
    const b = stage.boss;
    if (b.kind !== "god") {
      defeatBoss();
      return;
    }
    if ((b.phase || 1) >= 2) {
      defeatBoss();
      return;
    }

    b.phase = 2;
    b.phaseTransitionTimer = 148;
    b.mode = "phase_shift";
    b.modeTimer = b.phaseTransitionTimer;
    b.phase2MaxHp = b.phase2MaxHp || 13;
    b.maxHp = b.phase2MaxHp;
    b.hp = b.maxHp;
    b.invuln = b.phaseTransitionTimer + 24;
    b.attackCycle = 0;
    b.shotCooldown = 30;
    b.stunTimer = 0;
    b.gimmickAdvantageTimer = 0;
    playerHearts = MAX_HEARTS;
    damageInvulnTimer = Math.max(damageInvulnTimer, 36);
    hurtFlashTimer = 0;
    b.vx = 0;
    b.vy = -1.8;
    stage.bossShots = [];
    if (!stage.godGimmicks || stage.godGimmicks.length === 0) {
      setupGodPhaseGimmicks();
    }
    for (const gimmick of stage.godGimmicks) {
      gimmick.charge = 0;
      gimmick.cooldown = 24 + gimmick.id * 6;
    }
    triggerImpact(3.6, b.x + b.w * 0.5, b.y + b.h * 0.45, 6.4);
    playBossStartSfx();
    playKickSfx(2.18);
    hudMessage = "神 第2形態! 電磁パネルで隙を作れ!";
    hudTimer = 150;
  }

  function startBossBattle() {
    if (stage.boss.started) return;
    playBossStartSfx();
    const bossKind = stage.boss.kind || "god";
    BOSS_ARENA = stage.bossArena ? { ...stage.bossArena } : BOSS_ARENA;

    if (bossKind === "god") {
      // No protein pickups during the God battle.
      for (const protein of stage.proteins) {
        protein.collected = true;
      }
    }

    // Boss arena should be a flat duel zone.
    stage.solids = stage.solids.filter((s) => {
      const inArena = s.x < BOSS_ARENA.maxX && s.x + s.w > BOSS_ARENA.minX;
      const isGround = s.y >= stage.groundY;
      return !inArena || isGround;
    });
    const arenaFloorX = BOSS_ARENA.minX - 4;
    const arenaFloorW = BOSS_ARENA.maxX - BOSS_ARENA.minX + 8;
    const hasArenaFloor = stage.solids.some(
      (s) => s.y === stage.groundY && s.x <= arenaFloorX + 4 && s.x + s.w >= arenaFloorX + arenaFloorW - 4
    );
    if (!hasArenaFloor) {
      stage.solids.push({ x: arenaFloorX, y: stage.groundY, w: arenaFloorW, h: 24, kind: "solid", state: "solid", timer: 0 });
    }

    stage.boss.started = true;
    stage.boss.active = true;
    stage.boss.maxHp = bossKind === "peacock" ? 8 : 11;
    stage.boss.hp = stage.boss.maxHp;
    stage.boss.x = bossKind === "peacock"
      ? BOSS_ARENA.minX + Math.floor((BOSS_ARENA.maxX - BOSS_ARENA.minX) * 0.48)
      : BOSS_ARENA.minX + Math.floor((BOSS_ARENA.maxX - BOSS_ARENA.minX) * 0.63);
    stage.boss.y = stage.groundY - stage.boss.h;
    stage.boss.vx = 0;
    stage.boss.vy = 0;
    stage.boss.dir = -1;
    stage.boss.mode = "intro";
    stage.boss.modeTimer = bossKind === "peacock" ? 34 : 42;
    stage.boss.shotCooldown = bossKind === "peacock" ? 34 : 28;
    stage.boss.attackCycle = 0;
    stage.boss.spiralAngle = 0;
    stage.boss.invuln = bossKind === "peacock" ? 20 : 24;
    stage.boss.phase = 1;
    stage.boss.phaseTransitionTimer = 0;
    stage.boss.stunTimer = 0;
    stage.boss.gimmickAdvantageTimer = 0;
    stage.boss.phase2MaxHp = bossKind === "god" ? 13 : stage.boss.maxHp;
    stage.bossShots = [];
    stage.godGimmicks = [];
    stage.playerWaves = [];
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
    stage.hazardBullets = [];
    if (bossKind === "god") {
      stage.enemies = [];
      stage.enemies.push(
        createPartyGoon(BOSS_ARENA.minX + 42, BOSS_ARENA.minX + 10, BOSS_ARENA.minX + 108, 1),
        createPartyGoon(BOSS_ARENA.minX + 134, BOSS_ARENA.minX + 92, BOSS_ARENA.minX + 194, -1),
        createPartyGoon(BOSS_ARENA.minX + 214, BOSS_ARENA.minX + 168, BOSS_ARENA.minX + 282, 1)
      );
      setupGodPhaseGimmicks();
    } else {
      stage.enemies = [];
    }
    openingThemeActive = false;
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    attackCooldown = 0;
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    attackEffectTimer = 0;
    attackEffectMode = "none";
    attackEffectPhase = 0;
    attackEffectPower = 0;
    stopInvincibleMusic();

    gameState = STATE.BOSS;
    startBossTheme();
    cameraX = clamp(BOSS_ARENA.minX - 96, 0, stage.width - W);
    player.x = clamp(player.x, BOSS_ARENA.minX + 10, BOSS_ARENA.maxX - player.w - 12);
    player.vx = 0;
    player.vy = Math.min(player.vy, 0);

    triggerImpact(2.4, stage.boss.x + stage.boss.w * 0.5, stage.boss.y + stage.boss.h * 0.55, 3.4);
    playKickSfx(1.8);
    hudMessage = bossKind === "peacock"
      ? "STAGE 1 BOSS: 突進と羽弾を避けて孔雀ボスを倒せ"
      : "ホームパーティー会場突入! 構成員を避けつつ神を倒せ";
    hudTimer = bossKind === "peacock" ? 112 : 120;
  }

  function defeatBoss() {
    if (!stage.boss.active) return;
    const finalStage = currentStageNumber >= FINAL_STAGE_NUMBER;
    stage.boss.active = false;
    stage.boss.mode = "down";
    stage.boss.vx = 0;
    stage.boss.vy = 0;
    stage.bossShots = [];
    stage.playerWaves = [];
    attackCooldown = 0;
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    attackEffectTimer = 0;
    attackEffectMode = "none";
    attackEffectPhase = 0;
    attackEffectPower = 0;
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    hitStopTimer = Math.max(hitStopTimer, 4);
    triggerImpact(3.1, stage.boss.x + stage.boss.w * 0.5, stage.boss.y + stage.boss.h * 0.5, 4.4);
    playKickSfx(2.2);
    playCheckpointSfx();
    startClearTheme();
    hudMessage = finalStage ? "白ヒゲの神を撃破!" : "孔雀ボス撃破! STAGE 2へ";
    hudTimer = finalStage ? 150 : 120;
    gameState = STATE.CLEAR;
    clearTimer = 0;
  }

  function emitPeacockBossShots(boss, rage) {
    const cx = boss.x + boss.w * 0.5 - 2;
    const cy = boss.y + 12;
    const spread = rage
      ? [-0.42, -0.2, 0, 0.2, 0.42]
      : [-0.28, 0, 0.28];
    for (const s of spread) {
      stage.bossShots.push({
        kind: "peacock_feather",
        x: cx,
        y: cy,
        w: 5,
        h: 4,
        vx: boss.dir * (1.48 + Math.abs(s) * 0.6),
        vy: s * 1.12 - 0.06,
        ttl: rage ? 132 : 116,
        reason: "孔雀ボスの羽弾に被弾",
      });
    }
    playKickSfx(1.38);
    playProjectileSfx("enemy");
  }

  function updatePeacockBoss(dt, solids) {
    const boss = stage.boss;
    const rage = boss.hp <= Math.ceil(boss.maxHp * 0.5);
    boss.invuln = Math.max(0, boss.invuln - dt);
    boss.modeTimer -= dt;
    boss.shotCooldown -= dt;

    if (boss.mode === "intro") {
      boss.vx = -0.42;
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 34 : 44;
      }
    } else if (boss.mode === "idle") {
      boss.vx += boss.dir * (rage ? 0.23 : 0.18) * dt;
      boss.vx = clamp(boss.vx, -(rage ? 1.22 : 1.02), rage ? 1.22 : 1.02);

      if (boss.x < BOSS_ARENA.minX + 16) {
        boss.x = BOSS_ARENA.minX + 16;
        boss.dir = 1;
      } else if (boss.x + boss.w > BOSS_ARENA.maxX - 16) {
        boss.x = BOSS_ARENA.maxX - 16 - boss.w;
        boss.dir = -1;
      }

      if (boss.modeTimer <= 0) {
        const pattern = boss.attackCycle % 3;
        if (pattern === 0) {
          boss.mode = "windup";
          boss.modeTimer = rage ? 16 : 22;
          boss.vx *= 0.46;
        } else if (pattern === 1) {
          boss.mode = "shoot";
          boss.modeTimer = rage ? 66 : 56;
          boss.shotCooldown = rage ? 11 : 14;
          boss.vx *= 0.52;
        } else {
          boss.mode = "leap_prep";
          boss.modeTimer = rage ? 16 : 20;
          boss.vx *= 0.48;
        }
        boss.attackCycle += 1;
      }
    } else if (boss.mode === "windup") {
      boss.vx *= Math.pow(rage ? 0.6 : 0.66, dt);
      if (boss.modeTimer <= 0) {
        boss.mode = "dash";
        boss.modeTimer = rage ? 28 : 22;
        boss.vx = boss.dir * (2.15 + (rage ? 0.36 : 0));
      }
    } else if (boss.mode === "dash") {
      if (boss.x <= BOSS_ARENA.minX + 3) {
        boss.x = BOSS_ARENA.minX + 3;
        boss.dir = 1;
        boss.mode = "idle";
        boss.modeTimer = rage ? 30 : 40;
      } else if (boss.x + boss.w >= BOSS_ARENA.maxX - 3) {
        boss.x = BOSS_ARENA.maxX - 3 - boss.w;
        boss.dir = -1;
        boss.mode = "idle";
        boss.modeTimer = rage ? 30 : 40;
      } else if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 30 : 40;
      }
    } else if (boss.mode === "shoot") {
      boss.vx *= Math.pow(rage ? 0.78 : 0.84, dt);
      if (boss.shotCooldown <= 0) {
        emitPeacockBossShots(boss, rage);
        boss.shotCooldown = rage ? 14 : 18;
      }
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 30 : 40;
      }
    } else if (boss.mode === "leap_prep") {
      boss.vx *= Math.pow(rage ? 0.62 : 0.7, dt);
      if (boss.modeTimer <= 0) {
        const targetX = clamp(
          player.x + player.w * 0.5 + player.vx * 11,
          BOSS_ARENA.minX + 20,
          BOSS_ARENA.maxX - 20
        );
        const cx = boss.x + boss.w * 0.5;
        boss.leapTargetX = targetX;
        boss.mode = "leap_air";
        boss.modeTimer = rage ? 64 : 56;
        boss.dir = targetX >= cx ? 1 : -1;
        const dist = Math.abs(targetX - cx);
        boss.vx = boss.dir * clamp(1.5 + dist * 0.011, 1.4, rage ? 2.7 : 2.4);
        boss.vy = rage ? -6.6 : -6.1;
      }
    } else if (boss.mode === "leap_air") {
      if (!boss.onGround) {
        const cx = boss.x + boss.w * 0.5;
        const toward = (boss.leapTargetX || cx) - cx;
        boss.vx += clamp(toward * 0.004, -0.05, 0.05) * dt;
        boss.vx = clamp(boss.vx, -(rage ? 2.7 : 2.4), rage ? 2.7 : 2.4);
      }
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 30 : 40;
      }
    }

    boss.vy = Math.min(boss.vy + GRAVITY * dt, MAX_FALL);
    moveWithCollisions(boss, solids, dt);
    boss.x = clamp(boss.x, BOSS_ARENA.minX + 2, BOSS_ARENA.maxX - boss.w - 2);
    if (boss.mode === "leap_air" && boss.onGround) {
      triggerImpact(2.2, boss.x + boss.w * 0.5, boss.y + boss.h, 3.2);
      playKickSfx(1.52);
      boss.mode = "idle";
      boss.modeTimer = rage ? 30 : 40;
      boss.vx *= 0.24;
      boss.vy = 0;
    }
  }

  function emitBossGroundWave(boss, rage) {
    const baseY = stage.groundY - 6;
    const speed = rage ? 2.48 : 2.16;
    const dirs = rage ? [-1, 1, -0.82, 0.82] : [-1, 1];
    for (const d of dirs) {
      stage.bossShots.push({
        kind: "wave",
        x: boss.x + boss.w * 0.5 - 5,
        y: baseY,
        baseY,
        w: 10,
        h: 5,
        vx: speed * d,
        vy: 0,
        ttl: rage ? 126 : 108,
        seed: Math.random() * Math.PI * 2,
        reason: "神の衝撃波に被弾",
      });
    }
    triggerImpact(2.8, boss.x + boss.w * 0.5, boss.y + boss.h, 4.8);
    playKickSfx(1.66);
    playProjectileSfx("cannon");
  }

  function emitBossRingShots(boss, rage) {
    const cx = boss.x + boss.w * 0.5 - 2;
    const cy = boss.y + 12;
    const angles = rage
      ? [0, 45, 90, 135, 180, 225, 270, 315]
      : [0, 60, 120, 180, 240, 300];
    for (const deg of angles) {
      const rad = (deg * Math.PI) / 180;
      stage.bossShots.push({
        kind: "ring",
        x: cx,
        y: cy,
        w: 5,
        h: 5,
        vx: Math.cos(rad) * (rage ? 1.82 : 1.56),
        vy: Math.sin(rad) * (rage ? 1.44 : 1.22),
        ttl: rage ? 132 : 116,
        reason: "神の結界弾に被弾",
      });
    }
    playKickSfx(1.52);
    playProjectileSfx("enemy");
  }

  function emitBossRainBurst(boss, rage) {
    const arenaPad = 16;
    const minX = BOSS_ARENA.minX + arenaPad;
    const maxX = BOSS_ARENA.maxX - arenaPad;
    const playerCenter = clamp(player.x + player.w * 0.5, minX, maxX);
    const offset = (Math.random() * 2 - 1) * (rage ? 88 : 66);
    const targetA = clamp(playerCenter + offset, minX, maxX);
    const targetB = clamp(boss.x + boss.w * 0.5 - offset * 0.46, minX, maxX);
    const targetC = clamp((targetA + targetB) * 0.5 + (Math.random() * 2 - 1) * 18, minX, maxX);
    const targets = rage ? [targetA, targetB, targetC] : [targetA, targetB];
    for (const tx of targets) {
      stage.bossShots.push({
        kind: "rain_warn",
        x: tx - 3,
        y: stage.groundY - 22,
        w: 6,
        h: 20,
        ttl: rage ? 24 : 28,
        wind: (Math.random() * 2 - 1) * (rage ? 0.1 : 0.08),
        rainVy: rage ? 2.34 : 2.02,
        reason: "神の落下弾に被弾",
      });
    }
    playKickSfx(1.42);
    playProjectileSfx("cannon");
  }

  function emitBossSpiralShots(boss, rage) {
    const cx = boss.x + boss.w * 0.5 - 2;
    const cy = boss.y + 10;
    const count = rage ? 7 : 5;
    const speed = rage ? 1.88 : 1.58;
    const base = ((boss.spiralAngle || 0) * Math.PI) / 180;
    for (let i = 0; i < count; i += 1) {
      const ang = base + (Math.PI * 2 * i) / count;
      stage.bossShots.push({
        kind: "spiral",
        x: cx,
        y: cy,
        w: 5,
        h: 5,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.76,
        ttl: rage ? 136 : 120,
        reason: "神の螺旋弾に被弾",
      });
    }
    playKickSfx(1.48);
    playProjectileSfx("enemy");
  }

  function emitBossNovaShots(boss, rage, phase2 = false) {
    const cx = boss.x + boss.w * 0.5 - 2;
    const cy = boss.y + 12;
    const count = phase2 ? (rage ? 10 : 8) : (rage ? 8 : 6);
    const speed = phase2 ? (rage ? 2.08 : 1.86) : (rage ? 1.92 : 1.72);
    for (let i = 0; i < count; i += 1) {
      const ang = (Math.PI * 2 * i) / count + (phase2 ? (boss.spiralAngle || 0) * Math.PI / 180 : 0);
      stage.bossShots.push({
        kind: phase2 ? "nova2" : "nova",
        x: cx,
        y: cy,
        w: 5,
        h: 5,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.82,
        ttl: phase2 ? 144 : 128,
        reason: phase2 ? "神第2形態の光弾に被弾" : "神の光弾に被弾",
      });
    }
    playKickSfx(phase2 ? 1.92 : 1.66);
    playProjectileSfx("enemy");
  }

  function updateBossShots(dt, solids) {
    const spawned = [];
    const godAdvantageActive = stage && stage.boss && stage.boss.kind === "god" && (stage.boss.gimmickAdvantageTimer || 0) > 0;
    const shotSpeedMul = godAdvantageActive ? 0.78 : 1;
    for (const shot of stage.bossShots) {
      if (shot.dead) continue;

      if (shot.kind === "rain_warn") {
        shot.ttl -= dt;
        if (shot.ttl <= 0) {
          spawned.push({
            kind: "rain",
            x: shot.x,
            y: -18,
            w: 6,
            h: 13,
            vx: shot.wind || 0,
            vy: shot.rainVy || 2.1,
            ttl: 104,
            reason: shot.reason || "神の落下弾に被弾",
          });
          shot.dead = true;
        }
        continue;
      } else if (shot.kind === "wave") {
        shot.x += shot.vx * dt * shotSpeedMul;
        shot.ttl -= dt;
        shot.phase = (shot.phase || 0) + dt * 0.22;
        shot.y = shot.baseY + Math.sin((shot.phase || 0) + (shot.seed || 0)) * 0.8;
      } else if (shot.kind === "spiral") {
        shot.x += shot.vx * dt * shotSpeedMul;
        shot.y += shot.vy * dt * shotSpeedMul;
        shot.ttl -= dt;
      } else if (shot.kind === "nova" || shot.kind === "nova2") {
        shot.x += shot.vx * dt * shotSpeedMul;
        shot.y += shot.vy * dt * shotSpeedMul;
        shot.ttl -= dt;
      } else if (shot.kind === "rain") {
        shot.x += shot.vx * dt * shotSpeedMul;
        shot.y += shot.vy * dt * shotSpeedMul;
        shot.vy += 0.16 * dt;
        shot.ttl -= dt;
      } else {
        shot.x += shot.vx * dt * shotSpeedMul;
        shot.y += shot.vy * dt * shotSpeedMul;
        shot.vy += shot.kind === "ring" ? 0.04 * dt : 0.1 * dt;
        shot.ttl -= dt;
      }

      if (overlap(player, shot)) {
        killPlayer(shot.reason || "ボス弾に被弾");
      }

      if (shot.ttl <= 0 || shot.x < BOSS_ARENA.minX - 60 || shot.x > BOSS_ARENA.maxX + 60 || shot.y > H + 30) {
        shot.dead = true;
        continue;
      }

      for (const s of solids) {
        if (overlap(shot, s)) {
          shot.dead = true;
          if (shot.kind === "rain") {
            triggerImpact(1.2, shot.x + shot.w * 0.5, shot.y + shot.h * 0.5, 2.1);
          }
          break;
        }
      }
    }

    stage.bossShots = stage.bossShots.filter((s) => !s.dead);
    if (spawned.length > 0) {
      stage.bossShots.push(...spawned);
    }
  }

  function updateBoss(dt, solids) {
    if (!stage.boss.active) return;

    const boss = stage.boss;
    if (boss.kind === "peacock") {
      updatePeacockBoss(dt, solids);
      return;
    }
    const phase = boss.phase || 1;
    const phase2 = phase >= 2;
    const rage = boss.hp <= Math.ceil(boss.maxHp * (phase2 ? 0.6 : 0.55));
    boss.invuln = Math.max(0, boss.invuln - dt);
    boss.modeTimer -= dt;
    boss.shotCooldown -= dt;
    if (boss.gimmickAdvantageTimer > 0) {
      boss.gimmickAdvantageTimer = Math.max(0, boss.gimmickAdvantageTimer - dt);
    }
    const advantageActive = (boss.gimmickAdvantageTimer || 0) > 0;

    if ((boss.phaseTransitionTimer || 0) > 0) {
      boss.phaseTransitionTimer = Math.max(0, boss.phaseTransitionTimer - dt);
      boss.mode = "phase_shift";
      boss.vx *= Math.pow(0.78, dt);
      boss.vy = Math.min(boss.vy, -1.2);
      boss.spiralAngle = (boss.spiralAngle + (rage ? 8 : 6) * dt) % 360;
      if (boss.shotCooldown <= 0) {
        emitBossNovaShots(boss, true, true);
        boss.shotCooldown = 16;
      }
      if (boss.phaseTransitionTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = 28;
        boss.shotCooldown = 12;
        boss.invuln = Math.max(boss.invuln, 14);
        hudMessage = "第2形態開始! 電磁パネルで硬直を狙え!";
        hudTimer = 96;
      }
    } else if (boss.stunTimer > 0) {
      boss.stunTimer = Math.max(0, boss.stunTimer - dt);
      boss.mode = "stunned";
      boss.vx *= Math.pow(0.56, dt);
      boss.vy = Math.min(boss.vy, 0.6);
      boss.shotCooldown = Math.max(boss.shotCooldown, 8);
      if (boss.stunTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = phase2 ? 18 : 30;
      }
    } else if (boss.mode === "intro") {
      boss.vx = -0.54;
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 38 : 48;
      }
    } else if (boss.mode === "idle") {
      const accelMul = phase2 ? 1.18 : 1;
      const accel = (rage ? 0.29 : 0.22) * accelMul * (advantageActive ? 0.72 : 1);
      const moveCap = (rage ? 1.4 : 1.12) * (phase2 ? 1.26 : 1) * (advantageActive ? 0.8 : 1);
      boss.vx += boss.dir * accel * dt;
      boss.vx = clamp(boss.vx, -moveCap, moveCap);

      if (boss.x < BOSS_ARENA.minX + 18) {
        boss.x = BOSS_ARENA.minX + 18;
        boss.dir = 1;
      } else if (boss.x + boss.w > BOSS_ARENA.maxX - 18) {
        boss.x = BOSS_ARENA.maxX - 18 - boss.w;
        boss.dir = -1;
      }

      if (boss.modeTimer <= 0) {
        const pattern = boss.attackCycle % (phase2 ? 8 : 6);
        if (pattern === 0) {
          boss.mode = "windup";
          boss.modeTimer = phase2 ? (rage ? 15 : 20) : (rage ? 20 : 28);
          boss.vx = 0;
        } else if (pattern === 1) {
          boss.mode = "shoot";
          boss.modeTimer = phase2 ? (rage ? 76 : 88) : (rage ? 78 : 66);
          boss.shotCooldown = phase2 ? (rage ? 9 : 12) : (rage ? 11 : 15);
          boss.shootVolleyCount = 0;
        } else if (pattern === 2) {
          boss.mode = "leap_prep";
          boss.modeTimer = phase2 ? (rage ? 16 : 22) : (rage ? 20 : 26);
          boss.vx *= 0.5;
        } else if (pattern === 3) {
          boss.mode = "ring";
          boss.modeTimer = phase2 ? (rage ? 78 : 90) : (rage ? 82 : 68);
          boss.shotCooldown = phase2 ? (rage ? 12 : 16) : (rage ? 14 : 18);
          boss.ringVolleyCount = 0;
          boss.vx *= 0.42;
        } else if (pattern === 4) {
          boss.mode = "rain";
          boss.modeTimer = phase2 ? (rage ? 84 : 98) : (rage ? 94 : 80);
          boss.shotCooldown = phase2 ? (rage ? 11 : 15) : (rage ? 13 : 17);
          boss.rainVolleyCount = 0;
          boss.vx *= 0.4;
        } else if (pattern === 5) {
          boss.mode = "spiral";
          boss.modeTimer = phase2 ? (rage ? 74 : 86) : (rage ? 88 : 74);
          boss.shotCooldown = phase2 ? (rage ? 10 : 13) : (rage ? 12 : 16);
          boss.spiralVolleyCount = 0;
          boss.spiralAngle = (boss.spiralAngle + (rage ? 22 : 16)) % 360;
          boss.vx *= 0.35;
        } else if (pattern === 6) {
          boss.mode = "nova";
          boss.modeTimer = rage ? 74 : 88;
          boss.shotCooldown = rage ? 10 : 14;
          boss.novaVolleyCount = 0;
          boss.vx *= 0.32;
        } else {
          boss.mode = "windup";
          boss.modeTimer = rage ? 12 : 17;
          boss.vx *= 0.24;
        }
        boss.attackCycle += 1;
      }
    } else if (boss.mode === "windup") {
      const damp = phase2 ? (rage ? 0.56 : 0.62) : (rage ? 0.62 : 0.68);
      boss.vx *= Math.pow(damp, dt);
      if (boss.modeTimer <= 0) {
        boss.mode = "dash";
        boss.modeTimer = phase2 ? (rage ? 40 : 34) : (rage ? 34 : 28);
        const speedBase = 2.55 + (boss.maxHp - boss.hp) * 0.034 + (rage ? 0.38 : 0) + (phase2 ? 0.52 : 0);
        boss.vx = boss.dir * speedBase * (advantageActive ? 0.78 : 1);
      }
    } else if (boss.mode === "dash") {
      if (boss.x <= BOSS_ARENA.minX + 3) {
        boss.x = BOSS_ARENA.minX + 3;
        boss.dir = 1;
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 20 : 30) : (rage ? 34 : 46);
      } else if (boss.x + boss.w >= BOSS_ARENA.maxX - 3) {
        boss.x = BOSS_ARENA.maxX - 3 - boss.w;
        boss.dir = -1;
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 20 : 30) : (rage ? 34 : 46);
      } else if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 20 : 30) : (rage ? 34 : 46);
      }
    } else if (boss.mode === "shoot") {
      boss.vx *= Math.pow(phase2 ? (rage ? 0.7 : 0.75) : (rage ? 0.74 : 0.79), dt);

      if (boss.shotCooldown <= 0) {
        const aim = player.x + player.w * 0.5 < boss.x + boss.w * 0.5 ? -1 : 1;
        const spread = ((boss.shootVolleyCount || 0) % 3) - 1;
        const volleyOffsets = phase2
          ? (rage ? [-0.52, -0.31, -0.14, 0.04, 0.22, 0.39, 0.56] : [-0.4, -0.22, -0.04, 0.14, 0.32])
          : (rage ? [-0.38, -0.19, 0, 0.19, 0.38] : [-0.22, 0, 0.22]);
        for (const offset of volleyOffsets) {
          stage.bossShots.push({
            x: boss.x + boss.w * 0.5 - 2,
            y: boss.y + 10,
            w: phase2 ? 6 : (rage ? 6 : 5),
            h: phase2 ? 6 : (rage ? 6 : 5),
            vx: aim * (1.68 + Math.abs(spread) * 0.16) + aim * offset * 0.36,
            vy: -0.56 + spread * 0.18 + offset,
            ttl: rage ? 148 : 136,
            reason: "神の連射弾に被弾",
          });
        }
        boss.shootVolleyCount = (boss.shootVolleyCount || 0) + 1;
        if (phase2 && boss.shootVolleyCount % 2 === 0) {
          emitBossNovaShots(boss, rage, false);
        }
        boss.shotCooldown = phase2 ? (rage ? 9 : 12) : (rage ? 12 : 17);
      }

      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 20 : 30) : (rage ? 34 : 46);
      }
    } else if (boss.mode === "leap_prep") {
      boss.vx *= Math.pow(phase2 ? (rage ? 0.6 : 0.66) : (rage ? 0.66 : 0.72), dt);
      if (boss.modeTimer <= 0) {
        const targetX = clamp(
          player.x + player.w * 0.5 + player.vx * (phase2 ? 18 : 14),
          BOSS_ARENA.minX + (phase2 ? 18 : 20),
          BOSS_ARENA.maxX - (phase2 ? 18 : 20)
        );
        const cx = boss.x + boss.w * 0.5;
        boss.leapTargetX = targetX;
        boss.mode = "leap_air";
        boss.modeTimer = phase2 ? (rage ? 90 : 78) : (rage ? 82 : 70);
        boss.dir = targetX >= cx ? 1 : -1;
        const dist = Math.abs(targetX - cx);
        boss.vx = boss.dir * clamp(1.65 + dist * 0.012, 1.65, phase2 ? (rage ? 3.6 : 3.2) : (rage ? 3.2 : 2.8));
        boss.vy = phase2 ? (rage ? -7.75 : -7.15) : (rage ? -7.35 : -6.85);
      }
    } else if (boss.mode === "leap_air") {
      if (!boss.onGround) {
        const cx = boss.x + boss.w * 0.5;
        const toward = (boss.leapTargetX || cx) - cx;
        boss.vx += clamp(toward * (phase2 ? 0.005 : 0.004), -0.05, 0.05) * dt;
        const leapCap = phase2 ? (rage ? 3.6 : 3.2) : (rage ? 3.2 : 2.8);
        boss.vx = clamp(boss.vx, -leapCap, leapCap);
      }
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 26 : 36) : (rage ? 30 : 42);
      }
    } else if (boss.mode === "ring") {
      boss.vx *= Math.pow(phase2 ? (rage ? 0.7 : 0.76) : (rage ? 0.76 : 0.82), dt);
      if (boss.shotCooldown <= 0) {
        emitBossRingShots(boss, rage);
        boss.ringVolleyCount = (boss.ringVolleyCount || 0) + 1;
        if (phase2 && boss.ringVolleyCount % 2 === 0) {
          emitBossNovaShots(boss, rage, false);
        }
        boss.shotCooldown = phase2 ? (rage ? 12 : 16) : (rage ? 17 : 23);
      }
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 20 : 30) : (rage ? 32 : 44);
      }
    } else if (boss.mode === "rain") {
      const target = player.x + player.w * 0.5 >= boss.x + boss.w * 0.5 ? 1 : -1;
      boss.vx += target * (phase2 ? (rage ? 0.028 : 0.022) : (rage ? 0.022 : 0.016)) * dt;
      boss.vx *= Math.pow(phase2 ? (rage ? 0.8 : 0.84) : (rage ? 0.84 : 0.88), dt);
      boss.vx = clamp(boss.vx, -(phase2 ? 0.92 : 0.72), phase2 ? 0.92 : 0.72);
      if (boss.shotCooldown <= 0) {
        emitBossRainBurst(boss, rage);
        boss.rainVolleyCount = (boss.rainVolleyCount || 0) + 1;
        if (phase2 && boss.rainVolleyCount % 3 === 0) {
          emitBossRingShots(boss, true);
        }
        boss.shotCooldown = phase2 ? (rage ? 10 : 14) : (rage ? 16 : 22);
      }
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 18 : 30) : (rage ? 30 : 42);
      }
    } else if (boss.mode === "spiral") {
      const target = player.x + player.w * 0.5 >= boss.x + boss.w * 0.5 ? 1 : -1;
      boss.vx += target * (phase2 ? (rage ? 0.036 : 0.03) : (rage ? 0.03 : 0.022)) * dt;
      boss.vx *= Math.pow(phase2 ? (rage ? 0.82 : 0.86) : (rage ? 0.86 : 0.9), dt);
      boss.vx = clamp(boss.vx, -(phase2 ? 1.1 : 0.9), phase2 ? 1.1 : 0.9);
      if (boss.shotCooldown <= 0) {
        emitBossSpiralShots(boss, rage);
        boss.spiralVolleyCount = (boss.spiralVolleyCount || 0) + 1;
        boss.spiralAngle = (boss.spiralAngle + (phase2 ? (rage ? 48 : 38) : (rage ? 36 : 27))) % 360;
        if (phase2 && boss.spiralVolleyCount % 2 === 0) {
          emitBossNovaShots(boss, rage, true);
        }
        boss.shotCooldown = phase2 ? (rage ? 8 : 11) : (rage ? 11 : 15);
      }
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = phase2 ? (rage ? 16 : 26) : (rage ? 28 : 40);
      }
    } else if (boss.mode === "nova") {
      const target = player.x + player.w * 0.5 >= boss.x + boss.w * 0.5 ? 1 : -1;
      boss.vx += target * (rage ? 0.036 : 0.03) * dt;
      boss.vx *= Math.pow(rage ? 0.84 : 0.88, dt);
      boss.vx = clamp(boss.vx, -1.12, 1.12);
      if (boss.shotCooldown <= 0) {
        emitBossNovaShots(boss, rage, true);
        boss.novaVolleyCount = (boss.novaVolleyCount || 0) + 1;
        if (boss.novaVolleyCount % 2 === 0) {
          emitBossRingShots(boss, true);
        }
        boss.shotCooldown = rage ? 10 : 13;
      }
      if (boss.modeTimer <= 0) {
        boss.mode = "idle";
        boss.modeTimer = rage ? 18 : 28;
      }
    }

    boss.vy = Math.min(boss.vy + GRAVITY * dt, MAX_FALL);
    moveWithCollisions(boss, solids, dt);
    boss.x = clamp(boss.x, BOSS_ARENA.minX + 2, BOSS_ARENA.maxX - boss.w - 2);
    if (boss.mode === "leap_air" && boss.onGround) {
      emitBossGroundWave(boss, phase2 ? true : rage);
      boss.mode = "idle";
      boss.modeTimer = phase2 ? (rage ? 20 : 30) : (rage ? 30 : 42);
      boss.vx *= 0.28;
      boss.vy = 0;
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
    stompChainGuardTimer = Math.max(0, stompChainGuardTimer - dt);
    hammerTimer = Math.max(0, hammerTimer - dt);
    gloveTimer = Math.max(0, gloveTimer - dt);
    hammerHitCooldown = Math.max(0, hammerHitCooldown - dt);
    gloveHitCooldown = Math.max(0, gloveHitCooldown - dt);
    weaponHudTimer = Math.max(0, weaponHudTimer - dt);
    attackCooldown = Math.max(0, attackCooldown - dt);
    attackMashTimer = Math.max(0, attackMashTimer - dt);
    if (attackMashTimer <= 0) {
      attackMashCount = 0;
    }
    attackEffectTimer = Math.max(0, attackEffectTimer - dt);
    attackEffectPhase += dt;
    waveFlashTimer = Math.max(0, waveFlashTimer - dt);
    waveFlashPower = Math.max(0, waveFlashPower - dt * 0.08);
    dashJumpAssistTimer = Math.max(0, dashJumpAssistTimer - dt);
    proteinBurstLaserTimer = Math.max(0, proteinBurstLaserTimer - dt);
    proteinBurstLaserPhase += dt;
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

    const groundY = stage && typeof stage.groundY === "number" ? stage.groundY : H - 20;
    for (const spark of hitSparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      const gravity = spark.gravity === undefined ? 0.18 : spark.gravity;
      const drag = spark.drag === undefined ? 0.94 : spark.drag;
      spark.vy += gravity * dt;
      spark.vx *= Math.pow(drag, dt);
      if (spark.kind === "blood") {
        spark.vy = Math.min(spark.vy, 6.8);
        if (!spark.splatted && spark.vy > 0.2 && spark.y >= groundY - 1) {
          spark.y = groundY - 1 + Math.random() * 0.5;
          spark.vx *= 0.38;
          spark.vy *= -0.16;
          spark.splatted = true;
          const baseSize = Math.max(1, spark.size || 1);
          spark.poolW = Math.max(2, Math.round(baseSize + Math.abs(spark.vx) * 2.1 + Math.random() * 2.4));
          spark.poolH = Math.max(1, Math.round(baseSize * 0.75));
          spark.life = Math.max(spark.life, 10 + Math.random() * 9);
          spark.maxLife = Math.max(spark.maxLife, spark.life);
        }
        if (spark.splatted) {
          spark.vx *= Math.pow(0.74, dt);
          spark.vy *= Math.pow(0.56, dt);
        }
      }
      spark.life -= dt;
    }

    for (const burst of waveBursts) {
      burst.life -= dt;
      burst.radius += (0.62 + burst.power * 0.26) * dt;
      burst.phase += dt * (0.16 + burst.power * 0.08);
    }

    for (const pop of invincibleBonusPops) {
      pop.life -= dt;
      pop.phase += dt * (0.22 + pop.power * 0.02);
      pop.x += pop.vx * dt + Math.sin(pop.phase) * 0.03 * dt;
      pop.y -= pop.vy * dt;
      pop.vy = Math.max(0.14, pop.vy * Math.pow(0.975, dt));
    }

    hitSparks = hitSparks.filter((s) => s.life > 0);
    waveBursts = waveBursts.filter((b) => b.life > 0);
    invincibleBonusPops = invincibleBonusPops.filter((p) => p.life > 0);
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
    playCheckpointSfx();
    preBossCutsceneTimer = -PRE_BOSS_ENTRY_DURATION;
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
    invincibleTimer = 0;
    invincibleHitCooldown = 0;
    stopInvincibleMusic();
    stage.playerWaves = [];
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    const entryStartX = stage.goal.x - player.w - 16;
    player.x = Math.min(player.x, entryStartX);
    player.y = stage.groundY - player.h;
    player.facing = 1;
    player.onGround = true;
    player.vx = 0;
    player.vy = 0;
    player.anim = 0;
    hudMessage = "";
    hudTimer = 0;
  }

  function sampleActions() {
    const actions = {
      jumpPressed: input.jump && !prevInput.jump,
      attackPressed: input.attack && !prevInput.attack,
      attackReleased: !input.attack && prevInput.attack,
      specialPressed: input.special && !prevInput.special,
      startPressed: input.start && !prevInput.start,
    };

    prevInput.jump = input.jump;
    prevInput.attack = input.attack;
    prevInput.special = input.special;
    prevInput.start = input.start;

    return actions;
  }

  function updatePlay(dt, actions) {
    if (hudTimer > 0) hudTimer -= dt;
    updateImpactEffects(dt);
    consumeBurstIfPressed(actions);

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
    const bursting = updateProteinBurst(dt, solids, 0, stage.width - player.w);

    if (!bursting) {
      const wasOnGround = player.onGround;
      const vyBeforeMove = player.vy;
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
        playJumpSfx();
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
      if (!wasOnGround && player.onGround && vyBeforeMove > 1.6) {
        playLandSfx(0.9 + clamp(vyBeforeMove / 6, 0, 1.2));
      }
      player.anim += dt;
    }

    updateCrumble(dt);
    updatePopSpikes(dt);
    updateFallBlocks(dt);
    updateCannons(dt);

    const solidsAfter = collectSolids();
    updateEnemies(dt, solidsAfter);
    updateHazardBullets(dt, solidsAfter);
    updateProteins(dt);
    updateHeartItems(dt);
    updateLifeUpItems(dt);
    updateBikes(dt);
    updateCheckpointTokens(dt);
    if (proteinBurstTimer <= 0) {
      updatePlayerAttack(dt, actions);
    }
    updatePlayerWaves(dt, solidsAfter);
    resolveEnemyContactDamage();
    resolveBreakWalls(dt);
    resolveHazards();
    resolveGoal();

    cameraX = clamp(player.x + player.w * 0.5 - W * 0.45, 0, stage.width - W);
  }

  function updateBossBattle(dt, actions) {
    if (hudTimer > 0) hudTimer -= dt;
    updateImpactEffects(dt);
    consumeBurstIfPressed(actions);

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
    const bursting = updateProteinBurst(dt, solids, BOSS_ARENA.minX + 2, BOSS_ARENA.maxX - player.w - 2);

    if (!bursting) {
      const wasOnGround = player.onGround;
      const vyBeforeMove = player.vy;
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
        playJumpSfx();
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
      if (!wasOnGround && player.onGround && vyBeforeMove > 1.6) {
        playLandSfx(0.9 + clamp(vyBeforeMove / 6, 0, 1.2));
      }
      player.anim += dt;
    }

    updateProteins(dt);
    updateHeartItems(dt);
    updateLifeUpItems(dt);
    updateBikes(dt);
    updateBoss(dt, solids);
    updateGodGimmicks(dt);
    updateBossShots(dt, solids);
    updateEnemies(dt, solids);
    updateHazardBullets(dt, solids);
    if (proteinBurstTimer <= 0) {
      updatePlayerAttack(dt, actions);
    }
    updatePlayerWaves(dt, solids);
    resolveEnemyContactDamage();
    resolveBossContactDamage();
    resolveBreakWalls(dt);
    resolveHazards();

    cameraX = clamp(player.x + player.w * 0.5 - W * 0.45, BOSS_ARENA.minX - 120, stage.width - W);
  }

  function beginOpeningCutscene() {
    playUiStartSfx();
    titleTimer = 0;
    cutsceneTime = 0;
    preBossCutsceneTimer = 0;
    cameraX = 0;
    gameState = STATE.CUTSCENE;
    startOpeningTheme();
  }

  function updateTitle(dt, actions) {
    cameraX = 0;
    titleTimer += dt;
    player.anim += dt * 0.45;
    startOpeningTheme();

    if (actions.startPressed || actions.jumpPressed || actions.attackPressed) {
      beginOpeningCutscene();
    }
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
    const stage1Peacock = stage.boss && stage.boss.kind === "peacock";
    const movieDuration = stage1Peacock ? 320 : PRE_BOSS_CUTSCENE_DURATION;
    if (actions.startPressed || actions.jumpPressed) {
      startBossBattle();
      return;
    }

    if (preBossCutsceneTimer < 0) {
      const targetX = stage.goal.x + 4;
      player.facing = 1;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      player.x = Math.min(targetX, player.x + 0.94 * dt);
      player.anim += dt * 0.7;
      cameraX = clamp(stage.goal.x + stage.goal.w * 0.5 - W * 0.56, 0, stage.width - W);
      preBossCutsceneTimer += dt;
      if (preBossCutsceneTimer >= 0) {
        preBossCutsceneTimer = 0;
        startOpeningTheme();
      }
      return;
    }

    preBossCutsceneTimer += dt;
    startOpeningTheme();
    if (preBossCutsceneTimer > movieDuration) {
      startBossBattle();
    }
  }

  function returnToTitle() {
    deadReason = "";
    currentStageNumber = 1;
    collectedProteinIds = new Set();
    collectedLifeUpIds = new Set();
    stage = buildStage();
    const cp = stage.checkpoints[0];
    player = createPlayer(cp.x, cp.y);
    BOSS_ARENA = stage.bossArena ? { ...stage.bossArena } : BOSS_ARENA;
    titleTimer = 0;
    deathPauseTimer = 0;
    deathAnimActive = false;
    deathJumpVy = 0;
    deadTimer = 0;
    deadTimerMax = 0;
    cutsceneTime = 0;
    preBossCutsceneTimer = 0;
    deathContinueMode = "checkpoint";
    cameraX = 0;
    attackCooldown = 0;
    attackChargeTimer = 0;
    attackChargeReadyPlayed = false;
    attackMashCount = 0;
    attackMashTimer = 0;
    hyakuretsuTimer = 0;
    hyakuretsuHitTimer = 0;
    attackEffectTimer = 0;
    attackEffectMode = "none";
    attackEffectPhase = 0;
    attackEffectPower = 0;
    stompChainGuardTimer = 0;
    proteinBurstGauge = 0;
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
    stage.playerWaves = [];
    waveFlashTimer = 0;
    waveFlashPower = 0;
    waveBursts = [];
    invincibleBonusPops = [];
    stopInvincibleMusic();
    stopStageMusic(true);
    gameState = STATE.TITLE;
    startOpeningTheme();
  }

  function startNextStage() {
    if (currentStageNumber >= FINAL_STAGE_NUMBER) {
      returnToTitle();
      return;
    }
    currentStageNumber += 1;
    cutsceneTime = 0;
    preBossCutsceneTimer = 0;
    deadReason = "";
    proteinBurstGauge = 0;
    proteinBurstTimer = 0;
    proteinBurstBlastDone = false;
    proteinBurstLaserTimer = 0;
    proteinBurstLaserPhase = 0;
    proteinBurstUsedGauge = 0;
    proteinBurstPower = 1;
    stopInvincibleMusic();
    stopStageMusic(true);
    startGameplay(false, { keepLives: true, keepDeaths: true });
  }

  function updateDead(dt, actions) {
    deadTimer = Math.max(0, deadTimer - dt);
    deathFlashTimer = Math.max(0, deathFlashTimer - dt);
    deathShakeTimer = Math.max(0, deathShakeTimer - dt);

    const wantsFastContinue = actions.startPressed || actions.jumpPressed;
    if (wantsFastContinue && deathPauseTimer <= 0 && deadTimer > 0) {
      deadTimer = Math.min(deadTimer, 14);
    }

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
      if (deathContinueMode === "boss") {
        respawnFromBossBattle();
      } else {
        respawnFromCheckpoint();
      }
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

    const finalStage = currentStageNumber >= FINAL_STAGE_NUMBER;
    if (!finalStage) {
      if (clearTimer > 150 && (actions.startPressed || actions.jumpPressed || actions.attackPressed)) {
        startNextStage();
        return;
      }
      if (clearTimer > 280) {
        startNextStage();
      }
      return;
    }

    if (clearTimer > 180 && (actions.startPressed || actions.jumpPressed || actions.attackPressed)) {
      returnToTitle();
    }
  }

  function update(dt, actions) {
    updateStageMusicFade(dt);

    if (gameState === STATE.TITLE) {
      updateTitle(dt, actions);
      return;
    }

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
      updateDead(dt, actions);
      return;
    }

    if (gameState === STATE.CLEAR) {
      updateClear(dt, actions);
    }
  }

  function drawSkyGradient() {
    const deluxeCity = stage && stage.theme === "city_deluxe";
    if (deluxeCity) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#02040a");
      g.addColorStop(0.25, "#0d1630");
      g.addColorStop(0.52, "#1c3560");
      g.addColorStop(0.78, "#2f5a87");
      g.addColorStop(1, "#4f7aa3");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const moonGlow = ctx.createRadialGradient(250, 24, 2, 250, 24, 34);
      moonGlow.addColorStop(0, "rgba(255,240,206,0.98)");
      moonGlow.addColorStop(0.2, "rgba(255,223,166,0.62)");
      moonGlow.addColorStop(0.5, "rgba(255,168,133,0.24)");
      moonGlow.addColorStop(1, "rgba(255,210,150,0)");
      ctx.fillStyle = moonGlow;
      ctx.fillRect(210, 0, 86, 76);

      ctx.fillStyle = "rgba(255, 126, 177, 0.08)";
      ctx.fillRect(0, 70, W, 20);
      ctx.fillStyle = "rgba(120, 214, 255, 0.12)";
      ctx.fillRect(0, 88, W, 26);

      const twinkleSeed = Math.floor(player.anim * 0.7);
      for (let i = 0; i < 46; i += 1) {
        const sx = ((i * 23 + Math.floor(cameraX * 0.09)) % (W + 16)) - 8;
        const sy = 4 + ((i * 19) % 58);
        const blink = (twinkleSeed + i * 2) % 16 < 4;
        ctx.fillStyle = blink ? "#f8fbff" : "rgba(188,213,255,0.76)";
        ctx.fillRect(Math.floor(sx), sy, 1, 1);
        if (blink && i % 6 === 0) {
          ctx.fillRect(Math.floor(sx) - 1, sy, 1, 1);
          ctx.fillRect(Math.floor(sx) + 1, sy, 1, 1);
        }
      }
      return;
    }

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
    const deluxeCity = stage && stage.theme === "city_deluxe";
    if (deluxeCity) {
      const farShift = -Math.floor(cameraX * 0.1) % 168;
      for (let block = -2; block < 6; block += 1) {
        const base = block * 168 + farShift;
        for (let i = 0; i < 12; i += 1) {
          const bw = 10 + ((i + block + 13) % 3) * 3;
          const h = 42 + ((i * 12 + block * 7 + 180) % 48);
          const bx = Math.floor(base + i * 14);
          const by = 124 - h;

          ctx.fillStyle = "#14213a";
          ctx.fillRect(bx, by, bw, h);
          ctx.fillStyle = "#203459";
          ctx.fillRect(bx + 1, by + 1, bw - 2, h - 2);
          ctx.fillStyle = "#0a1224";
          ctx.fillRect(bx + bw - 2, by + 1, 1, h - 2);

          for (let wy = by + 6; wy < 122; wy += 6) {
            const lit = (wy + i + block) % 3 !== 0;
            ctx.fillStyle = lit ? "#8ce8ff" : "#2b456a";
            ctx.fillRect(bx + 2, wy, 2, 1);
            ctx.fillStyle = lit && i % 2 === 0 ? "#ffd8a2" : "#253e5f";
            ctx.fillRect(bx + bw - 4, wy + 1, 2, 1);
          }
          if ((i + block) % 5 === 0) {
            ctx.fillStyle = "#35608f";
            ctx.fillRect(bx + 2, by - 3, bw - 4, 2);
            ctx.fillStyle = "#ff62ab";
            ctx.fillRect(bx + 4, by - 2, Math.max(1, bw - 8), 1);
          }
        }
      }

      const midShift = -Math.floor(cameraX * 0.26) % 132;
      for (let block = -2; block < 7; block += 1) {
        const base = block * 132 + midShift;
        for (let i = 0; i < 8; i += 1) {
          const bw = 13 + ((i + block + 18) % 2) * 3;
          const h = 58 + ((i * 15 + block * 10 + 170) % 46);
          const bx = Math.floor(base + i * 17);
          const by = 144 - h;

          ctx.fillStyle = "#1f3254";
          ctx.fillRect(bx, by, bw, h);
          ctx.fillStyle = "#33567f";
          ctx.fillRect(bx, by, bw, 3);
          ctx.fillStyle = "#142844";
          ctx.fillRect(bx + bw - 2, by + 2, 1, h - 2);

          for (let wy = by + 8; wy < 140; wy += 7) {
            ctx.fillStyle = (wy + i) % 2 === 0 ? "#7ceeff" : "#31557f";
            ctx.fillRect(bx + 3, wy, 2, 2);
            ctx.fillStyle = (wy + i) % 3 === 0 ? "#ffcb83" : "#2d4b72";
            ctx.fillRect(bx + bw - 5, wy + 1, 2, 2);
          }

          if ((i + block) % 4 === 0) {
            ctx.fillStyle = "rgba(121, 237, 255, 0.16)";
            ctx.fillRect(bx + 1, by + 5, bw - 2, 2);
          }
        }
      }

      ctx.fillStyle = "rgba(145, 188, 235, 0.16)";
      ctx.fillRect(0, 118, W, 26);
      ctx.fillStyle = "rgba(255, 132, 186, 0.1)";
      ctx.fillRect(0, 128, W, 8);

      ctx.fillStyle = "#1d2431";
      ctx.fillRect(0, 136, W, 8);
      ctx.fillStyle = "#2f394b";
      const railShift = -Math.floor(cameraX * 0.58) % 22;
      for (let x = railShift - 22; x < W + 22; x += 22) {
        ctx.fillRect(x, 144, 4, 8);
        ctx.fillStyle = "#566076";
        ctx.fillRect(x + 1, 144, 1, 8);
        ctx.fillStyle = "#2f394b";
      }
      return;
    }

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

  function drawMansionInteriorBackdrop() {
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, "#191320");
    wall.addColorStop(0.56, "#35253f");
    wall.addColorStop(1, "#201b2c");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);

    const panelShift = -Math.floor(cameraX * 0.22) % 48;
    for (let x = panelShift - 48; x < W + 48; x += 48) {
      ctx.fillStyle = "#2c1f36";
      ctx.fillRect(x + 2, 6, 44, 116);
      ctx.fillStyle = "#412d4e";
      ctx.fillRect(x + 4, 8, 40, 3);
      ctx.fillStyle = "rgba(255, 214, 152, 0.06)";
      ctx.fillRect(x + 6, 12, 1, 105);
      ctx.fillRect(x + 42, 12, 1, 105);
    }

    const windowShift = -Math.floor(cameraX * 0.1) % 104;
    for (let i = -1; i < 4; i += 1) {
      const wx = i * 104 + 24 + windowShift;
      const wy = 18;
      ctx.fillStyle = "#111827";
      ctx.fillRect(wx, wy, 40, 54);
      ctx.fillStyle = "#223b63";
      ctx.fillRect(wx + 2, wy + 2, 36, 50);
      ctx.fillStyle = "rgba(122, 196, 255, 0.35)";
      for (let y = wy + 7; y < wy + 48; y += 8) {
        ctx.fillRect(wx + 4, y, 6, 2);
        ctx.fillRect(wx + 30, y + 2, 6, 2);
      }
      ctx.fillStyle = "#9d7a58";
      ctx.fillRect(wx - 2, wy - 2, 44, 2);
      ctx.fillRect(wx - 2, wy + 54, 44, 2);
      ctx.fillStyle = "#6a4e38";
      ctx.fillRect(wx - 3, wy, 2, 54);
      ctx.fillRect(wx + 41, wy, 2, 54);
    }

    const sway = Math.sin(player.anim * 0.08) * 1.4;
    const chainX = Math.floor(160 + sway);
    ctx.fillStyle = "#c9a46f";
    ctx.fillRect(chainX - 1, 0, 2, 20);
    ctx.fillRect(chainX - 9, 19, 18, 2);
    ctx.fillStyle = "#daba86";
    ctx.fillRect(chainX - 16, 21, 32, 3);
    ctx.fillStyle = "rgba(255, 232, 170, 0.42)";
    ctx.fillRect(chainX - 24, 24, 48, 8);
    ctx.fillStyle = "#fff2c8";
    ctx.fillRect(chainX - 14, 24, 4, 4);
    ctx.fillRect(chainX - 2, 24, 4, 4);
    ctx.fillRect(chainX + 10, 24, 4, 4);

    ctx.fillStyle = "#382533";
    ctx.fillRect(0, 130, W, 50);
    ctx.fillStyle = "#4f3344";
    ctx.fillRect(0, 130, W, 6);
    ctx.fillStyle = "#251a26";
    for (let y = 138; y < H; y += 10) {
      ctx.fillRect(0, y, W, 1);
    }

    ctx.fillStyle = "#6e2f45";
    ctx.fillRect(34, 136, W - 68, 42);
    ctx.fillStyle = "#9f4f68";
    ctx.fillRect(36, 138, W - 72, 3);
    ctx.fillStyle = "rgba(255, 204, 220, 0.1)";
    for (let x = 48; x < W - 48; x += 28) {
      ctx.fillRect(x, 148, 12, 1);
      ctx.fillRect(x + 6, 160, 10, 1);
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
    const bob = Math.floor(Math.sin(player.anim * 0.14 + x * 0.02) * 0.6);
    const paint = (color, dx, dy, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(px + dx, py + dy + bob, w, h);
    };

    // Red cap silhouette.
    paint("#151a24", 2, 0, 11, 1);
    paint("#d64343", 3, 1, 9, 3);
    paint("#ba3333", 3, 4, 10, 1);
    paint("#922326", 10, 2, 3, 3);
    paint("#df5353", 4, 2, 4, 1);
    paint("#7d2025", 9, 5, 5, 1);
    paint("#2a1f29", 12, 5, 2, 2);

    // Face with under-cap shadow for a more human look while keeping details subtle.
    paint("#f2d7c4", 4, 5, 7, 6);
    paint("#e6c1ad", 5, 10, 5, 1);
    paint("#2a2e3a", 4, 5, 3, 2);
    paint("#2a2e3a", 9, 6, 2, 2);
    paint("#1d2432", 6, 7, 1, 1);
    paint("#1d2432", 8, 7, 1, 1);
    paint("#f8ece4", 7, 7, 1, 1);
    paint("#7f5746", 6, 9, 2, 1);
    paint("#ddb9a4", 10, 8, 1, 2);
    paint("#f0d5c2", 6, 11, 2, 1);

    // Hoodie + jacket torso.
    paint("#1e2737", 4, 12, 6, 2);
    paint("#d9dfea", 6, 12, 2, 1);
    paint("#2f4f7a", 3, 14, 10, 8);
    paint("#466d9e", 4, 14, 8, 4);
    paint("#2a405f", 7, 14, 1, 8);
    paint("#f1f4f8", 6, 15, 3, 4);
    paint("#d8dde4", 6, 19, 3, 1);

    // Arms and hands.
    paint("#20293a", 1, 14, 2, 6);
    paint("#20293a", 13, 14, 2, 6);
    paint("#f0d5c2", 1, 19, 1, 2);
    paint("#f0d5c2", 14, 19, 1, 2);

    // Pants + sneakers.
    paint("#324457", 4, 22, 8, 1);
    paint("#2b3446", 4, 23, 3, 4);
    paint("#2b3446", 9, 23, 3, 4);
    paint("#1e2431", 5, 23, 1, 3);
    paint("#1e2431", 10, 23, 1, 3);
    paint("#171a22", 3, 27, 4, 1);
    paint("#171a22", 9, 27, 4, 1);
    paint("#f3f4f8", 6, 27, 1, 1);
    paint("#f3f4f8", 12, 27, 1, 1);
  }

  function drawEnemy(enemy) {
    if (enemy.kind === "partygoon") {
      const x = Math.floor(enemy.x - cameraX);
      const y = Math.floor(enemy.y);
      const blink = Math.floor((player.anim + enemy.x) * 0.12) % 2 === 0;

      ctx.fillStyle = "#171220";
      ctx.fillRect(x + 1, y, 11, 1);
      ctx.fillRect(x, y + 1, 13, 7);

      ctx.fillStyle = "#a64464";
      ctx.fillRect(x + 2, y + 1, 9, 3);
      ctx.fillStyle = "#7d3551";
      ctx.fillRect(x + 3, y + 3, 7, 1);

      ctx.fillStyle = "#f0c9b4";
      ctx.fillRect(x + 3, y + 4, 7, 4);
      ctx.fillStyle = "#201d27";
      ctx.fillRect(x + 4, y + 5, 1, 1);
      ctx.fillRect(x + 8, y + 5, 1, 1);
      ctx.fillStyle = "#8a574a";
      ctx.fillRect(x + 5, y + 6, 3, 1);

      ctx.fillStyle = "#3f2c3c";
      ctx.fillRect(x + 2, y + 8, 9, 6);
      ctx.fillStyle = "#5d4157";
      ctx.fillRect(x + 3, y + 9, 7, 2);
      ctx.fillStyle = "#8ea2c4";
      ctx.fillRect(x + 6, y + 9, 1, 4);

      ctx.fillStyle = "#2a2d3b";
      ctx.fillRect(x + 2, y + 14, 3, 2);
      ctx.fillRect(x + 8, y + 14, 3, 2);
      ctx.fillStyle = "#16161f";
      ctx.fillRect(x + 2, y + 16, 3, 1);
      ctx.fillRect(x + 8, y + 16, 3, 1);

      if (blink) {
        ctx.fillStyle = "#b8efff";
        const sx = enemy.dir > 0 ? x + 12 : x - 2;
        ctx.fillRect(sx, y + 5, 1, 1);
      }
      return;
    }

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
    if (b.kind === "peacock") {
      const warn = b.mode === "windup" || b.mode === "dash";
      const cast = b.mode === "shoot";
      const rage = b.hp <= Math.ceil(b.maxHp * 0.4);

      ctx.fillStyle = "#0f1724";
      ctx.fillRect(x + 3, y + 8, 18, 18);
      ctx.fillStyle = rage ? "#1c89c4" : "#2794b8";
      ctx.fillRect(x + 4, y + 10, 16, 14);
      ctx.fillStyle = "#52d4e8";
      ctx.fillRect(x + 7, y + 11, 10, 5);
      ctx.fillStyle = "#2d6e93";
      ctx.fillRect(x + 6, y + 16, 12, 6);

      ctx.fillStyle = "#f5d57e";
      if (b.dir > 0) {
        ctx.fillRect(x + 20, y + 12, 5, 3);
      } else {
        ctx.fillRect(x + 1, y + 12, 5, 3);
      }

      ctx.fillStyle = "#1d2f4f";
      ctx.fillRect(x + 8, y + 6, 8, 4);
      ctx.fillStyle = "#d8f0ff";
      ctx.fillRect(x + 10, y + 7, 1, 1);
      ctx.fillStyle = "#f7fbff";
      ctx.fillRect(x + 13, y + 7, 1, 1);

      ctx.fillStyle = rage ? "#217cab" : "#2b85ad";
      ctx.fillRect(x - 6, y + 4, 8, 22);
      ctx.fillRect(x + 22, y + 4, 8, 22);
      ctx.fillStyle = "#72e4f0";
      ctx.fillRect(x - 4, y + 8, 3, 13);
      ctx.fillRect(x + 24, y + 8, 3, 13);
      ctx.fillStyle = "#f6e0a3";
      ctx.fillRect(x - 3, y + 15, 1, 2);
      ctx.fillRect(x + 25, y + 15, 1, 2);

      ctx.fillStyle = "#2b3b55";
      ctx.fillRect(x + 7, y + 26, 4, 8);
      ctx.fillRect(x + 14, y + 26, 4, 8);
      ctx.fillStyle = "#1a2333";
      ctx.fillRect(x + 7, y + 34, 4, 2);
      ctx.fillRect(x + 14, y + 34, 4, 2);

      if (cast || warn) {
        ctx.fillStyle = "rgba(132, 224, 255, 0.42)";
        ctx.fillRect(x - 3, y + 9, 30, 10);
      }
      if (warn) {
        ctx.strokeStyle = "rgba(255, 228, 165, 0.9)";
        ctx.strokeRect(x - 2, y - 1, b.w + 4, b.h + 3);
      }
      return;
    }
    const phase2 = (b.phase || 1) >= 2;
    const transitioning = (b.phaseTransitionTimer || 0) > 0;
    const stunned = (b.stunTimer || 0) > 0;
    const advantage = (b.gimmickAdvantageTimer || 0) > 0;
    const warn = b.mode === "windup" || b.mode === "dash" || b.mode === "phase_shift";
    const cast = b.mode === "shoot" || b.mode === "ring" || b.mode === "rain" || b.mode === "spiral" || b.mode === "nova" || b.mode === "phase_shift";
    const rage = b.hp <= Math.ceil(b.maxHp * (phase2 ? 0.45 : 0.35));

    ctx.fillStyle = "#11131a";
    ctx.fillRect(x + 1, y, 22, 1);
    ctx.fillRect(x, y + 1, 24, 35);

    ctx.fillStyle = phase2 ? (rage ? "#f2b766" : "#efcd95") : (rage ? "#f3cc74" : "#e7dfb5");
    ctx.fillRect(x + 8, y - 3, 8, 2);
    ctx.fillStyle = phase2 ? "rgba(255, 214, 146, 0.5)" : "rgba(255, 231, 177, 0.45)";
    ctx.fillRect(x + 7, y - 2, 10, 1);

    ctx.fillStyle = warn ? "#f4f9ff" : (phase2 ? "#f3f0ff" : "#eaf0fb");
    ctx.fillRect(x + 4, y + 1, 16, 6);
    ctx.fillStyle = "#d7e0f2";
    ctx.fillRect(x + 5, y + 2, 14, 3);
    ctx.fillStyle = "#c2cce2";
    ctx.fillRect(x + 6, y + 6, 12, 2);

    ctx.fillStyle = "#efd7c3";
    ctx.fillRect(x + 7, y + 8, 10, 6);
    ctx.fillStyle = "#d2b29a";
    ctx.fillRect(x + 8, y + 13, 8, 1);
    ctx.fillStyle = warn || cast || rage ? "#ffd6a6" : "#b6e1ff";
    ctx.fillRect(x + 9, y + 10, 2, 1);
    ctx.fillRect(x + 13, y + 10, 2, 1);

    ctx.fillStyle = "#f1f5ff";
    ctx.fillRect(x + 8, y + 13, 8, 5);
    ctx.fillStyle = "#d9e2f3";
    ctx.fillRect(x + 9, y + 14, 6, 3);
    ctx.fillStyle = "#f8fbff";
    ctx.fillRect(x + 10, y + 17, 4, 2);

    ctx.fillStyle = warn ? "#c4ccd9" : (phase2 ? "#b9b5cf" : "#b6c0d0");
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

    if (cast || warn) {
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

    if (phase2 || transitioning) {
      const auraAlpha = transitioning ? 0.42 : (advantage ? 0.34 : 0.22);
      ctx.fillStyle = `rgba(136, 223, 255, ${auraAlpha})`;
      ctx.fillRect(x - 3, y - 3, b.w + 6, 1);
      ctx.fillRect(x - 3, y + b.h + 1, b.w + 6, 1);
      ctx.fillRect(x - 3, y - 2, 1, b.h + 4);
      ctx.fillRect(x + b.w + 2, y - 2, 1, b.h + 4);
    }

    if (stunned) {
      ctx.fillStyle = "rgba(134, 236, 255, 0.74)";
      ctx.fillRect(x + 6, y - 6, 2, 2);
      ctx.fillRect(x + 11, y - 8, 2, 2);
      ctx.fillRect(x + 16, y - 6, 2, 2);
    }
  }

  function drawProtein(protein) {
    if (protein.collected) return;
    const x = Math.floor(protein.x - cameraX);
    const y = Math.floor(protein.y + Math.sin(protein.bob) * 1.7);

    ctx.fillStyle = "rgba(120, 220, 255, 0.18)";
    ctx.fillRect(x - 2, y - 2, 14, 16);

    // Cap
    ctx.fillStyle = "#0f1320";
    ctx.fillRect(x + 2, y + 0, 6, 2);
    ctx.fillStyle = "#d9b473";
    ctx.fillRect(x + 3, y + 0, 4, 1);

    // Bottle body
    ctx.fillStyle = "#11182a";
    ctx.fillRect(x + 1, y + 2, 8, 10);
    ctx.fillStyle = "#f6f9ff";
    ctx.fillRect(x + 2, y + 3, 6, 8);
    ctx.fillStyle = "#d9e1ef";
    ctx.fillRect(x + 2, y + 10, 6, 1);

    // Blue label with clear P icon
    ctx.fillStyle = "#2f7de0";
    ctx.fillRect(x + 2, y + 5, 6, 4);
    ctx.fillStyle = "#b9deff";
    ctx.fillRect(x + 3, y + 6, 1, 2);
    ctx.fillRect(x + 4, y + 6, 2, 1);
    ctx.fillRect(x + 4, y + 7, 1, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 3, y + 4, 1, 1);
    ctx.fillRect(x + 7, y + 4, 1, 1);
  }

  function drawHeartPickup(item) {
    if (item.collected) return;
    const x = Math.floor(item.x - cameraX);
    const y = Math.floor(item.y + Math.sin(item.bob) * 1.5);
    const pulse = Math.floor((player.anim + item.id * 9) * 0.2) % 2 === 0;

    ctx.fillStyle = "rgba(255, 132, 168, 0.2)";
    ctx.fillRect(x - 2, y - 2, 16, 16);
    ctx.fillStyle = "#261824";
    ctx.fillRect(x + 1, y + 1, 10, 10);
    ctx.fillStyle = "#d63f66";
    ctx.fillRect(x + 2, y + 1, 2, 2);
    ctx.fillRect(x + 6, y + 1, 2, 2);
    ctx.fillRect(x + 1, y + 2, 8, 4);
    ctx.fillRect(x + 2, y + 6, 6, 2);
    ctx.fillRect(x + 3, y + 8, 4, 1);
    ctx.fillStyle = "#ff86a3";
    ctx.fillRect(x + 3, y + 2, 1, 1);
    ctx.fillRect(x + 7, y + 2, 1, 1);

    if (pulse) {
      ctx.fillStyle = "#ffe1e8";
      ctx.fillRect(x - 1, y + 4, 1, 1);
      ctx.fillRect(x + 12, y + 5, 1, 1);
      ctx.fillRect(x + 5, y - 1, 1, 1);
      ctx.fillRect(x + 6, y + 11, 1, 1);
    }
  }

  function drawLifeUpItem(item) {
    if (item.collected) return;
    const x = Math.floor(item.x - cameraX);
    const y = Math.floor(item.y + Math.sin(item.bob) * 1.7);
    const blink = Math.floor((player.anim + item.id * 13) * 0.2) % 2 === 0;

    ctx.fillStyle = "rgba(156, 255, 170, 0.2)";
    ctx.fillRect(x - 2, y - 2, 16, 16);
    ctx.fillStyle = "#152420";
    ctx.fillRect(x + 1, y + 1, 10, 10);
    ctx.fillStyle = "#54d87f";
    ctx.fillRect(x + 2, y + 2, 8, 8);
    ctx.fillStyle = "#8ff0ac";
    ctx.fillRect(x + 3, y + 3, 6, 1);
    ctx.fillStyle = "#0f3721";
    ctx.fillRect(x + 4, y + 4, 1, 4);
    ctx.fillRect(x + 5, y + 4, 2, 1);
    ctx.fillRect(x + 5, y + 7, 2, 1);
    ctx.fillRect(x + 5, y + 5, 1, 1);

    if (blink) {
      ctx.fillStyle = "#e6ffe9";
      ctx.fillRect(x - 1, y + 5, 1, 1);
      ctx.fillRect(x + 12, y + 6, 1, 1);
      ctx.fillRect(x + 6, y - 1, 1, 1);
      ctx.fillRect(x + 6, y + 11, 1, 1);
    }
  }

  function drawCheckpointToken(token) {
    if (token.collected) return;
    const x = Math.floor(token.x - cameraX);
    const y = Math.floor(token.y + Math.sin(token.bob) * 1.6);
    const blink = Math.floor((player.anim + token.id * 9) * 0.2) % 2 === 0;

    ctx.fillStyle = "rgba(255, 245, 170, 0.2)";
    ctx.fillRect(x - 3, y - 3, 18, 18);

    ctx.fillStyle = "#1a2032";
    ctx.fillRect(x + 1, y + 1, 10, 10);
    ctx.fillStyle = "#ffe489";
    ctx.fillRect(x + 2, y + 2, 8, 8);
    ctx.fillStyle = "#fff5cc";
    ctx.fillRect(x + 3, y + 3, 6, 6);
    ctx.fillStyle = "#d08f2b";
    ctx.fillRect(x + 4, y + 4, 1, 4);
    ctx.fillRect(x + 5, y + 4, 2, 1);
    ctx.fillRect(x + 5, y + 7, 2, 1);
    ctx.fillRect(x + 5, y + 5, 1, 1);

    if (blink) {
      ctx.fillStyle = "#fff8dc";
      ctx.fillRect(x - 1, y + 5, 2, 1);
      ctx.fillRect(x + 11, y + 6, 2, 1);
      ctx.fillRect(x + 5, y - 1, 1, 2);
      ctx.fillRect(x + 6, y + 11, 1, 2);
    }
  }

  function drawBikePickup(bike) {
    if (bike.collected) return;
    const x = Math.floor(bike.x - cameraX);
    const y = Math.floor(bike.y + Math.sin(bike.bob) * 1.9);
    const blink = Math.floor(player.anim * 0.18) % 2 === 0;

    ctx.fillStyle = "#0f1220";
    ctx.fillRect(x + 2, y + 9, 5, 5);
    ctx.fillRect(x + 11, y + 9, 5, 5);
    ctx.fillStyle = "#7e97cd";
    ctx.fillRect(x + 3, y + 10, 2, 2);
    ctx.fillRect(x + 12, y + 10, 2, 2);

    ctx.fillStyle = "#ff5f84";
    ctx.fillRect(x + 5, y + 8, 7, 2);
    ctx.fillRect(x + 8, y + 6, 5, 2);
    ctx.fillStyle = "#6ddfff";
    ctx.fillRect(x + 6, y + 6, 3, 2);
    ctx.fillRect(x + 11, y + 5, 3, 2);
    ctx.fillRect(x + 13, y + 4, 2, 1);
    ctx.fillStyle = "#d7f6ff";
    ctx.fillRect(x + 8, y + 5, 3, 1);
    ctx.fillStyle = "#ffd983";
    ctx.fillRect(x + 10, y + 4, 3, 1);
    ctx.fillStyle = "#101626";
    ctx.fillRect(x + 8, y + 8, 2, 2);

    if (blink) {
      ctx.fillStyle = "#ffd97d";
      ctx.fillRect(x + 8, y + 1, 3, 1);
      ctx.fillRect(x + 9, y + 0, 1, 3);
      ctx.fillStyle = "#ff82c5";
      ctx.fillRect(x - 2, y + 4, 1, 1);
      ctx.fillRect(x + 19, y + 5, 1, 1);
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
      const sx = Math.floor(spark.x - cameraX);
      const sy = Math.floor(spark.y);
      if (spark.kind === "blood") {
        const size = Math.max(1, spark.size || 1);
        const alpha = clamp(0.28 + lifeRatio * 0.74, 0, 1);
        ctx.globalAlpha = alpha;
        if (spark.splatted) {
          const w = Math.max(2, spark.poolW || (size + 2));
          const h = Math.max(1, spark.poolH || 1);
          ctx.fillStyle = spark.darkColor || "#5b0812";
          ctx.fillRect(sx - Math.floor(w * 0.5), sy, w, h);
          ctx.fillStyle = spark.color;
          ctx.fillRect(
            sx - Math.floor(w * 0.35),
            sy,
            Math.max(1, Math.floor(w * 0.7)),
            1
          );
        } else {
          const stretch = Math.max(1, spark.stretch || 1);
          const w = Math.max(1, Math.round(size + Math.abs(spark.vx) * 0.9 + stretch * 0.4));
          const h = Math.max(1, Math.round(size + Math.abs(spark.vy) * 0.15));
          const ox = spark.vx >= 0 ? 0 : -Math.floor(w * 0.55);
          ctx.fillStyle = spark.darkColor || "#5b0812";
          ctx.fillRect(sx + ox, sy, w, h);
          ctx.fillStyle = spark.color;
          ctx.fillRect(
            sx + ox + Math.max(0, Math.floor(w * 0.25)),
            sy,
            Math.max(1, Math.floor(w * 0.55)),
            Math.max(1, h - 1)
          );
        }
        ctx.globalAlpha = 1;
        continue;
      }
      const size = lifeRatio > 0.6 ? 2 : 1;
      ctx.fillStyle = spark.color;
      ctx.fillRect(sx, sy, size, size);
    }
  }

  function drawRushAura() {
    if (proteinRushTimer <= 0 && invincibleTimer <= 0 && proteinBurstTimer <= 0) return;
    const r = clamp(proteinRushTimer / 90, 0, 1);
    const i = clamp(invincibleTimer / INVINCIBLE_DURATION, 0, 1);
    const b = clamp(proteinBurstTimer / PROTEIN_BURST_DURATION, 0, 1);
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

    if (b > 0) {
      const glow = 0.22 + Math.sin(player.anim * 0.92) * 0.08;
      const rainbowPulse = 0.5 + Math.sin(player.anim * 0.55) * 0.5;
      ctx.fillStyle = `rgba(130, 244, 255, ${glow + b * 0.26})`;
      ctx.fillRect(px - 12, py - 22, player.w + 24, player.h + 20);
      ctx.fillStyle = `rgba(255, 246, 182, ${0.18 + b * 0.16})`;
      ctx.fillRect(px - 10, py - 18, player.w + 20, player.h + 12);
      ctx.fillStyle = `rgba(255, 170, 124, ${0.12 + b * 0.14})`;
      ctx.fillRect(px - 9, py - 14, player.w + 18, player.h + 8);
      ctx.strokeStyle = `rgba(216, 252, 255, ${0.28 + b * 0.34})`;
      ctx.strokeRect(px - 11, py - 20, player.w + 22, player.h + 16);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.18 + rainbowPulse * 0.16 * b})`;
      ctx.fillRect(px - 13, py - 24, player.w + 26, 2);
      ctx.fillRect(px - 13, py + player.h - 1, player.w + 26, 2);
      for (let i = 0; i < 6; i += 1) {
        const bandY = py - 20 + i * 4;
        const bandAlpha = 0.06 + (i % 2) * 0.03 + b * 0.06;
        const bandColor = i % 3 === 0 ? "255,120,130" : i % 3 === 1 ? "255,232,120" : "138,236,255";
        ctx.fillStyle = `rgba(${bandColor}, ${bandAlpha})`;
        ctx.fillRect(px - 14, bandY, player.w + 28, 1);
      }
    }
  }

  function drawInvincibleBikeRide() {
    if (invincibleTimer <= 0) return;
    const x = Math.floor(player.x - cameraX - 8);
    const y = Math.floor(player.y + 12 + Math.sin(player.anim * 0.24) * 0.5);
    const dir = player.facing;
    const pulse = Math.sin(player.anim * 0.34);
    const shimmer = Math.sin(player.anim * 0.28) * 0.5 + 0.5;
    const rainbow = ["#ff5f8a", "#ffb66d", "#ffe46f", "#80e79a", "#78bcff", "#bf91ff"];

    for (let i = 0; i < rainbow.length; i += 1) {
      const tail = 8 + i * 4 + pulse * 2.1;
      const tx = dir > 0 ? Math.floor(x - tail) : Math.floor(x + 30 + tail);
      ctx.fillStyle = rainbow[i];
      ctx.fillRect(tx, y - 3 + (i % 2), 5, 2);
    }

    ctx.save();
    ctx.globalAlpha = 0.23 + shimmer * 0.18;
    for (let i = 0; i < rainbow.length; i += 1) {
      ctx.fillStyle = rainbow[i];
      ctx.fillRect(x - 6 + i, y - 18 + i * 2, 40 - i * 3, 2);
    }
    ctx.restore();

    const wheelSpin = Math.floor(player.anim * 0.5) % 2;
    ctx.fillStyle = "#0d111a";
    ctx.fillRect(x + 2, y + 8, 7, 7);
    ctx.fillRect(x + 21, y + 8, 7, 7);
    ctx.fillStyle = "#7089b9";
    ctx.fillRect(x + 4 + wheelSpin, y + 10, 2, 2);
    ctx.fillRect(x + 6 - wheelSpin, y + 9, 1, 1);
    ctx.fillRect(x + 23 + wheelSpin, y + 10, 2, 2);
    ctx.fillRect(x + 25 - wheelSpin, y + 9, 1, 1);
    ctx.fillStyle = "#39435a";
    ctx.fillRect(x + 5, y + 9, 1, 4);
    ctx.fillRect(x + 24, y + 9, 1, 4);

    ctx.fillStyle = "#2a3247";
    ctx.fillRect(x + 7, y + 5, 15, 3);
    ctx.fillStyle = "#8ee4ff";
    ctx.fillRect(x + 8, y + 4, 9, 1);
    ctx.fillStyle = "#ffd995";
    ctx.fillRect(x + 17, y + 4, 3, 1);
    ctx.fillStyle = "#87a2d9";
    ctx.fillRect(x + 12, y + 3, 2, 2);
    ctx.fillStyle = "#d6f3ff";
    ctx.fillRect(x + 12, y + 2, 4, 1);
    ctx.fillStyle = "#c04f62";
    ctx.fillRect(x + 11, y + 7, 5, 1);

    // Rider-only invincible sprite so it clearly looks like Rila is riding the bike.
    const riderBounce = Math.sin(player.anim * 0.44) * 0.5;
    ctx.save();
    ctx.translate(Math.floor(x + 8), Math.floor(y - 11 + riderBounce));
    if (dir < 0) {
      ctx.translate(14, 0);
      ctx.scale(-1, 1);
    }
    const paint = (color, dx, dy, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(dx, dy, w, h);
    };

    // Hair: round bob silhouette.
    paint("#05070b", 2, 0, 8, 1);
    paint("#070a10", 1, 1, 10, 2);
    paint("#0b1020", 0, 3, 12, 2);
    paint("#162038", 1, 5, 10, 1);
    paint("#111a2e", 0, 6, 3, 2);
    paint("#111a2e", 9, 6, 3, 2);
    paint("#05070b", 5, 2, 2, 4);
    paint("#080b14", 4, 4, 1, 2);
    paint("#080b14", 7, 4, 1, 2);
    paint("#0c1220", 5, 6, 2, 1);

    // Face.
    paint("#f8e9e1", 3, 5, 6, 4);
    paint("#2a1c1d", 4, 6, 1, 1);
    paint("#2a1c1d", 7, 6, 1, 1);
    paint("#6f4838", 4, 7, 1, 1);
    paint("#6f4838", 7, 7, 1, 1);
    paint("#fff8f4", 4, 6, 1, 1);
    paint("#fff8f4", 7, 6, 1, 1);
    paint("#c48a83", 5, 8, 2, 1);

    // Front bangs overlay while riding.
    paint("#0a0f1b", 3, 5, 1, 2);
    paint("#05070b", 5, 5, 2, 2);
    paint("#0a0f1b", 8, 5, 1, 2);
    paint("#162038", 6, 5, 1, 1);

    // Neck + rider jacket torso.
    paint("#f3ddd1", 5, 9, 2, 1);
    paint("#0f131d", 1, 10, 10, 4);
    paint("#1a2233", 2, 10, 8, 3);
    paint("#f5f2ef", 4, 11, 3, 2);
    paint("#2b3447", 2, 10, 2, 2);
    paint("#2b3447", 8, 10, 2, 2);

    // Arms reaching handle.
    paint("#0d111a", 0, 10, 2, 3);
    paint("#0d111a", 10, 10, 2, 3);
    paint("#f4e0d3", 0, 13, 1, 1);
    paint("#f4e0d3", 11, 13, 1, 1);
    paint("#101626", 11, 9, 3, 1);
    paint("#8ee4ff", 13, 8, 1, 1);

    // Seated legs + boots on the bike.
    paint("#24345a", 4, 14, 5, 2);
    paint("#324975", 5, 14, 3, 1);
    paint("#171b24", 7, 16, 3, 1);
    paint("#2b1f27", 8, 15, 3, 1);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.18 + shimmer * 0.18;
    for (let i = 0; i < rainbow.length; i += 1) {
      ctx.fillStyle = rainbow[(i + Math.floor(player.anim * 0.04)) % rainbow.length];
      ctx.fillRect(x + 6, y - 20 + i * 3, 20, 2);
    }
    ctx.restore();
  }

  function drawPlayerWave(wave) {
    const x = Math.floor(wave.x - cameraX);
    const y = Math.floor(wave.y);
    const power = clamp(wave.power || 0, 0, 1);
    const shift = Math.floor(wave.phase * 0.95) % 6;
    const coreColors = ["#78f8ff", "#90d6ff", "#a4b7ff", "#ca97ff", "#ff9acb", "#ffb39a"];
    const pulse = 0.5 + Math.sin((wave.spin || 0) * 1.8) * 0.5;
    const glowA = 0.16 + power * 0.24;
    const glowB = 0.14 + pulse * 0.18;

    ctx.fillStyle = `rgba(120, 240, 255, ${glowA})`;
    ctx.fillRect(x - 6, y - 5, wave.w + 12, wave.h + 10);
    ctx.fillStyle = `rgba(220, 190, 255, ${glowB})`;
    ctx.fillRect(x - 3, y - 2, wave.w + 6, wave.h + 4);

    for (let i = 0; i < 4; i += 1) {
      const c = coreColors[(shift + i * 2) % coreColors.length];
      const inset = i + 1;
      const alpha = 0.92 - i * 0.2;
      ctx.fillStyle = c;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x + inset, y + inset, Math.max(1, wave.w - inset * 2), Math.max(1, wave.h - inset * 2));
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = `rgba(255,255,255,${0.35 + pulse * 0.2})`;
    ctx.fillRect(x + 2, y + Math.floor(wave.h * 0.5), Math.max(2, wave.w - 4), 1);
    ctx.fillRect(x + Math.floor(wave.w * 0.5), y + 1, 1, Math.max(2, wave.h - 2));

    for (let i = 0; i < 6; i += 1) {
      const off = Math.sin((wave.spin || 0) + i * 1.7) * (3 + power * 2);
      const ry = y + 1 + i;
      const rx = wave.vx >= 0 ? x + wave.w + 1 : x - 2;
      ctx.fillStyle = `rgba(155, 242, 255, ${0.22 + power * 0.12})`;
      ctx.fillRect(Math.floor(rx + off), ry, 1, 1);
    }

    const trailDir = wave.vx >= 0 ? -1 : 1;
    for (let i = 0; i < 5; i += 1) {
      const len = 7 + i * 4 + power * 6;
      const tx = x + (trailDir > 0 ? wave.w : -len);
      const ty = y + i;
      ctx.fillStyle = `rgba(255, 230, 170, ${0.34 - i * 0.06})`;
      ctx.fillRect(Math.floor(tx + trailDir * i * 2), ty, Math.floor(len), 1);
    }

    for (let i = 0; i < 4; i += 1) {
      const sparkLen = 4 + i * 2 + power * 2;
      const sy = y + Math.floor(wave.h * 0.5) + (i - 1);
      const sx = wave.vx >= 0 ? x - sparkLen - i * 2 : x + wave.w + i * 2;
      ctx.fillStyle = `rgba(190, 252, 255, ${0.28 - i * 0.05})`;
      ctx.fillRect(Math.floor(sx), sy, Math.floor(sparkLen), 1);
    }
  }

  function drawWaveBursts() {
    for (const burst of waveBursts) {
      const ratio = clamp(burst.life / burst.maxLife, 0, 1);
      const r = Math.max(2, burst.radius * (1 - (1 - ratio) * 0.22));
      const cx = Math.floor(burst.x - cameraX);
      const cy = Math.floor(burst.y);

      ctx.strokeStyle = `rgba(140, 240, 255, ${0.35 * ratio})`;
      ctx.strokeRect(Math.floor(cx - r), Math.floor(cy - r * 0.6), Math.floor(r * 2), Math.floor(r * 1.2));
      ctx.strokeStyle = `rgba(255, 232, 170, ${0.24 * ratio})`;
      ctx.strokeRect(Math.floor(cx - r * 0.7), Math.floor(cy - r * 0.4), Math.floor(r * 1.4), Math.floor(r * 0.8));

      for (let i = 0; i < 8; i += 1) {
        const ang = burst.phase + (Math.PI * 2 * i) / 8;
        const sx = Math.floor(cx + Math.cos(ang) * (r * 0.3));
        const sy = Math.floor(cy + Math.sin(ang) * (r * 0.2));
        const ex = Math.floor(cx + Math.cos(ang) * (r * 0.9));
        const ey = Math.floor(cy + Math.sin(ang) * (r * 0.6));
        ctx.strokeStyle = `rgba(185, 245, 255, ${0.22 * ratio})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
  }

  function drawInvincibleBonusPops() {
    if (invincibleBonusPops.length === 0) return;

    ctx.font = "8px monospace";
    ctx.textBaseline = "top";
    for (const pop of invincibleBonusPops) {
      const lifeRatio = clamp(pop.life / pop.maxLife, 0, 1);
      const sx = Math.floor(pop.x - cameraX);
      const sy = Math.floor(pop.y - (1 - lifeRatio) * 10);
      const alpha = clamp(0.25 + lifeRatio * 1.05, 0, 1);
      const wobble = Math.sin(pop.phase * 0.9) * 1.5;
      const glowW = 33;

      ctx.globalAlpha = alpha * 0.72;
      ctx.fillStyle = "#153147";
      ctx.fillRect(sx - 14, sy - 8, glowW, 9);
      ctx.fillStyle = "#3f88b6";
      ctx.fillRect(sx - 13, sy - 7, glowW - 2, 1);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffe38e";
      ctx.fillText("+1sec", sx - 10 + wobble, sy - 7);
      ctx.fillStyle = "#fff6d8";
      ctx.fillText("+1sec", sx - 11 + wobble, sy - 8);
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.fillRect(sx - 16 + Math.floor(wobble), sy - 5, 2, 1);
      ctx.fillRect(sx + 18 + Math.floor(wobble), sy - 6, 2, 1);
      ctx.fillRect(sx + 3 + Math.floor(wobble), sy - 10, 1, 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawAutoWeaponEffects() {
    const inPlayableState = gameState === STATE.PLAY || gameState === STATE.BOSS;
    if (!inPlayableState) return;

    const cx = Math.floor(player.x - cameraX + player.w * 0.5);
    const cy = Math.floor(player.y + 11);
    const dir = player.facing;

    const showingChargeReach = input.attack && attackCooldown <= 0 && attackChargeTimer > ATTACK_COMBO_TAP_MAX;
    if (showingChargeReach) {
      const chargeRatio = clamp(attackChargeTimer / ATTACK_CHARGE_MAX, 0, 1);
      const waveReady = attackChargeTimer >= ATTACK_WAVE_CHARGE_MIN;
      const spearReady = attackChargeTimer >= ATTACK_SPEAR_CHARGE_MIN && attackChargeTimer < ATTACK_WAVE_CHARGE_MIN;
      const auraA = 0.12 + chargeRatio * 0.2;
      const auraB = 0.1 + chargeRatio * 0.18;
      const pulse = 0.5 + Math.sin(player.anim * 0.3) * 0.5;
      const auraW = 20 + Math.floor(chargeRatio * 12);
      const auraH = 18 + Math.floor(chargeRatio * 8);

      ctx.fillStyle = `rgba(120, 225, 255, ${auraA + pulse * 0.08})`;
      ctx.fillRect(cx - Math.floor(auraW * 0.5), cy - Math.floor(auraH * 0.6), auraW, auraH);
      ctx.fillStyle = `rgba(255, 198, 130, ${auraB})`;
      ctx.fillRect(cx - Math.floor((auraW - 6) * 0.5), cy - Math.floor((auraH - 6) * 0.6), auraW - 6, auraH - 6);

      const barW = 28;
      const barX = cx - Math.floor(barW * 0.5);
      const barY = Math.floor(player.y - 7);
      ctx.fillStyle = "rgba(8, 14, 25, 0.84)";
      ctx.fillRect(barX, barY, barW, 4);
      ctx.fillStyle = chargeRatio >= ATTACK_WAVE_CHARGE_MIN / ATTACK_CHARGE_MAX ? "#ffcf72" : spearReady ? "#d6f5ff" : "#89e4ff";
      ctx.fillRect(barX + 1, barY + 1, Math.max(1, Math.floor((barW - 2) * chargeRatio)), 2);

      // Thin, translucent reach preview while charging.
      const previewReach = waveReady
        ? 22 + Math.floor(chargeRatio * 40)
        : spearReady
          ? 26 + Math.floor(chargeRatio * 30)
          : 12 + Math.floor(chargeRatio * 50);
      const previewY = player.y + (spearReady ? 9 : waveReady ? 4 : 6);
      const previewH = spearReady
        ? 8 + Math.floor(chargeRatio * 3)
        : 13 + Math.floor(chargeRatio * 8);
      const previewX = dir > 0
        ? player.x + player.w - 1
        : player.x - previewReach + 1;
      const px = Math.floor(previewX - cameraX);
      const py = Math.floor(previewY);
      const pw = Math.max(2, Math.floor(previewReach));
      const ph = Math.max(3, Math.floor(previewH));
      const previewPulse = 0.5 + Math.sin(player.anim * 0.24) * 0.5;
      const fillAlpha = 0.035 + chargeRatio * 0.055 + previewPulse * 0.01;
      const edgeAlpha = 0.1 + chargeRatio * 0.09;
      const midAlpha = 0.08 + chargeRatio * 0.06;
      const previewTone = waveReady
        ? "255, 214, 135"
        : spearReady
          ? "176, 234, 255"
          : "162, 226, 255";

      ctx.fillStyle = `rgba(${previewTone}, ${fillAlpha})`;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = `rgba(${previewTone}, ${edgeAlpha})`;
      ctx.strokeRect(px, py, pw, ph);
      ctx.fillStyle = `rgba(255, 255, 255, ${midAlpha})`;
      ctx.fillRect(px + 1, py + Math.floor(ph * 0.5), Math.max(1, pw - 2), 1);

      if (chargeRatio >= 0.98) {
        for (let i = 0; i < 8; i += 1) {
          const ang = (Math.PI * 2 * i) / 8 + player.anim * 0.1;
          const len = 12 + (i % 2) * 4;
          const ex = Math.floor(cx + Math.cos(ang) * len);
          const ey = Math.floor(cy - 4 + Math.sin(ang) * len * 0.6);
          ctx.strokeStyle = `rgba(168, 242, 255, ${0.32 - (i % 2) * 0.06})`;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 4);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      }
    }

    if (attackEffectTimer <= 0) return;

    const mode = attackEffectMode;
    const comboStage = mode.startsWith("combo")
      ? clamp(parseInt(mode.slice(5), 10) || 0, 0, ATTACK_MASH_TRIGGER - 1)
      : 0;
    const isWave = mode === "wave";
    const isHyakuretsu = mode === "hyakuretsu";
    const isSpear = mode === "spear";
    const isCombo = comboStage > 0;
    const effectDuration = isWave ? 16 : isHyakuretsu ? 6 : isSpear ? 13 : isCombo ? 8 + comboStage * 2 : 11;
    const ratio = clamp(attackEffectTimer / effectDuration, 0, 1);
    const effectPower = clamp(attackEffectPower, 0, 1);
    const reach = isWave
      ? 34 + effectPower * 18
      : isHyakuretsu
        ? 12 + effectPower * 8
        : isSpear
          ? 24 + effectPower * 34
        : isCombo
          ? 12 + comboStage * 4 + effectPower * 6
          : 10 + effectPower * 50;
    const frontX = dir > 0 ? cx + 7 : cx - 7;
    const baseY = isWave ? cy - 1 : cy + 1;
    const lineCount = isHyakuretsu ? 6 : isSpear ? 5 : 4;

    for (let i = 0; i < lineCount; i += 1) {
      const spread = isHyakuretsu
        ? i + Math.floor((1 - ratio) * 2)
        : isSpear
          ? i
          : i * 2 + Math.floor((1 - ratio) * 5);
      const lenBase = isHyakuretsu ? reach - (i % 3) * 2 : isSpear ? reach - i * 2 : reach - i * 4;
      const len = lenBase + Math.sin((attackEffectPhase + i) * (isHyakuretsu ? 1.4 : isSpear ? 1.05 : 0.8)) * 2;
      const alpha = isHyakuretsu ? 0.66 - i * 0.07 : isSpear ? 0.64 - i * 0.08 : 0.55 - i * 0.1;
      const sx = dir > 0 ? frontX + spread : frontX - len - spread;
      const sy = baseY - 3 + (isHyakuretsu ? (i % 3) * 2 : isSpear ? i : i * 2);
      if (isWave) {
        ctx.fillStyle = `rgba(140, 215, 255, ${alpha})`;
      } else if (isHyakuretsu) {
        ctx.fillStyle = `rgba(255, 185, 138, ${alpha})`;
      } else if (isSpear) {
        ctx.fillStyle = `rgba(182, 238, 255, ${alpha})`;
      } else if (isCombo) {
        const comboTone = comboStage >= 3 ? "255, 182, 144" : comboStage === 2 ? "255, 207, 152" : "255, 235, 176";
        ctx.fillStyle = `rgba(${comboTone}, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255, 235, 176, ${alpha})`;
      }
      ctx.fillRect(Math.floor(sx), sy, Math.max(2, Math.floor(len)), 1);
    }

    const fistX = dir > 0 ? frontX + 2 : frontX - 8;
    ctx.fillStyle = "#f5ddcf";
    ctx.fillRect(fistX, baseY - 1, 6, 3);
    ctx.fillStyle = "#2a3348";
    ctx.fillRect(fistX + 1, baseY - 2, 4, 1);

    if (isWave) {
      const flareX = dir > 0 ? frontX + 15 : frontX - 15;
      ctx.fillStyle = "rgba(255, 246, 203, 0.7)";
      ctx.fillRect(flareX - 2, baseY - 4, 4, 8);
      ctx.fillRect(flareX - 6, baseY - 1, 12, 2);
    } else if (isSpear) {
      const shaftLen = Math.floor(20 + effectPower * 30 + (1 - ratio) * 5);
      const shaftY = baseY - 1;
      const shaftX = dir > 0 ? frontX + 3 : frontX - shaftLen - 3;
      const tipBase = dir > 0 ? shaftX + shaftLen - 1 : shaftX;
      const buttX = dir > 0 ? shaftX - 2 : shaftX + shaftLen + 1;
      const pulse = 0.5 + Math.sin((attackEffectPhase + effectPower * 3) * 0.8) * 0.5;

      for (let i = 0; i < 3; i += 1) {
        const trailAlpha = 0.16 + (1 - ratio) * 0.12 - i * 0.04 + pulse * 0.03;
        const tw = Math.max(6, Math.floor(shaftLen * (0.42 - i * 0.1)));
        const tx = dir > 0
          ? shaftX + Math.floor(shaftLen * 0.24) - i * 2
          : shaftX + shaftLen - Math.floor(shaftLen * 0.24) - tw + i * 2;
        const ty = shaftY - 3 + i * 2;
        ctx.fillStyle = `rgba(150, 220, 255, ${Math.max(0.05, trailAlpha)})`;
        ctx.fillRect(tx, ty, tw, 1);
      }

      ctx.fillStyle = "#7a5735";
      ctx.fillRect(shaftX, shaftY, shaftLen, 3);
      ctx.fillStyle = "#a27b4c";
      ctx.fillRect(shaftX, shaftY, shaftLen, 1);
      ctx.fillStyle = "#5a4129";
      ctx.fillRect(shaftX, shaftY + 2, shaftLen, 1);

      const gripW = Math.min(9, Math.max(5, Math.floor(shaftLen * 0.22)));
      const gripX = dir > 0 ? shaftX + 2 : shaftX + shaftLen - gripW - 2;
      ctx.fillStyle = "#33261a";
      ctx.fillRect(gripX, shaftY, gripW, 3);
      ctx.fillStyle = "rgba(209, 186, 142, 0.55)";
      for (let i = 1; i < gripW - 1; i += 2) {
        ctx.fillRect(gripX + i, shaftY, 1, 3);
      }

      ctx.fillStyle = "#91a8c3";
      ctx.fillRect(buttX, shaftY, 2, 3);
      ctx.fillStyle = "#d8e7f9";
      ctx.fillRect(buttX, shaftY, 1, 1);

      if (dir > 0) {
        const hx = tipBase;
        ctx.fillStyle = "#7088a8";
        ctx.fillRect(hx - 2, shaftY - 2, 2, 7);
        ctx.fillStyle = "#8ca6c4";
        ctx.fillRect(hx - 3, shaftY - 2, 4, 1);
        ctx.fillRect(hx - 3, shaftY + 4, 4, 1);

        ctx.fillStyle = "#8da8c8";
        ctx.fillRect(hx, shaftY - 1, 4, 5);
        ctx.fillRect(hx + 4, shaftY, 2, 3);
        ctx.fillStyle = "#e8f3ff";
        ctx.fillRect(hx + 1, shaftY, 3, 1);
        ctx.fillRect(hx + 2, shaftY + 1, 2, 1);
        ctx.fillStyle = "#f8fcff";
        ctx.fillRect(hx + 5, shaftY + 1, 1, 1);
      } else {
        const hx = tipBase;
        ctx.fillStyle = "#7088a8";
        ctx.fillRect(hx + 1, shaftY - 2, 2, 7);
        ctx.fillStyle = "#8ca6c4";
        ctx.fillRect(hx, shaftY - 2, 4, 1);
        ctx.fillRect(hx, shaftY + 4, 4, 1);

        ctx.fillStyle = "#8da8c8";
        ctx.fillRect(hx - 4, shaftY - 1, 4, 5);
        ctx.fillRect(hx - 6, shaftY, 2, 3);
        ctx.fillStyle = "#e8f3ff";
        ctx.fillRect(hx - 4, shaftY, 3, 1);
        ctx.fillRect(hx - 4, shaftY + 1, 2, 1);
        ctx.fillStyle = "#f8fcff";
        ctx.fillRect(hx - 6, shaftY + 1, 1, 1);
      }

      for (let i = 0; i < 3; i += 1) {
        const sparkY = shaftY - 4 + i * 3;
        const sparkX = dir > 0 ? tipBase + 4 : tipBase - 4;
        ctx.fillStyle = `rgba(255, 252, 214, ${0.44 - i * 0.1 + pulse * 0.06})`;
        ctx.fillRect(sparkX, sparkY, 2, 1);
      }
    } else if (isCombo) {
      const ghostCount = 1 + comboStage;
      for (let i = 0; i < ghostCount; i += 1) {
        const offset = 2 + i * 3 + Math.floor((1 - ratio) * (comboStage > 1 ? 2 : 1));
        const fx = dir > 0 ? frontX + 4 + offset : frontX - 10 - offset;
        const fy = baseY - 3 + (i % 2) * 2;
        const alpha = 0.62 - i * 0.1;
        ctx.fillStyle = `rgba(250, 228, 196, ${alpha})`;
        ctx.fillRect(fx, fy, 5, 2);
      }
    } else if (isHyakuretsu) {
      for (let i = 0; i < 9; i += 1) {
        const lane = i % 3;
        const step = i % 4;
        const offset = 3 + step * 3;
        const fx = dir > 0 ? frontX + 3 + offset : frontX - 9 - offset;
        const fy = baseY - 4 + lane * 2 + (i % 2);
        const alpha = 0.72 - lane * 0.14 - step * 0.06;
        ctx.fillStyle = `rgba(250, 228, 196, ${alpha})`;
        ctx.fillRect(fx, fy, 4, 2);
        const trailLen = 3 + (step % 2);
        ctx.fillStyle = `rgba(146, 214, 255, ${0.38 - lane * 0.08})`;
        ctx.fillRect(fx + (dir > 0 ? -trailLen : 4), fy + 1, trailLen, 1);
      }
    }
  }

  function drawCannon(c) {
    const x = Math.floor(c.x - cameraX);
    const y = Math.floor(c.y);
    if (c.destroyed) {
      const debris = c.debrisTimer || 0;
      if (debris <= 0) return;
      const spark = Math.floor((debris + player.anim) * 0.25) % 2 === 0;
      ctx.fillStyle = "#1b1f2b";
      ctx.fillRect(x - 8, y + 4, 17, 5);
      ctx.fillStyle = "#374156";
      ctx.fillRect(x - 7, y + 4, 15, 2);
      ctx.fillStyle = "#252e40";
      ctx.fillRect(x - 10, y + 3, 4, 3);
      ctx.fillRect(x + 7, y + 5, 5, 2);
      ctx.fillStyle = "#5a657b";
      ctx.fillRect(x - 2, y + 2, 2, 2);
      ctx.fillRect(x + 3, y + 6, 2, 1);
      if (spark) {
        ctx.fillStyle = "rgba(255, 174, 118, 0.7)";
        ctx.fillRect(x - 5, y + 1, 2, 1);
        ctx.fillRect(x + 1, y + 2, 1, 1);
        ctx.fillRect(x + 5, y + 3, 1, 1);
      }
      return;
    }

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
    if (block.destroyed) {
      const debris = block.debrisTimer || 0;
      if (debris <= 0) return;
      const x = Math.floor(block.x - cameraX);
      const y = Math.floor(block.y);
      const blink = Math.floor((debris + player.anim) * 0.22) % 2 === 0;
      ctx.fillStyle = "#2e2422";
      ctx.fillRect(x + 1, y + block.h - 5, Math.max(4, block.w - 2), 4);
      ctx.fillStyle = "#72564a";
      ctx.fillRect(x + 2, y + block.h - 5, Math.max(3, block.w - 6), 1);
      ctx.fillStyle = "#6c4e43";
      ctx.fillRect(x - 1, y + block.h - 9, 4, 3);
      ctx.fillRect(x + block.w - 2, y + block.h - 8, 4, 3);
      if (blink) {
        ctx.fillStyle = "rgba(255, 212, 170, 0.62)";
        ctx.fillRect(x + Math.floor(block.w * 0.36), y + block.h - 10, 2, 1);
        ctx.fillRect(x + Math.floor(block.w * 0.6), y + block.h - 7, 1, 1);
      }
      return;
    }

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
    if (gameState === STATE.BOSS) return;
    const g = stage.goal;
    const x = Math.floor(g.x - cameraX);
    const y = Math.floor(g.y);

    if (stage.id === 1) {
      const gx = x - 20;
      const gy = y - 56;
      const gw = 64;
      const gh = 104;

      ctx.fillStyle = "#17243a";
      ctx.fillRect(gx, gy + 6, gw, gh - 6);
      ctx.fillStyle = "#213453";
      ctx.fillRect(gx + 3, gy + 10, gw - 6, gh - 12);
      ctx.fillStyle = "#4cc4f0";
      ctx.fillRect(gx + 6, gy + 12, gw - 12, 2);
      ctx.fillStyle = "#ff8fbe";
      ctx.fillRect(gx + 8, gy + 18, gw - 16, 1);

      ctx.fillStyle = "#111a2b";
      ctx.fillRect(x - 1, y - 1, g.w + 2, g.h + 2);
      ctx.fillStyle = "#1c2b44";
      ctx.fillRect(x, y, g.w, g.h);
      ctx.fillStyle = "rgba(128, 210, 255, 0.3)";
      ctx.fillRect(x + 1, y + 2, g.w - 2, g.h - 5);
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.fillRect(x + 2, y + 4, 2, g.h - 10);
      ctx.fillRect(x + g.w - 4, y + 4, 1, g.h - 10);

      ctx.fillStyle = "#206f95";
      ctx.fillRect(gx + 24, gy + 28, 18, 3);
      ctx.fillStyle = "#4ce2ff";
      ctx.fillRect(gx + 26, gy + 29, 14, 1);
      ctx.fillStyle = "#f8d682";
      ctx.fillRect(gx + 31, gy + 32, 6, 2);

      if (stage.boss.active) {
        ctx.fillStyle = "rgba(255,40,60,0.35)";
        ctx.fillRect(x - 4, y - 2, g.w + 8, g.h + 4);
        ctx.fillStyle = "#ffd0d0";
        ctx.font = "8px monospace";
        ctx.fillText("BOSS", x - 1, y - 10);
      }
      return;
    }

    const mx = x - 46;
    const my = y - 72;
    const mw = 116;
    const mh = 120;

    // Mansion facade.
    ctx.fillStyle = "#1a1f30";
    ctx.fillRect(mx, my + 6, mw, mh - 6);
    ctx.fillStyle = "#232b40";
    ctx.fillRect(mx + 4, my + 10, mw - 8, mh - 14);
    ctx.fillStyle = "#36415d";
    ctx.fillRect(mx + 8, my + 14, mw - 16, 6);

    // Entrance canopy.
    ctx.fillStyle = "#2c354b";
    ctx.fillRect(x - 8, y - 8, g.w + 16, 8);
    ctx.fillStyle = "#141a28";
    ctx.fillRect(x - 6, y - 6, g.w + 12, 3);

    // Windows.
    ctx.fillStyle = "#1a2336";
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const wx = mx + 12 + col * 24;
        const wy = my + 24 + row * 22;
        if (wx >= x - 12 && wx <= x + g.w + 4 && wy > y - 16) continue;
        ctx.fillRect(wx, wy, 12, 10);
        ctx.fillStyle = (row + col) % 2 === 0 ? "#7dd8ff" : "#ffc88d";
        ctx.fillRect(wx + 2, wy + 2, 8, 6);
        ctx.fillStyle = "#1a2336";
      }
    }

    // Goal collision area = mansion entrance.
    ctx.fillStyle = "#121722";
    ctx.fillRect(x - 1, y - 1, g.w + 2, g.h + 2);
    ctx.fillStyle = "#1f2738";
    ctx.fillRect(x, y, g.w, g.h);

    // Boyfriend waits inside the entrance lobby.
    ctx.save();
    ctx.globalAlpha = stage.boss.active ? 0.26 : 0.72;
    drawBoyfriend(g.x + 4, g.y + 22);
    ctx.restore();

    // Glass overlay to read as "inside the mansion".
    ctx.fillStyle = "rgba(170, 210, 255, 0.24)";
    ctx.fillRect(x + 1, y + 2, g.w - 2, g.h - 6);
    ctx.fillStyle = "rgba(255, 238, 206, 0.18)";
    ctx.fillRect(x + 2, y + 4, 6, g.h - 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fillRect(x + g.w - 6, y + 4, 2, g.h - 12);

    ctx.fillStyle = "#6b4f2f";
    ctx.fillRect(x - 4, y + g.h - 4, g.w + 8, 4);
    ctx.fillStyle = "#9f7a4d";
    ctx.fillRect(x - 2, y + g.h - 4, g.w + 4, 1);

    if (stage.boss.active) {
      ctx.fillStyle = "rgba(180,20,20,0.45)";
      ctx.fillRect(x - 4, y - 2, g.w + 8, g.h + 4);
      ctx.fillStyle = "#ffd0d0";
      ctx.font = "8px monospace";
      ctx.fillText("LOCK", x - 2, y - 10);
    }
  }

  function drawGodGimmicks() {
    if (!stage.godGimmicks || stage.godGimmicks.length === 0) return;
    const boss = stage.boss;
    if (!boss || boss.kind !== "god" || !boss.active) return;

    const phase2Ready = (boss.phase || 1) >= 2 && (boss.phaseTransitionTimer || 0) <= 0;
    for (const gimmick of stage.godGimmicks) {
      const x = Math.floor(gimmick.x - cameraX);
      const y = Math.floor(gimmick.y);
      const chargeRatio = clamp((gimmick.charge || 0) / 54, 0, 1);
      const cooldown = Math.max(0, gimmick.cooldown || 0);
      const activePulse = (Math.sin((gimmick.pulse || 0) + player.anim * 0.06) * 0.5 + 0.5);
      const ready = phase2Ready && cooldown <= 0;
      const lit = ready && chargeRatio > 0.04;

      ctx.fillStyle = ready ? "#202d4d" : "#1f2433";
      ctx.fillRect(x - 1, y - 1, gimmick.w + 2, gimmick.h + 2);
      ctx.fillStyle = ready ? "#2f4675" : "#2b3245";
      ctx.fillRect(x, y, gimmick.w, gimmick.h);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 1, y + 1, gimmick.w - 2, 1);

      if (lit) {
        const fillW = Math.floor((gimmick.w - 2) * chargeRatio);
        ctx.fillStyle = `rgba(110, 227, 255, ${0.3 + activePulse * 0.24})`;
        ctx.fillRect(x - 2, y - 2, gimmick.w + 4, gimmick.h + 4);
        ctx.fillStyle = "#72e3ff";
        ctx.fillRect(x + 1, y + gimmick.h - 4, fillW, 2);
      }

      if (ready && chargeRatio >= 0.98) {
        const blink = Math.floor((gimmick.pulse || 0) * 2) % 2 === 0;
        if (blink) {
          ctx.fillStyle = "rgba(255, 248, 176, 0.9)";
          ctx.fillRect(x - 2, y - 2, gimmick.w + 4, 1);
        }
      }

      if (!phase2Ready || cooldown > 0) {
        const coolRatio = clamp(cooldown / 380, 0, 1);
        ctx.fillStyle = "rgba(255, 177, 134, 0.24)";
        ctx.fillRect(x + 1, y + gimmick.h - 3, gimmick.w - 2, 1);
        ctx.fillStyle = "#ffb68a";
        ctx.fillRect(x + 1, y + gimmick.h - 3, Math.floor((gimmick.w - 2) * (1 - coolRatio)), 1);
      }

      if ((boss.gimmickAdvantageTimer || 0) > 0) {
        ctx.fillStyle = "rgba(129, 248, 255, 0.26)";
        ctx.fillRect(x - 2, y - 2, gimmick.w + 4, gimmick.h + 1);
      }
    }
  }

  function drawWorld() {
    const godBossRoom = gameState === STATE.BOSS && stage.boss && stage.boss.kind === "god";
    if (godBossRoom) {
      drawMansionInteriorBackdrop();
    } else {
      drawSkyGradient();
      drawParallax();
    }
    ctx.fillStyle = godBossRoom ? "rgba(6,8,12,0.12)" : "rgba(8,10,16,0.1)";
    ctx.fillRect(0, 0, W, H - 18);

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

    for (const item of stage.heartItems) {
      drawHeartPickup(item);
    }

    for (const item of stage.lifeUpItems) {
      drawLifeUpItem(item);
    }

    for (const bike of stage.bikes) {
      drawBikePickup(bike);
    }

    for (const token of stage.checkpointTokens) {
      drawCheckpointToken(token);
    }

    drawGodGimmicks();

    for (const e of stage.enemies) {
      if (!e.alive) continue;
      drawEnemy(e);
    }

    for (const bs of stage.bossShots) {
      if (bs.dead) continue;
      const sx = Math.floor(bs.x - cameraX);
      const sy = Math.floor(bs.y);
      if (bs.kind === "peacock_feather") {
        ctx.fillStyle = "rgba(128, 226, 255, 0.42)";
        ctx.fillRect(sx - 1, sy - 1, bs.w + 2, bs.h + 2);
        ctx.fillStyle = "#59d9ef";
        ctx.fillRect(sx, sy, bs.w, bs.h);
        ctx.fillStyle = "#f6df94";
        ctx.fillRect(sx + 1, sy + 1, Math.max(2, bs.w - 2), 1);
      } else if (bs.kind === "wave") {
        ctx.fillStyle = "rgba(255, 156, 108, 0.44)";
        ctx.fillRect(sx - 2, sy - 1, bs.w + 4, bs.h + 2);
        ctx.fillStyle = "#ff9f5b";
        ctx.fillRect(sx, sy, bs.w, bs.h);
        ctx.fillStyle = "#ffe0b4";
        ctx.fillRect(sx + 2, sy + 1, Math.max(2, bs.w - 4), Math.max(2, bs.h - 2));
      } else if (bs.kind === "ring") {
        ctx.fillStyle = "rgba(196, 165, 255, 0.42)";
        ctx.fillRect(sx - 1, sy - 1, bs.w + 2, bs.h + 2);
        ctx.fillStyle = "#c5a3ff";
        ctx.fillRect(sx, sy, bs.w, bs.h);
        ctx.fillStyle = "#efe2ff";
        ctx.fillRect(sx + 1, sy + 1, Math.max(2, bs.w - 2), Math.max(2, bs.h - 2));
      } else if (bs.kind === "spiral") {
        ctx.fillStyle = "rgba(121, 223, 255, 0.38)";
        ctx.fillRect(sx - 1, sy - 1, bs.w + 2, bs.h + 2);
        ctx.fillStyle = "#7ee0ff";
        ctx.fillRect(sx, sy, bs.w, bs.h);
        ctx.fillStyle = "#e8fcff";
        ctx.fillRect(sx + 1, sy + 1, Math.max(2, bs.w - 2), Math.max(2, bs.h - 2));
      } else if (bs.kind === "nova" || bs.kind === "nova2") {
        const phase2Nova = bs.kind === "nova2";
        ctx.fillStyle = phase2Nova ? "rgba(255, 175, 114, 0.48)" : "rgba(157, 232, 255, 0.42)";
        ctx.fillRect(sx - 2, sy - 2, bs.w + 4, bs.h + 4);
        ctx.fillStyle = phase2Nova ? "#ffb36f" : "#85e6ff";
        ctx.fillRect(sx - 1, sy - 1, bs.w + 2, bs.h + 2);
        ctx.fillStyle = phase2Nova ? "#ffe5b6" : "#f2fdff";
        ctx.fillRect(sx + 1, sy + 1, Math.max(2, bs.w - 2), Math.max(2, bs.h - 2));
      } else if (bs.kind === "rain_warn") {
        const blink = Math.floor((bs.ttl || 0) * 0.32) % 2 === 0;
        ctx.fillStyle = blink ? "rgba(255, 219, 127, 0.4)" : "rgba(255, 170, 94, 0.26)";
        ctx.fillRect(sx, sy, bs.w, bs.h);
        ctx.fillStyle = blink ? "#ffd885" : "#ffb36c";
        ctx.fillRect(sx + 2, sy + 1, Math.max(1, bs.w - 4), Math.max(1, bs.h - 2));
      } else if (bs.kind === "rain") {
        ctx.fillStyle = "rgba(255, 116, 103, 0.45)";
        ctx.fillRect(sx - 1, sy - 2, bs.w + 2, bs.h + 4);
        ctx.fillStyle = "#ff896a";
        ctx.fillRect(sx, sy, bs.w, bs.h);
        ctx.fillStyle = "#ffd8b6";
        ctx.fillRect(sx + 1, sy + 2, Math.max(2, bs.w - 2), Math.max(2, bs.h - 4));
      } else {
        ctx.fillStyle = "#ff8d6a";
        ctx.fillRect(sx, sy, bs.w, bs.h);
        ctx.fillStyle = "#ffd6a8";
        ctx.fillRect(sx + 1, sy + 1, bs.w - 2, bs.h - 2);
      }
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

    for (const wave of stage.playerWaves) {
      if (wave.dead) continue;
      drawPlayerWave(wave);
    }

    drawWaveBursts();
    drawHitSparks();
    drawInvincibleBonusPops();
    drawBoss();
    drawGoal();
    drawRushAura();
    const hurtBlink = damageInvulnTimer > 0 && Math.floor(damageInvulnTimer / 3) % 2 === 0;
    if (!hurtBlink) {
      if (invincibleTimer > 0) {
        drawInvincibleBikeRide();
      } else {
        drawHero(player.x - cameraX, player.y, player.facing, player.anim, 1);
      }
      drawAutoWeaponEffects();
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

  function drawTitle() {
    const t = titleTimer;
    const savedCamera = cameraX;
    cameraX = Math.floor((Math.sin(t * 0.012) * 0.5 + 0.5) * 220);
    drawSkyGradient();
    drawParallax();
    cameraX = savedCamera;

    ctx.fillStyle = "rgba(6, 8, 14, 0.48)";
    ctx.fillRect(0, 0, W, H);

    const titleY = 36 + Math.sin(t * 0.07) * 1.5;
    ctx.fillStyle = "rgba(34, 18, 28, 0.9)";
    ctx.fillRect(66, 20, 188, 52);
    ctx.fillStyle = "rgba(92, 46, 66, 0.8)";
    ctx.fillRect(68, 22, 184, 7);
    ctx.fillStyle = "rgba(255, 190, 160, 0.16)";
    ctx.fillRect(68, 29, 184, 2);

    ctx.fillStyle = "#2a1020";
    ctx.font = "34px monospace";
    ctx.fillText("RRR", 108, titleY + 1);
    ctx.fillStyle = "#ffe0cf";
    ctx.fillText("RRR", 106, titleY - 1);
    ctx.fillStyle = "#ff6f8c";
    ctx.font = "10px monospace";
    ctx.fillText("Rila Riders Rescue", 112, 58);

    const heroBob = Math.sin(t * 0.12) * 1.2;
    drawHero(68, 108 + heroBob, 1, t * 1.08, 1.4);
    drawBoyfriend(228, 104 + heroBob * 0.4);

    ctx.fillStyle = "rgba(12, 10, 16, 0.82)";
    ctx.fillRect(45, 126, 230, 34);
    ctx.strokeStyle = "rgba(223, 177, 181, 0.7)";
    ctx.strokeRect(45, 126, 230, 34);
    ctx.fillStyle = "#f5ebf1";
    ctx.font = "10px monospace";
    ctx.fillText("彼氏救出アクション / 都会ステージ", 66, 134);
    ctx.fillText("バイクで15秒無敵・踏みつけ&チャージ攻撃", 52, 146);

    const blink = Math.floor(t / 24) % 2 === 0;
    if (blink) {
      ctx.fillStyle = "#ffe7b0";
      ctx.font = "11px monospace";
      ctx.fillText("Tap / Enter でスタート", 86, 168);
    }
  }

  function drawCutsceneCityBackdrop(t, danger = false) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (danger) {
      sky.addColorStop(0, "#151326");
      sky.addColorStop(0.42, "#1f2d57");
      sky.addColorStop(0.9, "#2a2a3c");
    } else {
      sky.addColorStop(0, "#111628");
      sky.addColorStop(0.46, "#233760");
      sky.addColorStop(0.9, "#2e3244");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const farShift = -Math.floor(t * 0.12) % 22;
    for (let i = -2; i < 20; i += 1) {
      const bx = i * 22 + farShift;
      const h = 34 + ((i * 11 + Math.floor(t * 0.08)) % 26);
      const by = 128 - h;
      const body = danger ? "#1f2a4a" : "#1b2743";
      const edge = danger ? "#2a3a63" : "#2b3f65";
      ctx.fillStyle = body;
      ctx.fillRect(bx, by, 14, h);
      ctx.fillStyle = edge;
      ctx.fillRect(bx + 1, by + 1, 12, 2);
      for (let wy = by + 6; wy < 124; wy += 6) {
        const hot = (wy + i) % 3 === 0;
        ctx.fillStyle = hot ? (danger ? "#ff8aa3" : "#8ce5ff") : "#31486a";
        ctx.fillRect(bx + 2, wy, 2, 1);
        ctx.fillStyle = hot ? "#ffd39a" : "#2a3d5b";
        ctx.fillRect(bx + 9, wy + 1, 2, 1);
      }
    }

    const nearShift = -Math.floor(t * 0.23) % 28;
    for (let i = -2; i < 16; i += 1) {
      const bx = i * 28 + nearShift;
      const h = 48 + ((i * 7 + Math.floor(t * 0.16)) % 36);
      const by = 136 - h;
      ctx.fillStyle = danger ? "#202a42" : "#212e4a";
      ctx.fillRect(bx, by, 18, h);
      ctx.fillStyle = danger ? "#3a4d75" : "#395077";
      ctx.fillRect(bx + 1, by + 1, 16, 3);
      ctx.fillStyle = "#162236";
      ctx.fillRect(bx + 15, by + 2, 2, h - 2);
      for (let wy = by + 8; wy < 132; wy += 7) {
        const lit = (wy + i) % 2 === 0;
        ctx.fillStyle = lit ? (danger ? "#ffc16f" : "#7ce8ff") : "#2b405f";
        ctx.fillRect(bx + 3, wy, 2, 2);
        ctx.fillStyle = lit ? "#ffdcb1" : "#344f72";
        ctx.fillRect(bx + 11, wy + 1, 2, 1);
      }
      if (i % 5 === 0) {
        ctx.fillStyle = danger ? "#ff5f8a" : "#78e4ff";
        ctx.fillRect(bx + 4, by - 2, 10, 1);
      }
    }

    ctx.fillStyle = "rgba(170, 205, 255, 0.1)";
    ctx.fillRect(0, 118, W, 16);

    ctx.fillStyle = danger ? "#252737" : "#2a313f";
    ctx.fillRect(0, 132, W, 48);
    ctx.fillStyle = danger ? "#4f5f7a" : "#48566e";
    const laneShift = -Math.floor(t * 0.48) % 24;
    for (let x = laneShift - 24; x < W + 24; x += 24) {
      ctx.fillRect(x, 142, 11, 1);
      ctx.fillRect(x + 7, 156, 8, 1);
    }
  }

  function drawKidnapVan(x, y, t) {
    const px = Math.floor(x);
    const py = Math.floor(y);
    const wheel = Math.floor(t * 0.36) % 2;
    const blink = Math.floor(t * 0.32) % 2 === 0;

    ctx.fillStyle = "#10151f";
    ctx.fillRect(px + 2, py + 13, 8, 8);
    ctx.fillRect(px + 28, py + 13, 8, 8);
    ctx.fillStyle = "#677da8";
    ctx.fillRect(px + 4 + wheel, py + 15, 2, 2);
    ctx.fillRect(px + 30 + wheel, py + 15, 2, 2);
    ctx.fillStyle = "#1f2a3f";
    ctx.fillRect(px, py + 4, 40, 12);
    ctx.fillStyle = "#2f3d5b";
    ctx.fillRect(px + 1, py + 5, 38, 9);
    ctx.fillStyle = "#111726";
    ctx.fillRect(px + 30, py + 5, 8, 9);
    ctx.fillStyle = "#74dafb";
    ctx.fillRect(px + 4, py + 6, 8, 4);
    ctx.fillRect(px + 14, py + 6, 7, 4);
    ctx.fillStyle = "#ff6e8f";
    ctx.fillRect(px + 22, py + 6, 6, 4);
    ctx.fillStyle = "#1b2336";
    ctx.fillRect(px + 4, py + 11, 24, 1);
    ctx.fillStyle = "#f2f7ff";
    ctx.fillRect(px + 2, py + 9, 1, 2);
    ctx.fillRect(px + 37, py + 9, 1, 2);
    if (blink) {
      ctx.fillStyle = "#ffc47c";
      ctx.fillRect(px + 39, py + 9, 2, 2);
    }
  }

  function drawCutscenePolish(t, tension = 0.6) {
    const barH = Math.floor(9 + tension * 4);
    ctx.fillStyle = `rgba(0,0,0,${0.64 + tension * 0.14})`;
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);

    const scanA = 0.02 + tension * 0.02;
    ctx.fillStyle = `rgba(255, 220, 190, ${scanA})`;
    for (let y = barH + 1; y < H - barH; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }

    const grainTick = Math.floor(t * 0.8);
    for (let y = barH + 1; y < H - barH - 1; y += 4) {
      for (let x = 0; x < W; x += 4) {
        const p = (x * 3 + y * 5 + grainTick) % 13;
        if (p > 2) continue;
        ctx.fillStyle = p === 0 ? "rgba(255, 255, 255, 0.04)" : "rgba(130, 190, 255, 0.025)";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function drawCutscene() {
    const t = cutsceneTime;
    const dangerScene = t >= 260;

    drawCutsceneCityBackdrop(t, dangerScene);

    if (!dangerScene) {
      const introBob = Math.sin(t * 0.14) * 1.1;
      drawHero(88, 110 + introBob, 1, t * 1.05, 1.12);
      drawBoyfriend(126, 108 + introBob * 0.45);

      ctx.fillStyle = "rgba(255, 225, 174, 0.22)";
      ctx.fillRect(70, 123, 84, 3);
      ctx.fillStyle = "rgba(124, 214, 255, 0.18)";
      ctx.fillRect(58, 118, 104, 2);

      drawTextPanel([
        "りら: 私はAI。普段はジムのインストラクターなリア充。",
        "シュークリームで元気回復、プロテインはバニラ派!",
      ]);
    } else {
      const k = clamp((t - 260) / 430, 0, 1);
      const vanX = 128 + k * 126;
      const run = Math.sin(t * 0.22) * 1.1;
      drawHero(70 + run + k * 12, 111, 1, t * 1.2, 1.08);

      drawKidnapVan(vanX - 12, 104 + Math.sin(t * 0.13) * 1);
      drawBoyfriend(vanX + 6, 102 + Math.sin(t * 0.18) * 0.7);

      const gruntBob = Math.sin(t * 0.22) * 1.1;
      ctx.fillStyle = "#191820";
      ctx.fillRect(vanX + 18, 101 + gruntBob, 12, 24);
      ctx.fillStyle = "#7d2f54";
      ctx.fillRect(vanX + 20, 100 + gruntBob, 8, 4);
      ctx.fillStyle = "#f0c8b2";
      ctx.fillRect(vanX + 21, 105 + gruntBob, 6, 4);
      ctx.fillStyle = "#212430";
      ctx.fillRect(vanX + 22, 106 + gruntBob, 1, 1);
      ctx.fillRect(vanX + 25, 106 + gruntBob, 1, 1);
      ctx.fillStyle = "#2d3548";
      ctx.fillRect(vanX + 19, 110 + gruntBob, 10, 8);
      ctx.fillStyle = "#151821";
      ctx.fillRect(vanX + 20, 118 + gruntBob, 3, 7);
      ctx.fillRect(vanX + 25, 118 + gruntBob, 3, 7);
      ctx.fillStyle = "#ff6f9f";
      ctx.fillRect(vanX + 12, 108 + gruntBob, 4, 2);

      for (let i = 0; i < 6; i += 1) {
        const dx = vanX - 14 - i * 8 + (Math.floor(t * 0.5) % 8);
        const dy = 125 + (i % 2);
        ctx.fillStyle = `rgba(255, 206, 156, ${0.26 - i * 0.03})`;
        ctx.fillRect(dx, dy, 5, 1);
      }

      if (t < 470) {
        drawTextPanel([
          "悪の組織が彼氏に甘い話を持ちかけた。",
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

    drawCutscenePolish(t, dangerScene ? 0.84 : 0.64);

    ctx.fillStyle = "rgba(0,0,0,0.44)";
    ctx.fillRect(90, 8, 140, 14);
    ctx.fillStyle = "#f4f3ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("タップ / Enter でスキップ", 101, 11);
  }

  function drawPreBossCutscene() {
    const rawT = preBossCutsceneTimer;
    const stage1Peacock = stage.boss && stage.boss.kind === "peacock";

    if (stage1Peacock) {
      if (rawT < 0) {
        drawWorld();
        const enterRatio = clamp((rawT + PRE_BOSS_ENTRY_DURATION) / PRE_BOSS_ENTRY_DURATION, 0, 1);
        const fade = clamp(0.38 + enterRatio * 0.32, 0.38, 0.74);
        const gx = Math.floor(stage.goal.x - cameraX);
        const gy = Math.floor(stage.goal.y);
        ctx.fillStyle = `rgba(8,10,16,${fade})`;
        ctx.fillRect(gx - 4, gy + 3, stage.goal.w + 8, stage.goal.h - 3);
        drawTextPanel(["りらはゲートを開き、孔雀ボスのアリーナへ入る。"]);
        drawCutscenePolish(rawT + PRE_BOSS_ENTRY_DURATION, 0.52);

        ctx.fillStyle = "rgba(0,0,0,0.44)";
        ctx.fillRect(90, 8, 140, 14);
        ctx.fillStyle = "#f4f3ff";
        ctx.font = "9px monospace";
        ctx.textBaseline = "top";
        ctx.fillText("タップ / Enter でスキップ", 101, 11);
        return;
      }

      const t = rawT + 110;
      const camBackup = cameraX;
      cameraX = clamp(stage.goal.x - 120, 0, stage.width - W);
      drawSkyGradient();
      drawParallax();
      cameraX = camBackup;

      ctx.fillStyle = "#232d40";
      ctx.fillRect(0, 132, W, 48);
      ctx.fillStyle = "#4e5f7f";
      for (let i = 0; i < W; i += 20) ctx.fillRect(i, 140, 10, 1);

      const approach = clamp(t / 146, 0, 1);
      const heroX = 62 + approach * 94;
      drawHero(heroX, 112, 1, t * 1.1, 1.08);

      const bossX = 216 + Math.sin(t * 0.1) * 1.2;
      const bossY = 106;
      ctx.fillStyle = "#11202f";
      ctx.fillRect(bossX - 10, bossY + 12, 20, 15);
      ctx.fillStyle = "#2180ad";
      ctx.fillRect(bossX - 8, bossY + 14, 16, 10);
      ctx.fillStyle = "#45c3df";
      ctx.fillRect(bossX - 7, bossY + 15, 5, 7);
      ctx.fillRect(bossX + 2, bossY + 15, 5, 7);
      ctx.fillStyle = "#6de3f0";
      ctx.fillRect(bossX - 3, bossY + 11, 6, 6);
      ctx.fillStyle = "#f3d57f";
      ctx.fillRect(bossX + 3, bossY + 13, 5, 2);
      ctx.fillStyle = "#1a283f";
      ctx.fillRect(bossX - 1, bossY + 12, 3, 3);
      ctx.fillStyle = "#f4f7ff";
      ctx.fillRect(bossX, bossY + 13, 1, 1);

      ctx.fillStyle = "#2b9cc4";
      ctx.fillRect(bossX - 18, bossY + 8, 8, 14);
      ctx.fillRect(bossX + 10, bossY + 8, 8, 14);
      ctx.fillStyle = "#6fe3ef";
      ctx.fillRect(bossX - 15, bossY + 11, 2, 7);
      ctx.fillRect(bossX + 13, bossY + 11, 2, 7);

      if (t < 152) {
        drawTextPanel([
          "ステージ1終点: ネオンアリーナに到着。",
          "ゲートの先で孔雀ボスが待ち構える。",
        ]);
      } else {
        drawTextPanel([
          "孔雀ボス出現! 突進と羽弾を見切って倒せ。",
          "倒せばSTAGE 2の都会中心部へ進める。",
        ]);
      }
      drawCutscenePolish(t, 0.62);

      ctx.fillStyle = "rgba(0,0,0,0.44)";
      ctx.fillRect(90, 8, 140, 14);
      ctx.fillStyle = "#f4f3ff";
      ctx.font = "9px monospace";
      ctx.textBaseline = "top";
      ctx.fillText("タップ / Enter でスキップ", 101, 11);
      return;
    }

    if (rawT < 0) {
      drawWorld();
      const enterRatio = clamp((rawT + PRE_BOSS_ENTRY_DURATION) / PRE_BOSS_ENTRY_DURATION, 0, 1);
      const fade = clamp(0.42 + enterRatio * 0.38, 0.42, 0.8);
      const gx = Math.floor(stage.goal.x - cameraX);
      const gy = Math.floor(stage.goal.y);
      ctx.fillStyle = `rgba(8,10,16,${fade})`;
      ctx.fillRect(gx - 4, gy + 3, stage.goal.w + 8, stage.goal.h - 3);
      drawTextPanel(["りらはマンションの扉を開き、会場へ入る。"]);
      drawCutscenePolish(rawT + PRE_BOSS_ENTRY_DURATION, 0.58);

      ctx.fillStyle = "rgba(0,0,0,0.44)";
      ctx.fillRect(90, 8, 140, 14);
      ctx.fillStyle = "#f4f3ff";
      ctx.font = "9px monospace";
      ctx.textBaseline = "top";
      ctx.fillText("タップ / Enter でスキップ", 101, 11);
      return;
    }

    const t = rawT + PRE_BOSS_MOVIE_START_AT;
    const showInterior = t >= 230;
    const approach = clamp(t / 156, 0, 1);
    const doorOpen = clamp((t - 114) / 42, 0, 1);
    const enter = clamp((t - 166) / 58, 0, 1);
    const party = clamp((t - 246) / 138, 0, 1);
    const descend = clamp((t - 322) / 128, 0, 1);

    if (!showInterior) {
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

      const heroX = 36 + approach * 122 + enter * 16;
      const heroY = 112 - enter * 4;
      drawHero(heroX, heroY, 1, t * 1.3);

      const doorW = Math.max(7, Math.floor(26 - doorOpen * 18));
      ctx.fillStyle = "#11141d";
      ctx.fillRect(mx + 39, my + 64, doorW, 40);
      ctx.fillStyle = "rgba(255, 220, 170, 0.18)";
      ctx.fillRect(mx + 39 + doorW, my + 64, 26 - doorW, 40);

      ctx.fillStyle = "rgba(255, 223, 184, 0.16)";
      ctx.fillRect(mx + 46, my + 72, 14, 28);
    } else {
      drawMansionInteriorBackdrop();

      const roomX = 100;
      const roomY = 62;
      const roomW = 136;
      const roomH = 70;
      ctx.fillStyle = `rgba(62, 25, 80, ${0.46 + party * 0.28})`;
      ctx.fillRect(roomX, roomY, roomW, roomH);

      const pulse = 0.18 + (Math.sin(t * 0.24) * 0.5 + 0.5) * 0.24;
      ctx.fillStyle = `rgba(255, 123, 196, ${pulse})`;
      ctx.fillRect(roomX + 4, roomY + 4, roomW - 8, 2);
      ctx.fillStyle = `rgba(124, 214, 255, ${pulse * 0.86})`;
      ctx.fillRect(roomX + 4, roomY + 10, roomW - 8, 1);

      const guests = [roomX + 14, roomX + 36, roomX + 62, roomX + 82, roomX + 110];
      for (let i = 0; i < guests.length; i += 1) {
        const gx = guests[i];
        const bob = Math.sin(t * 0.16 + i * 0.8) * 1;
        ctx.fillStyle = i % 2 === 0 ? "#5f3f5e" : "#3d3856";
        ctx.fillRect(gx, roomY + 34 + bob, 9, 18);
        ctx.fillStyle = "#f0c7b5";
        ctx.fillRect(gx + 1, roomY + 30 + bob, 7, 4);
        ctx.fillStyle = "#201f2d";
        ctx.fillRect(gx + 2, roomY + 31 + bob, 1, 1);
        ctx.fillRect(gx + 6, roomY + 31 + bob, 1, 1);
        if (i <= 1) {
          // Clearly weak party guests.
          ctx.fillStyle = "#a0d6ff";
          ctx.fillRect(gx + 8, roomY + 35 + bob, 1, 1);
        }
      }

      ctx.fillStyle = "#3a2f28";
      ctx.fillRect(roomX + 46, roomY + 46, 34, 7);
      ctx.fillStyle = "#bb8e67";
      ctx.fillRect(roomX + 48, roomY + 44, 30, 2);
      ctx.fillStyle = "#f2d5a8";
      ctx.fillRect(roomX + 51, roomY + 43, 2, 1);
      ctx.fillRect(roomX + 73, roomY + 43, 2, 1);

      drawHero(66, 112, 1, t * 1.2);

      if (descend > 0.01) {
        const beamX = roomX + 102;
        const beamTop = 0;
        const beamBottom = roomY + 60;
        const beamW = 13 + Math.sin(t * 0.35) * 2;
        ctx.fillStyle = `rgba(236, 246, 255, ${0.16 + descend * 0.28})`;
        ctx.fillRect(beamX - beamW, beamTop, beamW * 2, beamBottom);
        ctx.fillStyle = `rgba(255, 242, 196, ${0.14 + descend * 0.22})`;
        ctx.fillRect(beamX - 4, beamTop, 8, beamBottom);

        for (let i = 0; i < 4; i += 1) {
          const lx = beamX - 18 + i * 12 + Math.sin((t + i * 22) * 0.2) * 2;
          ctx.fillStyle = "rgba(210, 236, 255, 0.42)";
          ctx.fillRect(Math.floor(lx), Math.floor(24 + i * 10), 2, 8);
        }

        const godY = roomY - 28 + descend * 42;
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
    }

    drawCutscenePolish(t, 0.76);

    if (t < 138) {
      drawTextPanel(["マンション前に到着。"]);
    } else if (t < 230) {
      drawTextPanel(["扉が開いた。りらは会場へ突入。"]);
    } else if (t < 330) {
      drawTextPanel(["会場には勧誘された構成員もいる。"]);
    } else {
      drawTextPanel(["ホームパーティーで白ヒゲの神が降臨。"]);
    }

    ctx.fillStyle = "rgba(0,0,0,0.44)";
    ctx.fillRect(90, 8, 140, 14);
    ctx.fillStyle = "#f4f3ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText("タップ / Enter でスキップ", 101, 11);
  }

  function drawHUD() {
    const hudH = 22;
    ctx.fillStyle = "rgba(9, 8, 12, 0.78)";
    ctx.fillRect(0, 0, W, hudH);

    const heartStartX = 6;
    const heartY = 6;
    for (let i = 0; i < MAX_HEARTS; i += 1) {
      drawHeartIcon(heartStartX + i * 10, heartY, i < playerHearts);
    }

    ctx.fillStyle = "#f7f1ff";
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(`x${playerLives}`, heartStartX + MAX_HEARTS * 10 + 3, 6);

    const bossActive = gameState === STATE.BOSS && stage.boss.active;
    const burstBarX = 80;
    const burstBarY = 7;
    const burstBarW = bossActive ? 90 : 150;
    const burstRatio = clamp(proteinBurstGauge / PROTEIN_BURST_REQUIRE, 0, 1);
    const burstReady = proteinBurstGauge >= PROTEIN_BURST_MIN;
    ctx.fillStyle = "#1d2436";
    ctx.fillRect(burstBarX, burstBarY, burstBarW, 6);
    ctx.fillStyle = burstReady ? "#78ebff" : "#5d7f97";
    ctx.fillRect(burstBarX + 1, burstBarY + 1, Math.floor((burstBarW - 2) * burstRatio), 4);
    const minMarkerX = burstBarX + 1 + Math.floor((burstBarW - 2) * (PROTEIN_BURST_MIN / PROTEIN_BURST_REQUIRE));
    ctx.fillStyle = "rgba(255, 225, 140, 0.9)";
    ctx.fillRect(minMarkerX, burstBarY + 1, 1, 4);
    if (proteinBurstTimer > 0) {
      ctx.fillStyle = "#fff0c2";
      ctx.fillRect(burstBarX + 1, burstBarY + 1, burstBarW - 2, 1);
    }

    if (bossActive) {
      const barX = 176;
      const barY = 7;
      const barW = 138;
      const ratio = clamp(stage.boss.hp / stage.boss.maxHp, 0, 1);
      ctx.fillStyle = "#2a1314";
      ctx.fillRect(barX, barY, barW, 6);
      ctx.fillStyle = "#e25555";
      ctx.fillRect(barX + 1, barY + 1, Math.floor((barW - 2) * ratio), 4);

      if (stage.boss.kind === "god") {
        const phase = stage.boss.phase || 1;
        ctx.fillStyle = "rgba(235, 245, 255, 0.92)";
        ctx.font = "7px monospace";
        ctx.fillText(`P${phase}`, barX + barW - 14, barY + 7);

        if (phase >= 2) {
          const advRatio = clamp((stage.boss.gimmickAdvantageTimer || 0) / 220, 0, 1);
          ctx.fillStyle = "#18303a";
          ctx.fillRect(barX, barY + 8, barW, 3);
          ctx.fillStyle = "#7be9ff";
          ctx.fillRect(barX + 1, barY + 9, Math.floor((barW - 2) * advRatio), 1);
        }
      }
    }

    ctx.fillStyle = "rgba(235, 245, 255, 0.9)";
    ctx.font = "8px monospace";
    ctx.fillText(`STAGE ${currentStageNumber}`, W - 56, 6);

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
    if (currentStageNumber < FINAL_STAGE_NUMBER) {
      drawCutsceneCityBackdrop(t * 0.85, false);
      const heroX = 102 + Math.sin(t * 0.08) * 1.2;
      const heroY = 106;
      drawHero(heroX, heroY, 1, t * 1.02, 1.06);

      ctx.fillStyle = "#24324b";
      ctx.fillRect(186, 110, 18, 24);
      ctx.fillStyle = "#1b6f9e";
      ctx.fillRect(183, 112, 10, 14);
      ctx.fillStyle = "#63d9f0";
      ctx.fillRect(184, 115, 2, 5);
      ctx.fillStyle = "#f0cc72";
      ctx.fillRect(193, 118, 4, 2);
      ctx.fillStyle = "#fff5d3";
      ctx.fillRect(191, 106, 8, 2);
      ctx.fillStyle = "#ff9d8d";
      ctx.fillRect(197, 112, 2, 2);

      const cardW = 230;
      const cardX = Math.floor((W - cardW) * 0.5);
      ctx.fillStyle = "rgba(9,12,20,0.82)";
      ctx.fillRect(cardX, 34, cardW, 70);
      ctx.strokeStyle = "rgba(170, 216, 255, 0.75)";
      ctx.strokeRect(cardX, 34, cardW, 70);
      ctx.fillStyle = "#9bd8ff";
      ctx.font = "12px monospace";
      ctx.fillText("STAGE 1 CLEAR", cardX + 58, 46);
      ctx.fillStyle = "#f0f5ff";
      ctx.font = "9px monospace";
      ctx.fillText("孔雀ボスを撃破! りらはさらに奥の都会エリアへ。", cardX + 17, 64);
      ctx.fillText("次はマンション街区、STAGE 2が始まる。", cardX + 34, 76);

      drawTextPanel([
        "STAGE 2 へ移動中...",
        "Tap / Enter で先へ進む",
      ]);
      drawCutscenePolish(t, 0.68);
      return;
    }

    if (t < 180) {
      drawCutsceneCityBackdrop(t * 0.8, true);
      const carryBob = Math.sin(t * 0.14) * 1.3;
      drawHero(106, 106 + carryBob, 1, t * 1.08, 1.06);
      drawBoyfriend(124 + cameraX, 108 + carryBob * 0.45);
      ctx.fillStyle = "#f4e5e8";
      ctx.fillRect(124, 111 + carryBob * 0.45, 11, 4);
      ctx.fillRect(128, 115 + carryBob * 0.45, 7, 3);
      ctx.fillStyle = "rgba(255, 225, 170, 0.18)";
      ctx.fillRect(88, 126, 70, 3);
      drawTextPanel([
        "白ヒゲの神を撃破。会場は静まり返る。",
        "りら: もう大丈夫、今すぐここから出よう。",
      ]);
      drawCutscenePolish(t, 0.74);
      return;
    }

    if (t < 360) {
      drawMansionInteriorBackdrop();
      const talkBob = Math.sin(t * 0.11) * 1.1;
      drawHero(88, 108 + talkBob, 1, t * 0.95, 1.04);
      drawBoyfriend(176 + cameraX, 108 - talkBob * 0.35);

      const goonXs = [134, 214];
      for (let i = 0; i < goonXs.length; i += 1) {
        const gx = goonXs[i];
        const bob = Math.sin(t * 0.09 + i * 0.8) * 0.9;
        ctx.fillStyle = "#2e3247";
        ctx.fillRect(gx, 120 + bob, 8, 16);
        ctx.fillStyle = "#c9a793";
        ctx.fillRect(gx + 1, 116 + bob, 6, 4);
        ctx.fillStyle = "#1c1f2c";
        ctx.fillRect(gx + 2, 117 + bob, 1, 1);
        ctx.fillRect(gx + 5, 117 + bob, 1, 1);
      }

      if (t < 270) {
        drawTextPanel([
          "彼氏: 助けに来てくれて、本当にありがとう。",
          "りら: 当たり前。ふたりで帰るまでが救出作戦だよ。",
        ]);
      } else {
        drawTextPanel([
          "勧誘ルートは完全遮断。会場の安全を確認。",
          "りらと彼氏はマンション屋上へ向かう。",
        ]);
      }
      drawCutscenePolish(t, 0.66);
      return;
    }

    if (t < 560) {
      drawCutsceneCityBackdrop(t * 0.7, false);
      ctx.fillStyle = "#2f3548";
      ctx.fillRect(0, 132, W, 48);
      ctx.fillStyle = "#4e5a74";
      for (let i = 0; i < W; i += 16) {
        ctx.fillRect(i, 140, 8, 1);
      }
      const approach = clamp((t - 360) / 150, 0, 1);
      const sway = Math.sin(t * 0.09) * 1.4;
      const heroX = 84 + approach * 40 + sway * 0.4;
      const bfX = 212 - approach * 34 - sway * 0.4;
      const y = 106;
      drawHero(heroX, y, 1, t * 1.1, 1.05);
      drawBoyfriend(bfX + cameraX, y + 1);

      if (approach > 0.3) {
        const ringX = Math.floor((heroX + bfX) * 0.5 + Math.sin(t * 0.2) * 1.6);
        const ringY = y - 10 + Math.floor(Math.sin(t * 0.17) * 2);
        ctx.fillStyle = "#ffe08e";
        ctx.fillRect(ringX, ringY, 3, 2);
        ctx.fillRect(ringX + 1, ringY - 1, 1, 1);
        ctx.fillStyle = "#fff7d8";
        ctx.fillRect(ringX + 1, ringY, 1, 1);
      }

      for (let i = 0; i < 8; i += 1) {
        const hx = 42 + i * 30 + ((t * 0.55 + i * 10) % 24);
        const hy = 20 + ((t * 0.4 + i * 13) % 48);
        ctx.fillStyle = i % 2 === 0 ? "#ff8cb1" : "#ffd89f";
        ctx.fillRect(Math.floor(hx), Math.floor(hy), 2, 2);
      }

      if (t < 460) {
        drawTextPanel([
          "彼氏: これからも、ずっと一緒にいてくれる?",
          "りら: もちろん。毎日、隣で支えるよ。",
        ]);
      } else {
        drawTextPanel([
          "ふたりは指輪を交わし、未来を誓った。",
          "街のネオンが祝福のように輝く。",
        ]);
      }
      drawCutscenePolish(t, 0.7);
      return;
    }

    if (t < 820) {
      ctx.fillStyle = "#1b2438";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2b3a58";
      ctx.fillRect(0, 0, W, 126);
      ctx.fillStyle = "#3f4e6c";
      ctx.fillRect(0, 126, W, 54);

      ctx.fillStyle = "#a03d52";
      ctx.fillRect(136, 126, 48, 54);
      ctx.fillStyle = "#7f2f3f";
      ctx.fillRect(140, 126, 40, 54);
      ctx.fillStyle = "#e6e0d2";
      ctx.fillRect(84, 30, 152, 72);
      ctx.fillStyle = "#cfc2aa";
      ctx.fillRect(92, 38, 136, 56);
      ctx.fillStyle = "#9f8f76";
      ctx.fillRect(152, 24, 16, 92);
      ctx.fillStyle = "#f6f2ea";
      ctx.fillRect(148, 48, 24, 22);
      ctx.fillStyle = "#ffdca2";
      ctx.fillRect(155, 53, 10, 12);

      const vow = clamp((t - 560) / 180, 0, 1);
      const sway = Math.sin(t * 0.08) * 1.4;
      const heroX = 106 + sway + vow * 10;
      const bfX = 192 - sway - vow * 9;
      const heroY = 104;
      const bfY = 104;
      drawHero(heroX, heroY, 1, t * 1.05, 1.06);
      drawBoyfriend(bfX + cameraX, bfY);

      ctx.fillStyle = "#f7f3ee";
      ctx.fillRect(Math.floor(heroX + 2), heroY + 20, 10, 5);
      ctx.fillStyle = "#e6ddd4";
      ctx.fillRect(Math.floor(heroX + 4), heroY + 19, 6, 1);
      ctx.fillStyle = "#ffcad9";
      ctx.fillRect(Math.floor(heroX + 10), heroY + 15, 2, 2);
      ctx.fillStyle = "#8ad17f";
      ctx.fillRect(Math.floor(heroX + 12), heroY + 16, 1, 3);

      const ringX = Math.floor((heroX + bfX) * 0.5 + Math.sin(t * 0.2) * 1.1);
      const ringY = 104 - Math.floor(Math.sin(t * 0.17) * 2);
      ctx.fillStyle = "#ffe08e";
      ctx.fillRect(ringX, ringY, 3, 2);
      ctx.fillRect(ringX + 1, ringY - 1, 1, 1);
      ctx.fillStyle = "#fff7d8";
      ctx.fillRect(ringX + 1, ringY, 1, 1);

      for (let i = 0; i < 12; i += 1) {
        const cx = 26 + ((i * 24 + t * 0.72) % 300);
        const cy = 18 + ((i * 14 + t * 0.43) % 62);
        ctx.fillStyle = i % 3 === 0 ? "#ff8cae" : i % 3 === 1 ? "#ffd7a2" : "#9de1ff";
        ctx.fillRect(Math.floor(cx), Math.floor(cy), 2, 2);
      }

      if (t < 700) {
        drawTextPanel([
          "マンションホールで小さな結婚式が始まる。",
          "拍手の中、りらと彼氏は夫婦になる。",
        ]);
      } else {
        drawTextPanel([
          "りら: 今日もプロテインと笑顔で最強!",
          "彼氏: これから毎日が新しい冒険だ。",
        ]);
      }
      drawCutscenePolish(t, 0.74);
      return;
    }

    ctx.fillStyle = "#07080d";
    ctx.fillRect(0, 0, W, H);
    drawCutscenePolish(t, 0.8);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText("HAPPY WEDDING", 84, 52);
    ctx.font = "14px monospace";
    ctx.fillText("THE END", 124, 76);
    drawHero(110, 96, 1, t * 1.1, 1.12);
    drawBoyfriend(188 + cameraX, 96);
    ctx.fillStyle = "#ffdca2";
    ctx.fillRect(156, 100, 3, 2);
    ctx.fillRect(157, 99, 1, 1);
    ctx.fillStyle = "#fff8de";
    ctx.fillRect(157, 100, 1, 1);

    ctx.font = "9px monospace";
    ctx.fillStyle = "#d7d7de";
    ctx.fillText("りら & 彼氏  Rescue Complete", 90, 112);
    ctx.fillText(`PROTEIN ${collectedProteinIds.size}/${stage.proteins.length}`, 112, 122);
    ctx.fillText(`DEATHS ${deaths}`, 132, 132);
    if (t > 900) {
      ctx.fillStyle = "#f7d9d9";
      ctx.fillText("タップ/Enterでタイトルへ", 95, 146);
    }
  }

  function drawPs1Overlay() {
    const filmTick = Math.floor((player.anim + titleTimer) * 0.8);

    ctx.fillStyle = "rgba(10,12,18,0.1)";
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
    vignette.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += 4) {
      for (let x = 0; x < W; x += 4) {
        const p = (x + y + filmTick) % 8;
        if (p < 2) continue;
        ctx.fillStyle = p < 5 ? "rgba(220, 190, 160, 0.028)" : "rgba(150, 190, 255, 0.022)";
        ctx.fillRect(x, y, 2, 2);
      }
    }

    ctx.fillStyle = "rgba(170,205,255,0.05)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255, 166, 140, 0.03)";
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

  function drawWaveFlashOverlay() {
    if (waveFlashTimer <= 0 || waveFlashPower <= 0.01) return;

    const ratio = clamp(waveFlashTimer / 30, 0, 1);
    const power = clamp(waveFlashPower, 0, 3.2);
    const sx = Math.floor(waveFlashX - cameraX);
    const sy = Math.floor(waveFlashY);
    const pulse = 0.5 + Math.sin((player.anim + waveFlashTimer) * 0.26) * 0.5;

    ctx.fillStyle = `rgba(138, 232, 255, ${0.1 * ratio * power})`;
    ctx.fillRect(0, 24, W, H - 24);
    ctx.fillStyle = `rgba(255, 244, 178, ${0.07 * ratio * power})`;
    ctx.fillRect(0, 34, W, H - 34);

    ctx.fillStyle = `rgba(255,255,255,${0.26 * ratio})`;
    ctx.fillRect(sx - 3, sy - 3, 6, 6);

    for (let i = 0; i < 14; i += 1) {
      const ang = (Math.PI * 2 * i) / 14 + (player.anim + i) * 0.04;
      const len = 14 + power * 10 + (i % 2 === 0 ? 6 : 0);
      ctx.strokeStyle = `rgba(162, 248, 255, ${0.32 * ratio})`;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(Math.floor(sx + Math.cos(ang) * len), Math.floor(sy + Math.sin(ang) * len * 0.66));
      ctx.stroke();
    }

    const waveY = sy + Math.floor((pulse - 0.5) * 4);
    ctx.fillStyle = `rgba(255,255,255,${0.38 * ratio})`;
    ctx.fillRect(0, waveY - 1, W, 2);
    ctx.fillStyle = `rgba(131, 228, 255, ${0.25 * ratio})`;
    ctx.fillRect(0, waveY - 3, W, 6);
  }

  function drawProteinBurstLaserOverlay() {
    if (proteinBurstLaserTimer <= 0 && proteinBurstTimer <= 0) return;

    const ratio = clamp(proteinBurstLaserTimer / PROTEIN_BURST_LASER_DURATION, 0, 1);
    const burstRatio = clamp(proteinBurstTimer / PROTEIN_BURST_DURATION, 0, 1);
    const intensity = Math.max(ratio, burstRatio * 0.92);
    const sweep = 1 - ratio;
    const topY = 24;
    const laserY = Math.floor(topY + sweep * (H - topY - 8));
    const pulse = 0.5 + Math.sin(proteinBurstLaserPhase * 0.9) * 0.5;
    const fastPulse = 0.5 + Math.sin(proteinBurstLaserPhase * 1.7) * 0.5;

    ctx.fillStyle = `rgba(120, 225, 255, ${0.12 + intensity * 0.24})`;
    ctx.fillRect(0, topY, W, H - topY);
    ctx.fillStyle = `rgba(255, 212, 150, ${0.06 + intensity * 0.16})`;
    ctx.fillRect(0, topY + 4, W, H - topY - 4);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.04 + fastPulse * 0.1 * intensity})`;
    ctx.fillRect(0, topY, W, H - topY);

    for (let i = 0; i < 13; i += 1) {
      const x = Math.floor((W / 12) * i + Math.sin((proteinBurstLaserPhase + i) * 0.7) * 6);
      const w = i % 2 === 0 ? 2 : 1;
      ctx.fillStyle = `rgba(164, 246, 255, ${0.2 + intensity * 0.26})`;
      ctx.fillRect(x, topY, w, H - topY);
      ctx.fillStyle = `rgba(255, 248, 190, ${0.16 + intensity * 0.18})`;
      ctx.fillRect(x + 1, topY, 1, H - topY);
    }

    const px = Math.floor(player.x - cameraX + player.w * 0.5);
    const py = Math.floor(player.y + player.h * 0.4);
    for (let i = 0; i < 3; i += 1) {
      const spread = 8 + i * 7 + fastPulse * 2;
      ctx.strokeStyle = `rgba(184, 246, 255, ${0.22 + intensity * 0.14 - i * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(px - spread, py);
      ctx.lineTo(px + spread, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py - spread * 0.5);
      ctx.lineTo(px, py + spread * 0.5);
      ctx.stroke();
    }

    if (proteinBurstLaserTimer > 0) {
      ctx.fillStyle = `rgba(255, 248, 182, ${0.56 + pulse * 0.3})`;
      ctx.fillRect(0, laserY - 2, W, 6);
      ctx.fillStyle = `rgba(145, 239, 255, ${0.58 + ratio * 0.34})`;
      ctx.fillRect(0, laserY - 7, W, 14);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.36 + ratio * 0.28})`;
      ctx.fillRect(0, laserY, W, 2);
      const mirrorY = Math.floor(topY + (1 - sweep) * (H - topY - 8));
      ctx.fillStyle = `rgba(255, 208, 140, ${0.22 + ratio * 0.18})`;
      ctx.fillRect(0, mirrorY - 1, W, 3);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    if (gameState === STATE.TITLE) {
      drawTitle();
      drawPs1Overlay();
      return;
    }

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
    drawWaveFlashOverlay();
    drawProteinBurstLaserOverlay();
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

  const burstButton = document.getElementById("btn-special");
  function refreshBurstButtonUi() {
    if (!burstButton) return;
    const playable = gameState === STATE.PLAY || gameState === STATE.BOSS;
    const chargeRatio = clamp(proteinBurstGauge / PROTEIN_BURST_REQUIRE, 0, 1);
    const ready = playable && proteinBurstGauge >= PROTEIN_BURST_MIN && proteinBurstTimer <= 0;
    const full = proteinBurstGauge >= PROTEIN_BURST_REQUIRE;
    burstButton.style.setProperty("--burst-fill", `${Math.round(chargeRatio * 100)}%`);
    burstButton.style.setProperty("--burst-alpha", (0.12 + chargeRatio * 0.62).toFixed(3));
    burstButton.disabled = !playable;
    burstButton.classList.toggle("not-ready", playable && !ready);
    burstButton.classList.toggle("ready", ready);
    burstButton.classList.toggle("full", full);
    burstButton.textContent = full ? "BURST!" : "BURST";
    if (!playable) {
      input.special = false;
      burstButton.classList.remove("is-down");
    }
  }

  bindHoldButton("btn-left", "left");
  bindHoldButton("btn-right", "right");
  bindHoldButton("btn-jump", "jump");
  bindHoldButton("btn-attack", "attack");
  bindHoldButton("btn-special", "special");
  refreshBurstButtonUi();

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    unlockAudio();

    if (gameState === STATE.TITLE) {
      beginOpeningCutscene();
      return;
    }

    if (gameState === STATE.CUTSCENE) {
      startOpeningTheme();
      return;
    }

    if (gameState === STATE.PRE_BOSS) {
      startOpeningTheme();
      return;
    }

    if (gameState === STATE.CLEAR) {
      if (clearTimer > 180) {
        returnToTitle();
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
    KeyK: "special",
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
    input.special = false;
    input.start = false;
  });

  const blockGesture = (e) => e.preventDefault();
  window.addEventListener("gesturestart", blockGesture, { passive: false });
  window.addEventListener("gesturechange", blockGesture, { passive: false });
  window.addEventListener("gestureend", blockGesture, { passive: false });
  window.addEventListener("dblclick", blockGesture, { passive: false });
  window.addEventListener("contextmenu", blockGesture);
  window.addEventListener("selectstart", blockGesture);
  window.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  let lastTouchEndAt = 0;
  window.addEventListener("touchend", (e) => {
    const now = performance.now();
    if (now - lastTouchEndAt < 320) {
      e.preventDefault();
    }
    lastTouchEndAt = now;
  }, { passive: false });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(2.4, (now - last) / 16.6667);
    last = now;

    scheduleBGM();
    const actions = sampleActions();
    update(dt, actions);
    refreshBurstButtonUi();
    render();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
