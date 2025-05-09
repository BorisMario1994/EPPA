const express = require('express');
const router = express.Router();
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Database configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(username, password);
        // Connect to database
        await sql.connect(dbConfig);
        
        // Get user from database
        const result = await sql.query`
            SELECT UserId, Username, PasswordHash, FullName, Email, CreatedAt
            FROM UsersEPPA
            WHERE Username = ${username}
        `;
        console.log(result.recordset)
        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.recordset[0];
        console.log('Hash from DB:', user.PasswordHash);
        bcrypt.compare('123456',  user.PasswordHash).then(console.log); // should log true
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.UserId, username: user.Username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        console.log(token)  
        // Return user data and token
        res.json({
            token,
            user: {
                id: user.UserId,
                username: user.Username,
                fullName: user.FullName,
                email: user.Email,
                createdAt: user.CreatedAt
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        sql.close();
    }
});

// Get user requests
router.get('/requests', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        await sql.connect(dbConfig);
        
        const result = await sql.query`
            SELECT ar.*, u.FullName as ReceiverName
            FROM ApplicationRequests ar
            JOIN UsersEPPA u ON ar.ReceiverId = u.UserId
            WHERE ar.RequesterId = ${decoded.userId}
        `;

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        sql.close();
    }
});

// Get user reviews
router.get('/reviews', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        await sql.connect(dbConfig);
        
        const result = await sql.query`
            SELECT ar.*, u.FullName as RequesterName
            FROM ApplicationRequests ar
            JOIN UsersEPPA u ON ar.RequesterId = u.UserId
            WHERE ar.ReceiverId = ${decoded.userId}
        `;

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        sql.close();
    }
});

module.exports = router; 