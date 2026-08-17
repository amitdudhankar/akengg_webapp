// // multerConfig.js
// const multer = require('multer');
// const path = require('path');

// // Set the storage destination and filename convention
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     // Specify the folder where you want to store the uploaded files
//     cb(null, 'src/public/uploads/'); // 'uploads/' is the folder for storing images
//   },
//   filename: function (req, file, cb) {
//     // Set the filename to include a timestamp to avoid overwriting files with the same name
//     cb(null, Date.now() + path.extname(file.originalname)); // Filename will include the original extension
//   }
// });

// // Filter to accept only certain types of files (e.g., images)
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true); // Allow file if it's of the correct type
//   } else {
//     cb(new Error('Invalid file type. Only images are allowed.'));
//   }
// };

// // Initialize multer with storage, file filter, and file size limit
// const upload = multer({ 
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
// });

// module.exports = upload;

// multerConfig.js
const multer = require('multer');
const path = require('path');

// Set the storage destination and filename convention
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Specify the folder where you want to store the uploaded files
    cb(null, 'src/public/uploads/'); // 'uploads/' is the folder for storing images
  },
  filename: function (req, file, cb) {
    // Set the filename to include a timestamp to avoid overwriting files with the same name
    cb(null, Date.now() + path.extname(file.originalname)); // Filename will include the original extension
  }
});

// Filter to accept only image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Allow file if it's an image
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};

// Initialize multer with storage, file filter, and file size limit
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

module.exports = upload;
