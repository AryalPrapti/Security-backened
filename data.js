// data.js

import bcrypt from 'bcryptjs';

const data = {
  users: [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      password: bcrypt.hashSync('123456', 8),
      isAdmin: true,
    },
    {
      name: 'John Doe',
      email: 'john@example.com',
      password: bcrypt.hashSync('123456', 8),
      isAdmin: false,
    },
  ],
  products: [
    {
      name: 'Sample Product 1',
      url: 'sample-product-1',
      image: '/images/p1.jpg',
      price: 100,
      category: 'Sample Category',
      brand: 'Sample Brand',
      stock: 10,
      rating: 4.5,
      reviews: 10,
      description: 'This is a sample product description.',
    },
    {
      name: 'Sample Product 2',
      url: 'sample-product-2',
      image: '/images/p2.jpg',
      price: 200,
      category: 'Sample Category',
      brand: 'Sample Brand',
      stock: 20,
      rating: 4.0,
      reviews: 20,
      description: 'This is another sample product description.',
    },
  ],
};

export default data;
