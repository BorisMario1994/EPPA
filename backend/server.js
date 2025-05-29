const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Database configuration
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Connect to the database
sql.connect(config).catch(err => {
    console.error('Database connection failed:', err);
});

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// PDF upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        //console.log('Processing file:', file); // Debug log
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// Import routes
const authRoutes = require('./routes/auth');

// Use routes
app.use('/api/auth', authRoutes);

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT USERNAME 
            FROM HELPDESK_USER 
            WHERE USERNAME LIKE '%-01%' 
               OR USERNAME LIKE '%MISW%' 
            ORDER BY USERNAME
        `);
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});


// Update the get attachments endpoint to use PDFDocuments table
app.get('/api/requests/attachments/:requestId', async (req, res) => {
    const { requestId } = req.params;
   // console.log('Request ID:', requestId);
    try {
      //  console.log('Request ID:', requestId);
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('requestId', sql.VarChar, requestId)
            .query(`
                SELECT d.DocumentId, d.FileName, d.FilePath, d.UploadedAt, u.username as UploadedByName,d.RequestId
                FROM PDFDocuments d
                JOIN HELPDESK_USER u ON d.UploadedBy = u.username
                WHERE d.RequestId = @requestId
                ORDER BY d.UploadedAt DESC
            `);
        
        //console.log('Attachments from database:', result.recordset); // Debug log
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching attachments:', err);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});

// Get user's requests
app.get('/api/requests/:type/:userId', async (req, res) => {
    const { type, userId } = req.params;
    let whereClause = '';
    let joinClause = '';
    let orderBy = 'ORDER BY r.RequestId DESC';
   // console.log(type, userId);
    switch (type) {
        case 'outgoing':
            whereClause = 
            `r.RequesterId = @userId 
            and 1 <> ISNULL((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId AND A.Role IN ('CC','RECEIVER') and A.ApprovedAt is  null  ),0) 
            and r.closedAt IS NULL` ;
            break;
        case 'needtoapprove':
            whereClause = 
            ` 1 = ISNULL((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId AND A.Role IN ('CC','RECEIVER') and A.ApprovedAt is  null AND A.UserId = @userId and (select ApprovedAt from [dbo].[RequestAccessUsers] C WHERE C.RequestId = r.RequestId and C.LineNum = A.Linenum-1) is not null  ),0) 
            and r.closedAt IS NULL`;
           
            break;
            case 'assignrequest':
                joinClause = `left join requestaccessusers rau ON r.RequestId = rau.RequestId and rau.UserId = @userId and rau.Role IN ('RECEIVER')`;
                whereClause = 
                `1 <> isnull((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId AND A.Role IN ('CC','RECEIVER') and A.ApprovedAt is null  ),0)
                   and r.closedAt IS NULL`;
            break;  
        case 'notyetapproved':
            whereClause = 
            `r.RequesterId = @userId 
            and 1 = ISNULL((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId and A.Role IN ('CC','RECEIVER') and ApprovedAt is null  ),0)
            and r.closedAt IS NULL
            `;
            break;
        case 'todo':
            whereClause = 'r.PIC = @userId  AND r.ClosedAt IS NULL';
            break;
        case 'done':
            whereClause = 'r.RequesterId = @userId AND r.ClosedAt IS NOT NULL';
            break;
        default:
            whereClause = 'r.RequesterId = @userId';
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query(`
                
 
 SELECT r.*, 
                       requester.username  as requesterName, 
					   (
                           SELECT STUFF((SELECT  ',' + CONCAT(u.username,' ',(CASE WHEN rau2.ApprovedAt is not null then  N'✓' end))
                           FROM RequestAccessUsers rau2
                           JOIN HELPDESK_USER u ON rau2.UserId = u.username
                           WHERE rau2.RequestId = r.RequestId AND rau2.Role IN ('CC','RECEIVER')
						   ORDER BY RAU2.LINENUM
                           FOR XML PATH('')),1,1,'')
                       ) as approvedByNames,
                       PIC.username as PICName
                FROM ApplicationRequests r
                JOIN HELPDESK_USER requester ON r.RequesterId = requester.username
                left join HELPDESK_USER PIC ON r.PIC = PIC.username
                ${joinClause}
                ${whereClause ? 'WHERE ' + whereClause : ''}
                ${orderBy}
            `);
        res.json(result.recordset);
        //console.log(result.recordset);
    } catch (err) {
        console.error('Error fetching requests:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// Get assigned requests
app.get('/api/assigned-requests/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query(`
                SELECT r.*, 
                       requester.username as requesterName
                FROM ApplicationRequests r
                JOIN HELPDESK_USER requester ON r.RequesterId = requester.username
                WHERE r.PIC = @userId
                ORDER BY r.CreatedAt DESC
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching assigned requests:', err);
        res.status(500).json({ error: 'Failed to fetch assigned requests' });
    }
});

