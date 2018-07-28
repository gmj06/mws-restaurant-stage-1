//(function () {
  //  'use strict';
    import idb from 'idb';

    const dbPromise = idb.open('restaurant-proj', 1, upgradeDb => {
        switch(upgradeDb.oldVersion){
            case 0: 
                upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
            case 1:
            var restaurantStore = upgradeDb.transaction.objectStore("restaurants");
            restaurantStore.createIndex("restaurant-id", "id");
        }      
    });

    let staticCacheName = "restaurant-v2";

    const urlsToCache = [
        "/",
        "/index.html",
        "/restaurant.html",
        "/css/styles.css",
        "/js/dbhelper.js",
        "/js/main.js",
        "/js/restaurant_info.js",
        "/js/register_service_worker.js"
    ];

    self.addEventListener("install", event => {
        event.waitUntil(
            caches.open(staticCacheName).then(cache => {
                return cache
                    .addAll(urlsToCache)
                    .catch(err => {
                        console.log("Cache Open failed in service worker " + err);
                    })
            })
        );
    });


    self.addEventListener("activate", event => {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.filter(cacheName => {
                        return cacheName.startsWith("restaurant-") &&
                            cacheName != staticCacheName
                    }).map(cacheName => {
                        return caches.delete(cacheName);
                    })
                )
            })
        );
    });

    self.addEventListener("fetch", event => {
        const cacheRequest = event.request;  
        const requestUrl = new URL(event.request.URL);
        console.log("requestURL -", requestUrl);
        console.log("pathname - ", requestUrl.pathname);
        
        

        event.respondWith(
            caches.open(staticCacheName).then(cache => {
                return cache.match(event.request).then( response => {      
                  return response || fetch(event.request);      
                });      
            })        
            .catch(err => {
                console.log("err in fetch for " + event.request.url, err);
            })
        )
    });    
//})();