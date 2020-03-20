const express = require('express');
const Fuse = require('fuse.js');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

var app = express();

app.get('/', function(req, res, next) {
    res.sendFile(__dirname + "/index.html");
});

app.get('/search', function(req, res, next) {
    const dbpath = '/home/jyuvaraj03/.config/joplindev-desktop/database.sqlite';
    const db = new sqlite3.Database(dbpath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, error => {
        if (error) {
            console.log(error);
            res.send(error);
            return;
        } else {
            console.log("Connected successfully to SQLite");
            res.sendStatus(200);
        }
    });

    console.time('whole');
    
    const sql = "SELECT notes_fts.id, notes_fts.title AS normalized_title, offsets(notes_fts) AS offsets, notes.title, notes.body, notes.user_updated_time, notes.is_todo, notes.todo_completed, notes.parent_id FROM notes_fts LEFT JOIN notes ON notes_fts.id = notes.id";
    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        } 

        console.time('fuzzy');

        let searchQuery = req.query.searchTerm;
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
    
        console.timeLog('fuzzy', result.length);
        console.timeEnd('fuzzy');
    
        console.timeEnd('whole');
    });
    db.close();
});

app.listen(3000);