# Codex Sync Protocol v3.0

## Amaç
Codex, ChatGPT ve geliştirici aynı standartlara bağlı çalışır. Standartlar repo içinde tutulur.

## Görev Öncesi
Her görev şunları belirtir:
- Phase
- Module
- Relevant standards
- Existing behavior
- Desired behavior
- Constraints
- Acceptance criteria
- Tests
- Files allowed / files not allowed if needed

## Zorunlu Kontroller
- Görev standartlarla çelişiyor mu?
- Mevcut feature erişimi korunuyor mu?
- UI değişikliği scene/entity/camera state mutasyonu yapıyor mu?
- Console red error var mı?
- Feature Access Matrix güncel mi?

## Çalışma Biçimi
- Büyük UI rewrite yerine küçük slice.
- Önce contract/test, sonra adapter, sonra UI.
- Mevcut çalışan feature silinmez.
- Yeni command/panel ad-hoc eklenmez; registry yönü korunur.
