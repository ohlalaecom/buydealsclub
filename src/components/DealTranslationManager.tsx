import { useState, useEffect } from 'react';
import { Globe, Save, Edit, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DealTranslationManagerProps {
  dealId: string;
  dealTitle: string;
}

const LANGUAGES = {
  el: { name: 'Ελληνικά', flag: '🇬🇷' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
};

interface Translation {
  language: string;
  title: string;
  description: string;
}

export function DealTranslationManager({ dealId, dealTitle }: DealTranslationManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  useEffect(() => {
    if (isOpen) {
      loadTranslations();
    }
  }, [isOpen, dealId]);

  const loadTranslations = async () => {
    const { data } = await supabase
      .from('deal_translations')
      .select('*')
      .eq('deal_id', dealId);

    if (data) {
      setTranslations(data);
    }
  };

  const handleEdit = (lang: string) => {
    const existing = translations.find((t) => t.language === lang);
    if (existing) {
      setFormData({ title: existing.title, description: existing.description });
    } else {
      setFormData({ title: '', description: '' });
    }
    setEditingLang(lang);
  };

  const handleSave = async () => {
    if (!editingLang || !formData.title.trim() || !formData.description.trim()) return;

    const existing = translations.find((t) => t.language === editingLang);

    if (existing) {
      await supabase
        .from('deal_translations')
        .update({
          title: formData.title,
          description: formData.description,
        })
        .eq('deal_id', dealId)
        .eq('language', editingLang);
    } else {
      await supabase.from('deal_translations').insert({
        deal_id: dealId,
        language: editingLang,
        title: formData.title,
        description: formData.description,
      });
    }

    setEditingLang(null);
    setFormData({ title: '', description: '' });
    loadTranslations();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
      >
        <Globe className="w-4 h-4" />
        Translations
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Manage Translations</h3>
            <p className="text-sm text-gray-600 mt-1">{dealTitle}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {editingLang ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{LANGUAGES[editingLang as keyof typeof LANGUAGES].flag}</span>
                  <h4 className="text-lg font-semibold">
                    {LANGUAGES[editingLang as keyof typeof LANGUAGES].name}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setEditingLang(null);
                    setFormData({ title: '', description: '' });
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Translated title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Translated description"
                />
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Translation
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {Object.entries(LANGUAGES).map(([code, { name, flag }]) => {
                const translation = translations.find((t) => t.language === code);
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{flag}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{name}</p>
                        {translation ? (
                          <p className="text-sm text-green-600">Translation available</p>
                        ) : (
                          <p className="text-sm text-gray-500">No translation</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(code)}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      {translation ? 'Edit' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
