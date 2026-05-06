# Synthetix AI — Teknik Mülakat Simülatörü

> GitHub reponuzdaki gerçek kodunuza dayalı **projeye özel** mülakat soruları üreten ve cevaplarınızı sesli ya da yazılı olarak gerçek zamanlı değerlendiren, yapay zeka destekli çok modlu bir teknik mülakat simülatörü.

---

## ✨ Özellikler

- **Repoya Özel Sorular** — Şablonlar değil, kendi yazdığınız koddan sorular üretir.
- **7 Zorluk Seviyesi** — Genel sorulardan repoya özel zorlu sorulara kadar accordion arayüzde listelenir.
- **Sesli & Yazılı Cevap** — Tarayıcıdan ses kaydı alın ya da kod/metin olarak yazın.
- **Çok Modlu AI Değerlendirme** — Gemini 2.5 Flash sesi doğrudan analiz eder, ayrı STT adımı yoktur.
- **Yapılandırılmış Geri Bildirim** — Puan (0–10), detaylı yorum, eksik noktalar ve öğrenme haritası.
- **Kalıcı Depolama** — Tüm oturumlar ve değerlendirmeler SQLite veritabanına kaydedilir.
- **Soru Sesli Okuma** — Sorular Microsoft Edge Neural TTS ile seslendirilir.
- **Premium Koyu Arayüz** — Glassmorphism tasarım, animasyonlu AI orb, neon palet — CSS framework kullanılmaz.

---

## 🛠️ Teknoloji Yığını

### Backend

| Teknoloji | Rol |
|---|---|
| **Python 3.11+** | Temel dil |
| **FastAPI** | REST API framework (asenkron) |
| **Uvicorn** | ASGI sunucu |
| **SQLAlchemy** | ORM — veritabanı yönetimi |
| **SQLite** | Kalıcı yerel veritabanı |
| **Google Gemini 2.5 Flash** | Soru üretimi + çok modlu değerlendirme |
| **edge-tts** | Microsoft Neural TTS ile soru seslendirme |
| **pydub + ffmpeg** | Ses formatı dönüştürme (WebM/OGG → WAV) |
| **python-dotenv** | Ortam değişkeni yönetimi |

### Frontend

| Teknoloji | Rol |
|---|---|
| **Vite** | Derleme aracı ve geliştirme sunucusu |
| **Vanilla JavaScript (ES2022+)** | Tüm uygulama mantığı |
| **Vanilla CSS3** | Tamamen özel stil — framework yok |
| **Marked.js** | AI geri bildirimini Markdown'dan HTML'e render eder |
| **MediaRecorder API** | Tarayıcı tabanlı ses kaydı |
| **Google Fonts (Outfit)** | Tipografi |

---

## 📁 Proje Yapısı

```
ai_technical_simulator_public/
│
├── backend/
│   ├── main.py                    # FastAPI uygulaması ve tüm API uç noktaları
│   ├── requirements.txt           # Python bağımlılıkları
│   ├── .env                       # API anahtarları (repoya eklenmez)
│   ├── interview_app.db           # SQLite veritabanı (otomatik oluşur)
│   └── app/
│       ├── database.py            # SQLAlchemy motor ve oturum yapılandırması
│       ├── models.py              # Veritabanı tablo modelleri
│       └── services/
│           ├── ai_service.py      # Gemini API çağrıları ve prompt mühendisliği
│           └── github_service.py  # Repo klonlama ve kod dosyalarını okuma
│
└── frontend_web/
    ├── index.html                 # Uygulama kabuğu ve SVG ikonlar
    ├── main.js                    # Tüm UI mantığı ve API çağrıları
    ├── style.css                  # Özel tasarım sistemi
    └── package.json               # Vite bağımlılığı
```

---

## ⚙️ Kurulum

### Gereksinimler
- Python 3.11+
- Node.js 18+
- Git (terminalde erişilebilir olmalı)
- Geçerli bir **Google Gemini API Anahtarı**

### 1. Repoyu Klonla
```bash
git clone https://github.com/your-username/ai_technical_simulator_public.git
cd ai_technical_simulator_public
```

