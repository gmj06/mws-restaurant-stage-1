//import idb from './idb.js';

const port = 1337; // Change this to your server port
const OBJECTSTORE = 'restaurants';
let restaurantNeighborhoods;
let restaurantCuisines;
/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return `http://localhost:${port}/restaurants`;
  }

  static openIDB() {
    if (!navigator.serviceWorker) return Promise.resolve();

    // make sure IndexdDB is supported
    if (!self.indexedDB) reject("Uh oh, IndexedDB is NOT supported in this browser!");
    // if( 'function' === typeof importScripts || (typeof idb === "undefined") ) {
    //       importScripts('js/idb.js');
    // }

    return idb.open('restaurants', 1, function (upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore(OBJECTSTORE, { keyPath: 'id' });
        case 1:
          {
            var store = upgradeDb.transaction.objectStore(OBJECTSTORE, { keyPath: 'id' });
            store.createIndex('by-id', 'id');
          }
      }
    });
  }

  static insertIntoIDB(data) {
    return DBHelper.openIDB().then(function (db) {
      if (!db) return;

      var tx = db.transaction(OBJECTSTORE, 'readwrite');
      var store = tx.objectStore(OBJECTSTORE);
      data.forEach(restaurant => {
        store.put(restaurant);
      });
      return tx.complete;
    });
  }

  static fetchFromAPIInsertIntoIDB() {
    return fetch(DBHelper.DATABASE_URL).then(response => {
      return response.json();
    }).then(DBHelper.insertIntoIDB);
  }

  // static fetchFromAPIInsertIntoIDB() {
  //   return fetch(DBHelper.DATABASE_URL, { method: 'GET' })
  //     .then(response => {
  //       return JSON.parse(response).then(restaurants => {
  //         insertIntoIDB(restaurants);
  //         console.log("fetchFromAPIInsertIntoIDB", restaurants);
  //         return restaurants;
  //       });
  //     })
  // };

  static fetchFromIDB() {
    return DBHelper.openIDB().then(db => {
      if (!db) return;
      var store = db.transaction(OBJECTSTORE).objectStore(OBJECTSTORE);
      console.log("fetchFromIDB", store.getAll());
      return store.getAll();
    });
  }

  /**
   * Fetch all restaurants.
   */

  static fetchRestaurants(callback) {
    return DBHelper.fetchFromIDB().then(restaurants => {
      if (restaurants.length > 0) {
        return Promise.resolve(restaurants);
      } else {
        return DBHelper.fetchFromAPIInsertIntoIDB();
      }
    }).then(restaurants => {
      console.log("restaurants...", restaurants);
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      restaurantNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);

      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      restaurantCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
      callback(null, restaurants);
    }).catch(error => {
      callback(error, null);
    });

    // fetch(DBHelper.DATABASE_URL, { method: 'GET' })
    //   .then(response => {
    //     response.json().then(restaurants => {
    //       console.log("restaurants using fetch api", restaurants);
    //       callback(null, restaurants);
    //     });
    //   })
    //   .catch(error => {
    //     callback(`Request failed. Returned status of ${error}`, null);
    //   });


    // let xhr = new XMLHttpRequest();
    // xhr.open('GET', DBHelper.DATABASE_URL);
    // xhr.onload = () => {
    //   if (xhr.status === 200) { // Got a success response from server!
    //     const json = JSON.parse(xhr.responseText);
    //     const restaurants = json.restaurants;
    //     callback(null, restaurants);
    //   } else { // Oops!. Got an error from server.
    //     const error = (`Request failed. Returned status of ${xhr.status}`);
    //     callback(error, null);
    //   }
    // };
    // xhr.send();
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // let fetchURL = DBHelper.DATABASE_URL + "/" + id;
    // fetch(fetchURL, { method: 'GET'})
    // .then(response => {
    //    response.json().then(restaurant => {
    //      console.log("fetching restaurant by id using fetch api", restaurant);
    //      callback(null, restaurant);
    //    });
    // })
    // .catch(error => {       
    //    callback(`Request failed. Returned status of ${error}`, null);
    // });

    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          // Got the restaurant
          callback(null, restaurant);
        } else {
          // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    if (restaurantCuisines) {
      callback(null, restaurantCuisines);
      return;
    }
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    if (restaurantNeighborhoods) {
      callback(null, restaurantNeighborhoods);
      return;
    }
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./app/restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, type) {
    return `/app/img/${type}/${restaurant.id}.jpg`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

}
'use strict';

