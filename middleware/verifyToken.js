// const jwt = require("jsonwebtoken");

// function verifyToken(req, res, next) {
//   // Try to get token from Authorization header
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1]; // expects "Bearer <token>"

//   if (!token) {
//     return res.status(401).json({ message: "Access denied: no token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // attach user info (id, role)
//     next(); // proceed to the route
//   } catch (err) {
//     console.error("JWT verification error:", err.message);
//     return res.status(403).json({ message: "Invalid or expired token" });
//   }
// }

// module.exports = verifyToken;
