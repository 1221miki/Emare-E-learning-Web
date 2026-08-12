const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });
const cloudinary = require('../config/cloudinary');

const SOURCE_DIR = path.join(__dirname, '..', 'public', 'uploads');
const OUTPUT_FILE = path.join(__dirname, 'public_uploads_cloudinary_map.json');
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

const walkDirectory = async (directory) => {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDirectory(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
};

const isValidImage = (filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    if (!buf || buf.length < 10) return false;
    const hex = buf.slice(0, 8).toString('hex').toLowerCase();
    // PNG header: 89504e470d0a1a0a
    if (hex.startsWith('89504e47')) return true;
    // JPEG header: ffd8ff
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    // GIF header: GIF8
    if (hex.startsWith('47494638')) return true;
    return false;
  } catch (err) {
    return false;
  }
};

const uploadFileToCloudinary = async (filePath) => {
  const relativePath = path.relative(SOURCE_DIR, filePath);
  const folderName = path.dirname(relativePath) === '.'
    ? 'emare_elms/public_uploads'
    : `emare_elms/public_uploads/${path.dirname(relativePath).replace(/\\/g, '/')}`;

  const options = {
    folder: folderName,
    use_filename: true,
    unique_filename: false,
    overwrite: false,
  };

  return cloudinary.uploader.upload(filePath, options);
};

(async () => {
  try {
    if (!fs.existsSync(SOURCE_DIR)) {
      throw new Error(`Source directory not found: ${SOURCE_DIR}`);
    }

    console.log(`Scanning files in ${SOURCE_DIR}`);
    const imageFiles = await walkDirectory(SOURCE_DIR);

    if (!imageFiles.length) {
      console.log('No JPG/PNG files found to migrate.');
      return;
    }

    const mapping = [];
    for (const filePath of imageFiles) {
      const relativePath = path.relative(SOURCE_DIR, filePath);
      console.log(`Uploading ${relativePath} ...`);
      if (!isValidImage(filePath)) {
        console.warn(`  Skipping ${relativePath}: not a valid image or too small.`);
        continue;
      }
      try {
        const result = await uploadFileToCloudinary(filePath);
        const record = {
          localPath: relativePath,
          absolutePath: filePath,
          secure_url: result.secure_url,
          public_id: result.public_id,
          folder: result.folder,
          format: result.format,
          resource_type: result.resource_type,
        };
        mapping.push(record);
        await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(mapping, null, 2), 'utf8');
        console.log(`  → Uploaded: ${record.secure_url}`);
      } catch (err) {
        console.error(`  ✕ Failed to upload ${relativePath}:`, err.message || err);
      }
    }

    console.log(`Migration complete. Saved mapping to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
})();
