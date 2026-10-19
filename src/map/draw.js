// Vẽ chướng ngại. Hình tạm bằng code — sẽ thay bằng sprite trong assets/ theo docs/04-ASSET.md.
export function drawObstacle(ctx, o) {
  if (o.type === 'tree') drawTree(ctx, o.x, o.y);
  else if (o.type === 'rock') drawRock(ctx, o.x, o.y);
}

function drawTree(ctx, x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b3a22';
  ctx.fillRect(x - 2, y - 8, 4, 10);
  ctx.fillStyle = '#2f5a2a';
  ctx.beginPath(); ctx.arc(x, y - 16, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3c7234';
  ctx.beginPath(); ctx.arc(x - 3, y - 19, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4f8c40';
  ctx.beginPath(); ctx.arc(x - 4, y - 21, 3, 0, Math.PI * 2); ctx.fill();
}

function drawRock(ctx, x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6f7378';
  ctx.beginPath(); ctx.ellipse(x, y - 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8d9196';
  ctx.beginPath(); ctx.ellipse(x - 2, y - 4, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
}
