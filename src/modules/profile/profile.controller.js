const profileService = require('./profile.service');
const catchAsync = require('../../utils/catchAsync');

exports.getUserProfile = catchAsync(async (req, res) => {
    const profile = await profileService.getUserProfile(req.user.id);

    if (!profile) return res.redirect('/user_profile_create');

    res.render('user_profile', {
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
});

exports.createUserProfile = catchAsync(async (req, res) => {
    const { fullName, gender, customGender, dob, weight, height, bloodGroup, allergies } = req.body;

    await profileService.createOrUpdateUserProfile(req.user.id, {
        fullName, gender, customGender, dob, weight, height, bloodGroup, allergies
    });

    res.redirect('/user_home');
});

exports.getDoctorProfile = catchAsync(async (req, res) => {
    const profile = await profileService.getDoctorProfile(req.user.id);

    if (!profile) return res.redirect('/doc_profile_create');

    res.render('doc_profile', {
        profile: {
            fullName: profile.full_name,
            specialization: profile.specialization,
            experience: profile.experience_years,
            qualification: profile.qualification,
            hospital: profile.hospital_name,
            bio: profile.bio
        }
    });
});

exports.createDoctorProfile = catchAsync(async (req, res) => {
    const { fullName, specialization, experience, qualification, hospital, bio } = req.body;

    await profileService.createOrUpdateDoctorProfile(req.user.id, {
        fullName, specialization, experience, qualification, hospital, bio
    });

    res.redirect('/doc_home');
});

exports.editUserProfileForm = catchAsync(async (req, res) => {
    const profile = await profileService.getUserProfile(req.user.id);

    if (!profile) return res.redirect('/user_profile_create');

    res.render('user_profile_edit', {
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
});

exports.updateUserProfile = catchAsync(async (req, res) => {
    const { fullName, gender, customGender, dob, weight, height, bloodGroup, allergies } = req.body;

    await profileService.createOrUpdateUserProfile(req.user.id, {
        fullName, gender, customGender, dob, weight, height, bloodGroup, allergies
    });

    res.redirect('/user_profile');
});

exports.editDoctorProfileForm = catchAsync(async (req, res) => {
    const profile = await profileService.getDoctorProfile(req.user.id);

    if (!profile) return res.redirect('/doc_profile_create');

    res.render('doc_profile_edit', {
        profile: {
            fullName: profile.full_name,
            specialization: profile.specialization,
            experience: profile.experience_years,
            qualification: profile.qualification,
            hospital: profile.hospital_name,
            bio: profile.bio
        }
    });
});

exports.updateDoctorProfile = catchAsync(async (req, res) => {
    const { fullName, specialization, experience, qualification, hospital, bio } = req.body;

    await profileService.createOrUpdateDoctorProfile(req.user.id, {
        fullName, specialization, experience, qualification, hospital, bio
    });

    res.redirect('/doc_profile');
});
