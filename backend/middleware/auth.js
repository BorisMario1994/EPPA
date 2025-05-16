const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = {
            username: decoded.username,
            role: decoded.role,
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(500).json({ message: 'Authentication failed' });
    }
}; 