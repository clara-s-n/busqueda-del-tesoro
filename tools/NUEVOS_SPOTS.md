# Sustitución de los dos últimos objetivos

Ubicaciones confirmadas por el equipo el 28 de octubre de 2026:

1. **LUDUS → brújula**. Se conserva el inicio actual: piso 1, pasando Admisiones.
2. **Cartel azul de accesibilidad → llave**. Saliendo al patio. Sustituye a Pastoral.
3. **Capilla del Encuentro → cristal y tesoro**. Segundo piso, pasando la sala Bauzá. Sustituye a Bienestar.

Referencias generadas a partir de `capilla.jpeg` y `cartel.jpeg` del archivo `imagenes.zip` enviado por el equipo. Los recortes se inspeccionaron antes de generar los datasets. Las dimensiones y SHA-256 de las fuentes quedan en `referencias_spots.json`; los binarios y sus SHA-256, en `generacion.json`.

## Preparación de las referencias reales

Con los JPG/PNG originales disponibles:

```sh
python3 tools/preparar_spots.py --patio /path/to/patio.jpg --capilla /path/to/capilla.jpg --output-dir /tmp/new-spot-references
```

Inspeccionar ambos recortes y ajustar sus cajas si la orientación o el encuadre de los originales difiere de la vista del chat. El recorte del patio incluye el cartel y un pequeño borde real de pared. El de Capilla concentra el reconocimiento en las letras; no se reconstruyen ni retocan sus detalles.

## Generador NFT

Se utiliza el mismo generador y revisión que los datasets existentes:

```sh
git clone https://github.com/Carnaux/NFT-Marker-Creator.git /tmp/nft-marker-creator
git -C /tmp/nft-marker-creator checkout 44c4cdff3f3a184f61d52235fafed0098faf6478
npm --prefix /tmp/nft-marker-creator install --ignore-scripts --no-audit --no-fund --cache /tmp/nft-npm-cache
node tools/generar_nft.cjs --generator /tmp/nft-marker-creator --input /tmp/new-spot-references/patio.png --output /tmp/new-spot-references/patio
node tools/generar_nft.cjs --generator /tmp/nft-marker-creator --input /tmp/new-spot-references/capilla.png --output /tmp/new-spot-references/capilla
```

El adaptador configura el WASM local mediante `wasmBinary`, compatible con Node moderno, y verifica la revisión y los archivos del generador. Comprueba que los tres binarios tienen datos y registra tamaños, cabeceras y SHA-256. Esto no prueba la detección física: después hay que probar ambos objetivos con el tracker real y en el edificio.

## Integración

- `assets/targets` contiene LUDUS, patio y capilla: sus JPG/PNG y los nueve binarios NFT. Se retiraron Pastoral y Bienestar.
- Las dimensiones de cada recorte a 72 dpi se usan para centrar su objeto en el plano NFT.
- Las pistas, vistas previas y guía indican la ubicación de cada punto y muestran el cofre sobre el letrero de la capilla.
- La clave `sacre-coeur-spots-v3` migra solamente la brújula de la versión anterior; los pósteres retirados no desbloquean el final ni aportan tiempo al nuevo recorrido.
- Las pruebas de lógica, navegador, interfaz de iPhone y detección/renderizado cubren los tres objetivos. La prueba presencial sigue siendo necesaria para evaluar luz, cámaras y temperatura de los celulares.
