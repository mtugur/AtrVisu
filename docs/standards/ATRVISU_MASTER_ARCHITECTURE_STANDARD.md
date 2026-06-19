# AtrVisu Master Architecture Standard v3.0

## 1. Ürün Tanımı
AtrVisu dört katmanı hedefleyen endüstriyel mühendislik platformudur:

1. **Katman 1 — Hız / Teklif Aracı**: CAD bilmeyen satış ve ön-satış kullanıcıları için hızlı 3D layout, sunum ve çıktı üretimi.
2. **Katman 2 — Mühendislik Simülasyonu**: throughput, darboğaz, queue/flow ve erken kontrol doğrulama temeli.
3. **Katman 3 — Orta Seviye Endüstriyel Platform**: Visual Components benzeri eCatalog, smart components, raporlama, simülasyon ve PLC/bridge altyapısı.
4. **Katman 4 — Kurumsal Dijital İkiz**: Tecnomatix benzeri offline robot/program doğrulama, virtual commissioning, enterprise digital thread.

Yakın hedef Katman 1’de güçlü ve stabil olmaktır. Mimari, Katman 2-4’ü engellemeyecek şekilde kurulacaktır.

## 2. Kilit Mimari Yasalar
1. **Entity-first**: Uygulama mesh değil entity yönetir.
2. **Contract-first**: Kalıcı sözleşmeler olmadan büyük UI/feature yazılmaz.
3. **Command-first**: Menü, toolbar, shortcut, context menu aynı command tanımından beslenir.
4. **Panel-governed UI**: Panel erişimi merkezi kayıt üzerinden yönetilir.
5. **Viewport isolation**: Panel boyutu/kapanması sahne verisini, kamerayı, koordinatı veya drag sonucunu değiştiremez.
6. **Feature access guarantee**: UI refactor, mevcut özellikleri gizleyemez veya erişilemez yapamaz.
7. **No-red-console**: Console kırmızı hata branch kapatmaya engeldir.
8. **Progressive simulation**: İlk simülasyon deterministik TypeScript/DES olabilir; Wasm yüksek-fidelity fizik/kinematik için saklanır.
9. **Standards-inspired, test-driven compliance**: STEP AP242, ISO 23247, OPC UA gibi standartlar mimari yön verir; gerçek uyumluluk ayrı test ve ADR ister.
10. **ADR governance**: Koordinat, birim, file format, command, panel, simülasyon ve render-engine kararları ADR ister.

## 3. Yasak Anti-Patternler
- `App.tsx` içinde kontrolsüz shell, panel, scene ve business logic yığılması.
- Right inspector’ın tüm araçların deposuna dönüşmesi.
- Komutların lokal ad-hoc handler ile bağlanması.
- UI değişikliğinin Collision, Viewpoints, Simulation, Precision Placement, Civil, Layers, Groups veya başka mevcut özellikleri gizlemesi.
- Panel collapse’in kamera auto-fit, object scaling, coordinate mutation, selection reset veya drag drift üretmesi.
- Platform contract’ları olmadan yeniden büyük app-shell denemesi.
