const profileService = require('./profile.service');
const catchAsync = require('../../utils/catchAsync');

exports.getUserProfile = catchAsync(async (req, res) => {
    const profile = await profileService.getUserProfile(req.user.id);

    if (!profile) {
        return res.json({ profile: null, redirect: '/patient/profile/create' });
    }

    const profileData = {
        fullName: profile.full_name,
        gender: profile.gender,
        customGender: profile.custom_gender,
        dob: profile.date_of_birth,
        weight: profile.weight_kg,
        height: profile.height_cm,
        bloodGroup: profile.blood_group,
        allergies: profile.allergies
    };

    return res.json({ profile: profileData });
});

exports.createUserProfile = catchAsync(async (req, res) => {
    const { fullName, gender, customGender, dob, weight, height, bloodGroup, allergies } = req.validated?.body || req.body;

    await profileService.createOrUpdateUserProfile(req.user.id, {
        fullName, gender, customGender, dob, weight, height, bloodGroup, allergies
    });

    return res.json({ success: true, message: 'Profile created', redirect: '/patient/home' });
});

exports.getDoctorProfile = catchAsync(async (req, res) => {
    const profile = await profileService.getDoctorProfile(req.user.id);

    if (!profile) {
        return res.json({ profile: null, redirect: '/doctor/profile/create' });
    }

    const profileData = {
        fullName: profile.full_name,
        specialization: profile.specialization,
        experience: profile.experience_years,
        qualification: profile.qualification,
        hospital: profile.hospital_name,
        bio: profile.bio
    };

    return res.json({ profile: profileData });
});

exports.createDoctorProfile = catchAsync(async (req, res) => {
    const { fullName, specialization, experience, qualification, hospital, bio } = req.validated?.body || req.body;

    await profileService.createOrUpdateDoctorProfile(req.user.id, {
        fullName, specialization, experience, qualification, hospital, bio
    });

    return res.json({ success: true, message: 'Profile created', redirect: '/doctor/home' });
});

exports.editUserProfileForm = catchAsync(async (req, res) => {
    const profile = await profileService.getUserProfile(req.user.id);

    if (!profile) {
        return res.json({ profile: null, redirect: '/patient/profile/create' });
    }

    const profileData = {
        fullName: profile.full_name,
        gender: profile.gender,
        customGender: profile.custom_gender,
        dob: profile.date_of_birth,
        weight: profile.weight_kg,
        height: profile.height_cm,
        bloodGroup: profile.blood_group,
        allergies: profile.allergies
    };

    return res.json({ profile: profileData });
});

exports.updateUserProfile = catchAsync(async (req, res) => {
    const { fullName, gender, customGender, dob, weight, height, bloodGroup, allergies } = req.validated?.body || req.body;

    await profileService.createOrUpdateUserProfile(req.user.id, {
        fullName, gender, customGender, dob, weight, height, bloodGroup, allergies
    });

    return res.json({ success: true, message: 'Profile updated', redirect: '/patient/profile' });
});

exports.editDoctorProfileForm = catchAsync(async (req, res) => {
    const profile = await profileService.getDoctorProfile(req.user.id);

    if (!profile) {
        return res.json({ profile: null, redirect: '/doctor/profile/create' });
    }

    const profileData = {
        fullName: profile.full_name,
        specialization: profile.specialization,
        experience: profile.experience_years,
        qualification: profile.qualification,
        hospital: profile.hospital_name,
        bio: profile.bio
    };

    return res.json({ profile: profileData });
});

exports.updateDoctorProfile = catchAsync(async (req, res) => {
    const { fullName, specialization, experience, qualification, hospital, bio } = req.validated?.body || req.body;

    await profileService.createOrUpdateDoctorProfile(req.user.id, {
        fullName, specialization, experience, qualification, hospital, bio
    });

    return res.json({ success: true, message: 'Profile updated', redirect: '/doctor/profile' });
});
