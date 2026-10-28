# Revisión de la consigna del laboratorio

Comparación actualizada el 28 de octubre de 2026. El único entregable indicado es la URL del juego: https://clara-s-n.github.io/busqueda-del-tesoro/.

| Requisito | Implementación y evidencia |
| --- | --- |
| Web sin app nativa | Sitio estático HTML, CSS y JavaScript, con cámara del navegador por HTTPS. |
| AR.js y A-Frame, últimas estables | AR.js 3.4.8 y A-Frame 1.8.0. Coinciden con la última release oficial de AR.js y el paquete estable de A-Frame consultados para esta revisión. AR.js incluye ajustes locales documentados para Android. |
| Al menos tres marcadores diferentes | Tres marcadores de imagen NFT: LUDUS, cartel azul de accesibilidad al salir al patio y letrero de la Capilla del Encuentro, con datasets diferentes incluidos en `assets/targets`. |
| Un elemento o pista diferente por marcador | Brújula, llave y cristal. Cada uno tiene un modelo 3D colocado sobre su referencia y una ilustración persistente al encontrarlo. Se desbloquean pistas distintas y se actualiza el inventario. |
| Retroalimentación final | Al reunir los tres fragmentos aparece Abrir el tesoro: muestra un cofre ilustrado, el cierre de la historia, tiempo y sonido. Se puede continuar para ver el cofre 3D sobre el letrero de la capilla. |
| URL accesible desde celular | GitHub Pages publica desde `main`, raíz del repositorio. Se verifican también las rutas bajo `/busqueda-del-tesoro/`, no solo desde un servidor en su raíz. |
| Ambientación en Sacré Coeur | Historia del corazón del conocimiento. Inicio en el piso 1 pasando Admisiones, junto a Centro LUDUS; luego salida al patio y segundo piso pasando la sala Bauzá, junto a la Capilla del Encuentro. |
| Lógica de juego en JavaScript | Hallazgo y pérdida de marcador, confirmación, orden de etapas, protección contra duplicados, pistas, inventario, persistencia, reanudación y reinicio. |
| Opcionales: sonido, animación y tiempo/progreso | Incluidos: sonido al encontrar fragmentos y abrir el tesoro, modelos animados, contador de tiempo y progreso de 0/3 a 3/3. |

## Fallos visuales encontrados y correcciones

- El ahorro de consumo ocultaba la escena a los 400 ms de confirmar el hallazgo. Ahora los objetos permanecen visibles hasta que el jugador elige continuar, conservando los límites de procesamiento y dibujo.
- La posición se calculaba en X/Y cuando el plano NFT de AR.js está orientado sobre X/−Z. Los objetos podían quedar fuera de cámara aunque el reconocimiento emitiera sonido. Se corrigió la posición y la proyección de cámara.
- El diálogo final tapaba un tesoro sin representación propia. Ahora contiene una ilustración visible del cofre; el cristal tiene su momento de descubrimiento antes de abrirlo y el cofre 3D se muestra al continuar en AR.
- El recorrido no indicaba el piso ni cómo llegar al inicio. Se incorporó la ubicación confirmada a la bienvenida, las pistas y la guía del equipo.

## Qué falta para dar la actividad por validada

La detección física en el edificio y el éxito de los tres beta testers requieren una prueba presencial. Las pruebas automatizadas de referencia no la sustituyen.

1. **Bruno, Maxi y Gonzalo deben completar la búsqueda desde la URL**, siguiendo las indicaciones de inicio sin ayuda del equipo. La evaluación de la consigna depende de que encuentren el tesoro.
2. Comprobar el **póster de LUDUS y los dos letreros con iluminación y reflejos reales**. Los nuevos datasets usan recortes de las fotos del equipo. Si la detección resulta inestable en el lugar, actualizar las referencias con fotografías frontales y regenerarlos.
3. Repetir el recorrido en **Chrome del Samsung S24 FE y Safari de iPhone**. Confirmar que se ve cada objeto y el cofre final, tanto al iniciar en vertical como después de girar o volver de otra pestaña. Usar varios minutos para comprobar estabilidad y temperatura.
4. Confirmar que los tres puntos siguen visibles y accesibles, incluyendo la salida al patio y el segundo piso. Las pistas describen las ubicaciones confirmadas por el equipo.

Las pruebas de `tests.mjs`, `runtime-tests.mjs`, `tools/browser_smoke.py` y `tools/visual_smoke.py` cubren lógica, consumo acotado, navegador, detección de las referencias y objetos efectivamente dibujados. `clock-tests.mjs` comprueba el tiempo activo y la migración de progreso; `tools/iphone_smoke.py` comprueba interfaz y permisos en Chromium y WebKit con dimensiones del iPhone 12, incluidas las barras de Safari. La colaboración del equipo, el estado físico del recorrido y los resultados de los testers no pueden demostrarse solo desde el código.

Fuentes de versiones: [AR.js, release estable](https://github.com/AR-js-org/AR.js/releases/latest) y [A-Frame, paquete estable](https://www.npmjs.com/package/aframe).

## Actualización del recorrido

Pastoral y Bienestar se sustituyeron por el cartel azul saliendo al patio (llave) y el letrero de la Capilla del Encuentro, segundo piso pasando la sala Bauzá (cristal y tesoro). Se retiraron sus imágenes y datasets, se generaron seis binarios nuevos y se actualizaron la guía y las pistas. La migración conserva solo la brújula de LUDUS; los hallazgos de los pósteres retirados no desbloquean el tesoro nuevo.
