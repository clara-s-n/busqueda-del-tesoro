// Generate genuine NFT datasets with the repository's pinned upstream WASM.
// Configure wasmBinary explicitly: older Emscripten loaders otherwise try to
// fetch a local file path as a URL on modern Node.js. No network fetch is used.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const {execFileSync} = require('node:child_process');
const {parseArgs} = require('node:util');
const {createHash} = require('node:crypto');
const {values} = parseArgs({options: {generator: {type: 'string'}, input: {type: 'string'}, output: {type: 'string'}}});
if (!values.generator || !values.input || !values.output) throw Error('Use --generator DIR --input IMAGE.png --output BASE_PATH');
const root = path.resolve(values.generator), input = path.resolve(values.input), output = path.resolve(values.output);
const revision = '44c4cdff3f3a184f61d52235fafed0098faf6478';
if (execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim() !== revision) throw Error('Unexpected generator revision');
execFileSync('git', ['-C', root, 'diff', '--exit-code', 'HEAD', '--', 'libs/NftMarkerCreator_wasm.js', 'libs/NftMarkerCreator_wasm.wasm'], {stdio: 'pipe'});
for (const extension of ['iset', 'fset', 'fset3', 'json']) if (fs.existsSync(output + '.' + extension)) throw Error('Refusing to overwrite ' + output + '.' + extension);
const toolRequire = createRequire(path.join(root, 'package.json'));
const {PNG} = toolRequire('pngjs');
const bytes = fs.readFileSync(input), png = PNG.sync.read(bytes);
if (Math.max(png.width, png.height) > 1200) throw Error('Crop/resize the reference before generation (maximum side: 1200px)');
const rgb = new Uint8Array(png.width * png.height * 3);
for (let i = 0, j = 0; i < png.data.length; i += 4) {
  const alpha = png.data[i + 3] / 255;
  for (let channel = 0; channel < 3; channel++) rgb[j++] = Math.round(png.data[i + channel] * alpha + 255 * (1 - alpha));
}
const filename = path.join(root, 'libs/NftMarkerCreator_wasm.js');
const flags = '-level=4 -leveli=3';
const Module = {
  wasmBinary: fs.readFileSync(path.join(root, 'libs/NftMarkerCreator_wasm.wasm')),
  onRuntimeInitialized() {
    const parameters = Module._malloc(flags.length + 1), pixels = Module._malloc(rgb.length);
    try {
      Module.writeStringToMemory(flags, parameters);
      Module.HEAPU8.set(rgb, pixels);
      Module._createImageSet(pixels, 72, png.width, png.height, 3, parameters);
      const files = {};
      fs.mkdirSync(path.dirname(output), {recursive: true});
      for (const extension of ['iset', 'fset', 'fset3']) {
        const data = Buffer.from(Module.FS.readFile('tempFilename.' + extension));
        if (data.length <= 100 || data.readInt32LE(0) <= 0) throw Error('No usable features in ' + extension);
        files[extension] = {bytes: data.length, header_count: data.readInt32LE(0), sha256: createHash('sha256').update(data).digest('hex')};
        fs.writeFileSync(output + '.' + extension, data);
      }
      fs.writeFileSync(output + '.json', JSON.stringify({generator: revision, flags, dpi: 72, width: png.width, height: png.height, input_sha256: createHash('sha256').update(bytes).digest('hex'), files}, null, 2) + '\n');
      console.log('Generated:', output, JSON.stringify(files));
    } finally { Module._free(pixels); Module._free(parameters); }
  }
};
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
  Module, require: createRequire(filename), module: {exports: {}}, __dirname: path.dirname(filename),
  process, Buffer, console, global: {}, setTimeout, clearTimeout, WebAssembly, TextDecoder, TextEncoder
}, {filename});
