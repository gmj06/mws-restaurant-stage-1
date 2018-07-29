if (typeof idb === "undefined") {
    self.importScripts('js/idb.js');
}

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

// self.addEventListener("fetch", event => {
//     const cacheRequest = event.request;  
//     const requestUrl = new URL(event.request.url);
//     console.log("requestURL -", requestUrl);
//     console.log("pathname - ", requestUrl.pathname);



//     event.respondWith(
//         caches.open(staticCacheName).then(cache => {
//             return cache.match(event.request).then( response => {      
//               return response || fetch(event.request);      
//             });      
//         })        
//         .catch(err => {
//             console.log("err in fetch for " + event.request.url, err);
//         })
//     )
// });    



self.addEventListener("fetch", event => {
    let type = '';
    let requestUrl = new URL(event.request.url);

    if (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html') {
        type = '/index.html';
    } else if (requestUrl.pathname === '/restaurant.html') {
        type = '/restaurant.html';
    }

    if (type != '') {
        event.respondWith(
            caches.open(staticCacheName).then(cache => {
                return cache.match(type).then(response => {
                    console.log("type...", type);
                    console.log("response...", response);
                    let fetchPromise = fetch(type)
                        .then(ntwkResponse => {
                            cache.put(type, ntwkResponse.clone());
                            return ntwkResponse;
                        });
                    return response || ntwkResponse;
                });
            })
        );
    }
    else if (urlsToCache.includes(requestUrl.href) || urlsToCache.includes(requestUrl.pathname)) {
        event.respondWith(
            caches.open(staticCacheName).then(cache => {
                return cache.match(event.request).then(response => {
                    return response || fetch(event.request);
                });
            }).catch(err => {
                console.log("err in fetch for " + event.request.url, err);
            })
        )
    }
    //}
});


// const fetchData = (event) => {    
//     console.log("inside fetch from api", event.request.url);
//     event.respondWith(dbPromise.then(db => {
//         if (!db) return;
//         console.log("inside fetch from api 1");
//         return db.transaction("restaurants")
//             .objectStore("restaurants")
//             .getAll();
//     }).then(restaurants => {
//         console.log("inside fetch from api 1 then", restaurants);
//         return (restaurants) || fetch(event.request)
//             .then(res => res.json())
//             .then(json => {
//                 return dbPromise.then(db => {
//                     if (!db) return;
//                     const tx = db.transaction('restaurants', 'readwrite');
//                     const store = tx.objectStore('restaurants');
//                     json.forEach(restaurant => {
//                         store.put(restaurant);
//                     });
//                     return json;
//                 });
//             });
//     }).then(finalRes => {
//         return new Response(JSON.stringify(finalRes));
//     }).catch(error => {
//         return new Response("Error fetching restaurants data", { status: 500 });
//     }));
//};
