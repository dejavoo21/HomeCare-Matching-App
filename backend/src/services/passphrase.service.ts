// ============================================================================
// PASSPHRASE SERVICE - SECURITY QUESTIONS & ANSWERS
// ============================================================================

import { Pool } from 'pg';
import crypto from 'crypto';

export interface PassphraseQuestion {
  id: string;
  question: string;
  answer_hash: string;
}

export interface PassphraseSetup {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export function createPassphraseService(pool: Pool) {
  return {
    /**
     * Hash an answer using SHA-256
     */
    hashAnswer(answer: string): string {
      return crypto
        .createHash('sha256')
        .update(answer.toLowerCase().trim())
        .digest('hex');
    },

    /**
     * Verify if answer matches hash
     */
    verifyAnswer(answer: string, hash: string): boolean {
      return this.hashAnswer(answer) === hash;
    },

    /**
     * Get security questions for a user
     */
    async getQuestions(userId: string): Promise<PassphraseQuestion[]> {
      try {
        const result = await pool.query(
          `SELECT id, question, answer_hash FROM passphrase_answers WHERE user_id = $1 ORDER BY created_at`,
          [userId]
        );
        return result.rows;
      } catch (err) {
        console.error('Error fetching passphrase questions:', err);
        throw err;
      }
    },

    /**
     * Set up passphrase (save security questions/answers)
     */
    async setupPassphrase(userId: string, questions: PassphraseSetup['questions']): Promise<boolean> {
      if (questions.length < 3) {
        throw new Error('At least 3 security questions are required');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Delete existing answers
        await client.query('DELETE FROM passphrase_answers WHERE user_id = $1', [userId]);

        // Insert new answers
        for (const q of questions) {
          const answerHash = this.hashAnswer(q.answer);
          await client.query(
            `INSERT INTO passphrase_answers (user_id, question, answer_hash)
             VALUES ($1, $2, $3)`,
            [userId, q.question, answerHash]
          );
        }

        // Mark passphrase as enabled in 2FA settings
        await client.query(
          `UPDATE two_fa_settings SET is_passphrase_enabled = true WHERE user_id = $1`,
          [userId]
        );

        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error setting up passphrase:', err);
        throw err;
      } finally {
        client.release();
      }
    },

    /**
     * Verify passphrase answers
     */
    async verifyPassphrase(userId: string, answers: Record<string, string>): Promise<boolean> {
      try {
        const questions = await this.getQuestions(userId);

        if (questions.length === 0) {
          return false;
        }

        // Check if all answers match
        for (const q of questions) {
          const userAnswer = answers[q.question];
          if (!userAnswer || !this.verifyAnswer(userAnswer, q.answer_hash)) {
            return false;
          }
        }

        return true;
      } catch (err) {
        console.error('Error verifying passphrase:', err);
        return false;
      }
    },

    /**
     * Disable passphrase for user
     */
    async disablePassphrase(userId: string): Promise<void> {
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Delete answers
          await client.query('DELETE FROM passphrase_answers WHERE user_id = $1', [userId]);

          // Update settings
          await client.query(
            `UPDATE two_fa_settings SET is_passphrase_enabled = false WHERE user_id = $1`,
            [userId]
          );

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('Error disabling passphrase:', err);
        throw err;
      }
    },
  };
}

export type PassphraseService = ReturnType<typeof createPassphraseService>;
