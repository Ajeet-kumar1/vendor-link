/**
 * VendorLink Backend Server
 * Complete Enterprise Backend:
 * - Careers & Job Openings API
 * - Job Application Submission with Resume & Cover Letter upload
 * - Contact & Partner With Us Queries API
 * - Admin Management (Applications, Contacts, Careers, Settings)
 * - Official Email Notification System & Notification History
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { initDB, dbWrapper } = require('./db');
const { sendNotificationEmail, sendTestEmail, getEmailSettings } = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from website root
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(uploadsDir));

// ===== FILE UPLOAD WITH MULTER =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.png', '.jpg', '.jpeg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Supported file types: PDF, DOC, DOCX, TXT, RTF, PNG, JPG'));
        }
    }
});

async function startServer() {
    await initDB();
    const db = dbWrapper;

    // ==========================================
    // 1. CAREERS PUBLIC API
    // ==========================================
    app.get('/api/careers', (req, res) => {
        try {
            const careers = db.prepare('SELECT * FROM careers WHERE is_active = 1 ORDER BY posted_date DESC').all();
            res.json({ success: true, data: careers });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/careers/:id', (req, res) => {
        try {
            const career = db.prepare('SELECT * FROM careers WHERE id = ?').get(req.params.id);
            if (!career) return res.status(404).json({ success: false, error: 'Job opening not found' });
            res.json({ success: true, data: career });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 2. JOB APPLICATIONS API
    // ==========================================
    app.post('/api/applications', upload.fields([
        { name: 'resume', maxCount: 1 },
        { name: 'coverLetter', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const { name, email, phone, experience, address, education, careerId, careerTitle, coverLetterText } = req.body;

            if (!name || !email || !experience || !education || !careerId) {
                return res.status(400).json({ success: false, error: 'Name, email, experience, education, and careerId are required.' });
            }

            const resumeFilename = req.files?.resume?.[0]?.filename || '';
            const coverLetterFilename = req.files?.coverLetter?.[0]?.filename || '';
            const id = uuidv4();
            const now = new Date().toISOString();

            db.prepare(`
                INSERT INTO applications (
                    id, career_id, career_title, name, email, phone, experience,
                    address, education, resume_path, cover_letter_path, cover_letter_text,
                    status, admin_notes, submitted_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', '', ?, '')
            `).run(
                id,
                careerId,
                careerTitle || 'Wearable Payments Specialist',
                name.trim(),
                email.trim(),
                (phone || '').trim(),
                experience.trim(),
                (address || '').trim(),
                education.trim(),
                resumeFilename,
                coverLetterFilename,
                (coverLetterText || '').trim(),
                now
            );

            // Trigger notification
            sendNotificationEmail('application', {
                name,
                email,
                careerTitle: careerTitle || 'Position ' + careerId,
                phone,
                experience,
                address,
                education
            }, db).catch(e => console.error('Notification error:', e));

            res.json({
                success: true,
                message: 'Your application has been received successfully! Our hiring team will review it.',
                id
            });
        } catch (err) {
            console.error('Application submission error:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 3. CONTACT & PARTNER QUERIES API
    // ==========================================
    app.post('/api/contact', async (req, res) => {
        try {
            const { companyName, fullName, jobTitle, email, interest, message } = req.body;

            if (!companyName || !fullName || !email) {
                return res.status(400).json({ success: false, error: 'Company Name, Full Name, and Business Email are required.' });
            }

            const id = uuidv4();
            const now = new Date().toISOString();

            db.prepare(`
                INSERT INTO contacts (
                    id, company_name, full_name, job_title, email,
                    interest, message, status, admin_notes, submitted_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', '', ?, '')
            `).run(
                id,
                companyName.trim(),
                fullName.trim(),
                (jobTitle || '').trim(),
                email.trim(),
                (interest || 'Strategic Partnership').trim(),
                (message || '').trim(),
                now
            );

            // Trigger notification
            sendNotificationEmail('contact', {
                companyName,
                fullName,
                jobTitle: jobTitle || 'N/A',
                email,
                interest: interest || 'Strategic Partnership',
                message
            }, db).catch(e => console.error('Notification error:', e));

            res.json({
                success: true,
                message: 'Thank you! Your enterprise inquiry has been submitted. Our team will contact you within 24 hours.',
                id
            });
        } catch (err) {
            console.error('Contact submission error:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 4. ADMIN APPLICATIONS MANAGEMENT
    // ==========================================
    app.get('/api/admin/applications', (req, res) => {
        try {
            const { status, careerId } = req.query;
            let query = 'SELECT * FROM applications';
            const conditions = [];
            const params = [];

            if (status && status !== 'all') {
                conditions.push('status = ?');
                params.push(status);
            }
            if (careerId) {
                conditions.push('career_id = ?');
                params.push(careerId);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' ORDER BY submitted_at DESC';

            const apps = db.prepare(query).all(...params);
            res.json({ success: true, data: apps });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.patch('/api/admin/applications/:id', (req, res) => {
        try {
            const { status, notes } = req.body;
            const validStatuses = ['new', 'viewed', 'shortlisted', 'interviewing', 'action_taken', 'hired', 'rejected', 'on_hold'];

            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ success: false, error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
            }

            const now = new Date().toISOString();
            const sets = ['updated_at = ?'];
            const params = [now];

            if (status) {
                sets.push('status = ?');
                params.push(status);
            }
            if (notes !== undefined) {
                sets.push('admin_notes = ?');
                params.push(notes);
            }

            params.push(req.params.id);
            const result = db.prepare(`UPDATE applications SET ${sets.join(', ')} WHERE id = ?`).run(...params);

            if (result.changes === 0) {
                return res.status(404).json({ success: false, error: 'Application not found' });
            }

            res.json({ success: true, message: 'Application updated successfully' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.delete('/api/admin/applications/:id', (req, res) => {
        try {
            const result = db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
            if (result.changes === 0) return res.status(404).json({ success: false, error: 'Not found' });
            res.json({ success: true, message: 'Application deleted' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 5. ADMIN CONTACTS MANAGEMENT
    // ==========================================
    app.get('/api/admin/contacts', (req, res) => {
        try {
            const { status } = req.query;
            let query = 'SELECT * FROM contacts';
            const params = [];

            if (status && status !== 'all') {
                query += ' WHERE status = ?';
                params.push(status);
            }
            query += ' ORDER BY submitted_at DESC';

            const contacts = db.prepare(query).all(...params);
            res.json({ success: true, data: contacts });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.patch('/api/admin/contacts/:id', (req, res) => {
        try {
            const { status, notes } = req.body;
            const validStatuses = ['new', 'viewed', 'responded', 'action_taken', 'in_progress', 'closed', 'spam'];

            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ success: false, error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
            }

            const now = new Date().toISOString();
            const sets = ['updated_at = ?'];
            const params = [now];

            if (status) {
                sets.push('status = ?');
                params.push(status);
            }
            if (notes !== undefined) {
                sets.push('admin_notes = ?');
                params.push(notes);
            }

            params.push(req.params.id);
            const result = db.prepare(`UPDATE contacts SET ${sets.join(', ')} WHERE id = ?`).run(...params);

            if (result.changes === 0) {
                return res.status(404).json({ success: false, error: 'Contact query not found' });
            }

            res.json({ success: true, message: 'Contact query updated successfully' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.delete('/api/admin/contacts/:id', (req, res) => {
        try {
            const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
            if (result.changes === 0) return res.status(404).json({ success: false, error: 'Not found' });
            res.json({ success: true, message: 'Contact query deleted' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 6. ADMIN STATS & NOTIFICATIONS API
    // ==========================================
    app.get('/api/admin/stats', (req, res) => {
        try {
            const totalApps = db.prepare('SELECT COUNT(*) as count FROM applications').get()?.count || 0;
            const newApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'new'").get()?.count || 0;
            const viewedApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'viewed'").get()?.count || 0;
            const actionTakenApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status IN ('action_taken', 'interviewing', 'shortlisted')").get()?.count || 0;
            const hiredApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'hired'").get()?.count || 0;

            const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get()?.count || 0;
            const newContacts = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE status = 'new'").get()?.count || 0;
            const respondedContacts = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE status IN ('responded', 'action_taken', 'closed')").get()?.count || 0;

            res.json({
                success: true,
                data: {
                    totalApplications: totalApps,
                    newApplications: newApps,
                    viewedApplications: viewedApps,
                    actionTakenApplications: actionTakenApps,
                    hiredApplications: hiredApps,
                    totalContacts: totalContacts,
                    newContacts: newContacts,
                    respondedContacts: respondedContacts,
                    // Backward-compat nested keys
                    applications: { total: totalApps, new: newApps },
                    contacts: { total: totalContacts, new: newContacts }
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/admin/notifications', (req, res) => {
        try {
            const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
            res.json({ success: true, data: notifications });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 7. ADMIN EMAIL SETTINGS & TEST API
    // ==========================================
    app.get('/api/admin/email-config', (req, res) => {
        try {
            const settings = getEmailSettings(db);
            res.json({
                success: true,
                data: {
                    adminEmail: settings.adminEmail,
                    smtpHost: settings.smtpHost,
                    smtpPort: settings.smtpPort,
                    smtpUser: settings.smtpUser,
                    hasPassword: !!settings.smtpPass,
                    smtpSecure: settings.smtpSecure,
                    isConfigured: !!(settings.adminEmail && settings.smtpUser && settings.smtpPass)
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.post('/api/admin/email-config', (req, res) => {
        try {
            const { adminEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = req.body;

            const upsert = (key, val) => {
                if (val !== undefined && val !== null) {
                    db.prepare(`
                        INSERT INTO settings (key, value) VALUES (?, ?)
                        ON CONFLICT(key) DO UPDATE SET value = excluded.value
                    `).run(key, String(val));
                }
            };

            if (adminEmail !== undefined) upsert('admin_email', adminEmail.trim());
            if (smtpHost !== undefined) upsert('smtp_host', smtpHost.trim());
            if (smtpPort !== undefined) upsert('smtp_port', String(smtpPort));
            if (smtpUser !== undefined) upsert('smtp_user', smtpUser.trim());
            if (smtpPass) upsert('smtp_pass', smtpPass);
            if (smtpSecure !== undefined) upsert('smtp_secure', smtpSecure ? '1' : '0');

            res.json({ success: true, message: 'Official email settings saved successfully!' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.post('/api/admin/test-email', async (req, res) => {
        try {
            const { recipient } = req.body;
            await sendTestEmail(recipient, db);
            res.json({ success: true, message: 'Test email successfully dispatched!' });
        } catch (err) {
            console.error('Test email error:', err.message);
            res.status(400).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 8. ADMIN CAREERS MANAGEMENT API
    // ==========================================
    app.get('/api/admin/careers', (req, res) => {
        try {
            const careers = db.prepare('SELECT * FROM careers ORDER BY posted_date DESC').all();
            res.json({ success: true, data: careers });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.post('/api/admin/careers', (req, res) => {
        try {
            const { title, department, location, type, experience, description, requirements, responsibilities } = req.body;
            if (!title) return res.status(400).json({ success: false, error: 'Job title is required' });

            const id = uuidv4();
            const now = new Date().toISOString();

            db.prepare(`
                INSERT INTO careers (id, title, department, location, type, experience, description, requirements, responsibilities, is_active, posted_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `).run(
                id,
                title.trim(),
                (department || 'Engineering').trim(),
                (location || 'Seoul, South Korea').trim(),
                (type || 'Full-time').trim(),
                (experience || '2+ years').trim(),
                (description || '').trim(),
                (requirements || '').trim(),
                (responsibilities || '').trim(),
                now
            );

            res.json({ success: true, message: 'Job opening added', id });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.patch('/api/admin/careers/:id', (req, res) => {
        try {
            const { is_active, title, department, location, type, experience } = req.body;
            const sets = [];
            const params = [];

            if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0); }
            if (title) { sets.push('title = ?'); params.push(title.trim()); }
            if (department) { sets.push('department = ?'); params.push(department.trim()); }
            if (location) { sets.push('location = ?'); params.push(location.trim()); }
            if (type) { sets.push('type = ?'); params.push(type.trim()); }
            if (experience) { sets.push('experience = ?'); params.push(experience.trim()); }

            if (sets.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

            params.push(req.params.id);
            db.prepare(`UPDATE careers SET ${sets.join(', ')} WHERE id = ?`).run(...params);

            res.json({ success: true, message: 'Career updated' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.delete('/api/admin/careers/:id', (req, res) => {
        try {
            db.prepare('DELETE FROM careers WHERE id = ?').run(req.params.id);
            res.json({ success: true, message: 'Career deleted' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ==========================================
    // 9. CLEAN HTML ROUTING
    // ==========================================
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));
    app.get('/careers', (req, res) => res.sendFile(path.join(__dirname, '..', 'careers.html')));
    app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin.html')));

    // ==========================================
    // 10. SERVER STARTUP
    // ==========================================
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🚀  VENDORLINK UNIFIED WEARABLE PAYMENT PLATFORM                ║
║                                                                   ║
║   🏠 Main Portal:       http://localhost:${PORT}                    ║
║   💼 Careers Page:      http://localhost:${PORT}/careers             ║
║   🛡️ Admin Dashboard:   http://localhost:${PORT}/admin               ║
║                                                                   ║
║   ✉️  Official Email Notifications: ACTIVE                        ║
║   Configure your email in Admin Dashboard -> Settings tab        ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
        `);
    });
}

startServer().catch(err => {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
});