// Routes will be added here
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Application Request Management System' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
}); 
// Create request endpoint
app.post('/api/requests', upload.array('attachments'), async (req, res) => {
    try {
        //console.log('Request body:', req.body); // Debug log
        //console.log('Request files:', req.files); // Debug log

        const { title, purpose, expectedBenefits, requesterId, cc} = req.body;
        const files = req.files;
        
        // Convert approvedBy and knownBy to arrays if they're not already
        const ccArray = Array.isArray(cc) ? cc : [cc].filter(Boolean);
           //  console.log('Approved By Array:', approvedByArray); // Debug log
      //  console.log('Known By Array:', knownByArray); // Debug log

        const pool = await sql.connect(config);

        // 1. Generate the new RequestNo
        const requesterPrefix = requesterId.substring(0, 4);
        const requestNoPrefix = `${requesterPrefix}-`;

        // Get the latest RequestNo for this requester
        const latestNoResult = await pool.request()
            .input('prefix', sql.VarChar, requestNoPrefix + '%')
            .query(`
                SELECT TOP 1 RequestNo
                FROM ApplicationRequests
                WHERE RequestNo LIKE @prefix
                ORDER BY RequestId DESC
            `);

        let newNumber = 1;
        if (latestNoResult.recordset.length > 0) {
            const latestRequestNo = latestNoResult.recordset[0].RequestNo;
            const match = latestRequestNo.match(/-(\d+)$/);
            if (match) {
                newNumber = parseInt(match[1], 10) + 1;
            }
        }
        const newRequestNo = `${requesterPrefix}-${String(newNumber).padStart(3, '0')}`;

        // 2. Insert the new request
        const result = await pool.request()
            .input('requestNo', sql.VarChar, newRequestNo)
            .input('title', sql.VarChar, title)
            .input('purpose', sql.NVarChar, purpose)
            .input('expectedBenefits', sql.NVarChar, expectedBenefits)
            .input('requesterId', sql.VarChar, requesterId)
            .input('status', sql.VarChar, 'Pending')
            .query(`
                INSERT INTO ApplicationRequests 
                (RequestNo, Title, Purpose, ExpectedBenefits, RequesterId, Status, CreatedAt, ReceivedDate)
                VALUES (@requestNo, @title, @purpose, @expectedBenefits, @requesterId, @status, GETDATE(), GETDATE());
                SELECT SCOPE_IDENTITY() as RequestId;
            `);
     


        const requestId = result.recordset[0].RequestId;


      /*   await pool.request()
        .input('creatorId', sql.VarChar, requesterId) // The user who triggered the action
        .input('requestId', sql.Int, requestId)
        .input('remarks', sql.NVarChar, `User ${requesterId} created a new request ${requestId}`)
        .query(`
            INSERT INTO NotificationList (CreatorId, RequestId, Remarks)    
            VALUES (@creatorId, @requestId, @remarks)
            `); */


        // Insert attachments
        if (files && files.length > 0) {
            for (const file of files) {
                // Convert backslashes to forward slashes
                const filePath = file.path.replace(/\\/g, '/');
                await pool.request()
                    .input('requestId', sql.Int, requestId)
                    .input('fileName', sql.NVarChar, file.originalname)
                    .input('filePath', sql.NVarChar, filePath) // Use the converted path
                    .input('uploadedBy', sql.VarChar, requesterId)
                    .query(`
                        INSERT INTO PDFDocuments 
                        (RequestId, FileName, FilePath, UploadedBy, UploadedAt)
                        VALUES (@requestId, @fileName, @filePath, @uploadedBy, GETDATE())
                    `);
            }
        }

        // Insert cc users
        if (ccArray.length > 0) {
            for (let i = 0; i < ccArray.length; i++) {
                const userId = ccArray[i];
                const lineNum = i + 1; // LineNum starts from 1
                console.log(userId, lineNum);
                await pool.request()
                    .input('requestId', sql.Int, requestId)
                    .input('lineNum', sql.Int, lineNum)
                    .input('userId', sql.VarChar, userId)
                    .input('role', sql.NVarChar, userId === 'MITC-01' ? 'Receiver' : 'CC')
                    .query(`
                        INSERT INTO RequestAccessUsers (RequestId, LineNum, UserId, Role)
                        VALUES (@requestId, @lineNum, @userId, @role)
                    `);

                // After successful insert into RequestAccessUsers
                await pool.request()
                    .input('creatorId', sql.VarChar, userId) // The user who triggered the action
                    .input('requestId', sql.Int, requestId)
                    .input('remarks', sql.NVarChar, `User ${userId} added as ${userId === 'MITC-01' ? 'Receiver' : 'CC'} to request ${requestId}`)
                    .query(`
                        INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
                        VALUES (@creatorId, @requestId, @remarks)
                    `);
            }
        }

        // Insert requester 
        await pool.request()
            .input('requestId', sql.Int, requestId)
            .input('requesterId', sql.VarChar, requesterId)
            .query(`
                INSERT INTO RequestAccessUsers (RequestId, LineNum, UserId, Role , ApprovedAt) 
                VALUES (@requestId, 0, @requesterId, 'Requester',GETDATE());
            `);

        res.json({ message: 'Request created successfully', requestId });
    } catch (err) {
        console.error('Error creating request:', err);
        res.status(500).json({ error: err.message || 'Failed to create request' });
    }
});

