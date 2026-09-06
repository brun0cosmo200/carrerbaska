const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const scope = 'https://example.test/carrerbaska/';
const handlers = {};
const stores = new Map();
const keyOf = (request) => new URL(typeof request === 'string' ? request : request.url, scope).href;
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name);
    return {
      async addAll(urls) {
        for (const url of urls) {
          const filename = url === './' ? 'index.html' : url.replace(/^\.\//, '');
          assert(fs.existsSync(path.join(root, filename)), `Missing offline asset: ${url}`);
          data.set(keyOf(url), new Response(fs.readFileSync(path.join(root, filename))));
        }
      },
      async match(request) { return data.get(keyOf(request))?.clone(); },
      async put(request, response) { data.set(keyOf(request), response); }
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); }
};
let online = true;
vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
  self: { location: new URL(scope), registration: { scope }, clients: { async claim() {} },
    addEventListener(type, handler) { handlers[type] = handler; } },
  caches, URL, Response,
  async fetch() { if (!online) throw new Error('offline'); return new Response('network asset'); }
});
async function lifecycle(type) {
  let promise;
  handlers[type]({ waitUntil(value) { promise = value; } });
  await promise;
}
function request(relative, mode = 'cors') {
  let response;
  handlers.fetch({ request: { url: new URL(relative, scope).href, method: 'GET', mode, headers: new Headers() },
    respondWith(value) { response = value; } });
  return response;
}
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest')));
  assert.equal(manifest.start_url, './');
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(path.join(root, icon.src));
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  await caches.open('unrelated-app-cache');
  await caches.open('carrer-baska-old');
  await lifecycle('install');
  await lifecycle('activate');
  assert(stores.has('unrelated-app-cache'));
  assert(!stores.has('carrer-baska-old'));
  assert.equal(await (await request('img/times/boston-celtics.png')).text(), 'network asset');
  online = false;
  assert((await (await request('./', 'navigate')).text()).includes('Carreira Baska'));
  assert((await (await request('pro.js')).text()).length > 1000);
  assert.equal(await (await request('img/times/boston-celtics.png')).text(), 'network asset');
  assert.equal(request('https://another.test/asset.js'), undefined);
  console.log('OK: manifest, ícones, cache offline e isolamento de caches');
})().catch((error) => { console.error(error); process.exitCode = 1; });
