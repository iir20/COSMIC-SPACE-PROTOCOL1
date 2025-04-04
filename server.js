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
    windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(limiter);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'wss:', 'https:', process.env.WEB3_PROVIDER_URL],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"]
        }
    },
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

// Static file serving with caching
const staticOptions = {
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        const maxAge = path.includes('/assets/') ? '1y' : '1h';
        res.setHeader('Cache-Control', `public, max-age=${maxAge === '1y' ? 31536000 : 3600}`);
        
        if (path.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
    }
};

app.use(express.static('public', staticOptions));
app.use('/src', express.static(path.join(__dirname, 'src'), staticOptions));
app.use('/assets', express.static(path.join(__dirname, 'public/assets'), staticOptions));

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info('New client connected:', { socketId: socket.id });

    socket.join(socket.id);
    const connectionTime = new Date();
    socket.connectionTime = connectionTime;

    socket.emit('connectionEstablished', { 
        message: 'Connected to Cosmic Space Protocol server',
        socketId: socket.id,
        connectionTime: connectionTime
    });

    // Event handlers with error handling
    const handleSocketEvent = (eventName, handler) => {
        socket.on(eventName, async (data) => {
            try {
                await handler(data);
            } catch (error) {
                logger.error(`Error in ${eventName}:`, { error: error.message, socketId: socket.id });
                socket.emit('error', { message: `Error processing ${eventName}` });
            }
        });
    };

    handleSocketEvent('walletUpdate', (data) => {
        socket.broadcast.emit('walletUpdated', data);
    });

    handleSocketEvent('miningUpdate', (data) => {
        socket.broadcast.emit('miningUpdated', data);
    });

    handleSocketEvent('nftUpdate', (data) => {
        socket.broadcast.emit('nftUpdated', data);
    });

    socket.on('error', (error) => {
        logger.error('Socket error:', { error, socketId: socket.id });
    });

    socket.on('disconnect', () => {
        const duration = new Date() - socket.connectionTime;
        logger.info('Client disconnected:', { 
            socketId: socket.id, 
            duration: `${duration/1000}s` 
        });
    });
});

// API Routes
const apiRouter = express.Router();

apiRouter.post('/wallet/create', async (req, res) => {
    try {
        // Wallet creation logic here
        res.json({ success: true, message: 'Wallet created successfully' });
    } catch (error) {
        logger.error('Wallet creation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

apiRouter.post('/mining/start', async (req, res) => {
    try {
        // Mining start logic here
        res.json({ success: true, message: 'Mining started successfully' });
    } catch (error) {
        logger.error('Mining start error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

apiRouter.post('/mining/stop', async (req, res) => {
    try {
        // Mining stop logic here
        res.json({ success: true, message: 'Mining stopped successfully' });
    } catch (error) {
        logger.error('Mining stop error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.use('/api', apiRouter);

// Page Routes
const pages = {
    '/': 'index.html',
    '/home': 'home.html',
    '/mining': 'mining.html',
    '/staking': 'staking.html',
    '/nft': 'nft.html',
    '/convert': 'CONVERT.html'
};

Object.entries(pages).forEach(([route, file]) => {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', file));
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Application error:', err);
    res.status(500).json({ 
        success: false, 
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message 
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
});

// Start server
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Access the application at http://localhost:${PORT}`);
}); 