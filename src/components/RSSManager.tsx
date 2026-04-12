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
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { RSSSource } from '../types';
import { Plus, Trash2, Globe, Loader2, Check, X, AlertCircle } from 'lucide-react';

export default function RSSManager({ user }: { user: User }) {
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rss_sources'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RSSSource));
      setSources(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;

    try {
      await addDoc(collection(db, 'rss_sources'), {
        name: newName,
        url: newUrl,
        uid: user.uid,
        active: true
      });
      setNewName('');
      setNewUrl('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding source:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta fuente?')) {
      await deleteDoc(doc(db, 'rss_sources', id));
    }
  };

  const toggleActive = async (source: RSSSource) => {
    await updateDoc(doc(db, 'rss_sources', source.id), {
      active: !source.active
    });
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
          <h1 className="text-2xl font-bold tracking-tight">Fuentes RSS</h1>
          <p className="text-gray-500 text-sm">Gestiona los feeds que alimentan tu Discovery Feed.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          Añadir Fuente
        </button>
      </div>

      {isAdding && (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Nombre del Medio</label>
              <input 
                type="text" 
                placeholder="Ej. TechCrunch"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500/50"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">URL del Feed RSS</label>
              <input 
                type="url" 
                placeholder="https://ejemplo.com/feed"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500/50"
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#222] transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-white text-black px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Guardar Fuente
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {sources.length === 0 ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
            <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300">No hay fuentes personalizadas</h3>
            <p className="text-gray-500">Añade tus feeds favoritos para personalizar tu feed de noticias.</p>
          </div>
        ) : (
          sources.map((source) => (
            <div 
              key={source.id}
              className="bg-[#111] border border-[#222] rounded-2xl p-6 flex items-center justify-between hover:border-[#333] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${source.active ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-500/10 text-gray-500'}`}>
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{source.name}</h3>
                  <p className="text-gray-500 text-sm font-mono">{source.url}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleActive(source)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    source.active 
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                      : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                  }`}
                >
                  {source.active ? 'ACTIVO' : 'INACTIVO'}
                </button>
                <button 
                  onClick={() => handleDelete(source.id)}
                  className="p-2 hover:bg-[#222] rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3 text-blue-400 text-sm">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Nota:</strong> Si no añades fuentes personalizadas, el sistema usará fuentes por defecto (TechCrunch y The Verge). Una vez añadas tu primera fuente, solo se usarán tus fuentes personalizadas activas.
        </p>
      </div>
    </div>
  );
}
