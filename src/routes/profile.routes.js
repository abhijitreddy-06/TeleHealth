const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { userProfileSchema, doctorProfileSchema } = require('../modules/profile/profile.schema');

router.get("/user_profile", authenticate, authorize("user"), async (req, res) => {
    try {
        const profile = await authService.getUserProfile(req.user.id);

        if (!profile) {
            return res.redirect("/user_profile_create");
        }

        res.render("user_profile", {
            profile: {
                fullName: profile.full_name,
                gender: profile.gender,
                customGender: profile.custom_gender,
                dob: profile.date_of_birth,
                weight: profile.weight_kg,
                height: profile.height_cm,
                bloodGroup: profile.blood_group,
                allergies: profile.allergies
            }
        });
    } catch (err) {
        console.error("User profile fetch error:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/user_profile", authenticate, authorize("user"), validate(userProfileSchema), async (req, res) => {
    try {
        const {
            fullName,
            gender,
            customGender,
            dob,
            weight,
            height,
            bloodGroup,
            allergies
        } = req.validated.body;

        await authService.createUserProfile(req.user.id, {
            fullName,
            gender,
            customGender,
            dob,
            weight,
            height,
            bloodGroup,
            allergies
        });

        res.redirect("/user_home");
    } catch (err) {
        console.error("User profile save error:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/doc_profile", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const profile = await authService.getDoctorProfile(req.user.id);

        if (!profile) {
            return res.redirect("/doc_profile_create");
        }

        res.render("doc_profile", {
            profile: {
                fullName: profile.full_name,
                specialization: profile.specialization,
                experience: profile.experience_years,
                qualification: profile.qualification,
                hospital: profile.hospital_name,
                bio: profile.bio
            }
        });
    } catch (err) {
        console.error("Doctor profile fetch error:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/doc_profile", authenticate, authorize("doctor"), validate(doctorProfileSchema), async (req, res) => {
    try {
        const {
            fullName,
            specialization,
            experience,
            qualification,
            hospital,
            bio
        } = req.validated.body;

        await authService.createDoctorProfile(req.user.id, {
            fullName,
            specialization,
            experience,
            qualification,
            hospital,
            bio
        });

        res.redirect("/doc_home");
    } catch (err) {
        console.error("Doctor profile save error:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/user_profile/edit", authenticate, authorize("user"), async (req, res) => {
    try {
        const profile = await authService.getUserProfile(req.user.id);

        if (!profile) {
            return res.redirect("/user_profile_create");
        }

        res.render("user_profile_edit", {
            profile: {
                fullName: profile.full_name,
                gender: profile.gender,
                customGender: profile.custom_gender,
                dob: profile.date_of_birth,
                weight: profile.weight_kg,
                height: profile.height_cm,
                bloodGroup: profile.blood_group,
                allergies: profile.allergies
            }
        });
    } catch (err) {
        console.error("User profile edit fetch error:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/user_profile/edit", authenticate, authorize("user"), validate(userProfileSchema), async (req, res) => {
    try {
        const {
            fullName,
            gender,
            customGender,
            dob,
            weight,
            height,
            bloodGroup,
            allergies
        } = req.validated.body;

        await authService.createUserProfile(req.user.id, {
            fullName,
            gender,
            customGender,
            dob,
            weight,
            height,
            bloodGroup,
            allergies
        });

        res.redirect("/user_profile");
    } catch (err) {
        console.error("User profile update error:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/doc_profile/edit", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const profile = await authService.getDoctorProfile(req.user.id);

        if (!profile) {
            return res.redirect("/doc_profile_create");
        }

        res.render("doc_profile_edit", {
            profile: {
                fullName: profile.full_name,
                specialization: profile.specialization,
                experience: profile.experience_years,
                qualification: profile.qualification,
                hospital: profile.hospital_name,
                bio: profile.bio
            }
        });
    } catch (err) {
        console.error("Doctor profile edit fetch error:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/doc_profile/edit", authenticate, authorize("doctor"), validate(doctorProfileSchema), async (req, res) => {
    try {
        const {
            fullName,
            specialization,
            experience,
            qualification,
            hospital,
            bio
        } = req.validated.body;

        await authService.createDoctorProfile(req.user.id, {
            fullName,
            specialization,
            experience,
            qualification,
            hospital,
            bio
        });

        res.redirect("/doc_profile");
    } catch (err) {
        console.error("Doctor profile update error:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;