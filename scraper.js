// This is a template for a Node.js scraper on morph.io (https://morph.io)
'use strict';

var cheerio = require('cheerio');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

var db = {
    schools: 'schools'
}
function initDatabase(dbname, callback) {
    // Set up sqlite database.
    var db = new sqlite3.Database(dbname + '.sqlite');
    db.serialize(function() {
        db.run('CREATE TABLE IF NOT EXISTS data (title TEXT, address TEXT, url TEXT, region TEXT, offer TEXT)');
        callback(db);
    });
}

function updateRow(db, title, address, url, region, offer) {
    // Insert some data.
    var statement = db.prepare('INSERT INTO data VALUES (?, ?, ?, ?, ?)');
    statement.run(title, address, url, region, offer);
    statement.finalize();
}

function readRows(db) {
    // Read some data.
    db.each('SELECT rowid AS id, title, address, url, region, offer FROM data', function(err, row) {
        console.log(row.id + ': ' + row.title + ', ' + row.address + ', ' + row.url + ', ' + row.region + ', ' + row.offer);
    });
}

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

function run(db) {

    // Set our Urls
    var baseUrl = 'http://www.leipzig.de',
        rootpath = '/jugend-familie-und-soziales/schulen-und-bildung',
        schools = {
            path: '/schulen',
            basic: '/grundschulen',
            grammas: '/oberschulen'
        };
    var query = '/?tx_ewerkaddressdatabase_pi%5BshowAll%5D=1&tx_ewerkaddressdatabase_pi%5Bquery%5D=&tx_ewerkaddressdatabase_pi%5Baction%5D=teaser&tx_ewerkaddressdatabase_pi%5Bcontroller%5D=Address';
    // we can loop it later on
    var page = baseUrl + rootpath + schools.path + schools.basic;

    var test = 'http://www.leipzig.de/jugend-familie-und-soziales/schulen-und-bildung/schulen/grundschulen/?tx_ewerkaddressdatabase_pi%5BshowAll%5D=1&tx_ewerkaddressdatabase_pi%5Bquery%5D=&tx_ewerkaddressdatabase_pi%5Baction%5D=teaser&tx_ewerkaddressdatabase_pi%5Bcontroller%5D=Address';
    // Use request to read in pages.
    // Use cheerio to find things in the page with css selectors.
    fetchPage(test, function(body) {
        // Use cheerio to find things in the page with css selectors.

        var $ = cheerio.load(body);

        var mainPage = $('div.address-list-item').each(function() {

            // Grab and build Detailpages
            var uniqURL = $(this).find('a.link_intern').attr('href');
            var completeURL = baseUrl + '/' + uniqURL;

            // Grab the pager
            // var pager = $('div.paging.clearfix').each(function(){
            //     var el = $(this).find('span');
            // });
            // console.log(completeURL);


            // Grab Detailpages
            fetchPage(completeURL, function(body) {

                var $ = cheerio.load(body);

                var detailPage = $('div.content_sidebar').each(function() {

                    // Grab Data
                    var title = $(this).find('h1').text().trim();
                    var address = $(this).find('li.address').text().trim();
                    var schoolURL = $(this).find('ul.list.space.clearfix').eq(1).text().trim();
                    var region = $(this).find('ul.list.space.clearfix').eq(2).text().trim();
                    var offer = $(this).find('ul.list.space.clearfix').eq(3).text().trim();
                    console.log(title, address, schoolURL, region, offer);
                    updateRow(db, title, address, schoolURL, region, offer);



                });
                readRows(db);

                //db.close();

            });

        });



    });
}

initDatabase(db.schools, run);

