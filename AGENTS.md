# AGENTS.md — AtrVisu Agent Operating Rules v0.3

AtrVisu, Atara Makine için web tabanlı endüstriyel 3D layout, teklif, mühendislik doğrulama, simülasyon ve gelecekte sanal devreye alma platformudur.

## Zorunlu Okuma Sırası
Kod veya doküman değiştirmeden önce:
1. `AGENTS.md`
2. İlgili dosyalar: `docs/standards/*`
3. `docs/protocols/CODEX_SYNC_PROTOCOL.md`
4. `docs/checklists/*`
5. Gerekirse ilgili ADR dosyası

## Değişmez Kurallar
- Rastgele UX, veri modeli, komut, panel, birim, koordinat, simülasyon veya mimari kararı alınmaz.
- Çelişki varsa kod yazılmaz; çelişki raporlanır.
- Repo standartları geçici chat cevaplarından üstündür.
- Tüm kullanıcı aksiyonları Command Registry üzerinden tanımlanacak yönde evrilecektir.
- Tüm paneller ve araçlar Panel Registry veya Command Registry üzerinden keşfedilebilir olacaktır.
- UI shell değişikliği hiçbir mevcut özelliği erişilemez hale getiremez.
- Panel collapse/resize; scene data, camera state, selection, object transform, object dimension veya drag math üzerinde mutasyon yapamaz.
- Domain birimi milimetredir. Babylon metre kullanıyorsa bu sadece adapter katmanında yapılır.
- Kullanıcı yüzeyinde yerleşim referansı front-left-bottom kabul edilir; aksi karar ADR ister.
- Console kırmızı hataları blocker’dır: `GL_INVALID_VALUE`, `Maximum update depth`, `Uncaught`, `removeChild`, runtime exception.
- Platform contract’ları ve feature access matrix olmadan büyük UI shell refactor yapılmaz.

## Geliştirme Disiplini
- Contract-first.
- Küçük branch/slice.
- Legacy adapter ile kontrollü geçiş.
- Feature erişim matrisi.
- No-red-console kalite kapısı.
- Karar gerektiren mimari değişikliklerde ADR.

## Repository-wide Delivery Protocol
- One bounded development package normally uses one pull request. Do not split a package into routine micro-PRs.
- Use logical commits as the work requires. Never predeclare or manufacture a commit count.
- The normal delivery loop is: implement, run CI, perform one comprehensive review, apply one correction batch when needed, rerun CI, complete one final manual acceptance when visible behavior changed, then merge.
- Routine Git, test, and CI work is agent-owned. Ask the user only for genuine manual visual/runtime acceptance or destructive or ambiguous decisions.
- Use risk-based local validation during development. Run the complete gate once before delivery instead of repeating it after every trivial edit.
- Complete repository documentation in the implementation PR. Avoid routine documentation-only `PENDING` to `PASS` closure commits.
- Exact-head CI is required before merge.
- Security-only lockfile remediation does not reopen visual acceptance when product and UI behavior are unchanged.
- Never force-push or rewrite accepted history unless the user explicitly authorizes it.
- Preserve existing platform authorities. Extend or adapt them instead of creating competing sources of truth.
