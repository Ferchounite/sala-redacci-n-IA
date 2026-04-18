import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Sparkles, Loader2, Info, Layout, Target, Link as LinkIcon, FileText, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateContentHubArticle, ContentHubParams } from '../services/gemini';
import { cn } from '../lib/utils';

function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-orange-500 transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#1a1a1a] border border-[#333] text-[11px] text-gray-300 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-2xl pointer-events-none leading-relaxed">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#333]" />
      </div>
    </div>
  );
}

export default function ContentHub({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ContentHubParams>({
    context: '',
    suggestedTitle: '',
    primaryKeyword: '',
    secondaryKeywords: '',
    intent: 'Informacional',
    type: 'Pillar Page',
    format: 'Artículo largo',
    destinationUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.context || !formData.primaryKeyword) {
      alert("Por favor rellena al menos el contexto y la keyword principal.");
      return;
    }

    setLoading(true);
    try {
      const draftData = await generateContentHubArticle(formData);
      
      await addDoc(collection(db, 'drafts'), {
        ...draftData,
        status: 'draft',
        uid: user.uid,
        createdAt: new Date().toISOString(),
        manual: true // Flag to identify manually generated content
      });

      alert("¡Artículo generado con éxito! Puedes encontrarlo en la pestaña de Borradores.");
      setFormData({
        context: '',
        suggestedTitle: '',
        primaryKeyword: '',
        secondaryKeywords: '',
        intent: 'Informacional',
        type: 'Pillar Page',
        format: 'Artículo largo',
        destinationUrl: ''
      });
    } catch (error) {
      console.error("Content generation failed:", error);
      alert("Hubo un error al generar el contenido. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Hub</h1>
          <p className="text-gray-500 text-sm">Generador quirúrgico de contenido SEO estratégico.</p>
        </div>
        <div className="bg-orange-500/10 text-orange-500 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-orange-500/20">
          Senior SEO Mode
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#111] border border-[#222] rounded-3xl p-8 shadow-2xl space-y-8">
        {/* Row 1: Context */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Contexto de la web
            <Tooltip text="Define quién eres. Ej: 'Somos una e-commerce de suplementos deportivos premium'. Esto ayuda a la IA a ajustar el nivel de tecnicismo." />
          </label>
          <textarea 
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            placeholder="Ej: Somos una agencia de marketing digital..."
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 transition-all font-sans min-h-[100px] resize-none text-sm"
            required
          />
        </div>

        {/* Row 1.5: Suggested Title */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Título Sugerido / Tema del Artículo
            <Tooltip text="¿De qué quieres hablar? La IA mejorará este título para que sea magnético y optimizado para SEO, pero mantendrá tu idea central." />
          </label>
          <input 
            type="text" 
            value={formData.suggestedTitle}
            onChange={(e) => setFormData({ ...formData, suggestedTitle: e.target.value })}
            placeholder="Ej: La guía definitiva de SEO en 2026"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
          />
        </div>

        {/* Row 2: Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              Keyword Principal
              <Tooltip text="El término exacto por el que quieres posicionar. Se usará en el H1, Meta y las primeras líneas del texto." />
            </label>
            <input 
              type="text" 
              value={formData.primaryKeyword}
              onChange={(e) => setFormData({ ...formData, primaryKeyword: e.target.value })}
              placeholder="Ej: vender casa rapido"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gray-700" />
              Keywords Secundarias (LSI) <span className="text-[10px] lowercase opacity-50 font-normal">(Opcional)</span>
              <Tooltip text="Úsalas para enriquecer el SEO o como mapa de enlazado interno. La IA citará estos temas para que puedas enlazar otros artículos de tu Hub." />
            </label>
            <input 
              type="text" 
              value={formData.secondaryKeywords}
              onChange={(e) => setFormData({ ...formData, secondaryKeywords: e.target.value })}
              placeholder="Separadas por comas..."
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Row 3: Intent & Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              Intención de Búsqueda
              <Tooltip text="Define el 'tono' de la respuesta de Google: informativa (aprender), comercial (comparar) o transaccional (comprar)." />
            </label>
            <select 
              value={formData.intent}
              onChange={(e) => setFormData({ ...formData, intent: e.target.value as any })}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer text-sm"
            >
              <option value="Informacional">Informacional</option>
              <option value="Comercial">Comercial</option>
              <option value="Transaccional">Transaccional</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              Tipo de Artículo
              <Tooltip text="Pillar Page para temas amplios (guías maestras). Supporting Article para resolver dudas específicas y enlazar al Pilar." />
            </label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer text-sm"
            >
              <option value="Pillar Page">Pillar Page</option>
              <option value="Supporting Article">Supporting Article</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              Formato
              <Tooltip text="Cambia drásticamente la estructura: desde listas de pasos hasta tablas de pros/contras o landing pages directas." />
            </label>
            <select 
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer text-sm"
            >
              <option value="Artículo largo">Artículo largo</option>
              <option value="Guía + secuencias">Guía + secuencias</option>
              <option value="Tutorial visual">Tutorial visual</option>
              <option value="Comparativa">Comparativa</option>
              <option value="Landing categoría">Landing categoría</option>
              <option value="Landing comercial">Landing comercial</option>
              <option value="Rutina paso a paso">Rutina paso a paso</option>
            </select>
          </div>
        </div>

        {/* Row 4: Conditional Link */}
        <AnimatePresence>
          {formData.type === 'Supporting Article' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3"
            >
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-500" />
                URL de Destino (Página Pilar)
                <Tooltip text="Indispensable para artículos de soporte. La IA creará un enlace contextual hacia esta URL para traspasar autoridad al Pilar." />
              </label>
              <input 
                type="url" 
                value={formData.destinationUrl}
                onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                placeholder="https://tusitio.com/pilar-url"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
                required={formData.type === 'Supporting Article'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 py-5 rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-2xl shadow-white/5"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Generando Estrategia...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span>Generar Artículo Quirúrgico</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#222] p-6 rounded-2xl space-y-2">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 mb-2">
            <Layout className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm">Gutenberg Optimized</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Listo para copiar y pegar directamente en los bloques de WordPress sin fallos de formato.</p>
        </div>
        <div className="bg-[#111] border border-[#222] p-6 rounded-2xl space-y-2">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-2">
            <Target className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm">Semantic Density</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Inclusión inteligente de LSI y entidades para potenciar la autoridad temática del dominio.</p>
        </div>
        <div className="bg-[#111] border border-[#222] p-6 rounded-2xl space-y-2">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 mb-2">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm">Internal Linking</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Generación de párrafos de transición naturales con anchor text exacto para tu estructura de silos.</p>
        </div>
      </div>
    </div>
  );
}
