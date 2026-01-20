const { pool } = require('../config/database');

module.exports = function (io) {
    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);

        socket.on('join-room', async ({ roomId, role }) => {
            try {
                // Join the room
                socket.join(roomId);
                socket.roomId = roomId;
                socket.role = role;

                console.log(`${role} joined room: ${roomId}`);

                // If user joins, notify doctor
                if (role === 'user') {
                    socket.to(roomId).emit('doctor-ready'); // User waits for 'doctor-ready'
                }

                // If doctor joins, notify user (if present)
                if (role === 'doctor') {
                    socket.to(roomId).emit('user-ready'); // Doctor waits for 'user-ready'
                }

                // Confirm to the joining client
                socket.emit('joined-room', {
                    roomId,
                    message: `${role} joined room successfully`
                });

            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('doctor-end-call', async ({ roomId, appointmentId, notes }) => {
            try {
                console.log(`Doctor ending call for room: ${roomId}, appointment: ${appointmentId}`);

                // Emit to all users in the room that call is ending
                io.to(roomId).emit('call-ended', {
                    roomId,
                    appointmentId,
                    reason: notes || 'Doctor ended the consultation',
                    timestamp: new Date().toISOString()
                });

                // Also emit specific prescription event
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

            } catch (error) {
                console.error('Doctor end call error:', error);
                socket.emit('error', { message: 'Failed to end call properly' });
            }
        });

        socket.on('user-ended-call', ({ roomId, reason }) => {
            console.log(`User ended call for room: ${roomId}`);
            io.to(roomId).emit('call-ended', {
                roomId,
                reason: reason || 'User ended the call',
                timestamp: new Date().toISOString()
            });
        });

        // WebRTC signaling
        socket.on('signal', ({ roomId, ...payload }) => {
            socket.to(roomId).emit('signal', payload);
        });

        // Mute/Video state updates
        socket.on('user-mute-state', ({ roomId, isMuted }) => {
            socket.to(roomId).emit('user-mute-state', { isMuted });
        });

        socket.on('user-camera-state', ({ roomId, isVideoOff }) => {
            socket.to(roomId).emit('user-camera-state', { isVideoOff });
        });

        socket.on('user-leaving', ({ roomId }) => {
            console.log(`User leaving room: ${roomId}`);
            socket.to(roomId).emit('user-left', {
                roomId,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}, role: ${socket.role}, room: ${socket.roomId}`);

            // Notify the other party if someone disconnects
            if (socket.roomId) {
                if (socket.role === 'user') {
                    socket.to(socket.roomId).emit('user-disconnected', {
                        roomId: socket.roomId,
                        timestamp: new Date().toISOString()
                    });
                } else if (socket.role === 'doctor') {
                    socket.to(socket.roomId).emit('doctor-disconnected', {
                        roomId: socket.roomId,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });

        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });
};