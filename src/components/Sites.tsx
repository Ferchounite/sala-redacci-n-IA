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
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { WPSite } from '../types';
import { Globe, Plus, Trash2, Edit3, Loader2, Shield, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Sites({ user }: { user: User }) {
  const [sites, setSites] = useState<WPSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    url: '',
    username: '',
    applicationPassword: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'sites'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WPSite));
      setSites(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic URL cleanup
      let url = newSite.url.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      if (url.endsWith('/')) url = url.slice(0, -1);

      await addDoc(collection(db, 'sites'), {
        ...newSite,
        url,
        uid: user.uid
      });
      setNewSite({ name: '', url: '', username: '', applicationPassword: '' });
      setIsAdding(false);
    } catch (error) {
      console.error("Add site failed", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este sitio?')) {
      await deleteDoc(doc(db, 'sites', id));
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
          <h1 className="text-2xl font-bold tracking-tight">Sitios WordPress</h1>
          <p className="text-gray-500 text-sm">Gestiona tus blogs de tecnología.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Añadir Sitio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sites.length === 0 ? (
          <div className="col-span-full bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
            <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300">No hay sitios configurados</h3>
            <p className="text-gray-500 mb-6">Añade tu primer sitio de WordPress para empezar a publicar.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="text-orange-500 font-semibold hover:underline"
            >
              Configurar sitio ahora
            </button>
          </div>
        ) : (
          sites.map((site) => (
            <div 
              key={site.id}
              className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl flex items-center justify-center group-hover:bg-orange-500/10 transition-colors">
                  <Globe className="w-6 h-6 text-gray-400 group-hover:text-orange-500" />
                </div>
                <button 
                  onClick={() => handleDelete(site.id)}
                  className="p-2 hover:bg-[#222] rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold mb-1">{site.name}</h3>
              <a 
                href={site.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-white flex items-center gap-1 mb-6 transition-colors"
              >
                {site.url}
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="bg-[#0a0a0a] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 uppercase font-bold tracking-widest">Usuario</span>
                  <span className="font-mono">{site.username}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 uppercase font-bold tracking-widest">Password</span>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-green-500" />
                    <span className="font-mono">••••••••••••</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl"
            >
              <div className="p-6 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-xl font-bold">Añadir Sitio WordPress</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-[#222] rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddSite} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Nombre del Blog</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej. Mi Blog Tech"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">URL del Sitio</label>
                  <input 
                    required
                    type="text" 
                    placeholder="https://miblog.com"
                    value={newSite.url}
                    onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Usuario WP</label>
                  <input 
                    required
                    type="text" 
                    placeholder="admin"
                    value={newSite.username}
                    onChange={(e) => setNewSite({ ...newSite, username: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Application Password</label>
                  <input 
                    required
                    type="password" 
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={newSite.applicationPassword}
                    onChange={(e) => setNewSite({ ...newSite, applicationPassword: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500/50"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Genera esto en tu perfil de WordPress (Usuarios {'>'} Tu Perfil {'>'} Contraseñas de aplicación).
                  </p>
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Guardar Sitio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
