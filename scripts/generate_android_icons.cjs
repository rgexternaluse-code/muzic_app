const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOURCE_IMAGE = 'src/assets/images/muzic_app_logo_1786456453207.jpg';
const RES_DIR = 'android/app/src/main/res';

if (!fs.existsSync(SOURCE_IMAGE)) {
  console.error('Source image not found:', SOURCE_IMAGE);
  process.exit(1);
}

const configs = [
  { folder: 'mipmap-mdpi', legacySize: 48, fgSize: 108, innerFgSize: 78 },
  { folder: 'mipmap-hdpi', legacySize: 72, fgSize: 162, innerFgSize: 116 },
  { folder: 'mipmap-xhdpi', legacySize: 96, fgSize: 216, innerFgSize: 156 },
  { folder: 'mipmap-xxhdpi', legacySize: 144, fgSize: 324, innerFgSize: 232 },
  { folder: 'mipmap-xxxhdpi', legacySize: 192, fgSize: 432, innerFgSize: 310 }
];

console.log('Generating high-resolution Android icons from:', SOURCE_IMAGE);

for (const c of configs) {
  const dir = path.join(RES_DIR, c.folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const legacyPath = path.join(dir, 'ic_launcher.png');
  const roundPath = path.join(dir, 'ic_launcher_round.png');
  const fgPath = path.join(dir, 'ic_launcher_foreground.png');

  // 1. ic_launcher.png (Legacy squircle icon with smooth rounded corners)
  const legacyRadius = Math.round(c.legacySize * 0.20);
  const legacyCmd = `convert \\( -size ${c.legacySize}x${c.legacySize} xc:none -fill white -draw "roundrectangle 0,0,${c.legacySize - 1},${c.legacySize - 1},${legacyRadius},${legacyRadius}" \\) \\
    \\( "${SOURCE_IMAGE}" -resize ${c.legacySize}x${c.legacySize}^ -gravity center -extent ${c.legacySize}x${c.legacySize} \\) \\
    -compose SrcIn -composite png32:"${legacyPath}"`;
  execSync(legacyCmd);

  // 2. ic_launcher_round.png (Circular masked icon)
  const half = Math.floor(c.legacySize / 2);
  const roundCmd = `convert \\( -size ${c.legacySize}x${c.legacySize} xc:none -fill white -draw "circle ${half},${half} ${half},0" \\) \\
    \\( "${SOURCE_IMAGE}" -resize ${c.legacySize}x${c.legacySize}^ -gravity center -extent ${c.legacySize}x${c.legacySize} \\) \\
    -compose SrcIn -composite png32:"${roundPath}"`;
  execSync(roundCmd);

  // 3. ic_launcher_foreground.png (Adaptive icon foreground, centered in 108dp canvas)
  const fgRadius = Math.round(c.innerFgSize * 0.20);
  const fgCmd = `convert -size ${c.fgSize}x${c.fgSize} xc:none \\
    \\( \\( -size ${c.innerFgSize}x${c.innerFgSize} xc:none -fill white -draw "roundrectangle 0,0,${c.innerFgSize - 1},${c.innerFgSize - 1},${fgRadius},${fgRadius}" \\) \\
       \\( "${SOURCE_IMAGE}" -resize ${c.innerFgSize}x${c.innerFgSize}^ -gravity center -extent ${c.innerFgSize}x${c.innerFgSize} \\) \\
       -compose SrcIn -composite \\) \\
    -gravity center -compose Over -composite png32:"${fgPath}"`;
  execSync(fgCmd);

  const lSize = fs.statSync(legacyPath).size;
  const rSize = fs.statSync(roundPath).size;
  const fSize = fs.statSync(fgPath).size;

  console.log(`✓ ${c.folder}: legacy ${c.legacySize}px (${lSize}B), round (${rSize}B), foreground ${c.fgSize}px (${fSize}B)`);
}

console.log('All icons generated successfully!');
