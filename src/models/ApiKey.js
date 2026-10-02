import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Production Key', // e.g. "Mobile App Testing"
    },
    prefix: {
      type: String,
      required: true, // Stores just "dj_live_a1b2c3" so the frontend can list it safely
    },
    keyHash: {
      type: String,
      required: true,
      unique: true, // Cryptographically secure SHA-256 hash comparison string
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true, // Can be toggled on/off on the dashboard without deleting it!
    },
    lastUsed: {
      type: Date,
      default: null, // Tracks when an automated script last hit your server with this key
    }
  },
  { timestamps: true }
);

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
