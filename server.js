require('dotenv').config();
const cors = require('cors');

const express = require('express');
const multer = require('multer');
const { sendEmail } = require('./mailer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

const app = express();
app.use(express.json());
app.use(cors({
  origin: "*", // Allows all origins
  methods: "*", // Allows all HTTP methods
  allowedHeaders: "*", // Allows all headers
  credentials: true // If you need to support credentials/cookies
}));

// For JSON requests (confirmation email)
app.post('/send-email', (req, res) => {
  if (req.headers['content-type']?.includes('application/json')) {
    return handleJsonEmail(req, res);
  }
  // Otherwise handle as multipart/form-data
  upload.array('attachments')(req, res, err => {
    if (err) {
      return res.status(400).json({ success: false, message: 'File too large (max 25MB)' });
    }
    handleFormEmail(req, res);
  });
});

async function handleFormEmail(req, res) {
  try {
    const { to, subject, text, html } = req.body;
    
    await sendEmail({
      to: to || 'viv2005ek@gmail.com',
      subject,
      text,
      html,
      attachments: req.files?.map(file => ({
        filename: file.originalname,
        content: file.buffer
      })) || []
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
}

async function handleJsonEmail(req, res) {
  try {
    const { to, subject, text, html } = req.body;
    await sendEmail({ to, subject, text, html });
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
}
app.options("/send-email", cors());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));