const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const sql = require('mssql');
const config = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    },
});

// Create a new request
router.post('/', authenticateToken, upload.array('files'), async (req, res) => {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const {
            title,
            purpose,
            expectedBenefits,
            receiverId,
            initialDueDate,
        } = req.body;

        // Insert the request
        const requestResult = await client.query(
            `INSERT INTO ApplicationRequests (
                Title,
                Purpose,
                ExpectedBenefits,
                RequesterId,
                ReceiverId,
                InitialDueDate,
                CurrentDueDate,
                Status,
                CreatedAt
            ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, NOW())
            RETURNING RequestId`,
            [
                title,
                purpose,
                expectedBenefits,
                req.user.userId, // From auth middleware
                receiverId,
                initialDueDate,
                'Pending',
            ]
        );

        const requestId = requestResult.rows[0].requestId;

        // Handle file uploads if any
        if (req.files && req.files.length > 0) {
            const fileValues = req.files.map((file) => [
                requestId,
                file.originalname,
                file.path,
                req.user.userId,
            ]);

            const fileQuery = `
                INSERT INTO RequestFiles (
                    RequestId,
                    FileName,
                    FilePath,
                    UploadedBy,
                    UploadedAt
                ) VALUES ${fileValues
                    .map(
                        (_, index) =>
                            `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${
                                index * 4 + 4
                            }, NOW())`
                    )
                    .join(', ')}
            `;

            await client.query(fileQuery, fileValues.flat());
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Request created successfully',
            requestId,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating request:', error);
        res.status(500).json({
            message: 'Error creating request',
            error: error.message,
        });
    } finally {
        client.release();
    }
});

// Get all requests for a user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const userId = req.user.id;
        const role = req.user.role;

        let query = `
            SELECT 
                r.RequestId,
                r.Title,
                r.Purpose,
                r.ExpectedBenefits,
                r.Status,
                r.CreatedAt,
                r.InitialDueDate,
                r.CurrentDueDate,
                r.ReviewDueDate,
                req.FullName as RequesterName,
                rec.FullName as ReceiverName
            FROM ApplicationRequests r
            INNER JOIN UsersEPPA req ON r.RequesterId = req.UserId
            INNER JOIN UsersEPPA rec ON r.ReceiverId = rec.UserId
            WHERE 1=1
        `;

        // Filter based on user role
        if (role === 'requester') {
            query += ' AND r.RequesterId = @UserId';
        } else if (role === 'receiver') {
            query += ' AND r.ReceiverId = @UserId';
        }

        query += ' ORDER BY r.CreatedAt DESC';

        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(query);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: 'Error fetching requests' });
    } finally {
        sql.close();
    }
});

// Get request details by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const requestId = req.params.id;
        const userId = req.user.id;

        // Get request details
        const requestResult = await pool.request()
            .input('RequestId', sql.Int, requestId)
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT 
                    r.*,
                    req.FullName as RequesterName,
                    rec.FullName as ReceiverName
                FROM ApplicationRequests r
                INNER JOIN UsersEPPA req ON r.RequesterId = req.UserId
                INNER JOIN UsersEPPA rec ON r.ReceiverId = rec.UserId
                WHERE r.RequestId = @RequestId
                AND (r.RequesterId = @UserId OR r.ReceiverId = @UserId)
            `);

        if (requestResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Get files associated with the request
        const filesResult = await pool.request()
            .input('RequestId', sql.Int, requestId)
            .query(`
                SELECT 
                    rf.*,
                    u.FullName as UploaderName
                FROM RequestFiles rf
                INNER JOIN Users u ON rf.UploadedBy = u.UserId
                WHERE rf.RequestId = @RequestId
            `);

        const response = {
            ...requestResult.recordset[0],
            files: filesResult.recordset
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching request details:', error);
        res.status(500).json({ message: 'Error fetching request details' });
    } finally {
        sql.close();
    }
});

module.exports = router; 