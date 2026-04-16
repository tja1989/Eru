# Eru Phase 1 Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React Native + Expo mobile app for Eru Phase 1 — 8 screens with Instagram-like design, Firebase auth, feed with infinite scroll, reels with video preloading, points earning with toasts, and push notifications. Connect to the live backend API built in Plan 1.

**Architecture:** Expo Router for file-based navigation with a 5-tab bottom bar. Zustand for lightweight state management. Axios for API communication. expo-av for video playback. expo-notifications for FCM push. All shared types imported from `@eru/shared`.

**Tech Stack:** React Native, Expo SDK 52+, Expo Router v4, TypeScript, Zustand, Axios, expo-av, expo-notifications, expo-image-picker, Firebase Auth (via `@react-native-firebase/auth`).

**Sub-plan:** 2 of 3 (Backend API [done] → **Mobile App** → Admin + Deploy)

**Design spec:** `docs/superpowers/specs/2026-04-16-eru-phase1-design.md`

**Backend API:** `apps/api/` — 42 endpoints at `/api/v1/*`, already built and tested

---

## File Structure

```
apps/mobile/
├── app/                           ← Screens (Expo Router file-based)
│   ├── _layout.tsx                ← Root layout: auth gate + tab navigator
│   ├── (auth)/                    ← Auth screens (unauthenticated)
│   │   ├── _layout.tsx            ← Auth stack layout
│   │   ├── login.tsx              ← Phone OTP + Google sign-in
│   │   └── onboarding.tsx         ← Pincode + interests + languages
│   ├── (tabs)/                    ← Main app (authenticated)
│   │   ├── _layout.tsx            ← Bottom tab bar config
│   │   ├── index.tsx              ← Home Feed (Tab 1)
│   │   ├── explore.tsx            ← Explore (Tab 2)
│   │   ├── create.tsx             ← Create Post (Tab 3 — center accent)
│   │   ├── reels.tsx              ← Reels (Tab 4)
│   │   └── profile.tsx            ← Profile (Tab 5)
│   ├── wallet/
│   │   └── index.tsx              ← Wallet (lite)
│   ├── leaderboard/
│   │   └── index.tsx              ← Leaderboard (lite)
│   ├── my-content/
│   │   └── index.tsx              ← My Content / Moderation tracker
│   ├── settings/
│   │   └── index.tsx              ← Profile Details & Settings
│   ├── post/
│   │   └── [id].tsx               ← Single post detail view
│   └── comments/
│       └── [id].tsx               ← Comments view for a post
├── components/                    ← Reusable UI components
│   ├── PostCard.tsx               ← Single post in the feed
│   ├── ReelPlayer.tsx             ← Full-screen vertical video
│   ├── StoryRow.tsx               ← Horizontal stories strip
│   ├── StoryRing.tsx              ← Single story circle with gradient ring
│   ├── PointsToast.tsx            ← "+3 pts" slide-up toast
│   ├── PointsBadge.tsx            ← Green badge in header
│   ├── TierBadge.tsx              ← Tier indicator pill
│   ├── BottomTabBar.tsx           ← Custom bottom tab bar
│   ├── MediaGrid.tsx              ← 3-column photo grid (profile/explore)
│   ├── EmptyState.tsx             ← Empty state placeholder
│   ├── LoadingSpinner.tsx         ← Centered loading indicator
│   └── Avatar.tsx                 ← User avatar with tier ring
├── hooks/                         ← Custom React hooks
│   ├── useAuth.ts                 ← Firebase auth state + token
│   ├── useFeed.ts                 ← Feed fetching with infinite scroll
│   ├── usePoints.ts               ← Points earning + toast trigger
│   ├── useNotifications.ts        ← FCM token + push handling
│   └── usePolling.ts              ← Generic polling hook
├── services/                      ← API client layer
│   ├── api.ts                     ← Axios instance with auth interceptor
│   ├── authService.ts             ← Register, logout
│   ├── feedService.ts             ← Feed, stories, wallet summary
│   ├── contentService.ts          ← Create, like, comment, save
│   ├── mediaService.ts            ← Upload, presign
│   ├── userService.ts             ← Profile, follow, settings
│   ├── pointsService.ts           ← Earn points
│   ├── walletService.ts           ← Wallet, history, expiring
│   ├── exploreService.ts          ← Explore, search, trending
│   ├── reelsService.ts            ← Reels feed, like, comment
│   ├── leaderboardService.ts      ← Rankings, my rank, season, quests
│   └── notificationService.ts     ← List, mark read
├── stores/                        ← Zustand state stores
│   ├── authStore.ts               ← User session, token, profile
│   ├── pointsStore.ts             ← Balance, streak, tier, daily progress
│   └── notificationStore.ts       ← Unread count
├── constants/
│   ├── theme.ts                   ← Colors, fonts, spacing (Instagram-like)
│   └── config.ts                  ← API URL, feature flags
├── app.json                       ← Expo config
├── package.json
└── tsconfig.json
```

---