// Add error handling for multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'File upload error: ' + err.message });
    } else if (err) {
        console.error('Other error:', err);
        return res.status(500).json({ error: err.message });
    }
    next();
});


// Get annotations for a specific document
app.get('/api/documents/:documentId/annotations', async (req, res) => {
    const { documentId } = req.params;
    
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('documentId', sql.Int, documentId)
            .query(`
                SELECT a.*, u.username as UserName
                FROM PDFAnnotations a
                JOIN HELPDESK_USER u ON a.UserId = u.username
                WHERE a.DocumentId = @documentId
                ORDER BY a.CreatedAt DESC
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching annotations:', err);
        res.status(500).json({ error: 'Failed to fetch annotations' });
    }
});

// Add new annotation
app.post('/api/documents/:documentId/annotations', async (req, res) => {
    const { documentId } = req.params;
    const { userId, requestId, type, content, pageNumber, x, y, x1, y1, x2, y2 } = req.body;
    const annotationType = type;

    try {
        const pool = await sql.connect(config);
        let annotationId;
       // console.log(annotationType)
       // console.log(userId, annotationType, content, pageNumber, x, y, x1, y1, x2, y2 );
        if (annotationType === 'pointer') {
            const result = await pool.request()
                .input('documentId', sql.Int, documentId)
                .input('userId', sql.VarChar, userId)
                .input('annotationType', sql.NVarChar, annotationType)
                .input('content', sql.NVarChar, content)
                .input('pageNumber', sql.Int, pageNumber)
                .input('xCoordinate', sql.Float, x)
                .input('yCoordinate', sql.Float, y)
                .query(`
                    INSERT INTO PDFAnnotations 
                    (DocumentId, UserId, AnnotationType, Content, PageNumber, XCoordinate, YCoordinate)
                    OUTPUT INSERTED.AnnotationId
                    VALUES (@documentId, @userId, @annotationType, @content, @pageNumber, @xCoordinate, @yCoordinate);
                    
                `);
              // console.log('SQL result:', result);
            annotationId = result.recordset[0].AnnotationId;
           
            
        
        await pool.request()
        .input('creatorId', sql.VarChar, userId) // The user who triggered the action
        .input('requestId', sql.Int, requestId)
        .input('pageNumber', sql.Int, pageNumber)
        .input('remarks', sql.NVarChar, `User ${userId} added a new pointer on page ${pageNumber} to request ${requestId}`)
        .query(`
            INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
            VALUES (@creatorId, @requestId, @remarks)
        `);


        } else if (annotationType === 'highlight' || annotationType === 'rectangle') {
            const result = await pool.request()
                .input('documentId', sql.Int, documentId)
                .input('userId', sql.VarChar, userId)
                .input('annotationType', sql.NVarChar, annotationType)
                .input('content', sql.NVarChar, content)
                .input('pageNumber', sql.Int, pageNumber)
                .input('x1', sql.Float, x1)
                .input('y1', sql.Float, y1)
                .input('x2', sql.Float, x2)
                .input('y2', sql.Float, y2)
                .query(`
                    INSERT INTO PDFAnnotations 
                    (DocumentId, UserId, AnnotationType, Content, PageNumber, X1, Y1, X2, Y2)
                    OUTPUT INSERTED.AnnotationId
                    VALUES (@documentId, @userId, @annotationType, @content, @pageNumber, @x1, @y1, @x2, @y2);
                    
                `); 
            annotationId = result.recordset[0].AnnotationId;
            
        await pool.request()
        .input('creatorId', sql.VarChar, userId) // The user who triggered the action
        .input('requestId', sql.Int, requestId)
        .input('pageNumber', sql.Int, pageNumber)
        .input('remarks', sql.NVarChar, `User ${userId} added a new highlight on page ${pageNumber} to request ${requestId}`)
        .query(`
            INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
            VALUES (@creatorId, @requestId, @remarks)
        `);

        } else {
            return res.status(400).json({ error: 'Invalid annotation type' });
        }
        
        // Record in history
        await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .input('userId', sql.VarChar, userId)
            .input('action', sql.NVarChar, 'CREATE')
            .input('newContent', sql.NVarChar, content)
            .query(`
                INSERT INTO AnnotationHistory 
                (AnnotationId, UserId, Action, NewContent)
                VALUES (@annotationId, @userId, @action, @newContent)
            `);

        res.json({ message: 'Annotation added successfully', annotationId });
    } catch (err) {
        console.error('Error adding annotation:', err);
        res.status(500).json({ error: 'Failed to add annotation' });
    }
});

// Get annotation history
app.get('/api/annotations/:annotationId/history', async (req, res) => {
    const { annotationId } = req.params;
    
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .query(`
                SELECT h.*, u.username as UserName
                FROM AnnotationHistory h
                JOIN HELPDESK_USER u ON h.UserId = u.username
                WHERE h.AnnotationId = @annotationId
                ORDER BY h.ChangedAt DESC
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching annotation history:', err);
        res.status(500).json({ error: 'Failed to fetch annotation history' });
    }
});

