const fs = require('fs').promises;
const path = require('path');
const exifr = require('exifr');

(async () => {
  const repoRoot = path.join(__dirname, '..');
  const imagesDir = path.join(repoRoot, 'images');
  const outDir = path.join(repoRoot, 'data');
  const outFile = path.join(outDir, 'images.json');
  await fs.mkdir(outDir, { recursive: true });

  try {
    const ents = await fs.readdir(imagesDir, { withFileTypes: true });
    const files = ents
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(n => /\.(jpe?g|tiff?|png|webp|gif|svg)$/i.test(n));

    const results = [];

    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      try {
        const exif = await exifr.parse(filePath).catch(() => null);

        const title = (exif && (exif.ImageDescription || exif.imageDescription || exif.Title || exif.title || exif.XPTitle || exif.ObjectName)) || '';
        const artist = (exif && (exif.Artist || exif.artist || exif.Byline)) || '';
        const dateVal = (exif && (exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate || exif.DateCreated)) || null;

        let date = null;
        if (dateVal instanceof Date) date = dateVal;
        else if (typeof dateVal === 'string') {
          const d = new Date(dateVal);
          if (!isNaN(d)) date = d;
        }

        if (!date) {
          const st = await fs.stat(filePath);
          date = st.mtime;
        }

        results.push({
          filename: file,
          path: path.relative(repoRoot, filePath).split(path.sep).join('/'),
          title: title || '',
          artist: artist || '',
          creationDate: date.toISOString()
        });
      } catch (err) {
        // fallback to file stats
        const st = await fs.stat(filePath);
        results.push({
          filename: file,
          path: path.relative(repoRoot, filePath).split(path.sep).join('/'),
          title: '',
          artist: '',
          creationDate: st.mtime.toISOString()
        });
      }
    }

    results.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));

    await fs.writeFile(outFile, JSON.stringify(results, null, 2), 'utf8');
    console.log('Wrote', outFile);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