(function () {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function (resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function (value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function (prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function () {
          return this[targetProp][prop];
        },
        set: function (val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', ['name', 'keyPath', 'multiEntry', 'unique']);

  proxyRequestMethods(Index, '_index', IDBIndex, ['get', 'getKey', 'getAll', 'getAllKeys', 'count']);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, ['openCursor', 'openKeyCursor']);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', ['direction', 'key', 'primaryKey', 'value']);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, ['update', 'delete']);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function () {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function () {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function (value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function () {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function () {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, ['put', 'add', 'delete', 'clear', 'get', 'getAll', 'getKey', 'getAllKeys', 'count']);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, ['deleteIndex']);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function (resolve, reject) {
      idbTransaction.oncomplete = function () {
        resolve();
      };
      idbTransaction.onerror = function () {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function () {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function () {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', ['objectStoreNames', 'mode']);

  proxyMethods(Transaction, '_tx', IDBTransaction, ['abort']);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function () {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', ['name', 'version', 'objectStoreNames']);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, ['deleteObjectStore', 'close']);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function () {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', ['name', 'version', 'objectStoreNames']);

  proxyMethods(DB, '_db', IDBDatabase, ['close']);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function (funcName) {
    [ObjectStore, Index].forEach(function (Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function () {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function (Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function (query, count) {
      var instance = this;
      var items = [];

      return new Promise(function (resolve) {
        instance.iterateCursor(query, function (cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function (name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function (event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function (db) {
        return new DB(db);
      });
    },
    delete: function (name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  } else {
    self.idb = exp;
  }
})();
let restaurants, neighborhoods, cuisines;
var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  if (restaurants.length === 0) {
    const span = document.createElement('span');
    span.classList = ["text-danger", "font-weight-bold"];
    span.textContent = "NO RESTAURANT(s) FOUND";
    ul.append(span);
  } else {
    restaurants.forEach(restaurant => {
      ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
  }
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = restaurant => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  const imageurl = DBHelper.imageUrlForRestaurant(restaurant, "tiles");
  const imgparts = imageurl.split(".");
  const imgurl1x = imgparts[0] + "-350w_1x." + imgparts[1];
  const imgurl2x = imgparts[0] + "-700w_2x." + imgparts[1];
  image.src = imgurl1x;
  image.srcset = `${imgurl1x} 350w, ${imgurl2x} 700w`;
  image.alt = restaurant.name + " tile image";
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.type = "button";
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
(function () {
    'use strict';

    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.register("service_worker.js").then(reg => {
        console.log("Service Worker Registered Successfully");
    }).catch(err => {
        console.log("Failed to register Service Worker, try again later", err);
    });
})();
let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = callback => {
  if (self.restaurant) {
    // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) {
    // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      // DBHelper.fetchRestaurants((error, restaurant), id => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  const imageurl = DBHelper.imageUrlForRestaurant(restaurant, "banners");
  const imgparts = imageurl.split(".");
  const imgurl1x = imgparts[0] + "-500w_1x." + imgparts[1];
  const imgurl2x = imgparts[0] + "-800w_2x." + imgparts[1];
  image.src = imgurl1x;
  image.srcset = `${imgurl1x} 500w, ${imgurl2x} 800w`;
  image.alt = restaurant.name + " banner image";

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key.trim();
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key].trim();
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = review => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiaGVscGVyLmpzIiwiaWRiLmpzIiwibWFpbi5qcyIsInJlZ2lzdGVyX3NlcnZpY2Vfd29ya2VyLmpzIiwicmVzdGF1cmFudF9pbmZvLmpzIl0sIm5hbWVzIjpbInBvcnQiLCJPQkpFQ1RTVE9SRSIsInJlc3RhdXJhbnROZWlnaGJvcmhvb2RzIiwicmVzdGF1cmFudEN1aXNpbmVzIiwiREJIZWxwZXIiLCJEQVRBQkFTRV9VUkwiLCJvcGVuSURCIiwibmF2aWdhdG9yIiwic2VydmljZVdvcmtlciIsIlByb21pc2UiLCJyZXNvbHZlIiwic2VsZiIsImluZGV4ZWREQiIsInJlamVjdCIsImlkYiIsIm9wZW4iLCJ1cGdyYWRlRGIiLCJvbGRWZXJzaW9uIiwiY3JlYXRlT2JqZWN0U3RvcmUiLCJrZXlQYXRoIiwic3RvcmUiLCJ0cmFuc2FjdGlvbiIsIm9iamVjdFN0b3JlIiwiY3JlYXRlSW5kZXgiLCJpbnNlcnRJbnRvSURCIiwiZGF0YSIsInRoZW4iLCJkYiIsInR4IiwiZm9yRWFjaCIsInJlc3RhdXJhbnQiLCJwdXQiLCJjb21wbGV0ZSIsImZldGNoRnJvbUFQSUluc2VydEludG9JREIiLCJmZXRjaCIsInJlc3BvbnNlIiwianNvbiIsImZldGNoRnJvbUlEQiIsImNvbnNvbGUiLCJsb2ciLCJnZXRBbGwiLCJmZXRjaFJlc3RhdXJhbnRzIiwiY2FsbGJhY2siLCJyZXN0YXVyYW50cyIsImxlbmd0aCIsIm5laWdoYm9yaG9vZHMiLCJtYXAiLCJ2IiwiaSIsIm5laWdoYm9yaG9vZCIsImZpbHRlciIsImluZGV4T2YiLCJjdWlzaW5lcyIsImN1aXNpbmVfdHlwZSIsImNhdGNoIiwiZXJyb3IiLCJmZXRjaFJlc3RhdXJhbnRCeUlkIiwiaWQiLCJmaW5kIiwiciIsImZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZSIsImN1aXNpbmUiLCJyZXN1bHRzIiwiZmV0Y2hSZXN0YXVyYW50QnlOZWlnaGJvcmhvb2QiLCJmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmVBbmROZWlnaGJvcmhvb2QiLCJmZXRjaE5laWdoYm9yaG9vZHMiLCJ1bmlxdWVOZWlnaGJvcmhvb2RzIiwiZmV0Y2hDdWlzaW5lcyIsInVuaXF1ZUN1aXNpbmVzIiwidXJsRm9yUmVzdGF1cmFudCIsImltYWdlVXJsRm9yUmVzdGF1cmFudCIsInR5cGUiLCJtYXBNYXJrZXJGb3JSZXN0YXVyYW50IiwibWFya2VyIiwiZ29vZ2xlIiwibWFwcyIsIk1hcmtlciIsInBvc2l0aW9uIiwibGF0bG5nIiwidGl0bGUiLCJuYW1lIiwidXJsIiwiYW5pbWF0aW9uIiwiQW5pbWF0aW9uIiwiRFJPUCIsInRvQXJyYXkiLCJhcnIiLCJBcnJheSIsInByb3RvdHlwZSIsInNsaWNlIiwiY2FsbCIsInByb21pc2lmeVJlcXVlc3QiLCJyZXF1ZXN0Iiwib25zdWNjZXNzIiwicmVzdWx0Iiwib25lcnJvciIsInByb21pc2lmeVJlcXVlc3RDYWxsIiwib2JqIiwibWV0aG9kIiwiYXJncyIsInAiLCJhcHBseSIsInByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsIiwidmFsdWUiLCJDdXJzb3IiLCJwcm94eVByb3BlcnRpZXMiLCJQcm94eUNsYXNzIiwidGFyZ2V0UHJvcCIsInByb3BlcnRpZXMiLCJwcm9wIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJnZXQiLCJzZXQiLCJ2YWwiLCJwcm94eVJlcXVlc3RNZXRob2RzIiwiQ29uc3RydWN0b3IiLCJhcmd1bWVudHMiLCJwcm94eU1ldGhvZHMiLCJwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzIiwiSW5kZXgiLCJpbmRleCIsIl9pbmRleCIsIklEQkluZGV4IiwiY3Vyc29yIiwiX2N1cnNvciIsIl9yZXF1ZXN0IiwiSURCQ3Vyc29yIiwibWV0aG9kTmFtZSIsIk9iamVjdFN0b3JlIiwiX3N0b3JlIiwiSURCT2JqZWN0U3RvcmUiLCJUcmFuc2FjdGlvbiIsImlkYlRyYW5zYWN0aW9uIiwiX3R4Iiwib25jb21wbGV0ZSIsIm9uYWJvcnQiLCJJREJUcmFuc2FjdGlvbiIsIlVwZ3JhZGVEQiIsIl9kYiIsIklEQkRhdGFiYXNlIiwiREIiLCJmdW5jTmFtZSIsInJlcGxhY2UiLCJuYXRpdmVPYmplY3QiLCJxdWVyeSIsImNvdW50IiwiaW5zdGFuY2UiLCJpdGVtcyIsIml0ZXJhdGVDdXJzb3IiLCJwdXNoIiwidW5kZWZpbmVkIiwiY29udGludWUiLCJleHAiLCJ2ZXJzaW9uIiwidXBncmFkZUNhbGxiYWNrIiwib251cGdyYWRlbmVlZGVkIiwiZXZlbnQiLCJkZWxldGUiLCJtb2R1bGUiLCJleHBvcnRzIiwiZGVmYXVsdCIsIm1hcmtlcnMiLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJmaWxsTmVpZ2hib3Job29kc0hUTUwiLCJzZWxlY3QiLCJnZXRFbGVtZW50QnlJZCIsIm9wdGlvbiIsImNyZWF0ZUVsZW1lbnQiLCJpbm5lckhUTUwiLCJhcHBlbmQiLCJmaWxsQ3Vpc2luZXNIVE1MIiwid2luZG93IiwiaW5pdE1hcCIsImxvYyIsImxhdCIsImxuZyIsIk1hcCIsInpvb20iLCJjZW50ZXIiLCJzY3JvbGx3aGVlbCIsInVwZGF0ZVJlc3RhdXJhbnRzIiwiY1NlbGVjdCIsIm5TZWxlY3QiLCJjSW5kZXgiLCJzZWxlY3RlZEluZGV4IiwibkluZGV4IiwicmVzZXRSZXN0YXVyYW50cyIsImZpbGxSZXN0YXVyYW50c0hUTUwiLCJ1bCIsIm0iLCJzZXRNYXAiLCJzcGFuIiwiY2xhc3NMaXN0IiwidGV4dENvbnRlbnQiLCJjcmVhdGVSZXN0YXVyYW50SFRNTCIsImFkZE1hcmtlcnNUb01hcCIsImxpIiwiaW1hZ2UiLCJjbGFzc05hbWUiLCJpbWFnZXVybCIsImltZ3BhcnRzIiwic3BsaXQiLCJpbWd1cmwxeCIsImltZ3VybDJ4Iiwic3JjIiwic3Jjc2V0IiwiYWx0IiwiYWRkcmVzcyIsIm1vcmUiLCJocmVmIiwiYWRkTGlzdGVuZXIiLCJsb2NhdGlvbiIsInJlZ2lzdGVyIiwicmVnIiwiZXJyIiwiZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCIsImZpbGxCcmVhZGNydW1iIiwiZ2V0UGFyYW1ldGVyQnlOYW1lIiwiZmlsbFJlc3RhdXJhbnRIVE1MIiwib3BlcmF0aW5nX2hvdXJzIiwiZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwiLCJmaWxsUmV2aWV3c0hUTUwiLCJvcGVyYXRpbmdIb3VycyIsImhvdXJzIiwia2V5Iiwicm93IiwiZGF5IiwidHJpbSIsImFwcGVuZENoaWxkIiwidGltZSIsInJldmlld3MiLCJjb250YWluZXIiLCJub1Jldmlld3MiLCJyZXZpZXciLCJjcmVhdGVSZXZpZXdIVE1MIiwiZGF0ZSIsInJhdGluZyIsImNvbW1lbnRzIiwiYnJlYWRjcnVtYiIsInJlZ2V4IiwiUmVnRXhwIiwiZXhlYyIsImRlY29kZVVSSUNvbXBvbmVudCJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUEsTUFBTUEsT0FBTyxJQUFiLEMsQ0FBa0I7QUFDbEIsTUFBTUMsY0FBYyxhQUFwQjtBQUNBLElBQUlDLHVCQUFKO0FBQ0EsSUFBSUMsa0JBQUo7QUFDQTs7O0FBR0EsTUFBTUMsUUFBTixDQUFlOztBQUViOzs7O0FBSUEsYUFBV0MsWUFBWCxHQUEwQjtBQUN4QixXQUFRLG9CQUFtQkwsSUFBSyxjQUFoQztBQUNEOztBQUVELFNBQU9NLE9BQVAsR0FBaUI7QUFDZixRQUFJLENBQUNDLFVBQVVDLGFBQWYsRUFBOEIsT0FBT0MsUUFBUUMsT0FBUixFQUFQOztBQUU5QjtBQUNBLFFBQUksQ0FBQ0MsS0FBS0MsU0FBVixFQUFxQkMsT0FBTyxvREFBUDtBQUNyQjtBQUNBO0FBQ0E7O0FBRUEsV0FBT0MsSUFBSUMsSUFBSixDQUFTLGFBQVQsRUFBd0IsQ0FBeEIsRUFBMkIsVUFBVUMsU0FBVixFQUFxQjtBQUNyRCxjQUFRQSxVQUFVQyxVQUFsQjtBQUNFLGFBQUssQ0FBTDtBQUNFRCxvQkFBVUUsaUJBQVYsQ0FBNEJqQixXQUE1QixFQUF5QyxFQUFFa0IsU0FBUyxJQUFYLEVBQXpDO0FBQ0YsYUFBSyxDQUFMO0FBQVE7QUFDTixnQkFBSUMsUUFBUUosVUFBVUssV0FBVixDQUFzQkMsV0FBdEIsQ0FBa0NyQixXQUFsQyxFQUEr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WDtBQUNBNkIsS0FBRzVCLFNBQUgsR0FBZTVJLFdBQVdrRCxJQUExQjtBQUNBZ0ssYUFBV1YsV0FBWCxDQUF1QmhDLEVBQXZCO0FBQ0QsQ0FMRDs7QUFPQTs7O0FBR0FxQixxQkFBcUIsQ0FBQzNJLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQ2xDLE1BQUksQ0FBQ0EsR0FBTCxFQUNFQSxNQUFNNEYsT0FBT3dDLFFBQVAsQ0FBZ0JGLElBQXRCO0FBQ0ZuSSxTQUFPQSxLQUFLK0QsT0FBTCxDQUFhLFNBQWIsRUFBd0IsTUFBeEIsQ0FBUDtBQUNBLFFBQU1rRyxRQUFRLElBQUlDLE1BQUosQ0FBWSxPQUFNbEssSUFBSyxtQkFBdkIsQ0FBZDtBQUFBLFFBQ0VsQixVQUFVbUwsTUFBTUUsSUFBTixDQUFXbEssR0FBWCxDQURaO0FBRUEsTUFBSSxDQUFDbkIsT0FBTCxFQUNFLE9BQU8sSUFBUDtBQUNGLE1BQUksQ0FBQ0EsUUFBUSxDQUFSLENBQUwsRUFDRSxPQUFPLEVBQVA7QUFDRixTQUFPc0wsbUJBQW1CdEwsUUFBUSxDQUFSLEVBQVdpRixPQUFYLENBQW1CLEtBQW5CLEVBQTBCLEdBQTFCLENBQW5CLENBQVA7QUFDRCxDQVhEIiwiZmlsZSI6ImFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vaW1wb3J0IGlkYiBmcm9tICcuL2lkYi5qcyc7XHJcblxyXG5jb25zdCBwb3J0ID0gMTMzNyAvLyBDaGFuZ2UgdGhpcyB0byB5b3VyIHNlcnZlciBwb3J0XHJcbmNvbnN0IE9CSkVDVFNUT1JFID0gJ3Jlc3RhdXJhbnRzJztcclxubGV0IHJlc3RhdXJhbnROZWlnaGJvcmhvb2RzO1xyXG5sZXQgcmVzdGF1cmFudEN1aXNpbmVzO1xyXG4vKipcclxuICogQ29tbW9uIGRhdGFiYXNlIGhlbHBlciBmdW5jdGlvbnMuXHJcbiAqL1xyXG5jbGFzcyBEQkhlbHBlciB7XHJcblxyXG4gIC8qKlxyXG4gICAqIERhdGFiYXNlIFVSTC5cclxuICAgKiBDaGFuZ2UgdGhpcyB0byByZXN0YXVyYW50cy5qc29uIGZpbGUgbG9jYXRpb24gb24geW91ciBzZXJ2ZXIuXHJcbiAgICovXHJcbiAgc3RhdGljIGdldCBEQVRBQkFTRV9VUkwoKSB7XHJcbiAgICByZXR1cm4gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fS9yZXN0YXVyYW50c2A7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgb3BlbklEQigpIHtcclxuICAgIGlmICghbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbiAgICAvLyBtYWtlIHN1cmUgSW5kZXhkREIgaXMgc3VwcG9ydGVkXHJcbiAgICBpZiAoIXNlbGYuaW5kZXhlZERCKSByZWplY3QoXCJVaCBvaCwgSW5kZXhlZERCIGlzIE5PVCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyIVwiKTtcclxuICAgIC8vIGlmKCAnZnVuY3Rpb24nID09PSB0eXBlb2YgaW1wb3J0U2NyaXB0cyB8fCAodHlwZW9mIGlkYiA9PT0gXCJ1bmRlZmluZWRcIikgKSB7XHJcbiAgICAvLyAgICAgICBpbXBvcnRTY3JpcHRzKCdqcy9pZGIuanMnKTtcclxuICAgIC8vIH1cclxuXHJcbiAgICByZXR1cm4gaWRiLm9wZW4oJ3Jlc3RhdXJhbnRzJywgMSwgZnVuY3Rpb24gKHVwZ3JhZGVEYikge1xyXG4gICAgICBzd2l0Y2ggKHVwZ3JhZGVEYi5vbGRWZXJzaW9uKSB7XHJcbiAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgdXBncmFkZURiLmNyZWF0ZU9iamVjdFN0b3JlKE9CSkVDVFNUT1JFLCB7IGtleVBhdGg6ICdpZCcgfSk7XHJcbiAgICAgICAgY2FzZSAxOiB7XHJcbiAgICAgICAgICB2YXIgc3RvcmUgPSB1cGdyYWRlRGIudHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoT0JKRUNUU1RPUkUsIHsga2V5UGF0aDogJ2lkJyB9KTtcclxuICAgICAgICAgIHN0b3JlLmNyZWF0ZUluZGV4KCdieS1pZCcsICdpZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgaW5zZXJ0SW50b0lEQihkYXRhKSB7XHJcbiAgICByZXR1cm4gREJIZWxwZXIub3BlbklEQigpLnRoZW4oZnVuY3Rpb24gKGRiKSB7XHJcbiAgICAgIGlmICghZGIpIHJldHVybjtcclxuXHJcbiAgICAgIHZhciB0eCA9IGRiLnRyYW5zYWN0aW9uKE9CSkVDVFNUT1JFLCAncmVhZHdyaXRlJyk7XHJcbiAgICAgIHZhciBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKE9CSkVDVFNUT1JFKTtcclxuICAgICAgZGF0YS5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgICAgIHN0b3JlLnB1dChyZXN0YXVyYW50KTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiB0eC5jb21wbGV0ZTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuICBzdGF0aWMgZmV0Y2hGcm9tQVBJSW5zZXJ0SW50b0lEQigpIHtcclxuICAgIHJldHVybiBmZXRjaChEQkhlbHBlci5EQVRBQkFTRV9VUkwpXHJcbiAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpXHJcbiAgICAgIH0pLnRoZW4oREJIZWxwZXIuaW5zZXJ0SW50b0lEQik7XHJcbiAgfTtcclxuXHJcbiAgLy8gc3RhdGljIGZldGNoRnJvbUFQSUluc2VydEludG9JREIoKSB7XHJcbiAgLy8gICByZXR1cm4gZmV0Y2goREJIZWxwZXIuREFUQUJBU0VfVVJMLCB7IG1ldGhvZDogJ0dFVCcgfSlcclxuICAvLyAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gIC8vICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3BvbnNlKS50aGVuKHJlc3RhdXJhbnRzID0+IHtcclxuICAvLyAgICAgICAgIGluc2VydEludG9JREIocmVzdGF1cmFudHMpO1xyXG4gIC8vICAgICAgICAgY29uc29sZS5sb2coXCJmZXRjaEZyb21BUElJbnNlcnRJbnRvSURCXCIsIHJlc3RhdXJhbnRzKTtcclxuICAvLyAgICAgICAgIHJldHVybiByZXN0YXVyYW50cztcclxuICAvLyAgICAgICB9KTtcclxuICAvLyAgICAgfSlcclxuICAvLyB9O1xyXG5cclxuICBzdGF0aWMgZmV0Y2hGcm9tSURCKCkge1xyXG4gICAgcmV0dXJuIERCSGVscGVyLm9wZW5JREIoKS50aGVuKGRiID0+IHtcclxuICAgICAgaWYgKCFkYikgcmV0dXJuO1xyXG4gICAgICB2YXIgc3RvcmUgPSBkYi50cmFuc2FjdGlvbihPQkpFQ1RTVE9SRSkub2JqZWN0U3RvcmUoT0JKRUNUU1RPUkUpO1xyXG4gICAgICBjb25zb2xlLmxvZyhcImZldGNoRnJvbUlEQlwiLCBzdG9yZS5nZXRBbGwoKSk7XHJcbiAgICAgIHJldHVybiBzdG9yZS5nZXRBbGwoKTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhbGwgcmVzdGF1cmFudHMuXHJcbiAgICovXHJcblxyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRzKGNhbGxiYWNrKSB7XHJcbiAgICByZXR1cm4gREJIZWxwZXIuZmV0Y2hGcm9tSURCKCkudGhlbihyZXN0YXVyYW50cyA9PiB7XHJcbiAgICAgIGlmIChyZXN0YXVyYW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN0YXVyYW50cyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIERCSGVscGVyLmZldGNoRnJvbUFQSUluc2VydEludG9JREIoKTtcclxuICAgICAgfVxyXG4gICAgfSkudGhlbihyZXN0YXVyYW50cyA9PiB7ICAgXHJcbiAgICAgIGNvbnNvbGUubG9nKFwicmVzdGF1cmFudHMuLi5cIixyZXN0YXVyYW50cyk7XHJcbiAgICAgIGNvbnN0IG5laWdoYm9yaG9vZHMgPSByZXN0YXVyYW50cy5tYXAoKHYsIGkpID0+IHJlc3RhdXJhbnRzW2ldLm5laWdoYm9yaG9vZCk7XHJcbiAgICAgIHJlc3RhdXJhbnROZWlnaGJvcmhvb2RzID0gbmVpZ2hib3Job29kcy5maWx0ZXIoKHYsIGkpID0+IG5laWdoYm9yaG9vZHMuaW5kZXhPZih2KSA9PSBpKTtcclxuXHJcbiAgICAgIGNvbnN0IGN1aXNpbmVzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5jdWlzaW5lX3R5cGUpO1xyXG4gICAgICByZXN0YXVyYW50Q3Vpc2luZXMgPSBjdWlzaW5lcy5maWx0ZXIoKHYsIGkpID0+IGN1aXNpbmVzLmluZGV4T2YodikgPT0gaSk7XHJcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnRzKTtcclxuICAgIH0pLmNhdGNoKGVycm9yID0+IHtcclxuICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgfSk7XHJcblxyXG5cclxuXHJcbiAgICAvLyBmZXRjaChEQkhlbHBlci5EQVRBQkFTRV9VUkwsIHsgbWV0aG9kOiAnR0VUJyB9KVxyXG4gICAgLy8gICAudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAvLyAgICAgcmVzcG9uc2UuanNvbigpLnRoZW4ocmVzdGF1cmFudHMgPT4ge1xyXG4gICAgLy8gICAgICAgY29uc29sZS5sb2coXCJyZXN0YXVyYW50cyB1c2luZyBmZXRjaCBhcGlcIiwgcmVzdGF1cmFudHMpO1xyXG4gICAgLy8gICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudHMpO1xyXG4gICAgLy8gICAgIH0pO1xyXG4gICAgLy8gICB9KVxyXG4gICAgLy8gICAuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgLy8gICAgIGNhbGxiYWNrKGBSZXF1ZXN0IGZhaWxlZC4gUmV0dXJuZWQgc3RhdHVzIG9mICR7ZXJyb3J9YCwgbnVsbCk7XHJcbiAgICAvLyAgIH0pO1xyXG5cclxuXHJcbiAgICAvLyBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAvLyB4aHIub3BlbignR0VUJywgREJIZWxwZXIuREFUQUJBU0VfVVJMKTtcclxuICAgIC8vIHhoci5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAvLyAgIGlmICh4aHIuc3RhdHVzID09PSAyMDApIHsgLy8gR290IGEgc3VjY2VzcyByZXNwb25zZSBmcm9tIHNlcnZlciFcclxuICAgIC8vICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgIC8vICAgICBjb25zdCByZXN0YXVyYW50cyA9IGpzb24ucmVzdGF1cmFudHM7XHJcbiAgICAvLyAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudHMpO1xyXG4gICAgLy8gICB9IGVsc2UgeyAvLyBPb3BzIS4gR290IGFuIGVycm9yIGZyb20gc2VydmVyLlxyXG4gICAgLy8gICAgIGNvbnN0IGVycm9yID0gKGBSZXF1ZXN0IGZhaWxlZC4gUmV0dXJuZWQgc3RhdHVzIG9mICR7eGhyLnN0YXR1c31gKTtcclxuICAgIC8vICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAvLyAgIH1cclxuICAgIC8vIH07XHJcbiAgICAvLyB4aHIuc2VuZCgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYSByZXN0YXVyYW50IGJ5IGl0cyBJRC5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlJZChpZCwgY2FsbGJhY2spIHtcclxuICAgIC8vIGxldCBmZXRjaFVSTCA9IERCSGVscGVyLkRBVEFCQVNFX1VSTCArIFwiL1wiICsgaWQ7XHJcbiAgICAvLyBmZXRjaChmZXRjaFVSTCwgeyBtZXRob2Q6ICdHRVQnfSlcclxuICAgIC8vIC50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgIC8vICAgIHJlc3BvbnNlLmpzb24oKS50aGVuKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgLy8gICAgICBjb25zb2xlLmxvZyhcImZldGNoaW5nIHJlc3RhdXJhbnQgYnkgaWQgdXNpbmcgZmV0Y2ggYXBpXCIsIHJlc3RhdXJhbnQpO1xyXG4gICAgLy8gICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KTtcclxuICAgIC8vICAgIH0pO1xyXG4gICAgLy8gfSlcclxuICAgIC8vIC5jYXRjaChlcnJvciA9PiB7ICAgICAgIFxyXG4gICAgLy8gICAgY2FsbGJhY2soYFJlcXVlc3QgZmFpbGVkLiBSZXR1cm5lZCBzdGF0dXMgb2YgJHtlcnJvcn1gLCBudWxsKTtcclxuICAgIC8vIH0pO1xyXG5cclxuICAgIC8vIGZldGNoIGFsbCByZXN0YXVyYW50cyB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudHMoKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc3QgcmVzdGF1cmFudCA9IHJlc3RhdXJhbnRzLmZpbmQociA9PiByLmlkID09IGlkKTtcclxuICAgICAgICBpZiAocmVzdGF1cmFudCkgeyAvLyBHb3QgdGhlIHJlc3RhdXJhbnRcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQpO1xyXG4gICAgICAgIH0gZWxzZSB7IC8vIFJlc3RhdXJhbnQgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGRhdGFiYXNlXHJcbiAgICAgICAgICBjYWxsYmFjaygnUmVzdGF1cmFudCBkb2VzIG5vdCBleGlzdCcsIG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIGN1aXNpbmUgdHlwZSB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lKGN1aXNpbmUsIGNhbGxiYWNrKSB7XHJcbiAgICBpZihyZXN0YXVyYW50Q3Vpc2luZXMpe1xyXG4gICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50Q3Vpc2luZXMpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHMgIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEZpbHRlciByZXN0YXVyYW50cyB0byBoYXZlIG9ubHkgZ2l2ZW4gY3Vpc2luZSB0eXBlXHJcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3RhdXJhbnRzLmZpbHRlcihyID0+IHIuY3Vpc2luZV90eXBlID09IGN1aXNpbmUpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJlc3RhdXJhbnRzIGJ5IGEgbmVpZ2hib3Job29kIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaFJlc3RhdXJhbnRCeU5laWdoYm9yaG9vZChuZWlnaGJvcmhvb2QsIGNhbGxiYWNrKSB7XHJcbiAgICBpZihyZXN0YXVyYW50TmVpZ2hib3Job29kcyl7XHJcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnROZWlnaGJvcmhvb2RzKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEZpbHRlciByZXN0YXVyYW50cyB0byBoYXZlIG9ubHkgZ2l2ZW4gbmVpZ2hib3Job29kXHJcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3RhdXJhbnRzLmZpbHRlcihyID0+IHIubmVpZ2hib3Job29kID09IG5laWdoYm9yaG9vZCk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggcmVzdGF1cmFudHMgYnkgYSBjdWlzaW5lIGFuZCBhIG5laWdoYm9yaG9vZCB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lQW5kTmVpZ2hib3Job29kKGN1aXNpbmUsIG5laWdoYm9yaG9vZCwgY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcmVzdWx0cyA9IHJlc3RhdXJhbnRzXHJcbiAgICAgICAgaWYgKGN1aXNpbmUgIT0gJ2FsbCcpIHsgLy8gZmlsdGVyIGJ5IGN1aXNpbmVcclxuICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuY3Vpc2luZV90eXBlID09IGN1aXNpbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmVpZ2hib3Job29kICE9ICdhbGwnKSB7IC8vIGZpbHRlciBieSBuZWlnaGJvcmhvb2RcclxuICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcihyID0+IHIubmVpZ2hib3Job29kID09IG5laWdoYm9yaG9vZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCBuZWlnaGJvcmhvb2RzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaE5laWdoYm9yaG9vZHMoY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBHZXQgYWxsIG5laWdoYm9yaG9vZHMgZnJvbSBhbGwgcmVzdGF1cmFudHNcclxuICAgICAgICBjb25zdCBuZWlnaGJvcmhvb2RzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5uZWlnaGJvcmhvb2QpXHJcbiAgICAgICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgZnJvbSBuZWlnaGJvcmhvb2RzXHJcbiAgICAgICAgY29uc3QgdW5pcXVlTmVpZ2hib3Job29kcyA9IG5laWdoYm9yaG9vZHMuZmlsdGVyKCh2LCBpKSA9PiBuZWlnaGJvcmhvb2RzLmluZGV4T2YodikgPT0gaSlcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB1bmlxdWVOZWlnaGJvcmhvb2RzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhbGwgY3Vpc2luZXMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoQ3Vpc2luZXMoY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBHZXQgYWxsIGN1aXNpbmVzIGZyb20gYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgY29uc3QgY3Vpc2luZXMgPSByZXN0YXVyYW50cy5tYXAoKHYsIGkpID0+IHJlc3RhdXJhbnRzW2ldLmN1aXNpbmVfdHlwZSlcclxuICAgICAgICAvLyBSZW1vdmUgZHVwbGljYXRlcyBmcm9tIGN1aXNpbmVzXHJcbiAgICAgICAgY29uc3QgdW5pcXVlQ3Vpc2luZXMgPSBjdWlzaW5lcy5maWx0ZXIoKHYsIGkpID0+IGN1aXNpbmVzLmluZGV4T2YodikgPT0gaSlcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB1bmlxdWVDdWlzaW5lcyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBwYWdlIFVSTC5cclxuICAgKi9cclxuICBzdGF0aWMgdXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAuL2FwcC9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBpbWFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIGltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCB0eXBlKSB7XHJcbiAgICByZXR1cm4gKGAvYXBwL2ltZy8ke3R5cGV9LyR7cmVzdGF1cmFudC5pZH0uanBnYCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNYXAgbWFya2VyIGZvciBhIHJlc3RhdXJhbnQuXHJcbiAgICovXHJcbiAgc3RhdGljIG1hcE1hcmtlckZvclJlc3RhdXJhbnQocmVzdGF1cmFudCwgbWFwKSB7XHJcbiAgICBjb25zdCBtYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgICAgcG9zaXRpb246IHJlc3RhdXJhbnQubGF0bG5nLFxyXG4gICAgICB0aXRsZTogcmVzdGF1cmFudC5uYW1lLFxyXG4gICAgICB1cmw6IERCSGVscGVyLnVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCksXHJcbiAgICAgIG1hcDogbWFwLFxyXG4gICAgICBhbmltYXRpb246IGdvb2dsZS5tYXBzLkFuaW1hdGlvbi5EUk9QXHJcbiAgICB9XHJcbiAgICApO1xyXG4gICAgcmV0dXJuIG1hcmtlcjtcclxuICB9XHJcblxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcblxuKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiB0b0FycmF5KGFycikge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICB9O1xuXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHJlcXVlc3Q7XG4gICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3QgPSBvYmpbbWV0aG9kXS5hcHBseShvYmosIGFyZ3MpO1xuICAgICAgcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG5cbiAgICBwLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIHJldHVybiBwO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKTtcbiAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgcC5yZXF1ZXN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UHJvcGVydGllcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcm94eUNsYXNzLnByb3RvdHlwZSwgcHJvcCwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzW3RhcmdldFByb3BdW3Byb3BdO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlSZXF1ZXN0TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbCh0aGlzW3RhcmdldFByb3BdLCBwcm9wLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzW3RhcmdldFByb3BdW3Byb3BdLmFwcGx5KHRoaXNbdGFyZ2V0UHJvcF0sIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbCh0aGlzW3RhcmdldFByb3BdLCBwcm9wLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIEluZGV4KGluZGV4KSB7XG4gICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhJbmRleCwgJ19pbmRleCcsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdtdWx0aUVudHJ5JyxcbiAgICAndW5pcXVlJ1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKEluZGV4LCAnX2luZGV4JywgSURCSW5kZXgsIFtcbiAgICAnZ2V0JyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKEluZGV4LCAnX2luZGV4JywgSURCSW5kZXgsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIEN1cnNvcihjdXJzb3IsIHJlcXVlc3QpIHtcbiAgICB0aGlzLl9jdXJzb3IgPSBjdXJzb3I7XG4gICAgdGhpcy5fcmVxdWVzdCA9IHJlcXVlc3Q7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoQ3Vyc29yLCAnX2N1cnNvcicsIFtcbiAgICAnZGlyZWN0aW9uJyxcbiAgICAna2V5JyxcbiAgICAncHJpbWFyeUtleScsXG4gICAgJ3ZhbHVlJ1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKEN1cnNvciwgJ19jdXJzb3InLCBJREJDdXJzb3IsIFtcbiAgICAndXBkYXRlJyxcbiAgICAnZGVsZXRlJ1xuICBdKTtcblxuICAvLyBwcm94eSAnbmV4dCcgbWV0aG9kc1xuICBbJ2FkdmFuY2UnLCAnY29udGludWUnLCAnY29udGludWVQcmltYXJ5S2V5J10uZm9yRWFjaChmdW5jdGlvbihtZXRob2ROYW1lKSB7XG4gICAgaWYgKCEobWV0aG9kTmFtZSBpbiBJREJDdXJzb3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgIEN1cnNvci5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSB0aGlzO1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgY3Vyc29yLl9jdXJzb3JbbWV0aG9kTmFtZV0uYXBwbHkoY3Vyc29yLl9jdXJzb3IsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdChjdXJzb3IuX3JlcXVlc3QpLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIGN1cnNvci5fcmVxdWVzdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gT2JqZWN0U3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLl9zdG9yZSA9IHN0b3JlO1xuICB9XG5cbiAgT2JqZWN0U3RvcmUucHJvdG90eXBlLmNyZWF0ZUluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBJbmRleCh0aGlzLl9zdG9yZS5jcmVhdGVJbmRleC5hcHBseSh0aGlzLl9zdG9yZSwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgT2JqZWN0U3RvcmUucHJvdG90eXBlLmluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBJbmRleCh0aGlzLl9zdG9yZS5pbmRleC5hcHBseSh0aGlzLl9zdG9yZSwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ2luZGV4TmFtZXMnLFxuICAgICdhdXRvSW5jcmVtZW50J1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAncHV0JyxcbiAgICAnYWRkJyxcbiAgICAnZGVsZXRlJyxcbiAgICAnY2xlYXInLFxuICAgICdnZXQnLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnZGVsZXRlSW5kZXgnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFRyYW5zYWN0aW9uKGlkYlRyYW5zYWN0aW9uKSB7XG4gICAgdGhpcy5fdHggPSBpZGJUcmFuc2FjdGlvbjtcbiAgICB0aGlzLmNvbXBsZXRlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIFRyYW5zYWN0aW9uLnByb3RvdHlwZS5vYmplY3RTdG9yZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0U3RvcmUodGhpcy5fdHgub2JqZWN0U3RvcmUuYXBwbHkodGhpcy5fdHgsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhUcmFuc2FjdGlvbiwgJ190eCcsIFtcbiAgICAnb2JqZWN0U3RvcmVOYW1lcycsXG4gICAgJ21vZGUnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhUcmFuc2FjdGlvbiwgJ190eCcsIElEQlRyYW5zYWN0aW9uLCBbXG4gICAgJ2Fib3J0J1xuICBdKTtcblxuICBmdW5jdGlvbiBVcGdyYWRlREIoZGIsIG9sZFZlcnNpb24sIHRyYW5zYWN0aW9uKSB7XG4gICAgdGhpcy5fZGIgPSBkYjtcbiAgICB0aGlzLm9sZFZlcnNpb24gPSBvbGRWZXJzaW9uO1xuICAgIHRoaXMudHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24odHJhbnNhY3Rpb24pO1xuICB9XG5cbiAgVXBncmFkZURCLnByb3RvdHlwZS5jcmVhdGVPYmplY3RTdG9yZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0U3RvcmUodGhpcy5fZGIuY3JlYXRlT2JqZWN0U3RvcmUuYXBwbHkodGhpcy5fZGIsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhVcGdyYWRlREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFVwZ3JhZGVEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2RlbGV0ZU9iamVjdFN0b3JlJyxcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIERCKGRiKSB7XG4gICAgdGhpcy5fZGIgPSBkYjtcbiAgfVxuXG4gIERCLnByb3RvdHlwZS50cmFuc2FjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVHJhbnNhY3Rpb24odGhpcy5fZGIudHJhbnNhY3Rpb24uYXBwbHkodGhpcy5fZGIsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgLy8gQWRkIGN1cnNvciBpdGVyYXRvcnNcbiAgLy8gVE9ETzogcmVtb3ZlIHRoaXMgb25jZSBicm93c2VycyBkbyB0aGUgcmlnaHQgdGhpbmcgd2l0aCBwcm9taXNlc1xuICBbJ29wZW5DdXJzb3InLCAnb3BlbktleUN1cnNvciddLmZvckVhY2goZnVuY3Rpb24oZnVuY05hbWUpIHtcbiAgICBbT2JqZWN0U3RvcmUsIEluZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKENvbnN0cnVjdG9yKSB7XG4gICAgICAvLyBEb24ndCBjcmVhdGUgaXRlcmF0ZUtleUN1cnNvciBpZiBvcGVuS2V5Q3Vyc29yIGRvZXNuJ3QgZXhpc3QuXG4gICAgICBpZiAoIShmdW5jTmFtZSBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG5cbiAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5hdGl2ZU9iamVjdFtmdW5jTmFtZV0uYXBwbHkobmF0aXZlT2JqZWN0LCBhcmdzLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcG9seWZpbGwgZ2V0QWxsXG4gIFtJbmRleCwgT2JqZWN0U3RvcmVdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCkgcmV0dXJuO1xuICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihxdWVyeSwgY291bnQpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XG4gICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgaW5zdGFuY2UuaXRlcmF0ZUN1cnNvcihxdWVyeSwgZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoY291bnQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZXhwID0ge1xuICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdvcGVuJywgW25hbWUsIHZlcnNpb25dKTtcbiAgICAgIHZhciByZXF1ZXN0ID0gcC5yZXF1ZXN0O1xuXG4gICAgICBpZiAocmVxdWVzdCkge1xuICAgICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgICAgdXBncmFkZUNhbGxiYWNrKG5ldyBVcGdyYWRlREIocmVxdWVzdC5yZXN1bHQsIGV2ZW50Lm9sZFZlcnNpb24sIHJlcXVlc3QudHJhbnNhY3Rpb24pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gICAgbW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IG1vZHVsZS5leHBvcnRzO1xuICB9XG4gIGVsc2Uge1xuICAgIHNlbGYuaWRiID0gZXhwO1xuICB9XG59KCkpO1xuIiwibGV0IHJlc3RhdXJhbnRzLFxyXG4gIG5laWdoYm9yaG9vZHMsXHJcbiAgY3Vpc2luZXNcclxudmFyIG1hcFxyXG52YXIgbWFya2VycyA9IFtdXHJcblxyXG4vKipcclxuICogRmV0Y2ggbmVpZ2hib3Job29kcyBhbmQgY3Vpc2luZXMgYXMgc29vbiBhcyB0aGUgcGFnZSBpcyBsb2FkZWQuXHJcbiAqL1xyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKGV2ZW50KSA9PiB7XHJcbiAgZmV0Y2hOZWlnaGJvcmhvb2RzKCk7XHJcbiAgZmV0Y2hDdWlzaW5lcygpO1xyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBhbGwgbmVpZ2hib3Job29kcyBhbmQgc2V0IHRoZWlyIEhUTUwuXHJcbiAqL1xyXG5mZXRjaE5laWdoYm9yaG9vZHMgPSAoKSA9PiB7XHJcbiAgREJIZWxwZXIuZmV0Y2hOZWlnaGJvcmhvb2RzKChlcnJvciwgbmVpZ2hib3Job29kcykgPT4ge1xyXG4gICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvclxyXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNlbGYubmVpZ2hib3Job29kcyA9IG5laWdoYm9yaG9vZHM7XHJcbiAgICAgIGZpbGxOZWlnaGJvcmhvb2RzSFRNTCgpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogU2V0IG5laWdoYm9yaG9vZHMgSFRNTC5cclxuICovXHJcbmZpbGxOZWlnaGJvcmhvb2RzSFRNTCA9IChuZWlnaGJvcmhvb2RzID0gc2VsZi5uZWlnaGJvcmhvb2RzKSA9PiB7XHJcbiAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25laWdoYm9yaG9vZHMtc2VsZWN0Jyk7XHJcbiAgbmVpZ2hib3Job29kcy5mb3JFYWNoKG5laWdoYm9yaG9vZCA9PiB7XHJcbiAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgIG9wdGlvbi5pbm5lckhUTUwgPSBuZWlnaGJvcmhvb2Q7XHJcbiAgICBvcHRpb24udmFsdWUgPSBuZWlnaGJvcmhvb2Q7XHJcbiAgICBzZWxlY3QuYXBwZW5kKG9wdGlvbik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBhbGwgY3Vpc2luZXMgYW5kIHNldCB0aGVpciBIVE1MLlxyXG4gKi9cclxuZmV0Y2hDdWlzaW5lcyA9ICgpID0+IHtcclxuICBEQkhlbHBlci5mZXRjaEN1aXNpbmVzKChlcnJvciwgY3Vpc2luZXMpID0+IHtcclxuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2VsZi5jdWlzaW5lcyA9IGN1aXNpbmVzO1xyXG4gICAgICBmaWxsQ3Vpc2luZXNIVE1MKCk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXQgY3Vpc2luZXMgSFRNTC5cclxuICovXHJcbmZpbGxDdWlzaW5lc0hUTUwgPSAoY3Vpc2luZXMgPSBzZWxmLmN1aXNpbmVzKSA9PiB7XHJcbiAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2N1aXNpbmVzLXNlbGVjdCcpO1xyXG5cclxuICBjdWlzaW5lcy5mb3JFYWNoKGN1aXNpbmUgPT4ge1xyXG4gICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICBvcHRpb24uaW5uZXJIVE1MID0gY3Vpc2luZTtcclxuICAgIG9wdGlvbi52YWx1ZSA9IGN1aXNpbmU7XHJcbiAgICBzZWxlY3QuYXBwZW5kKG9wdGlvbik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIEdvb2dsZSBtYXAsIGNhbGxlZCBmcm9tIEhUTUwuXHJcbiAqL1xyXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcclxuICBsZXQgbG9jID0ge1xyXG4gICAgbGF0OiA0MC43MjIyMTYsXHJcbiAgICBsbmc6IC03My45ODc1MDFcclxuICB9O1xyXG4gIHNlbGYubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyksIHtcclxuICAgIHpvb206IDEyLFxyXG4gICAgY2VudGVyOiBsb2MsXHJcbiAgICBzY3JvbGx3aGVlbDogZmFsc2VcclxuICB9KTtcclxuICB1cGRhdGVSZXN0YXVyYW50cygpO1xyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIHBhZ2UgYW5kIG1hcCBmb3IgY3VycmVudCByZXN0YXVyYW50cy5cclxuICovXHJcbnVwZGF0ZVJlc3RhdXJhbnRzID0gKCkgPT4ge1xyXG4gIGNvbnN0IGNTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vpc2luZXMtc2VsZWN0Jyk7XHJcbiAgY29uc3QgblNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduZWlnaGJvcmhvb2RzLXNlbGVjdCcpO1xyXG5cclxuICBjb25zdCBjSW5kZXggPSBjU2VsZWN0LnNlbGVjdGVkSW5kZXg7XHJcbiAgY29uc3QgbkluZGV4ID0gblNlbGVjdC5zZWxlY3RlZEluZGV4O1xyXG5cclxuICBjb25zdCBjdWlzaW5lID0gY1NlbGVjdFtjSW5kZXhdLnZhbHVlO1xyXG4gIGNvbnN0IG5laWdoYm9yaG9vZCA9IG5TZWxlY3RbbkluZGV4XS52YWx1ZTtcclxuXHJcbiAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lQW5kTmVpZ2hib3Job29kKGN1aXNpbmUsIG5laWdoYm9yaG9vZCwgKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xyXG4gICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvciFcclxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXNldFJlc3RhdXJhbnRzKHJlc3RhdXJhbnRzKTtcclxuICAgICAgZmlsbFJlc3RhdXJhbnRzSFRNTCgpO1xyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDbGVhciBjdXJyZW50IHJlc3RhdXJhbnRzLCB0aGVpciBIVE1MIGFuZCByZW1vdmUgdGhlaXIgbWFwIG1hcmtlcnMuXHJcbiAqL1xyXG5yZXNldFJlc3RhdXJhbnRzID0gKHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgLy8gUmVtb3ZlIGFsbCByZXN0YXVyYW50c1xyXG4gIHNlbGYucmVzdGF1cmFudHMgPSBbXTtcclxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50cy1saXN0Jyk7XHJcbiAgdWwuaW5uZXJIVE1MID0gJyc7XHJcblxyXG4gIC8vIFJlbW92ZSBhbGwgbWFwIG1hcmtlcnNcclxuICBzZWxmLm1hcmtlcnMuZm9yRWFjaChtID0+IG0uc2V0TWFwKG51bGwpKTtcclxuICBzZWxmLm1hcmtlcnMgPSBbXTtcclxuICBzZWxmLnJlc3RhdXJhbnRzID0gcmVzdGF1cmFudHM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYWxsIHJlc3RhdXJhbnRzIEhUTUwgYW5kIGFkZCB0aGVtIHRvIHRoZSB3ZWJwYWdlLlxyXG4gKi9cclxuZmlsbFJlc3RhdXJhbnRzSFRNTCA9IChyZXN0YXVyYW50cyA9IHNlbGYucmVzdGF1cmFudHMpID0+IHtcclxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50cy1saXN0Jyk7XHJcbiAgaWYocmVzdGF1cmFudHMubGVuZ3RoID09PSAwKXtcclxuICAgIGNvbnN0IHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICBzcGFuLmNsYXNzTGlzdCA9IFtcInRleHQtZGFuZ2VyXCIsIFwiZm9udC13ZWlnaHQtYm9sZFwiXTtcclxuICAgIHNwYW4udGV4dENvbnRlbnQgPSBcIk5PIFJFU1RBVVJBTlQocykgRk9VTkRcIjtcclxuICAgIHVsLmFwcGVuZChzcGFuKTtcclxuICB9ZWxzZXtcclxuICByZXN0YXVyYW50cy5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xyXG4gICAgdWwuYXBwZW5kKGNyZWF0ZVJlc3RhdXJhbnRIVE1MKHJlc3RhdXJhbnQpKTtcclxuICB9KTtcclxuICBhZGRNYXJrZXJzVG9NYXAoKTtcclxufVxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHJlc3RhdXJhbnQgSFRNTC5cclxuICovXHJcbmNyZWF0ZVJlc3RhdXJhbnRIVE1MID0gKHJlc3RhdXJhbnQpID0+IHtcclxuICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcblxyXG4gIGNvbnN0IGltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XHJcbiAgaW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nJztcclxuICBjb25zdCBpbWFnZXVybCA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBcInRpbGVzXCIpO1xyXG4gIGNvbnN0IGltZ3BhcnRzID0gaW1hZ2V1cmwuc3BsaXQoXCIuXCIpO1xyXG4gIGNvbnN0IGltZ3VybDF4ID0gaW1ncGFydHNbMF0gKyBcIi0zNTB3XzF4LlwiICsgaW1ncGFydHNbMV07XHJcbiAgY29uc3QgaW1ndXJsMnggPSBpbWdwYXJ0c1swXSArIFwiLTcwMHdfMnguXCIgKyBpbWdwYXJ0c1sxXTtcclxuICBpbWFnZS5zcmMgPSBpbWd1cmwxeDtcclxuICBpbWFnZS5zcmNzZXQgPSBgJHtpbWd1cmwxeH0gMzUwdywgJHtpbWd1cmwyeH0gNzAwd2A7XHJcbiAgaW1hZ2UuYWx0ID0gcmVzdGF1cmFudC5uYW1lICsgXCIgdGlsZSBpbWFnZVwiO1xyXG4gIGxpLmFwcGVuZChpbWFnZSk7XHJcbiAgXHJcblxyXG4gIGNvbnN0IG5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpO1xyXG4gIG5hbWUuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5uYW1lO1xyXG4gIGxpLmFwcGVuZChuYW1lKTtcclxuXHJcbiAgY29uc3QgbmVpZ2hib3Job29kID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gIG5laWdoYm9yaG9vZC5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5laWdoYm9yaG9vZDtcclxuICBsaS5hcHBlbmQobmVpZ2hib3Job29kKTtcclxuXHJcbiAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcclxuICBhZGRyZXNzLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuYWRkcmVzcztcclxuICBsaS5hcHBlbmQoYWRkcmVzcyk7XHJcblxyXG4gIGNvbnN0IG1vcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgbW9yZS5pbm5lckhUTUwgPSAnVmlldyBEZXRhaWxzJztcclxuICBtb3JlLmhyZWYgPSBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xyXG4gIG1vcmUudHlwZSA9IFwiYnV0dG9uXCJcclxuICBsaS5hcHBlbmQobW9yZSlcclxuXHJcbiAgcmV0dXJuIGxpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBZGQgbWFya2VycyBmb3IgY3VycmVudCByZXN0YXVyYW50cyB0byB0aGUgbWFwLlxyXG4gKi9cclxuYWRkTWFya2Vyc1RvTWFwID0gKHJlc3RhdXJhbnRzID0gc2VsZi5yZXN0YXVyYW50cykgPT4ge1xyXG4gIHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XHJcbiAgICAvLyBBZGQgbWFya2VyIHRvIHRoZSBtYXBcclxuICAgIGNvbnN0IG1hcmtlciA9IERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQocmVzdGF1cmFudCwgc2VsZi5tYXApO1xyXG4gICAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIobWFya2VyLCAnY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gbWFya2VyLnVybFxyXG4gICAgfSk7XHJcbiAgICBzZWxmLm1hcmtlcnMucHVzaChtYXJrZXIpO1xyXG4gIH0pO1xyXG59XHJcbiIsIihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgaWYgKCFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlcikgcmV0dXJuO1xyXG5cclxuICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKFwic2VydmljZV93b3JrZXIuanNcIikudGhlbihyZWcgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU2VydmljZSBXb3JrZXIgUmVnaXN0ZXJlZCBTdWNjZXNzZnVsbHlcIik7XHJcbiAgICB9KS5jYXRjaChlcnIgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiRmFpbGVkIHRvIHJlZ2lzdGVyIFNlcnZpY2UgV29ya2VyLCB0cnkgYWdhaW4gbGF0ZXJcIiwgZXJyKTtcclxuICAgIH0pO1xyXG5cclxufSkoKTsiLCJsZXQgcmVzdGF1cmFudDtcbnZhciBtYXA7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBHb29nbGUgbWFwLCBjYWxsZWQgZnJvbSBIVE1MLlxuICovXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcbiAgZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCgoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcbiAgICBpZiAoZXJyb3IpIHsgLy8gR290IGFuIGVycm9yIVxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyksIHtcbiAgICAgICAgem9vbTogMTYsXG4gICAgICAgIGNlbnRlcjogcmVzdGF1cmFudC5sYXRsbmcsXG4gICAgICAgIHNjcm9sbHdoZWVsOiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBmaWxsQnJlYWRjcnVtYigpO1xuICAgICAgREJIZWxwZXIubWFwTWFya2VyRm9yUmVzdGF1cmFudChzZWxmLnJlc3RhdXJhbnQsIHNlbGYubWFwKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCBjdXJyZW50IHJlc3RhdXJhbnQgZnJvbSBwYWdlIFVSTC5cbiAqL1xuZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCA9IChjYWxsYmFjaykgPT4ge1xuICBpZiAoc2VsZi5yZXN0YXVyYW50KSB7IC8vIHJlc3RhdXJhbnQgYWxyZWFkeSBmZXRjaGVkIVxuICAgIGNhbGxiYWNrKG51bGwsIHNlbGYucmVzdGF1cmFudClcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgaWQgPSBnZXRQYXJhbWV0ZXJCeU5hbWUoJ2lkJyk7XG4gIGlmICghaWQpIHsgLy8gbm8gaWQgZm91bmQgaW4gVVJMXG4gICAgZXJyb3IgPSAnTm8gcmVzdGF1cmFudCBpZCBpbiBVUkwnXG4gICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICB9IGVsc2Uge1xuICAgIERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xuICAgICAvLyBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudCksIGlkID0+IHtcbiAgICAgIHNlbGYucmVzdGF1cmFudCA9IHJlc3RhdXJhbnQ7XG4gICAgICBpZiAoIXJlc3RhdXJhbnQpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZpbGxSZXN0YXVyYW50SFRNTCgpO1xuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudClcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSByZXN0YXVyYW50IEhUTUwgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZVxuICovXG5maWxsUmVzdGF1cmFudEhUTUwgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtbmFtZScpO1xuICBuYW1lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcblxuICBjb25zdCBhZGRyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtYWRkcmVzcycpO1xuICBhZGRyZXNzLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuYWRkcmVzcztcblxuICBjb25zdCBpbWFnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWltZycpO1xuICBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnXG4gIGNvbnN0IGltYWdldXJsID0gREJIZWxwZXIuaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQsIFwiYmFubmVyc1wiKTtcbiAgY29uc3QgaW1ncGFydHMgPSBpbWFnZXVybC5zcGxpdChcIi5cIik7XG4gIGNvbnN0IGltZ3VybDF4ID0gaW1ncGFydHNbMF0gKyBcIi01MDB3XzF4LlwiICsgaW1ncGFydHNbMV07XG4gIGNvbnN0IGltZ3VybDJ4ID0gaW1ncGFydHNbMF0gKyBcIi04MDB3XzJ4LlwiICsgaW1ncGFydHNbMV07XG4gIGltYWdlLnNyYyA9IGltZ3VybDF4O1xuICBpbWFnZS5zcmNzZXQgPSBgJHtpbWd1cmwxeH0gNTAwdywgJHtpbWd1cmwyeH0gODAwd2A7XG4gIGltYWdlLmFsdCA9IHJlc3RhdXJhbnQubmFtZSArIFwiIGJhbm5lciBpbWFnZVwiO1xuICBcblxuICBjb25zdCBjdWlzaW5lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtY3Vpc2luZScpO1xuICBjdWlzaW5lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuY3Vpc2luZV90eXBlO1xuXG4gIC8vIGZpbGwgb3BlcmF0aW5nIGhvdXJzXG4gIGlmIChyZXN0YXVyYW50Lm9wZXJhdGluZ19ob3Vycykge1xuICAgIGZpbGxSZXN0YXVyYW50SG91cnNIVE1MKCk7XG4gIH1cbiAgLy8gZmlsbCByZXZpZXdzXG4gIGZpbGxSZXZpZXdzSFRNTCgpO1xufVxuXG4vKipcbiAqIENyZWF0ZSByZXN0YXVyYW50IG9wZXJhdGluZyBob3VycyBIVE1MIHRhYmxlIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2UuXG4gKi9cbmZpbGxSZXN0YXVyYW50SG91cnNIVE1MID0gKG9wZXJhdGluZ0hvdXJzID0gc2VsZi5yZXN0YXVyYW50Lm9wZXJhdGluZ19ob3VycykgPT4ge1xuICBjb25zdCBob3VycyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWhvdXJzJyk7XG4gIGZvciAobGV0IGtleSBpbiBvcGVyYXRpbmdIb3Vycykge1xuICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG5cbiAgICBjb25zdCBkYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgIGRheS5pbm5lckhUTUwgPSBrZXkudHJpbSgpO1xuICAgIHJvdy5hcHBlbmRDaGlsZChkYXkpO1xuXG4gICAgY29uc3QgdGltZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XG4gICAgdGltZS5pbm5lckhUTUwgPSBvcGVyYXRpbmdIb3Vyc1trZXldLnRyaW0oKTtcbiAgICByb3cuYXBwZW5kQ2hpbGQodGltZSk7XG5cbiAgICBob3Vycy5hcHBlbmRDaGlsZChyb3cpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGFsbCByZXZpZXdzIEhUTUwgYW5kIGFkZCB0aGVtIHRvIHRoZSB3ZWJwYWdlLlxuICovXG5maWxsUmV2aWV3c0hUTUwgPSAocmV2aWV3cyA9IHNlbGYucmVzdGF1cmFudC5yZXZpZXdzKSA9PiB7XG4gIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWNvbnRhaW5lcicpO1xuICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2gyJyk7XG4gIHRpdGxlLmlubmVySFRNTCA9ICdSZXZpZXdzJztcbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRpdGxlKTtcblxuICBpZiAoIXJldmlld3MpIHtcbiAgICBjb25zdCBub1Jldmlld3MgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gICAgbm9SZXZpZXdzLmlubmVySFRNTCA9ICdObyByZXZpZXdzIHlldCEnO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChub1Jldmlld3MpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWxpc3QnKTtcbiAgcmV2aWV3cy5mb3JFYWNoKHJldmlldyA9PiB7XG4gICAgdWwuYXBwZW5kQ2hpbGQoY3JlYXRlUmV2aWV3SFRNTChyZXZpZXcpKTtcbiAgfSk7XG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh1bCk7XG59XG5cbi8qKlxuICogQ3JlYXRlIHJldmlldyBIVE1MIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2UuXG4gKi9cbmNyZWF0ZVJldmlld0hUTUwgPSAocmV2aWV3KSA9PiB7XG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgbmFtZS5pbm5lckhUTUwgPSByZXZpZXcubmFtZTtcbiAgbGkuYXBwZW5kQ2hpbGQobmFtZSk7XG5cbiAgY29uc3QgZGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgZGF0ZS5pbm5lckhUTUwgPSByZXZpZXcuZGF0ZTtcbiAgbGkuYXBwZW5kQ2hpbGQoZGF0ZSk7XG5cbiAgY29uc3QgcmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICByYXRpbmcuaW5uZXJIVE1MID0gYFJhdGluZzogJHtyZXZpZXcucmF0aW5nfWA7XG4gIGxpLmFwcGVuZENoaWxkKHJhdGluZyk7XG5cbiAgY29uc3QgY29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gIGNvbW1lbnRzLmlubmVySFRNTCA9IHJldmlldy5jb21tZW50cztcbiAgbGkuYXBwZW5kQ2hpbGQoY29tbWVudHMpO1xuXG4gIHJldHVybiBsaTtcbn1cblxuLyoqXG4gKiBBZGQgcmVzdGF1cmFudCBuYW1lIHRvIHRoZSBicmVhZGNydW1iIG5hdmlnYXRpb24gbWVudVxuICovXG5maWxsQnJlYWRjcnVtYiA9IChyZXN0YXVyYW50PXNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBicmVhZGNydW1iID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JyZWFkY3J1bWInKTtcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICBsaS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XG4gIGJyZWFkY3J1bWIuYXBwZW5kQ2hpbGQobGkpO1xufVxuXG4vKipcbiAqIEdldCBhIHBhcmFtZXRlciBieSBuYW1lIGZyb20gcGFnZSBVUkwuXG4gKi9cbmdldFBhcmFtZXRlckJ5TmFtZSA9IChuYW1lLCB1cmwpID0+IHtcbiAgaWYgKCF1cmwpXG4gICAgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtcXF1dL2csICdcXFxcJCYnKTtcbiAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBbPyZdJHtuYW1lfSg9KFteJiNdKil8JnwjfCQpYCksXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWModXJsKTtcbiAgaWYgKCFyZXN1bHRzKVxuICAgIHJldHVybiBudWxsO1xuICBpZiAoIXJlc3VsdHNbMl0pXG4gICAgcmV0dXJuICcnO1xuICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMl0ucmVwbGFjZSgvXFwrL2csICcgJykpO1xufVxuIl19
