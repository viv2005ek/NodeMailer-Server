require('dotenv').config();
const nodemailer = require('nodemailer');

// Debug log to verify env variables are loading
console.log('SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? '***' : 'MISSING'
});

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // For local testing only
    }
});

// Verify connection on startup
transporter.verify(function(error, success) {
    if (error) {
        console.log('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to send messages');
    }
});

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.DEFAULT_FROM,
            to,
            subject,
            text,
            html,
            attachments
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error details:', {
            code: error.code,
            response: error.response,
            stack: error.stack
        });
        throw error;
    }
};

module.exports = { sendEmail };