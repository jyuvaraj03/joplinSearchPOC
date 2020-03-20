const express = require('express');
const Fuse = require('fuse.js');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

var app = express();

app.get('/', function(req, res, next) {
    res.sendFile(__dirname + "/index.html");
});

app.get('/search', function(req, res, next) {
    // replace with your path to Joplin SQLite DB
    const dbpath = '/home/jyuvaraj03/.config/joplindev-desktop/database.sqlite';

    const db = new sqlite3.Database(dbpath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, error => {
        if (error) {
            console.log(error);
            res.send(error);
            return;
        } else {
            console.log("Connected successfully to DB");
            res.sendStatus(200);
        }
    });

    const searchQuery = req.query.searchTerm;
    console.log(`Search Query: ${searchQuery}`);
    console.time('pure_fts');    // start timing for pure FTS
    // this is the sql query for FTS used in the current search engine in Joplin
    const sql1 = `SELECT notes_fts.id, notes_fts.title AS normalized_title, offsets(notes_fts) AS offsets, notes.title, notes.body, notes.user_updated_time, notes.is_todo, notes.todo_completed, notes.parent_id FROM notes_fts LEFT JOIN notes ON notes_fts.id = notes.id WHERE notes_fts MATCH '${searchQuery}'`;
    db.all(sql1, [], (err, rows) => {
        if (err) {
            throw err;
        }
        console.timeLog('pure_fts', `No. of results: ${rows.length}`);
        console.timeEnd('pure_fts'); // stop timing for pure FTS
    });

    console.time('fuzzy');  // start the timing for fuzzy search using fusejs
    // the below sql query is a modification of the query used in the current search engine in Joplin
    // here ALL the notes are selected from the SQLite DB instead of only notes which match given term
    // and then passed to Fuse.JS for fuzzy searching
    const sql2 = "SELECT notes_fts.id, notes_fts.title AS normalized_title, offsets(notes_fts) AS offsets, notes.title, notes.body, notes.user_updated_time, notes.is_todo, notes.todo_completed, notes.parent_id FROM notes_fts LEFT JOIN notes ON notes_fts.id = notes.id";
    db.all(sql2, [], (err, rows) => {
        if (err) {
            throw err;
        } 

        let options = {
            shouldSort: true,
            threshold: 0.3,
            location: 0,
            distance: 100,
            minMatchCharLength: 1,
            keys: [
                "title",
                "body"
            ]
        };
        let fuse = new Fuse(rows, options); // "rows" is the result rows from SQL query
        let result = fuse.search(searchQuery ? searchQuery : '');

        console.timeLog('fuzzy', `No. of results: ${result.length}`);
        console.timeEnd('fuzzy');   // stop the timing for fuzzy search using fusejs
    });
    db.close();
});

app.listen(3000);