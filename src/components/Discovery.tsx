import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Article, Draft, RSSSource } from '../types';
import { Zap, ExternalLink, FileText, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { generateDraft } from '../services/gemini';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function Discovery({ user }: { user: User }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [rssSources, setRssSources] = useState<RSSSource[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'rss_sources'), 
      where('uid', '==', user.uid), 
      where('active', '==', true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RSSSource));
      setRssSources(docs);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      // Sort in memory to avoid needing a composite index in Firestore
      const sorted = docs.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      setArticles(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const activeUrls = rssSources.map(s => s.url).filter(Boolean).join(',');
      const url = activeUrls ? `/api/news?feeds=${encodeURIComponent(activeUrls)}` : '/api/news';
      
      console.log("Fetching news from:", url);
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch news: ${errorText}`);
      }
      
      const news = await response.json();
      console.log(`Received ${news.length} articles from API`);
      
      // Get all existing URLs to avoid duplicate checks inside the loop against stale state
      const existingUrls = new Set(articles.map(a => a.url));
      let addedCount = 0;

      for (const item of news) {
        if (!existingUrls.has(item.url)) {
          // Calculate a relevance score
          let score = 75;
          const pubDate = new Date(item.publishedAt);
          const hoursAgo = (new Date().getTime() - pubDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursAgo < 6) score += 15;
          else if (hoursAgo < 12) score += 10;
          
          const trendingKeywords = ['ai', 'inteligencia artificial', 'apple', 'google', 'nvidia', 'openai', 'gpt'];
          const titleLower = item.title.toLowerCase();
          if (trendingKeywords.some(kw => titleLower.includes(kw))) score += 10;

          await addDoc(collection(db, 'articles'), {
            ...item,
            relevanceScore: Math.min(score, 99),
            status: 'new',
            uid: user.uid,
            fetchedAt: new Date().toISOString()
          });
          
          existingUrls.add(item.url); // Mark as added for this batch
          addedCount++;
        }
      }
      
      if (addedCount === 0) {
        alert("No se encontraron noticias nuevas en este momento.");
      } else {
        console.log(`Added ${addedCount} new articles`);
      }
    } catch (error) {
      console.error("Refresh failed", error);
      alert("Error al conectar con las fuentes de noticias. Asegúrate de que las URLs RSS sean válidas.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDraftWithAI = async (article: Article) => {
    if (draftingId) return;
    setDraftingId(article.id);
    try {
      console.log("Generating draft for:", article.title);
      const draftData = await generateDraft(article.title, article.summary, article.url);
      
      console.log("Saving draft to Firestore...");
      await addDoc(collection(db, 'drafts'), {
        articleId: article.id,
        title: draftData.title,
        seo_title: draftData.seo_title || draftData.title,
        content: draftData.content,
        meta_description: draftData.meta_description || "",
        primary_keyword: draftData.primary_keyword || "",
        image_prompt: draftData.image_prompt || "",
        featured_image: "", // We will generate this on publish or show a placeholder
        status: 'draft',
        uid: user.uid,
        createdAt: new Date().toISOString()
      });

      console.log("Updating article status...");
      await updateDoc(doc(db, 'articles', article.id), {
        status: 'drafted'
      });
      
      alert("¡Borrador generado con éxito! Puedes verlo en la pestaña de Borradores.");
    } catch (error) {
      console.error("Drafting failed:", error);
      alert("Hubo un error al generar el borrador. Por favor, intenta de nuevo.");
    } finally {
      setDraftingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discovery Feed</h1>
          <p className="text-gray-500 text-sm">Noticias en tendencia detectadas por IA.</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          {refreshing ? 'Buscando...' : 'Refrescar Feed'}
        </button>
      </div>

      <div className="grid gap-4">
        {articles.length === 0 ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
            <Newspaper className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300">No hay noticias aún</h3>
            <p className="text-gray-500 mb-6">Haz clic en refrescar para buscar tendencias.</p>
            <button 
              onClick={handleRefresh}
              className="text-orange-500 font-semibold hover:underline"
            >
              Buscar noticias ahora
            </button>
          </div>
        ) : (
          articles.map((article) => (
            <div 
              key={article.id}
              className="bg-[#111] border border-[#222] rounded-2xl p-6 flex items-start gap-6 hover:border-[#333] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
                    {article.source}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(article.publishedAt), 'MMM d, HH:mm')}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-green-500 font-medium">
                    <Zap className="w-3 h-3 fill-current" />
                    {article.relevanceScore}% Relevancia
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-orange-500 transition-colors">
                  {article.title}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                  {article.summary}
                </p>
                <div className="flex items-center gap-4">
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver fuente original
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {article.status === 'drafted' ? (
                  <div className="flex items-center gap-2 text-green-500 text-sm font-medium bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Borrador Creado
                  </div>
                ) : (
                  <button 
                    onClick={() => handleDraftWithAI(article)}
                    disabled={draftingId === article.id}
                    className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  >
                    {draftingId === article.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {draftingId === article.id ? 'Redactando...' : 'Draft with AI'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Newspaper(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}
