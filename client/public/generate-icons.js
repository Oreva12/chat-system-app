// Run: node generate-icons.js
const { createCanvas } = require("canvas");
const fs = require("fs");

const sizes = [192, 512];

sizes.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0D0F14";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Chat bubble
  ctx.fillStyle = "#4F8EF7";
  const s = size / 32;
  ctx.beginPath();
  ctx.roundRect(s*6, s*6, s*20, s*16, s*2);
  ctx.fill();

  // Dots
  ctx.fillStyle = "white";
  [11, 16, 21].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x*s, 14*s, 1.5*s, 0, Math.PI*2);
    ctx.fill();
  });

  fs.writeFileSync(`icons/icon-${size}.png`, canvas.toBuffer("image/png"));
  console.log(`Generated icon-${size}.png`);
});