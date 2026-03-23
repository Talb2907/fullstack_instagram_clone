
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  console.log('AUTH header:', header); 

  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    console.log('AUTH userId:', decoded && decoded.id); 
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.log('AUTH verify error:', err.message); 
    return res.status(401).json({ error: 'Invalid token' });
  }
}; 