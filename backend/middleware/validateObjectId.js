
const { Types } = require('mongoose');

module.exports = function validateObjectId(req, res, next) {
  console.log('=== VALIDATE OBJECT ID MIDDLEWARE ===');
  console.log('Route params:', req.params);
  console.log('Route path:', req.route?.path);
  
  // Check for common parameter names that might contain ObjectIds
  const possibleIds = ['id', 'authorId', 'userId', 'postId', 'groupId', 'commentId'];
  const idsToValidate = [];
  
  for (const paramName of possibleIds) {
    if (req.params[paramName]) {
      idsToValidate.push({ name: paramName, value: req.params[paramName] });
      console.log(`Found ID parameter '${paramName}':`, req.params[paramName]);
    }
  }
  
  if (idsToValidate.length === 0) {
    // If no ID parameter found, skip validation
    console.log('No ID parameter found, skipping validation');
    return next();
  }
  
  // Validate all found IDs
  for (const { name, value } of idsToValidate) {
    console.log(`Validating ${name}:`, value);
    console.log(`${name} type:`, typeof value);
    console.log(`${name} length:`, value?.length);
    console.log(`Is ${name} valid ObjectId:`, Types.ObjectId.isValid(value));
    
    if (!Types.ObjectId.isValid(value)) {
      console.log(`${name} validation failed`);
      return res.status(404).json({ error: `Invalid ${name}` });
    }
  }
  
  console.log('All ID validations passed');
  next();
};
