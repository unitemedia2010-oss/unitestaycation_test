import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

const cfg = {
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  bucket: process.env.ROOM_IMAGE_BUCKET || 'room-images',
  sourceDir: process.argv[2] || process.env.IMAGE_SOURCE_DIR || './room-images-upload',
  maxWidth: Number(process.env.IMAGE_MAX_WIDTH || 1800),
  quality: Number(process.env.IMAGE_QUALITY || 78)
};

if (!cfg.url || !cfg.serviceKey) {
  console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
  process.exit(1);
}

const supabase = createClient(cfg.url, cfg.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const safeSlug = (value = '') => String(value)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toUpperCase();

const isImage = (name = '') => /\.(jpe?g|png|webp|avif)$/i.test(name);

async function listDirs(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter(item => item.isDirectory()).map(item => item.name).sort();
}

async function listImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter(item => item.isFile() && isImage(item.name))
    .map(item => item.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

async function getRoomTypeByCode(code) {
  const { data, error } = await supabase
    .from('room_types')
    .select('id, code, name')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function clearOldImages(roomTypeId) {
  const { data, error } = await supabase
    .from('room_images')
    .select('id, storage_path')
    .eq('room_type_id', roomTypeId);
  if (error) throw error;
  if (!data?.length) return;
  const { error: storageDeleteError } = await supabase.storage.from(cfg.bucket).remove(data.map(row => row.storage_path).filter(Boolean));
  if (storageDeleteError) throw storageDeleteError;
  const { error: delError } = await supabase.from('room_images').delete().eq('room_type_id', roomTypeId);
  if (delError) throw delError;
}

async function convertToWebp(filePath) {
  return sharp(filePath)
    .rotate()
    .resize({ width: cfg.maxWidth, withoutEnlargement: true })
    .webp({ quality: cfg.quality, effort: 5 })
    .toBuffer();
}

async function uploadRoomFolder(root, folderName) {
  const code = safeSlug(folderName);
  const roomType = await getRoomTypeByCode(code);
  if (!roomType) {
    console.warn(`Bỏ qua ${folderName}: chưa thấy room_types.code = ${code}`);
    return { code, uploaded: 0, skipped: true };
  }

  const folderPath = path.join(root, folderName);
  const imageNames = await listImages(folderPath);
  if (!imageNames.length) {
    console.warn(`Bỏ qua ${folderName}: không có ảnh.`);
    return { code, uploaded: 0, skipped: true };
  }

  await clearOldImages(roomType.id);

  let uploaded = 0;
  for (let index = 0; index < imageNames.length; index += 1) {
    const imageName = imageNames[index];
    const inputPath = path.join(folderPath, imageName);
    const buffer = await convertToWebp(inputPath);
    const isCover = index === 0 || /cover|main|avatar/i.test(imageName);
    const order = String(index + 1).padStart(3, '0');
    const storagePath = `layouts/${code}/${order}${isCover ? '-cover' : ''}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(cfg.bucket)
      .upload(storagePath, buffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true
      });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(cfg.bucket).getPublicUrl(storagePath);
    const { error: rowError } = await supabase.from('room_images').insert({
      room_type_id: roomType.id,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      alt: roomType.name,
      sort_order: index + 1,
      is_cover: isCover,
      is_active: true
    });
    if (rowError) {
      await supabase.storage.from(cfg.bucket).remove([storagePath]);
      throw rowError;
    }

    uploaded += 1;
    console.log(`✓ ${code}: ${imageName} -> ${storagePath}`);
  }

  return { code, uploaded, skipped: false };
}

async function main() {
  const root = path.resolve(cfg.sourceDir);
  console.log(`Upload ảnh từ: ${root}`);
  console.log(`Bucket: ${cfg.bucket}`);
  const dirs = await listDirs(root);
  if (!dirs.length) throw new Error('Không thấy thư mục layout nào trong IMAGE_SOURCE_DIR.');

  const results = [];
  for (const dir of dirs) {
    try {
      results.push(await uploadRoomFolder(root, dir));
    } catch (error) {
      console.error(`✗ Lỗi ở ${dir}:`, error.message || error);
      results.push({ code: dir, uploaded: 0, error: error.message || String(error) });
    }
  }

  const total = results.reduce((sum, item) => sum + (item.uploaded || 0), 0);
  console.log(`\nHoàn tất. Tổng ảnh đã upload: ${total}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
