-- Balai Gadang Dalam Angka
-- Jalankan melalui Supabase SQL Editor pada project BARU.
-- Tidak ada data penduduk/kost fiktif yang dimasukkan oleh skrip ini.

create extension if not exists pgcrypto;

create table if not exists public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','data_entry','verifikator','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.demografi_tahunan (
  id uuid primary key default gen_random_uuid(),
  tahun int not null check (tahun between 2000 and 2100),
  jumlah_penduduk int check (jumlah_penduduk >= 0),
  jumlah_kk int check (jumlah_kk >= 0),
  laki_laki int check (laki_laki >= 0),
  perempuan int check (perempuan >= 0),
  usia_0_14 int check (usia_0_14 >= 0),
  usia_15_64 int check (usia_15_64 >= 0),
  usia_65_plus int check (usia_65_plus >= 0),
  sumber text,
  tanggal_data date,
  status_verifikasi text not null default 'draft' check (status_verifikasi in ('draft','review','verified','rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(tahun)
);

create table if not exists public.rumah_kost (
  id uuid primary key default gen_random_uuid(),
  kode_kost text not null unique,
  kelompok_lokasi text,
  latitude double precision,
  longitude double precision,
  jumlah_kamar int not null default 0 check (jumlah_kamar >= 0),
  kamar_terisi int not null default 0 check (kamar_terisi >= 0 and kamar_terisi <= jumlah_kamar),
  tarif_bulanan_median numeric(14,2) check (tarif_bulanan_median >= 0),
  fasilitas text[] not null default '{}',
  tahun int not null,
  status_verifikasi text not null default 'draft' check (status_verifikasi in ('draft','review','verified','rejected')),
  created_at timestamptz not null default now()
);
-- Identitas pemilik/penghuni dan alamat lengkap tidak disimpan pada tabel publik ini.

create table if not exists public.umkm (
  id uuid primary key default gen_random_uuid(),
  kode_usaha text not null unique,
  kategori text not null,
  kelompok_lokasi text,
  latitude double precision,
  longitude double precision,
  tahun int not null,
  status_verifikasi text not null default 'draft' check (status_verifikasi in ('draft','review','verified','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.fasilitas_umum (
  id uuid primary key default gen_random_uuid(),
  nama_publik text not null,
  kategori text not null,
  kelompok_lokasi text,
  latitude double precision,
  longitude double precision,
  tahun int not null,
  status_verifikasi text not null default 'draft' check (status_verifikasi in ('draft','review','verified','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.lingkungan_tahunan (
  id uuid primary key default gen_random_uuid(),
  tahun int not null unique,
  tutupan_pohon_ha numeric(14,3),
  agroforestri_ha numeric(14,3),
  stok_karbon_tco2e numeric(16,3),
  jumlah_petak int,
  sumber text,
  tanggal_data date,
  status_verifikasi text not null default 'draft' check (status_verifikasi in ('draft','review','verified','rejected'))
);

create or replace function public.current_user_role()
returns text language sql stable security definer
set search_path = public
as $$
  select role from public.app_profiles where id = auth.uid()
$$;

alter table public.app_profiles enable row level security;
alter table public.demografi_tahunan enable row level security;
alter table public.rumah_kost enable row level security;
alter table public.umkm enable row level security;
alter table public.fasilitas_umum enable row level security;
alter table public.lingkungan_tahunan enable row level security;

-- Pengguna hanya dapat membaca profilnya sendiri; admin mengelola profil melalui jalur tepercaya.
create policy "profile read self" on public.app_profiles for select to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');

-- Data mentah hanya dapat dibaca petugas terautentikasi; perubahan dibatasi pada peran petugas.
create policy "staff read demografi" on public.demografi_tahunan for select to authenticated
using (public.current_user_role() in ('admin','data_entry','verifikator'));
create policy "staff write demografi" on public.demografi_tahunan for all to authenticated
using (public.current_user_role() in ('admin','data_entry','verifikator'))
with check (public.current_user_role() in ('admin','data_entry','verifikator'));

create policy "staff manage kost" on public.rumah_kost for all to authenticated
using (public.current_user_role() in ('admin','data_entry','verifikator'))
with check (public.current_user_role() in ('admin','data_entry','verifikator'));
create policy "staff manage umkm" on public.umkm for all to authenticated
using (public.current_user_role() in ('admin','data_entry','verifikator'))
with check (public.current_user_role() in ('admin','data_entry','verifikator'));
create policy "staff manage fasilitas" on public.fasilitas_umum for all to authenticated
using (public.current_user_role() in ('admin','data_entry','verifikator'))
with check (public.current_user_role() in ('admin','data_entry','verifikator'));
create policy "staff manage lingkungan" on public.lingkungan_tahunan for all to authenticated
using (public.current_user_role() in ('admin','data_entry','verifikator'))
with check (public.current_user_role() in ('admin','data_entry','verifikator'));

-- View publik hanya memuat agregat dari data berstatus verified.
create or replace view public.v_demografi_publik with (security_invoker = false) as
select tahun, jumlah_penduduk, jumlah_kk, laki_laki, perempuan,
       usia_0_14, usia_15_64, usia_65_plus
from public.demografi_tahunan where status_verifikasi = 'verified';

create or replace view public.v_kost_ringkasan_publik with (security_invoker = false) as
select tahun, count(*)::int as jumlah_kost,
       coalesce(sum(jumlah_kamar),0)::int as kamar_tersedia,
       coalesce(sum(kamar_terisi),0)::int as kamar_terisi,
       (coalesce(sum(jumlah_kamar),0)-coalesce(sum(kamar_terisi),0))::int as kamar_kosong,
       case when sum(jumlah_kamar)>0
            then round(100.0*sum(kamar_terisi)/sum(jumlah_kamar),2) else null end as okupansi_persen,
       percentile_cont(0.5) within group (order by tarif_bulanan_median) as median_tarif
from public.rumah_kost where status_verifikasi='verified' group by tahun;

create or replace view public.v_ekonomi_publik with (security_invoker = false) as
select tahun, count(*)::int as jumlah_umkm, count(distinct kategori)::int as jumlah_kategori,
       null::int as penduduk_bekerja
from public.umkm where status_verifikasi='verified' group by tahun;

create or replace view public.v_fasilitas_publik with (security_invoker = false) as
select tahun, count(*)::int as jumlah_fasilitas
from public.fasilitas_umum where status_verifikasi='verified' group by tahun;

create or replace view public.v_lingkungan_publik with (security_invoker = false) as
select tahun, tutupan_pohon_ha, agroforestri_ha, stok_karbon_tco2e, jumlah_petak
from public.lingkungan_tahunan where status_verifikasi='verified';

-- Catatan:
-- 1) Berikan SELECT pada view/tabel yang memang boleh diakses publik setelah audit kebijakan.
-- 2) Jangan aktifkan akses anon ke tabel mentah berisi titik sensitif. Publikasikan agregat/koordinat umum saja.
-- 3) Buat admin pertama melalui proses tepercaya; jangan mengizinkan pengguna menaikkan role sendiri.


-- Hak akses API. View agregat boleh dibaca publik; tabel mentah tetap dibatasi RLS.
grant select on public.v_demografi_publik to anon, authenticated;
grant select on public.v_kost_ringkasan_publik to anon, authenticated;
grant select on public.v_ekonomi_publik to anon, authenticated;
grant select on public.v_fasilitas_publik to anon, authenticated;
grant select on public.v_lingkungan_publik to anon, authenticated;

grant select, insert, update, delete on public.demografi_tahunan to authenticated;
grant select, insert, update, delete on public.rumah_kost to authenticated;
grant select, insert, update, delete on public.umkm to authenticated;
grant select, insert, update, delete on public.fasilitas_umum to authenticated;
grant select, insert, update, delete on public.lingkungan_tahunan to authenticated;
grant select on public.app_profiles to authenticated;
