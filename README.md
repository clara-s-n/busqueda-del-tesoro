# El secreto de Sacré Coeur — búsqueda con marcadores NFT

Sitio estático publicado en https://clara-s-n.github.io/busqueda-del-tesoro/. Usa AR.js 3.4.8 + A-Frame 1.8.0.

## Cambios
- Sustituye tres patrones cuadrados por reconocimiento NFT del póster LUDUS, el cartel azul saliendo al patio y el letrero de la Capilla del Encuentro.
- Incluye imágenes rectificadas y los nueve binarios `.iset`, `.fset`, `.fset3` generados realmente a partir de ellas.
- Carga solo el objetivo de la etapa actual. Al continuar se recarga la página para liberar el tracker anterior y evitar tres workers simultáneos.
- Conserva objetos 3D, orden, progreso, cronómetro, sonido y tesoro. Nuevo estado local `sacre-coeur-spots-v3`. Migra únicamente la brújula de `sacre-coeur-posters-v2`: los dos pósteres retirados no cuentan para abrir el nuevo tesoro. El tiempo del recorrido actualizado comienza en cero.
- El reinicio vuelve a la etapa inicial y descarta el tracker anterior.
- El código QR de cada póster no se utiliza como enlace.

## GitHub
Pages está configurado desde la rama `main`, carpeta `/` (raíz). No hay compilación ni backend. Los cambios locales no actualizan el sitio hasta incorporarlos a esa rama. Conservar `assets`, los módulos `.mjs` y `.nojekyll`. El proyecto usa rutas relativas y funciona bajo `/nombre-del-repositorio/`.
Para probar en PC: `python -m http.server 8000`, luego http://localhost:8000. Desde celular se necesita un servidor HTTPS. Abrir index.html directamente con file:// no sirve.

## Recorrido confirmado
1. Inicio: piso 1 del Edificio Sacré Coeur, pasando Admisiones. Póster violeta Cursos de docencia junto al letrero Centro LUDUS → brújula.
2. Saliendo al patio: cartel azul de accesibilidad junto a la puerta → llave.
3. Segundo piso, pasando la sala Bauzá: letrero «Capilla del Encuentro» → cristal y acceso al tesoro.

Los pósteres de Pastoral y Bienestar se retiraron del juego y sus datasets e imágenes se eliminaron del sitio.
Las indicaciones están incorporadas a la pantalla inicial, a las pistas y a `preparar.html`. Ver [ACTIVIDAD.md](ACTIVIDAD.md) para el contraste con la consigna y lo pendiente de comprobar con Bruno, Maxi y Gonzalo.

## Referencias y calidad
La referencia de LUDUS conserva su rectificación original. Las dos referencias nuevas son recortes de las fotografías de `imagenes.zip` proporcionadas por el equipo, sin reconstrucción artificial: el cartel azul completo y las dos líneas de la capilla. `tools/referencias_spots.json` registra dimensiones, recortes y SHA-256 de las fotos; `tools/generacion.json` registra los binarios generados. El reconocimiento de referencias en escritorio se prueba con el tracker real; la detección en el edificio requiere validación presencial.

## Comprobación
Ejecutar `node tests.mjs` (Node 20+). Comprueba inicio real con DOM simulado, carga de un solo NFT por etapa, eventos de hallazgo/pérdida, duplicados, reanudación, reinicio, progreso final y rutas locales. No simula visión artificial.
Ejecutar también `node --test runtime-tests.mjs`: comprueba la espera de dimensiones de cámara, una sola imagen pendiente, límite de frecuencia, rotación, pausa/reanudación y liberación de recursos.
Prueba opcional con Chromium: `python3 tools/browser_smoke.py` (requiere Playwright para Python y `/usr/bin/chromium`). Sirve el sitio bajo una subcarpeta como Pages y comprueba arranque real de cámara/tracker, tres etapas, límites de consumo, giros de pantalla, pestaña oculta, final y reinicio. La cámara y los eventos de hallazgo de este test son simulados.
La prueba visual adicional `python3 tools/visual_smoke.py --artifacts /tmp/sacre-visual-check` requiere también ffmpeg y Pillow. Usa las imágenes de referencia como entrada de cámara, detecta los tres objetivos con el worker NFT real y verifica tanto el encuadre como los píxeles WebGL dibujados de la brújula, llave, cristal y cofre. Guarda capturas del juego y de los objetos aislados; no inyecta eventos de hallazgo.
El cronómetro tiene pruebas independientes en `node --test clock-tests.mjs`. La revisión de interfaz `python3 tools/iphone_smoke.py --browser chromium` prueba el ancho del iPhone 12 con alturas útiles de 635, 700 y 844 píxeles, las tres etapas, los hallazgos y el diálogo final. Con WebKit instalado en Playwright, repetir con `--browser webkit`; reproduce además la API de permiso de sensores de Safari y exige cero solicitudes de ese permiso.
Probar físicamente los tres puntos antes de entregar. Si alguno falla, sustituir su referencia por una foto frontal más nítida y regenerar el dataset.

## Safari de iPhone: interfaz y cronómetro

