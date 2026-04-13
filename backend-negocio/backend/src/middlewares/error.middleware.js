export const errorHandler = (err, req, res, next) => {
  res.status(400).json({
    message: err.message || "Error del servidor"
  });
};
