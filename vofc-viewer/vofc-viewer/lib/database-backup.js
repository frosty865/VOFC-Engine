import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

/**
 * Database Backup Service
 * Implements automated, encrypted database backups with retention policies
 */
export class DatabaseBackupService {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
  }

  /**
   * Create encrypted database backup
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `vofc-backup-${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFileName);
      const encryptedPath = `${backupPath}.enc`;

      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      console.log(`Starting database backup: ${backupFileName}`);

      // Create database dump using pg_dump
      const dumpCommand = `pg_dump "${this.supabaseUrl}" > "${backupPath}"`;
      await execAsync(dumpCommand);

      // Encrypt the backup file
      await this.encryptFile(backupPath, encryptedPath);

      // Remove unencrypted backup
      await fs.unlink(backupPath);

      // Store backup metadata in database
      await this.storeBackupMetadata(backupFileName, encryptedPath);

      console.log(`Backup completed: ${encryptedPath}`);
      return { success: true, filePath: encryptedPath };

    } catch (error) {
      console.error('Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Encrypt backup file
   */
  async encryptFile(inputPath, outputPath) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('vofc-backup', 'utf8'));

    const input = await fs.readFile(inputPath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedData = Buffer.concat([iv, authTag, encrypted]);
    await fs.writeFile(outputPath, encryptedData);
  }

  /**
   * Decrypt backup file
   */
  async decryptFile(inputPath, outputPath) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.encryptionKey, 'hex');

    const encryptedData = await fs.readFile(inputPath);
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('vofc-backup', 'utf8'));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    await fs.writeFile(outputPath, decrypted);
  }

  /**
   * Store backup metadata in database
   */
  async storeBackupMetadata(fileName, filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      await this.supabase
        .from('backup_metadata')
        .insert({
          file_name: fileName,
          file_path: filePath,
          file_size: stats.size,
          created_at: new Date().toISOString(),
          status: 'completed'
        });
    } catch (error) {
      console.error('Failed to store backup metadata:', error);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      const decryptedPath = `${backupPath}.dec`;

      console.log(`Starting database restore from: ${backupFileName}`);

      // Decrypt backup file
      await this.decryptFile(backupPath, decryptedPath);

      // Restore database
      const restoreCommand = `psql "${this.supabaseUrl}" < "${decryptedPath}"`;
      await execAsync(restoreCommand);

      // Clean up decrypted file
      await fs.unlink(decryptedPath);

      console.log('Database restore completed');
      return { success: true };

    } catch (error) {
      console.error('Restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      // Get list of backup files
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('vofc-backup-') && file.endsWith('.enc'));

      let deletedCount = 0;
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          
          // Remove from database metadata
          await this.supabase
            .from('backup_metadata')
            .delete()
            .eq('file_name', file);
        }
      }

      console.log(`Cleaned up ${deletedCount} old backup files`);
      return { success: true, deletedCount };

    } catch (error) {
      console.error('Backup cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const { data, error } = await this.supabase
        .from('backup_metadata')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, backups: data || [] };
    } catch (error) {
      console.error('Failed to list backups:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      const decryptedPath = `${backupPath}.dec`;

      // Decrypt backup
      await this.decryptFile(backupPath, decryptedPath);

      // Check if file is valid SQL
      const content = await fs.readFile(decryptedPath, 'utf8');
      const isValidSQL = content.includes('-- PostgreSQL database dump') && 
                         content.includes('CREATE TABLE') && 
                         content.includes('INSERT INTO');

      // Clean up
      await fs.unlink(decryptedPath);

      return { success: true, isValid: isValidSQL };
    } catch (error) {
      console.error('Backup verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule automated backups
   */
  scheduleBackups() {
    // Daily backup at 2 AM
    const dailyBackup = setInterval(async () => {
      console.log('Running scheduled daily backup...');
      await this.createBackup();
    }, 24 * 60 * 60 * 1000);

    // Weekly cleanup on Sundays at 3 AM
    const weeklyCleanup = setInterval(async () => {
      console.log('Running scheduled backup cleanup...');
      await this.cleanupOldBackups();
    }, 7 * 24 * 60 * 60 * 1000);

    return { dailyBackup, weeklyCleanup };
  }
}

export default DatabaseBackupService;

