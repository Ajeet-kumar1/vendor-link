/**
 * Database module using sql.js (pure JS SQLite)
 * Auto-saves to disk after every write operation
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'vendorlink.db');

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
    const careers = [
        {
            id: 'c1',
            title: 'Embedded Systems Engineer',
            department: 'Engineering',
            location: 'Seoul, South Korea / Remote',
            type: 'Full-time',
            experience: '3-5 years',
            description: 'Design and develop firmware for our wearable payment smartwatch platform. Work with ESP32/ARM microcontrollers, TFT displays, and wireless communication protocols to build next-generation payment hardware.',
            requirements: 'Bachelor\'s or Master\'s in ECE/CSE or related field|3+ years of embedded systems development experience|Proficiency in C/C++ for microcontroller programming|Experience with ESP32, Arduino, or ARM Cortex-M platforms|Knowledge of BLE, WiFi, and MQTT protocols|Familiarity with power management and battery optimization|Understanding of I2C, SPI, UART communication|Experience with RTOS (FreeRTOS preferred)',
            responsibilities: 'Develop and optimize firmware for VendorLink smartwatch devices|Design hardware-software interfaces for payment modules|Implement low-power communication protocols (BLE, WiFi, MQTT)|Optimize battery life for 7+ day operation|Integrate QR code display drivers for TFT screens|Collaborate with the UI team on SquareLine Studio integration|Conduct hardware testing and validation|Document technical specifications and APIs'
        },
        {
            id: 'c2',
            title: 'Payment Protocol Developer',
            department: 'Engineering',
            location: 'Seoul, South Korea',
            type: 'Full-time',
            experience: '4-6 years',
            description: 'Build the core payment processing engine that powers VendorLink\'s offline and online transaction capabilities. Design secure, reliable payment protocols for wearable devices.',
            requirements: 'Bachelor\'s or Master\'s in Computer Science|4+ years in payment systems or fintech development|Deep understanding of payment protocols (UPI, NFC, QR-based)|Experience with cryptography and secure transaction handling|Proficiency in Python, Go, or Java|Knowledge of PCI-DSS compliance standards|Experience with API design and microservices architecture|Understanding of Korean payment regulations is a plus',
            responsibilities: 'Architect and implement the VendorLink payment processing engine|Design offline transaction storage and sync protocols|Build secure QR code generation and validation systems|Implement multi-VPA (Virtual Payment Address) support|Develop APIs for partner integration (SDK/white-label)|Ensure compliance with Korean financial regulations|Optimize transaction speed and reliability|Work with security team on encryption and fraud prevention'
        },
        {
            id: 'c3',
            title: 'UI/UX Designer — Wearables',
            department: 'Design',
            location: 'Seoul, South Korea / Remote',
            type: 'Full-time',
            experience: '2-4 years',
            description: 'Create intuitive, beautiful interfaces for small-screen wearable payment devices. Design user flows that make QR-based payments effortless on a smartwatch screen.',
            requirements: 'Bachelor\'s degree in Design, HCI, or related field|2+ years of UI/UX design experience (wearables a plus)|Proficiency in Figma, Sketch, or SquareLine Studio|Understanding of small-screen design constraints|Experience with motion design and micro-interactions|Portfolio demonstrating wearable or mobile payment UX|Knowledge of accessibility standards|Korean language proficiency preferred',
            responsibilities: 'Design complete UI/UX flows for VendorLink smartwatch app|Create design system for wearable payment interfaces|Prototype interactions using SquareLine Studio or Figma|Conduct user research with Korean vendors and consumers|Design QR code display layouts optimized for small screens|Collaborate with embedded engineers on UI rendering constraints|Iterate based on pilot testing feedback|Maintain design documentation and component libraries'
        },
        {
            id: 'c4',
            title: 'Business Development Manager — Korea',
            department: 'Business',
            location: 'Seoul, South Korea',
            type: 'Full-time',
            experience: '5-8 years',
            description: 'Lead partnership development with Korean hardware manufacturers, payment networks, and financial institutions. Drive B2B adoption of VendorLink\'s payment platform.',
            requirements: 'Bachelor\'s degree in Business, Finance, or related field|5+ years in B2B sales or business development in Korea|Strong network in Korean fintech or consumer electronics industry|Experience with enterprise software licensing deals|Excellent communication skills in Korean and English|Understanding of Korean payment ecosystem|Track record of closing B2B partnerships|Experience with startup environments preferred',
            responsibilities: 'Identify and engage potential hardware partners in South Korea|Negotiate SDK licensing and white-label partnership deals|Build relationships with Korean banks and payment networks|Represent VendorLink at industry conferences and events|Develop go-to-market strategy for the Korean market|Manage partner onboarding and relationship lifecycle|Report on pipeline, revenue forecasts, and market trends|Collaborate with product team on partner requirements'
        },
        {
            id: 'c5',
            title: 'Backend Infrastructure Engineer',
            department: 'Engineering',
            location: 'Seoul, South Korea / Remote',
            type: 'Full-time',
            experience: '3-5 years',
            description: 'Build and maintain the cloud infrastructure powering VendorLink\'s payment processing, analytics, and partner APIs. Ensure 99.99% uptime for critical payment services.',
            requirements: 'Bachelor\'s in Computer Science or related field|3+ years backend development experience|Strong proficiency in Node.js, Python, or Go|Experience with cloud platforms (AWS, GCP, or Azure)|Knowledge of database systems (PostgreSQL, Redis)|Experience with containerization (Docker, Kubernetes)|Understanding of CI/CD pipelines|Familiarity with payment industry security standards',
            responsibilities: 'Design and build scalable backend services for payment processing|Develop and maintain RESTful APIs for partner integrations|Implement real-time transaction monitoring and alerting|Manage cloud infrastructure and deployment pipelines|Optimize database performance for high-throughput transactions|Implement logging, monitoring, and observability|Ensure infrastructure security and compliance|Participate in on-call rotation for production systems'
        },
        {
            id: 'c6',
            title: 'QA Engineer',
            department: 'Engineering',
            location: 'Remote',
            type: 'Full-time',
            experience: '2-4 years',
            description: 'Ensure the quality and reliability of VendorLink\'s payment software across devices. Build automated test suites for payment flows, hardware integration, and API testing.',
            requirements: 'Bachelor\'s in Computer Science or related field|2+ years of QA or test engineering experience|Experience with automated testing frameworks|Knowledge of API testing tools (Postman, pytest)|Understanding of embedded systems testing is a plus|Experience with payment or fintech testing|Familiarity with CI/CD and test automation pipelines|Strong attention to detail and analytical skills',
            responsibilities: 'Design and execute comprehensive test plans for payment flows|Build automated test suites for API and integration testing|Perform device testing across multiple hardware platforms|Test offline transaction scenarios and sync protocols|Validate payment security and compliance requirements|Report and track bugs through resolution|Collaborate with developers on test-driven development|Maintain test documentation and coverage reports'
        }
    ];

    const now = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO careers (id, title, department, location, type, experience, description, requirements, responsibilities, is_active, posted_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    careers.forEach(c => {
        stmt.run([c.id, c.title, c.department, c.location, c.type, c.experience, c.description, c.requirements, c.responsibilities, now]);
    });

    stmt.free();
    console.log('  📋 Seeded 6 career openings');
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
