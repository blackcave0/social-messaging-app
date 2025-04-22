import mongoose from 'mongoose';

const followingSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create a compound index to ensure uniqueness of follower-following pairs
followingSchema.index({ follower: 1, following: 1 }, { unique: true });

const Following = mongoose.model('Following', followingSchema);
export default Following; 