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
        "EXACTLY 21 technical interview questions in English. Divide them into two main parts: "
        "Part 1: General Programming Concepts (12 questions total)\n"
        "1. general_super_easy (3 qs): Intern/Starter. Very basic concepts like variable naming, simple 'if' conditions.\n"
        "2. general_easy (3 qs): Junior. Basic syntax, clean code basics, and logic flow.\n"
        "3. general_medium (3 qs): Mid-Level. Error handling, modularity, OOP or SOLID principles.\n"
        "4. general_hard (3 qs): Senior/Architect. Security, scalability, advanced architecture.\n\n"
        "Part 2: Repository Specific Questions (9 questions total) - These MUST clearly reference variables, functions, patterns, or architecture found IN THE PROVIDED CODE CONTEXT.\n"
        "5. repo_easy (3 qs): Ask to explain what a specific function or class does in the provided code.\n"
        "6. repo_medium (3 qs): Ask why a certain logic/pattern was chosen in the code, or how to refactor a specific part.\n"
        "7. repo_hard (3 qs): Ask about potential security flaws, scalability issues, or system impacts of the specific architecture in the code.\n\n"
        "Format: Return ONLY a valid JSON object with this exact structure:\n"
        "{\n"
        "  \"general_super_easy\": [\"q1\", \"q2\", \"q3\"],\n"
        "  \"general_easy\": [\"q4\", \"q5\", \"q6\"],\n"
        "  \"general_medium\": [\"q7\", \"q8\", \"q9\"],\n"
        "  \"general_hard\": [\"q10\", \"q11\", \"q12\"],\n"
        "  \"repo_easy\": [\"q13\", \"q14\", \"q15\"],\n"
        "  \"repo_medium\": [\"q16\", \"q17\", \"q18\"],\n"
        "  \"repo_hard\": [\"q19\", \"q20\", \"q21\"]\n"
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
    
    
def _build_evaluation_prompt(question: str, user_answer_text: str, code_context: str) -> str:
    """
    Prepares a high-level English prompt for Gemini to act as an Elite Interviewer.
    """
    return (
        "ACT AS: A helpful, constructive, and fair Senior Technical Interviewer.\n"
        f"SOURCE CODE CONTEXT:\n{code_context}\n"
        f"INTERVIEW QUESTION:\n{question}\n"
        f"CANDIDATE'S RESPONSE:\n{user_answer_text}\n\n"
        "EVALUATION REQUIREMENTS:\n"
        "1. Score the answer from 0.0 to 10.0 based on technical accuracy. Be constructive and realistic—do not be overly harsh. A decent answer should get a 7-8, an excellent one 9-10.\n"
        "2. Analyze if the candidate correctly referenced the specific code logic provided.\n"
        "3. Identify critical technical concepts the candidate missed.\n"
        "4. Provide a structured learning path with professional links.\n\n"
        "RESPONSE FORMAT: Return ONLY a valid JSON object with keys: "
        "'overall_score' (number), 'detailed_feedback' (string), 'missing_points' (List of strictly strings, NOT objects), 'learning_roadmap' (List of strictly strings, NOT objects)."
    )

def evaluate_candidate_answer(question: str, user_answer: str, code_context: str) -> Dict:
    """
    Kullanıcının metin tabanlı cevabını Gemini ile değerlendirir ve sonuçları döner.
    """
    api_key = os.environ.get("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1'})
    
    prompt = _build_evaluation_prompt(question, user_answer, code_context)
    
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt
        )
        clean_text = re.sub(r"```(?:json)?\s?(.*?)\s?```", r"\1", response.text, flags=re.DOTALL).strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"DEBUG: Evaluation Error: {str(e)}")
        return {"error": "Değerlendirme sırasında bir hata oluştu."}

def _build_audio_evaluation_prompt(question: str, code_context: str) -> str:
    """
    Mülakat sorusu ve adayın SESLİ KAYDI için özel hazırlanmış Multimodal Prompt.
    """
    return (
        "ACT AS: A helpful, constructive, and fair Senior Technical Interviewer.\n"
        f"SOURCE CODE CONTEXT:\n{code_context}\n"
        f"INTERVIEW QUESTION:\n{question}\n"
        "CANDIDATE'S RESPONSE: Please listen to the strictly provided audio file. It contains the candidate's exact verbal answer.\n\n"
        "EVALUATION REQUIREMENTS:\n"
        "1. First, perfectly and accurately transcribe what the candidate said in the audio considering deep technical concepts.\n"
        "2. Score the answer from 0.0 to 10.0 based on technical accuracy related to the code context. Be constructive and realistic—do not be overly harsh. A decent answer should get a 7-8.\n"
        "3. Analyze if the candidate correctly referenced the specific code logic provided.\n"
        "4. Identify critical technical concepts the candidate missed.\n"
        "5. Provide a structured learning path with professional links.\n\n"
        "RESPONSE FORMAT: Return ONLY a valid JSON object with keys: "
        "'transcript' (string), 'overall_score' (number), 'detailed_feedback' (string), 'missing_points' (List of strictly strings, NOT objects), 'learning_roadmap' (List of strictly strings, NOT objects)."
    )

import google.generativeai as legacy_genai
from pydub import AudioSegment

def evaluate_candidate_audio(question: str, file_path: str, code_context: str) -> Dict:
    """
    Sesi STT'ye (Metne) çevirmeden doğrudan Gemini Multimodal'a yükler.
    STT gecikmesini engeller ve teknik terim anlaşılırlığını (Deep Context) artırır.
    """
    api_key = os.environ.get("GOOGLE_API_KEY")
    legacy_genai.configure(api_key=api_key)
    
    temp_wav = "converted_temp_audio.wav"
    uploaded_file_ref = None
    
    try:
        # Pydub ile formattan bağımsız sesi WAV olarak dışa aktar
        audio = AudioSegment.from_file(file_path)
        audio.export(temp_wav, format="wav")
        
        # Sesi Google Gemini'ye doğrudan ses modülü ile yükle (Çok daha düşük latency)
        uploaded_file_ref = legacy_genai.upload_file(path=temp_wav, mime_type='audio/wav')
        
        prompt = _build_audio_evaluation_prompt(question, code_context)
        
        # Audio ve prompu aynı anda yolla (Multimodal)
        model = legacy_genai.GenerativeModel('models/gemini-2.5-flash')
        response = model.generate_content([prompt, uploaded_file_ref])
        
        clean_text = re.sub(r"```(?:json)?\s?(.*?)\s?```", r"\1", response.text, flags=re.DOTALL).strip()
        return json.loads(clean_text)
        
    except Exception as e:
        print(f"DEBUG: Audio Evaluation Error: {str(e)}")
        return {"error": f"Ses analiz edilirken bir hata oluştu: {str(e)}"}
        
    finally:
        if os.path.exists(temp_wav):
            os.remove(temp_wav)
        # Sunucudaki dosyayı sil ki yer kaplamasın
        if uploaded_file_ref:
            try:
                legacy_genai.delete_file(uploaded_file_ref.name)
            except:
                pass


import edge_tts
import asyncio

async def generate_voice_file(text: str, file_name: str = "interview_question.mp3"):
    """
    Converts the provided text (interview question) into a high-quality audio file.
    Uses Microsoft Edge TTS for natural-sounding English speech.
    """
    VOICE = "en-US-ChristopherNeural" 
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(file_name)
    return file_name