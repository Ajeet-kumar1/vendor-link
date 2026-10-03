/**
 * Email notification module using Nodemailer
 * Supports dynamic configuration stored in SQLite database settings table,
 * with fallback to process.env.
 */

const nodemailer = require('nodemailer');

function getEmailSettings(db) {
    const config = {
        adminEmail: process.env.ADMIN_EMAIL || '',
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        smtpSecure: process.env.SMTP_SECURE === 'true'
    };

    if (db) {
        try {
            const rows = db.prepare('SELECT key, value FROM settings').all();
            rows.forEach(r => {
                if (r.key === 'admin_email' && r.value) config.adminEmail = r.value;
                if (r.key === 'smtp_host' && r.value) config.smtpHost = r.value;
                if (r.key === 'smtp_port' && r.value) config.smtpPort = parseInt(r.value);
                if (r.key === 'smtp_user' && r.value) config.smtpUser = r.value;
                if (r.key === 'smtp_pass' && r.value) config.smtpPass = r.value;
                if (r.key === 'smtp_secure' && r.value) config.smtpSecure = r.value === '1';
            });
        } catch (e) {
            console.error('Error reading settings from DB:', e.message);
        }
    }

    return config;
}

function logNotificationToDB(db, type, recipient, subject, preview, status, errorMsg = '') {
    if (!db) return;
    try {
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO notifications (id, type, recipient, subject, preview, status, error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, type, recipient, subject, preview, status, errorMsg, now);
    } catch (e) {
        console.error('Could not log notification to DB:', e.message);
    }
}

