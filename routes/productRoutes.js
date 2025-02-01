// routes/productRouter.js

import express from 'express';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  searchProducts,
  getCategories,
  getProductByUrl,
  getProductById,
} from '../controllers/productController.js';
import { isAuth, isAdmin } from '../utils.js';

const productRouter = express.Router();

productRouter.get('/', getAllProducts);
productRouter.post('/', isAuth, isAdmin, createProduct);
productRouter.put('/:id', isAuth, isAdmin, updateProduct);
productRouter.delete('/:id', isAuth, isAdmin, deleteProduct);
productRouter.get('/admin',  getAdminProducts);
productRouter.get('/search', searchProducts);
productRouter.get('/categories', getCategories);
productRouter.get('/url/:url', getProductByUrl);
productRouter.get('/:id', getProductById);

export default productRouter;
