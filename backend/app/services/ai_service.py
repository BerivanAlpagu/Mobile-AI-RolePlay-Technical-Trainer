import os
import json
import re
from typing import List, Dict
from google import genai
from static_ffmpeg import add_paths
add_paths()  # FFmpeg yolunu otomatik olarak sisteme ekler

def _build_categorized_prompt(code_context: str) -> str:
    return (
        "Task: You are a technical interviewer. Analyze the provided code and generate "
        "EXACTLY 12 technical interview questions in English, divided into 4 levels:\n"
        "1. Super Easy (Intern/Starter): Very basic concepts like variable naming, simple 'if' conditions, and basic file operations.\n"
        "2. Easy (Junior): Basic syntax, clean code basics, and simple logic flow.\n"
        "3. Medium (Mid-Level): Error handling, modularity, and SOLID principles.\n"
        "4. Hard (Senior/Architect): Security, high-level architecture, and scalability.\n\n"
        "Format: Return ONLY a valid JSON object with this exact structure:\n"
        "{\n"
        "  \"super_easy\": [\"q1\", \"q2\", \"q3\"],\n"
        "  \"easy\": [\"q4\", \"q5\", \"q6\"],\n"
        "  \"medium\": [\"q7\", \"q8\", \"q9\"],\n"
        "  \"hard\": [\"q10\", \"q11\", \"q12\"]\n"
        "}\n\n"
        f"Code Context:\n{code_context}"
    )

def _parse_categorized_response(response_text: str) -> Dict[str, List[str]]:
    # Markdown kalıntılarını (```json ... ```) temizle
    clean_text = re.sub(r"```(?:json)?\s?(.*?)\s?```", r"\1", response_text, flags=re.DOTALL).strip()
    try:
        return json.loads(clean_text)
    except:
        return {"error": ["Failed to parse JSON"], "raw": [response_text]}

def generate_interview_questions(code_context: str) -> Dict[str, List[str]]:
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set.")

    client = genai.Client(
        api_key=api_key,
        http_options={'api_version': 'v1'}
    )
    
    prompt = _build_categorized_prompt(code_context)

    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash', 
            contents=prompt
        )
        return _parse_categorized_response(response.text)
    except Exception as e:
        print(f"DEBUG: API Error: {str(e)}")
        raise RuntimeError(f"Gemini API Error: {str(e)}")
    
    
def _build_evaluation_prompt(question: str, user_answer: str, code_context: str) -> str:
    """
    Prepares a high-level English prompt for Gemini to act as an Elite Interviewer.
    """
    return (
        "ACT AS: An Elite Technical Recruiter from a Top-Tier Tech Company.\n"
        f"SOURCE CODE CONTEXT:\n{code_context}\n"
        f"INTERVIEW QUESTION:\n{question}\n"
        f"CANDIDATE'S RESPONSE:\n{user_answer}\n\n"
        "EVALUATION REQUIREMENTS:\n"
        "1. Score the answer from 0.0 to 10.0 based on technical accuracy.\n"
        "2. Analyze if the candidate correctly referenced the specific code logic provided.\n"
        "3. Identify critical technical concepts the candidate missed.\n"
        "4. Provide a structured learning path with professional links.\n\n"
        "RESPONSE FORMAT: Return ONLY a valid JSON object with keys: "
        "'overall_score', 'detailed_feedback', 'missing_points', 'learning_roadmap'."
    )

def evaluate_candidate_answer(question: str, user_answer: str, code_context: str) -> Dict:
    """
    Kullanıcının cevabını Gemini ile değerlendirir ve sonuçları döner.
    """
    api_key = os.environ.get("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1'})
    
    prompt = _build_evaluation_prompt(question, user_answer, code_context)
    
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt
        )
        # Daha önce kullandığımız temizleme mantığı
        clean_text = re.sub(r"```(?:json)?\s?(.*?)\s?```", r"\1", response.text, flags=re.DOTALL).strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"DEBUG: Evaluation Error: {str(e)}")
        return {"error": "Değerlendirme sırasında bir hata oluştu."}
    
import edge_tts
import asyncio

async def generate_voice_file(text: str, file_name: str = "interview_question.mp3"):
    """
    Converts the provided text (interview question) into a high-quality audio file.
    Uses Microsoft Edge TTS for natural-sounding English speech.
    """
    # Using 'en-US-ChristopherNeural' for a professional male interviewer voice.
    # Alternatively, 'en-US-EmmaNeural' can be used for a female voice.
    VOICE = "en-US-ChristopherNeural" 
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(file_name)
    return file_name


# Getting voice from user

import speech_recognition as sr

from pydub import AudioSegment
import speech_recognition as sr
import os

def transcribe_audio(file_path: str) -> str:
    """
    Kullanıcının ses dosyasını alır, formatını standart WAV'a dönüştürür
    ve ardından metne (Speech-to-Text) çevirir.
    """
    recognizer = sr.Recognizer()
    # Dönüştürülecek geçici dosya yolu
    temp_wav = "converted_temp_audio.wav"
    
    try:
        # Pydub ile gelen dosyayı açıyoruz (Tarayıcıdan gelen formatı otomatik tanır)
        audio = AudioSegment.from_file(file_path)
        
        # Sesi standart bir WAV formatına (PCM) dönüştürüp kaydediyoruz
        audio.export(temp_wav, format="wav")
        
        # Şimdi standart hale gelen WAV dosyasını SpeechRecognition ile okuyoruz
        with sr.AudioFile(temp_wav) as source:
            audio_data = recognizer.record(source)
            # Google STT servisini kullanarak İngilizce metne çeviriyoruz
            text = recognizer.recognize_google(audio_data, language="en-US")
            return text
            
    except Exception as e:
        return f"Speech-to-Text Error: {str(e)}"
    
    finally:
        # İşlem bittiğinde geçici WAV dosyasını siliyoruz ki yer kaplamasın
        if os.path.exists(temp_wav):
            os.remove(temp_wav)