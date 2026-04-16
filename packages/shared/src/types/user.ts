export type Tier = 'explorer' | 'engager' | 'influencer' | 'champion';
export type Gender = 'male' | 'female' | 'other';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  firebaseUid: string;
  phone: string;
  email: string | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  gender: Gender | null;
  dob: string | null;
  primaryPincode: string;
  secondaryPincodes: string[];
  interests: string[];
  contentLanguages: string[];
  appLanguage: string;
  tier: Tier;
  lifetimePoints: number;
  currentBalance: number;
  streakDays: number;
  streakLastDate: string | null;
  isVerified: boolean;
  notificationPush: boolean;
  notificationEmail: boolean;
  isPrivate: boolean;
  shareDataWithBrands: boolean;
  fcmToken: string | null;
  role: UserRole;
  createdAt: string;
  lastActive: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  tier: Tier;
  isVerified: boolean;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface UserSettings {
  name: string;
  email: string | null;
  phone: string;
  dob: string | null;
  gender: Gender | null;
  primaryPincode: string;
  secondaryPincodes: string[];
  interests: string[];
  contentLanguages: string[];
  appLanguage: string;
  notificationPush: boolean;
  notificationEmail: boolean;
  isPrivate: boolean;
  shareDataWithBrands: boolean;
}
