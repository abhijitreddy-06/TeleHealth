function injectStaticPaths(req, res, next) {
    // Add base path for static files
    res.locals.staticPath = (filePath) => {
        // Remove leading slash if present in filePath
        const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        return `/${cleanPath}`;
    };

    // Add current user info if available
    if (req.user) {
        res.locals.user = req.user;
    }

    next();
}

module.exports = injectStaticPaths;