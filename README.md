# 🤖 Synthetix AI - Technical Trainer

Bu proje, teknik mülakat hazırlığı sürecini yapay zeka ile simüle eden, sesli iletişim kurabilen tam kapsamlı (Full-Stack) bir simalatör eğitim platformudur.

## 🏗️ Mimari Yapı
Proje iki ana bölümden oluşmaktadır:
- **Backend:** FastAPI (Python) ve Google Gemini AI kullanılarak geliştirilmiştir. Ses işleme ve analiz süreçlerini yönetir.
- **Frontend:** Flutter (Dart) kullanılarak geliştirilmiştir. Cross-platform desteği ile mobil cihazlarda çalışır.

## 🚀 Özellikler
- **Gerçekçi Rol Yapma:** AI, teknik bir mülakatçı gibi davranır.
- **Sesli İletişim:** Kullanıcı sesli cevap verebilir, AI sesli soru sorabilir.
- **Analiz ve Geri Bildirim:** Mülakat sonunda performans analizi sunar.

## 🛠️ Kurulum

### 1. Backend (Python)
```bash
cd backend
pip install -r requirements.txt
python main.py

### 2. Frontend (Flutter)
Bash

cd frontend
flutter pub get
flutter run

### 3. 🔒 Güvenlik Notu
Hassas veriler (API Key vb.) .env dosyasında tutulmaktadır ve güvenliği sağlamak adına repoya dahil edilmemiştir. .env.example dosyasını referans alarak kendi anahtarınızı ekleyebilirsiniz.

