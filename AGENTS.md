# AGENTS.md — AtrVisu Agent Operating Rules v0.4

AtrVisu, Atara Makine için web tabanlı endüstriyel 3D layout, teklif, mühendislik doğrulama, simülasyon ve gelecekte sanal devreye alma platformudur.

## Zorunlu Okuma Sırası
Kod veya doküman değiştirmeden önce:
1. `AGENTS.md`
2. `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`
3. Kullanıcı etkileşimi değişiyorsa `docs/standards/ATRVISU_INTERACTION_STANDARD.md`
4. İlgili diğer dosyalar: `docs/standards/*`
5. İlgili normatif ürün dosyaları: `docs/product/*`
6. `docs/protocols/CODEX_SYNC_PROTOCOL.md`
7. İlgili `docs/checklists/*`
8. Gerekirse ilgili ADR dosyası

Bu sıra yalnızca okuma sırası değil, otorite sırasıdır. Alt sıradaki kaynak üst sıradaki kaynağı sessizce geçersiz kılamaz.

## Değişmez Kurallar
- Rastgele UX, veri modeli, komut, panel, birim, koordinat, simülasyon veya mimari kararı alınmaz.
- Çelişki varsa kod yazılmaz; çelişki raporlanır.
- Repo içindeki normatif ürün/standart sözleşmeleri geçici chat cevaplarından, mevcut koddan ve yeşil testlerden üstündür.
- User-facing interaction için normatif sözleşme yoksa implementasyon yapılmaz. Önce benchmark araştırması + interaction contract; gerekiyorsa ADR; sonra kod.
- SolidWorks, AutoCAD/Autodesk Factory, Visual Components, Siemens Tecnomatix/RobotExpert ve benzeri olgun mühendislik ürünlerindeki yerleşik kullanıcı alışkanlıkları varsayılan precedents’tir. Bunlardan bilinçli sapma ADR ister.
- Rendering framework/library default davranışı ürün standardı sayılmaz.
- Tüm kullanıcı aksiyonları Command Registry üzerinden tanımlanacak yönde evrilecektir.
- Tüm paneller ve araçlar Panel Registry veya Command Registry üzerinden keşfedilebilir olacaktır.
- UI shell değişikliği hiçbir mevcut özelliği erişilemez hale getiremez.
- Panel collapse/resize; scene data, camera state, selection, object transform, object dimension veya drag math üzerinde mutasyon yapamaz.
- Domain birimi milimetredir. Babylon metre kullanıyorsa bu sadece adapter katmanında yapılır.
- Kullanıcı yüzeyinde yerleşim referansı front-left-bottom kabul edilir; aksi karar ADR ister.
- Console kırmızı hataları blocker’dır: `GL_INVALID_VALUE`, `Maximum update depth`, `Uncaught`, `removeChild`, runtime exception.
- Kullanıcı tarafından raporlanan gerçek runtime hatası, sentetik testte reproduce edilemedi diye kapatılamaz; eşdeğer kullanıcı rotası test edilmeden root cause kabul edilmez.
- Platform contract’ları ve feature access matrix olmadan büyük UI shell refactor yapılmaz.

## Etkileşim Değişikliği Stop Rule
Aşağıdakilerden biri olursa aynı yaklaşım üzerinde başka tuning turu yasaktır; benchmark + contract review zorunludur:
- aynı temel interaction üçüncü kez threshold/weight/fallback ayarı gerektiriyorsa;
- camera-angle özel durumları birikiyorsa;
- sign clipping, hidden fallback, gain clamp, catch-up, hysteresis veya smoothing sezgisel davranışı kurtarmak için ekleniyorsa;
- manuel kullanım sürekli olarak yeşil E2E’nin kaçırdığı temel usability problemi buluyorsa;
- bir visual/UI PR interaction-engine redesign’a dönüşüyorsa;
- kullanıcı tarafından bildirilen blocker console hatası claimed fix sonrası devam ediyorsa.

## Geliştirme Disiplini
- Contract-first.
- Benchmark-first for user-facing interaction.
- Küçük branch/slice.
- Legacy adapter ile kontrollü geçiş.
- Feature erişim matrisi.
- No-red-console kalite kapısı.
- Karar gerektiren mimari veya kullanıcı-etkileşimi değişikliklerinde ADR.
- Testler implementasyon algoritmasını değil kullanıcı-observable contract’ı doğrular.

## Repository-wide Delivery Protocol
- One bounded development package normally uses one pull request. Do not split a package into routine micro-PRs.
- Use logical commits as the work requires. Never predeclare or manufacture a commit count.
- The normal delivery loop is: freeze contract/benchmark, implement, run CI, perform one comprehensive review, apply one correction batch when needed, rerun CI, complete one final manual acceptance when visible behavior changed, then merge.
- Routine Git, test, and CI work is agent-owned. Ask the user only for genuine final manual visual/runtime acceptance or destructive/ambiguous decisions; do not use the user as an exploratory QA loop.
- Use risk-based local validation during development. Run the complete gate once before delivery instead of repeating it after every trivial edit.
- Complete repository documentation in the implementation PR. Avoid routine documentation-only `PENDING` to `PASS` closure commits.
- Exact-head CI is required before merge.
- Security-only lockfile remediation does not reopen visual acceptance when product and UI behavior are unchanged.
- Never force-push or rewrite accepted history unless the user explicitly authorizes it.
- Preserve existing platform authorities. Extend or adapt them instead of creating competing sources of truth.
- A PR must report three separate states where applicable: `Automation Green`, `Contract Verified`, `Product Accepted`. Automation Green alone is never merge acceptance for changed visible behavior.
- Any PR changing interaction must complete `docs/checklists/INTERACTION_CHANGE_GATE.md`.