async function sendNotificationEmail(type, data, db = null) {
    const settings = getEmailSettings(db);
    const targetEmail = settings.adminEmail || 'admin@vendorlink.com';

    let subject = '';
    let preview = '';
    let html = '';

    if (type === 'application') {
        subject = `🎯 [VendorLink Job Application] ${data.careerTitle} - ${data.name}`;
        preview = `Applicant: ${data.name} | Exp: ${data.experience} | Edu: ${data.education}`;
        html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #0A1628 0%, #1B2A4A 100%); padding: 28px 32px; color: #ffffff;">
                <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: #00E5CC; text-transform: uppercase; margin-bottom: 6px;">VENDORLINK NOTIFICATION</div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Job Application Received</h1>
                <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 14px;">A candidate has applied for the <strong>${data.careerTitle}</strong> position.</p>
            </div>
            <div style="padding: 32px;">
                <h3 style="margin: 0 0 16px; font-size: 16px; color: #1B2A4A; border-bottom: 2px solid #00E5CC; padding-bottom: 8px; display: inline-block;">Applicant Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; width: 140px; border-bottom: 1px solid #f1f5f9;"><strong>Candidate Name</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${data.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Applied Role</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9;">${data.careerTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Email</strong></td>
                        <td style="padding: 10px 0; color: #00B4D8; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${data.email}" style="color: #00B4D8; text-decoration: none;">${data.email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Phone</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9;">${data.phone || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Total Experience</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9;">${data.experience}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Address</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9;">${data.address || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280;"><strong>Education</strong></td>
                        <td style="padding: 10px 0; color: #1f2937;">${data.education}</td>
                    </tr>
                </table>

                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 14px 0; font-size: 14px; color: #475569;">Review candidate resume, cover letter, and take action (Viewed, Interviewing, Action Taken, Hired):</p>
                    <a href="http://localhost:3000/admin" style="display: inline-block; background: #1B2A4A; color: #00E5CC; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">Open Admin Dashboard &rarr;</a>
                </div>
            </div>
            <div style="background: #f1f5f9; padding: 14px 32px; font-size: 12px; color: #64748b; text-align: center;">
                VendorLink Enterprise Wearable Payment System &bull; Admin Notifications
            </div>
        </div>
        `;
    } else if (type === 'contact') {
        subject = `💼 [VendorLink Partner Inquiry] ${data.companyName} - ${data.fullName}`;
        preview = `Company: ${data.companyName} | Contact: ${data.fullName} (${data.email}) | Interest: ${data.interest}`;
        html = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #0A1628 0%, #1B2A4A 100%); padding: 28px 32px; color: #ffffff;">
                <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: #00E5CC; text-transform: uppercase; margin-bottom: 6px;">VENDORLINK B2B INQUIRY</div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Partner / Business Query</h1>
                <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 14px;">A company has expressed interest in partnering with VendorLink.</p>
            </div>
            <div style="padding: 32px;">
                <h3 style="margin: 0 0 16px; font-size: 16px; color: #1B2A4A; border-bottom: 2px solid #00E5CC; padding-bottom: 8px; display: inline-block;">Company & Contact Info</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; width: 140px; border-bottom: 1px solid #f1f5f9;"><strong>Company Name</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${data.companyName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Contact Person</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9;">${data.fullName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Job Title</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; border-bottom: 1px solid #f1f5f9;">${data.jobTitle || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Email</strong></td>
                        <td style="padding: 10px 0; color: #00B4D8; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${data.email}" style="color: #00B4D8; text-decoration: none;">${data.email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #f1f5f9;"><strong>Interest Area</strong></td>
                        <td style="padding: 10px 0; color: #1B2A4A; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${data.interest || 'General'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6B7280; vertical-align: top;"><strong>Message</strong></td>
                        <td style="padding: 10px 0; color: #1f2937; line-height: 1.6;">${data.message || 'No additional message.'}</td>
                    </tr>
                </table>

                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                    <a href="http://localhost:3000/admin" style="display: inline-block; background: #1B2A4A; color: #00E5CC; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">View in Admin Portal &rarr;</a>
                </div>
            </div>
            <div style="background: #f1f5f9; padding: 14px 32px; font-size: 12px; color: #64748b; text-align: center;">
                VendorLink Enterprise Wearable Payment System &bull; Admin Notifications
            </div>
        </div>
        `;
    }

    console.log(`\n==================================================`);
    console.log(`📨 [EMAIL NOTIFICATION TRIGGERED]`);
    console.log(`   Type: ${type}`);
    console.log(`   To Official Email: ${targetEmail}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Preview: ${preview}`);
    console.log(`==================================================\n`);

    // If SMTP credentials are provided, attempt real transmission
    if (settings.smtpUser && settings.smtpPass && settings.adminEmail) {
        try {
            const transporter = nodemailer.createTransport({
                host: settings.smtpHost,
                port: settings.smtpPort,
                secure: settings.smtpPort === 465 || settings.smtpSecure,
                auth: {
                    user: settings.smtpUser,
                    pass: settings.smtpPass
                }
            });

            await transporter.sendMail({
                from: `"VendorLink System" <${settings.smtpUser}>`,
                to: settings.adminEmail,
                subject,
                html
            });

            console.log(`✅ [EMAIL DELIVERED] Real email dispatched to ${settings.adminEmail}`);
            logNotificationToDB(db, type, settings.adminEmail, subject, preview, 'delivered');
            return { delivered: true, recipient: settings.adminEmail };
        } catch (err) {
            console.error(`⚠️ [EMAIL TRANSMISSION FAILED]: ${err.message}`);
            logNotificationToDB(db, type, settings.adminEmail, subject, preview, 'failed', err.message);
            return { delivered: false, recipient: settings.adminEmail, error: err.message };
        }
    } else {
        // Log that notification was recorded in system and ready to send once SMTP is configured
        logNotificationToDB(db, type, targetEmail, subject, preview, 'recorded_in_system', 'SMTP credentials not configured yet');
        return { delivered: false, recipient: targetEmail, status: 'recorded_in_system' };
    }
}

async function sendTestEmail(testRecipient, db = null) {
    const settings = getEmailSettings(db);
    const to = testRecipient || settings.adminEmail;

    if (!to) {
        throw new Error('No recipient email specified and no admin email configured in settings.');
    }

    if (!settings.smtpUser || !settings.smtpPass) {
        throw new Error('SMTP Username and Password must be configured to send a test email.');
    }

    const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpPort === 465 || settings.smtpSecure,
        auth: {
            user: settings.smtpUser,
            pass: settings.smtpPass
        }
    });

    const info = await transporter.sendMail({
        from: `"VendorLink System" <${settings.smtpUser}>`,
        to,
        subject: '✅ VendorLink Admin Mail Notification Test',
        html: `
            <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1B2A4A;">VendorLink Mail System Verified</h2>
                <p>Congratulations! Your official email notification service is properly configured.</p>
                <p>You will now receive instant email alerts whenever:</p>
                <ul>
                    <li>A candidate submits a job application on the Careers page</li>
                    <li>A company or client submits a Partner / B2B query on the main website</li>
                </ul>
                <p style="color: #64748b; font-size: 13px;">Sent at: ${new Date().toLocaleString()}</p>
            </div>
        `
    });

    logNotificationToDB(db, 'test', to, 'VendorLink Test Email', 'System verification email', 'delivered');
    return info;
}

module.exports = {
    sendNotificationEmail,
    sendTestEmail,
    getEmailSettings
};
