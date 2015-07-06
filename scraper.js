'use strict';

var cheerio = require('cheerio');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

var baseUrl = null;
var db = null;

var database = {
  schools: 'schools'
};


/* Setup Database
 *
 * @params callback = Returns the Database
 *
 **/

function initDatabase(callback) {
  // Set up sqlite database.
  db = new sqlite3.Database('db.sqlite');

  db.serialize(function() {
    db.run('CREATE TABLE IF NOT EXISTS data (' +
      'title TEXT, ' +
      'address TEXT, ' +
      'url TEXT, ' +
      'region TEXT, ' +
      'offer TEXT' +
      ')');
    callback(db);
  });
}


/* Update Database
 *
 * @params db = The Database
 * @params title, address, url, region, offer = The Database Columns
 *
 **/

function updateRow(db, title, address, url, region, offer) {
  // Insert some data.
  console.log('Writing new data to database.');
  var statement = db.prepare('INSERT INTO data VALUES (?, ?, ?, ?, ?)');
  console.log([title, address, url, region, offer]);
  statement.run([title, address, url, region, offer]);
  statement.finalize();

}

function closeDatabase(callback){

  db.close(function() {
      var mem = (process.memoryUsage().rss / (1 << 20)).toFixed(2);
      console.log('Finished. Memory usage: ' + mem + ' MB');
  });

  //db.close();

}

// Read Database
function readRows(db) {

  //Read some data.
  db.each('SELECT rowid AS id, title, address, url, region, offer FROM data', function(err, row) {
      console.log(row.id + ': ' + row.title + ', ' + row.address + ', ' + row.url + ', ' + row.region + ', ' + row.offer);
  });

//  closeDatabase();

}

/* Base Fetch Page Function
 *
 * @params url      = Url to Fetch
 * @params callback = Callback Function which returns the Result of the request
 *
 **/

function fetchPage(url, callback) {
  // Use request to read in pages.
  request({
    url: url,
    gzip: true
  }, function(error, response, body) {
    if (error) {
      console.log('Error requesting page: ' + error);
      return;
    }

    callback(body);
  });
}


/* Fetch Data from Detailpages
 *
 * @params body = Page Body Object for cheerio
 *
 **/

function fetchDetail(body) {

  var $ = cheerio.load(body);
  var detailPage = $('div.content_sidebar').each(function() {

    // Grab Data
    var title = $(this).find('h1').text().trim();
    var address = $(this).find('li.address').text().trim();
    var schoolURL = $(this).find('ul.list.space.clearfix').eq(1).text().trim();
    var region = $(this).find('ul.list.space.clearfix').eq(2).find('li').eq(1).text().trim();
    var offer = $(this).find('ul.list.space.clearfix').eq(3).find('li').eq(1).text().trim();
  //  console.log(title, address, schoolURL, region, offer);
    updateRow(db, title, address, schoolURL, region, offer);

  });
  readRows(db);


}


/* Fetch the Show all Link
 *
 * @params body = Page Body Object for cheerio
 *
 **/

function fetchAll(body) {

  var $ = cheerio.load(body);

  var mainPage = $('div.address-list-item.address-list-item-teaser').each(function() {

    // Grab and build Detailpages
    var uniqURL = $(this).find('a.link_intern').attr('href');
    var detailUrl = baseUrl + '/' + uniqURL;

    // Grab Detailpages
    fetchPage(detailUrl, fetchDetail);
  });

};


/* Initial Function to Start the hole Process
 *
 * @params db = Database
 *
 **/

function run(db) {

  // Set our Urls
  baseUrl = 'http://www.leipzig.de'
  var rootpath = '/jugend-familie-und-soziales/schulen-und-bildung',
      schools = {
      path: '/schulen',
      basic: '/grundschulen',
      grammas: '/oberschulen'

    };

  // Build the Path Entry Path
  var page = baseUrl + rootpath + schools.path + schools.basic;

  // Use request to read in pages.
  // Use cheerio to find things in the page with css selectors.
  fetchPage(page, function(body) {
    // Use cheerio to find things in the page with css selectors.

    var $ = cheerio.load(body);

    // Find the Show all items Button
    var showAllLink = $('div.search-result-list.clearfix').find('a.link_intern').last().attr('href');

    // Build the new Link with all items
    var grabPage = 'http://www.leipzig.de/' + showAllLink;

    fetchPage(grabPage, fetchAll);

  });
}

initDatabase(run);
