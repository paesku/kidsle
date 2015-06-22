// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require('cheerio');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

function initDatabase(callback) {
    // Set up sqlite database.
    if (db){
      db.close();
    }
    var db = new sqlite3.Database('data.sqlite');
    db.serialize(function() {
            db.run('CREATE TABLE IF NOT EXISTS data (title TEXT, address TEXT)');
        callback(db);
    });
}

function updateRow(db, title, address) {
    // Insert some data.
    var statement = db.prepare('INSERT INTO data VALUES (?, ?)');
    statement.run(title, address);
    statement.finalize();
}

function readRows(db) {
    // Read some data.
    db.each('SELECT rowid AS id, title, address FROM data', function(err, row) {
        console.log(row.id + ': ' + row.title + ', ' + row.address);
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
    // we can loop it later on
    var page = baseUrl + rootpath + schools.path + schools.basic;


    // Use request to read in pages.
    // Use cheerio to find things in the page with css selectors.
    fetchPage(page, function(body) {
        // Use cheerio to find things in the page with css selectors.

        var $ = cheerio.load(body);

        var element = $('div.address-list-item').each(function() {
            var title = $(this).find('a.link_intern.name').text().trim();
            var address = $(this).find('ul.list.left li').text().trim();
            updateRow(db, title, address);
        });

        readRows(db);

        db.close();

    });
}

initDatabase(run);
