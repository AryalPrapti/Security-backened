// routes/orderRouter.js

import express from 'express';
import {
  getAllOrders,
  createOrder,
  getOrderSummary,
  getUserOrders,
  getOrderById,
  deleteOrderById,
  markOrderAsPaid,
  markOrderAsDelivered,
} from '../controllers/orderController.js';
import { isAuth, isAdmin } from '../utils.js';

const orderRouter = express.Router();

orderRouter.get('/', isAuth, isAdmin, getAllOrders);
orderRouter.post('/', isAuth, createOrder);
orderRouter.get('/summary', isAuth, isAdmin, getOrderSummary);
orderRouter.get('/mine', isAuth, getUserOrders);
orderRouter.get('/:id', isAuth, getOrderById);
orderRouter.delete('/:id', isAuth, isAdmin, deleteOrderById);
orderRouter.put('/:id/pay', isAuth, markOrderAsPaid);
orderRouter.put('/:id/deliver', isAuth, markOrderAsDelivered);

export default orderRouter;
