// controllers/seedController.js

import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import data from '../data.js'; // Assuming data.js contains the seed data

export const seedDatabase = async (req, res) => {
  // removing all previous records in products model
  await Product.deleteMany({});
  const createdProducts = await Product.insertMany(data.products);

  await User.deleteMany({});
  const createdUsers = await User.insertMany(data.users);
  
  res.send({ createdProducts, createdUsers }); // sending new products to the frontend
};
