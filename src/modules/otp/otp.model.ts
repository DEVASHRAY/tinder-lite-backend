import mongoose from 'mongoose';
// `import type` is erased at compile time — TypeScript uses the type, the built JS does not import it for values.
import type { InferSchemaType } from 'mongoose';
import validator from 'validator';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: 'Please enter a valid email address',
      },
      unique: true,
      lowercase: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
      // Same idea as user password: never return the hash unless we ask for it.
      select: false,
    },
    expiresAt: {
      type: Date,
      required: [true, 'OTP expiry is required'],
    },
  },
  {
    timestamps: true,
  },
);

// MongoDB's TTL monitor deletes the row after `expiresAt`. We still check expiry in code
// because that monitor can lag by up to about a minute.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpFields = InferSchemaType<typeof otpSchema>;

export const Otp = mongoose.model('Otp', otpSchema);
