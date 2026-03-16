function verifyServiceToken(req, res, next) {
  const providedToken = req.headers["x-service-token"];
  const expectedToken =
    process.env.INTERNAL_SERVICE_TOKEN || "civicshield_internal_secure_token";

  if (!providedToken || providedToken !== expectedToken) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized internal service access"
    });
  }

  next();
}

module.exports = verifyServiceToken;