// Update annotation
app.put('/api/annotations/:annotationId', async (req, res) => {
    const { annotationId } = req.params;
    const { userId, content } = req.body;
    
    try {
        const pool = await sql.connect(config);
        
        // Get current content
        const currentAnnotation = await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .query('SELECT Content FROM PDFAnnotations WHERE AnnotationId = @annotationId');
        
        const previousContent = currentAnnotation.recordset[0].Content;

        // Update annotation
        await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .input('content', sql.NVarChar, content)
            .query('UPDATE PDFAnnotations SET Content = @content WHERE AnnotationId = @annotationId');

        // Record in history
        await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .input('userId', sql.VarChar, userId)
            .input('action', sql.NVarChar, 'UPDATE')
            .input('previousContent', sql.NVarChar, previousContent)
            .input('newContent', sql.NVarChar, content)
            .query(`
                INSERT INTO AnnotationHistory 
                (AnnotationId, UserId, Action, PreviousContent, NewContent)
                VALUES (@annotationId, @userId, @action, @previousContent, @newContent)
            `);

        res.json({ message: 'Annotation updated successfully' });
    } catch (err) {
        console.error('Error updating annotation:', err);
        res.status(500).json({ error: 'Failed to update annotation' });
    }
});

// Delete annotation
app.delete('/api/annotations/:annotationId', async (req, res) => {
    const { annotationId } = req.params;
    const { userId } = req.body;
    
    try {
        const pool = await sql.connect(config);
        
        // Get current content
        const currentAnnotation = await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .query('SELECT Content FROM PDFAnnotations WHERE AnnotationId = @annotationId');
        
        const previousContent = currentAnnotation.recordset[0].Content;

        // Delete annotation
        await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .query('DELETE FROM PDFAnnotations WHERE AnnotationId = @annotationId');

        // Record in history
        await pool.request()
            .input('annotationId', sql.Int, annotationId)
            .input('userId', sql.VarChar, userId)
            .input('action', sql.NVarChar, 'DELETE')
            .input('previousContent', sql.NVarChar, previousContent)
            .query(`
                INSERT INTO AnnotationHistory 
                (AnnotationId, UserId, Action, PreviousContent)
                VALUES (@annotationId, @userId, @action, @previousContent)
            `);

        res.json({ message: 'Annotation deleted successfully' });
    } catch (err) {
        console.error('Error deleting annotation:', err);
        res.status(500).json({ error: 'Failed to delete annotation' });
    }
});

