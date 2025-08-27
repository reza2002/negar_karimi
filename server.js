const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Database Configuration
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
        console.error('Please check your MySQL server is running and credentials are correct in server.js');
        process.exit(1);
    }
}

connectToDatabase();

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

const peers = {}; // A simple in-memory object to track connected peers
const room = 'mainClassRoom';

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);
    socket.join(room);

    // Announce a new user has joined the room
    socket.on('join', () => {
        peers[socket.id] = { id: socket.id };
        console.log(`User ${socket.id} joined room: ${room}`);

        // For each existing peer, send an 'offer' to the new peer
        for (const peerId in peers) {
            if (peerId !== socket.id) {
                socket.emit('peer-joined', { peerId, isInitiator: false });
                io.to(peerId).emit('peer-joined', { peerId: socket.id, isInitiator: true });
            }
        }
    });

    // Handle WebRTC signals from peers
    socket.on('webrtc_signal', (data) => {
        const targetSocketId = data.target;
        if (peers[targetSocketId]) {
            io.to(targetSocketId).emit('webrtc_signal', {
                ...data,
                sender: socket.id
            });
        }
    });
    
    // Handle chat messages
    socket.on('chat message', (msg) => {
        console.log(`Message from ${socket.id}: ${msg}`);
        io.to(room).emit('chat message', { senderId: socket.id, message: msg });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete peers[socket.id];
        io.to(room).emit('peer-left', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Main page: http://localhost:${port}/`);
    console.log(`Login page: http://localhost:${port}/login`);

});

