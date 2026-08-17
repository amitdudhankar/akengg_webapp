const jwt = require("jsonwebtoken");

const AppError = require("../utils/appError");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Access denied. Token missing or malformed.", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRET_JWT_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError("Invalid or expired token.", 403));
  }
};

const attachUserIfTokenPresent = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRET_JWT_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError("Invalid or expired token.", 403));
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new AppError("Access denied. You don't have permission for this action.", 403));
    }

    next();
  };
};

const authorizeSelfOrRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const requestedUserId = Number(req.params.id);
    const authenticatedUserId = Number(req.user?.id);
    const userRole = req.user?.role;

    if (allowedRoles.includes(userRole) || authenticatedUserId === requestedUserId) {
      return next();
    }

    return next(new AppError("Access denied. You can only access your own user record.", 403));
  };
};

const preventRoleAssignmentUnlessAdmin = (req, res, next) => {
  if (req.body?.role !== undefined && req.user?.role !== "admin") {
    return next(new AppError("Only admins can assign or update user roles.", 403));
  }

  next();
};

module.exports = {
  verifyToken,
  attachUserIfTokenPresent,
  authorizeRoles,
  authorizeSelfOrRoles,
  preventRoleAssignmentUnlessAdmin,
};
