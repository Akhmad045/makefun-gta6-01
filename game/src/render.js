// render.js — draws Solmar Bay: the sun-soaked city, the cars and the crowds, the
// police lights, the HUD with its minimap, and the title, pause and end screens.
// Everything is canvas 2D, no image files.

import { WORLD, PALETTE, CAR, PLAYER } from './config.js';
import { currentMission, currentStage, missionObjectiveText, STORY_INTRO } from './missions.js';
import { SCREENS } from './world.js';

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-CAR.length / 2 + 3, -CAR.width / 2 + 4, CAR.length, CAR.width);
  ctx.fillStyle = car.color;
  roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  roundRect(ctx, -6, -CAR.width / 2 + 4, 16, CAR.width - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, CAR.length / 2 - 10, -CAR.width / 2 + 3, 6, CAR.width - 6, 3);
  ctx.fill();
  if (car.taxi) {
    ctx.fillStyle = '#f7c948';
    ctx.fillRect(-4, -CAR.width / 2 - 5, 10, 5);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('TAXI', -4, -CAR.width / 2 - 7);
  }
  if (car.police) {
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(-CAR.length / 2 + 2, -2, CAR.length - 4, 4);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('POLICE', -14, -CAR.width / 2 + 8);
  }
  if (car.damage > 60) {
    ctx.fillStyle = 'rgba(40,40,40,0.5)';
    ctx.beginPath();
    ctx.arc(-CAR.length / 4, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCity(ctx, city, view, time) {
  const { x0, y0, x1, y1 } = view;
  // Grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Dry patches for a sun-baked look.
  ctx.fillStyle = PALETTE.grassDry;
  for (let gx = Math.floor(x0 / 420) * 420; gx < x1; gx += 420) {
    for (let gy = Math.floor(y0 / 420) * 420; gy < y1; gy += 420) {
      if (((gx * 7 + gy * 13) % 5) === 0) ctx.fillRect(gx + 40, gy + 60, 150, 110);
    }
  }
  // Parks.
  ctx.fillStyle = PALETTE.park;
  for (const park of city.parks) {
    if (park.x > x1 || park.x + park.w < x0 || park.y > y1 || park.y + park.h < y0) continue;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(park.x + 4, park.y + 4, park.w - 8, park.h - 8);
  }
  // Plaza.
  ctx.fillStyle = PALETTE.plaza;
  ctx.fillRect(1240, 1240, 120, 120);
  // Roads. Vertical roads end at the beach so none runs into the bay.
  const roadBottom = Math.min(y1, WORLD.beachY);
  ctx.fillStyle = PALETTE.road;
  for (const c of city.centers) {
    if (c > y0 - 60 && c < y1 + 60) ctx.fillRect(x0, c - WORLD.roadWidth / 2, x1 - x0, WORLD.roadWidth);
    if (c > x0 - 60 && c < x1 + 60) ctx.fillRect(c - WORLD.roadWidth / 2, y0, WORLD.roadWidth, roadBottom - y0);
  }
  // Sidewalks.
  ctx.strokeStyle = PALETTE.sidewalk;
  ctx.lineWidth = 5;
  for (const c of city.centers) {
    if (c > y0 - 60 && c < y1 + 60) {
      ctx.beginPath(); ctx.moveTo(x0, c - WORLD.roadWidth / 2); ctx.lineTo(x1, c - WORLD.roadWidth / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, c + WORLD.roadWidth / 2); ctx.lineTo(x1, c + WORLD.roadWidth / 2); ctx.stroke();
    }
    if (c > x0 - 60 && c < x1 + 60) {
      ctx.beginPath(); ctx.moveTo(c - WORLD.roadWidth / 2, y0); ctx.lineTo(c - WORLD.roadWidth / 2, roadBottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c + WORLD.roadWidth / 2, y0); ctx.lineTo(c + WORLD.roadWidth / 2, roadBottom); ctx.stroke();
    }
  }
  // Lane dashes.
  ctx.strokeStyle = PALETTE.lane;
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 18]);
  for (const c of city.centers) {
    if (c > y0 - 60 && c < y1 + 60) {
      ctx.beginPath(); ctx.moveTo(x0, c); ctx.lineTo(x1, c); ctx.stroke();
    }
    if (c > x0 - 60 && c < x1 + 60) {
      ctx.beginPath(); ctx.moveTo(c, y0); ctx.lineTo(c, roadBottom); ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  // Beach and bay.
  if (y1 > WORLD.beachY) {
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, Math.max(y0, WORLD.beachY), x1 - x0, WORLD.waterY - Math.max(y0, WORLD.beachY));
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(x0, Math.max(y0, WORLD.waterY), x1 - x0, y1 - Math.max(y0, WORLD.waterY));
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let wx = Math.floor(x0 / 130) * 130; wx < x1; wx += 130) {
      const wave = Math.sin(time * 1.4 + wx * 0.02) * 4;
      ctx.beginPath();
      ctx.moveTo(wx, WORLD.waterY + 14 + wave);
      ctx.quadraticCurveTo(wx + 30, WORLD.waterY + 6 + wave, wx + 60, WORLD.waterY + 14 + wave);
      ctx.stroke();
    }
    // The pier.
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(1270, WORLD.waterY - 10, 60, 130);
    ctx.fillStyle = '#a87f5c';
    ctx.fillRect(1278, WORLD.waterY - 10, 44, 130);
  }
  // Buildings, with a drop shadow and rooftop detail.
  for (const b of city.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 6, b.y + 7, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = PALETTE.buildingEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
    if (b.roof === 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 - 8, 20, 16);
    } else if (b.roof === 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(b.x + 4, b.y + 4, 6, b.h - 8);
    }
  }
  // Palms.
  for (const palm of city.palms) {
    if (palm.x < x0 - 30 || palm.x > x1 + 30 || palm.y < y0 - 30 || palm.y > y1 + 30) continue;
    ctx.fillStyle = '#6a4a2f';
    ctx.fillRect(palm.x - 1.5, palm.y - 2, 3, 8);
    ctx.fillStyle = '#3f8f3a';
    ctx.beginPath();
    ctx.arc(palm.x, palm.y - 4, 9 * palm.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57a84e';
    ctx.beginPath();
    ctx.arc(palm.x - 3, palm.y - 6, 5 * palm.s, 0, Math.PI * 2);
    ctx.fill();
  }
  // District labels on the ground.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  for (const d of city.districts) {
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    if (cx > x0 && cx < x1 && cy > y0 && cy < y1) ctx.fillText(d.name.toUpperCase(), cx, cy);
  }
  ctx.textAlign = 'left';
}

