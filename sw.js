/* Service worker: ทำให้เปิดแอปได้เร็วและเปิดหน้าเว็บได้แม้ออฟไลน์ (ข้อมูลงานยังดึงจาก Google Sheets ตามปกติ)
   เปลี่ยนเลข CACHE ทุกครั้งที่อยากบังคับให้ทุกเครื่องล้างแคชเก่า */
const CACHE = 'ct-v4';
const SHELL = ['./', 'index.html', 'storage.js', 'storage-local.js', 'sheets-config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;                                    // เขียนข้อมูล (POST) ไม่แตะ
  if (u.hostname === 'script.google.com' || u.hostname.endsWith('googleusercontent.com')) return;   // ข้อมูลทีมต้องสดเสมอ ไม่แคช
  if (u.origin === location.origin) {
    // ไฟล์ของเว็บ: ลองเน็ตก่อนเพื่อให้ได้เวอร์ชันใหม่ ถ้าไม่มีเน็ตใช้ของที่แคชไว้
    e.respondWith(fetch(r).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
  } else if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) {
    // ไลบรารี PDF และฟอนต์: ใช้ของแคชก่อน ไม่มีค่อยโหลด
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    })));
  }
});
