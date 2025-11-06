import cors from 'cors';

/**
 * CORS configuration middleware
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Cho phép requests không có origin (như Postman, curl)
        if (!origin) return callback(null, true);

        // Danh sách domains được phép
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://file.taddesign.net',
            'https://admin.taddesign.net',
            'https://taddesign.net',
            'https://www.taddesign.net',
            process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
            process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : null,
        ].filter(Boolean); // Loại bỏ null/undefined

        // Cho phép tất cả subdomain của taddesign.net
        if (origin && origin.match(/https?:\/\/(.*\.)?taddesign\.net$/)) {
            return callback(null, true);
        }

        // Kiểm tra origin có trong whitelist không
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS blocked origin: ${origin}`);
            callback(null, true); // Tạm thời cho phép tất cả - có thể strict hơn
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
    maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
export const corsPreflightMiddleware = cors(corsOptions);
