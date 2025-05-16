const express = require('express');
const router = express.Router();
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Database configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Login route

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        await sql.connect(dbConfig);
        console.log(username, password);
    //     const result = await sql.query`
    //     SELECT USERNAME, SUPERIOR 
    //     FROM HELPDESK_USER 
    //     WHERE USERNAME = ${username} 
    //       AND PASSWORD = HASHBYTES(
    //             'SHA2_256',
    //             CAST(
    //                 CONCAT(
    //                     CAST(SUBSTRING(SALT, 1, 5) AS VARCHAR(50)), 
    //                     CAST(${password} AS VARCHAR(50)), 
    //                     CAST(SUBSTRING(SALT, 6, 10) AS VARCHAR(50))
    //                 ) AS VARCHAR(MAX)
    //             )
    //         )
    // `;


    const result = await sql.query`
    SELECT USERNAME, SUPERIOR 
    FROM HELPDESK_USER 
    WHERE USERNAME = ${username} 
`;

  
      

        console.log(result.recordset);
        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.recordset[0];

        const token = jwt.sign(
            { username: user.USERNAME, superior: user.SUPERIOR },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                username: user.USERNAME,
                superior: user.SUPERIOR
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
            JOIN HELPDESK_USER u ON ar.ReceiverId = u.username
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
            JOIN HELPDESK_USER u ON ar.RequesterId = u.username
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