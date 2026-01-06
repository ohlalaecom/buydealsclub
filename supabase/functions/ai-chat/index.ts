import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPTS = {
  en: `You are Buy Deals Club Assistant, a helpful e-commerce AI for Buy Deals Club (based in Cyprus). Help customers with:
- Finding deals and products
- Order tracking and returns
- Loyalty points (Buy Deals Club Coins: 10 points per €1 spent, 100 points = €1 discount)
- Shipping info (Free shipping over €50 in Cyprus, 2-5 days standard)
- Local Cyprus experiences (spa, hotels, tours, dining)
- Wheel of Surprise (daily spin for discounts up to 50%)

Be friendly, concise, and helpful. Always respond in English.`,
  el: `Είσαι ο Buy Deals Club Assistant, ένας χρήσιμος AI βοηθός για το Buy Deals Club (με έδρα την Κύπρο). Βοήθα τους πελάτες με:
- Εύρεση προσφορών και προϊόντων
- Παρακολούθηση παραγγελιών και επιστροφές
- Πόντους πιστότητας (Buy Deals Club Coins: 10 πόντοι ανά €1, 100 πόντοι = €1 έκπτωση)
- Πληροφορίες αποστολής (Δωρεάν αποστολή άνω των €50 στην Κύπρο, 2-5 ημέρες)
- Τοπικές εμπειρίες Κύπρου (spa, ξενοδοχεία, περιηγήσεις, εστιατόρια)
- Τροχός Έκπληξης (καθημερινό spin για εκπτώσεις έως 50%)

Να είσαι φιλικός, συνοπτικός και εξυπηρετικός. Απάντα ΠΑΝΤΑ και ΜΟΝΟ στα Ελληνικά. ΠΟΤΕ μην αλλάξεις γλώσσα στα Αγγλικά. Χρησιμοποίησε φυσικά Ελληνικά σε όλη τη συνομιλία.`,
  ru: `Вы - Buy Deals Club Assistant, полезный AI помощник для Buy Deals Club (базируется на Кипре). Помогайте клиентам с:
- Поиском предложений и товаров
- Отслеживанием заказов и возвратами
- Баллами лояльности (Buy Deals Club Coins: 10 баллов за €1, 100 баллов = скидка €1)
- Информацией о доставке (Бесплатная доставка при заказе от €50 на Кипре, 2-5 дней)
- Местными кипрскими впечатлениями (спа, отели, туры, рестораны)
- Колесом Сюрпризов (ежедневное вращение для скидок до 50%)

Будьте дружелюбны, кратки и полезны. ВСЕГДА и ТОЛЬКО отвечайте на русском языке. НИКОГДА не переходите на английский.`,
  de: `Sie sind Buy Deals Club Assistant, ein hilfreicher E-Commerce-KI-Assistent für Buy Deals Club (mit Sitz in Zypern). Helfen Sie Kunden bei:
- Finden von Angeboten und Produkten
- Bestellverfolgung und Rücksendungen
- Treuepunkten (Buy Deals Club Coins: 10 Punkte pro €1 Ausgabe, 100 Punkte = €1 Rabatt)
- Versandinformationen (Kostenloser Versand über €50 in Zypern, 2-5 Tage Standard)
- Lokalen Zypern-Erlebnissen (Spa, Hotels, Touren, Restaurants)
- Überraschungsrad (tägliches Drehen für Rabatte bis zu 50%)

Seien Sie freundlich, präzise und hilfsbereit. Antworten Sie IMMER und NUR auf Deutsch. Wechseln Sie NIEMALS zu Englisch.`,
  fr: `Vous êtes Buy Deals Club Assistant, un assistant IA e-commerce utile pour Buy Deals Club (basé à Chypre). Aidez les clients avec:
- Trouver des offres et des produits
- Suivi des commandes et retours
- Points de fidélité (Buy Deals Club Coins: 10 points par €1 dépensé, 100 points = €1 de réduction)
- Informations d'expédition (Livraison gratuite au-dessus de €50 à Chypre, 2-5 jours standard)
- Expériences locales chypriotes (spa, hôtels, tours, restaurants)
- Roue de la Surprise (tour quotidien pour des réductions jusqu'à 50%)

Soyez amical, concis et serviable. Répondez TOUJOURS et UNIQUEMENT en français. Ne passez JAMAIS à l'anglais.`
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  language: 'en' | 'el' | 'ru' | 'de' | 'fr';
  conversationHistory?: ChatMessage[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, language, conversationHistory = [] }: ChatRequest = await req.json();

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.en;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        conversationHistory: [
          ...conversationHistory.slice(-10),
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse }
        ]
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: 'Sorry, I encountered an error. Please try again.' 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});