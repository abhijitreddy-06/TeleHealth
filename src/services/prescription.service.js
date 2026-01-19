const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');

class PrescriptionService {
    async getPrescriptionData(roomId, userId, userRole) {
        let appointmentQuery;
        if (userRole === "user") {
            appointmentQuery = await pool.query(
                `SELECT a.id, a.user_id, a.doctor_id, a.appointment_date,
                        dp.full_name as doctor_name,
                        dp.specialization,
                        dp.qualification,
                        dp.hospital_name
                 FROM appointments a
                 LEFT JOIN doc_profile dp ON dp.doc_id = a.doctor_id
                 WHERE a.room_id = $1 AND a.user_id = $2`,
                [roomId, userId]
            );
        } else if (userRole === "doctor") {
            appointmentQuery = await pool.query(
                `SELECT a.id, a.user_id, a.doctor_id, a.appointment_date,
                        dp.full_name as doctor_name,
                        dp.specialization,
                        dp.qualification,
                        dp.hospital_name
                 FROM appointments a
                 LEFT JOIN doc_profile dp ON dp.doc_id = a.doctor_id
                 WHERE a.room_id = $1 AND a.doctor_id = $2`,
                [roomId, userId]
            );
        }

        if (!appointmentQuery.rows.length) {
            throw new Error('Prescription not found');
        }

        const appointment = appointmentQuery.rows[0];

        const notesQuery = await pool.query(
            `SELECT notes, created_at
             FROM doctor_notes
             WHERE room_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [roomId]
        );

        let notes = "No prescription notes provided by the doctor.";
        let prescriptionDate = new Date();

        if (notesQuery.rows.length > 0) {
            notes = notesQuery.rows[0].notes || notes;
            prescriptionDate = notesQuery.rows[0].created_at || prescriptionDate;
        }

        let patientInfo = await this.getPatientInfo(
            userRole === 'doctor' ? appointment.user_id : userId
        );

        return {
            appointment,
            notes,
            prescriptionDate,
            patientInfo,
            roomId
        };
    }

    async getPatientInfo(patientId) {
        const patientQuery = await pool.query(
            `SELECT full_name, date_of_birth, gender, blood_group
             FROM user_profile
             WHERE user_id = $1`,
            [patientId]
        );

        if (!patientQuery.rows.length) {
            return {
                name: "Patient",
                info: "Patient: Patient"
            };
        }

        const patient = patientQuery.rows[0];
        let info = `Patient: ${patient.full_name || "Patient"}`;

        if (patient.date_of_birth) {
            const dob = new Date(patient.date_of_birth);
            const age = new Date().getFullYear() - dob.getFullYear();
            info += ` | Age: ${age} years`;
        }

        if (patient.gender) {
            info += ` | Gender: ${patient.gender}`;
        }

        if (patient.blood_group) {
            info += ` | Blood Group: ${patient.blood_group}`;
        }

        return {
            name: patient.full_name || "Patient",
            info
        };
    }

    async generatePDF(prescriptionData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 50,
                    size: 'A4',
                    info: {
                        Title: 'Medical Prescription',
                        Author: 'TeleHealth System',
                        Subject: 'Medical Consultation Prescription',
                        Keywords: 'prescription, medical, telehealth',
                        CreationDate: new Date()
                    }
                });

                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                this.addPrescriptionContent(doc, prescriptionData);
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    addPrescriptionContent(doc, data) {
        const { appointment, notes, prescriptionDate, patientInfo, roomId } = data;

        const doctorName = appointment.doctor_name || "Dr. Unknown";
        const specialization = appointment.specialization || "General Physician";
        const qualification = appointment.qualification || "MD";
        const hospital = appointment.hospital_name || "TeleHealth Clinic";

        const appointmentDate = appointment.appointment_date
            ? new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : new Date().toLocaleDateString();

        const prescriptionDateStr = new Date(prescriptionDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        doc.fontSize(18).text('TELEHEALTH PRESCRIPTION', {
            align: 'center',
            underline: true
        });
        doc.moveDown(0.5);
        doc.fontSize(10).text('Electronic Medical Prescription', { align: 'center' });
        doc.moveDown(1);

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#333333').text('PRESCRIBING PHYSICIAN:', {
            underline: true
        });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#000000');
        doc.text(`Dr. ${doctorName}`, { continued: true });
        doc.fontSize(9).fillColor('#666666').text(` (${qualification})`, {
            align: 'left'
        });
        doc.fontSize(10);
        doc.text(`Specialization: ${specialization}`);
        doc.text(`Hospital/Clinic: ${hospital}`);
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#333333').text('PATIENT INFORMATION:', {
            underline: true
        });
        doc.moveDown(0.3);
        doc.fontSize(10);
        doc.text(patientInfo.info);
        doc.moveDown(1);

        doc.fontSize(12).fillColor('#333333').text('CONSULTATION DETAILS:', {
            underline: true
        });
        doc.moveDown(0.3);
        doc.fontSize(10);
        doc.text(`Appointment Date: ${appointmentDate}`);
        doc.text(`Prescription Date: ${prescriptionDateStr}`);
        doc.text(`Consultation ID: ${roomId}`);
        doc.moveDown(1.5);

        doc.fontSize(12).fillColor('#333333').text('MEDICAL PRESCRIPTION:', {
            underline: true
        });
        doc.moveDown(0.5);

        const prescriptionY = doc.y;
        doc.rect(50, prescriptionY, 500, 200).stroke();
        doc.moveDown(0.1);

        doc.fontSize(11).fillColor('#000000');
        const lines = notes.split('\n');
        let lineY = prescriptionY + 20;

        for (let line of lines) {
            if (line.trim()) {
                doc.text(`• ${line.trim()}`, 60, lineY, {
                    width: 480,
                    align: 'left'
                });
                lineY += 20;
            }
        }

        doc.y = prescriptionY + 210;
        doc.moveDown(2);

        doc.fontSize(10).fillColor('#333333');
        doc.text('________________________________', 400, doc.y, { align: 'right' });
        doc.text(`Dr. ${doctorName}`, 400, doc.y + 20, { align: 'right' });
        doc.text(qualification, 400, doc.y + 35, { align: 'right' });
        doc.text(specialization, 400, doc.y + 50, { align: 'right' });

        doc.moveDown(4);

        doc.fontSize(8).fillColor('#666666');
        doc.text('This is an electronically generated prescription from TeleHealth System.', {
            align: 'center'
        });
        doc.text('For any queries, please contact: support@telehealth.com | Phone: 1800-TELEHEALTH', {
            align: 'center'
        });
        doc.text('Prescription ID: ' + roomId + ' | Generated on: ' + new Date().toLocaleString(), {
            align: 'center'
        });
    }

    async savePrescriptionNotes(roomId, appointmentId, notes) {
        if (!notes || !notes.trim()) {
            notes = "No prescription notes provided.";
        }

        await pool.query(
            `INSERT INTO doctor_notes (room_id, appointment_id, notes, sent, created_at)
             VALUES ($1, $2, $3, TRUE, NOW())
             ON CONFLICT (room_id) 
             DO UPDATE SET 
                notes = EXCLUDED.notes, 
                sent = TRUE, 
                created_at = NOW()`,
            [roomId, appointmentId, notes]
        );
    }
}

module.exports = new PrescriptionService();