El reconocimiento NFT se basa en la cámara, por lo que `device-orientation-permission-ui` y `xr-mode-ui` se desactivan antes de iniciar A-Frame. No se solicita acceso a sensores de movimiento. El permiso de cámara sigue siendo necesario.

El HUD usa la altura dinámica de la pantalla (`dvh`) y sus zonas seguras. El estado de cámara se coloca por encima de la tarjeta, con su propio fondo. La tarjeta de hallazgo combina la ilustración, un texto corto y el siguiente paso; los títulos repetidos no desplazan la pista fuera de la pantalla. Los botones se mantienen accesibles al cambiar la altura disponible por las barras de Safari. La ayuda desplegada puede desplazarse dentro de la tarjeta.

El cronómetro acumula tiempo activo con un reloj monotónico y se guarda entre etapas. Las pestañas ocultas y el tiempo con la página cerrada no se suman. Se conservan los fragmentos de partidas anteriores: si no tenían una duración activa registrada, las partidas pendientes empiezan a acumular desde cero; los finales antiguos muestran «Sin registro» en lugar de inventar una duración. Reiniciar borra tanto fragmentos como tiempo.

## Chrome Android: cámara y consumo

Se corrigió la integración NFT para tomar `videoWidth`/`videoHeight` una vez disponibles, conservar la relación de aspecto de la cámara en vertical y recalcular el encuadre al cambiar las dimensiones. El recorte del video no modifica el tamaño del `body` ni amplía el viewport móvil. La superposición 3D sigue el mismo recorte que el video.

El reconocimiento tiene una sola imagen pendiente y un máximo de 12 análisis por segundo. El bundle original iniciaba otra cadena de procesamiento por cada mensaje de arranque del worker. Se evita además el análisis redundante de marcadores cuadrados en el hilo principal cuando la escena solo contiene NFT. La cámara solicita 640×480 a 24 fps (máximo 30); el dibujo se limita a 30 fps, densidad de píxeles 1 y sin antialiasing. La resolución solicitada de cámara es una preferencia: cada dispositivo puede elegir otra compatible.

Después de cada hallazgo, el objeto 3D permanece sobre el póster o letrero y se conserva una ilustración del elemento en la tarjeta y el inventario. Al pulsar Continuar se libera la cámara y el worker antes de abrir la etapa siguiente. El tercer hallazgo muestra el cristal; Abrir el tesoro revela un cofre ilustrado y el cierre de la historia. Ver el tesoro en AR reanuda la escena con el cofre 3D. La pantalla final y las pestañas ocultas pausan el reconocimiento y el dibujo. Salir de la página libera las pistas de cámara y el worker. Las partidas de este recorrido se reanudan con su progreso; un tesoro ya encontrado en este recorrido también puede abrirse sin iniciar la cámara. La migración del recorrido anterior conserva solo LUDUS y requiere visitar los dos nuevos puntos.

`ar-runtime.mjs` contiene la integración legible. `assets/aframe-ar-nft.js` es una copia local con ajustes puntuales; no sustituirla por el bundle original sin adaptar esa integración. Para reproducirla desde el original verificado:

```sh
git show 0e414eb:assets/aframe-ar-nft.js > /tmp/aframe-ar-nft-original.js
python3 tools/patch_arjs.py /tmp/aframe-ar-nft-original.js
```

El script verifica SHA-256 antes de aplicar los ajustes y conserva el resto del bundle. La cámara usa su matriz de proyección calibrada compensando el relleno del tracker; los objetos se centran en el plano X/−Z del marcador NFT, no fuera del encuadre. El ajuste por eventos reemplaza el sondeo periódico de resize del bundle. También resuelve las URLs de calibración y datasets con `URL`, incluidas las subcarpetas de Pages. Los recursos modificados tienen una versión en la URL (`20261028-spots1`) para renovar su caché después de publicar; no hay service worker.

La validación de escritorio no demuestra temperatura, estabilidad del controlador de cámara ni funcionamiento físico en un Samsung S24 FE. Tras publicar, probar Chrome en ese dispositivo en vertical desde el inicio, los tres puntos, giros en ambos sentidos, regreso de segundo plano y varios minutos de uso. Repetir el recorrido en Safari de iPhone.

## Regenerar referencias
`tools/preparar_fotos.py` documenta las cuatro esquinas utilizadas para LUDUS en la foto original (Python, Pillow y NumPy). `tools/preparar_spots.py` prepara los recortes reales del patio y la capilla. Ver [tools/NUEVOS_SPOTS.md](tools/NUEVOS_SPOTS.md) para reproducir su generación con el WASM fijado a una revisión de NFT-Marker-Creator y compatible con Node moderno.

Los datasets usan flags `-level=4 -leveli=3` y PNG a 72 dpi. El generador solo es necesario para desarrollo. Los JPG muestran las mismas regiones que los PNG usados para generar los marcadores.

Documentación: https://ar-js-org.github.io/AR.js-Docs/image-tracking/ y https://aframe.io/docs/1.8.0/ . Las bibliotecas conservan sus avisos de licencia.
