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
                if (socket.user && socket.user.role === 'user') {
                    socket.to(roomId).emit('user-ready');
                }

            } catch (error) {
                socket.emit('error', { message: 'Failed to join room' });
            }
        });
        socket.on('doctor-end-call', async ({ roomId, appointmentId }) => {
            try {
                // Optional: verify socket is in the room
                if (!socket.roomId || socket.roomId !== roomId) {
                    return;
                }

                // 🔹 Check if prescription exists for this appointment
                const prescriptionResult = await pool.query(
                    `SELECT id FROM prescriptions WHERE appointment_id = $1 LIMIT 1`,
                    [appointmentId]
                );

                const hasPrescription = prescriptionResult.rows.length > 0;

                // 🔹 Notify USER in the room
                if (hasPrescription) {
                    socket.to(roomId).emit('call-ended-with-prescription', {
                        appointmentId
                    });
                } else {
                    socket.to(roomId).emit('call-ended', {
                        appointmentId
                    });
                }

                // 🔹 Also notify doctor (optional safety)
                socket.emit('call-ended-confirmed');

            } catch (error) {
                console.error('Doctor end call error:', error);
                socket.emit('error', { message: 'Failed to end call properly' });
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