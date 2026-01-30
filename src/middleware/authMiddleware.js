const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'juggernaut-secret-key-change-in-production';

/**
 * Middleware to verify admin JWT token
 * Checks for Authorization header with Bearer token
 */
exports.requireAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized - No token provided'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify and decode the token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach admin info to request object for use in controllers
        req.admin = {
            role: decoded.role,
            loginTime: decoded.iat
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Unauthorized - Token expired'
            });
        }

        return res.status(401).json({
            error: 'Unauthorized - Invalid token'
        });
    }
};

/**
 * Optional middleware to check if user is logged in (for auto-approval)
 * Doesn't block the request if no token, just sets req.isAdmin flag
 */
exports.checkAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, JWT_SECRET);
            req.isAdmin = true;
            req.admin = {
                role: decoded.role,
                loginTime: decoded.iat
            };
        } else {
            req.isAdmin = false;
        }
    } catch (error) {
        req.isAdmin = false;
    }

    next();
};

/**
 * Generate a JWT token for admin login
 * @param {string} role - Admin role identifier
 * @returns {string} JWT token
 */
exports.generateToken = (role = 'admin') => {
    return jwt.sign(
        { role },
        JWT_SECRET,
        { expiresIn: '7d' } // Token valid for 7 days
    );
};
