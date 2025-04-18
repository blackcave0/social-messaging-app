import React, { createContext, useState, useEffect, ReactNode } from 'react';

// Define the User type
export type User = {
  id: string;
  name: string;
  profilePic: string;
  email?: string;
};

// Define the context type
type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
};

// Create the context with default values
export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => { },
  isLoading: true,
});

// Create the provider component
type UserProviderProps = {
  children: ReactNode;
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching user data from API or storage
    const fetchUser = async () => {
      try {
        // This would normally be an API call or local storage read
        // For now we'll use mock data
        const mockUser: User = {
          id: '1',
          name: 'John Doe',
          profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
          email: 'john.doe@example.com',
        };

        // Simulate network delay
        setTimeout(() => {
          setUser(mockUser);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider; 