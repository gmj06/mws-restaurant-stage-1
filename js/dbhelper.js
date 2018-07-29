const port = 1337 // Change this to your server port
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

    //if (typeof idb === "undefined") self.importScripts('js/idb.js');

    return idb.open('restaurants', 1, function (upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore(OBJECTSTORE, { keyPath: 'id' });
        case 1: {
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
  };


  static fetchFromAPIInsertIntoIDB() {
    return fetch(DBHelper.DATABASE_URL)
      .then(response => {
        return response.json()
      }).then(DBHelper.insertIntoIDB);
  };

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
  };


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
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    if(restaurantCuisines){
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
    if(restaurantNeighborhoods){
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
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, type) {
    return (`/img/${type}/${restaurant.id}.jpg`);
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
    }
    );
    return marker;
  }

}
