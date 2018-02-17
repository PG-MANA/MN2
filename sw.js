/*
Copyright 2018 PG_MANA
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

 https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
      return cache.addAll(["./", "./js/main.js", "img/icon-32x32.png", "img/icon-192x192.png", "https://taprix.org/css/main.css"]);
    }).then(()=>{this.disable_cache = false;}).catch((event) => {
      console.log("オフラインキャッシュの設定に失敗しました。");
      console.log(event);
      this.disable_cache = false;
    });
  }
  refresh() {
    caches.keys().then((cache_names) => {
      return Promise.all(
        cache_names.map((cache_name) => {
          if (cache_name != this.NAME) return caches.delete(cache_name); /*古いからいらない*/
        })
      );
    });
  }
  fetch(event) {
    if (!this.disable_cache) {
      event.respondWith(caches.open(this.NAME).then((cache)=>{
        return cache.match(event.request).then((response)=>{
          if (!navigator.onLine){
            if(response)return response;
            throw ("現在オフラインで、オフラインキャッシュに該当するデータが存在しませんでした。");
          }
          return fetch(event.request.clone()/*cacheがrequestを消費するらしい*/).then((response)=>{
            if(response.ok)cache.put(event.request,response.clone());
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
