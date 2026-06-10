import { apiFetch } from "./api"; // Bound directly to your standard authenticated base fetch wrapper

export interface KBArticle {
  id?: number;
  title: string;
  content: string;
  category: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const kbApi = {
  // ✅ ALIGNED PATH: Changed from "/api/knowledge-base" to "/articles"
  async getAllArticles(): Promise<KBArticle[]> {
    return apiFetch<KBArticle[]>("/articles", { method: "GET" });
  },

  // ✅ ALIGNED PATH: Points cleanly to your @GetMapping("/search") controller path
  async searchArticles(query: string): Promise<KBArticle[]> {
    return apiFetch<KBArticle[]>(`/articles/search?q=${encodeURIComponent(query)}`, { method: "GET" });
  },

  // ✅ ALIGNED DATA TYPE: Your Spring backend returns a raw Long (ID). 
  // We handle that ID and pass a formatted KBArticle back to the page UI view state.
  async createArticle(article: KBArticle): Promise<KBArticle> {
    const articleId = await apiFetch<number>("/articles", {
      method: "POST",
      body: JSON.stringify(article),
    });
    
    return {
      ...article,
      id: articleId,
      createdBy: "You" // Optimistic fallback until list auto-refreshes from database context
    };
  }
};