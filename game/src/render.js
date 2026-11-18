// Drawing only: the world's state and the current screen in, pixels out. The
// camera follows Rae and zooms for the wide city shot; the HUD, the minimap
// and the title/pause/busted panels are drawn in screen space on top.

import { FONT, PALETTE, VIEW } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WRECKED = 'wrecked';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.ox = (canvas.width - VIEW.width * view.scale) / 2;
    view.oy = (canvas.height - VIEW.height * view.scale) / 2;
  }

  function font(size, bold) {
    const key = `${size}:${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align, bold) {
    ctx.font = font(size, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(244, 241, 232, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function drawCity(state) {
    const city = state.city;
    // Ground: grass everywhere, then sand, then water.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, city.width, city.height);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(city.beach.x0, 0, city.beach.x1 - city.beach.x0, city.height);
    for (const w of city.water) {
      ctx.fillStyle = PALETTE.water;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = PALETTE.waterDeep;
      ctx.fillRect(w.x, w.y, w.w, 26);
    }
    // Parks and plazas.
    for (const park of city.parks) {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    for (const plaza of city.plazas) {
      ctx.fillStyle = '#9a938a';
      ctx.fillRect(plaza.x, plaza.y, plaza.w, plaza.h);
    }
    // Roads: dark strips with pale edges and a dashed centre line.
    ctx.fillStyle = PALETTE.road;
    for (const rx of city.roadsV) ctx.fillRect(rx - city.roadW / 2, 0, city.roadW, city.height);
    for (const ry of city.roadsH) ctx.fillRect(0, ry - city.roadW / 2, city.width, city.roadW);
    ctx.strokeStyle = PALETTE.roadEdge;
    ctx.lineWidth = 2;
    for (const rx of city.roadsV) {
      ctx.beginPath();
      ctx.moveTo(rx - city.roadW / 2, 0);
      ctx.lineTo(rx - city.roadW / 2, city.height);
      ctx.moveTo(rx + city.roadW / 2, 0);
      ctx.lineTo(rx + city.roadW / 2, city.height);
      ctx.stroke();
    }
    for (const ry of city.roadsH) {
      ctx.beginPath();
      ctx.moveTo(0, ry - city.roadW / 2);
      ctx.lineTo(city.width, ry - city.roadW / 2);
      ctx.moveTo(0, ry + city.roadW / 2);
      ctx.lineTo(city.width, ry + city.roadW / 2);
      ctx.stroke();
    }
    ctx.strokeStyle = PALETTE.lane;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    for (const rx of city.roadsV) {
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx, city.height);
      ctx.stroke();
    }
    for (const ry of city.roadsH) {
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(city.width, ry);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Pier into the bay.
    ctx.fillStyle = PALETTE.pier;
    ctx.fillRect(city.pier.x, city.pier.y, city.pier.w, city.pier.h);
    ctx.fillStyle = '#5e4630';
    for (let x = city.pier.x + 20; x < city.pier.x + city.pier.w; x += 40) {
      ctx.fillRect(x, city.pier.y - 6, 8, city.pier.h + 12);
    }
    // Buildings: a soft shadow, the walls, a roof inset.
    for (const b of city.buildings) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 12);
      }
    }
    // Rae's apartment block, marked with a door and a warm window.
    const a = city.apartment;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(a.x + 6, a.y + 8, a.w, a.h);
    ctx.fillStyle = '#c98a4e';
    ctx.fillRect(a.x, a.y, a.w, a.h);
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(a.x + 8, a.y + 8, a.w - 16, a.h - 16);
    ctx.fillStyle = '#ffd97a';
    ctx.fillRect(a.x + 16, a.y + 16, 18, 14);
    ctx.fillRect(a.x + a.w - 34, a.y + 16, 18, 14);
    // Trees and palms.
    for (const t of city.trees) {
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const palm of city.palms) {
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.lineTo(palm.x, palm.y - 16);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palm;
      ctx.beginPath();
      ctx.arc(palm.x, palm.y - 18, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMarker(x, y, label, color, pulse) {
    const bob = Math.sin(pulse * 4) * 4;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(pulse * 4);
    ctx.fillRect(x - 3, y - 220, 6, 220);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x, y - 26 + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = '#11141b';
    ctx.beginPath();
    ctx.arc(x, y - 26 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    if (label) {
      ctx.font = font(15, true);
      const w = ctx.measureText(label).width + 18;
      ctx.fillStyle = 'rgba(12, 16, 30, 0.85)';
      ctx.fillRect(x - w / 2, y - 78 + bob, w, 26);
      text(label, x, y - 59 + bob, 15, PALETTE.text, 'center', true);
    }
  }

  function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-22, -10, 46, 24);
    ctx.fillStyle = car.wrecked ? '#2a2a2a' : car.color;
    ctx.fillRect(-23, -12, 46, 24);
    ctx.fillStyle = 'rgba(180, 220, 255, 0.85)';
    ctx.fillRect(-6, -10, 12, 20);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(12, -10, 5, 20);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(21, -10, 3, 6);
    ctx.fillRect(21, 4, 3, 6);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-24, -10, 3, 6);
    ctx.fillRect(-24, 4, 3, 6);
    if (car.kind === 'cab') {
      ctx.fillStyle = '#11141b';
      ctx.fillRect(-14, -12, 28, 5);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-8, -15, 16, 4);
    }
    if (car.kind === 'police' && !car.wrecked) {
      const phase = Math.floor(car.sirenPhase) % 2 === 0;
      ctx.fillStyle = phase ? '#ff3b30' : '#3b82ff';
      ctx.beginPath();
      ctx.arc(-2, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = phase ? '#3b82ff' : '#ff3b30';
      ctx.beginPath();
      ctx.arc(-2, 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (car.kind === 'target') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-18, -12, 4, 24);
    }
    ctx.restore();
    if (car.wrecked) {
      ctx.fillStyle = 'rgba(40, 40, 40, 0.5)';
      ctx.beginPath();
      ctx.arc(car.x, car.y - 14, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPed(ped, isPlayer) {
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y + 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.down ? '#888888' : ped.shirt;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 12 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    if (ped.hailing && !ped.down) {
      ctx.strokeStyle = ped.skin;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ped.x + 6, ped.y - 4);
      ctx.lineTo(ped.x + 16, ped.y - 22 - Math.sin(ped.walkPhase * 2) * 4);
      ctx.stroke();
      text('TAXI?', ped.x, ped.y - 34, 13, PALETTE.gold, 'center', true);
    }
    void isPlayer;
  }

  function drawPlayer(state) {
    const p = state.player;
    if (!p.onFoot) return;
    const blink = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0;
    if (blink) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 11, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a1a';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 13, 6, 0, Math.PI * 2);
    ctx.fill();
    // The pistol, pointing where the mouse aims.
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.aim) * 20, p.y + Math.sin(p.aim) * 20);
    ctx.stroke();
  }

  function drawEntities(state) {
    for (const car of state.cars) drawCar(car);
    for (const ped of state.peds) drawPed(ped, false);
    for (const rival of state.rivals) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(rival.x, rival.y + 10, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.rival;
      ctx.beginPath();
      ctx.arc(rival.x, rival.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c8a0';
      ctx.beginPath();
      ctx.arc(rival.x, rival.y - 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(rival.x, rival.y);
      ctx.lineTo(rival.x + Math.cos(rival.angle) * 20, rival.y + Math.sin(rival.angle) * 20);
      ctx.stroke();
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(rival.x - 14, rival.y - 26, 28 * Math.max(0, rival.hp / 70), 4);
    }
    for (const officer of state.officers) {
      ctx.fillStyle = '#1d3a8f';
      ctx.beginPath();
      ctx.arc(officer.x, officer.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c8a0';
      ctx.beginPath();
      ctx.arc(officer.x, officer.y - 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d3a8f';
      ctx.fillRect(officer.x - 8, officer.y - 20, 16, 5);
    }
    for (const bullet of state.bullets) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
    }
    for (const particle of state.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = particle.kind === 'smoke' ? '#555555' : '#ffb13b';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (particle.kind === 'smoke' ? (2 - alpha) : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawPlayer(state);
    if (state.marker) drawMarker(state.marker.x, state.marker.y, state.marker.label, PALETTE.gold, state.elapsed);
    if (state.fareMarker) drawMarker(state.fareMarker.x, state.fareMarker.y, state.fareMarker.label, '#7ae87a', state.elapsed + 2);
  }

  function drawMinimap(state) {
    const mw = 210;
    const mh = 152;
    const mx = VIEW.width - mw - 16;
    const my = VIEW.height - mh - 16;
    const sx = mw / state.city.width;
    const sy = mh / state.city.height;
    panel(mx - 6, my - 6, mw + 12, mh + 12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    ctx.clip();
    ctx.fillStyle = '#274d33';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = PALETTE.water;
    for (const w of state.city.water) ctx.fillRect(mx + w.x * sx, my + w.y * sy, w.w * sx, w.h * sy);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(mx + state.city.beach.x0 * sx, my, (state.city.beach.x1 - state.city.beach.x0) * sx, mh);
    ctx.strokeStyle = '#5a5e66';
    ctx.lineWidth = 2;
    for (const rx of state.city.roadsV) {
      ctx.beginPath();
      ctx.moveTo(mx + rx * sx, my);
      ctx.lineTo(mx + rx * sx, my + mh);
      ctx.stroke();
    }
    for (const ry of state.city.roadsH) {
      ctx.beginPath();
      ctx.moveTo(mx, my + ry * sy);
      ctx.lineTo(mx + mw, my + ry * sy);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx + state.player.x * sx - 3, my + state.player.y * sy - 3, 6, 6);
    for (const car of state.cars) {
      if (car.kind === 'police') {
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (car.driver === 'traffic') {
        ctx.fillStyle = '#c9c9c9';
        ctx.fillRect(mx + car.x * sx - 1.5, my + car.y * sy - 1.5, 3, 3);
      }
    }
    if (state.marker) {
      ctx.fillStyle = PALETTE.gold;
      ctx.save();
      ctx.translate(mx + state.marker.x * sx, my + state.marker.y * sy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    // The camera's current view, as a pale rectangle.
    const vw = VIEW.width / state.camera.zoom * sx;
    const vh = VIEW.height / state.camera.zoom * sy;
    ctx.strokeStyle = 'rgba(244, 241, 232, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + state.camera.x * sx - vw / 2, my + state.camera.y * sy - vh / 2, vw, vh);
    ctx.restore();
    text('SOLMAR BAY', mx + mw / 2, my - 12, 12, PALETTE.muted, 'center', true);
  }

  function drawHud(state, director) {
    // Top-left: cash, health, ammo.
    panel(16, 14, 250, 96);
    text(`$${state.cash.toLocaleString('en-US')}`, 30, 44, 26, PALETTE.gold, 'left', true);
    text(`Health`, 30, 70, 14, PALETTE.muted, 'left');
    ctx.fillStyle = '#3a2020';
    ctx.fillRect(92, 58, 150, 12);
    ctx.fillStyle = state.health > 30 ? '#5ac85a' : '#e84a5f';
    ctx.fillRect(92, 58, 150 * Math.max(0, state.health / 100), 12);
    text(`Ammo ${state.ammo}`, 30, 96, 14, PALETTE.text, 'left');
    // Top-right: wanted stars, clock, district.
    const stars = '\u2605'.repeat(state.wanted) + '\u2606'.repeat(5 - state.wanted);
    text(stars, VIEW.width - 30, 44, 26, state.wanted > 0 ? '#ff5a5a' : '#8b93a3', 'right', true);
    const hours = Math.floor(state.clockMin / 60);
    const minutes = Math.floor(state.clockMin % 60);
    const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    text(clock, VIEW.width - 30, 72, 20, PALETTE.text, 'right', true);
    text(state.district, VIEW.width - 30, 96, 14, PALETTE.muted, 'right');
    // Bottom-left: speed and car health when driving.
    if (state.player.car) {
      const car = state.player.car;
      panel(16, VIEW.height - 84, 220, 68);
      text(`${Math.round(Math.abs(car.speed) * 0.22)} km/h`, 30, VIEW.height - 52, 26, PALETTE.text, 'left', true);
      text(`Car`, 30, VIEW.height - 28, 14, PALETTE.muted, 'left');
      ctx.fillStyle = '#3a2020';
      ctx.fillRect(76, VIEW.height - 40, 140, 10);
      ctx.fillStyle = car.hp > 30 ? '#5ac85a' : '#e84a5f';
      ctx.fillRect(76, VIEW.height - 40, 140 * Math.max(0, car.hp / car.maxHp), 10);
    } else {
      panel(16, VIEW.height - 84, 220, 68);
      text('On foot', 30, VIEW.height - 52, 22, PALETTE.text, 'left', true);
      text('Press E near a car to drive', 30, VIEW.height - 28, 13, PALETTE.muted, 'left');
    }
    // Objective bar, bottom centre.
    const objective = director.objectiveText(state);
    ctx.font = font(16, true);
    const ow = ctx.measureText(objective).width + 36;
    panel((VIEW.width - ow) / 2, VIEW.height - 52, ow, 38);
    text(objective, VIEW.width / 2, VIEW.height - 26, 16, PALETTE.text, 'center', true);
    // Toast, above the objective.
    if (state.toastTimer > 0 && state.toast) {
      ctx.globalAlpha = Math.min(1, state.toastTimer);
      ctx.font = font(15, false);
      const tw = ctx.measureText(state.toast).width + 28;
      panel((VIEW.width - tw) / 2, VIEW.height - 100, tw, 32);
      text(state.toast, VIEW.width / 2, VIEW.height - 78, 15, PALETTE.gold, 'center');
      ctx.globalAlpha = 1;
    }
    // Mission banner, top centre.
    if (director.bannerTimer > 0 && director.banner) {
      ctx.globalAlpha = Math.min(1, director.bannerTimer);
      text(director.banner, VIEW.width / 2, 132, 18, PALETTE.gold, 'center', true);
      ctx.globalAlpha = 1;
    }
    drawMinimap(state);
  }

  function drawTitlePanel(state, save) {
    ctx.fillStyle = 'rgba(8, 10, 22, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const pw = 640;
    const ph = 470;
    const px = (VIEW.width - pw) / 2;
    const py = (VIEW.height - ph) / 2 - 10;
    panel(px, py, pw, ph);
    text('SOLMAR BAY', VIEW.width / 2, py + 78, 58, PALETTE.gold, 'center', true);
    text('A story of one driver, one fixer, and a city that never sleeps.', VIEW.width / 2, py + 116, 17, PALETTE.text, 'center');
    text('Rae Delgado lost her delivery job. Marisol Vega has work for her -', VIEW.width / 2, py + 146, 15, PALETTE.muted, 'center');
    text('if she can drive, dodge the law, and keep her word.', VIEW.width / 2, py + 168, 15, PALETTE.muted, 'center');
    const controls = [
      'W A S D / arrows - walk or drive',
      'E - get in / out of a car   -   Mouse - aim, click or F - fire',
      'M - mute    P - pause    Enter - start',
    ];
    for (let i = 0; i < controls.length; i += 1) {
      text(controls[i], VIEW.width / 2, py + 214 + i * 26, 16, PALETTE.text, 'center');
    }
    if (save && typeof save.missionIndex === 'number' && save.missionIndex > 0) {
      text(`Saved game: mission ${save.missionIndex + 1} of 3  -  $${save.cash} in pocket`, VIEW.width / 2, py + 316, 16, PALETTE.gold, 'center', true);
    } else if (save && typeof save.cash === 'number' && save.cash !== 40) {
      text(`Saved game: $${save.cash} in pocket`, VIEW.width / 2, py + 316, 16, PALETTE.gold, 'center', true);
    } else {
      text('A new story in Solmar Bay. The cab is parked outside your apartment.', VIEW.width / 2, py + 316, 16, PALETTE.gold, 'center');
    }
    text('Press Enter to start', VIEW.width / 2, py + 372, 24, PALETTE.text, 'center', true);
    text('Five districts. Three jobs. One way out.', VIEW.width / 2, py + 420, 14, PALETTE.muted, 'center');
  }

  function drawCenterPanel(title, lines, prompt) {
    ctx.fillStyle = 'rgba(8, 10, 22, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const pw = 560;
    const ph = 150 + lines.length * 30;
    const px = (VIEW.width - pw) / 2;
    const py = (VIEW.height - ph) / 2;
    panel(px, py, pw, ph);
    text(title, VIEW.width / 2, py + 66, 42, PALETTE.gold, 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW.width / 2, py + 112 + i * 30, 17, PALETTE.text, 'center');
    }
    text(prompt, VIEW.width / 2, py + ph - 34, 20, PALETTE.text, 'center', true);
  }

  // Paint one frame. `game` carries the world state, the director, the screen,
  // the loaded save (for the title) and the clock for the city shot.
  function draw(game) {
    const { state, director, screen } = game;
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const zoom = state.camera.zoom;
    const scale = view.scale * zoom;
    const cx = view.ox + (VIEW.width * view.scale) / 2;
    const cy = view.oy + (VIEW.height * view.scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, cx - state.camera.x * scale, cy - state.camera.y * scale);
    drawCity(state);
    drawEntities(state);

    // Back to screen space for the HUD and the panels.
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    if (screen === SCREEN_TITLE) {
      drawTitlePanel(state, game.save);
      return;
    }
    drawHud(state, director);
    if (screen === SCREEN_PAUSED) {
      drawCenterPanel('Paused', ['The city waits for no one - except now.'], 'Press P to keep driving');
    } else if (screen === SCREEN_BUSTED) {
      drawCenterPanel('Busted', ['The police took their cut. Rae is back home.', `Cash: $${state.cash}`], 'Press Enter to get back out there');
    } else if (screen === SCREEN_WRECKED) {
      drawCenterPanel('Wrecked', ['Rae woke up at home, lighter in the pocket.', `Cash: $${state.cash}`], 'Press Enter to get back out there');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
