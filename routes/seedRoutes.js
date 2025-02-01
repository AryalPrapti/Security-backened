// routes/seedRouter.js

import express from 'express';
import { seedDatabase } from '../controllers/seedController.js';

const seedRouter = express.Router();

seedRouter.get('/', seedDatabase);

export default seedRouter;
