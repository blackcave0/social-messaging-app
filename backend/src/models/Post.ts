import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  user: mongoose.Types.ObjectId;
  description: string;
  images: string[];
  mood?: string;
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    mood: {
      type: String,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model<IPost>('Post', postSchema);

export default Post; 