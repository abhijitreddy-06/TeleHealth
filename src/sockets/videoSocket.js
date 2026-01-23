const { pool } = require('../config/database');

module.exports = function (io) {
    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);

        socket.on('join-room', async ({ roomId, role }) => {
            try {
                socket.roomId = roomId;
                socket.role = role;

                // Join the room
                socket.join(roomId);

                // Get current room members
                const room = io.sockets.adapter.rooms.get(roomId) || new Set();
                const roomSize = room.size;

                if (role === 'user') {
                    const doctorInRoom = Array.from(room).some(socketId => {
                        const clientSocket = io.sockets.sockets.get(socketId);
                        return clientSocket && clientSocket.role === 'doctor';
                    });

                    socket.emit('user-joined', {
                        roomId,
                        message: doctorInRoom ? 'Doctor is ready' : 'Waiting for doctor...'
                    });

                    if (doctorInRoom) {
                        socket.to(roomId).emit('user-ready');
                    }
                } else if (role === 'doctor') {
                    const userInRoom = Array.from(room).some(socketId => {
                        const clientSocket = io.sockets.sockets.get(socketId);
                        return clientSocket && clientSocket.role === 'user';
                    });

                    socket.emit('doctor-joined', {
                        roomId,
                        message: userInRoom ? 'Patient is ready' : 'Waiting for patient...'
                    });

                    if (userInRoom) {
                        socket.to(roomId).emit('doctor-ready');
                    }
                }

            } catch (error) {
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('doctor-end-call', async ({ roomId, appointmentId, notes }) => {
            try {

                await pool.query(
                    `UPDATE appointments 
                     SET status = 'completed', completed_at = NOW() 
                     WHERE room_id = $1 AND status = 'started'`,
                    [roomId]
                );

                if (notes && notes.trim()) {
                    await pool.query(
                        `INSERT INTO doctor_notes (room_id, notes, created_at) 
                         VALUES ($1, $2, NOW()) 
                         ON CONFLICT (room_id) 
                         DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW()`,
                        [roomId, notes.trim()]
                    );
                }

                io.to(roomId).emit('call-ended-by-doctor', {
                    roomId,
                    appointmentId,
                    reason: notes || 'Doctor ended the consultation',
                    timestamp: new Date().toISOString()
                });

                io.to(roomId).emit('prescription-ready', {
                    roomId,
                    appointmentId,
                    message: 'Prescription is now available for download'
                });

                // Confirm to doctor
                socket.emit('call-ended-confirmed', {
                    message: 'Call ended successfully'
                });

            } catch (error) {
                socket.emit('error', { message: 'Failed to end call properly' });
            }
        });

        // WebRTC signaling - send to everyone in room except sender
        socket.on('signal', ({ roomId, ...payload }) => {
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

            if (socket.roomId) {
                if (socket.role === 'user') {
                    socket.to(socket.roomId).emit('user-disconnected');
                } else if (socket.role === 'doctor') {
                    socket.to(socket.roomId).emit('doctor-disconnected');
                }

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