### 2. Backend Kurulumu
```bash
cd backend

# Sanal ortam oluştur
python -m venv venv

# Etkinleştir (Windows)
venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt
```

`backend/` klasörü içine `.env` dosyası oluştur:
```env
GOOGLE_API_KEY=gemini_api_anahtarin_buraya
```

### 3. Frontend Kurulumu
```bash
cd ../frontend_web
npm install
```

---

## 🚀 Projeyi Çalıştırma

> İki ayrı terminal açılmalıdır.

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend_web
npm run dev
```

🌐 **Uygulama:** `http://localhost:5173`  
📖 **API Dökümanı:** `http://127.0.0.1:8000/docs`

---

## 🔄 Nasıl Çalışır?

```
1. Kullanıcı GitHub repo linkini girer
2. Backend repo'yu klonlar ve kodları okur
3. Gemini 21 kategorili soru üretir (7 zorluk seviyesi)
4. Kullanıcı sesli veya yazılı cevap verir
5. Gemini cevabı çok modlu olarak değerlendirir
6. Puan + Geri bildirim + Eksik noktalar + Yol haritası gösterilir
7. Tüm sonuçlar SQLite veritabanına kaydedilir
```

---

## 🗄️ Veritabanı

`interview_app.db` dosyası ilk çalıştırmada `backend/` klasöründe otomatik oluşturulur.

| Tablo | İçerik |
|---|---|
| `interview_sessions` | Repo URL, kod bağlamı, zaman damgası |
| `feedbacks` | Verilen cevap, puan, geri bildirim, eksik noktalar, yol haritası |
| `users` | Gelecekteki kullanıcı sistemi için hazır (şu an kullanılmıyor) |

