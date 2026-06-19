# AtrVisu Simulation Architecture Standard v3.0

## 1. Kademeli Simülasyon Yaklaşımı
Simülasyon bir anda Siemens/Emulate3D seviyesi yapılmayacaktır. Kademeli ilerlenir:
1. Scenario/replay altyapısı
2. Deterministic DES/throughput çekirdeği
3. Flow primitives: source, sink, queue, process, conveyor
4. Smart component behavior
5. Signal ports and mapping
6. OPC UA/MQTT bridge via local/edge service
7. High-fidelity physics/kinematics if justified, potentially Wasm

## 2. JavaScript / Wasm Kararı
- Early throughput ve DES TypeScript ile yapılabilir.
- Gerçek zamanlı yüksek-fidelity fizik, robot IK veya büyük ölçekli collision planning için Wasm/Rust/C++ değerlendirilebilir.
- Wasm şart değil; performans ihtiyacı ve testle gerekçelendirilir.

## 3. Virtual Commissioning
Browser frontend doğrudan PLC sürücüsü değildir. Doğru yapı:
- frontend simulation model
- signal mapping
- local/edge bridge service
- OPC UA/MQTT adapter
- deterministic scenario log/replay

## 4. Safety Boundary
Bu araç mühendislik doğrulama ve tasarım desteğidir. Safety-certified PLC/robot programı üretimi veya güvenlik validasyonu iddiası ayrı standart, doğrulama ve sorumluluk süreci ister.
