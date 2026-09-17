# Codex Sync Protocol v3.2

## Amaç
Codex, ChatGPT ve geliştirici aynı repository içi normatif standartlara bağlı çalışır. Ürün davranışı chat hafızasına veya implementer tercihine bırakılamaz.

## Zorunlu authority chain
Her görev başlamadan önce sırayla okunur:
1. `AGENTS.md`
2. `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`
3. `docs/protocols/MASTER_PLAN_SYNC_PROTOCOL.md`
4. User-facing interaction değişiyorsa `docs/standards/ATRVISU_INTERACTION_STANDARD.md`
5. İlgili diğer `docs/standards/*`
6. İlgili normatif `docs/product/*`
7. Bu protocol
8. İlgili checklist ve ADR

Çelişki varsa implementasyon durur; alt seviye kaynak üst seviye contract’ı override edemez.

Project resource, Master Plan veya chat içinde durable bir ürün kararı değiştiyse, ilgili repository contract/ADR senkronize edilmeden Codex implementasyona başlayamaz.

## Görev Öncesi zorunlu alanlar
Her görev şunları açıkça belirtir:
- Phase / product layer
- Module / bounded scope
- Relevant standards with exact section names
- Existing user-observable behavior
- Desired user-observable behavior
- Benchmark precedent for any changed interaction
- Explicit forbidden behaviors / regressions
- Existing canonical authorities that must be preserved
- Acceptance criteria
- Runtime scenarios
- Unit / contract / E2E tests
- Manual acceptance, if genuinely required
- Files allowed / files not allowed if useful
- Out-of-scope work

## User-facing interaction kuralı
Selection, move, rotate, resize, drag/drop, snapping, camera navigation, Group/multi-selection, Inspector edit, keyboard interaction, Undo/Redo, gizmo/manipulator veya viewport tool davranışı değişiyorsa:

1. `ATRVISU_INTERACTION_STANDARD.md` içinde açık contract bulunmalı.
2. Contract yoksa KOD YAZILMAZ.
3. Önce task-similar mature engineering products araştırılır.
4. Benchmark precedent + AtrVisu behavior + forbidden behavior + acceptance standarda eklenir.
5. Benchmarktan bilinçli sapma varsa ADR gerekir.
6. Sonra implementasyon başlar.

Rendering library/framework default davranışı benchmark değildir.

## Zorunlu kontroller
- Master Plan / Project source ile repo contracts arasında sync gap var mı?
- Görev Product Constitution ile uyumlu mu?
- Interaction Standard değişen davranışı gerçekten tanımlıyor mu?
- Benchmark precedent task ile gerçekten benzer mi?
- Görev standartlarla çelişiyor mu?
- Mevcut feature erişimi korunuyor mu?
- UI değişikliği scene/entity/camera state üzerinde yasak mutation yapıyor mu?
- Canonical Selection/Entity/History/Placement authority korunuyor mu?
- Console blocker var mı?
- User-reported runtime stack/path için gerçek reproduction scenario var mı?
- Feature Access Matrix güncel mi?
- PR hâlâ tek primary product objective taşıyor mu?

## Stop rule
Aşağıdakilerden biri gerçekleşirse mevcut teknik yaklaşım üzerinde yeni tuning turu yasaktır:
- aynı temel interaction üçüncü düzeltme/tuning turuna giriyorsa;
- camera-angle-specific exception, sign correction, hidden fallback, gain clamp, catch-up, hysteresis veya smoothing ekleniyorsa;
- green tests temel manuel usability problemini tekrar kaçırıyorsa;
- visual/UI işi interaction-engine redesign’a dönüyorsa;
- user-reported `Maximum update depth` veya başka blocker claimed fix sonrası sürüyorsa.

Bu durumda Codex implementasyonu durdurur ve yalnız benchmark/contract gap raporu döndürür.

## Console evidence rule
User-reported runtime error sentetik testte görülmedi diye kapatılamaz. Test rotası kullanıcı rotasına yaklaştırılır. Known blocker text collector’dan filtrelenemez veya suppress edilemez. Root-cause kabulü, gözlenen component/workflow stack’ini açıklamalıdır.

## Çalışma biçimi
- Büyük UI rewrite yerine bounded slice.
- Önce source sync + contract + acceptance scenario; sonra adapter/domain implementation; sonra UI; sonra tests/evidence.
- Mevcut çalışan feature silinmez.
- Yeni command/panel ad-hoc eklenmez; registry yönü korunur.
- Tests implementation-specific math thresholds yerine user-observable contract’ı doğrular.
- Routine local validation Codex sorumluluğudur.
- Kullanıcı exploratory QA olarak kullanılmaz; kullanıcıya yalnız final product/visual acceptance için gidilir.

## Delivery states
Her görünür davranış PR’sinde sonuçlar ayrı raporlanır:
- `Automation Green`: build/test/audit/static checks
- `Contract Verified`: normative contract + realistic runtime evidence
- `Product Accepted`: required manual visual/product acceptance

Automation Green tek başına Ready/Merge anlamına gelmez.

## Interaction PR checklist
Interaction değiştiren her PR `docs/checklists/INTERACTION_CHANGE_GATE.md` maddelerini doldurmak veya evidence/audit dokümanında birebir karşılamak zorundadır.
