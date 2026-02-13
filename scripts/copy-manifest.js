
import { copyFileSync } from 'fs';
import { resolve } from 'path';

try {
    const root = process.cwd();
    const src = resolve(root, 'manifest.json');
    const dest = resolve(root, 'dist/manifest.json');

    copyFileSync(src, dest);
    console.log('✅ manifest.json copied to dist/');
} catch (err) {
    console.error('❌ Failed to copy manifest.json:', err);
    process.exit(1);
}
