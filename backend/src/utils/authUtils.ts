import bcrypt from 'bcrypt';

/**
 * Hash a password
 * @param password The password to hash
 * @returns The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a password with a hash
 * @param password The password to check
 * @param hash The hash to compare against
 * @returns True if the password matches the hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};


// i have got a issue or problem in these code , when user upload the profilepicture i will save in the @uploads , but i don't want this , i want the when user upload profile picture it will save in the cloudinary storage