import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class User(Base):
    __tablename__ = "users"

    # UUID (GUID) Kullanımı: Tahmin edilemez, benzersiz kimlikler
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    interviews = relationship("InterviewSession", back_populates="user")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True) # Anonim mülakatlar için nullable
    repo_url = Column(String(255), index=True)
    
    # Eskiden in-memory olan kod bağlamını artık kalıcı DB'ye yazıyoruz
    code_context = Column(Text, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # İlişkiler
    user = relationship("User", back_populates="interviews")
    questions = relationship("Question", back_populates="interview", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="interview", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    interview_id = Column(String(36), ForeignKey("interview_sessions.id"))
    
    question_text = Column(Text)
    difficulty_level = Column(String(20)) # "super_easy", "easy", "medium", "hard"
    
    interview = relationship("InterviewSession", back_populates="questions")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    interview_id = Column(String(36), ForeignKey("interview_sessions.id"))
    question_id = Column(String(36), ForeignKey("questions.id"), nullable=True)
    
    candidate_answer = Column(Text)
    overall_score = Column(String(10)) # örn: "8.5"
    detailed_feedback = Column(Text)
    missing_points = Column(Text)
    learning_roadmap = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("InterviewSession", back_populates="feedbacks")
