// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require('cheerio');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

function initDatabase(callback) {
    // Set up sqlite database.
    var db = new sqlite3.Database('data.sqlite');
    db.serialize(function() {
        db.run('CREATE TABLE IF NOT EXISTS data (name TEXT)');
        callback(db);
    });
}

function updateRow(db, value) {
    // Insert some data.
    var statement = db.prepare('INSERT INTO data VALUES (?)');
    statement.run(value);
    statement.finalize();
}

function readRows(db) {
    // Read some data.
    db.each('SELECT rowid AS id, name FROM data', function(err, row) {
        console.log(row.id + ': ' + row.name);
    });
}

function fetchPage(url, callback) {
    // Use request to read in pages.
    request(url, function(error, response, body) {
        if (error) {
            console.log('Error requesting page: ' + error);
            return;
        }

        callback(body);
    });
}

function run(db) {
    var baseUrl = 'http://www.leipzig.de',
        path = '/jugend-familie-und-soziales/schulen-und-bildung',
        schools = {
            path: '/schulen',
            basic: '/grundschulen/',
            grammas: '/oberschulen/'
        };
    // we can loop it later on
    var page = baseUrl + path + schools.path + schools.basic;
    console.log(page);
    // Use request to read in pages.
    fetchPage(page, function(body) {
        // Use cheerio to find things in the page with css selectors.
        var $ = cheerio.load('div.search-result-list');

        var elements = $('a[class=link_intern]').each(function() {
            var value = $(this).text().trim();
            updateRow(db, value);
        });

        console.log('elments:' elements);

        readRows(db);

        db.close();
    });
}

initDatabase(run);
