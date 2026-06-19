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
