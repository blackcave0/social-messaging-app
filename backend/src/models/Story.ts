import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  user: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  viewers: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    viewers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      default: function() {
        const now = new Date();
        return new Date(now.setHours(now.getHours() + 24)); // 24 hours expiry
      },
    },
  },
  {
    timestamps: true,
  }
);

const Story = mongoose.model<IStory>('Story', storySchema);

export default Story; 