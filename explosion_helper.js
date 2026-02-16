function spawnExplosion(cx, cy, power) {
    // Explosion size scales with power
    const size = 60 + power * 20; // Base size
    stage.playerWaves.push({
        kind: "explosion",
        x: cx,
        y: cy,
        w: size,
        h: size,
        vx: 0,
        vy: 0,
        ttl: 20,
        power: power * 1.5, // High damage
        anim: 0
    });
    triggerImpact(power * 2, cx, cy, 4);
    playKickSfx(1.5); // Use existing SFX or add new one
}
