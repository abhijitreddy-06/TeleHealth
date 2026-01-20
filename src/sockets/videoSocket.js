const { pool } = require('../config/database');

module.exports = function (io) {
    io.on('connection', (socket) => {
        socket.on('join-room', async ({ roomId, role }) => {
            try {
                // Join the room
                socket.join(roomId);
                socket.roomId = roomId;
                socket.role = role;

                console.log(`${role} joined room: ${roomId}`);

                // If user joins, notify doctor
                if (role === 'user') {
                    socket.to(roomId).emit('user-ready');
                }

                // If doctor joins, notify user (if present)
                if (role === 'doctor') {
                    socket.to(roomId).emit('doctor-ready');
                }

            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('doctor-end-call', async ({ roomId, appointmentId, notes }) => {
            try {
                console.log(`Doctor ending call for room: ${roomId}, appointment: ${appointmentId}`);

                // Emit to all users in the room that call is ending
                io.to(roomId).emit('call-ended-by-doctor', {
                    roomId,
                    appointmentId,
                    notes,
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

        socket.on('signal', ({ roomId, ...payload }) => {
            socket.to(roomId).emit('signal', payload);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}, role: ${socket.role}, room: ${socket.roomId}`);
        });
    });
};