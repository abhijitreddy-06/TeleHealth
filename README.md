# 🏥 TeleHealth – Full Stack Healthcare Platform

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

**TeleHealth** is a full-stack healthcare web application that connects **patients and doctors** through secure video consultations, appointment booking, medical record management, and **AI-powered pre-consultation insights**.

The platform is designed to improve healthcare accessibility by combining **real-time communication**, **intelligent clinical assistance**, and **secure data storage**.

---

## 🔗 Live Links
- **🚀 Live Website:** [TeleHealth on Render](https://telehealth-production.onrender.com/)
- **📦 GitHub Repository:** [abhijitreddy-06/TeleHealth](https://github.com/abhijitreddy-06/TeleHealth)

---

## 🚀 Features

### 👤 Patient
* **Secure Access:** Register and login securely.
* **Appointments:** Book appointments with available doctors.
* **Video Calls:** Attend real-time video consultations.
* **Records:** Store and access past medical records.
* **AI Insights:** Receive AI-based pre-consultation advice based on symptoms.

### 👨‍⚕️ Doctor
* **Dashboard:** View and manage patient appointments.
* **Consultation:** Attend video consultations with patients.
* **Secure Login:** Role-based authentication.

---

## 🧠 AI Integration

The platform integrates a sophisticated AI system to assist patients before consultations by analyzing clinical text and structured symptom data.

### Model Architecture & Performance

| Component | Details |
| :--- | :--- |
| **Model** | Clinical BERT (Bio_ClinicalBERT) with binary symptom features |
| **Architecture** | **Multi-input, Multi-task:** <br>1. Text-based clinical input<br>2. Binary symptom feature vector |
| **Disease Prediction** | **~99%** Accuracy (Validation) |
| **Specialist Rec.** | **~93%** Accuracy (Validation) |
| **Inference** | GPU-accelerated (RTX 2050) |
| **Hosting** | Hugging Face Spaces |

> **⚠️ Disclaimer:** This AI model provides pre-consultation insights only and does not replace professional medical diagnosis.

---

## 🛠 Tech Stack

**Backend**
* Express.js
* RESTful APIs
* Role-based authentication (Doctor / Patient)

**Database & Storage**
* PostgreSQL
* Supabase (Secure medical record storage)

**AI / Machine Learning**
* TensorFlow / Keras
* Fine-tuned Clinical BERT (Bio_ClinicalBERT)

**Deployment**
* **Web App:** Render
* **AI Model:** Hugging Face Spaces

---

## 📂 Project Structure

```text
TeleHealth/
│
├── public/
│   └── pages/       # All HTML files
│
├── views/           # All EJS template files
│
├── server.js        # Main Express server
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```
⚙️ Installation & Setup
Follow these steps to run the project locally.

1️⃣ Clone the repository
```text
git clone [https://github.com/abhijitreddy-06/TeleHealth.git](https://github.com/abhijitreddy-06/TeleHealth.git)
cd TeleHealth
