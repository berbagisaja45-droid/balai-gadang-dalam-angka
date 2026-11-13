# Balai Gadang Dalam Angka

Portal statistik untuk Kelurahan Balai Gadang, Kecamatan Koto Tangah, Kota Padang.

## Isi paket
- `index.html` — dashboard web responsif.
- `config.js` — konfigurasi URL dan anon/publishable key Supabase.
- `supabase/schema.sql` — rancangan skema database, RLS, dan view agregat publik.

## Menjalankan lokal
Buka `index.html` melalui local web server (misalnya VS Code Live Server). Isi `config.js` setelah project Supabase baru dibuat.

## Menyiapkan Supabase
1. Buat project baru bernama `balai-gadang-dalam-angka`.
2. Buka SQL Editor, jalankan `supabase/schema.sql`.
3. Atur Authentication dan buat akun petugas/admin melalui proses aman.
4. Tambahkan URL Project dan anon/publishable key ke `config.js`.
5. Jangan pernah memasukkan `service_role` key ke file frontend atau GitHub.
6. Audit RLS sebelum membuka akses publik. View publik hanya boleh menampilkan data berstatus `verified`.

## Deploy GitHub Pages
Setelah repository `balai-gadang-dalam-angka` dibuat:
1. Upload seluruh isi folder ini ke root repository.
2. Buka Settings → Pages.
3. Pilih Deploy from a branch → `main` → `/ (root)`.
4. Simpan. Situs akan tersedia pada URL GitHub Pages repository tersebut.

## Integrasi aplikasi Android Balai Gadang Carbon
Aplikasi Android menggunakan Supabase project terpisah ini hanya jika memang disepakati pada tahap integrasi. Gunakan URL project dan anon/publishable key yang sama pada Android; semua operasi tetap tunduk pada RLS dan role. Jangan menyalin service-role key ke APK.
Modul lingkungan dapat mengirim data yang sudah disetujui ke tabel `lingkungan_tahunan` atau tabel inventaris lanjutan yang akan dibuat setelah struktur data Android diperiksa.

## Prinsip data
- Angka dashboard kosong sampai data resmi dimasukkan.
- Jangan memasukkan data simulasi seolah-olah data resmi.
- Data identitas pemilik/penghuni kost tidak dipublikasikan.
- Setiap indikator harus memiliki tahun, sumber, tanggal data, dan status verifikasi.
