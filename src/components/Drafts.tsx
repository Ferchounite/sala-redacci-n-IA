import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Draft, WPSite } from '../types';
import { 
  FileText, 
  Trash2, 
  Edit3, 
  Send, 
  Loader2, 
  CheckCircle2, 
  ExternalLink, 
  X,
  Globe,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Drafts({ user }: { user: User }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [sites, setSites] = useState<WPSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  useEffect(() => {
    const q = query(
      collection(db, 'drafts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Draft));
      setDrafts(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, 'sites'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WPSite));
      setSites(docs);
      if (docs.length > 0 && !selectedSiteId) {
        setSelectedSiteId(docs[0].id);
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este borrador?')) {
      await deleteDoc(doc(db, 'drafts', id));
    }
  };

  const handleUpdateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;
    
    await updateDoc(doc(db, 'drafts', editingDraft.id), {
      title: editingDraft.title,
      content: editingDraft.content
    });
    setEditingDraft(null);
  };

  const handlePublish = async (draft: Draft) => {
    if (!selectedSiteId) {
      alert('Por favor selecciona un sitio de WordPress.');
      return;
    }

    const site = sites.find(s => s.id === selectedSiteId);
    if (!site) return;

    setPublishingId(draft.id);
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site, draft })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al publicar en WordPress');
      }

      const data = await response.json();
      
      await updateDoc(doc(db, 'drafts', draft.id), {
        status: 'published',
        publishedUrl: data.link,
        siteId: site.id
      });

      alert('¡Publicado con éxito con imagen destacada!');
    } catch (error: any) {
      console.error("Publishing failed", error);
      alert(`Error al publicar: ${error.message}`);
    } finally {
      setPublishingId(null);
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
          <h1 className="text-2xl font-bold tracking-tight">Borradores Generados</h1>
          <p className="text-gray-500 text-sm">Revisa, edita y publica tus artículos.</p>
        </div>
        {sites.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Publicar en:</span>
            <select 
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
            >
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {drafts.length === 0 ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300">No hay borradores</h3>
            <p className="text-gray-500">Genera borradores desde el feed de descubrimiento.</p>
          </div>
        ) : (
          drafts.map((draft) => (
            <div 
              key={draft.id}
              className="bg-[#111] border border-[#222] rounded-2xl p-6 flex items-start gap-6 hover:border-[#333] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                    draft.status === 'published' ? "text-green-500 bg-green-500/10" : "text-blue-500 bg-blue-500/10"
                  )}>
                    {draft.status === 'published' ? 'Publicado' : 'Borrador'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(draft.createdAt), 'MMM d, HH:mm')}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{draft.title}</h3>
                <div className="text-gray-400 text-sm line-clamp-2 mb-4" dangerouslySetInnerHTML={{ __html: draft.content.substring(0, 200) + '...' }} />
                
                {draft.status === 'published' && (
                  <a 
                    href={draft.publishedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-green-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver en el blog
                  </a>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setEditingDraft(draft)}
                  className="p-2 hover:bg-[#222] rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(draft.id)}
                  className="p-2 hover:bg-[#222] rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                {draft.status !== 'published' && (
                  <button 
                    onClick={() => handlePublish(draft)}
                    disabled={publishingId === draft.id || sites.length === 0}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-lg shadow-orange-500/20"
                    title="Publicar en WordPress"
                  >
                    {publishingId === draft.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingDraft && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-[#222] flex items-center justify-between">
              <h2 className="text-xl font-bold">Editar Borrador</h2>
              <button onClick={() => setEditingDraft(null)} className="p-2 hover:bg-[#222] rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateDraft} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Título</label>
                <input 
                  type="text" 
                  value={editingDraft.title}
                  onChange={(e) => setEditingDraft({ ...editingDraft, title: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Contenido (HTML)</label>
                <textarea 
                  value={editingDraft.content}
                  onChange={(e) => setEditingDraft({ ...editingDraft, content: e.target.value })}
                  className="w-full h-96 bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 font-mono text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#222] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-white text-black px-8 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {sites.length === 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3 text-orange-500 text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>No has configurado ningún sitio de WordPress. Ve a la pestaña "Sitios WP" para comenzar.</span>
        </div>
      )}
    </div>
  );
}
