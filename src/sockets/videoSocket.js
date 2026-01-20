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

                // Notify the other side
                if (role === 'user') {
                    // User joined, notify doctor if present
                    socket.to(roomId).emit('doctor-ready');
                    socket.emit('user-joined', {
                        roomId,
                        message: 'Waiting for doctor...'
                    });
                }

                if (role === 'doctor') {
                    // Doctor joined, notify user if present
                    socket.to(roomId).emit('user-ready');
                    socket.emit('doctor-joined', {
                        roomId,
                        message: 'Waiting for patient...'
                    });
                }

            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('doctor-end-call', async ({ roomId, appointmentId, notes }) => {
            try {
                console.log(`Doctor ending call for room: ${roomId}, appointment: ${appointmentId}`);

                // Emit to user that call is ending and prescription is ready
                io.to(roomId).emit('call-ended-by-doctor', {
                    roomId,
                    appointmentId,
                    reason: notes || 'Doctor ended the consultation',
                    timestamp: new Date().toISOString()
                });

                // Also emit prescription-ready event separately
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

        socket.on('signal', ({ roomId, ...payload }) => {
            socket.to(roomId).emit('signal', payload);
        });

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

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}, role: ${socket.role}, room: ${socket.roomId}`);

            // Notify the other side about disconnection
            if (socket.roomId) {
                if (socket.role === 'user') {
                    socket.to(socket.roomId).emit('user-disconnected');
                } else if (socket.role === 'doctor') {
                    socket.to(socket.roomId).emit('doctor-disconnected');
                }
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });
};