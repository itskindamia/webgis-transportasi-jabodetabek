# Pemberitahuan pihak ketiga

Dokumen ini melengkapi atribusi yang tampil di dalam WebGIS. Merek dan logo
operator merupakan milik masing-masing pemegang hak dan hanya dipakai untuk
identifikasi informasi transportasi. WebGIS tidak menyatakan afiliasi atau
dukungan dari operator terkait.

## OpenStreetMap

- Data dan peta: © OpenStreetMap contributors.
- Hak cipta dan lisensi data: https://www.openstreetmap.org/copyright
- Lisensi ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/
- Kebijakan tile: https://operations.osmfoundation.org/policies/tiles/
- Kebijakan Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- Kebijakan privasi OSMF: https://osmfoundation.org/wiki/Privacy_Policy

## Leaflet

Leaflet 1.9.4 tersedia di bawah lisensi BSD 2-Clause.

- Proyek: https://leafletjs.com/
- Lisensi: https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE

## Tabler UI, Bootstrap, dan Tabler Icons — prototipe layout

- Komponen CSS Tabler UI **1.4.0**, lisensi MIT: https://github.com/tabler/tabler
- Bootstrap **5.3.7**, dependensi Sass Tabler, lisensi MIT: https://getbootstrap.com/
- Subset 17 ikon Tabler Icons **3.35.0**, lisensi MIT: https://github.com/tabler/tabler-icons
- Salinan lisensi berada di `assets/licenses/`. CSS komponen dipilih melalui
  `css/tabler-components.scss`; bundle JavaScript Tabler tidak dimuat.

## Esri basemaps

Basemap Light Gray Canvas dan World Imagery dimuat dari layanan ArcGIS Online.
Atribusi penyedia data yang dilaporkan oleh masing-masing service ditampilkan
secara dinamis pada kontrol atribusi peta.

- Esri and data attribution: https://www.esri.com/en-us/legal/terms/data-attributions
- ArcGIS Online terms of use: https://www.esri.com/en-us/legal/terms/full-master-agreement

## PT Sans

PT Sans adalah font utama aplikasi, dengan bobot Regular 400 dan Bold 700 serta
fallback `"PT Sans", Arial, sans-serif`. Dua berkas WOFF2 Latin disajikan lokal
dari `assets/fonts/` melalui satu stylesheet untuk seluruh aplikasi, termasuk
popup/label Leaflet; tidak ada stylesheet/font Google yang diminta saat runtime.
Tulisan yang menjadi bagian dari gambar tile basemap tidak diubah. Font
didistribusikan menurut SIL Open Font License 1.1; salinannya berada di
`assets/fonts/OFL.txt`. Provenance dan hash berkas ada di `assets/fonts/README.md`.

- Informasi font: https://fonts.google.com/specimen/PT+Sans
- SIL Open Font License: https://openfontlicense.org/

## Aset visual

- Sebagian ikon lin berasal dari **Transport for Jakarta – FDTJ** dan digunakan
  berdasarkan Creative Commons Attribution-ShareAlike 4.0:
  https://creativecommons.org/licenses/by-sa/4.0/
- Ikon LRT Jakarta Lin S merupakan karya **Vulphere** berdasarkan karya
  Transport for Jakarta – FDTJ, dengan atribusi yang ditampilkan di dalam
  aplikasi.
- Ikon terminal: **Terminal icons created by rcherem – Flaticon**:
  https://www.flaticon.com/free-icons/terminal

Daftar aset yang dikreditkan secara rinci tersedia pada dialog **Informasi &
Sumber → Kredit aset visual** di dalam aplikasi.
