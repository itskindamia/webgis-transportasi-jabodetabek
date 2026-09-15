v0.16 — Rekap sederhana

Fokus pembaruan publik:
- Penambahan/penyempurnaan klasifikasi KA Bandara dan KA Antarkota.
- Dukungan geometri BRT per arah (A/B) dan segmen transition, dengan UI publik Semua trase / Sesuai arah.
- Directional diversion fallback: diversion hanya menggantikan arah yang terdampak; arah lain tetap memakai REGULAR.
- Kondisi trase Saat ini / Reguler: masing-masing ditampilkan sebagai trase utama secara utuh, bukan overlay pembanding.
- Kompatibilitas dengan schema/route diversion lama tetap dipertahankan.
- Hardening data 14 September: STOP_ID/GEOM_ID/GlobalID dinormalisasi, QA navigasi disinkronkan dengan runtime, dan gap data K11/K14/K16/K17/K19 diperbaiki.

Catatan:
Revisi minor UI dan build turunan v0.16 tidak ditampilkan sebagai versi publik terpisah.
