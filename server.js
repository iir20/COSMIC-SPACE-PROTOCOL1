const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

// Serve static files from both root and public directories
app.use(express.static('public'));
app.use(express.static('.'));

// MIME type handling
app.use((req, res, next) => {
    const ext = path.extname(req.url).toLowerCase();
    const mimeTypes = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.wasm': 'application/wasm'
    };

    if (mimeTypes[ext]) {
        res.type(mimeTypes[ext]);
    }
    next();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info('New client connected:', socket.id);

    socket.on('disconnect', () => {
        logger.info('Client disconnected:', socket.id);
    });
});

// Page Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/mining', (req, res) => {
    res.sendFile(path.join(__dirname, 'mining.html'));
});

app.get('/staking', (req, res) => {
    res.sendFile(path.join(__dirname, 'staking.html'));
});

app.get('/nft', (req, res) => {
    res.sendFile(path.join(__dirname, 'nft.html'));
});

app.get('/convert', (req, res) => {
    res.sendFile(path.join(__dirname, 'CONVERT.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    const errorId = Math.random().toString(36).substring(7);
    
    // Log detailed error information
    logger.error('Application error:', {
        errorId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
        headers: req.headers
    });
    
    // Send appropriate response
    res.status(err.status || 500).json({
        success: false,
        errorId,
        message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred. Please try again later.' 
            : err.message,
        details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Resource not found',
        path: req.path
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise
    });
});

// Start server
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
}); 