// Combined request count endpoint
app.get('/api/requests/count/:type/:userId', async (req, res) => {
    const { type, userId } = req.params;
    let whereClause = '';
    let joinClause = '';

    switch (type) {
        case 'outgoing':
            whereClause = 
            `r.RequesterId = @userId 
              and 1 <> isnull((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId AND A.Role IN ('CC','RECEIVER') and A.ApprovedAt is  null  ) ,0)
            and r.closedAt IS NULL`;

            break;
        case 'assignrequest':
            joinClause = `left join requestaccessusers rau ON r.RequestId = rau.RequestId and rau.UserId = @userId and rau.Role IN ('RECEIVER')`;
            whereClause = 
            `1 <> isnull((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId AND A.Role IN ('CC','RECEIVER') and A.ApprovedAt is null  ),0)
            and r.closedAt IS NULL`;

            break;
        case 'notyetapproved':
            whereClause = 
            `r.RequesterId = @userId 
            and 1 = ISNULL((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId and A.Role IN ('CC','RECEIVER') and ApprovedAt is null  ),0)
            and r.closedAt IS NULL
            `;
             break;
        case 'done':
            whereClause = 'r.RequesterId = @userId AND r.ClosedAt IS NOT NULL';

            break;
        case 'needtoapprove':
            whereClause = 
            `(1 = ISNULL((select distinct 1 from [dbo].[RequestAccessUsers] A WHERE  A.RequestId = r.RequestId AND A.Role IN ('CC','RECEIVER') and A.ApprovedAt is  null AND A.UserId = @userId and (select ApprovedAt from [dbo].[RequestAccessUsers] C WHERE C.RequestId = r.RequestId and C.LineNum = A.Linenum-1) is not null ),0) )
            and r.closedAt IS NULL`;
            break;
        case 'todo':
            whereClause = 'r.PIC = @userId  AND r.ClosedAt IS NULL';
            break;
            ;
            whereClause = 'r.closedAt IS NULL';
            break;
        default:
            return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query(`
                SELECT COUNT(*) as count
                FROM ApplicationRequests r
                ${joinClause}
                WHERE ${whereClause}
            `);

        res.json({ count: result.recordset[0]?.count ?? 0 });
    } catch (err) {
        console.error('Error fetching request count:', err);
        res.status(500).json({ error: 'Failed to fetch request count' });
    }
});

