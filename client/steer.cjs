// Thuật toán lái dùng chung cho test/probe:
// - Trục chính = trục lệch lớn hơn; đi từng trục (khớp luật va chạm tách trục của server).
// - Nếu nhịp trước đi mà không nhúc nhích (bị tường chặn) → VÒNG qua trục còn lại,
//   và vòng là CAM KẾT 650ms (đủ đi ~150px qua góc nhà) thay vì bỏ dở giữa chừng
//   khi trục vòng có độ lệch nhỏ.
function makeSteer(s, S, me) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  return async function steerTo(target, stopDist, timeoutMs = 25000, attack = false) {
    const t0 = Date.now();
    let prevPos = null;
    let prevAxis = null;
    let detour = null; // {vx, vy, until}
    while (Date.now() - t0 < timeoutMs) {
      const p = me();
      const tgt = typeof target === 'function' ? target(S.tick, p) : target;
      if (!p || !tgt) { await sleep(130); continue; }
      const dx = tgt.x - p.x, dy = tgt.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= stopDist) {
        s.emit('client_input', { vx: 0, vy: 0 });
        if (attack) s.emit('player_attack');
        return true;
      }
      const now = Date.now();
      let vx = 0, vy = 0, axis = null;
      if (detour && now < detour.until) {
        vx = detour.vx; vy = detour.vy; axis = detour.axis;
      } else {
        detour = null;
        // Nhịp trước có bị chặn không?
        const blocked = prevPos && prevAxis && Math.abs(p[prevAxis] - prevPos[prevAxis]) < 1;
        const primary = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        if (blocked) {
          // Vòng qua trục còn lại, cam kết 650ms; hướng theo độ lệch của trục đó (0 thì đi +)
          const alt = prevAxis === 'x' ? 'y' : 'x';
          const altDelta = alt === 'x' ? dx : dy;
          const dir = Math.sign(altDelta) || 1;
          detour = { vx: alt === 'x' ? dir : 0, vy: alt === 'y' ? dir : 0, axis: alt, until: now + 650 };
          vx = detour.vx; vy = detour.vy; axis = alt;
        } else {
          axis = primary;
          if (axis === 'x') vx = Math.sign(dx); else vy = Math.sign(dy);
          if (vx === 0 && vy === 0) { axis = primary === 'x' ? 'y' : 'x'; if (axis === 'x') vx = Math.sign(dx); else vy = Math.sign(dy); }
        }
      }
      prevPos = { x: p.x, y: p.y };
      prevAxis = axis;
      s.emit('client_input', { vx, vy });
      if (attack && d <= 48) s.emit('player_attack');
      await sleep(130);
    }
    s.emit('client_input', { vx: 0, vy: 0 });
    return false;
  };
}
module.exports = { makeSteer };
