/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
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
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Newspaper, 
  FileText, 
  Globe, 
  Settings as SettingsIcon, 
  LogOut, 
  Plus, 
  Search,
  Zap,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Edit3,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Article, Draft, WPSite, View } from './types';
import Discovery from './components/Discovery';
import Drafts from './components/Drafts';
import Sites from './components/Sites';
import RSSManager from './components/RSSManager';
import { Rss } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('discovery');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Test connection to Firestore
  useEffect(() => {
    if (isAuthReady && user) {
      const testConnection = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        }
      };
      testConnection();
    }
  }, [isAuthReady, user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#1c1c1c] border border-[#2a2a2a] p-8 rounded-2xl shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-[#2a2a2a] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-tight">Sala de Redacción AI</h1>
          <p className="text-gray-400 mb-8">Automatiza tu flujo de contenido tech con inteligencia artificial.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-white text-black font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Continuar con Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-right border-[#1a1a1a] bg-[#0f0f0f] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <Zap className="w-6 h-6 text-orange-500" />
          <span className="font-bold text-lg tracking-tight">Redacción AI</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <NavItem 
            icon={<Newspaper className="w-5 h-5" />} 
            label="Descubrimiento" 
            active={currentView === 'discovery'} 
            onClick={() => setCurrentView('discovery')} 
          />
          <NavItem 
            icon={<FileText className="w-5 h-5" />} 
            label="Borradores" 
            active={currentView === 'drafts'} 
            onClick={() => setCurrentView('drafts')} 
          />
          <NavItem 
            icon={<Globe className="w-5 h-5" />} 
            label="Sitios WP" 
            active={currentView === 'sites'} 
            onClick={() => setCurrentView('sites')} 
          />
          <NavItem 
            icon={<Rss className="w-5 h-5" />} 
            label="Fuentes RSS" 
            active={currentView === 'rss'} 
            onClick={() => setCurrentView('rss')} 
          />
        </nav>

        <div className="p-4 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" alt="User" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-8 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
          <h2 className="text-lg font-medium capitalize">{currentView === 'discovery' ? 'Descubrimiento de Tendencias' : currentView}</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar noticias..." 
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-orange-500/50 transition-colors w-64"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {currentView === 'discovery' && <Discovery user={user} />}
              {currentView === 'drafts' && <Drafts user={user} />}
              {currentView === 'sites' && <Sites user={user} />}
              {currentView === 'rss' && <RSSManager user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-white text-black shadow-lg" 
          : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
