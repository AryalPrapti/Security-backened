// middleware/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
    res.status(500).send({ message: err.message });
  };
  
  export { errorHandler };
  