app.post('/api/requests/:requestId/addUser', async (req, res) => {
  const { requestId } = req.params;
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role are required' });
  }

  try {
    const pool = await sql.connect(config);

    // Check if the user is already assigned to this request with this role
    const checkResult = await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.VarChar, userId)
      .input('role', sql.NVarChar(50), role)
      .query(`
        SELECT 1 FROM RequestAccessUsers
        WHERE RequestId = @requestId AND UserId = @userId AND Role = @role
      `);

    if (checkResult.recordset.length > 0) {
      return res.status(409).json({ error: 'User already assigned to this request with this role' });
    }

    // Insert the new user-role for this request
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.VarChar, userId)
      .input('role', sql.NVarChar(50), role)
      .query(`
        INSERT INTO RequestAccessUsers (RequestId, UserId, Role)
        VALUES (@requestId, @userId, @role)
      `);

    // After successful insert into RequestAccessUsers
    await pool.request()
        .input('creatorId', sql.VarChar, userId) // The user who triggered the action
        .input('requestId', sql.Int, requestId)
        .input('remarks', sql.NVarChar, `User ${userId} added as ${role} to request ${requestId}`)
        .query(`
            INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
            VALUES (@creatorId, @requestId, @remarks)
        `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error adding user to request:', err);
    res.status(500).json({ error: 'Failed to add user to request' });
  }
});

