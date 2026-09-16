# Codex Sync Protocol v4.0

## Amaç
Codex, ChatGPT ve geliştirici aynı repository authority zincirine bağlı çalışır. Standartlar repo içinde tutulur; chat veya Project hafızası tek başına implementasyon authority'si değildir.

## Zorunlu Authority Okuma Sırası
Her görev başlamadan önce:
1. `AGENTS.md`
2. `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`
3. Kullanıcı etkileşimi varsa `docs/standards/ATRVISU_INTERACTION_STANDARD.md`
4. İlgili diğer `docs/standards/*`
5. İlgili `docs/product/*`
6. Bu protokol
7. İlgili checklist ve ADR'ler

Çelişki varsa kod yazılmaz. `ATRVISU_PRODUCT_CONSTITUTION.md` içindeki conflict-resolution sırası uygulanır.

## Görev Öncesi Zorunlu Paket
Her görev aşağıdaki alanları açıkça belirtir:

- **Phase / Product layer**
- **Module / bounded scope**
- **Normative sources** — exact repository paths/sections
- **Existing behavior**
- **Desired user-visible behavior**
- **Constraints / forbidden behavior**
- **Existing platform authorities to preserve**
- **Acceptance criteria**
- **Focused tests**
- **Complete gate expectation**
- **Files allowed / files not allowed** when scope risk exists
- **Known runtime evidence / reported failure** when applicable

Kullanıcı etkileşimi değişiyorsa bunlara ek olarak aşağıdaki alanlar zorunludur:

- **Interaction class**
- **Benchmark precedent** — official product/document references
- **Interaction Standard section**
- **Degrees of freedom**
- **Visible feedback**
- **Failure behavior**
- **History/transaction behavior**
- **Deviation ADR** if AtrVisu intentionally differs from benchmark/standard
- **Manual acceptance boundary**

Bu interaction alanlarından biri eksikse Codex implementasyona başlamaz; eksik contract/decision'ı raporlar.

## No-Invention Rule
Codex aşağıdakileri kendi başına icat edemez:

- move/rotate/select/snap/camera semantics;
- mouse input meaning;
- camera-angle-dependent fallbacks;
- hidden coordinate-frame switching;
- new local selection/history/placement authority;
- framework-default gizmo behavior as final product behavior;
- new UI surface merely because there is available space.

Bir davranış standartta yoksa önce contract/ADR gerekir.

## Benchmark Rule
User-facing interaction için `ATRVISU_INTERACTION_STANDARD.md` içindeki canonical benchmark family kullanılır.

- En yakın görev-domain benchmark'ı önceliklidir.
- Tek bir benchmark cherry-pick edilerek daha yakın bir benchmark'ın çelişkili davranışı göz ardı edilemez.
- Benchmarklar ayrışıyorsa Codex seçim yapmaz; decision/ADR ister.
- Framework kısıtı benchmark-semantic davranışı sağlayamıyorsa Codex hidden heuristic üretmez; limitation/blocker raporlar.

## Scope Drift Rule
Bir PR yeni bir normative domain'e girdiğinde otomatik olarak genişletilmez.

Örnek: iconography PR'ı drag-engine redesign'a dönüşemez.

Yeni domain gerektiğinde Codex:
1. mevcut package'i durdurur;
2. yeni contract/scope ihtiyacını belirtir;
3. owner/architect kararından sonra re-scope veya ayrı package uygular.

## Zorunlu Kontroller
- Görev Product Constitution ile çelişiyor mu?
- Interaction change varsa Interaction Standard açık ve yeterli mi?
- Benchmark precedent doğru interaction class'tan mı?
- Mevcut feature erişimi korunuyor mu?
- UI değişikliği scene/entity/camera state mutasyonu yapıyor mu?
- Hidden heuristic/fallback kullanıcı input anlamını değiştiriyor mu?
- Console red error veya repeated React warning var mı?
- Kullanıcının gerçek runtime kanıtı otomatik testten farklı mı?
- Feature Access Matrix güncel mi?
- PR declared scope dışındaki bir contract domain'e girdi mi?

## Çalışma Biçimi
- Büyük UI rewrite yerine bounded slice.
- Önce contract/test expectation, sonra adapter/authority integration, sonra UI/implementation.
- Mevcut çalışan feature silinmez.
- Yeni command/panel ad-hoc eklenmez; registry yönü korunur.
- Local algorithm ürün davranışını tanımlamaz; frozen behavior'ı uygular.
- Threshold tuning, undefined interaction contract'ın yerine kullanılamaz.
- Gerçek runtime blocker varken warning suppression veya collector bypass yasaktır.

## Test İlkesi
Testler implementasyonu haklı çıkarmak için yazılmaz. Önceden dondurulmuş user-visible contract'ı doğrular.

Interaction değişikliklerinde testler:
- semantics/DOF;
- camera independence;
- atomic history;
- snap behavior;
- locked/blocked behavior;
- long-lived repeated interaction;
- Inspector/numeric synchronization;
- real console collection;
- persisted/reload state
kapsamını ilgili contract gerektirdiği ölçüde içerir.

Helper-level matematik testleri ek kanıttır; product acceptance değildir.

## Acceptance States
Codex çıktısı aşağıdaki durumları ayrı raporlar:

1. **Automation Green** — exact-head automation sonucu.
2. **Contract Verified** — applicable contract checklist sonucu; bunu Codex tek başına final product kabulü olarak ilan edemez.
3. **Product Accepted** — manual/runtime product acceptance; yalnız gerçek kabulden sonra kullanılır.

`SUCCESS`, `green`, `technical pass` veya `no blocker found` ifadeleri otomatik olarak Product Accepted anlamına gelmez.

## User Manual Burden Rule
Codex/agent kullanıcıyı keşif laboratuvarı olarak kullanmaz.

- Benchmark, code review, automation ve reproducible runtime investigation agent-owned'dur.
- Kullanıcıdan yalnız son dar kapsamlı visual/feel acceptance veya gerçekten çözülemeyen ürün kararı istenir.
- Aynı broad manual scenario tekrar tekrar istenmez; regression gerekiyorsa automation'a alınır.

## Kapanış
Bir package ancak aşağıdakiler açıkça raporlandığında review'a hazırdır:
- exact head SHA;
- bounded commit list;
- exact-head gate result;
- contract sections implemented;
- known runtime evidence covered;
- unresolved blocker list;
- manual acceptance scope, yalnız gerçekten gerekiyorsa.

Merge, branch silme, force-push veya history rewrite kullanıcı açıkça istemedikçe yapılmaz.
