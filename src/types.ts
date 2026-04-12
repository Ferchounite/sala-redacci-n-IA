export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  relevanceScore: number;
  status: 'new' | 'drafted' | 'published';
  uid: string;
}

export interface Draft {
  id: string;
  articleId?: string;
  title: string;
  content: string;
  meta_description?: string;
  primary_keyword?: string;
  image_prompt?: string;
  featured_image?: string;
  status: 'draft' | 'ready' | 'published';
  siteId?: string;
  publishedUrl?: string;
  uid: string;
  createdAt: string;
}

export interface WPSite {
  id: string;
  name: string;
  url: string;
  username: string;
  applicationPassword: string;
  uid: string;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  uid: string;
  active: boolean;
}

export type View = 'discovery' | 'drafts' | 'sites' | 'rss' | 'settings';
