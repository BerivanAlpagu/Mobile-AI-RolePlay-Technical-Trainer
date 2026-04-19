from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
from dotenv import load_dotenv
import google.generativeai as genai
from sqlalchemy.orm import Session

from app.services.github_service import clone_repo, read_code_files
from app.services.ai_service import generate_interview_questions, evaluate_candidate_answer, evaluate_candidate_audio, generate_voice_file
from app.database import engine, get_db, Base
from app.models import InterviewSession

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

# Veritabanı tablolarını oluştur (Henüz yoksa)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Synthetix Resume & Role-Play Trainer")

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Vite dev server (5173) ve üretim build'i için tarayıcı erişimine izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request Schemas ──────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    repo_url: str

@app.post("/analyze")
async def analyze_repo(body: AnalyzeRequest, db: Session = Depends(get_db)):
    repo_url = body.repo_url
    repo_path = None
    try:
        repo_path = clone_repo(repo_url)
        all_code = read_code_files(repo_path)
        
        # Kodun kopyasını DB'ye (InterviewSession tablosuna) kaydet
        new_session = InterviewSession(repo_url=repo_url, code_context=all_code)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        questions = generate_interview_questions(all_code)
        
        return {
            "session_id": new_session.id, # Artık repo_url yerine GUID dönüyoruz
            "questions": questions, 
            "repo_url": repo_url
        }
        
    except Exception as e:
        db.rollback() # Hata olursa DB işlemini geri al
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if repo_path and os.path.exists(repo_path):
            shutil.rmtree(repo_path, ignore_errors=True)

class EvaluateTextRequest(BaseModel):
    session_id: str
    question: str
    answer: str

@app.post("/evaluate")
async def evaluate_answer(body: EvaluateTextRequest, db: Session = Depends(get_db)):
    """
    Adayın mülakat sorusuna verdiği yazılı (metin) yanıtı değerlendirir.
    """
    session_obj = db.query(InterviewSession).filter(InterviewSession.id == body.session_id).first()
    
    if not session_obj:
        raise HTTPException(status_code=400, detail="Belirtilen session_id bulunamadı.")
    
    result = evaluate_candidate_answer(body.question, body.answer, session_obj.code_context)
    return {"evaluation": result}

@app.get("/listen_question", tags=["Interview Simulation"])
async def listen_question(text: str):
    try:
        file_path = "temp_question.mp3"
        await generate_voice_file(text, file_path)
        return FileResponse(path=file_path, media_type="audio/mpeg", filename="question.mp3")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice error: {str(e)}")
    
@app.post("/evaluate_voice", tags=["Interview Simulation"])
async def evaluate_voice_answer(session_id: str, question: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Sesli cevabı alır, doğrudan Gemini Multimodal'a (Metne çevirmeden) yollar.
    Latency (gecikme) büyük oranda düşer ve kod terimleri (STT hatası olmadan) doğrudan AI tarafından anlaşılır.
    """
    try:
        # Sesi kaydet
        temp_file = "user_voice_answer.wav"
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Kod bağlamını DB'den çek
        session_obj = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session_obj:
            raise HTTPException(status_code=400, detail="Belirtilen session_id bulunamadı.")
            
        # Doğrudan sesi gönder (Sıfır STT Gecikmesi)
        evaluation = evaluate_candidate_audio(question, temp_file, session_obj.code_context)
        
        return {
            "evaluation": evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/")
async def root():
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)