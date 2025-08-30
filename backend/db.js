// db.js
const mysql = require('mysql');

//Create MySQL connecion pool
const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'ro_cpq'
});


module.exports = db;
