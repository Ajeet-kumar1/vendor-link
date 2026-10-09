/**
 * Database module using sql.js (pure JS SQLite)
 * Auto-saves to disk after every write operation
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'vendorlink.db');
const CAREERS_SEED_PATH = path.join(__dirname, '..', 'data', 'careers.json');

let db = null;
let SQL = null;

// Save database to disk
function saveToDisk() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Initialize database
async function initDB() {
    SQL = await initSqlJs();

    // Load existing DB or create new one
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS careers (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            department TEXT DEFAULT '',
            location TEXT DEFAULT '',
            type TEXT DEFAULT 'Full-time',
            experience TEXT DEFAULT '',
            description TEXT DEFAULT '',
            requirements TEXT DEFAULT '',
            responsibilities TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            posted_date TEXT DEFAULT ''
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id TEXT PRIMARY KEY,
            career_id TEXT NOT NULL,
            career_title TEXT DEFAULT '',
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT DEFAULT '',
            experience TEXT DEFAULT '',
            address TEXT DEFAULT '',
            education TEXT DEFAULT '',
            resume_path TEXT DEFAULT '',
            cover_letter_path TEXT DEFAULT '',
            cover_letter_text TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            admin_notes TEXT DEFAULT '',
            submitted_at TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            company_name TEXT NOT NULL,
            full_name TEXT NOT NULL,
            job_title TEXT DEFAULT '',
            email TEXT NOT NULL,
            interest TEXT DEFAULT '',
            message TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            admin_notes TEXT DEFAULT '',
            submitted_at TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT DEFAULT ''
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            recipient TEXT NOT NULL,
            subject TEXT NOT NULL,
            preview TEXT DEFAULT '',
            status TEXT DEFAULT 'pending',
            error TEXT DEFAULT '',
            created_at TEXT DEFAULT ''
        )
    `);

    // Ensure default admin_email is configured
    try {
        const existingEmail = db.exec("SELECT value FROM settings WHERE key = 'admin_email'");
        if (!existingEmail || existingEmail.length === 0 || !existingEmail[0]?.values?.length) {
            db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_email', 'admin@vendorlink.kr')");
        }
    } catch (e) {}

    // Seed default job openings if empty
    const count = db.exec("SELECT COUNT(*) as cnt FROM careers");
    const careerCount = count[0]?.values[0]?.[0] || 0;

    if (careerCount === 0) {
        seedCareers();
    }

    saveToDisk();
    console.log('  ✅ Database initialized');
    return db;
}

function seedCareers() {
    // Shared with the static (GitHub Pages) careers page
    const careers = JSON.parse(fs.readFileSync(CAREERS_SEED_PATH, 'utf8'));

    const now = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO careers (id, title, department, location, type, experience, description, requirements, responsibilities, is_active, posted_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    careers.forEach(c => {
        stmt.run([c.id, c.title, c.department, c.location, c.type, c.experience, c.description, c.requirements, c.responsibilities, now]);
    });

    stmt.free();
    console.log(`  📋 Seeded ${careers.length} career openings`);
}

// Wrapper that mimics better-sqlite3 API
const dbWrapper = {
    prepare(sql) {
        return {
            run(...params) {
                db.run(sql, params);
                saveToDisk();
                return { changes: db.getRowsModified() };
            },
            get(...params) {
                const stmt = db.prepare(sql);
                stmt.bind(params);
                const result = stmt.step() ? stmt.getAsObject() : undefined;
                stmt.free();
                return result;
            },
            all(...params) {
                const results = [];
                const stmt = db.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            }
        };
    },
    exec(sql) {
        return db.exec(sql);
    }
};

module.exports = { initDB, dbWrapper };
