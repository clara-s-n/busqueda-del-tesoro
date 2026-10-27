# El secreto de Sacré Coeur — pósteres NFT

Sitio estático publicado en https://clara-s-n.github.io/busqueda-del-tesoro/. Usa AR.js 3.4.8 + A-Frame 1.8.0.

## Cambios
- Sustituye tres patrones cuadrados por reconocimiento NFT de los pósteres LUDUS, Pastoral y Bienestar.
- Incluye imágenes rectificadas y los nueve binarios `.iset`, `.fset`, `.fset3` generados realmente a partir de ellas.
- Carga solo el objetivo de la etapa actual. Al continuar se recarga la página para liberar el tracker anterior y evitar tres workers simultáneos.
- Conserva objetos 3D, orden, progreso, cronómetro, sonido y tesoro. Nuevo estado local `sacre-coeur-posters-v2`, independiente de la versión impresa.
- El reinicio vuelve a la etapa inicial y descarta el tracker anterior.
- El código QR de cada póster no se utiliza como enlace.

## GitHub
Pages está configurado desde la rama `main`, carpeta `/` (raíz). No hay compilación ni backend. Los cambios locales no actualizan el sitio hasta incorporarlos a esa rama. Conservar `assets`, los módulos `.mjs` y `.nojekyll`. El proyecto usa rutas relativas y funciona bajo `/nombre-del-repositorio/`.
Para probar en PC: `python -m http.server 8000`, luego http://localhost:8000. Desde celular se necesita un servidor HTTPS. Abrir index.html directamente con file:// no sirve.

## Recorrido pendiente de confirmar
1. Póster violeta Cursos de docencia junto al letrero Centro LUDUS.
2. Pastoral Universitaria, cartelera de la segunda foto.
3. Bienestar Estudiantil, en esa misma cartelera.
Indicar a los jugadores dónde empezar. Los pisos y sectores no fueron proporcionados y no se han inventado. Editar los textos de game.js cuando se confirmen. Ver preparar.html.

## Referencias y calidad
Las dos fotos originales contienen desenfoque y reflejos. Se recortaron y rectificaron tres regiones mediante homografía, sin reconstrucción artificial. El recorte de Pastoral conserva una oclusión del papel amarillo presente en la foto. La detección en sitio NO está verificada. La generación de descriptores y las pruebas de lógica no garantizan reconocimiento con el celular frente al original.

## Comprobación
Ejecutar `node tests.mjs` (Node 20+). Comprueba inicio real con DOM simulado, carga de un solo NFT por etapa, eventos de hallazgo/pérdida, duplicados, reanudación, reinicio, progreso final y rutas locales. No simula visión artificial.
Ejecutar también `node --test runtime-tests.mjs`: comprueba la espera de dimensiones de cámara, una sola imagen pendiente, límite de frecuencia, rotación, pausa/reanudación y liberación de recursos.
Prueba opcional con Chromium: `python3 tools/browser_smoke.py` (requiere Playwright para Python y `/usr/bin/chromium`). Sirve el sitio bajo una subcarpeta como Pages y comprueba arranque real de cámara/tracker, tres etapas, límites de consumo, giros de pantalla, pestaña oculta, final y reinicio. La cámara y los eventos de hallazgo de este test son simulados.
Probar físicamente los tres pósteres antes de entregar. Si alguno falla, sustituir su referencia por una foto frontal más nítida y regenerar el dataset.

## Chrome Android: cámara y consumo

Se corrigió la integración NFT para tomar `videoWidth`/`videoHeight` una vez disponibles, conservar la relación de aspecto de la cámara en vertical y recalcular el encuadre al cambiar las dimensiones. El recorte del video no modifica el tamaño del `body` ni amplía el viewport móvil. La superposición 3D sigue el mismo recorte que el video.

El reconocimiento tiene una sola imagen pendiente y un máximo de 12 análisis por segundo. El bundle original iniciaba otra cadena de procesamiento por cada mensaje de arranque del worker. Se evita además el análisis redundante de marcadores cuadrados en el hilo principal cuando la escena solo contiene NFT. La cámara solicita 640×480 a 24 fps (máximo 30); el dibujo se limita a 30 fps, densidad de píxeles 1 y sin antialiasing. La resolución solicitada de cámara es una preferencia: cada dispositivo puede elegir otra compatible.

Al guardar los dos primeros fragmentos se detienen la cámara y el worker mientras se lee la siguiente pista; Continuar recarga y abre la cámara para el póster siguiente. La última pantalla y las pestañas ocultas pausan el reconocimiento y el dibujo. Ver el tesoro reanuda la escena final. Salir de la página libera las pistas de cámara y el worker. El progreso guardado conserva la misma clave y no se pierde con la actualización.

`ar-runtime.mjs` contiene la integración legible. `assets/aframe-ar-nft.js` es una copia local con ajustes puntuales; no sustituirla por el bundle original sin adaptar esa integración. Para reproducirla desde el original verificado:

```sh
git show 0e414eb:assets/aframe-ar-nft.js > /tmp/aframe-ar-nft-original.js
python3 tools/patch_arjs.py /tmp/aframe-ar-nft-original.js
```

El script verifica SHA-256 antes de aplicar los ajustes y conserva el resto del bundle. También resuelve las URLs de calibración y datasets con `URL`, incluidas las subcarpetas de Pages. Los recursos modificados tienen una versión en la URL (`20261026-android1`) para renovar su caché después de publicar; no hay service worker.

La validación de escritorio no demuestra temperatura, estabilidad del controlador de cámara ni funcionamiento físico en un Samsung S24 FE. Tras publicar, probar Chrome en ese dispositivo en vertical desde el inicio, los tres pósteres, giros en ambos sentidos, regreso de segundo plano y varios minutos de uso. Repetir el recorrido en Safari de iPhone.

## Regenerar referencias
`tools/preparar_fotos.py` documenta las cuatro esquinas utilizadas sobre las fotos originales. Requiere Python, Pillow y NumPy. Las originales no se incluyen en este ZIP; usa --source-dir para indicar su carpeta.
Datasets generados con https://github.com/Carnaux/NFT-Marker-Creator (revisión indicada en tools/generacion.json), flags `-level=4 -leveli=3`, PNG de entrada a 72 dpi. El generador es una herramienta de desarrollo, no se necesita para ejecutar el juego. Los JPG incluidos muestran exactamente las regiones utilizadas; los PNG se conservaron para reproducibilidad.

Documentación: https://ar-js-org.github.io/AR.js-Docs/image-tracking/ y https://aframe.io/docs/1.8.0/ . Las bibliotecas conservan sus avisos de licencia.
