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
    fileSize: 25 * 1024 * 1024 // 25MB limit
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

// Add this middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    contentType: req.headers['content-type'],
    body: req.body,
    files: req.files?.length
  });
  next();
});

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
            },
            messageId: {
              type: 'string',
              example: '<123456@example.com>'
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
            },
            error: {
              type: 'string',
              example: 'Detailed error message'
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
  console.log('Received request with content-type:', req.headers['content-type']);
  
  if (req.headers['content-type']?.includes('application/json')) {
    return handleJsonEmail(req, res);
  }
  
  // For multipart/form-data
  upload.array('attachments')(req, res, err => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File too large (max 25MB)' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'File upload error',
        error: err.message 
      });
    }
    handleFormEmail(req, res);
  });
});

async function handleFormEmail(req, res) {
  try {
    // console.log('Form data received:', {
    //   body: req.body,
    //   files: req.files?.map(f => ({
    //     name: f.originalname,
    //     size: f.size,
    //     mimetype: f.mimetype
    //   }))
    // });

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

    const attachments = req.files?.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    })) || [];

    console.log(`Sending email to: ${to} with ${attachments.length} attachments`);

    const result = await sendEmail({
      to,
      subject,
      text,
      html,
      attachments
    });

    console.log('Email sent successfully:', result.messageId);

    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email',
      error: error.message,
      code: error.code
    });
  }
}

async function handleJsonEmail(req, res) {
  try {
    const { to, subject, text, html } = req.body;

    console.log('JSON email request:', { to, subject });

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

    const result = await sendEmail({ to, subject, text, html });
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email',
      error: error.message
    });
  }
}

app.options("/send-email", cors());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log('Environment check:', {
  //   hasSMTPHost: !!process.env.SMTP_HOST,
  //   hasSMTPPort: !!process.env.SMTP_PORT,
  //   hasSMTPUser: !!process.env.SMTP_USER,
  //   hasSMTPPass: !!process.env.SMTP_PASS,
  //   hasDefaultFrom: !!process.env.DEFAULT_FROM
  // });
});