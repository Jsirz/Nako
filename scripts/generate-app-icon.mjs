import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'public', 'nako-logo.png');
const target = path.join(root, 'public', 'nako-app.ico');
// Windows picks the first ICO entry for the window, tray and taskbar: keep it high resolution.
const sizes = [256, 64, 48, 40, 32, 24, 20, 16];
const appIconBackground = '#050505';
const sourceBuffer = await readFile(source);
const { width, height } = await sharp(sourceBuffer).metadata();
const images = await Promise.all(
  sizes.map((size) =>
    sharp(sourceBuffer)
      .resize(size, size, { fit: 'contain' })
      .flatten({ background: appIconBackground })
      .png()
      .toBuffer(),
  ),
);

const directorySize = 6 + images.length * 16;
let imageOffset = directorySize;
const header = Buffer.alloc(directorySize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  const size = sizes[index];
  header.writeUInt8(size === 256 ? 0 : size, entry);
  header.writeUInt8(size === 256 ? 0 : size, entry + 1);
  header.writeUInt8(0, entry + 2);
  header.writeUInt8(0, entry + 3);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(imageOffset, entry + 12);
  imageOffset += image.length;
});

const icon = Buffer.concat([header, ...images]);
await writeFile(target, icon);
// Modern ICNS entries are PNG images; generate on either host without iconutil.
const icnsEntries = await Promise.all([[128, 'ic07'], [256, 'ic08'], [512, 'ic09'], [1024, 'ic10']]
  .map(async ([size, type]) => {
    const png = await sharp(sourceBuffer).resize(size, size, { fit: 'contain' }).png().toBuffer();
    const entry = Buffer.alloc(8);
    entry.write(type, 0, 'ascii');
    entry.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([entry, png]);
  }));
const icnsHeader = Buffer.alloc(8);
icnsHeader.write('icns', 0, 'ascii');
icnsHeader.writeUInt32BE(8 + icnsEntries.reduce((sum, entry) => sum + entry.length, 0), 4);
await writeFile(path.join(root, 'public', 'nako-app.icns'), Buffer.concat([icnsHeader, ...icnsEntries]));
await sharp(sourceBuffer).resize(22, 22, { fit: 'contain' }).png()
  .toFile(path.join(root, 'public', 'nako-tray.png'));
await Promise.all([
  ...[16, 32].map((size) => sharp(sourceBuffer).resize(size, size, { fit: 'contain' }).png()
    .toFile(path.join(root, 'public', `favicon-${size}x${size}.png`))),
  sharp(sourceBuffer).resize(180, 180, { fit: 'contain' }).png()
    .toFile(path.join(root, 'public', 'apple-touch-icon.png')),
]);
// Existing mark/lockup URLs must contain the supplied logo, not the retired vector mark.
const embeddedLogo = sourceBuffer.toString('base64');
for (const layout of ['mark', 'lockup-horizontal', 'lockup-vertical']) {
  for (const theme of ['black', 'white']) {
    await writeFile(path.join(root, 'public', `nako-${layout}-${theme}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Nako"><image width="${width}" height="${height}" href="data:image/png;base64,${embeddedLogo}"/></svg>\n`);
  }
}
process.stdout.write(`${target}\n`);