function drawPerson(ctx, x, y, angle, color, opts) {
  const o = opts || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (o.gun) {
    ctx.fillStyle = '#222';
    ctx.fillRect(6, -2, 10, 3);
  }
  if (o.cop) {
    ctx.fillStyle = '#1d3557';
    ctx.beginPath();
    ctx.arc(-3, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMissionMarker(ctx, world) {
  const stage = currentStage(world.mission);
  const target = world.mission.fare ? world.mission.fare.to : stage;
  if (!target) return;
  const pulse = 1 + Math.sin(world.time * 4) * 0.12;
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.strokeStyle = world.mission.fare ? '#f7c948' : '#ff5a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = world.mission.fare ? '#f7c948' : '#ff5a4a';
  ctx.beginPath();
  ctx.moveTo(0, -34 * pulse);
  ctx.lineTo(8, -18);
  ctx.lineTo(-8, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(target.place || 'DESTINATION', 0, -42);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawMinimap(ctx, world, vw, vh) {
  const size = 178;
  const mx = vw - size - 14;
  const my = 14;
  const scale = size / WORLD.size;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,24,0.78)';
  roundRect(ctx, mx - 6, my - 6, size + 12, size + 12, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(mx, my, size, size);
  ctx.clip();
  ctx.fillStyle = '#4a7a3d';
  ctx.fillRect(mx, my, size, size);
  ctx.fillStyle = '#2e8fb5';
  ctx.fillRect(mx, my + WORLD.waterY * scale, size, size);
  ctx.fillStyle = '#e8d5a4';
  ctx.fillRect(mx, my + WORLD.beachY * scale, size, (WORLD.waterY - WORLD.beachY) * scale);
  ctx.strokeStyle = PALETTE.minimapRoad;
  ctx.lineWidth = 1.5;
  for (const c of world.city.centers) {
    ctx.beginPath(); ctx.moveTo(mx, my + c * scale); ctx.lineTo(mx + size, my + c * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx + c * scale, my); ctx.lineTo(mx + c * scale, my + size); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const b of world.city.buildings) ctx.fillRect(mx + b.x * scale, my + b.y * scale, Math.max(1.5, b.w * scale), Math.max(1.5, b.h * scale));
  const stage = currentStage(world.mission);
  const target = world.mission.fare ? world.mission.fare.to : stage;
  if (target) {
    const pulse = 3 + Math.sin(world.time * 4) * 1.5;
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.arc(mx + target.x * scale, my + target.y * scale, pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of world.police) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(mx + cop.x * scale, my + cop.y * scale, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const car of world.traffic) {
    ctx.fillStyle = '#f7c948';
    ctx.fillRect(mx + car.x * scale - 1, my + car.y * scale - 1, 2.5, 2.5);
  }
  // Player arrow.
  const px = mx + world.player.x * scale;
  const py = my + world.player.y * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(world.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('SOLMAR BAY', mx + 2, my + size + 22);
}

function drawHUD(ctx, world, vw, vh) {
  const p = world.player;
  // Top-left: cash, health, ammo.
  ctx.fillStyle = 'rgba(10,16,24,0.72)';
  roundRect(ctx, 12, 12, 218, 86, 8);
  ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`$${world.cash.toLocaleString('en-US')}`, 24, 42);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`AMMO ${Math.floor(world.ammo)}`, 24, 62);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 70, 150, 10);
  ctx.fillStyle = p.health > 30 ? '#7dff8a' : '#ff5a4a';
  ctx.fillRect(24, 70, 150 * Math.max(0, p.health / PLAYER.maxHealth), 10);
  ctx.fillStyle = '#fff';
  ctx.fillText('HEALTH', 180, 79);
  // Wanted stars, top centre.
  ctx.fillStyle = 'rgba(10,16,24,0.72)';
  roundRect(ctx, vw / 2 - 130, 12, 260, 44, 8);
  ctx.fill();
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#ffd94a';
  ctx.fillText('WANTED', vw / 2 - 118, 40);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < world.wanted ? '#ffcf3f' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, vw / 2 - 48 + i * 30, 30, 11);
  }
  if (world.wanted > 0) {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(world.wanted >= 3 ? 'THE WHOLE CITY IS LOOKING FOR YOU' : 'LOSE THE COPS', vw / 2 - 118, 52);
  }
  drawMinimap(ctx, world, vw, vh);
  // Bottom-left: controls.
  ctx.fillStyle = 'rgba(10,16,24,0.6)';
  roundRect(ctx, 12, vh - 96, 330, 84, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(p.inCar ? 'W/S drive   A/D steer   SPACE handbrake' : 'WASD walk   E enter car   CLICK / F shoot', 24, vh - 70);
  ctx.fillText(p.inCar ? 'E get out   M mission brief   ESC pause' : 'E enter car   M mission brief   ESC pause', 24, vh - 50);
  ctx.fillText('Pick up taxi fares: drive slowly past a waving pedestrian', 24, vh - 30);
  // Bottom-right: speedometer while driving.
  if (p.inCar) {
    const kmh = Math.round(Math.abs(p.inCar.speed) * 0.42);
    ctx.fillStyle = 'rgba(10,16,24,0.72)';
    roundRect(ctx, vw - 150, vh - 96, 138, 84, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${kmh}`, vw - 132, vh - 52);
    ctx.font = '12px sans-serif';
    ctx.fillText('KM/H', vw - 78, vh - 52);
    if (p.inCar.damage > 60) {
      ctx.fillStyle = '#ff5a4a';
      ctx.fillText(p.inCar.damage > 160 ? 'CAR CRITICAL' : 'CAR DAMAGED', vw - 132, vh - 28);
    }
  }
  // Objective banner, bottom centre.
  const objective = missionObjectiveText(world.mission);
  ctx.fillStyle = 'rgba(10,16,24,0.72)';
  const ow = Math.min(560, ctx.measureText(objective).width + 90);
  roundRect(ctx, vw / 2 - ow / 2, vh - 52, ow, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`\u2605  ${objective}`, vw / 2, vh - 29);
  ctx.textAlign = 'left';
  // Mission-complete banner.
  if (world.mission.banner && world.time < world.mission.banner.until) {
    ctx.fillStyle = 'rgba(20,90,40,0.88)';
    roundRect(ctx, vw / 2 - 300, 90, 600, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.mission.banner.text, vw / 2, 123);
    ctx.textAlign = 'left';
  }
  // Toasts.
  ctx.font = 'bold 14px sans-serif';
  let ty = 170;
  for (const m of world.messages) {
    if (world.time > m.until) continue;
    ctx.fillStyle = 'rgba(10,16,24,0.7)';
    const w = ctx.measureText(m.text).width + 24;
    roundRect(ctx, 12, ty, w, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(m.text, 24, ty + 19);
    ty += 34;
  }
  // Clock.
  const hours = Math.floor(world.clock);
  const mins = Math.floor((world.clock - hours) * 60);
  ctx.fillStyle = 'rgba(10,16,24,0.6)';
  roundRect(ctx, vw / 2 - 40, vh - 96, 80, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, vw / 2, vh - 76);
  ctx.textAlign = 'left';
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawTitle(ctx, world, vw, vh) {
  ctx.fillStyle = '#123a5c';
  ctx.fillRect(0, 0, vw, vh);
  // Sun-soaked skyline backdrop: a painted city silhouette.
  const grad = ctx.createLinearGradient(0, 0, 0, vh);
  grad.addColorStop(0, '#ff9a3d');
  grad.addColorStop(0.55, '#e86a6a');
  grad.addColorStop(1, '#123a5c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#fff3c9';
  ctx.beginPath();
  ctx.arc(vw - 190, 130, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(18,58,92,0.85)';
  let bx = 0;
  const skyline = [150, 220, 180, 260, 200, 300, 170, 240, 280, 190, 230, 160];
  for (let i = 0; i < skyline.length; i += 1) {
    ctx.fillRect(bx, vh - 260 - skyline[i], 110, 260 + skyline[i]);
    bx += 112;
  }
  ctx.fillStyle = '#2e8fb5';
  ctx.fillRect(0, vh - 90, vw, 90);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 12; i += 1) ctx.fillRect((i * 137) % vw, vh - 70 + (i % 3) * 18, 60, 3);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SOLMAR BAY', vw / 2, 210);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffd94a';
  ctx.fillText('AN OPEN-WORLD CRIME STORY  \u2022  SUN, SAND AND STOLEN CARS', vw / 2, 250);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#fff';
  wrapText(ctx, STORY_INTRO, vw / 2, 300, 640, 22);
  const options = world.hasSave ? ['CONTINUE  —  pick up where you left off', 'NEW GAME  —  start Rae\u2019s story over'] : ['NEW GAME  —  start Rae\u2019s story'];
  options.forEach((opt, i) => {
    const y = 470 + i * 54;
    ctx.fillStyle = world.titleChoice === i ? '#ffd94a' : 'rgba(10,16,24,0.65)';
    roundRect(ctx, vw / 2 - 330, y - 30, 660, 44, 8);
    ctx.fill();
    ctx.fillStyle = world.titleChoice === i ? '#111' : '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(opt, vw / 2, y - 2);
  });
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('ENTER to start   \u2022   WASD move   \u2022   E enter a car   \u2022   CLICK shoot   \u2022   M mission brief   \u2022   ESC pause', vw / 2, 610);
  ctx.fillText('Progress saves automatically after every mission. Steal cars, lose the cops, run the fares.', vw / 2, 636);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, cx, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, cy);
}

function drawPause(ctx, world, vw, vh) {
  ctx.fillStyle = 'rgba(8,12,20,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', vw / 2, vh / 2 - 60);
  ctx.font = '16px sans-serif';
  ctx.fillText(`Cash $${world.cash}  \u2022  Missions done: ${world.mission.done.length} of 3  \u2022  Cars stolen: ${world.stats.carsStolen}  \u2022  Fares: ${world.stats.fares}`, vw / 2, vh / 2 - 20);
  ctx.fillText('ESC resume   \u2022   ENTER save and return to the title screen', vw / 2, vh / 2 + 16);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, world, vw, vh, busted) {
  ctx.fillStyle = busted ? 'rgba(20,30,90,0.82)' : 'rgba(90,10,10,0.82)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(busted ? 'BUSTED' : 'WASTED', vw / 2, vh / 2 - 40);
  ctx.font = '17px sans-serif';
  ctx.fillText(
    busted
      ? 'The Solmar Bay police took you in. Bail cost you $150 — Marisol is not happy.'
      : 'Rae went down in the streets of Solmar Bay. The city keeps moving without her.',
    vw / 2, vh / 2 + 4,
  );
  ctx.fillText('Press ENTER to return to the title screen', vw / 2, vh / 2 + 40);
  ctx.textAlign = 'left';
}

export function renderWorld(ctx, world, vw, vh) {
  world.viewW = vw;
  world.viewH = vh;
  ctx.clearRect(0, 0, vw, vh);
  if (world.screen === SCREENS.TITLE) {
    drawTitle(ctx, world, vw, vh);
    return;
  }
  const cam = world.camera;
  const view = {
    x0: cam.x - vw / 2 - 60,
    y0: cam.y - vh / 2 - 60,
    x1: cam.x + vw / 2 + 60,
    y1: cam.y + vh / 2 + 60,
  };
  ctx.save();
  ctx.translate(vw / 2 - cam.x, vh / 2 - cam.y);
  drawCity(ctx, world.city, view, world.time);
  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,20,0.35)';
  ctx.lineWidth = 5;
  for (const skid of world.skids) {
    if (skid.x < view.x0 || skid.x > view.x1 || skid.y < view.y0 || skid.y > view.y1) continue;
    ctx.beginPath();
    ctx.moveTo(skid.x - Math.cos(skid.angle) * 14, skid.y - Math.sin(skid.angle) * 14);
    ctx.lineTo(skid.x + Math.cos(skid.angle) * 14, skid.y + Math.sin(skid.angle) * 14);
    ctx.stroke();
  }
  drawMissionMarker(ctx, world);
  for (const car of world.traffic) drawCarShape(ctx, car);
  for (const car of world.cars) drawCarShape(ctx, car);
  for (const cop of world.police) {
    drawCarShape(ctx, cop);
    // Flashing light bar.
    const red = Math.sin(world.time * 10 + cop.sirenPhase) > 0;
    ctx.fillStyle = red ? '#ff2a2a' : '#2a6bff';
    ctx.beginPath();
    ctx.arc(cop.x - 6, cop.y - 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = red ? '#2a6bff' : '#ff2a2a';
    ctx.beginPath();
    ctx.arc(cop.x + 6, cop.y - 10, 5, 0, Math.PI * 2);
    ctx.fill();
    if (red) {
      ctx.fillStyle = 'rgba(255,42,42,0.12)';
      ctx.beginPath();
      ctx.arc(cop.x, cop.y, 46, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const ped of world.peds) {
    if (!ped.walking) continue;
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, {});
    if (ped.fare) {
      ctx.fillStyle = '#f7c948';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', ped.x, ped.y - 16);
      ctx.textAlign = 'left';
    }
  }
  for (const r of world.rivals) {
    if (r.health <= 0) continue;
    drawPerson(ctx, r.x, r.y, Math.atan2(world.player.y - r.y, world.player.x - r.x), '#8a2f2f', { gun: true });
  }
  for (const officer of world.policeFoot) {
    drawPerson(ctx, officer.x, officer.y, officer.angle, '#1d3557', { cop: true });
  }
  // Bullets.
  ctx.fillStyle = '#ffd94a';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff5a4a';
  for (const b of world.rivalBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Particles.
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The player on foot (not drawn when driving — the car is the player).
  const p = world.player;
  if (!p.inCar) {
    drawPerson(ctx, p.x, p.y, p.angle, PALETTE.playerShirt, { gun: true });
    // Aim line.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.aimAngle) * 14, p.y + Math.sin(p.aimAngle) * 14);
    ctx.lineTo(p.x + Math.cos(p.aimAngle) * 34, p.y + Math.sin(p.aimAngle) * 34);
    ctx.stroke();
  }
  ctx.restore();

  drawHUD(ctx, world, vw, vh);
  if (world.screen === SCREENS.PAUSE) drawPause(ctx, world, vw, vh);
  if (world.screen === SCREENS.BUSTED) drawEnd(ctx, world, vw, vh, true);
  if (world.screen === SCREENS.WASTED) drawEnd(ctx, world, vw, vh, false);
}
