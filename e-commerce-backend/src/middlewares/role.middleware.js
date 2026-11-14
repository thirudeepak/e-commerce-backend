'use strict';

/**
 * Role-based access control middleware factory.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, allowRoles('admin'), handler);
 *   router.get('/multi-role', authenticate, allowRoles('admin', 'seller'), handler);
 *
 * @param {...string} roles - Allowed roles.
 * @returns {import('express').RequestHandler}
 */
function allowRoles(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. No role information found on request.',
        data: null,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Required role(s): ${roles.join(', ')}.`,
        data: null,
      });
    }

    next();
  };
}

module.exports = { allowRoles };