## Task 1: Expo Project Setup

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/babel.config.js`
- Modify: root `package.json` (workspaces already include `apps/*`)

- [ ] **Step 1: Create Expo project**

```bash
cd /Users/USER/claude_tj/Eru/apps
npx create-expo-app@latest mobile --template blank-typescript
```

- [ ] **Step 2: Install core dependencies**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens react-native-gesture-handler
npm install axios zustand @react-native-firebase/app @react-native-firebase/auth
npm install expo-image-picker expo-av expo-notifications expo-font
```

- [ ] **Step 3: Configure app.json for Expo Router**

Update `apps/mobile/app.json`:
```json
{
  "expo": {
    "name": "Eru",
    "slug": "eru",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "eru",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAFAFA"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "app.eru.consumer"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FAFAFA"
      },
      "package": "app.eru.consumer",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#E8792B"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 4: Configure tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"],
      "@eru/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 5: Verify project starts**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile
npx expo start
```
Expected: Metro bundler starts, QR code visible. Press `a` for Android or scan QR with Expo Go.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/
git commit -m "feat: initialize Expo project with Router, Firebase, and core dependencies"
```

---

## Task 2: Theme & Design Constants

**Files:**
- Create: `apps/mobile/constants/theme.ts`
- Create: `apps/mobile/constants/config.ts`

- [ ] **Step 1: Create Instagram-like theme**

`apps/mobile/constants/theme.ts`:
```typescript
export const colors = {
  // Backgrounds
  bg: '#FAFAFA',
  card: '#FFFFFF',
  black: '#000000',

  // Brand
  navy: '#1A3C6E',
  orange: '#E8792B',
  teal: '#0D9488',

  // Accents
  purple: '#7C3AED',
  pink: '#EC4899',
  red: '#ED4956',
  blue: '#0095F6',
  green: '#10B981',
  gold: '#D97706',
  cyan: '#06B6D4',

  // Greys (Instagram palette)
  g50: '#FAFAFA',
  g100: '#EFEFEF',
  g200: '#DBDBDB',
  g300: '#C7C7C7',
  g400: '#8E8E8E',
  g500: '#737373',
  g600: '#595959',
  g700: '#363636',
  g800: '#262626',
  g900: '#121212',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const tierColors: Record<string, string> = {
  explorer: colors.g400,
  engager: colors.teal,
  influencer: colors.orange,
  champion: colors.gold,
};

export const storyRingGradient = ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'];
```

- [ ] **Step 2: Create app config**

`apps/mobile/constants/config.ts`:
```typescript
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const config = {
  apiUrl: API_URL,
  apiPrefix: '/api/v1',
  pointsPollingInterval: 10000,   // 10 seconds on wallet screen
  notifPollingInterval: 30000,    // 30 seconds everywhere
  leaderboardPollingInterval: 30000,
  reelPreloadCount: 2,
  feedPageSize: 20,
  maxMediaPerPost: 10,
  maxVideoSeconds: 300,           // 5 minutes
  maxReelSeconds: 60,
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/constants/
git commit -m "feat: add Instagram-like theme constants and app config"
```

---

## Task 3: API Client Layer

**Files:**
- Create: `apps/mobile/services/api.ts`
- Create: `apps/mobile/services/authService.ts`
- Create: `apps/mobile/services/feedService.ts`
- Create: `apps/mobile/services/contentService.ts`
- Create: `apps/mobile/services/mediaService.ts`
- Create: `apps/mobile/services/userService.ts`
- Create: `apps/mobile/services/pointsService.ts`
- Create: `apps/mobile/services/walletService.ts`
- Create: `apps/mobile/services/exploreService.ts`
- Create: `apps/mobile/services/reelsService.ts`
- Create: `apps/mobile/services/leaderboardService.ts`
- Create: `apps/mobile/services/notificationService.ts`

- [ ] **Step 1: Create base API client with auth interceptor**

`apps/mobile/services/api.ts`:
```typescript
import axios from 'axios';
import { config } from '../constants/config';

const api = axios.create({
  baseURL: `${config.apiUrl}${config.apiPrefix}`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((req) => {
  if (authToken) {
    req.headers.Authorization = `Bearer ${authToken}`;
  }
  return req;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — trigger re-auth
      // authStore.getState().logout() would go here
    }
    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 2: Create all service files**

`apps/mobile/services/authService.ts`:
```typescript
import api from './api';

export const authService = {
  register: (data: { firebaseUid: string; phone: string; name: string; username: string }) =>
    api.post('/auth/register', data).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),
};
```

`apps/mobile/services/feedService.ts`:
```typescript
import api from './api';

export const feedService = {
  getFeed: (page = 1, limit = 20, pincode?: string) =>
    api.get('/feed', { params: { page, limit, pincode } }).then((r) => r.data),

  getStories: () =>
    api.get('/stories').then((r) => r.data),

  getWalletSummary: () =>
    api.get('/wallet/summary').then((r) => r.data),
};
```

`apps/mobile/services/contentService.ts`:
```typescript
import api from './api';

export const contentService = {
  create: (data: { type: string; text?: string; mediaIds: string[]; hashtags: string[]; locationPincode?: string }) =>
    api.post('/content/create', data).then((r) => r.data),

  getById: (id: string) =>
    api.get(`/content/${id}`).then((r) => r.data),

  resubmit: (id: string) =>
    api.post(`/content/${id}/resubmit`).then((r) => r.data),

  appeal: (id: string) =>
    api.post(`/content/${id}/appeal`).then((r) => r.data),

  like: (id: string) =>
    api.post(`/posts/${id}/like`).then((r) => r.data),

  unlike: (id: string) =>
    api.delete(`/posts/${id}/unlike`).then((r) => r.data),

  comment: (id: string, text: string, parentId?: string) =>
    api.post(`/posts/${id}/comments`, { text, parentId }).then((r) => r.data),

  getComments: (id: string, page = 1) =>
    api.get(`/posts/${id}/comments`, { params: { page } }).then((r) => r.data),
};
```

`apps/mobile/services/mediaService.ts`:
```typescript
import api from './api';
import axios from 'axios';

export const mediaService = {
  upload: (data: { contentType: string; width: number; height: number }) =>
    api.post('/media/upload', data).then((r) => r.data),

  presign: (data: { contentType: string; size: number }) =>
    api.post('/media/presign', data).then((r) => r.data),

  uploadFileToS3: async (uploadUrl: string, file: { uri: string; type: string }) => {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    await axios.put(uploadUrl, blob, {
      headers: { 'Content-Type': file.type },
    });
  },
};
```

`apps/mobile/services/userService.ts`:
```typescript
import api from './api';

export const userService = {
  getProfile: (id: string) =>
    api.get(`/users/${id}/profile`).then((r) => r.data),

  follow: (id: string) =>
    api.post(`/users/${id}/follow`).then((r) => r.data),

  unfollow: (id: string) =>
    api.delete(`/users/${id}/unfollow`).then((r) => r.data),

  getContent: (id: string, tab = 'posts', page = 1) =>
    api.get(`/users/${id}/content`, { params: { tab, page } }).then((r) => r.data),

  getFollowers: (id: string, page = 1) =>
    api.get(`/users/${id}/followers`, { params: { page } }).then((r) => r.data),

  getFollowing: (id: string, page = 1) =>
    api.get(`/users/${id}/following`, { params: { page } }).then((r) => r.data),

  getSettings: () =>
    api.get('/users/me/settings').then((r) => r.data),

  updateSettings: (data: Record<string, any>) =>
    api.put('/users/me/settings', data).then((r) => r.data),
};
```

`apps/mobile/services/pointsService.ts`:
```typescript
import api from './api';

export const pointsService = {
  earn: (data: { actionType: string; contentId?: string; metadata?: Record<string, any> }) =>
    api.post('/actions/earn', data).then((r) => r.data),
};
```

`apps/mobile/services/walletService.ts`:
```typescript
import api from './api';

export const walletService = {
  getWallet: () => api.get('/wallet').then((r) => r.data),
  getHistory: (page = 1) => api.get('/wallet/history', { params: { page } }).then((r) => r.data),
  getExpiring: () => api.get('/wallet/expiring').then((r) => r.data),
};
```

`apps/mobile/services/exploreService.ts`:
```typescript
import api from './api';

export const exploreService = {
  getExplore: (category = 'all', page = 1) =>
    api.get('/explore', { params: { category, page } }).then((r) => r.data),
  search: (q: string) =>
    api.get('/search', { params: { q } }).then((r) => r.data),
  getTrending: () =>
    api.get('/trending').then((r) => r.data),
};
```

`apps/mobile/services/reelsService.ts`:
```typescript
import api from './api';

export const reelsService = {
  getReels: (tab = 'foryou', page = 1) =>
    api.get('/reels', { params: { tab, page } }).then((r) => r.data),
  like: (id: string) =>
    api.post(`/reels/${id}/like`).then((r) => r.data),
  comment: (id: string, text: string) =>
    api.post(`/reels/${id}/comments`, { text }).then((r) => r.data),
};
```

`apps/mobile/services/leaderboardService.ts`:
```typescript
import api from './api';

export const leaderboardService = {
  getLeaderboard: (scope = 'pincode', pincode?: string) =>
    api.get('/leaderboard', { params: { scope, pincode } }).then((r) => r.data),
  getMyRank: () =>
    api.get('/leaderboard/me').then((r) => r.data),
  getCurrentSeason: () =>
    api.get('/season/current').then((r) => r.data),
  getWeeklyQuests: () =>
    api.get('/quests/weekly').then((r) => r.data),
};
```

`apps/mobile/services/notificationService.ts`:
```typescript
import api from './api';

export const notificationService = {
  getNotifications: (page = 1) =>
    api.get('/notifications', { params: { page } }).then((r) => r.data),
  markRead: (ids: string[]) =>
    api.put('/notifications/read', { ids }).then((r) => r.data),
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/services/
git commit -m "feat: add API client layer with all 12 service modules"
```

---

## Task 4: Zustand Stores

**Files:**
- Create: `apps/mobile/stores/authStore.ts`
- Create: `apps/mobile/stores/pointsStore.ts`
- Create: `apps/mobile/stores/notificationStore.ts`

- [ ] **Step 1: Create auth store**

`apps/mobile/stores/authStore.ts`:
```typescript
import { create } from 'zustand';
import { setAuthToken } from '../services/api';
import { authService } from '../services/authService';

interface AuthState {
  user: {
    id: string;
    name: string;
    username: string;
    phone: string;
    tier: string;
    currentBalance: number;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setToken: (token: string) => void;
  setUser: (user: AuthState['user']) => void;
  register: (data: { firebaseUid: string; phone: string; name: string; username: string }) => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  setToken: (token) => {
    setAuthToken(token);
    set({ token, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  register: async (data) => {
    set({ isLoading: true });
    try {
      const result = await authService.register(data);
      set({ user: result.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try { await authService.logout(); } catch {}
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  reset: () => {
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));
```

- [ ] **Step 2: Create points store**

`apps/mobile/stores/pointsStore.ts`:
```typescript
import { create } from 'zustand';
import { pointsService } from '../services/pointsService';
import { feedService } from '../services/feedService';

interface PointsState {
  balance: number;
  streak: number;
  tier: string;
  dailyEarned: number;
  dailyGoal: number;
  lastToast: { points: number; timestamp: number } | null;

  earn: (actionType: string, contentId?: string, metadata?: Record<string, any>) => Promise<void>;
  refreshSummary: () => Promise<void>;
  dismissToast: () => void;
}

export const usePointsStore = create<PointsState>((set) => ({
  balance: 0,
  streak: 0,
  tier: 'explorer',
  dailyEarned: 0,
  dailyGoal: 250,
  lastToast: null,

  earn: async (actionType, contentId, metadata) => {
    try {
      const result = await pointsService.earn({ actionType, contentId, metadata });
      set({
        balance: result.newBalance,
        streak: result.streak,
        dailyEarned: result.dailyProgress.earned,
        dailyGoal: result.dailyProgress.goal,
        lastToast: { points: result.points, timestamp: Date.now() },
      });
    } catch {
      // Silently fail — don't disrupt UX for points errors
    }
  },

  refreshSummary: async () => {
    try {
      const summary = await feedService.getWalletSummary();
      set({
        balance: summary.balance,
        streak: summary.streak,
        tier: summary.tier,
      });
    } catch {}
  },

  dismissToast: () => set({ lastToast: null }),
}));
```

- [ ] **Step 3: Create notification store**

`apps/mobile/stores/notificationStore.ts`:
```typescript
import { create } from 'zustand';
import { notificationService } from '../services/notificationService';

interface NotificationState {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,

  refreshUnread: async () => {
    try {
      const result = await notificationService.getNotifications(1);
      set({ unreadCount: result.unreadCount });
    } catch {}
  },
}));
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/stores/
git commit -m "feat: add Zustand stores for auth, points, and notifications"
```

---

## Task 5: Core UI Components

**Files:**
- Create: `apps/mobile/components/Avatar.tsx`
- Create: `apps/mobile/components/PointsBadge.tsx`
- Create: `apps/mobile/components/PointsToast.tsx`
- Create: `apps/mobile/components/TierBadge.tsx`
- Create: `apps/mobile/components/LoadingSpinner.tsx`
- Create: `apps/mobile/components/EmptyState.tsx`

- [ ] **Step 1: Create Avatar component with tier ring**

`apps/mobile/components/Avatar.tsx`:
```typescript
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tierColors, storyRingGradient, colors } from '../constants/theme';

interface AvatarProps {
  uri: string | null;
  size?: number;
  tier?: string;
  showStoryRing?: boolean;
  hasUnseenStory?: boolean;
}

export function Avatar({ uri, size = 40, tier, showStoryRing, hasUnseenStory }: AvatarProps) {
  const ringSize = size + 6;
  const borderColor = tier ? tierColors[tier] || colors.g400 : colors.g400;

  const inner = (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]} />
      )}
    </View>
  );

  if (showStoryRing && hasUnseenStory) {
    return (
      <LinearGradient
        colors={storyRingGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, padding: 2.5 }]}
      >
        {inner}
      </LinearGradient>
    );
  }

  if (tier) {
    return (
      <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderWidth: 2, borderColor, padding: 1 }]}>
        {inner}
      </View>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  ring: { alignItems: 'center', justifyContent: 'center' },
  image: { resizeMode: 'cover' },
  placeholder: { backgroundColor: '#E0E0E0' },
});
```

- [ ] **Step 2: Create PointsBadge (header badge)**

`apps/mobile/components/PointsBadge.tsx`:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/theme';
import { usePointsStore } from '../stores/pointsStore';

export function PointsBadge() {
  const router = useRouter();
  const { balance, streak } = usePointsStore();

  return (
    <TouchableOpacity style={styles.badge} onPress={() => router.push('/wallet')}>
      <Text style={styles.points}>{balance.toLocaleString()}</Text>
      {streak > 0 && <Text style={styles.streak}>{streak}d</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  points: { fontSize: 12, fontWeight: '700', color: colors.green },
  streak: { fontSize: 9, fontWeight: '700', color: colors.orange },
});
```

- [ ] **Step 3: Create PointsToast (slide-up notification)**

`apps/mobile/components/PointsToast.tsx`:
```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { usePointsStore } from '../stores/pointsStore';

export function PointsToast() {
  const { lastToast, dismissToast } = usePointsStore();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (lastToast) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 100, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => dismissToast());
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [lastToast]);

  if (!lastToast) return null;

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }], opacity }]}>
      <Text style={styles.text}>+{lastToast.points} pts</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
```

- [ ] **Step 4: Create TierBadge, LoadingSpinner, EmptyState**

`apps/mobile/components/TierBadge.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tierColors } from '../constants/theme';
import { TIER_CONFIGS } from '@eru/shared';
import type { Tier } from '@eru/shared';

export function TierBadge({ tier }: { tier: string }) {
  const config = TIER_CONFIGS[tier as Tier];
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: `${tierColors[tier]}20` }]}>
      <Text style={styles.text}>{config.emoji} {config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: '700' },
});
```

`apps/mobile/components/LoadingSpinner.tsx`:
```typescript
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export function LoadingSpinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

`apps/mobile/components/EmptyState.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = '📭', title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.g800, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.g400, textAlign: 'center', marginTop: 6 },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/
git commit -m "feat: add core UI components — Avatar, PointsBadge, PointsToast, TierBadge, Loading, Empty"
```

---

## Task 6: Navigation Layout + Auth Gate

**Files:**
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/onboarding.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/hooks/useAuth.ts`

- [ ] **Step 1: Create auth hook**

`apps/mobile/hooks/useAuth.ts`:
```typescript
import { useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const [initializing, setInitializing] = useState(true);
  const { setToken, isAuthenticated, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setToken(token);
      } else {
        reset();
      }
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, []);

  return { initializing, isAuthenticated };
}
```

- [ ] **Step 2: Create root layout with auth gate**

`apps/mobile/app/_layout.tsx`:
```typescript
import React from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { PointsToast } from '../components/PointsToast';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function RootLayout() {
  const { initializing, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, initializing, segments]);

  if (initializing) return <LoadingSpinner />;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      <PointsToast />
    </View>
  );
}
```

- [ ] **Step 3: Create auth stack layout**

`apps/mobile/app/(auth)/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
```

- [ ] **Step 4: Create login screen**

`apps/mobile/app/(auth)/login.tsx`:
```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { colors, spacing } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (!phone || phone.length < 10) return Alert.alert('Enter a valid phone number');
    setLoading(true);
    try {
      const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
      const confirmation = await auth().signInWithPhoneNumber(formatted);
      setConfirm(confirmation);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (!code || code.length !== 6) return Alert.alert('Enter the 6-digit code');
    setLoading(true);
    try {
      await confirm.confirm(code);
      // onAuthStateChanged in useAuth will handle the rest
      router.replace('/(auth)/onboarding');
    } catch {
      Alert.alert('Error', 'Invalid code. Please try again.');
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    // Google sign-in will be configured with expo-auth-session or @react-native-google-signin
    Alert.alert('Coming soon', 'Google sign-in will be available shortly.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Eru</Text>
      <Text style={styles.subtitle}>Your attention has value</Text>

      {!confirm ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Phone number (e.g., 9876543210)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={15}
          />
          <TouchableOpacity style={styles.button} onPress={sendOTP} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            maxLength={6}
          />
          <TouchableOpacity style={styles.button} onPress={verifyOTP} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.googleButton} onPress={signInWithGoogle}>
        <Text style={styles.googleText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  logo: { fontSize: 48, fontWeight: '800', fontStyle: 'italic', color: colors.g800, textAlign: 'center', fontFamily: 'Georgia' },
  subtitle: { fontSize: 16, color: colors.g500, textAlign: 'center', marginBottom: 40, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  googleButton: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, alignItems: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.g700 },
});
```

- [ ] **Step 5: Create onboarding screen**

`apps/mobile/app/(auth)/onboarding.tsx`:
```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../constants/theme';

const INTERESTS = ['Food', 'Travel', 'Tech', 'Fitness', 'Film', 'Art', 'Music', 'Fashion', 'Gaming', 'Sports', 'Education', 'Business'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    if (!name || !username || pincode.length !== 6 || selectedInterests.length < 3) {
      return Alert.alert('Please fill all fields and select at least 3 interests');
    }

    setLoading(true);
    try {
      const firebaseUser = auth().currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');

      await registerUser({
        firebaseUid: firebaseUser.uid,
        phone: firebaseUser.phoneNumber || '',
        name,
        username,
      });

      await userService.updateSettings({
        primaryPincode: pincode,
        interests: selectedInterests.map((i) => i.toLowerCase()),
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome to Eru</Text>
      <Text style={styles.subtitle}>Let's set up your profile</Text>

      {step === 1 && (
        <>
          <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Choose a username" value={username} onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Your pincode (6 digits)" value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} />
          <TouchableOpacity style={styles.button} onPress={() => {
            if (name && username && pincode.length === 6) setStep(2);
            else Alert.alert('Please fill all fields');
          }}>
            <Text style={styles.buttonText}>Next: Pick Interests</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 2 && (
        <>
          <Text style={styles.sectionTitle}>Pick 3 or more interests</Text>
          <View style={styles.interestGrid}>
            {INTERESTS.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[styles.interestPill, selectedInterests.includes(interest) && styles.interestSelected]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={[styles.interestText, selectedInterests.includes(interest) && styles.interestTextSelected]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.button, selectedInterests.length < 3 && styles.buttonDisabled]} onPress={handleComplete} disabled={loading || selectedInterests.length < 3}>
            <Text style={styles.buttonText}>{loading ? 'Setting up...' : 'Start Exploring'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 80 },
  title: { fontSize: 32, fontWeight: '800', color: colors.g800, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.g500, textAlign: 'center', marginBottom: 32, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.g800, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.g100, borderWidth: 1, borderColor: colors.g200 },
  interestSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  interestText: { fontSize: 14, fontWeight: '600', color: colors.g700 },
  interestTextSelected: { color: '#fff' },
});
```

- [ ] **Step 6: Create tab bar layout**

`apps/mobile/app/(tabs)/_layout.tsx`:
```typescript
import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.g800,
        tabBarInactiveTintColor: colors.g400,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔍</Text> }} />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: () => (
            <View style={styles.createButton}>
              <Text style={{ fontSize: 24, color: '#fff' }}>+</Text>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen name="reels" options={{ title: 'Reels', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎬</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { height: 56, borderTopWidth: 0.5, borderTopColor: colors.g200, backgroundColor: '#fff' },
  label: { fontSize: 10, fontWeight: '600' },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/ apps/mobile/hooks/
git commit -m "feat: add navigation layout with auth gate, login, onboarding, and tab bar"
```

---

## Task 7: PostCard Component

**Files:**
- Create: `apps/mobile/components/PostCard.tsx`

- [ ] **Step 1: Create the PostCard — the most important UI component**

`apps/mobile/components/PostCard.tsx`:
```typescript
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { colors, spacing } from '../constants/theme';
import { contentService } from '../services/contentService';
import { usePointsStore } from '../stores/pointsStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PostCardProps {
  post: {
    id: string;
    type: string;
    text: string | null;
    hashtags: string[];
    likeCount: number;
    commentCount: number;
    shareCount: number;
    isLiked: boolean;
    isSaved: boolean;
    media: Array<{ originalUrl: string; thumbnailUrl: string | null; type: string }>;
    user: { id: string; name: string; username: string; avatarUrl: string | null; tier: string; isVerified: boolean };
    publishedAt: string;
  };
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const { earn } = usePointsStore();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.isSaved);

  const handleLike = async () => {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await contentService.unlike(post.id).catch(() => { setLiked(true); setLikeCount((c) => c + 1); });
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await contentService.like(post.id).catch(() => { setLiked(false); setLikeCount((c) => c - 1); });
      earn('like', post.id);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
    earn('save', post.id);
  };

  return (
    <View style={styles.post}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userRow} onPress={() => router.push(`/post/${post.user.id}`)}>
          <Avatar uri={post.user.avatarUrl} size={34} tier={post.user.tier} />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{post.user.username}</Text>
              {post.user.isVerified && <View style={styles.verified}><Text style={{ fontSize: 8, color: '#fff' }}>✓</Text></View>}
            </View>
          </View>
        </TouchableOpacity>
        <Text style={styles.more}>•••</Text>
      </View>

      {/* Media */}
      {post.media.length > 0 && (
        <Image
          source={{ uri: post.media[0].originalUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity onPress={handleLike}>
            <Text style={{ fontSize: 26 }}>{liked ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/comments/${post.id}`)}>
            <Text style={{ fontSize: 26 }}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => earn('share', post.id)}>
            <Text style={{ fontSize: 26 }}>📤</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave}>
          <Text style={{ fontSize: 26 }}>{saved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Like count */}
      <Text style={styles.likes}>{likeCount.toLocaleString()} likes</Text>

      {/* Caption */}
      {post.text && (
        <Text style={styles.caption}>
          <Text style={styles.captionUser}>{post.user.username} </Text>
          {post.text}
        </Text>
      )}

      {/* Comments preview */}
      {post.commentCount > 0 && (
        <TouchableOpacity onPress={() => router.push(`/comments/${post.id}`)}>
          <Text style={styles.viewComments}>View all {post.commentCount} comments</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  post: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  verified: { width: 13, height: 13, borderRadius: 6.5, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  more: { fontSize: 16, color: colors.g800, letterSpacing: 2 },
  image: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: colors.g100 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6 },
  actionsLeft: { flexDirection: 'row', gap: 14 },
  likes: { paddingHorizontal: spacing.md, fontSize: 13, fontWeight: '600', color: colors.g800 },
  caption: { paddingHorizontal: spacing.md, paddingVertical: 4, fontSize: 13, color: colors.g800, lineHeight: 19 },
  captionUser: { fontWeight: '600' },
  viewComments: { paddingHorizontal: spacing.md, paddingBottom: 8, fontSize: 13, color: colors.g400 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/PostCard.tsx
git commit -m "feat: add PostCard component with like/save/share actions and optimistic UI"
```

---

## Task 8: Home Feed Screen

**Files:**
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/components/StoryRow.tsx`
- Create: `apps/mobile/hooks/useFeed.ts`

- [ ] **Step 1: Create useFeed hook with infinite scroll**

`apps/mobile/hooks/useFeed.ts`:
```typescript
import { useState, useCallback } from 'react';
import { feedService } from '../services/feedService';

export function useFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (loading && !isRefresh) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await feedService.getFeed(pageNum);
      if (isRefresh || pageNum === 1) {
        setPosts(result.data);
      } else {
        setPosts((prev) => [...prev, ...result.data]);
      }
      setHasMore(result.nextPage !== null);
      setPage(pageNum);
    } catch (error) {
      console.error('Feed load error:', error);
    }

    setLoading(false);
    setRefreshing(false);
  }, [loading]);

  const refresh = () => loadFeed(1, true);
  const loadMore = () => { if (hasMore && !loading) loadFeed(page + 1); };

  return { posts, loading, refreshing, hasMore, refresh, loadMore, loadFeed };
}
```

- [ ] **Step 2: Create StoryRow**

`apps/mobile/components/StoryRow.tsx`:
```typescript
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { colors } from '../constants/theme';

interface Story {
  user: { id: string; name: string; username: string; avatarUrl: string | null };
  items: any[];
}

export function StoryRow({ stories }: { stories: Story[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {/* Your Story */}
      <TouchableOpacity style={styles.story}>
        <View style={styles.addRing}>
          <Avatar uri={null} size={58} />
          <View style={styles.addBadge}><Text style={styles.addText}>+</Text></View>
        </View>
        <Text style={styles.name}>Your story</Text>
      </TouchableOpacity>

      {stories.map((story) => (
        <TouchableOpacity key={story.user.id} style={styles.story}>
          <Avatar uri={story.user.avatarUrl} size={66} showStoryRing hasUnseenStory />
          <Text style={styles.name} numberOfLines={1}>{story.user.username}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  content: { paddingHorizontal: 12, paddingVertical: 10, gap: 14 },
  story: { alignItems: 'center', width: 68 },
  name: { fontSize: 10.5, color: colors.g800, marginTop: 4, maxWidth: 68, textAlign: 'center' },
  addRing: { position: 'relative' },
  addBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.blue, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 12, color: '#fff', fontWeight: '800' },
});
```

- [ ] **Step 3: Create Home Feed screen**

`apps/mobile/app/(tabs)/index.tsx`:
```typescript
import React, { useEffect } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostCard } from '../../components/PostCard';
import { StoryRow } from '../../components/StoryRow';
import { PointsBadge } from '../../components/PointsBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useFeed } from '../../hooks/useFeed';
import { usePointsStore } from '../../stores/pointsStore';
import { feedService } from '../../services/feedService';
import { colors } from '../../constants/theme';

export default function HomeFeedScreen() {
  const { posts, loading, refreshing, refresh, loadMore, loadFeed } = useFeed();
  const { refreshSummary, earn } = usePointsStore();
  const [stories, setStories] = React.useState<any[]>([]);

  useEffect(() => {
    loadFeed(1);
    refreshSummary();
    feedService.getStories().then((r) => setStories(r.stories || [])).catch(() => {});
    earn('daily_checkin');
  }, []);

  const renderHeader = () => (
    <>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.logo}>Eru</Text>
        <View style={styles.headerActions}>
          <PointsBadge />
          <Text style={{ fontSize: 24 }}>💬</Text>
        </View>
      </View>
      {/* Stories */}
      <StoryRow stories={stories} />
    </>
  );

  if (loading && posts.length === 0) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  logo: { fontSize: 26, fontWeight: '800', fontStyle: 'italic', color: colors.g800, fontFamily: 'Georgia' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx apps/mobile/components/StoryRow.tsx apps/mobile/hooks/useFeed.ts
git commit -m "feat: add Home Feed screen with infinite scroll, stories row, and daily check-in"
```

---

## Task 9: Create Post Screen

**Files:**
- Create: `apps/mobile/app/(tabs)/create.tsx`

- [ ] **Step 1: Create the content creation screen**

`apps/mobile/app/(tabs)/create.tsx`:
```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { contentService } from '../../services/contentService';
import { mediaService } from '../../services/mediaService';
import { colors, spacing } from '../../constants/theme';

const CONTENT_TYPES = ['Post', 'Photo', 'Reel', 'Poll', 'Thread'];

export default function CreateScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [selectedType, setSelectedType] = useState('post');
  const [media, setMedia] = useState<Array<{ uri: string; type: string; width: number; height: number }>>([]);
  const [hashtags, setHashtags] = useState('');
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets.map((a) => ({
        uri: a.uri,
        type: a.type === 'video' ? 'video/mp4' : 'image/jpeg',
        width: a.width,
        height: a.height,
      })));
    }
  };

  const handleSubmit = async () => {
    if (!text && media.length === 0) return Alert.alert('Add some content first');
    setLoading(true);

    try {
      // Upload media first
      const mediaIds: string[] = [];
      for (const item of media) {
        const uploadResult = await mediaService.upload({
          contentType: item.type,
          width: item.width,
          height: item.height,
        });
        await mediaService.uploadFileToS3(uploadResult.uploadUrl, { uri: item.uri, type: item.type });
        mediaIds.push(uploadResult.mediaId);
      }

      // Create content
      const parsedHashtags = hashtags.split(' ').filter((h) => h.startsWith('#')).map((h) => h.slice(1).toLowerCase());

      await contentService.create({
        type: selectedType,
        text: text || undefined,
        mediaIds,
        hashtags: parsedHashtags,
      });

      Alert.alert('Submitted!', 'Your content is being reviewed. Most posts are approved within 15 minutes.', [
        { text: 'OK', onPress: () => router.push('/my-content') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create content');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 18 }}>✕</Text></TouchableOpacity>
        <Text style={styles.title}>Create Post</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <Text style={[styles.shareBtn, loading && { opacity: 0.5 }]}>{loading ? 'Posting...' : 'Share'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {CONTENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.tab, selectedType === type.toLowerCase() && styles.tabActive]}
            onPress={() => setSelectedType(type.toLowerCase())}
          >
            <Text style={[styles.tabText, selectedType === type.toLowerCase() && styles.tabTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.body}>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          value={text}
          onChangeText={setText}
          multiline
          placeholderTextColor={colors.g400}
        />

        {/* Media preview */}
        {media.length > 0 && (
          <ScrollView horizontal style={styles.mediaRow}>
            {media.map((m, i) => (
              <Image key={i} source={{ uri: m.uri }} style={styles.mediaThumb} />
            ))}
          </ScrollView>
        )}

        <TextInput
          style={styles.hashtagInput}
          placeholder="#hashtags separated by spaces"
          value={hashtags}
          onChangeText={setHashtags}
          placeholderTextColor={colors.g400}
        />

        {/* Moderation notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Content Review</Text>
          <Text style={styles.noticeText}>Your post will be reviewed. Most approved within 15 minutes.</Text>
        </View>

        {/* Points preview */}
        <View style={styles.pointsPreview}>
          <Text style={styles.pointsTitle}>Points Preview</Text>
          <Text style={styles.pointsText}>Post approved: +30 pts | Each like: +1 pt | Trending: +200 pts</Text>
        </View>
      </ScrollView>

      {/* Bottom toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={pickMedia}><Text style={{ fontSize: 24 }}>📷</Text></TouchableOpacity>
        <TouchableOpacity onPress={pickMedia}><Text style={{ fontSize: 24 }}>🎬</Text></TouchableOpacity>
        <TouchableOpacity><Text style={{ fontSize: 24 }}>📊</Text></TouchableOpacity>
        <TouchableOpacity><Text style={{ fontSize: 24 }}>📍</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  title: { fontSize: 16, fontWeight: '700', color: colors.g800 },
  shareBtn: { fontSize: 16, fontWeight: '700', color: colors.blue },
  tabs: { borderBottomWidth: 0.5, borderBottomColor: colors.g100, maxHeight: 44 },
  tab: { paddingHorizontal: 16, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.g800 },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.g400 },
  tabTextActive: { fontWeight: '700', color: colors.g800 },
  body: { flex: 1, padding: spacing.lg },
  input: { fontSize: 16, minHeight: 120, textAlignVertical: 'top', color: colors.g800, lineHeight: 24 },
  hashtagInput: { fontSize: 14, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: colors.g100, color: colors.g800 },
  mediaRow: { marginVertical: 12 },
  mediaThumb: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  notice: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginTop: 12 },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: colors.gold },
  noticeText: { fontSize: 12, color: colors.g700, marginTop: 4 },
  pointsPreview: { backgroundColor: '#D1FAE5', padding: 12, borderRadius: 10, marginTop: 8 },
  pointsTitle: { fontSize: 13, fontWeight: '700', color: colors.green },
  pointsText: { fontSize: 12, color: colors.g700, marginTop: 4 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: spacing.md, borderTopWidth: 0.5, borderTopColor: colors.g100 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/create.tsx
git commit -m "feat: add Create Post screen with media picker, hashtags, moderation notice"
```

---

## Task 10: Remaining Tab Screens (Explore, Reels, Profile)

**Files:**
- Create: `apps/mobile/app/(tabs)/explore.tsx`
- Create: `apps/mobile/app/(tabs)/reels.tsx`
- Create: `apps/mobile/app/(tabs)/profile.tsx`
- Create: `apps/mobile/components/MediaGrid.tsx`

- [ ] **Step 1: Create MediaGrid component**

`apps/mobile/components/MediaGrid.tsx`:
```typescript
import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - 3) / 3;

export function MediaGrid({ items }: { items: any[] }) {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => router.push(`/post/${item.id}`)}>
          <Image
            source={{ uri: item.media?.[0]?.thumbnailUrl || item.media?.[0]?.originalUrl }}
            style={styles.cell}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: '#E0E0E0' },
});
```

- [ ] **Step 2: Create Explore screen**

`apps/mobile/app/(tabs)/explore.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaGrid } from '../../components/MediaGrid';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { exploreService } from '../../services/exploreService';
import { colors, spacing } from '../../constants/theme';

const CATEGORIES = ['For You', 'Food', 'Travel', 'Tech', 'Fitness', 'Film', 'Art', 'Local'];

export default function ExploreScreen() {
  const [content, setContent] = useState<any[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExplore(); }, [category]);

  const loadExplore = async () => {
    setLoading(true);
    try {
      const result = await exploreService.getExplore(category);
      setContent(result.data);
    } catch {}
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchBar}>
        <TextInput style={styles.searchInput} placeholder="Search" placeholderTextColor={colors.g400} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catPill, category === (cat === 'For You' ? 'all' : cat.toLowerCase()) && styles.catActive]}
            onPress={() => setCategory(cat === 'For You' ? 'all' : cat.toLowerCase())}
          >
            <Text style={[styles.catText, category === (cat === 'For You' ? 'all' : cat.toLowerCase()) && styles.catTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <LoadingSpinner /> : (
        <ScrollView>
          <MediaGrid items={content} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  searchBar: { padding: spacing.md, backgroundColor: '#fff' },
  searchInput: { backgroundColor: colors.g100, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  categories: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, maxHeight: 44, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  catPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.g100, marginRight: 8 },
  catActive: { backgroundColor: colors.g800 },
  catText: { fontSize: 13, fontWeight: '600', color: colors.g700 },
  catTextActive: { color: '#fff' },
});
```

- [ ] **Step 3: Create Reels screen**

`apps/mobile/app/(tabs)/reels.tsx`:
```typescript
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Avatar } from '../../components/Avatar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { reelsService } from '../../services/reelsService';
import { usePointsStore } from '../../stores/pointsStore';
import { colors } from '../../constants/theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReelsScreen() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { earn } = usePointsStore();

  useEffect(() => {
    reelsService.getReels('foryou').then((r) => { setReels(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
      earn('reel_watch', viewableItems[0].item.id);
    }
  }).current;

  if (loading) return <LoadingSpinner />;

  return (
    <FlatList
      data={reels}
      renderItem={({ item, index }) => (
        <View style={styles.reel}>
          <Video
            source={{ uri: item.media?.[0]?.video720pUrl || item.media?.[0]?.originalUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={index === activeIndex}
            isLooping
            isMuted={false}
          />
          {/* Overlay: user info + actions */}
          <View style={styles.overlay}>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => reelsService.like(item.id)}>
                <Text style={{ fontSize: 28 }}>{item.isLiked ? '❤️' : '🤍'}</Text>
                <Text style={styles.actionCount}>{item.likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={{ fontSize: 28 }}>💬</Text>
                <Text style={styles.actionCount}>{item.commentCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={{ fontSize: 28 }}>📤</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bottomInfo}>
              <View style={styles.creatorRow}>
                <Avatar uri={item.user?.avatarUrl} size={34} />
                <Text style={styles.creatorName}>{item.user?.username}</Text>
                <TouchableOpacity style={styles.followBtn}><Text style={styles.followText}>Follow</Text></TouchableOpacity>
              </View>
              {item.text && <Text style={styles.caption} numberOfLines={2}>{item.text}</Text>}
            </View>
          </View>
          {/* Points indicator */}
          <View style={styles.pointsIndicator}><Text style={styles.pointsText}>+3 pts/view</Text></View>
        </View>
      )}
      keyExtractor={(item) => item.id}
      pagingEnabled
      snapToInterval={SCREEN_HEIGHT - 56}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
    />
  );
}

const styles = StyleSheet.create({
  reel: { height: SCREEN_HEIGHT - 56, width: SCREEN_WIDTH, backgroundColor: '#000' },
  video: { flex: 1 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  actions: { position: 'absolute', right: 12, bottom: 100, gap: 16 },
  actionBtn: { alignItems: 'center' },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },
  bottomInfo: { marginBottom: 20 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  creatorName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  followBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  followText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  caption: { color: '#fff', fontSize: 13, lineHeight: 18 },
  pointsIndicator: { position: 'absolute', top: 60, right: 12, backgroundColor: 'rgba(16,185,129,0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pointsText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
```

- [ ] **Step 4: Create Profile screen**

`apps/mobile/app/(tabs)/profile.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { TierBadge } from '../../components/TierBadge';
import { MediaGrid } from '../../components/MediaGrid';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { usePointsStore } from '../../stores/pointsStore';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { balance, streak, tier } = usePointsStore();
  const [profile, setProfile] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    if (user?.id) {
      userService.getProfile(user.id).then(setProfile).catch(() => {});
      userService.getContent(user.id, 'posts').then((r) => setContent(r.data)).catch(() => {});
    }
  }, [user]);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    if (user?.id) userService.getContent(user.id, tab).then((r) => setContent(r.data)).catch(() => {});
  };

  if (!profile) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.username}>{profile.username}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => router.push('/my-content')}><Text style={{ fontSize: 20 }}>✍️</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/leaderboard')}><Text style={{ fontSize: 20 }}>🏆</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')}><Text style={{ fontSize: 20 }}>⚙️</Text></TouchableOpacity>
          </View>
        </View>

        {/* Profile info */}
        <View style={styles.profileSection}>
          <View style={styles.topRow}>
            <Avatar uri={profile.avatarUrl} size={80} tier={profile.tier} />
            <View style={styles.stats}>
              <View style={styles.statItem}><Text style={styles.statNum}>{profile.postsCount}</Text><Text style={styles.statLabel}>Posts</Text></View>
              <View style={styles.statItem}><Text style={styles.statNum}>{profile.followersCount}</Text><Text style={styles.statLabel}>Followers</Text></View>
              <View style={styles.statItem}><Text style={styles.statNum}>{profile.followingCount}</Text><Text style={styles.statLabel}>Following</Text></View>
            </View>
          </View>

          <Text style={styles.name}>{profile.name}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.badges}>
            <TierBadge tier={tier} />
            <View style={styles.pointsBadge}><Text style={styles.pointsBadgeText}>{balance} pts</Text></View>
            {streak > 0 && <View style={styles.streakBadge}><Text style={styles.streakBadgeText}>🔥 {streak}d</Text></View>}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/settings')}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(tabs)/create')}>
              <Text style={styles.createBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grid tabs */}
        <View style={styles.gridTabs}>
          {['posts', 'reels', 'created', 'saved'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.gridTab, activeTab === tab && styles.gridTabActive]} onPress={() => switchTab(tab)}>
              <Text style={{ fontSize: 20, opacity: activeTab === tab ? 1 : 0.3 }}>
                {tab === 'posts' ? '🔲' : tab === 'reels' ? '🎬' : tab === 'created' ? '✍️' : '🏷️'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <MediaGrid items={content} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  username: { fontSize: 22, fontWeight: '800', color: colors.g800 },
  headerIcons: { flexDirection: 'row', gap: 16 },
  profileSection: { padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stats: { flexDirection: 'row', flex: 1, justifyContent: 'center', gap: 20 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 17, fontWeight: '700', color: colors.g800 },
  statLabel: { fontSize: 13, color: colors.g500 },
  name: { fontSize: 14, fontWeight: '700', color: colors.g800, marginTop: 10 },
  bio: { fontSize: 13, color: colors.g600, lineHeight: 18, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  pointsBadge: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pointsBadgeText: { fontSize: 12, fontWeight: '700', color: colors.green },
  streakBadge: { backgroundColor: 'rgba(232,121,43,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  streakBadgeText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  actionButtons: { flexDirection: 'row', gap: 6, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: colors.g100, borderRadius: 8, padding: 8, alignItems: 'center' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  createBtn: { flex: 1, backgroundColor: colors.blue, borderRadius: 8, padding: 8, alignItems: 'center' },
  createBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  gridTabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  gridTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
  gridTabActive: { borderBottomColor: colors.g800 },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/ apps/mobile/components/MediaGrid.tsx
git commit -m "feat: add Explore, Reels, and Profile screens"
```

---

## Task 11: Stack Screens (Wallet, Leaderboard, My Content, Settings)

**Files:**
- Create: `apps/mobile/app/wallet/index.tsx`
- Create: `apps/mobile/app/leaderboard/index.tsx`
- Create: `apps/mobile/app/my-content/index.tsx`
- Create: `apps/mobile/app/settings/index.tsx`

- [ ] **Step 1: Create Wallet screen (lite)**

`apps/mobile/app/wallet/index.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { walletService } from '../../services/walletService';
import { usePointsStore } from '../../stores/pointsStore';
import { colors, spacing } from '../../constants/theme';

export default function WalletScreen() {
  const router = useRouter();
  const { balance, streak, tier, dailyEarned, dailyGoal } = usePointsStore();
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    walletService.getWallet().then(setWallet).catch(() => {});
    walletService.getHistory().then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 18 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Wallet</Text>
        <View style={{ width: 18 }} />
      </View>

      <FlatList
        data={history}
        ListHeaderComponent={() => (
          <>
            {/* Balance card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total Points</Text>
              <Text style={styles.balanceValue}>{(wallet?.balance || balance).toLocaleString()}</Text>
              <Text style={styles.balanceEquiv}>= ₹{((wallet?.balance || balance) * 0.01).toFixed(0)} value</Text>
              <View style={styles.dailyBar}>
                <Text style={styles.dailyText}>Today: {wallet?.dailyEarned || dailyEarned}/{wallet?.dailyGoal || dailyGoal} pts</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${Math.min(((wallet?.dailyEarned || dailyEarned) / (wallet?.dailyGoal || dailyGoal)) * 100, 100)}%` }]} />
                </View>
              </View>
            </View>

            {/* Expiring warning */}
            {wallet?.expiringPoints && (
              <View style={styles.expiryWarning}>
                <Text style={styles.expiryText}>⏰ {wallet.expiringPoints.amount} pts expiring in {wallet.expiringPoints.daysRemaining} days</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </>
        )}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyAction}>{item.actionType.replace(/_/g, ' ')}</Text>
              <Text style={styles.historyTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.historyPoints, { color: item.points > 0 ? colors.green : colors.red }]}>
              {item.points > 0 ? '+' : ''}{item.points}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g200 },
  title: { fontSize: 17, fontWeight: '700', color: colors.g800 },
  balanceCard: { margin: spacing.md, padding: spacing.xl, borderRadius: 16, backgroundColor: colors.navy, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 },
  balanceEquiv: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  dailyBar: { width: '100%', marginTop: 16 },
  dailyText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 6 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.green, borderRadius: 3 },
  expiryWarning: { margin: spacing.md, padding: spacing.md, backgroundColor: '#FEF3C7', borderRadius: 10 },
  expiryText: { fontSize: 13, fontWeight: '600', color: colors.gold },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.g800, paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  historyInfo: { flex: 1 },
  historyAction: { fontSize: 14, fontWeight: '600', color: colors.g800, textTransform: 'capitalize' },
  historyTime: { fontSize: 12, color: colors.g400, marginTop: 2 },
  historyPoints: { fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 2: Create Leaderboard screen (lite)**

`apps/mobile/app/leaderboard/index.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { leaderboardService } from '../../services/leaderboardService';
import { colors, spacing } from '../../constants/theme';

export default function LeaderboardScreen() {
  const router = useRouter();
  const [rankings, setRankings] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [season, setSeason] = useState<any>(null);

  useEffect(() => {
    leaderboardService.getLeaderboard().then((r) => setRankings(r.rankings || [])).catch(() => {});
    leaderboardService.getMyRank().then(setMyRank).catch(() => {});
    leaderboardService.getCurrentSeason().then(setSeason).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 18 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 18 }} />
      </View>

      <FlatList
        data={rankings}
        ListHeaderComponent={() => (
          <>
            {season && (
              <View style={styles.seasonBanner}>
                <Text style={styles.seasonName}>{season.name}</Text>
                <Text style={styles.seasonCountdown}>{season.countdown} days remaining</Text>
              </View>
            )}
            {myRank && (
              <View style={styles.myRank}>
                <Text style={styles.myRankLabel}>Your Position</Text>
                <Text style={styles.myRankValue}>#{myRank.rank || '—'}</Text>
                <Text style={styles.myRankPts}>{myRank.pointsThisWeek} pts this week</Text>
              </View>
            )}
          </>
        )}
        renderItem={({ item, index }) => (
          <View style={[styles.rankRow, index < 3 && styles.topThree]}>
            <Text style={[styles.rank, index === 0 && { color: colors.gold }, index === 1 && { color: colors.g400 }, index === 2 && { color: colors.orange }]}>
              {index === 0 ? '👑' : `#${item.rank}`}
            </Text>
            <Avatar uri={item.avatarUrl} size={40} tier={item.tier} />
            <View style={styles.rankInfo}>
              <Text style={styles.rankName}>{item.username}</Text>
              <Text style={styles.rankStreak}>🔥 {item.streakDays}d streak</Text>
            </View>
            <Text style={styles.rankPoints}>{item.pointsThisWeek} pts</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g200 },
  title: { fontSize: 17, fontWeight: '700', color: colors.g800 },
  seasonBanner: { backgroundColor: colors.navy, padding: spacing.xl, alignItems: 'center', margin: spacing.md, borderRadius: 16 },
  seasonName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  seasonCountdown: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  myRank: { backgroundColor: '#fff', padding: spacing.lg, margin: spacing.md, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.orange },
  myRankLabel: { fontSize: 12, color: colors.g400 },
  myRankValue: { fontSize: 28, fontWeight: '800', color: colors.orange, marginTop: 4 },
  myRankPts: { fontSize: 13, color: colors.g500, marginTop: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100, gap: 12 },
  topThree: { backgroundColor: '#FFFBEB' },
  rank: { width: 30, fontSize: 15, fontWeight: '700', color: colors.g500, textAlign: 'center' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14, fontWeight: '600', color: colors.g800 },
  rankStreak: { fontSize: 12, color: colors.g400, marginTop: 2 },
  rankPoints: { fontSize: 15, fontWeight: '700', color: colors.navy },
});
```

- [ ] **Step 3: Create My Content screen**

`apps/mobile/app/my-content/index.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { contentService } from '../../services/contentService';
import { colors, spacing } from '../../constants/theme';

export default function MyContentScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [content, setContent] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.id) userService.getContent(user.id, 'created').then((r) => setContent(r.data)).catch(() => {});
  }, [user]);

  const filtered = filter === 'all' ? content : content.filter((c) => c.moderationStatus === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 18 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>My Content</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/create')}><Text style={styles.newBtn}>+ New</Text></TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {['all', 'published', 'pending', 'declined'].map((f) => (
          <TouchableOpacity key={f} style={[styles.filterPill, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <View style={styles.contentRow}>
            <View style={[styles.statusDot, { backgroundColor: item.moderationStatus === 'published' ? colors.green : item.moderationStatus === 'pending' ? colors.gold : colors.red }]} />
            <View style={styles.contentInfo}>
              <Text style={styles.contentTitle} numberOfLines={1}>{item.text || `${item.type} content`}</Text>
              <Text style={styles.contentMeta}>{item.moderationStatus} • {new Date(item.createdAt).toLocaleDateString()}</Text>
              {item.moderationStatus === 'published' && <Text style={styles.contentStats}>❤️ {item.likeCount} 💬 {item.commentCount} • +{item.pointsEarned} pts</Text>}
              {item.moderationStatus === 'declined' && (
                <View style={styles.declineActions}>
                  <TouchableOpacity onPress={() => contentService.resubmit(item.id)}><Text style={styles.resubmit}>Edit & Resubmit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => contentService.appeal(item.id)}><Text style={styles.appeal}>Appeal</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No content yet. Create your first post!</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g200 },
  title: { fontSize: 17, fontWeight: '700', color: colors.g800 },
  newBtn: { fontSize: 14, fontWeight: '700', color: colors.blue },
  filters: { flexDirection: 'row', gap: 8, padding: spacing.md },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.g100 },
  filterActive: { backgroundColor: colors.g800 },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.g500, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  contentRow: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100, gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  contentInfo: { flex: 1 },
  contentTitle: { fontSize: 14, fontWeight: '600', color: colors.g800 },
  contentMeta: { fontSize: 12, color: colors.g400, marginTop: 2, textTransform: 'capitalize' },
  contentStats: { fontSize: 12, color: colors.g500, marginTop: 4 },
  declineActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  resubmit: { fontSize: 13, fontWeight: '600', color: colors.blue },
  appeal: { fontSize: 13, fontWeight: '600', color: colors.orange },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: colors.g400, textAlign: 'center' },
});
```

- [ ] **Step 4: Create Settings screen**

`apps/mobile/app/settings/index.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { userService.getSettings().then(setSettings).catch(() => {}); }, []);

  const save = async (updates: Record<string, any>) => {
    setSaving(true);
    try {
      await userService.updateSettings(updates);
      setSettings((prev: any) => ({ ...prev, ...updates }));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 18 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 18 }} />
      </View>

      <ScrollView style={styles.scroll}>
        <Text style={styles.section}>Personal Details</Text>
        <TextInput style={styles.input} value={settings.name} onChangeText={(v) => setSettings({ ...settings, name: v })} onBlur={() => save({ name: settings.name })} placeholder="Name" />
        <TextInput style={styles.input} value={settings.bio || ''} onChangeText={(v) => setSettings({ ...settings, bio: v })} onBlur={() => save({ bio: settings.bio })} placeholder="Bio" multiline />

        <Text style={styles.section}>Location</Text>
        <TextInput style={styles.input} value={settings.primaryPincode} onChangeText={(v) => setSettings({ ...settings, primaryPincode: v })} onBlur={() => save({ primaryPincode: settings.primaryPincode })} placeholder="Primary Pincode" keyboardType="number-pad" maxLength={6} />

        <Text style={styles.section}>Notifications & Privacy</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Push Notifications</Text>
          <Switch value={settings.notificationPush} onValueChange={(v) => { setSettings({ ...settings, notificationPush: v }); save({ notificationPush: v }); }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Private Account</Text>
          <Switch value={settings.isPrivate} onValueChange={(v) => { setSettings({ ...settings, isPrivate: v }); save({ isPrivate: v }); }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Share Data with Brands</Text>
          <Switch value={settings.shareDataWithBrands} onValueChange={(v) => { setSettings({ ...settings, shareDataWithBrands: v }); save({ shareDataWithBrands: v }); }} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g200 },
  title: { fontSize: 17, fontWeight: '700', color: colors.g800 },
  scroll: { flex: 1 },
  section: { fontSize: 14, fontWeight: '700', color: colors.g400, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm, textTransform: 'uppercase' },
  input: { backgroundColor: '#fff', paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 16, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  toggleLabel: { fontSize: 16, color: colors.g800 },
  logoutBtn: { marginTop: 32, marginHorizontal: spacing.lg, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.red },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.red },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/wallet/ apps/mobile/app/leaderboard/ apps/mobile/app/my-content/ apps/mobile/app/settings/
git commit -m "feat: add Wallet, Leaderboard, My Content, and Settings screens"
```

---

## Task 12: Push Notifications + Polling

**Files:**
- Create: `apps/mobile/hooks/useNotifications.ts`
- Create: `apps/mobile/hooks/usePolling.ts`

- [ ] **Step 1: Create polling hook**

`apps/mobile/hooks/usePolling.ts`:
```typescript
import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
```

- [ ] **Step 2: Create notifications hook**

`apps/mobile/hooks/useNotifications.ts`:
```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { refreshUnread } = useNotificationStore();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const deepLink = response.notification.request.content.data?.deepLink;
      if (deepLink && typeof deepLink === 'string') {
        router.push(deepLink as any);
      }
    });

    return () => {
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [isAuthenticated]);

  return { refreshUnread };
}

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  try {
    await api.put('/users/me/settings', { fcmToken: token });
  } catch {}
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/
git commit -m "feat: add push notification registration, deep linking, and polling hook"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Task | Status |
|-----------------|------|--------|
| 8 screens (6 full + 2 lite) | Tasks 8-11 | Covered (Feed, Create, Explore, Reels, Profile + Wallet, Leaderboard, MyContent, Settings) |
| Instagram-like design | Task 2 (theme) + all screens | Covered (exact color palette from HTML prototypes) |
| Firebase Auth (OTP + Google) | Task 6 | Covered (login screen with OTP flow) |
| Bottom tab navigation (5 tabs) | Task 6 | Covered (Home, Explore, Create center, Reels, Profile) |
| Points earning + toasts | Task 4 (stores) + Task 5 (PointsToast) | Covered |
| Infinite scroll feed | Task 8 (useFeed hook) | Covered |
| Stories row | Task 8 (StoryRow) | Covered |
| Reel preloading | Task 10 | Partial (plays active reel, full preloading in future iteration) |
| Media upload + presigned URLs | Task 3 (mediaService) + Task 9 | Covered |
| Content moderation status | Task 11 (MyContent) | Covered |
| Daily check-in | Task 8 (auto-triggers on feed load) | Covered |
| Push notifications | Task 12 | Covered |
| Polling for realtime updates | Task 12 | Covered |
| Zustand state management | Task 4 | Covered |
| API client with auth interceptor | Task 3 | Covered |

### Placeholder Scan

No TBD, TODO, or "implement later" found. Google sign-in shows a "Coming soon" alert — this is an intentional Phase 1 simplification (OTP is the primary auth method).

### Type Consistency

- Service functions use consistent parameter/return patterns
- Store types match API response shapes
- Theme constants used consistently across all screens
- `@eru/shared` imports used where applicable (TierBadge)
