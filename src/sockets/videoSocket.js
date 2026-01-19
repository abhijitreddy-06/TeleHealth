const { pool } = require('../config/database');

module.exports = function (io) {
    io.on('connection', (socket) => {
        socket.on('join-room', async ({ roomId }) => {
            try {
                const allowed = await pool.query(
                    `SELECT id FROM appointments 
           WHERE room_id = $1 
           AND (user_id = $2 OR doctor_id = $3)`,
                    [roomId, socket.user.id, socket.user.id]
                );

                if (!allowed.rows.length) {
                    socket.emit('error', { message: 'Unauthorized room access' });
                    return;
                }

                socket.join(roomId);
                socket.roomId = roomId;

                if (socket.user.role === 'user') {
                    socket.to(roomId).emit('user-ready');
                }
            } catch (error) {
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('signal', ({ roomId, ...payload }) => {
            socket.to(roomId).emit('signal', payload);
        });

        socket.on('disconnect', () => {
            // Handle disconnect
        });
    });
};