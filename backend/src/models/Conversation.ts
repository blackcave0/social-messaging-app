import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

// Drop existing indexes before creating new ones
mongoose.connection.once('open', async () => {
  try {
    // Only run in development to avoid production issues
    if (process.env.NODE_ENV !== 'production') {
      console.log('Attempting to drop conversation index');
      const indexes = await mongoose.connection.db
        .collection('conversations')
        .listIndexes()
        .toArray();
      
      const participantsIndex = indexes.find(
        (index) => index.key && index.key.participants === 1 && index.unique
      );
      
      if (participantsIndex) {
        await mongoose.connection.db
          .collection('conversations')
          .dropIndex(participantsIndex.name);
        console.log('Dropped conversation participants index');
      }
    }
  } catch (error) {
    console.warn('Error dropping index:', error);
  }
});

// Create a standard index without uniqueness constraint
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation; 