// Approve a request for a specific user (ApprovedBy or Receiver)
app.post('/api/requests/:requestId/approve', async (req, res) => {
  const { requestId } = req.params;
  const { userId } = req.body; // Pass userId in the body
 // console.log(userId);
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const pool = await sql.connect(config);

    // Update ApprovedAt for the ApprovedBy or Receiver role for this user and request
    const result = await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.VarChar, userId)
      .query(`
        UPDATE RequestAccessUsers
        SET ApprovedAt = GETDATE()
        WHERE RequestId = @requestId AND UserId = @userId AND (Role = 'ApprovedBy' OR Role = 'Receiver')
      `);

      await pool.request()
        .input('creatorId', sql.VarChar, userId) // The user who triggered the action
        .input('requestId', sql.Int, requestId)
        .input('remarks', sql.NVarChar, `User ${userId} approved request ${requestId}`)
        .query(`
            INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
            VALUES (@creatorId, @requestId, @remarks)
        `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Assign PIC for a request
app.post('/api/requests/:requestId/assignpic', async (req, res) => {
  const { requestId } = req.params;
  const { userId } = req.body; // Pass userId in the body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const pool = await sql.connect(config);

    // Update the PIC column in ApplicationRequests
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('userId', sql.VarChar, userId)
      .query(`
        UPDATE ApplicationRequests
        SET PIC = @userId
        WHERE RequestId = @requestId
      `);

      await pool.request()
        .input('creatorId', sql.VarChar, userId) // The user who triggered the action
        .input('requestId', sql.Int, requestId)
        .input('remarks', sql.NVarChar, `User ${userId} assigned as PIC to request ${requestId}`)
        .query(`
            INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
            VALUES (@creatorId, @requestId, @remarks)
        `);


    res.json({ success: true });
  } catch (err) {
    console.error('Error assigning PIC:', err);
    res.status(500).json({ error: 'Failed to assign PIC' });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const pool = await sql.connect(config);
    // Fetch notifications not marked as read by this user
    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
       
        SELECT A.NotificationId, A.CreatorId, A.RequestId, A.Remarks, B.username as CreatorName,
        C.UserId NotifReceiver
        FROM NotificationList A
        JOIN HELPDESK_USER B ON A.CreatorId = B.username
        JOIN  RequestAccessUsers C ON C.RequestId = A.RequestId 
        LEFT JOIN Notificationread D ON D.NotificationId = A.NotificationId and D.ContributorId = C.UserId
        WHERE D.notificationId is null
        and C.UserId = @userId
        ORDER BY A.NotificationId DESC

      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notification/read/:notificationId', async (req, res) => {
  const { notificationId } = req.params;

  const [idStr, ...restParts] = notificationId.split('-');
  const notifIdPart1 = Number(idStr);
  const notifIdPart2 = restParts.join('-'); // "MISW-04"

  try {
    const pool = await sql.connect(config);
    const request = pool.request();
  
    //console.log("Parsed values:");
    //console.log("notifIdPart1:", notifIdPart1); // number
    //console.log("notifIdPart2:", notifIdPart2); // string
  
    // Log the actual query string (for debugging purposes only)
   // console.log("Executing SQL query:");
    //console.log(`
    //  INSERT INTO NotificationRead (NotificationId, ContributorId, ReadAt)
    //  VALUES (${notifIdPart1}, '${notifIdPart2}', GETDATE())
    // `);
  
    await request
      .input('notificationId', sql.Int, notifIdPart1)
      .input('userId', sql.VarChar, notifIdPart2)
      .query(`
        INSERT INTO NotificationRead (NotificationId, ContributorId, ReadAt)
        VALUES (@notificationId, @userId, GETDATE())
      `);
  
    res.json({ success: true });
  
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
  
});

app.get('/api/timeline/:requestId', async (req, res) => {
  const { requestId } = req.params;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query(`
        SELECT t.*, u.username as UserName
        FROM RequestTimeline t
        LEFT JOIN HELPDESK_USER u ON t.ActionBy = u.username
        WHERE t.RequestId = @requestId
        ORDER BY t.TimelineId DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching timeline:', err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

app.post('/api/timeline/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { timeDate, remarks, actionType, userId } = req.body;

  if (!timeDate || !remarks || !actionType || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pool = await sql.connect(config);

    // 1. Check if the request is already closed
    const statusResult = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query('SELECT Status FROM ApplicationRequests WHERE RequestId = @requestId');

    if (
      !statusResult.recordset.length ||
      statusResult.recordset[0].Status === 'Closed'
    ) {
      return res.status(403).json({ error: 'Cannot add timeline entry to a closed request.' });
    }

    // Insert into RequestTimeline
    await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('timeDate', sql.Date, timeDate)
      .input('actionType', sql.NVarChar(100), actionType)
      .input('remarks', sql.NVarChar(sql.MAX), remarks)
      .input('userId', sql.VarChar, userId)
      .query(`
        INSERT INTO RequestTimeline (RequestId, TimeDate, ActionType, Remarks, ActionBy)
        VALUES (@requestId, @timeDate, @actionType, @remarks, @userId)
      `);

    // If actionType is "Close Request", update ClosedAt in ApplicationRequests
    if (actionType === 'Close Request') {
      await pool.request()
        .input('requestId', sql.Int, requestId)
        .input('closedAt', sql.Date, timeDate)
        .query(`
          UPDATE ApplicationRequests
          SET ClosedAt = @closedAt,Status = 'Closed'
          WHERE RequestId = @requestId
        `);
    }

    // Add to NotificationList
    await pool.request()
      .input('creatorId', sql.VarChar, userId)
      .input('requestId', sql.Int, requestId)
      .input('actionType', sql.NVarChar(100), actionType)
      .input('remarks', sql.NVarChar, `User ${userId} added a new timeline (${actionType}) entry to request ${requestId}`)
      .query(`
        INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
        VALUES (@creatorId, @requestId, @remarks)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Error adding timeline entry:', err);
    res.status(500).json({ error: 'Failed to add timeline entry' });
  }
});

// Add new attachment to a request
app.post('/api/requests/:requestId/attachments', upload.single('attachment'), async (req, res) => {
    const { requestId } = req.params;
    const { userId } = req.body; // userId should be sent in the form data
    console.log(req.body);
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const pool = await sql.connect(config);
        const filePath = req.file.path.replace(/\\/g, '/');
        await pool.request()
            .input('requestId', sql.Int, requestId)
            .input('fileName', sql.NVarChar, req.file.originalname)
            .input('filePath', sql.NVarChar, filePath)
            .input('uploadedBy', sql.VarChar, userId)
            .query(`
                INSERT INTO PDFDocuments 
                (RequestId, FileName, FilePath, UploadedBy, UploadedAt)
                VALUES (@requestId, @fileName, @filePath, @uploadedBy, GETDATE())
            `);

        // Add to NotificationList
        await pool.request()
            .input('creatorId', sql.VarChar, userId)
            .input('requestId', sql.Int, requestId)
            .input('remarks', sql.NVarChar, `User ${userId} uploaded a new attachment to request ${requestId}`)
            .query(`
                INSERT INTO NotificationList (CreatorId, RequestId, Remarks)
                VALUES (@creatorId, @requestId, @remarks)
            `);

        res.json({ message: 'Attachment uploaded successfully' });
    } catch (err) {
        console.error('Error uploading attachment:', err);
        res.status(500).json({ error: 'Failed to upload attachment' });
    }
});
