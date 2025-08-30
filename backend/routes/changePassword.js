const db = require('../db');

// changePassword.js
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const readline = require("readline");

// Setup console input
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// Ask for mobile and new password
rl.question("Enter mobile number: ", (mobile) => {
	rl.question("Enter new password: ", async (newPassword) => {
		try {
			const hash = await bcrypt.hash(newPassword, 10);

			const query = "UPDATE users SET password_hash = ? WHERE phone = ?";
			db.query(query, [hash, mobile], (err, result) => {
				if (err) {
					console.error("Database error:", err);
				} else if (result.affectedRows === 0) {
					console.warn("No user found with this mobile.");
				} else {
					console.log("✅ Password updated successfully for", mobile);
				}
				db.end();
				rl.close();
			});
		} catch (err) {
			console.error("Hashing error:", err);
			db.end();
			rl.close();
		}
	});
});
