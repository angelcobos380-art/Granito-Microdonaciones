const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar' });
  try { req.usuario = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión de nuevo.' }); }
};
