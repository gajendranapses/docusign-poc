import Database from 'better-sqlite3';
import path from 'path';

// Initialize database
const dbPath = path.join(process.cwd(), 'docusign-accounts.db');
const db = new Database(dbPath);

// Create tables if they don't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS docusign_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL UNIQUE,
      account_name TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS user_docusign_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      docusign_account_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (docusign_account_id) REFERENCES docusign_accounts (id),
      UNIQUE(user_id, docusign_account_id)
    );
  `);
  console.log('Database tables created successfully');
  
  // Check the actual schema
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('docusign_accounts', 'user_docusign_accounts')").all();
  console.log('Database schema:', schema);
} catch (error) {
  console.error('Database initialization error:', error);
}

export interface DocuSignAccount {
  id?: number;
  account_id: string;
  account_name: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at?: number;
  updated_at?: number;
}

export interface UserDocuSignAccount {
  id?: number;
  user_id: string;
  docusign_account_id: number;
  email: string;
  name: string;
  is_default: boolean;
  created_at?: number;
}

export interface UserAccountWithDetails {
  id?: number;
  user_id: string;
  email: string;
  name: string;
  account_id: string;
  account_name: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  is_default: boolean;
  created_at?: number;
  updated_at?: number;
}

// Account operations
export const accountDb = {
  // Get all accounts for a user with full details
  getAll: (userId: string = 'default'): UserAccountWithDetails[] => {
    const stmt = db.prepare(`
      SELECT 
        uda.id as user_account_id,
        uda.user_id,
        uda.email,
        uda.name,
        uda.is_default,
        uda.created_at as user_created_at,
        da.account_id,
        da.account_name,
        da.access_token,
        da.refresh_token,
        da.expires_at,
        da.created_at,
        da.updated_at
      FROM user_docusign_accounts uda
      JOIN docusign_accounts da ON uda.docusign_account_id = da.id
      WHERE uda.user_id = ?
      ORDER BY uda.is_default DESC, uda.created_at DESC
    `);
    const accounts = stmt.all(userId) as any[];
    return accounts.map(acc => ({
      id: acc.user_account_id,
      user_id: acc.user_id,
      email: acc.email,
      name: acc.name,
      account_id: acc.account_id,
      account_name: acc.account_name,
      access_token: acc.access_token,
      refresh_token: acc.refresh_token,
      expires_at: acc.expires_at,
      is_default: Boolean(acc.is_default),
      created_at: acc.created_at,
      updated_at: acc.updated_at
    }));
  },

  // Get account by account_id for a specific user
  getById: (accountId: string, userId: string): UserAccountWithDetails | null => {
    const stmt = db.prepare(`
      SELECT 
        uda.id as user_account_id,
        uda.user_id,
        uda.email,
        uda.name,
        uda.is_default,
        uda.created_at as user_created_at,
        da.account_id,
        da.account_name,
        da.access_token,
        da.refresh_token,
        da.expires_at,
        da.created_at,
        da.updated_at
      FROM user_docusign_accounts uda
      JOIN docusign_accounts da ON uda.docusign_account_id = da.id
      WHERE da.account_id = ? AND uda.user_id = ?
    `);
    const account = stmt.get(accountId, userId) as any;
    if (!account) return null;
    return {
      id: account.user_account_id,
      user_id: account.user_id,
      email: account.email,
      name: account.name,
      account_id: account.account_id,
      account_name: account.account_name,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      is_default: Boolean(account.is_default),
      created_at: account.created_at,
      updated_at: account.updated_at
    };
  },

  // Get default account for a user
  getDefault: (userId: string = 'default'): UserAccountWithDetails | null => {
    const stmt = db.prepare(`
      SELECT 
        uda.id as user_account_id,
        uda.user_id,
        uda.email,
        uda.name,
        uda.is_default,
        uda.created_at as user_created_at,
        da.account_id,
        da.account_name,
        da.access_token,
        da.refresh_token,
        da.expires_at,
        da.created_at,
        da.updated_at
      FROM user_docusign_accounts uda
      JOIN docusign_accounts da ON uda.docusign_account_id = da.id
      WHERE uda.user_id = ? AND uda.is_default = 1
    `);
    const account = stmt.get(userId) as any;
    if (!account) return null;
    return {
      id: account.user_account_id,
      user_id: account.user_id,
      email: account.email,
      name: account.name,
      account_id: account.account_id,
      account_name: account.account_name,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      is_default: Boolean(account.is_default),
      created_at: account.created_at,
      updated_at: account.updated_at
    };
  },

  // Create or update account
  upsert: (accountData: {
    user_id: string;
    email: string;
    name: string;
    account_id: string;
    account_name: string;
    access_token: string;
    refresh_token: string;
    expires_at: number;
    is_default: boolean;
  }): UserAccountWithDetails => {
    const now = Math.floor(Date.now() / 1000);
    
    // If this is the first account for this user, make it default
    const existingAccounts = accountDb.getAll(accountData.user_id);
    const isDefault = existingAccounts.length === 0 || accountData.is_default;
    
    const transaction = db.transaction(() => {
      // First, upsert the DocuSign account
      const docusignStmt = db.prepare(`
        INSERT INTO docusign_accounts (
          account_id, account_name, access_token, refresh_token, expires_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          account_name = excluded.account_name,
          access_token = excluded.access_token,
          refresh_token = excluded.refresh_token,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `);
      
      docusignStmt.run(
        accountData.account_id,
        accountData.account_name,
        accountData.access_token,
        accountData.refresh_token,
        accountData.expires_at,
        now
      );
      
      // Get the DocuSign account ID
      const getDocusignAccountId = db.prepare('SELECT id FROM docusign_accounts WHERE account_id = ?');
      const docusignAccountId = (getDocusignAccountId.get(accountData.account_id) as any).id;
      
      // If making this default, remove default from other accounts
      if (isDefault) {
        db.prepare('UPDATE user_docusign_accounts SET is_default = 0 WHERE user_id = ?').run(accountData.user_id);
      }
      
      // Upsert the user-account relationship
      const userStmt = db.prepare(`
        INSERT INTO user_docusign_accounts (
          user_id, docusign_account_id, email, name, is_default
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, docusign_account_id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          is_default = excluded.is_default
      `);
      
      userStmt.run(
        accountData.user_id,
        docusignAccountId,
        accountData.email,
        accountData.name,
        isDefault ? 1 : 0
      );
    });
    
    transaction();
    
    return accountDb.getById(accountData.account_id, accountData.user_id)!;
  },

  // Set default account
  setDefault: (accountId: string, userId: string = 'default'): boolean => {
    const transaction = db.transaction(() => {
      // Remove default from all accounts for this user
      db.prepare('UPDATE user_docusign_accounts SET is_default = 0 WHERE user_id = ?').run(userId);
      // Set new default
      const result = db.prepare(`
        UPDATE user_docusign_accounts 
        SET is_default = 1 
        WHERE user_id = ? AND docusign_account_id = (
          SELECT da.id FROM docusign_accounts da WHERE da.account_id = ?
        )
      `).run(userId, accountId);
      return result.changes > 0;
    });
    
    return transaction() as boolean;
  },

  // Delete account (removes user-account relationship)
  delete: (accountId: string, userId: string): boolean => {
    const stmt = db.prepare(`
      DELETE FROM user_docusign_accounts 
      WHERE user_id = ? AND docusign_account_id = (
        SELECT id FROM docusign_accounts WHERE account_id = ?
      )
    `);
    const result = stmt.run(userId, accountId);
    return result.changes > 0;
  },

  // Update tokens (updates the main DocuSign account)
  updateTokens: (accountId: string, accessToken: string, refreshToken: string, expiresIn: number): boolean => {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const stmt = db.prepare(`
      UPDATE docusign_accounts 
      SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
      WHERE account_id = ?
    `);
    const result = stmt.run(accessToken, refreshToken, expiresAt, Math.floor(Date.now() / 1000), accountId);
    return result.changes > 0;
  },

  // Get DocuSign account details by account_id only (for token refresh scenarios)
  getByAccountId: (accountId: string): DocuSignAccount | null => {
    const stmt = db.prepare(`
      SELECT * FROM docusign_accounts WHERE account_id = ?
    `);
    const account = stmt.get(accountId) as any;
    if (!account) return null;
    return {
      id: account.id,
      account_id: account.account_id,
      account_name: account.account_name,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      created_at: account.created_at,
      updated_at: account.updated_at
    };
  }
};

// Helper functions for API endpoints
export const getAllAccountsByUser = (userId: string): UserAccountWithDetails[] => {
  return accountDb.getAll(userId);
};

export const getAccountByAccountId = (accountId: string, userId: string): UserAccountWithDetails | null => {
  return accountDb.getById(accountId, userId);
};

export const getDefaultAccount = (userId: string): UserAccountWithDetails | null => {
  return accountDb.getDefault(userId);
};

export default db;