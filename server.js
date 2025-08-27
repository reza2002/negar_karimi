const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

async function connectToDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        connection.release();
        console.log('Connected to MySQL Database!');
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
}

async function initializeDB() {
    try {
        const connection = await pool.getConnection();
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await connection.query(sql);
        console.log('Database initialized successfully!');
        connection.release();
    } catch (err) {
        console.error('Error initializing database:', err.message);
    }
}

connectToDatabase().then(async () => {
    await initializeDB();

    server.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Main page: http://localhost:${port}/`);
        console.log(`Login page: http://localhost:${port}/login`);
    });
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/live-class.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'live-class.html'));
});

app.post('/api/login', async (req, res) => {
    const { studentCode } = req.body;
    try {
        const [rows] = await pool.execute('SELECT StudentID, FirstName, LastName FROM Students WHERE StudentCode = ?', [studentCode]);
        if (rows.length > 0) {
            res.json({ success: true, student: rows[0] });
        } else {
            res.json({ success: false, message: 'کد دانشجویی صحیح نیست.' });
        }
    } catch (err) {
        console.error('MySQL error during login:', err);
        res.status(500).json({ success: false, message: 'خطا در سرور.' });
    }
});

app.get('/api/courses/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const [rows] = await pool.execute('SELECT CourseName, Instructor, ClassTime, ClassLink FROM Courses WHERE StudentID = ?', [studentId]);
        res.json({ success: true, courses: rows });
    } catch (err) {
        console.error('MySQL error during fetching courses:', err);
        res.status(500).json({ success: false, message: 'خطا در سرور.' });
    }
});

const peers = {};
const room = 'mainClassRoom';

io.on('connection', (socket) => {
    socket.join(room);
    socket.on('join', () => {
        peers[socket.id] = { id: socket.id };
        for (const peerId in peers) {
            if (peerId !== socket.id) {
                socket.emit('peer-joined', { peerId, isInitiator: false });
                io.to(peerId).emit('peer-joined', { peerId: socket.id, isInitiator: true });
            }
        }
    });

    socket.on('webrtc_signal', (data) => {
        const targetSocketId = data.target;
        if (peers[targetSocketId]) {
            io.to(targetSocketId).emit('webrtc_signal', {
                ...data,
                sender: socket.id
            });
        }
    });

    socket.on('chat message', (msg) => {
        io.to(room).emit('chat message', { senderId: socket.id, message: msg });
    });

    socket.on('disconnect', () => {
        delete peers[socket.id];
        io.to(room).emit('peer-left', socket.id);
    });
});
