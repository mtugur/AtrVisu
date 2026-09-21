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

### 4.1 Iconography and Density
- Class A: frequent, repeated, local micro actions use a canonical icon-only control. Navigation tabs, visibility/lock toggles, row actions, previous/next, local apply/update/delete and local close actions belong here.
- Class B: infrequent or ambiguous workflows use a canonical icon plus a short visible label. Import and explicit edit-mode transitions are representative examples.
- Class C: engineering information and user decisions remain visible text. Menu headings, property names, values, units, forms, validation, wizard decisions, project decisions, confirmations, exports and Help are never reduced to icon puzzles.
- Product icons resolve only through `src/workbench/icons/iconRegistry.tsx`. Product components must not import an icon library directly.
- Standalone pseudo-icon glyph controls such as `<`, `>`, `+` and `-` are not permitted where a registered semantic icon exists.
- Compact icon-only actions use the shared 32 by 32 geometry unless a frozen structural control establishes another size. Icon-and-text actions use the same height and optical icon size.
- Every icon-only control requires a truthful accessible name and tooltip, keyboard focusability, visible focus, disabled state and pressed/expanded state when applicable. Its SVG is presentation-only to assistive technology.

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
