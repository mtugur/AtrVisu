# AtrVisu Data Model Standard v3.0

## 1. Entity-First Kuralı
AtrVisu domain modelinde temel kavram `LayoutEntity`’dir. Mesh, sadece render temsilidir. Entity serialize edilebilir, aranabilir, seçilebilir, raporlanabilir ve gelecekte simüle edilebilir olmalıdır.

## 2. Temel Entity Alanları
Her entity en az şunları taşımalıdır:
- id
- type
- name
- transform: xMm, yMm, zMm, rotationDeg
- dimensions veya geometry reference
- layerId
- visibility / lock state
- metadata
- properties
- children / parent relation
- render reference / mesh instance ids

## 3. Birim ve Koordinat
- Domain birimi: mm.
- Babylon dönüşümü adapter içindedir.
- Plan X = xMm.
- Plan Y = domain yMm, Babylon Z’ye map edilir.
- Elevation = zMm, Babylon Y’ye map edilir.
- User-facing reference point: front-left-bottom.

## 4. Gelecek Uyum Alanları
Entity modeli şu alanları gelecekte taşıyacak şekilde genişletilebilir olmalıdır:
- connectors / ports
- collision envelope
- clearance envelope
- kinematics
- simulation adapter
- IO/signal ports
- BOM/report metadata
- manufacturer/model/cost/power

## 5. Standart Uyumluluk Yaklaşımı
STEP AP242 ve PMI kavramları veri modeli yönü için ilham kaynağıdır. Gerçek STEP AP242 compliance ayrı import/export modülü, test paketi ve ADR gerektirir.
