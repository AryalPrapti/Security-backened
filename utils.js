import jwt from "jsonwebtoken"

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  )
}

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization
  if (authorization) {
    const token = authorization.slice(7, authorization.length)
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        res.status(401).send({ message: "Invalid Token" })
      } else {
        req.user = decode
        next()
      }
    })
  } else {
    res.status(401).send({ message: "No Token" })
  }
}

// export const isAdmin = (req, res, next) => {
//   if (req.user && req.user.isAdmin) {
//     next()
//   } else {
//     res.status(401).send({ message: "Invalid Admin Token" })
//   }
// }

// export const isSeller = (req, res, next) => {
//   if (req.user && req.user.isSeller) {
//     next()
//   } else {
//     res.status(401).send({ message: "Invalid Seller Token" })
//   }
// }

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // Refresh token expires in 7 days
  );
};

// Role-Based Access Control
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).send({ message: "Access Denied: Admins Only" });
  }
};

export const isSeller = (req, res, next) => {
  if (req.user && req.user.isSeller) {
    next();
  } else {
    res.status(403).send({ message: "Access Denied: Sellers Only" });
  }
};

export const isAdminOrSeller = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.isSeller)) {
    next();
  } else {
    res.status(403).send({ message: "Access Denied: Admins or Sellers Only" });
  }
};
