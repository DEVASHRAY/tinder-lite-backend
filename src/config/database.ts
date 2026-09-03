import mongoose from 'mongoose';
// Node needs a real file extension in imports (browsers/bundlers often hide this).
// We write `.ts` in source; the compiler turns it into `.js` in the built files.
import { logger } from '../lib/logger.ts';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env['MONGODB_URI'] ?? '');
    logger.success({
      message: 'Connected to MongoDB',
    });
  } catch (error) {
    logger.fail({
      message: 'Failed to connect to MongoDB',
      error,
    });
    throw error;
  }
};
