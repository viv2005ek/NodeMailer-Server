require('dotenv').config();
const express = require('express');
const { sendEmail } = require('./mailer');
const multer = require('multer');
const upload = multer();

const app = express();
app.use(express.json());

// Email API endpoint
app.post('/send-email', upload.array('attachments'), async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;
        
        // Process attachments if any
        const attachments = req.files?.map(file => ({
            filename: file.originalname,
            content: file.buffer
        })) || [];

        await sendEmail({
            to,
            subject,
            text,
            html,
            attachments
        });

        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email sending failed:', error);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
});
app.get('/test-email', async (req, res) => {
    try {
        await sendEmail({
            to: 'indomateofficial@gmail.com',
            subject: 'SMTP Test',
            text: 'If you got this, your SMTP setup works!'
        });
        res.send('Test email sent!');
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});