export interface User {
  _id: string;
  id?: string; // Supabase user ID
  username: string;
  name: string;
  profilePicture?: string;
  token?: string;
} 