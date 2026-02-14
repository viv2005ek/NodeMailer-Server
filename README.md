# Email Service API

A Node.js email service API that supports sending emails with attachments via SMTP.

## Features

- Send emails with plain text or HTML content
- Support for file attachments (up to 25MB per file)
- CORS enabled for cross-origin requests
- Swagger API documentation
- Environment-based configuration

## Prerequisites

- Node.js (v14 or higher)
- SMTP server credentials (Gmail, SendGrid, etc.)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your SMTP credentials:
     - `SMTP_HOST`: Your SMTP server host (e.g., smtp.gmail.com)
     - `SMTP_PORT`: SMTP port (usually 587 for TLS)
     - `SMTP_USER`: Your email address
     - `SMTP_PASS`: Your email password or app-specific password
     - `DEFAULT_FROM`: Default sender email and name
     - `PORT`: Server port (default: 3000)

### Gmail Setup

If using Gmail:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `SMTP_PASS`

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

Once the server is running, access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## API Endpoints

### GET /
Health check endpoint that returns API status and available endpoints.

### POST /send-email

Send an email with optional attachments.

**Content-Type Options:**
- `application/json` - For simple emails without attachments
- `multipart/form-data` - For emails with file attachments

**Request Body (JSON):**
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "text": "Plain text content",
  "html": "<h1>HTML content</h1>"
}
```

**Request Body (Form Data):**
- `to`: Recipient email address
- `subject`: Email subject
- `text`: Plain text content (optional)
- `html`: HTML content (optional)
- `attachments`: File attachments (optional, multiple files supported)

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

## Testing

Test SMTP connection:
```bash
npm test
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (e.g., file too large)
- `500`: Server error (e.g., SMTP connection failed)

## Security Notes

- Never commit your `.env` file to version control
- Use app-specific passwords for email services
- The current configuration allows all origins (CORS: "*") - restrict this in production
- File uploads are limited to 25MB per file

## License

MIT