> Veritabanını görsel incelemek için: [DB Browser for SQLite](https://sqlitebrowser.org/)

---

## 🧠 AI ve Prompt Mühendisliği

**Soru Üretimi:** Gemini'a tam 21 soru üretmesi söylenir. Repoya özel sorular, kodda gerçekten bulunan fonksiyon isimleri ve mimari kararlara dayandırılır.

**Değerlendirme Puanlama Felsefesi:**
- Ana fikir yakalanmış ama eksik ifade → **7.5–8.5**
- Sağlam cevap, küçük eksikler → **8.5–9.5**
- Yalnızca tamamen yanlışsa 5.5 altı puan verilir
- *"Şüphede kalınca daha yüksek puan ver"*

---

## 🎨 Arayüz Özellikleri

| Özellik | Uygulama |
|---|---|
| Glassmorphism paneller | `backdrop-filter: blur()` + şeffaf koyu arkaplan |
| Animasyonlu AI orbu | Saf CSS `@keyframes` — idle / thinking / listening durumları |
| SVG ikonlar | Satır içi SVG, CSS stroke renklendirmesi |
| Tıkla-Büyüt paneli | CSS Grid geçişi: 420px → 750px |
| Toast bildirimleri | Ekran ortası üst, 850px genişlik, kayarak giriş animasyonu |

---

## 📄 Lisans

Bu proje eğitim amaçlıdır. Tüm hakları saklıdır.

---
---

# Synthetix AI — Technical Interview Simulator

> An AI-powered multimodal technical interview simulator that generates **repository-aware** interview questions from your GitHub codebase and evaluates your answers in real-time — via voice or text.

---

## ✨ Features

- **Repository-Aware Questions** — Generates questions based on your actual code, not generic templates.
- **7 Difficulty Levels** — From general super-easy to repo-specific hard questions, organized in an accordion UI.
- **Voice & Text Answers** — Record your voice directly in the browser or type a code/text answer.
- **Multimodal AI Evaluation** — Google Gemini 2.5 Flash evaluates audio directly (no STT step) for lower latency and better technical term accuracy.
- **Structured Feedback** — Every answer returns a score (0–10), detailed feedback, missing points, and a learning roadmap — all rendered as Markdown.
- **Persistent Storage** — All sessions and evaluations are saved to a local SQLite database via SQLAlchemy.
- **TTS Question Playback** — Listen to each question read aloud via Microsoft Edge TTS.
- **Premium Dark UI** — Glassmorphism design with animated AI orb, neon palette, and smooth transitions — zero CSS frameworks used.

---

## 🛠️ Tech Stack

### Backend

| Technology | Role |
|---|---|
| **Python 3.11+** | Core language |
| **FastAPI** | REST API framework (async) |
| **Uvicorn** | ASGI server |
| **SQLAlchemy** | ORM for database management |
| **SQLite** | Persistent local database |
| **Google Gemini 2.5 Flash** | Question generation + multimodal evaluation |
| **edge-tts** | Microsoft Neural TTS for question audio |
| **pydub + ffmpeg** | Audio format conversion (WebM/OGG → WAV) |
| **python-dotenv** | Environment variable management |

### Frontend

| Technology | Role |
|---|---|
| **Vite** | Build tool & dev server |
| **Vanilla JavaScript (ES2022+)** | All application logic |
| **Vanilla CSS3** | Full custom styling — no Tailwind or Bootstrap |
| **Marked.js** | Markdown-to-HTML rendering for AI feedback |
| **MediaRecorder API** | Browser-native audio recording |
| **Google Fonts (Outfit)** | Typography |

---

## 📁 Project Structure

```
ai_technical_simulator_public/
│
├── backend/
│   ├── main.py                    # FastAPI app & all API endpoints
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # API keys (not committed)
│   ├── interview_app.db           # SQLite database (auto-created)
│   └── app/
│       ├── database.py            # SQLAlchemy engine & session setup
│       ├── models.py              # DB table models
│       └── services/
│           ├── ai_service.py      # Gemini API calls & prompt engineering
│           └── github_service.py  # Repo cloning & code extraction
│
└── frontend_web/
    ├── index.html                 # App shell & SVG icons
    ├── main.js                    # All UI logic & API calls
    ├── style.css                  # Full custom design system
    └── package.json               # Vite dependency
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git (must be accessible from terminal)
- A valid **Google Gemini API Key**

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ai_technical_simulator_public.git
cd ai_technical_simulator_public
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3. Frontend Setup
```bash
cd ../frontend_web
npm install
```

---

## 🚀 Running the Project

> Two separate terminals must be opened simultaneously.

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend_web
npm run dev
```

🌐 **App:** `http://localhost:5173`  
📖 **API Docs:** `http://127.0.0.1:8000/docs`

---

## 🔄 How It Works

```
1. User pastes a GitHub repo URL
2. Backend clones the repo & extracts source code
3. Gemini generates 21 categorized interview questions (7 levels)
4. User selects a question and answers by voice or text
5. Gemini evaluates the answer (multimodal for audio)
6. Score + Feedback + Missing Points + Roadmap displayed
7. All results saved to SQLite database
```

---

## 🗄️ Database

The SQLite database (`interview_app.db`) is automatically created in `backend/` on first run.

| Table | Contents |
|---|---|
| `interview_sessions` | Repo URL, code context, timestamp |
| `feedbacks` | Candidate answer, score, feedback, missing points, roadmap |
| `users` | Prepared for future auth (currently unused) |

> To browse visually: [DB Browser for SQLite](https://sqlitebrowser.org/)

---

## 🧠 AI & Prompt Engineering

**Question Generation:** Instructs Gemini to produce exactly 21 questions across 7 difficulty levels. Repo-specific questions are grounded in actual code elements (function names, architectural decisions).

**Evaluation Scoring Philosophy:**
- Core idea captured, imprecise → **7.5–8.5**
- Solid answer with minor gaps → **8.5–9.5**
- Below 5.5 only if fundamentally wrong
- *"When in doubt, score significantly higher"*

---

## 🎨 UI Highlights

| Feature | Implementation |
|---|---|
| Glassmorphism panels | `backdrop-filter: blur()` + semi-transparent dark backgrounds |
| Animated AI Orb | Pure CSS `@keyframes` — idle / thinking / listening states |
| SVG Icons | Inline SVGs styled via CSS stroke colors — no icon library |
| Click-to-Expand panel | CSS Grid transition: 420px → 750px on click |
| Toast notifications | Top-center, 850px wide, slide-in animation |

---

## 📄 License

This project is for educational purposes. All rights reserved.

---
