// Business search — the shape returned by GET /businesses/search?q=
// Used by the create-screen BusinessTagPicker autocomplete.

export interface BusinessSearchItem {
  id: string;
  name: string;
  category: string;
  pincode: string;
  avatarUrl: string | null;
}

export interface BusinessSearchResponse {
  items: BusinessSearchItem[];
}
