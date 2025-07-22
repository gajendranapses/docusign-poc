import { createClient } from "@libsql/client";

// Initialize Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Create tables if they don't exist
async function initializeDatabase() {
  try {
    await client.execute(`
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
    `);

    await client.execute(`
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
    
    console.log('Turso database tables created successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on module load
initializeDatabase();

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
  getAll: async (userId: string = 'default'): Promise<UserAccountWithDetails[]> => {
    const result = await client.execute({
      sql: `
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
      `,
      args: [userId]
    });

    return result.rows.map(row => ({
      id: row.user_account_id as number,
      user_id: row.user_id as string,
      email: row.email as string,
      name: row.name as string,
      account_id: row.account_id as string,
      account_name: row.account_name as string,
      access_token: row.access_token as string,
      refresh_token: row.refresh_token as string,
      expires_at: row.expires_at as number,
      is_default: Boolean(row.is_default),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number
    }));
  },

  // Get account by account_id for a specific user
  getById: async (accountId: string, userId: string): Promise<UserAccountWithDetails | null> => {
    const result = await client.execute({
      sql: `
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
      `,
      args: [accountId, userId]
    });

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.user_account_id as number,
      user_id: row.user_id as string,
      email: row.email as string,
      name: row.name as string,
      account_id: row.account_id as string,
      account_name: row.account_name as string,
      access_token: row.access_token as string,
      refresh_token: row.refresh_token as string,
      expires_at: row.expires_at as number,
      is_default: Boolean(row.is_default),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number
    };
  },

  // Get default account for a user
  getDefault: async (userId: string = 'default'): Promise<UserAccountWithDetails | null> => {
    const result = await client.execute({
      sql: `
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
      `,
      args: [userId]
    });

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.user_account_id as number,
      user_id: row.user_id as string,
      email: row.email as string,
      name: row.name as string,
      account_id: row.account_id as string,
      account_name: row.account_name as string,
      access_token: row.access_token as string,
      refresh_token: row.refresh_token as string,
      expires_at: row.expires_at as number,
      is_default: Boolean(row.is_default),
      created_at: row.created_at as number,
      updated_at: row.updated_at as number
    };
  },

  // Create or update account
  upsert: async (accountData: {
    user_id: string;
    email: string;
    name: string;
    account_id: string;
    account_name: string;
    access_token: string;
    refresh_token: string;
    expires_at: number;
    is_default: boolean;
  }): Promise<UserAccountWithDetails> => {
    const now = Math.floor(Date.now() / 1000);
    
    // If this is the first account for this user, make it default
    const existingAccounts = await accountDb.getAll(accountData.user_id);
    const isDefault = existingAccounts.length === 0 || accountData.is_default;
    
    // Turso doesn't have transactions yet, so we'll do operations sequentially
    // First, upsert the DocuSign account
    await client.execute({
      sql: `
        INSERT INTO docusign_accounts (
          account_id, account_name, access_token, refresh_token, expires_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          account_name = excluded.account_name,
          access_token = excluded.access_token,
          refresh_token = excluded.refresh_token,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `,
      args: [
        accountData.account_id,
        accountData.account_name,
        accountData.access_token,
        accountData.refresh_token,
        accountData.expires_at,
        now
      ]
    });
    
    // Get the DocuSign account ID
    const accountResult = await client.execute({
      sql: 'SELECT id FROM docusign_accounts WHERE account_id = ?',
      args: [accountData.account_id]
    });
    const docusignAccountId = accountResult.rows[0].id as number;
    
    // If making this default, remove default from other accounts
    if (isDefault) {
      await client.execute({
        sql: 'UPDATE user_docusign_accounts SET is_default = 0 WHERE user_id = ?',
        args: [accountData.user_id]
      });
    }
    
    // Upsert the user-account relationship
    await client.execute({
      sql: `
        INSERT INTO user_docusign_accounts (
          user_id, docusign_account_id, email, name, is_default
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, docusign_account_id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          is_default = excluded.is_default
      `,
      args: [
        accountData.user_id,
        docusignAccountId,
        accountData.email,
        accountData.name,
        isDefault ? 1 : 0
      ]
    });
    
    return (await accountDb.getById(accountData.account_id, accountData.user_id))!;
  },

  // Set default account
  setDefault: async (accountId: string, userId: string = 'default'): Promise<boolean> => {
    try {
      // Remove default from all accounts for this user
      await client.execute({
        sql: 'UPDATE user_docusign_accounts SET is_default = 0 WHERE user_id = ?',
        args: [userId]
      });
      
      // Set new default
      const result = await client.execute({
        sql: `
          UPDATE user_docusign_accounts 
          SET is_default = 1 
          WHERE user_id = ? AND docusign_account_id = (
            SELECT da.id FROM docusign_accounts da WHERE da.account_id = ?
          )
        `,
        args: [userId, accountId]
      });
      
      return result.rowsAffected > 0;
    } catch (error) {
      console.error('Error setting default account:', error);
      return false;
    }
  },

  // Delete account (removes user-account relationship)
  delete: async (accountId: string, userId: string): Promise<boolean> => {
    try {
      const result = await client.execute({
        sql: `
          DELETE FROM user_docusign_accounts 
          WHERE user_id = ? AND docusign_account_id = (
            SELECT id FROM docusign_accounts WHERE account_id = ?
          )
        `,
        args: [userId, accountId]
      });
      
      return result.rowsAffected > 0;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  },

  // Update tokens (updates the main DocuSign account)
  updateTokens: async (accountId: string, accessToken: string, refreshToken: string, expiresIn: number): Promise<boolean> => {
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
      const result = await client.execute({
        sql: `
          UPDATE docusign_accounts 
          SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
          WHERE account_id = ?
        `,
        args: [accessToken, refreshToken, expiresAt, Math.floor(Date.now() / 1000), accountId]
      });
      
      return result.rowsAffected > 0;
    } catch (error) {
      console.error('Error updating tokens:', error);
      return false;
    }
  },

  // Get DocuSign account details by account_id only (for token refresh scenarios)
  getByAccountId: async (accountId: string): Promise<DocuSignAccount | null> => {
    const result = await client.execute({
      sql: 'SELECT * FROM docusign_accounts WHERE account_id = ?',
      args: [accountId]
    });

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id as number,
      account_id: row.account_id as string,
      account_name: row.account_name as string,
      access_token: row.access_token as string,
      refresh_token: row.refresh_token as string,
      expires_at: row.expires_at as number,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number
    };
  }
};

// Helper functions for API endpoints (now async)
export const getAllAccountsByUser = async (userId: string): Promise<UserAccountWithDetails[]> => {
  return accountDb.getAll(userId);
};

export const getAccountByAccountId = async (accountId: string, userId: string): Promise<UserAccountWithDetails | null> => {
  return accountDb.getById(accountId, userId);
};

export const getDefaultAccount = async (userId: string): Promise<UserAccountWithDetails | null> => {
  return accountDb.getDefault(userId);
};

export { client as db };