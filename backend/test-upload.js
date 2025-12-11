import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test upload directories
const dirs = [
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../uploads/vehicles'),
  path.join(__dirname, '../uploads/profiles'),
  path.join(__dirname, '../uploads/commissions'),
];

console.log('🔍 Testing upload directory structure...\n');

dirs.forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      console.log(`❌ Missing: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    } else {
      const stats = fs.statSync(dir);
      const perms = (stats.mode & parseInt('777', 8)).toString(8);
      console.log(`✅ Exists: ${dir} (permissions: ${perms})`);
    }
  } catch (error) {
    console.error(`❌ Error with ${dir}:`, error.message);
  }
});

// Test write permissions
console.log('\n🔍 Testing write permissions...\n');

dirs.forEach((dir) => {
  try {
    const testFile = path.join(dir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`✅ Write permission OK: ${dir}`);
  } catch (error) {
    console.error(`❌ Write permission denied: ${dir}`, error.message);
  }
});

console.log('\n✅ Upload directory test complete!');
