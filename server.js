require('dotenv').config();
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { sendEmail } = require('./mailer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const app = express();
app.use(express.json());
app.use(cors({
  origin: "*",
  methods: "*",
  allowedHeaders: "*",
  credentials: true
}));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Email Service API',
      version: '1.0.0',
      description: 'API for sending emails with optional attachments',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        EmailRequest: {
          type: 'object',
          required: ['to', 'subject'],
          properties: {
            to: {
              type: 'string',
              format: 'email',
              description: 'Recipient email address',
              example: 'recipient@example.com'
            },
            subject: {
              type: 'string',
              description: 'Email subject',
              example: 'Test Email'
            },
            text: {
              type: 'string',
              description: 'Plain text email content',
              example: 'This is a test email'
            },
            html: {
              type: 'string',
              description: 'HTML email content',
              example: '<h1>This is a test email</h1>'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Email sent successfully'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Failed to send email'
            }
          }
        }
      }
    }
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /:
 *   get:
 *     summary: API health check
 *     description: Returns API status and available endpoints
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: running
 *                 message:
 *                   type: string
 *                   example: Email Service API is running
 *                 documentation:
 *                   type: string
 *                   example: /api-docs
 */
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Email Service API is running',
    documentation: '/api-docs',
    endpoints: {
      'POST /send-email': 'Send an email with optional attachments',
      'GET /api-docs': 'API documentation'
    }
  });
});

/**
 * @swagger
 * /send-email:
 *   post:
 *     summary: Send an email
 *     description: Send an email with optional attachments. Accepts both JSON and multipart/form-data.
 *     tags:
 *       - Email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRequest'
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *               subject:
 *                 type: string
 *                 description: Email subject
 *               text:
 *                 type: string
 *                 description: Plain text email content
 *               html:
 *                 type: string
 *                 description: HTML email content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: File attachments (max 25MB per file)
 *     responses:
 *       200:
 *         description: Email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request (e.g., file too large)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   options:
 *     summary: CORS preflight
 *     description: Handle CORS preflight requests
 *     tags:
 *       - Email
 *     responses:
 *       200:
 *         description: CORS preflight successful
 */
app.post('/send-email', (req, res) => {
  if (req.headers['content-type']?.includes('application/json')) {
    return handleJsonEmail(req, res);
  }
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

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address (to) is required'
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Email subject is required'
      });
    }

    await sendEmail({
      to,
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

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address (to) is required'
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Email subject is required'
      });
    }

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