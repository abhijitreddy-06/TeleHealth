const express = require('express');
const router = express.Router();
const path = require('path');
const { blockAfterLogin } = require('../middleware/auth');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

router.get("/role", (req, res) => {  // Removed blockAfterLogin
    console.log('✅ /role route hit');
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'role.html'));
});

router.get("/user_login", blockAfterLogin, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'user_login.html'));
});

router.get("/user_signup", blockAfterLogin, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'user_signup.html'));
});

router.get("/doc_login", blockAfterLogin, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'doc_login.html'));
});

router.get("/doc_signup", blockAfterLogin, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'doc_signup.html'));
});

router.get("/", blockAfterLogin, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'index.html'));
});

router.get("/services", blockAfterLogin, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'services.html'));
});

router.get("/contact", blockAfterLogin, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'public', 'pages', 'contact.html'));
});

module.exports = router;