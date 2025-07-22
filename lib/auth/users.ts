// Static user configuration
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In production, these would be hashed
}

export const STATIC_USERS: User[] = [
  {
    id: 'user-001',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'demo123'
  },
  {
    id: 'user-002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'demo123'
  },
  {
    id: 'user-003',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    password: 'demo123'
  },
  {
    id: 'user-004',
    name: 'Alice Williams',
    email: 'alice@example.com',
    password: 'demo123'
  }
];

export function validateUser(email: string, password: string): User | null {
  return STATIC_USERS.find(user => 
    user.email === email && user.password === password
  ) || null;
}

export function getUserById(id: string): User | null {
  return STATIC_USERS.find(user => user.id === id) || null;
}