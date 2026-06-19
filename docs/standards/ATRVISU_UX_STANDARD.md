# AtrVisu UX Standard v3.0

## 1. Ürün Hissi
AtrVisu web sitesi gibi değil, mühendislik kokpiti gibi davranır. Kullanıcı Word, Excel, AutoCAD, SolidWorks, Figma veya Visual Components kullanır gibi sezgisel komut, panel, shortcut ve selection davranışı bekler.

## 2. Shell Prensibi
- Üstte temiz menü ve kısa quick-access alanı.
- Solda kaynaklar ve sahne organizasyonu: Library, Explorer, Layers, Groups.
- Ortada ana çalışma alanı: Viewport.
- Sağda yalnızca bağlamsal Properties Inspector.
- Altta status bar.

## 3. Menü Standardı
- Menü gerçek menüdür; yatay komut çöplüğü değildir.
- Aynı anda tek menü açık kalır.
- Dışarı tıklama ve Escape menüyü kapatır.
- Görünen her komut gerçek davranışa sahiptir.
- Aktif olmayan komutlar açık gerekçeli disabled olmalıdır.

## 4. Toolbar / Icon Standardı
- Sık komutlarda evrensel ikon kullanılabilir.
- Icon-only butonlarda tooltip ve aria-label zorunludur.
- PM, Lbl gibi yerel/kriptik kısaltmalar yasaktır.
- Disabled, hover ve focus state açık görünmelidir.

## 5. Inspector Standardı
Properties Inspector yalnızca seçili entity’nin bağlamsal özelliklerini gösterir:
- machine/object
- civil
- annotation
- group
- multi-selection summary
- no selection state

Project Manager, Library Manager, Taxonomy Manager, Benchmark, Collision paneli gibi genel araçlar inspector deposuna konmaz.

## 6. Form Standardı
- Her numeric field unit gösterir.
- Negatif/pozitif kuralı açık sınıflandırılır.
- Physical dimension negatif olamaz.
- Coordinate/offset gerektiğinde negatif olabilir.
- Hatalar alan yanında ve net olmalıdır.
- Boş değer ile geçersiz değer aynı değildir.

## 7. Selection Standardı
- Sahne, Explorer ve Inspector aynı shared selection state’i kullanır.
- İlk seçilen entity primary’dir.
- Entity tipi selection order’ı değiştiremez.
- Hidden entity scene’den pick edilmez; Explorer’da işaretli görünebilir.
- Locked entity seçilebilir ama hareket/düzenleme kurallarına tabidir.
