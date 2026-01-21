const { pool } = require('../config/database');

module.exports = function (io) {
    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id, 'from IP:', socket.handshake.address);

        // Store user data if authenticated
        if (socket.user) {
            console.log(`Socket ${socket.id} authenticated as ${socket.user.role}: ${socket.user.id}`);
        }

        socket.on('join-room', async ({ roomId, role }) => {
            try {
                console.log(`Attempting to join room: ${roomId} with role: ${role}, socket: ${socket.id}`);

                // Validate user has access to this room
                if (socket.user) {
                    const allowed = await pool.query(
                        `SELECT id FROM appointments 
                         WHERE room_id = $1 
                         AND (user_id = $2 OR doctor_id = $3)`,
                        [roomId, socket.user.id, socket.user.id]
                    );

                    if (!allowed.rows.length) {
                        socket.emit("error", { message: "Unauthorized room access" });
                        console.log(`Unauthorized access attempt to room ${roomId} by ${socket.user.id}`);
                        return;
                    }
                }

                // Join the room
                socket.join(roomId);
                socket.roomId = roomId;
                socket.role = role;

                console.log(`${role} successfully joined room: ${roomId}, socket: ${socket.id}`);

                // Get room participants
                const room = io.sockets.adapter.rooms.get(roomId);
                const participants = room ? Array.from(room).length : 0;
                console.log(`Room ${roomId} now has ${participants} participants`);

                // Notify the other side
                if (role === 'user') {
                    // User joined, notify doctor if present
                    socket.to(roomId).emit('doctor-ready');
                    socket.emit('user-joined', {
                        roomId,
                        message: 'Waiting for doctor...',
                        participants
                    });
                    console.log(`User joined, notified doctor in room: ${roomId}`);
                } else if (role === 'doctor') {
                    // Doctor joined, notify user if present
                    socket.to(roomId).emit('user-ready');
                    socket.emit('doctor-joined', {
                        roomId,
                        message: 'Waiting for patient...',
                        participants
                    });
                    console.log(`Doctor joined, notified user in room: ${roomId}`);
                }

                // Log all sockets in this room
                const socketsInRoom = await io.in(roomId).fetchSockets();
                console.log(`Sockets in room ${roomId}:`, socketsInRoom.map(s => ({
                    id: s.id,
                    role: s.role,
                    userId: s.user?.id || 'anonymous'
                })));

            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room: ' + error.message });
            }
        });

        socket.on('doctor-end-call', async ({ roomId, appointmentId, notes }) => {
            try {
                console.log(`Doctor ending call for room: ${roomId}, appointment: ${appointmentId}`);

                // Update appointment status in database
                const updateResult = await pool.query(
                    `UPDATE appointments 
                     SET status = 'completed', completed_at = NOW() 
                     WHERE room_id = $1 AND status = 'started'`,
                    [roomId]
                );

                console.log(`Appointment update result: ${updateResult.rowCount} rows updated`);

                // Save notes if provided
                if (notes && notes.trim()) {
                    await pool.query(
                        `INSERT INTO doctor_notes (room_id, notes, created_at) 
                         VALUES ($1, $2, NOW()) 
                         ON CONFLICT (room_id) 
                         DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW()`,
                        [roomId, notes.trim()]
                    );
                    console.log(`Notes saved for room: ${roomId}`);
                }

                // Emit to user that call is ending and prescription is ready
                io.to(roomId).emit('call-ended-by-doctor', {
                    roomId,
                    appointmentId,
                    reason: notes || 'Doctor ended the consultation',
                    timestamp: new Date().toISOString()
                });

                // Also emit prescription-ready event
                io.to(roomId).emit('prescription-ready', {
                    roomId,
                    appointmentId,
                    message: 'Prescription is now available for download'
                });

                // Confirm to doctor
                socket.emit('call-ended-confirmed', {
                    message: 'Call ended successfully'
                });

                console.log(`Call ended events emitted for room: ${roomId}`);

                // Disconnect all sockets in the room after a delay
                setTimeout(async () => {
                    const sockets = await io.in(roomId).fetchSockets();
                    sockets.forEach(s => {
                        s.leave(roomId);
                    });
                    console.log(`All sockets removed from room: ${roomId}`);
                }, 5000);

            } catch (error) {
                console.error('Doctor end call error:', error);
                socket.emit('error', { message: 'Failed to end call properly: ' + error.message });
            }
        });

        // WebRTC signaling
        socket.on('signal', ({ roomId, ...payload }) => {
            console.log(`Signal from ${socket.id} to room ${roomId}:`, Object.keys(payload)[0]);

            // Send to all other clients in the room
            socket.to(roomId).emit('signal', {
                ...payload,
                from: socket.id
            });
        });

        // Mute state updates
        socket.on('user-mute-state', ({ roomId, isMuted }) => {
            console.log(`User mute state in ${roomId}: ${isMuted}`);
            socket.to(roomId).emit('user-mute-state', { isMuted });
        });

        socket.on('user-camera-state', ({ roomId, isVideoOff }) => {
            console.log(`User camera state in ${roomId}: ${isVideoOff}`);
            socket.to(roomId).emit('user-camera-state', { isVideoOff });
        });

        socket.on('doctor-mute-state', ({ roomId, isMuted }) => {
            console.log(`Doctor mute state in ${roomId}: ${isMuted}`);
            socket.to(roomId).emit('doctor-mute-state', { isMuted });
        });

        socket.on('doctor-camera-state', ({ roomId, isVideoOff }) => {
            console.log(`Doctor camera state in ${roomId}: ${isVideoOff}`);
            socket.to(roomId).emit('doctor-camera-state', { isVideoOff });
        });

        // Ping/Pong for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        socket.on('disconnect', async (reason) => {
            console.log(`Socket disconnected: ${socket.id}, role: ${socket.role}, room: ${socket.roomId}, reason: ${reason}`);

            if (socket.roomId) {
                // Immediate notification for disconnection
                if (socket.role === 'user') {
                    socket.to(socket.roomId).emit('user-disconnected', {
                        socketId: socket.id,
                        timestamp: new Date().toISOString()
                    });
                } else if (socket.role === 'doctor') {
                    socket.to(socket.roomId).emit('doctor-disconnected', {
                        socketId: socket.id,
                        timestamp: new Date().toISOString()
                    });
                }

                // Leave the room
                socket.leave(socket.roomId);

                // Log remaining participants
                const room = io.sockets.adapter.rooms.get(socket.roomId);
                const remaining = room ? Array.from(room).length : 0;
                console.log(`Room ${socket.roomId} now has ${remaining} participants after disconnect`);
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error for', socket.id, ':', error);
        });
    });

    // Handle connection errors
    io.engine.on("connection_error", (err) => {
        console.error('Socket.IO connection error:', err);
    });
};