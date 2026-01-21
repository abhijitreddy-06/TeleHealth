const { pool } = require('../config/database');

module.exports = function (io) {
    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);

        socket.on('join-room', async ({ roomId, role }) => {
            try {
                // Store room info
                socket.roomId = roomId;
                socket.role = role;

                // Join the room
                socket.join(roomId);
                console.log(`${role} joined room: ${roomId}, socket: ${socket.id}`);

                // Get current room members
                const room = io.sockets.adapter.rooms.get(roomId) || new Set();
                const roomSize = room.size;

                // Notify both sides based on who's already in room
                if (role === 'user') {
                    // Check if doctor is already in room
                    const doctorInRoom = Array.from(room).some(socketId => {
                        const clientSocket = io.sockets.sockets.get(socketId);
                        return clientSocket && clientSocket.role === 'doctor';
                    });

                    socket.emit('user-joined', {
                        roomId,
                        message: doctorInRoom ? 'Doctor is ready' : 'Waiting for doctor...'
                    });

                    if (doctorInRoom) {
                        // Doctor is already waiting, notify doctor
                        socket.to(roomId).emit('user-ready');
                        console.log(`User ${socket.id} joined, doctor notified`);
                    }
                } else if (role === 'doctor') {
                    // Check if user is already in room
                    const userInRoom = Array.from(room).some(socketId => {
                        const clientSocket = io.sockets.sockets.get(socketId);
                        return clientSocket && clientSocket.role === 'user';
                    });

                    socket.emit('doctor-joined', {
                        roomId,
                        message: userInRoom ? 'Patient is ready' : 'Waiting for patient...'
                    });

                    if (userInRoom) {
                        // User is already waiting, notify user
                        socket.to(roomId).emit('doctor-ready');
                        console.log(`Doctor ${socket.id} joined, user notified`);
                    }
                }

            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('doctor-end-call', async ({ roomId, appointmentId, notes }) => {
            try {
                console.log(`Doctor ending call for room: ${roomId}, appointment: ${appointmentId}`);

                // Update appointment status
                await pool.query(
                    `UPDATE appointments 
                     SET status = 'completed', completed_at = NOW() 
                     WHERE room_id = $1 AND status = 'started'`,
                    [roomId]
                );

                // Save notes if provided
                if (notes && notes.trim()) {
                    await pool.query(
                        `INSERT INTO doctor_notes (room_id, notes, created_at) 
                         VALUES ($1, $2, NOW()) 
                         ON CONFLICT (room_id) 
                         DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW()`,
                        [roomId, notes.trim()]
                    );
                }

                // Notify user that call is ending
                io.to(roomId).emit('call-ended-by-doctor', {
                    roomId,
                    appointmentId,
                    reason: notes || 'Doctor ended the consultation',
                    timestamp: new Date().toISOString()
                });

                // Emit prescription-ready
                io.to(roomId).emit('prescription-ready', {
                    roomId,
                    appointmentId,
                    message: 'Prescription is now available for download'
                });

                // Confirm to doctor
                socket.emit('call-ended-confirmed', {
                    message: 'Call ended successfully'
                });

                console.log(`Call ended for room: ${roomId}`);

            } catch (error) {
                console.error('Doctor end call error:', error);
                socket.emit('error', { message: 'Failed to end call properly' });
            }
        });

        // WebRTC signaling - send to everyone in room except sender
        socket.on('signal', ({ roomId, ...payload }) => {
            console.log(`Signal from ${socket.role} in ${roomId}:`, payload.type || 'candidate');
            socket.to(roomId).emit('signal', { ...payload, from: socket.role });
        });

        // Mute state updates
        socket.on('user-mute-state', ({ roomId, isMuted }) => {
            socket.to(roomId).emit('user-mute-state', { isMuted });
        });

        socket.on('user-camera-state', ({ roomId, isVideoOff }) => {
            socket.to(roomId).emit('user-camera-state', { isVideoOff });
        });

        socket.on('doctor-mute-state', ({ roomId, isMuted }) => {
            socket.to(roomId).emit('doctor-mute-state', { isMuted });
        });

        socket.on('doctor-camera-state', ({ roomId, isVideoOff }) => {
            socket.to(roomId).emit('doctor-camera-state', { isVideoOff });
        });

        socket.on('disconnect', (reason) => {
            console.log(`Socket disconnected: ${socket.id}, role: ${socket.role}, room: ${socket.roomId}, reason: ${reason}`);

            if (socket.roomId) {
                if (socket.role === 'user') {
                    socket.to(socket.roomId).emit('user-disconnected');
                } else if (socket.role === 'doctor') {
                    socket.to(socket.roomId).emit('doctor-disconnected');
                }

                // Clean up room if empty
                setTimeout(() => {
                    const room = io.sockets.adapter.rooms.get(socket.roomId);
                    if (!room || room.size === 0) {
                        console.log(`Room ${socket.roomId} is now empty`);
                    }
                }, 1000);
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });
};