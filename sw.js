/*License:See LICENSE.md*/

/*IEを完全駆逐した世界のコード(つまりIEはService Worker非対応)*/
/*letもアロー関数も使い放題*/
/*スコープの関係上jsディレクトリに入れられない*/

class CacheSystem {
  constructor() {
    this.NAME = "exam_cache_v1"; /*定数扱い*/ /*Webの構造が大きく変わったらこれのversionを上げる*/
    this.disable_cache = false;
  }
  init() {
    this.disable_cache = true;
    caches.open(this.NAME).then((cache) => {
      return cache.addAll(["index.html", "js/main.js", "config/json/config.json", "config/img/icon-32x32.png", "config/img/icon-192x192.png", "css/light.css"]);
    }).then(() => {
      this.disable_cache = false;
    }).catch((event) => {
      console.log("オフラインキャッシュの設定に失敗しました。");
      console.log(event);
      this.disable_cache = false;
    });
  }
  refresh() {
    caches.keys().then((cache_names) => {
      return Promise.all(
        cache_names.map((cache_name) => {
          if (cache_name !== this.NAME) return caches.delete(cache_name); /*古いからいらない*/
        })
      );
    });
  }
  fetch(event) {
    if (!this.disable_cache) {
      event.respondWith(caches.open(this.NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (!navigator.onLine) {
            if (response) return response;
            throw ("現在オフラインで、オフラインキャッシュに該当するデータが存在しませんでした。");
          }
          return fetch(event.request.clone() /*cacheがrequestを消費するらしい*/ ).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        });
      }));
    } else {
      fetch(event.request);
    }
  }
}

let cache_system = new CacheSystem();

self.addEventListener("install", (event) => {
  event.waitUntil(cache_system.init());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(cache_system.refresh());
});

self.addEventListener("fetch", (event) => {
  event.waitUntil(cache_system.fetch(event));
})
