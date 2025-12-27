from fastapi import FastAPI, HTTPException
import os
import shutil

from app.services.github_service import clone_repo, read_code_files 

from fastapi import UploadFile, File
from app.services.ai_service import transcribe_audio # Yeni fonksiyonu import et

# generate_voice_file fonksiyonunu buraya ekledik
from app.services.ai_service import generate_interview_questions, evaluate_candidate_answer, generate_voice_file

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()  # .env dosyasındaki değişkenleri yükler
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

app = FastAPI(title="Synthetix Resume & Role-Play Trainer")

# MVP için basit bir bellek (Sözlük) yapısı
# Gerçek projede Redis veya Veritabanı kullanılır.
interview_sessions = {}

@app.post("/analyze")
async def analyze_repo(repo_url: str):
    repo_path = None
    try:
        repo_path = clone_repo(repo_url)
        all_code = read_code_files(repo_path)
        
        # Kodun bir kopyasını değerlendirme (evaluation) için sakla
        interview_sessions[repo_url] = all_code
        
        questions = generate_interview_questions(all_code)
        return {"questions": questions, "repo_url": repo_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if repo_path and os.path.exists(repo_path):
            shutil.rmtree(repo_path, ignore_errors=True)

@app.post("/evaluate")
async def evaluate_answer(repo_url: str, question: str, answer: str):
    """
    Adayın mülakat sorusuna verdiği yanıtı değerlendirir.
    """
    # Hafızadan kod bağlamını çek
    code_context = interview_sessions.get(repo_url)
    
    if not code_context:
        raise HTTPException(status_code=400, detail="Önce bu repo için /analyze çalıştırılmalıdır.")
    
    # Değerlendirme yap
    result = evaluate_candidate_answer(question, answer, code_context)
    return result


from fastapi.responses import FileResponse


@app.get("/listen_question", tags=["Interview Simulation"])
async def listen_question(text: str):
    try:
        file_path = "temp_question.mp3"
        await generate_voice_file(text, file_path)
        
        # media_type'ı tam olarak belirtiyoruz ve FileResponse döndürüyoruz
        return FileResponse(
            path=file_path, 
            media_type="audio/mpeg", 
            filename="question.mp3"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice error: {str(e)}")
    
@app.post("/evaluate_voice", tags=["Interview Simulation"])
async def evaluate_voice_answer(repo_url: str, question: str, file: UploadFile = File(...)):
    """
    Sesli cevabı alır: 
    1. Sesi metne çevirir (STT).
    2. Metni AI ile analiz eder (Evaluation).
    3. Puan ve Yol Haritası döner.
    """
    try:
        # 1. Gelen ses dosyasını geçici olarak kaydet
        temp_file = "user_voice_answer.wav"
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Sesi metne çevir (Speech-to-Text)
        transcribed_text = transcribe_audio(temp_file)
        
        # 3. Kod bağlamını hafızadan çek
        code_context = interview_sessions.get(repo_url)
        if not code_context:
            raise HTTPException(status_code=400, detail="Lütfen önce /analyze yapın.")
            
        # 4. AI ile teknik değerlendirme yap
        evaluation = evaluate_candidate_answer(question, transcribed_text, code_context)
        
        return {
            "candidate_said": transcribed_text,
            "evaluation": evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

from fastapi.responses import RedirectResponse

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")