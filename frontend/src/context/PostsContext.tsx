import React, { createContext, useContext, ReactNode } from 'react';
import { usePosts, Post } from '../hooks/usePosts';

interface PostsContextType {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  createPost: (text: string, image?: string) => Promise<boolean>;
  toggleLike: (postId: string) => Promise<void>;
  getUserPosts: (userId: string) => Post[];
  refreshPosts: () => Promise<void>;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export const PostsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const postsData = usePosts();

  return (
    <PostsContext.Provider value={postsData}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePostsContext = () => {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePostsContext must be used within a PostsProvider');
  }
  return context;
}; 