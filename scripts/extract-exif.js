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
        let exif = null;
        try {
          exif = await exifr.parse(filePath, { iptc: true, xmp: true, tiff: true });
        } catch (e) { exif = null; }

        // Deep pick: search common containers (top-level, .iptc, .xmp, case-insensitive)
        const deepPick = (obj, keys) => {
          if (!obj) return null;
          const sources = [obj, obj.iptc || null, obj.IPTC || null, obj.xmp || null, obj.XMP || null];
          for (const k of keys) {
            const low = String(k).toLowerCase();
            for (const s of sources) {
              if (!s) continue;
              // direct match
              if (s[k] !== undefined && s[k] !== null && s[k] !== '') return s[k];
              // case-insensitive key lookup
              for (const prop of Object.keys(s)) {
                if (prop.toLowerCase() === low) {
                  const v = s[prop];
                  if (v !== undefined && v !== null && v !== '') return v;
                }
              }
            }
          }
          return null;
        };

        // IPTC/IIM / XMP mapping
        // Prefer Byline / dc:creator / Authors; fallback to Copyright if present
        let artist = (deepPick(exif, ['Byline', 'Artist', 'dc:creator', 'Creator', 'Author', 'Authors', 'By-line'])) || '';
        if (!artist) {
          const cpy = deepPick(exif, ['Copyright', 'CopyrightNotice']);
          if (cpy) artist = String(cpy);
        }
        const title = (deepPick(exif, ['ObjectName', 'DocumentName', 'ImageDescription', 'Title', 'XPTitle', 'dc:title'])) || '';

        // Keywords/subjects: prefer XMP dc:subject (array) or IPTC Keywords
        let collection = null;
        const kw = deepPick(exif, ['Keywords', 'keywords', 'Subject', 'subject', 'dc:subject', 'Tags', 'tags']);
        if (Array.isArray(kw) && kw.length > 0) collection = String(kw[0]);
        else if (typeof kw === 'string' && kw.trim()) {
          const parts = kw.split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
          if (parts.length) collection = parts[0];
        }
        // fallback: use parent folder name as collection
        if (!collection) {
          const parent = path.basename(path.dirname(filePath));
          if (parent && parent !== '.' ) collection = parent;
        }

        // Prefer IPTC DateCreated (+ TimeCreated) then EXIF DateTimeOriginal and others
        let creation = null;
        const iptcDate = deepPick(exif, ['DateCreated', 'dateCreated', 'Iptc4xmpCore:DateCreated']);
        const iptcTime = deepPick(exif, ['TimeCreated', 'timeCreated']);
        const exifDateTime = deepPick(exif, ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTime', 'DateAcquired']);

        const parseIptc = (d, t) => {
          try {
            if (!d) return null;
            let ds = String(d).trim();
            ds = ds.replace(/:/g, '-');
            if (/^\d{8}$/.test(ds)) ds = ds.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            if (t && String(t).trim()) {
              let ts = String(t).trim();
              ts = ts.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1:$2:$3');
              return new Date(ds + 'T' + ts);
            }
            return new Date(ds);
          } catch (e) { return null; }
        };

        const parseFlexibleDate = (val) => {
          if (!val) return null;
          if (val instanceof Date) return val;
          const s = String(val).trim();
          // Try ISO/standard parse first
          const d1 = new Date(s);
          if (!isNaN(d1)) return d1;
          // Try DD/MM/YYYY[ HH:MM[:SS]] (common Windows format)
          const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
          if (m) {
            const day = String(m[1]).padStart(2,'0');
            const month = String(m[2]).padStart(2,'0');
            const year = m[3];
            const hh = m[4] ? String(m[4]).padStart(2,'0') : '00';
            const mm = m[5] ? String(m[5]).padStart(2,'0') : '00';
            const ss = m[6] ? String(m[6]).padStart(2,'0') : '00';
            const iso = `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
            const d2 = new Date(iso);
            if (!isNaN(d2)) return d2;
          }
          // Try YYYYMMDD
          const m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
          if (m2) {
            const iso = `${m2[1]}-${m2[2]}-${m2[3]}T00:00:00`;
            const d3 = new Date(iso);
            if (!isNaN(d3)) return d3;
          }
          return null;
        };

        if (iptcDate) {
          creation = parseIptc(iptcDate, iptcTime) || parseFlexibleDate(iptcDate);
        }
        if (!creation && exifDateTime) {
          creation = parseFlexibleDate(exifDateTime);
        }

        if (!creation) {
          const st = await fs.stat(filePath);
          creation = st.mtime;
        }

        results.push({
          filename: file,
          path: path.relative(repoRoot, filePath).split(path.sep).join('/'),
          title: title || '',
          artist: artist || '',
          collection: collection || 'Sans catégorie',
          creationDate: creation.toISOString()
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
