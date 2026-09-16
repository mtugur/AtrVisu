# AGENTS.md — AtrVisu Agent Operating Rules v0.4

AtrVisu, Atara Makine için web tabanlı endüstriyel 3D layout, teklif, mühendislik doğrulama, simülasyon ve gelecekte sanal devreye alma platformudur.

## Zorunlu Okuma Sırası
Kod veya doküman değiştirmeden önce:
1. `AGENTS.md`
2. `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`
3. Kullanıcı etkileşimi değişiyorsa `docs/standards/ATRVISU_INTERACTION_STANDARD.md`
4. İlgili diğer dosyalar: `docs/standards/*`
5. İlgili normatif ürün/faz dosyaları: `docs/product/*`
6. `docs/protocols/CODEX_SYNC_PROTOCOL.md`
7. `docs/checklists/*`
8. Gerekirse ilgili ADR dosyası

Bu sıra bilgi önceliğini değil, görev öncesi zorunlu okuma sırasını gösterir. Çelişki çözüm sırası `ATRVISU_PRODUCT_CONSTITUTION.md` içinde tanımlıdır.

## Değişmez Kurallar
- Rastgele UX, veri modeli, komut, panel, birim, koordinat, simülasyon veya mimari kararı alınmaz.
- Çelişki veya eksik interaction contract varsa kod yazılmaz; çelişki/eksik raporlanır.
- Repo standartları geçici chat cevaplarından, PR yorumundan, testten ve mevcut kod davranışından üstündür.
- Project/Library kaynağındaki normatif karar repo authority zincirine yansıtılmadan implementasyon authority'si sayılmaz.
- Kullanıcı etkileşiminde benchmark-first yaklaşım zorunludur. `ATRVISU_INTERACTION_STANDARD.md` kapsamındaki davranışlar agent tarafından yeniden icat edilemez.
- Mevcut interaction contract yoksa önce benchmark + contract/ADR, sonra implementasyon yapılır.
- Benchmark'tan bilinçli sapma varsa gerekçe ve ADR zorunludur; gizli sapma yasaktır.
- Kamera açısına, framework kolaylığına veya lokal matematiğe göre kullanıcı input anlamı gizlice değiştirilemez.
- Tüm kullanıcı aksiyonları Command Registry üzerinden tanımlanacak yönde evrilecektir.
- Tüm paneller ve araçlar Panel Registry veya Command Registry üzerinden keşfedilebilir olacaktır.
- UI shell değişikliği hiçbir mevcut özelliği erişilemez hale getiremez.
- Panel collapse/resize; scene data, camera state, selection, object transform, object dimension veya drag math üzerinde mutasyon yapamaz.
- Domain birimi milimetredir. Babylon metre kullanıyorsa bu sadece adapter katmanında yapılır.
- Kullanıcı yüzeyinde yerleşim referansı front-left-bottom kabul edilir; aksi karar ADR ister.
- Console kırmızı hataları blocker'dır: `GL_INVALID_VALUE`, `Maximum update depth`, `Uncaught`, `removeChild`, runtime exception ve tekrarlayan React update warning'leri.
- Kullanıcının gerçek runtime stack trace'i, farklı rotada geçen otomatik console testinden daha düşük öncelikli sayılamaz.
- Platform contract'ları ve feature access matrix olmadan büyük UI shell refactor yapılmaz.
- Framework/render-engine default kontrolü çalışıyor diye ürün görseli kabul edilmiş sayılmaz.

## Interaction Değişikliği Stop Rule
Aşağıdakilerden biri doğruysa implementasyon durur:
- interaction standardında davranış tanımlı değil;
- benchmark ürünleri anlamlı şekilde ayrışıyor ve AtrVisu kararı yok;
- çözüm hidden heuristic/fallback ile kullanıcı input anlamını değiştiriyor;
- istenen düzeltme paket kapsamı dışında yeni bir ürün/interaction authority'sine giriyor;
- gerçek runtime blocker devam ederken testler yeşil görünüyor;
- framework kısıtı frozen contract'ı sağlayamıyor ve onaylı fallback yok.

Stop rule oluştuğunda threshold/heuristic tuning yapılmaz. Önce contract/scope kararı alınır.

## Geliştirme Disiplini
- Contract-first.
- Benchmark-first for user-facing interaction.
- Küçük ve bounded branch/slice.
- Legacy adapter ile kontrollü geçiş.
- Feature erişim matrisi.
- No-red-console kalite kapısı.
- Karar gerektiren mimari veya benchmark sapmalarında ADR.
- Testler ürün davranışını tanımlamaz; önceden dondurulmuş contract'ı korur.

## Acceptance States
Aşağıdaki durumlar birbirinin yerine kullanılamaz:
- **Automation Green:** exact-head build/audit/unit/E2E geçer.
- **Contract Verified:** implementasyon tüm ilgili normatif contract'lara göre incelenmiştir.
- **Product Accepted:** gerçek runtime davranışı ve görsel sonuç kullanıcı hedefini karşılar; bilinen blocker yoktur.

`Automation Green` veya `Technical PASS`, `Product Accepted` anlamına gelmez.

## Repository-wide Delivery Protocol
- One bounded development package normally uses one pull request. Do not split a package into routine micro-PRs.
- Bir package yeni bir contract domain'ine girerse scope otomatik genişletilmez; önce re-scope veya ayrı package kararı gerekir.
- Use logical commits as the work requires. Never predeclare or manufacture a commit count.
- The normal delivery loop is: freeze contract, implement, run CI, perform one comprehensive contract review, apply one consolidated correction batch when needed, rerun CI, complete one final manual acceptance when visible behavior changed, then merge.
- Routine Git, test, CI and benchmark verification work is agent-owned. Ask the user only for genuine final manual visual/runtime acceptance or destructive/ambiguous product decisions.
- Use risk-based local validation during development. Run the complete gate once before delivery instead of repeating it after every trivial edit.
- Complete repository documentation in the implementation PR. Avoid routine documentation-only `PENDING` to `PASS` closure commits.
- Exact-head CI is required before merge.
- Known real-runtime blockers prevent closure even when exact-head CI is green.
- Security-only lockfile remediation does not reopen visual acceptance when product and UI behavior are unchanged.
- Never force-push or rewrite accepted history unless the user explicitly authorizes it.
- Preserve existing platform authorities. Extend or adapt them instead of creating competing sources of truth.
