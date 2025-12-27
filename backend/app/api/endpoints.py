from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List
import shutil

from app.services import github_service, ai_service

router = APIRouter()


class RepoURL(BaseModel):
    repo_url: str


@router.post("/analyze")
async def analyze(repo: RepoURL):
    tmp_path = None
    try:
        # Clone repository to temp dir
        tmp_path = github_service.clone_repo(repo.repo_url)

        # Read code files into a single string
        code_context = github_service.read_code_files(tmp_path)

        if not code_context.strip():
            raise HTTPException(status_code=400, detail="No code files found in repository")

        # Generate interview questions from AI service
        questions = ai_service.generate_interview_questions(code_context)

        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup cloned repository for security
        if tmp_path:
            try:
                shutil.rmtree(tmp_path)
            except Exception:
                pass
