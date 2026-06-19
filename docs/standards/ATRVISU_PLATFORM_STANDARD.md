# AtrVisu Platform Standard v3.0

## 1. Platform Omurgası
AtrVisu şu merkezi sistemlere doğru evrilecektir:
- Command Registry
- Panel Registry
- Entity Manager
- Selection Manager
- Viewport Contract
- Feature Access Matrix
- ADR governance

## 2. Command Registry
Tüm kullanıcı eylemleri tek registry’den gelir:
- id
- label
- icon
- tooltip
- shortcut
- enable rule
- execute handler
- menu/toolbar/context locations

Lokal ad-hoc button handler yeni mimaride yasaktır.

## 3. Panel Registry
Tüm panel ve tool yüzeyleri merkezi kayıt altında olmalıdır:
- id
- title
- type
- dock/floating/modal
- visibility
- close/collapse behavior
- feature access mapping

Panel görünürlük değişimi domain data veya viewport state mutasyonu yapamaz.

## 4. Viewport Contract
Viewport, UI container değişimlerini yalnızca kendi render/canvas boyutuna uygular. Panel collapse/resize şunları değiştiremez:
- object transform
- dimensions
- selection
- camera target/radius, explicit fit command yoksa
- drag math
- entity visibility

## 5. Quality Gate
Her branch kapanmadan:
- build
- unit test
- e2e
- audit
- manual smoke
- no red console
- feature access check
