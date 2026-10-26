# El secreto de Sacré Coeur — pósteres NFT

Versión para GitHub, sin publicar automáticamente. Usa AR.js 3.4.8 + A-Frame 1.8.0.

## Cambios
- Sustituye tres patrones cuadrados por reconocimiento NFT de los pósteres LUDUS, Pastoral y Bienestar.
- Incluye imágenes rectificadas y los nueve binarios `.iset`, `.fset`, `.fset3` generados realmente a partir de ellas.
- Carga solo el objetivo de la etapa actual. Al continuar se recarga la página para liberar el tracker anterior y evitar tres workers simultáneos.
- Conserva objetos 3D, orden, progreso, cronómetro, sonido y tesoro. Nuevo estado local `sacre-coeur-posters-v2`, independiente de la versión impresa.
- El reinicio vuelve a la etapa inicial y descarta el tracker anterior.
- El código QR de cada póster no se utiliza como enlace.

## GitHub
Subir el contenido del ZIP, conservando la carpeta assets. No hay compilación ni backend. No habilitar Pages hasta querer publicar.
Cuando corresponda: Settings → Pages → Deploy from a branch → main → / (root). El proyecto usa rutas relativas y funciona bajo /nombre-del-repositorio/.
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
Probar físicamente los tres pósteres antes de entregar. Si alguno falla, sustituir su referencia por una foto frontal más nítida y regenerar el dataset.

## Regenerar referencias
`tools/preparar_fotos.py` documenta las cuatro esquinas utilizadas sobre las fotos originales. Requiere Python, Pillow y NumPy. Las originales no se incluyen en este ZIP; usa --source-dir para indicar su carpeta.
Datasets generados con https://github.com/Carnaux/NFT-Marker-Creator (revisión indicada en tools/generacion.json), flags `-level=4 -leveli=3`, PNG de entrada a 72 dpi. El generador es una herramienta de desarrollo, no se necesita para ejecutar el juego. Los JPG incluidos muestran exactamente las regiones utilizadas; los PNG se conservaron para reproducibilidad.

Documentación: https://ar-js-org.github.io/AR.js-Docs/image-tracking/ y https://aframe.io/docs/1.8.0/ . Las bibliotecas conservan sus avisos de licencia.
